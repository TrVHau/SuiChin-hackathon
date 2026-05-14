import { useCurrentAccount } from "@mysten/dapp-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";
import { BACKEND_WS_URL } from "@/config/sui.config";

type MatchResult = "WIN" | "LOSE" | "DRAW" | "FORFEIT";
export type BettingTier = "0_5_SUI" | "1_SUI" | "2_SUI";

export interface ValuationNft {
  id: string;
  name: string;
  tier: number;
  imageUrl?: string;
}

interface QueueJoinAck {
  ok: boolean;
  result?: {
    matched: boolean;
    roomId?: string | null;
    opponentWallet?: string;
    challengeId?: string;
    tier?: BettingTier;
    targetPoints?: number;
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
  tier?: BettingTier;
  targetPoints?: number;
  nfts?: Record<string, ValuationNft>;
}

interface MatchFinalizedEvent {
  challengeId: string;
  winnerWallet: string | null;
  txDigest: string | null;
  settlementPayload?: SettlementPayload | null;
}

export interface SettlementPayload {
  roomId: string;
  winner: string;
  loser: string;
  matchDigest: number[];
  nonce: string;
  deadlineMs: string;
  chainId?: number;
  packageId?: string;
  signature: number[];
  signerPubkey: number[];
  debugMessageB64?: string;
  debugSignatureB64?: string;
  debugMessage?: {
    intent_scope: number;
    chain_id: number;
    package_id: string;
    room_id: string;
    winner: string;
    loser: string;
    match_digest_hex: string;
    nonce: string;
    deadline_ms: string;
  };
  fallbackPayloads?: SettlementPayload[];
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

interface MatchFoundEvent {
  roomId: string;
  challengeId: string;
  tier?: BettingTier;
  tierLabel?: string;
  targetPoints?: number;
  status?: "AWAITING_DEPOSIT";
  creator: string;
  joiner: string;
  creatorNft?: ValuationNft;
  joinerNft?: ValuationNft;
}

interface MatchRoomReadyEvent {
  tempRoomId: string;
  suiRoomId: string;
  creator: string;
}

interface QueueTimeoutEvent {
  tier?: BettingTier;
  timeoutMs: number;
  message?: string;
}

interface MatchCancelledEvent {
  challengeId: string;
  roomId: string;
  tempRoomId: string;
  suiRoomId: string | null;
  reason: "PLAYER_LEFT" | "DISCONNECT" | "LOCK_TIMEOUT" | "CREATOR_LEFT_LOCKED";
  message?: string;
  leftWallet?: string;
  creatorWallet?: string;
  needsCreatorCancel?: boolean;
  cancelRoomId?: string | null;
  canCancelWallet?: string;
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
    status: "MATCHED" | "LOCKING" | "IN_GAME" | "FINISHED" | "CANCELLED";
    players: string[];
    tier?: BettingTier;
    targetPoints?: number;
    nfts?: Record<string, ValuationNft>;
    currentTurnWallet?: string | null;
  };
  error?: string;
}

interface SettlementRefreshAck {
  ok: boolean;
  result?: {
    challengeId: string;
    roomId: string | null;
    winnerWallet: string | null;
    loserWallet: string | null;
    settlementPayload?: SettlementPayload | null;
  };
  error?: string;
}

interface RoomSyncAck {
  ok: boolean;
  started?: boolean;
  error?: string;
}

export type PvPStatus =
  | "idle"
  | "connecting"
  | "waiting"
  | "matched"
  | "awaiting_deposit"
  | "playing"
  | "submitting"
  | "resolved"
  | "cancelled"
  | "error";

export interface PvPState {
  status: PvPStatus;
  roomId: string | null;
  tempRoomId: string | null;
  role: "CREATOR" | "JOINER" | null;
  challengeId: string | null;
  opponent: string | null;
  betTier: BettingTier | null;
  round: number;
  scores: [number, number];
  resultTx: string | null;
  settleTx: string | null;
  winner: string | null;
  settlementPayload: SettlementPayload | null;
  myNft: ValuationNft | null;
  opponentNft: ValuationNft | null;
  submittedResult: MatchResult | null;
  currentTurnWallet: string | null;
  myTurn: boolean;
  paused: boolean;
  pausedReason: string | null;
  reconnectDeadlineMs: number | null;
  cancelReason: string | null;
  cancelRoomId: string | null;
  needsCreatorCancel: boolean;
  canCancelWallet: string | null;
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
  tempRoomId: null,
  role: null,
  challengeId: null,
  opponent: null,
  betTier: null,
  round: 1,
  scores: [0, 0],
  resultTx: null,
  settleTx: null,
  winner: null,
  settlementPayload: null,
  myNft: null,
  opponentNft: null,
  submittedResult: null,
  currentTurnWallet: null,
  myTurn: false,
  paused: false,
  pausedReason: null,
  reconnectDeadlineMs: null,
  cancelReason: null,
  cancelRoomId: null,
  needsCreatorCancel: false,
  canCancelWallet: null,
  lastShot: null,
};

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
          roomId: current.roomId ?? current.tempRoomId ?? undefined,
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

