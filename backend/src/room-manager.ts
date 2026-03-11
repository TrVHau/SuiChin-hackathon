import { MatchRoom, MatchStatus, PlayerId } from './types';
import { randomUUID } from 'crypto';

const rooms = new Map<string, MatchRoom>();

export function createRoom(players: [PlayerId, PlayerId], wager: number): MatchRoom {
  const room: MatchRoom = {
    id: randomUUID(),
    players,
    wager,
    status: 'matched',
    scores: [0, 0],
    createdAt: Date.now(),
  };
  rooms.set(room.id, room);
  return room;
}

export function getRoom(id: string): MatchRoom | undefined {
  return rooms.get(id);
}

export function updateStatus(id: string, status: MatchStatus): void {
  const room = rooms.get(id);
  if (room) room.status = status;
}

export function recordRoundWin(roomId: string, winnerId: PlayerId): {
  scores: [number, number];
  matchWinner: PlayerId | null;
} {
  const room = rooms.get(roomId);
  if (!room) throw new Error(`Room ${roomId} not found`);
  const idx = room.players.indexOf(winnerId) as 0 | 1;
  room.scores[idx]++;
  // Best of 3: first to 2 wins
  const matchWinner = room.scores[idx] >= 2 ? winnerId : null;
  return { scores: room.scores, matchWinner };
}

export function deleteRoom(id: string): void {
  rooms.delete(id);
}
