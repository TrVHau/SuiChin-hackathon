import { PlayerId } from './types';

interface QueueEntry {
  address: PlayerId;
  wager: number;
  joinedAt: number;
}

// Simple in-memory FIFO queue, partitioned by wager amount.
// For production: use Redis sorted sets.
const queues = new Map<number, QueueEntry[]>();

export function enqueue(address: PlayerId, wager: number): void {
  if (!queues.has(wager)) queues.set(wager, []);
  // Prevent double-queue
  const q = queues.get(wager)!;
  if (q.some(e => e.address === address)) return;
  q.push({ address, wager, joinedAt: Date.now() });
}

export function dequeue(address: PlayerId, wager: number): void {
  const q = queues.get(wager);
  if (!q) return;
  const idx = q.findIndex(e => e.address === address);
  if (idx !== -1) q.splice(idx, 1);
}

/**
 * Try to pop two players with matching wager.
 * Returns [player1, player2] or null.
 */
export function tryMatch(wager: number): [PlayerId, PlayerId] | null {
  const q = queues.get(wager);
  if (!q || q.length < 2) return null;
  const p1 = q.shift()!;
  const p2 = q.shift()!;
  return [p1.address, p2.address];
}