  const setMatchFoundFromEvent = useCallback(
    (event: MatchFoundEvent) => {
      const myWallet = account?.address ?? "";
      const isMe = (wallet?: string | null) =>
        Boolean(
          myWallet && wallet && wallet.toLowerCase() === myWallet.toLowerCase(),
        );
      const opponentWallet = isMe(event.creator) ? event.joiner : event.creator;

      setPvP((prev) => ({
        ...prev,
        status: "awaiting_deposit",
        tempRoomId: event.roomId,
        roomId: null,
        role: isMe(event.creator) ? "CREATOR" : "JOINER",
        challengeId: event.challengeId,
        opponent: opponentWallet,
        betTier: event.tier ?? prev.betTier,
        paused: false,
        pausedReason: null,
        reconnectDeadlineMs: null,
        cancelReason: null,
        cancelRoomId: null,
        needsCreatorCancel: false,
        canCancelWallet: null,
        myNft: isMe(event.creator)
          ? (event.creatorNft ?? prev.myNft)
          : (event.joinerNft ?? prev.myNft),
        opponentNft: isMe(event.creator)
          ? (event.joinerNft ?? null)
          : (event.creatorNft ?? null),
      }));

      toast.success("Da tim thay doi thu. Hay khoa NFT vao escrow.");
    },
    [account?.address],
  );

  const setMatchedFromEvent = useCallback(
    (event: MatchStartEvent) => {
      const myWallet = account?.address ?? "";
      const findNftByWallet = (wallet?: string | null) => {
        if (!wallet) return undefined;
        if (event.nfts?.[wallet]) return event.nfts[wallet];
        const matchedEntry = Object.entries(event.nfts ?? {}).find(
          ([address]) => address.toLowerCase() === wallet.toLowerCase(),
        );
        return matchedEntry?.[1];
      };
      const opponentWallet =
        event.players.find(
          (wallet) => wallet.toLowerCase() !== myWallet.toLowerCase(),
        ) ?? null;

      setPvP((prev) => ({
        ...prev,
        status: "matched",
        roomId: event.roomId,
        challengeId: event.challengeId,
        opponent: opponentWallet,
        betTier: event.tier ?? prev.betTier,
        myNft: findNftByWallet(myWallet) ?? prev.myNft,
        opponentNft:
          (opponentWallet ? findNftByWallet(opponentWallet) : undefined) ??
          prev.opponentNft,
        scores: [0, 0],
        currentTurnWallet: null,
        myTurn: false,
        lastShot: null,
        submittedResult: null,
        winner: null,
        resultTx: null,
        settleTx: null,
        settlementPayload: null,
        paused: false,
        pausedReason: null,
        reconnectDeadlineMs: null,
        cancelReason: null,
        cancelRoomId: null,
        needsCreatorCancel: false,
        canCancelWallet: null,
      }));

      toast.success("Da khoa du tai san. Bat dau ban chun!");
      setTimeout(() => {
        setPvP((prev) =>
          prev.status === "matched" ? { ...prev, status: "playing" } : prev,
        );
      }, 700);
    },
    [account?.address],
  );

  const requestSettlementPayload = useCallback(
    (input?: { challengeId?: string; roomId?: string }) =>
      new Promise<SettlementPayload | null>((resolve) => {
        const socket = socketRef.current;
        const current = pvpRef.current;
        const challengeId = input?.challengeId ?? current.challengeId;
        if (!socket || !socket.connected || !challengeId) {
          resolve(null);
          return;
        }

        socket.emit(
          "match.settlement.refresh",
          {
            challengeId,
            roomId:
              input?.roomId ??
              current.roomId ??
              current.tempRoomId ??
              undefined,
          },
          (ack: SettlementRefreshAck) => {
            if (!ack?.ok) {
              resolve(null);
              return;
            }
            const refreshed = ack.result?.settlementPayload ?? null;
            if (refreshed) {
              setPvP((prev) => {
                if (prev.challengeId !== challengeId) return prev;
                return {
                  ...prev,
                  settlementPayload: refreshed,
                  winner: ack.result?.winnerWallet ?? prev.winner,
                };
              });
            }
            resolve(refreshed);
          },
        );
      }),
    [],
  );

