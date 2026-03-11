import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import {
  ClientMessage,
  ServerMessage,
  PlayerId,
} from './types';
import { enqueue, dequeue, tryMatch } from './matchmaking';
import { createRoom, getRoom, updateStatus, recordRoundWin, deleteRoom } from './room-manager';
import { resolveMatchOnChain, getProfileId } from './sui-client';

// Map address → WebSocket for sending messages to specific players
const connections = new Map<PlayerId, WebSocket>();
// Map wsSocket → address for cleanup on disconnect
const socketToAddress = new Map<WebSocket, PlayerId>();

// Track how many players in a room confirmed lock
const lockConfirms = new Map<string, Set<PlayerId>>();

function send(address: PlayerId, msg: ServerMessage): void {
  const ws = connections.get(address);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(players: [PlayerId, PlayerId], msg: ServerMessage): void {
  players.forEach(p => send(p, msg));
}

export function attachWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    ws.on('message', async (raw: WebSocket.RawData) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        ws.send(JSON.stringify({ type: 'error', code: 'INVALID_JSON', message: 'Invalid JSON' }));
        return;
      }

      switch (msg.type) {
        case 'join_queue': {
          const { address, wager } = msg;
          connections.set(address, ws);
          socketToAddress.set(ws, address);

          enqueue(address, wager);
          const pair = tryMatch(wager);

          if (!pair) {
            send(address, { type: 'waiting' });
            break;
          }

          const room = createRoom(pair, wager);
          broadcast(pair, {
            type: 'match_found',
            roomId: room.id,
            opponent: pair[1],  // each player receives the OTHER; handled per-side below
            wager,
          });
          // Send correct opponent per player
          send(pair[0], { type: 'match_found', roomId: room.id, opponent: pair[1], wager });
          send(pair[1], { type: 'match_found', roomId: room.id, opponent: pair[0], wager });
          break;
        }

        case 'lock_confirmed': {
          const { address, roomId, txDigest: _digest } = msg;
          // TODO: (production) verify tx digest on-chain
          if (!lockConfirms.has(roomId)) lockConfirms.set(roomId, new Set());
          lockConfirms.get(roomId)!.add(address);

          const room = getRoom(roomId);
          if (!room) break;

          if (lockConfirms.get(roomId)!.size === 2) {
            updateStatus(roomId, 'playing');
            broadcast(room.players, { type: 'round_start', roomId, round: 1 });
          }
          break;
        }

        case 'round_result': {
          const { roomId, winnerId } = msg;
          const room = getRoom(roomId);
          if (!room || room.status !== 'playing') break;

          const { scores, matchWinner } = recordRoundWin(roomId, winnerId);
          const round = scores[0] + scores[1] + 1;

          if (matchWinner) {
            // Resolve on-chain
            updateStatus(roomId, 'resolved');
            const loserId = room.players.find(p => p !== matchWinner)!;
            try {
              const winnerProfile = await getProfileId(matchWinner);
              const loserProfile  = await getProfileId(loserId);
              if (!winnerProfile || !loserProfile) throw new Error('Profile not found');

              const txDigest = await resolveMatchOnChain(
                winnerProfile,
                loserProfile,
                room.wager,
              );
              broadcast(room.players, {
                type: 'match_result',
                roomId,
                winner: matchWinner,
                loser: loserId,
                txDigest,
              });
            } catch (err) {
              broadcast(room.players, {
                type: 'error',
                code: 'RESOLVE_FAILED',
                message: String(err),
              });
            } finally {
              lockConfirms.delete(roomId);
              deleteRoom(roomId);
            }
          } else {
            broadcast(room.players, { type: 'round_start', roomId, round });
          }
          break;
        }

        case 'leave_queue': {
          const { address } = msg;
          // Remove from all queues — iterate common wagers or track per address
          [1, 5, 10, 20, 50].forEach(w => dequeue(address, w));
          break;
        }
      }
    });

    ws.on('close', () => {
      const address = socketToAddress.get(ws);
      if (address) {
        [1, 5, 10, 20, 50].forEach(w => dequeue(address, w));
        connections.delete(address);
        socketToAddress.delete(ws);
      }
    });
  });
}
