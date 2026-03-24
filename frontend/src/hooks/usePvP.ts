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
    roomId?: string;
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
  finalized?: {
    winnerWallet: string | null;
    txDigest: string | null;
  };
  error?: string;
}

interface MatchStartEvent {
  roomId: string;
  players: string[];
  challengeId: string;
  wager?: number;
}

interface MatchFinalizedEvent {
  challengeId: string;
  winnerWallet: string | null;
  txDigest: string | null;
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
  wager: number;
  round: number;
  scores: [number, number];
  resultTx: string | null;
  winner: string | null;
  submittedResult: MatchResult | null;
}

const INITIAL_STATE: PvPState = {
  status: "idle",
  roomId: null,
  challengeId: null,
  opponent: null,
  wager: 0,
  round: 1,
  scores: [0, 0],
  resultTx: null,
  winner: null,
  submittedResult: null,
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

  const setMatchedFromEvent = useCallback(
    (event: MatchStartEvent) => {
      const myWallet = account?.address ?? "";
      const opponentWallet = event.players.find((wallet) => wallet !== myWallet) ?? null;

      setPvP((prev) => ({
        ...prev,
        status: "matched",
        roomId: event.roomId,
        challengeId: event.challengeId,
        opponent: opponentWallet,
        wager: event.wager ?? prev.wager,
      }));

      toast.success("Da tim thay doi thu. Bat dau tran!");
      setTimeout(() => {
        setPvP((prev) => (prev.status === "matched" ? { ...prev, status: "playing" } : prev));
      }, 700);
    },
    [account?.address],
  );

  const joinQueue = useCallback(
    (wager: number) => {
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
        wager,
      });

      const socket = io(BACKEND_WS_URL, {
        auth: { walletAddress: account.address },
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("queue.join", { wager }, (ack: QueueJoinAck) => {
          if (!ack.ok) {
            toast.error(ack.error ?? "queue.join failed");
            setPvP((prev) => ({ ...prev, status: "error" }));
            return;
          }

          if (!ack.result?.matched) {
            setPvP((prev) => ({ ...prev, status: "waiting" }));
            return;
          }

          if (
            ack.result.roomId &&
            ack.result.challengeId &&
            ack.result.opponentWallet
          ) {
            setMatchedFromEvent({
              roomId: ack.result.roomId,
              challengeId: ack.result.challengeId,
              players: [account.address, ack.result.opponentWallet],
            });
          }
        });
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
    [account, pvp.status, safeDisconnect, setMatchedFromEvent],
  );

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
            }));
            return;
          }

          setPvP((prev) => ({ ...prev, status: "matched" }));
          toast.info("Da gui ket qua, dang cho doi thu...");
        },
      );
    },
    [account, pvp.challengeId, pvp.submittedResult],
  );

  useEffect(() => {
    return () => {
      safeDisconnect();
    };
  }, [safeDisconnect]);

  return { pvp, joinQueue, leaveQueue, reportRound };
}