  const attachCommonSocketListeners = useCallback(
    (socket: Socket) => {
      socket.on("match.found", (event: MatchFoundEvent) => {
        setMatchFoundFromEvent(event);
      });

      socket.on("match.roomReady", (event: MatchRoomReadyEvent) => {
        setPvP((prev) => ({
          ...prev,
          roomId: event.suiRoomId,
        }));
        toast.info("Creator da tao escrow. Joiner hay khoa tai san vao phong.");
      });

      socket.on("queue.timeout", (event: QueueTimeoutEvent) => {
        toast.error(event.message ?? "Khong tim thay doi thu");
        safeDisconnect();
        setPvP(INITIAL_STATE);
      });

      socket.on("match.cancelled", (event: MatchCancelledEvent) => {
        setPvP((prev) => {
          if (prev.challengeId && prev.challengeId !== event.challengeId) {
            return prev;
          }
          return {
            ...prev,
            status: "cancelled",
            roomId: event.suiRoomId ?? prev.roomId,
            tempRoomId: event.tempRoomId ?? prev.tempRoomId,
            cancelReason:
              event.message ??
              (event.reason === "LOCK_TIMEOUT"
                ? "Doi thu khong chot tai san dung han."
                : "Doi thu da chay tron."),
            cancelRoomId: event.cancelRoomId ?? event.suiRoomId ?? null,
            needsCreatorCancel: Boolean(event.needsCreatorCancel),
            canCancelWallet:
              event.canCancelWallet ?? event.creatorWallet ?? null,
            paused: false,
            pausedReason: null,
            reconnectDeadlineMs: null,
            myTurn: false,
          };
        });
        toast.error(
          event.message ??
            (event.reason === "LOCK_TIMEOUT"
              ? "Doi thu khong chot tai san dung han."
              : "Doi thu da chay tron."),
        );
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
          if (
            account?.address &&
            event.wallet.toLowerCase() !== account.address.toLowerCase()
          ) {
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
          if (
            account?.address &&
            event.wallet.toLowerCase() !== account.address.toLowerCase()
          ) {
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
            settlementPayload: event.settlementPayload ?? null,
            paused: false,
            pausedReason: null,
            reconnectDeadlineMs: null,
          };
        });

        const myAddress = account?.address;
        if (
          event.winnerWallet &&
          myAddress &&
          event.winnerWallet.toLowerCase() === myAddress.toLowerCase()
        ) {
          toast.success("Ban thang!");
        } else if (!event.winnerWallet) {
          toast.info("Tran dau hoa");
        } else {
          toast.error("Ban thua");
        }
        if (!event.settlementPayload) {
          void requestSettlementPayload({ challengeId: event.challengeId });
        }
      });

      socket.on("match.turn", (event: MatchTurnEvent) => {
        setPvP((prev) => {
          if (prev.challengeId !== event.challengeId) return prev;
          return {
            ...prev,
            currentTurnWallet: event.currentTurnWallet,
            myTurn:
              Boolean(account?.address) &&
              event.currentTurnWallet.toLowerCase() ===
                account?.address?.toLowerCase(),
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
            myTurn:
              Boolean(account?.address) &&
              event.nextTurnWallet.toLowerCase() ===
                account?.address?.toLowerCase(),
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
          if (
            prev.status === "resolved" ||
            prev.status === "idle" ||
            prev.status === "cancelled"
          ) {
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
          if (prev.status === "awaiting_deposit") {
            return {
              ...prev,
              paused: true,
              pausedReason: "Dang mat ket noi trong luc chot tai san.",
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
      requestSettlementPayload,
      safeDisconnect,
      setMatchFoundFromEvent,
      setMatchedFromEvent,
    ],
  );

  const joinQueue = useCallback(
    (
      roomId?: string,
      options?: {
        tier?: BettingTier;
        nft?: ValuationNft;
      },
    ) => {
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
        betTier: options?.tier ?? null,
        myNft: options?.nft ?? null,
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
          current.status !== "error" &&
          current.status !== "cancelled"
        ) {
          socket.emit(
            "match.rejoin",
            {
              challengeId: current.challengeId,
              roomId: current.roomId ?? current.tempRoomId ?? undefined,
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
                betTier: result.tier ?? prev.betTier,
                currentTurnWallet:
                  result.currentTurnWallet ?? prev.currentTurnWallet,
                myTurn:
                  Boolean(account?.address && result.currentTurnWallet) &&
                  result.currentTurnWallet!.toLowerCase() ===
                    account.address.toLowerCase(),
                paused: false,
                pausedReason: null,
                reconnectDeadlineMs: null,
              }));
            },
          );
          return;
        }

        socket.emit(
          "queue.join",
          {
            roomId,
            tier: options?.tier,
            nft: options?.nft,
          },
          (ack: QueueJoinAck) => {
            if (!ack.ok) {
              toast.error(ack.error ?? "queue.join failed");
              setPvP((prev) => ({ ...prev, status: "error" }));
              return;
            }

            if (!ack.result?.matched) {
              setPvP((prev) => ({
                ...prev,
                status: "waiting",
                roomId: ack.result?.roomId ?? roomId ?? prev.roomId,
                betTier: ack.result?.tier ?? prev.betTier,
              }));
            }
          },
        );
      });
    },
    [
      account,
      attachCommonSocketListeners,
      pvp.status,
      safeDisconnect,
      startHeartbeat,
    ],
  );

  const leaveQueue = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit("queue.leave", () => undefined);
    }

