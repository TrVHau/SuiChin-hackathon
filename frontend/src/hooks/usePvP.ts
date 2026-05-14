import { useCurrentAccount } from "@mysten/dapp-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";
import { BACKEND_WS_URL } from "@/config/sui.config";

type MatchResult = "WIN" | "LOSE" | "DRAW" | "FORFEIT";

interface QueueJoinAck {
  ok: boolean;
  result?: {
    matched: boolean;
    roomId?: string | null;
    opponentWallet?: string;
    challengeId?: string;
  };
  error?: string;
}

interface SubmitResultAck {
  ok: boolean;
  result?: {
    totalSubmissions: number;
  };
  finalized?: MatchFinalizedEvent;
  error?: string;
}

interface SubmitShotAck {
  ok: boolean;
  result?: {
    seq: number;
    nextTurnWallet: string;
  };
  error?: string;
}

interface ForfeitAck {
  ok: boolean;
  error?: string;
}

interface MatchStartEvent {
  roomId: string;
  players: string[];
  challengeId: string;
}

interface MatchFinalizedEvent {
  challengeId: string;
  winnerWallet: string | null;
  txDigest: string | null;
}

interface MatchTurnEvent {
  challengeId: string;
  currentTurnWallet: string;
}

interface MatchShotEvent {
  challengeId: string;
  byWallet: string;
  seq: number;
  shot: {
    x: number;
    y: number;
    force: number;
  };
  nextTurnWallet: string;
  atMs: number;
}

interface QueueTimeoutEvent {
  timeoutMs: number;
  message?: string;
}

interface MatchPlayerDisconnectedEvent {
  challengeId: string;
  wallet: string;
  deadlineMs: number;
  graceMs: number;
  message?: string;
}

interface MatchPlayerReconnectedEvent {
  challengeId: string;
  wallet: string;
  message?: string;
}

interface MatchRejoinAck {
  ok: boolean;
  result?: {
    roomId: string;
    challengeId: string;
    status: "IN_GAME" | "FINISHED";
    players: string[];
    currentTurnWallet?: string | null;
  };
  error?: string;
}

export type PvPStatus =
  | "idle"
  | "connecting"
  | "waiting"
  | "matched"
  | "playing"
  | "submitting"
  | "resolved"
  | "error";

export interface PvPState {
  status: PvPStatus;
  roomId: string | null;
  challengeId: string | null;
  opponent: string | null;
  role: "CREATOR" | "JOINER" | null;
  round: number;
  scores: [number, number];
  resultTx: string | null;
  winner: string | null;
  submittedResult: MatchResult | null;
  currentTurnWallet: string | null;
  myTurn: boolean;
  paused: boolean;
  pausedReason: string | null;
  reconnectDeadlineMs: number | null;
  lastShot: {
    byWallet: string;
    seq: number;
    x: number;
    y: number;
    force: number;
    atMs: number;
  } | null;
}

const INITIAL_STATE: PvPState = {
  status: "idle",
  roomId: null,
  challengeId: null,
  opponent: null,
  role: null,
  round: 1,
  scores: [0, 0],
  resultTx: null,
  winner: null,
  submittedResult: null,
  currentTurnWallet: null,
  myTurn: false,
  paused: false,
  pausedReason: null,
  reconnectDeadlineMs: null,
  lastShot: null,
};

function sameWallet(a?: string | null, b?: string | null) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

