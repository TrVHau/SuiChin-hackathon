// Shared types across backend services

export type PlayerId = string; // wallet address

export type MatchStatus =
  | 'waiting'
  | 'matched'
  | 'locked'   // both players locked chun on-chain
  | 'playing'
  | 'resolved'
  | 'cancelled';

export interface MatchRoom {
  id: string;
  players: [PlayerId, PlayerId];
  wager: number;        // chun amount each player stakes
  status: MatchStatus;
  scores: [number, number]; // wins per player
  createdAt: number;    // epoch ms
}

// WS message types (client → server)
export interface JoinQueueMessage {
  type: 'join_queue';
  address: string;
  wager: number;
}

export interface LockConfirmedMessage {
  type: 'lock_confirmed';
  address: string;
  roomId: string;
  txDigest: string;     // on-chain tx digest for the lock_for_match tx
}

export interface RoundResultMessage {
  type: 'round_result';
  roomId: string;
  winnerId: PlayerId;   // address of round winner
}

export interface LeaveQueueMessage {
  type: 'leave_queue';
  address: string;
}

// WS message types (server → client)
export interface MatchFoundMessage {
  type: 'match_found';
  roomId: string;
  opponent: string;
  wager: number;
}

export interface WaitingMessage {
  type: 'waiting';
}

export interface LockRequestMessage {
  type: 'lock_request';
  roomId: string;
  wager: number;
}

export interface RoundStartMessage {
  type: 'round_start';
  roomId: string;
  round: number;        // 1, 2, or 3
}

export interface MatchResultMessage {
  type: 'match_result';
  roomId: string;
  winner: PlayerId;
  loser: PlayerId;
  txDigest: string;     // resolve_match transaction
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export type ServerMessage =
  | MatchFoundMessage
  | WaitingMessage
  | LockRequestMessage
  | RoundStartMessage
  | MatchResultMessage
  | ErrorMessage;

export type ClientMessage =
  | JoinQueueMessage
  | LockConfirmedMessage
  | RoundResultMessage
  | LeaveQueueMessage;