    safeDisconnect();
    setPvP(INITIAL_STATE);
  }, [safeDisconnect]);

  const connectRoomSocket = joinQueue;
  const disconnectRoomSocket = leaveQueue;

  const notifyRoomCreated = useCallback(
    (suiRoomId: string) => {
      const socket = socketRef.current;
      if (!socket || !pvp.tempRoomId) return;

      socket.emit("queue.roomCreated", {
        tempRoomId: pvp.tempRoomId,
        suiRoomId,
        challengeId: pvp.challengeId ?? undefined,
      });
    },
    [pvp.challengeId, pvp.tempRoomId],
  );

  const notifyRoomJoined = useCallback(
    (suiRoomId: string) => {
      const emitRoomJoined = (socket: Socket) => {
        const current = pvpRef.current;
        socket.emit(
          "queue.roomJoined",
          {
            tempRoomId: current.tempRoomId ?? suiRoomId,
            suiRoomId,
            challengeId: current.challengeId ?? undefined,
          },
          (ack: RoomSyncAck) => {
            if (!ack?.ok) {
              toast.error(ack?.error ?? "Khong the dong bo room ACTIVE");
            }
          },
        );
      };

      let socket = socketRef.current;
      if (socket?.connected) {
        emitRoomJoined(socket);
        return;
      }

      if (!account?.address) {
        toast.error("Vui long ket noi vi de dong bo room ACTIVE.");
        return;
      }

      socket?.removeAllListeners();
      socket?.disconnect();
      socket = io(BACKEND_WS_URL, {
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
        emitRoomJoined(socket);
      });
    },
    [account?.address, attachCommonSocketListeners, startHeartbeat],
  );

  const notifyRoomClosed = useCallback(
    (suiRoomId: string) => {
      const socket = socketRef.current;
      if (!socket) return;

      socket.emit("queue.roomClosed", {
        roomId: suiRoomId,
        challengeId: pvp.challengeId ?? undefined,
      });
    },
    [pvp.challengeId],
  );

  const refreshSettlementPayload = useCallback(
    (roomId?: string) => requestSettlementPayload({ roomId }),
    [requestSettlementPayload],
  );

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

      const result: MatchResult =
        winnerId.toLowerCase() === account.address.toLowerCase()
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
              settlementPayload: ack.finalized?.settlementPayload ?? null,
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
        settlementPayload: null,
      };
    });
  }, []);

  const setSettleTx = useCallback((txDigest: string) => {
    setPvP((prev) => ({
      ...prev,
      settleTx: txDigest,
      settlementPayload: null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      safeDisconnect();
    };
  }, [safeDisconnect]);

  return {
    pvp,
    connectRoomSocket,
    disconnectRoomSocket,
    joinQueue,
    leaveQueue,
    notifyRoomCreated,
    notifyRoomJoined,
    notifyRoomClosed,
    refreshSettlementPayload,
    reportRound,
    submitShot,
    forfeitMatch,
    resolveLocalMatch,
    setSettleTx,
  };
}
