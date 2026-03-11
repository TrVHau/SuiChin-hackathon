import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { buildLockForMatchTx } from '@/lib/sui-client';
import { BACKEND_WS_URL } from '@/config/sui.config';
import type { ServerMessage } from '../../../backend/src/types';

export type PvPStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'matched'
  | 'locking'
  | 'playing'
  | 'resolved'
  | 'error';

export interface PvPState {
  status: PvPStatus;
  roomId: string | null;
  opponent: string | null;
  wager: number;
  round: number;
  scores: [number, number]; // [mine, opponent]
  resultTx: string | null;
  winner: string | null;
}

const INITIAL_STATE: PvPState = {
  status: 'idle',
  roomId: null,
  opponent: null,
  wager: 0,
  round: 1,
  scores: [0, 0],
  resultTx: null,
  winner: null,
};

export function usePvP(profileId: string | undefined) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const wsRef = useRef<WebSocket | null>(null);

  const [pvp, setPvP] = useState<PvPState>(INITIAL_STATE);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const handleMessage = useCallback(
    (raw: string) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(raw) as ServerMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case 'waiting':
          setPvP(s => ({ ...s, status: 'waiting' }));
          break;

        case 'match_found':
          setPvP(s => ({
            ...s,
            status: 'matched',
            roomId: msg.roomId,
            opponent: msg.opponent,
            wager: msg.wager,
          }));
          toast.success(`Tìm thấy đối thủ! Đang lock ${msg.wager} Chun...`);
          // Auto-lock on-chain
          if (profileId) {
            signAndExecute(
              { transaction: buildLockForMatchTx(profileId, msg.wager) },
              {
                onSuccess: (result) => {
                  setPvP(s => ({ ...s, status: 'locking' }));
                  send({
                    type: 'lock_confirmed',
                    address: account?.address,
                    roomId: msg.roomId,
                    txDigest: result.digest,
                  });
                },
                onError: (err) => {
                  toast.error(`Lock thất bại: ${err.message}`);
                  setPvP(s => ({ ...s, status: 'error' }));
                },
              },
            );
          }
          break;

        case 'round_start':
          setPvP(s => ({ ...s, status: 'playing', round: msg.round }));
          break;

        case 'match_result':
          setPvP(s => ({
            ...s,
            status: 'resolved',
            winner: msg.winner,
            resultTx: msg.txDigest,
          }));
          if (msg.winner === account?.address) {
            toast.success('Bạn thắng! 🏆');
          } else {
            toast.error('Bạn thua! 💀');
          }
          break;

        case 'error':
          toast.error(`[PvP] ${msg.message}`);
          setPvP(s => ({ ...s, status: 'error' }));
          break;
      }
    },
    [account, profileId, send, signAndExecute],
  );

  const joinQueue = useCallback(
    (wager: number) => {
      if (!account?.address) {
        toast.error('Vui lòng kết nối ví');
        return;
      }
      if (pvp.status !== 'idle' && pvp.status !== 'error') return;

      const ws = new WebSocket(BACKEND_WS_URL);
      wsRef.current = ws;
      setPvP({ ...INITIAL_STATE, status: 'connecting', wager });

      ws.onopen = () => {
        send({ type: 'join_queue', address: account.address, wager });
      };
      ws.onmessage = (e: MessageEvent<string>) => handleMessage(e.data);
      ws.onerror = () => {
        toast.error('Không kết nối được Backend');
        setPvP(s => ({ ...s, status: 'error' }));
      };
      ws.onclose = () => {
        if (pvp.status === 'playing') {
          toast.info('Kết nối bị ngắt');
        }
      };
    },
    [account, pvp.status, send, handleMessage],
  );

  const leaveQueue = useCallback(() => {
    if (account?.address) send({ type: 'leave_queue', address: account.address });
    wsRef.current?.close();
    setPvP(INITIAL_STATE);
  }, [account, send]);

  /** Report round result to backend (called after game engine decides winner). */
  const reportRound = useCallback(
    (winnerId: string) => {
      if (!pvp.roomId) return;
      send({ type: 'round_result', roomId: pvp.roomId, winnerId });
    },
    [pvp.roomId, send],
  );

  // Clean up on unmount
  useEffect(() => () => void wsRef.current?.close(), []);

  return { pvp, joinQueue, leaveQueue, reportRound };
}
