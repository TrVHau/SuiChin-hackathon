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
  nonce: number;
  deadlineMs: number;
  signature: number[];
  signerPubkey: number[];
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

export type PvPStatus =
  | "idle"
  | "connecting"
  | "waiting"
  | "matched"
  | "awaiting_deposit"
  | "playing"
  | "submitting"
  | "resolved"
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
  lastShot: null,
};

export function usePvP(_profileId: string | undefined) {
  const account = useCurrentAccount();
  const socketRef = useRef<Socket | null>(null);
  const [pvp, setPvP] = useState<PvPState>(INITIAL_STATE);

  const safeDisconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    socketRef.current = null;
  }, []);

  const setMatchFoundFromEvent = useCallback(
    (event: MatchFoundEvent) => {
      const myWallet = account?.address ?? "";
      const opponentWallet =
        myWallet === event.creator ? event.joiner : event.creator;

      setPvP((prev) => ({
        ...prev,
        status: "awaiting_deposit",
        tempRoomId: event.roomId,
        roomId: null,
        role: myWallet === event.creator ? "CREATOR" : "JOINER",
        challengeId: event.challengeId,
        opponent: opponentWallet,
        betTier: event.tier ?? prev.betTier,
        myNft:
          myWallet === event.creator
            ? event.creatorNft ?? prev.myNft
            : event.joinerNft ?? prev.myNft,
        opponentNft:
          myWallet === event.creator
            ? event.joinerNft ?? null
            : event.creatorNft ?? null,
      }));

      toast.success("Da tim thay doi thu. Hay khoa NFT vao escrow.");
    },
    [account?.address],
  );

  const setMatchedFromEvent = useCallback(
    (event: MatchStartEvent) => {
      const myWallet = account?.address ?? "";
      const opponentWallet =
        event.players.find((wallet) => wallet !== myWallet) ?? null;

      setPvP((prev) => ({
        ...prev,
        status: "matched",
        roomId: event.roomId,
        challengeId: event.challengeId,
        opponent: opponentWallet,
        betTier: event.tier ?? prev.betTier,
        myNft: event.nfts?.[myWallet] ?? prev.myNft,
        opponentNft:
          (opponentWallet ? event.nfts?.[opponentWallet] : undefined) ??
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
      });
      socketRef.current = socket;

      socket.on("connect", () => {
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

      socket.on("match.start", (event: MatchStartEvent) => {
        setMatchedFromEvent(event);
      });

      socket.on("match.result.finalized", (event: MatchFinalizedEvent) => {
        setPvP((prev) => {
          if (prev.challengeId !== event.challengeId) return prev;

          return {
            ...prev,
            status: "resolved",
            winner: event.winnerWallet,
            resultTx: event.txDigest,
            settlementPayload: event.settlementPayload ?? null,
          };
        });

        if (event.winnerWallet === account.address) {
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
            myTurn:
              Boolean(account?.address) &&
              event.currentTurnWallet === account?.address,
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
              event.nextTurnWallet === account?.address,
          };
        });
      });

      socket.on("connect_error", () => {
        toast.error("Khong ket noi duoc backend");
        setPvP((prev) => ({ ...prev, status: "error" }));
      });

      socket.on("disconnect", () => {
        setPvP((prev) => {
          if (prev.status === "resolved" || prev.status === "idle") {
            return prev;
          }
          return { ...prev, status: "error" };
        });
      });
    },
    [account, pvp.status, safeDisconnect, setMatchFoundFromEvent, setMatchedFromEvent],
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
      });
    },
    [pvp.tempRoomId],
  );

  const notifyRoomJoined = useCallback(
    (suiRoomId: string) => {
      const socket = socketRef.current;
      if (!socket || !pvp.tempRoomId) return;

      socket.emit("queue.roomJoined", {
        tempRoomId: pvp.tempRoomId,
        suiRoomId,
      });
    },
    [pvp.tempRoomId],
  );

  const reportRound = useCallback(
    (winnerId: string) => {
      const socket = socketRef.current;
      if (!socket || !account?.address) return;
      if (!pvp.challengeId) return;
      if (pvp.submittedResult) return;

      const result: MatchResult = winnerId === account.address ? "WIN" : "LOSE";
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
            setPvP((prev) => ({ ...prev, status: "error" }));
            return;
          }

          if (ack.finalized) {
            setPvP((prev) => ({
              ...prev,
              status: "resolved",
              winner: ack.finalized?.winnerWallet ?? null,
              resultTx: ack.finalized?.txDigest ?? null,
              settlementPayload: ack.finalized?.settlementPayload ?? null,
            }));
            return;
          }

          setPvP((prev) => ({ ...prev, status: "playing" }));
          toast.info("Da gui ket qua, dang cho doi thu...");
        },
      );
    },
    [account, pvp.challengeId, pvp.submittedResult],
  );

  const submitShot = useCallback(
    (shot: { x: number; y: number; force: number }) => {
      const socket = socketRef.current;
      if (!socket || !account?.address) return;
      if (!pvp.challengeId) return;
      if (pvp.status !== "playing") return;
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
    [account, pvp.challengeId, pvp.myTurn, pvp.status],
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
    reportRound,
    submitShot,
    resolveLocalMatch,
    setSettleTx,
  };
}
