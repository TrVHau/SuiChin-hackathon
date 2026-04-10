import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useGame } from "@/providers/GameContext";
import { BACKEND_URL } from "@/config/sui.config";

export enum RoomState {
  WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
  CHOOSING_PHASE = "CHOOSING_PHASE",
  VALUATING_PHASE = "VALUATING_PHASE",
  SETTLED = "SETTLED",
}

export function usePvPSocket(roomId: string) {
  const { account } = useGame();
  const socketRef = useRef<Socket | null>(null);

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [playersReady, setPlayersReady] = useState(0);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    winner: string;
    loser: string;
    signature: string;
    signatureBytes: string;
  } | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  useEffect(() => {
    if (!account || !roomId) return;

    // Connect to backend server
    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsDisconnected(false);
      // Join Room
      socket.emit("join_room", {
        roomId,
        walletAddress: account.address,
      });
    });

    socket.on("disconnect", () => {
      setIsDisconnected(true);
    });

    socket.on(
      "room_state_update",
      (data: { state: RoomState; playersReady: number }) => {
        setRoomState(data.state);
        setPlayersReady(data.playersReady);
      },
    );

    socket.on(
      "player_disconnected",
      (data: { walletAddress: string; gracePeriodMs: number }) => {
        if (data.walletAddress !== account.address) {
          setOpponentDisconnected(true);
        }
      },
    );

    socket.on(
      "match_settled",
      (data: {
        winner: string;
        loser: string;
        signature: string;
        signatureBytes: string;
      }) => {
        setRoomState(RoomState.SETTLED);
        setMatchResult(data);
        setOpponentDisconnected(false);
      },
    );

    socket.on("error", (err: any) => {
      console.error("Socket error:", err);
    });

    return () => {
      socket.disconnect();
    };
  }, [account, roomId]);

  const selectNft = useCallback(
    (nftId: string) => {
      if (socketRef.current && account) {
        socketRef.current.emit("select_nft", {
          roomId,
          walletAddress: account.address,
          nftId,
        });
      }
    },
    [account, roomId],
  );

  return {
    roomState,
    playersReady,
    isDisconnected,
    opponentDisconnected,
    matchResult,
    selectNft,
  };
}