export function usePvP(_profileId: string | undefined) {
  const account = useCurrentAccount();
  const socketRef = useRef<Socket | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const pvpRef = useRef<PvPState>(INITIAL_STATE);
  const [pvp, setPvP] = useState<PvPState>(INITIAL_STATE);

  useEffect(() => {
    pvpRef.current = pvp;
  }, [pvp]);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current != null) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(
    (socket: Socket) => {
      clearHeartbeat();
      heartbeatTimerRef.current = window.setInterval(() => {
        if (!socket.connected) return;
        const current = pvpRef.current;
        if (!current.challengeId) return;
        socket.emit("match.heartbeat", {
          challengeId: current.challengeId,
          roomId: current.roomId ?? undefined,
        });
      }, 10_000);
    },
    [clearHeartbeat],
  );

  const safeDisconnect = useCallback(() => {
    clearHeartbeat();
    const socket = socketRef.current;
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    socketRef.current = null;
  }, [clearHeartbeat]);

  const setMatchedFromEvent = useCallback(
    (event: MatchStartEvent) => {
      const myWallet = account?.address ?? "";
      const opponentWallet =
        event.players.find((wallet) => !sameWallet(wallet, myWallet)) ?? null;
      const role = sameWallet(event.players[1], myWallet) ? "JOINER" : "CREATOR";

      setPvP((prev) => ({
        ...prev,
        status: "matched",
        roomId: event.roomId,
        challengeId: event.challengeId,
        opponent: opponentWallet,
        role,
        scores: [0, 0],
        currentTurnWallet: null,
        myTurn: false,
        lastShot: null,
        submittedResult: null,
        winner: null,
        resultTx: null,
        paused: false,
        pausedReason: null,
        reconnectDeadlineMs: null,
      }));

      toast.success("Da ghep tran. Bat dau ban chun!");
      window.setTimeout(() => {
        setPvP((prev) =>
          prev.status === "matched" ? { ...prev, status: "playing" } : prev,
        );
      }, 700);
    },
    [account?.address],
  );

  const attachCommonSocketListeners = useCallback(
    (socket: Socket) => {
      socket.on("queue.timeout", (event: QueueTimeoutEvent) => {
        toast.error(event.message ?? "Khong tim thay doi thu");
        safeDisconnect();
        setPvP(INITIAL_STATE);
      });

      socket.on("match.start", (event: MatchStartEvent) => {
        setMatchedFromEvent(event);
      });

      socket.on(
        "match.playerDisconnected",
        (event: MatchPlayerDisconnectedEvent) => {
          setPvP((prev) => {
            if (prev.challengeId !== event.challengeId) return prev;
            return {
              ...prev,
              paused: true,
              pausedReason:
                event.message ?? "Doi thu mat ket noi. Dang cho reconnect.",
              reconnectDeadlineMs: event.deadlineMs,
              myTurn: false,
            };
          });
          if (account?.address && !sameWallet(event.wallet, account.address)) {
            toast.info("Doi thu mat ket noi, tran tam dung 15 giay.");
          }
        },
      );

      socket.on(
        "match.playerReconnected",
        (event: MatchPlayerReconnectedEvent) => {
          setPvP((prev) => {
            if (prev.challengeId !== event.challengeId) return prev;
            return {
              ...prev,
              paused: false,
              pausedReason: null,
              reconnectDeadlineMs: null,
            };
          });
          if (account?.address && !sameWallet(event.wallet, account.address)) {
            toast.success("Doi thu da ket noi lai.");
          }
        },
      );

      socket.on("match.result.finalized", (event: MatchFinalizedEvent) => {
        setPvP((prev) => {
          if (prev.challengeId !== event.challengeId) return prev;
          return {
            ...prev,
            status: "resolved",
            winner: event.winnerWallet,
            resultTx: event.txDigest,
            paused: false,
            pausedReason: null,
            reconnectDeadlineMs: null,
          };
        });

        const myAddress = account?.address;
        if (event.winnerWallet && sameWallet(event.winnerWallet, myAddress)) {
          toast.success("Ban thang!");
        } else if (!event.winnerWallet) {
          toast.info("Tran dau hoa");
        } else {
          toast.error("Ban thua");
        }
      });

      socket.on("match.turn", (event: MatchTurnEvent) => {
        setPvP((prev) => {
          if (prev.challengeId !== event.challengeId) return prev;
          return {
            ...prev,
            currentTurnWallet: event.currentTurnWallet,
            myTurn: sameWallet(event.currentTurnWallet, account?.address),
          };
        });
      });

      socket.on("match.shot.received", (event: MatchShotEvent) => {
        setPvP((prev) => {
          if (prev.challengeId !== event.challengeId) return prev;
          return {
            ...prev,
            lastShot: {
              byWallet: event.byWallet,
              seq: event.seq,
              x: event.shot.x,
              y: event.shot.y,
              force: event.shot.force,
              atMs: event.atMs,
            },
            currentTurnWallet: event.nextTurnWallet,
            myTurn: sameWallet(event.nextTurnWallet, account?.address),
          };
        });
      });

      socket.on("connect_error", () => {
        toast.error("Khong ket noi duoc backend");
        setPvP((prev) => ({ ...prev, status: "error" }));
      });

      socket.on("disconnect", () => {
        clearHeartbeat();
        setPvP((prev) => {
          if (prev.status === "resolved" || prev.status === "idle") {
            return prev;
          }
          if (
            prev.status === "playing" ||
            prev.status === "matched" ||
            prev.status === "submitting"
          ) {
            return {
              ...prev,
              paused: true,
              pausedReason:
                "Dang mat ket noi backend. He thong se thu reconnect.",
              myTurn: false,
            };
          }
          return { ...prev, status: "error" };
        });
      });
    },
    [
      account?.address,
      clearHeartbeat,
      safeDisconnect,
      setMatchedFromEvent,
    ],
  );

  const joinQueue = useCallback(() => {
    if (!account?.address) {
      toast.error("Vui long ket noi vi");
      return;
    }

    if (pvp.status !== "idle" && pvp.status !== "error") {
      return;
    }

    safeDisconnect();
    setPvP({
      ...INITIAL_STATE,
      status: "connecting",
    });

    const socket = io(BACKEND_WS_URL, {
      auth: { walletAddress: account.address },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20_000,
    });
    socketRef.current = socket;
    attachCommonSocketListeners(socket);

    socket.on("connect", () => {
      startHeartbeat(socket);
      const current = pvpRef.current;
      if (
        current.challengeId &&
        current.status !== "waiting" &&
        current.status !== "connecting" &&
        current.status !== "idle" &&
        current.status !== "error"
      ) {
        socket.emit(
          "match.rejoin",
          {
            challengeId: current.challengeId,
            roomId: current.roomId ?? undefined,
          },
          (ack: MatchRejoinAck) => {
            if (!ack.ok) {
              toast.error(ack.error ?? "Khong the ket noi lai tran");
              return;
            }
            const result = ack.result;
            if (!result) return;
            setPvP((prev) => ({
              ...prev,
              roomId: result.roomId ?? prev.roomId,
              challengeId: result.challengeId,
              currentTurnWallet:
                result.currentTurnWallet ?? prev.currentTurnWallet,
              myTurn: sameWallet(result.currentTurnWallet, account.address),
              paused: false,
              pausedReason: null,
              reconnectDeadlineMs: null,
            }));
          },
        );
        return;
      }

      socket.emit("queue.join", {}, (ack: QueueJoinAck) => {
        if (!ack.ok) {
          toast.error(ack.error ?? "queue.join failed");
          setPvP((prev) => ({ ...prev, status: "error" }));
          return;
        }

        if (!ack.result?.matched) {
          setPvP((prev) => ({
            ...prev,
            status: "waiting",
            roomId: ack.result?.roomId ?? prev.roomId,
          }));
        }
      });
    });
  }, [
    account,
    attachCommonSocketListeners,
    pvp.status,
    safeDisconnect,
    startHeartbeat,
  ]);

  const leaveQueue = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit("queue.leave", () => undefined);
    }

    safeDisconnect();
    setPvP(INITIAL_STATE);
  }, [safeDisconnect]);

  const reportRound = useCallback(
    (winnerId: string) => {
      const socket = socketRef.current;
      if (!socket || !account?.address) return;
      if (!pvp.challengeId) return;
      if (pvp.submittedResult) return;
      if (pvp.paused) {
        toast.info("Tran dang tam dung de cho reconnect.");
        return;
      }

      const result: MatchResult = sameWallet(winnerId, account.address)
        ? "WIN"
        : "LOSE";
      const challengeId = pvp.challengeId;

      setPvP((prev) => ({
        ...prev,
        status: "submitting",
        submittedResult: result,
        scores:
          result === "WIN"
            ? [prev.scores[0] + 1, prev.scores[1]]
            : [prev.scores[0], prev.scores[1] + 1],
      }));

      socket.emit(
        "match.result.submit",
        { challengeId, result },
        (ack: SubmitResultAck) => {
          if (!ack.ok) {
            toast.error(ack.error ?? "Gui ket qua that bai");
            setPvP((prev) => ({ ...prev, status: "playing" }));
            return;
          }

          if (ack.finalized) {
            setPvP((prev) => ({
              ...prev,
              status: "resolved",
              winner: ack.finalized?.winnerWallet ?? null,
              resultTx: ack.finalized?.txDigest ?? null,
              paused: false,
              pausedReason: null,
              reconnectDeadlineMs: null,
            }));
            return;
          }

          setPvP((prev) => ({ ...prev, status: "playing" }));
          toast.info("Da gui ket qua, dang cho doi thu...");
        },
      );
    },
    [account, pvp.challengeId, pvp.paused, pvp.submittedResult],
  );

  const submitShot = useCallback(
    (shot: { x: number; y: number; force: number }) => {
      const socket = socketRef.current;
      if (!socket || !account?.address) return;
      if (!pvp.challengeId) return;
      if (pvp.status !== "playing") return;
      if (pvp.paused) {
        toast.info("Tran dang tam dung de cho reconnect.");
        return;
      }
      if (!pvp.myTurn) {
        toast.info("Chua den luot ban");
        return;
      }

      socket.emit(
        "match.shot.submit",
        {
          challengeId: pvp.challengeId,
          x: shot.x,
          y: shot.y,
          force: shot.force,
        },
        (ack: SubmitShotAck) => {
          if (!ack.ok) {
            toast.error(ack.error ?? "Gui cu ban that bai");
            return;
          }

          toast.success(`Da gui cu ban #${ack.result?.seq ?? "?"}`);
        },
      );
    },
    [account, pvp.challengeId, pvp.myTurn, pvp.paused, pvp.status],
  );

  const forfeitMatch = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        const socket = socketRef.current;
        const challengeId = pvpRef.current.challengeId;
        if (!socket || !socket.connected || !challengeId) {
          resolve(false);
          return;
        }

        socket.emit("match.forfeit", { challengeId }, (ack: ForfeitAck) => {
          if (!ack?.ok) {
            toast.error(ack?.error ?? "Khong the xu thua tran dau");
            resolve(false);
            return;
          }
          resolve(true);
        });
      }),
    [],
  );

  const resolveLocalMatch = useCallback((winnerWallet: string | null) => {
    setPvP((prev) => {
      if (prev.status !== "playing") return prev;
      return {
        ...prev,
        status: "resolved",
        winner: winnerWallet,
        resultTx: null,
      };
    });
  }, []);

  useEffect(() => {
    return () => {
      safeDisconnect();
    };
  }, [safeDisconnect]);

  return {
    pvp,
    connectRoomSocket: joinQueue,
    disconnectRoomSocket: leaveQueue,
    joinQueue,
    leaveQueue,
    reportRound,
    submitShot,
    forfeitMatch,
    resolveLocalMatch,
  };
}
