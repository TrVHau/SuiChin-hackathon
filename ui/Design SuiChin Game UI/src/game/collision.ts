// Collision detection and resolution for SuiChin game

import type { Vector2D } from "./types";
import { vec2 } from "./physics";

// ============================================================================
// Types
// ============================================================================

export interface Circle {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
}

export type CollisionResult = "none" | "player_wins" | "bot_wins";

export interface CollisionInfo {
  collided: boolean;
  result: CollisionResult;
  normal: Vector2D;
  overlap: number;
}

// ============================================================================
// Constants
// ============================================================================

const COLLISION_CONFIG = {
  // Stomp detection thresholds
  STOMP_Y_THRESHOLD: 15, // Player must be this many pixels above bot's center
  STOMP_MIN_DOWN_VY: 3, // Minimum downward velocity to count as stomp

  // Settled overlap detection
  SETTLED_OVERLAP_MARGIN: 10, // Margin for "on top" detection
  OVERLAP_MIN_DISTANCE: 0.8, // Ratio of radii sum to consider overlapping

  // Physics response
  RESTITUTION: 0.8, // Bounciness (0-1)
  MIN_SEPARATION: 0.5, // Minimum separation after collision
};

// ============================================================================
// Collision Detection
// ============================================================================

/**
 * Check if two circles are overlapping
 */
export function checkCircleOverlap(a: Circle, b: Circle): boolean {
  const dist = vec2.distance(a.position, b.position);
  return dist < a.radius + b.radius;
}

/**
 * Get detailed collision info between two circles
 */
export function getCollisionInfo(a: Circle, b: Circle): CollisionInfo {
  const dist = vec2.distance(a.position, b.position);
  const minDist = a.radius + b.radius;

  if (dist >= minDist || dist === 0) {
    return {
      collided: false,
      result: "none",
      normal: { x: 0, y: 0 },
      overlap: 0,
    };
  }

  const normal = vec2.normalize(vec2.sub(b.position, a.position));
  const overlap = minDist - dist;

  return {
    collided: true,
    result: "none", // Will be determined by win detection
    normal,
    overlap,
  };
}

// ============================================================================
// Win Detection
// ============================================================================

/**
 * Check for stomp win during active collision
 * Player wins if:
 * - Player's Y is significantly above bot's Y (player.y < bot.y - threshold)
 * - Player has downward velocity (player.vy > minDownVy)
 *
 * Bot wins with same logic reversed.
 */
export function checkStompWin(player: Circle, bot: Circle): CollisionResult {
  const yDiff = bot.position.y - player.position.y;

  // Check player stomp (player above bot, moving down)
  if (
    yDiff > COLLISION_CONFIG.STOMP_Y_THRESHOLD &&
    player.velocity.y > COLLISION_CONFIG.STOMP_MIN_DOWN_VY
  ) {
    return "player_wins";
  }

  // Check bot stomp (bot above player, moving down)
  if (
    yDiff < -COLLISION_CONFIG.STOMP_Y_THRESHOLD &&
    bot.velocity.y > COLLISION_CONFIG.STOMP_MIN_DOWN_VY
  ) {
    return "bot_wins";
  }

  return "none";
}

/**
 * Check for overlap-based win after settling.
 *
 * Game logic (like real chun flicking on table - top-down view):
 * - When attacker's chun overlaps (lands on) defender's chun → ATTACKER WINS
 * - If no overlap after shot settles → switch turn
 *
 * @param player - Player's circle
 * @param bot - Bot's circle
 * @param lastAttacker - Who shot last: 'player' or 'bot'
 */
export function checkSettledOverlapWin(
  player: Circle,
  bot: Circle,
  lastAttacker: "player" | "bot" | null = null,
): CollisionResult {
  const dist = vec2.distance(player.position, bot.position);
  const sumRadii = player.radius + bot.radius;

  // Check if circles are overlapping (touching or intersecting)
  // Use tolerance of 0.95 - circles need to actually overlap, not just touch
  const isOverlapping = dist < sumRadii * 0.95;

  if (!isOverlapping) {
    // Not overlapping - no winner, switch turn
    return "none";
  }

  // Circles ARE overlapping!
  // The ATTACKER (who shot last) wins - they successfully "landed on" the opponent
  if (lastAttacker === "player") {
    return "player_wins";
  } else if (lastAttacker === "bot") {
    return "bot_wins";
  }

  // No attacker info - fallback to no winner
  return "none";
}

// ============================================================================
// Collision Resolution
// ============================================================================

/**
 * Resolve overlap between two circles by separating them
 */
export function resolveOverlap(
  a: Circle,
  b: Circle,
  info: CollisionInfo,
): { a: Circle; b: Circle } {
  if (!info.collided || info.overlap <= 0) {
    return { a, b };
  }

  const separation = info.overlap / 2 + COLLISION_CONFIG.MIN_SEPARATION;

  const newA: Circle = {
    ...a,
    position: vec2.sub(a.position, vec2.scale(info.normal, separation)),
  };

  const newB: Circle = {
    ...b,
    position: vec2.add(b.position, vec2.scale(info.normal, separation)),
  };

  return { a: newA, b: newB };
}

/**
 * Apply impulse response for elastic collision
 */
export function applyCollisionImpulse(
  a: Circle,
  b: Circle,
  info: CollisionInfo,
): { a: Circle; b: Circle } {
  if (!info.collided) {
    return { a, b };
  }

  // Calculate relative velocity along collision normal
  const relativeVelocity = vec2.sub(a.velocity, b.velocity);
  const velocityAlongNormal = vec2.dot(relativeVelocity, info.normal);

  // Don't resolve if velocities are separating
  if (velocityAlongNormal > 0) {
    return { a, b };
  }

  // Calculate impulse scalar (assuming equal mass)
  const impulseScalar =
    (-(1 + COLLISION_CONFIG.RESTITUTION) * velocityAlongNormal) / 2;

  // Apply impulse
  const impulse = vec2.scale(info.normal, impulseScalar);

  const newA: Circle = {
    ...a,
    velocity: vec2.sub(a.velocity, impulse),
  };

  const newB: Circle = {
    ...b,
    velocity: vec2.add(b.velocity, impulse),
  };

  return { a: newA, b: newB };
}

/**
 * Full collision resolution: detect, check win, resolve overlap, apply impulse
 * Returns updated circles and win result
 */
export function resolveCollision(
  player: Circle,
  bot: Circle,
): {
  player: Circle;
  bot: Circle;
  result: CollisionResult;
  collided: boolean;
} {
  const info = getCollisionInfo(player, bot);

  if (!info.collided) {
    return { player, bot, result: "none", collided: false };
  }

  // Check for stomp win BEFORE resolving collision
  const stompResult = checkStompWin(player, bot);
  if (stompResult !== "none") {
    // Still resolve the collision for visual purposes
    const separated = resolveOverlap(player, bot, info);
    return {
      player: separated.a,
      bot: separated.b,
      result: stompResult,
      collided: true,
    };
  }

  // Resolve overlap
  const separated = resolveOverlap(player, bot, info);

  // Apply impulse with updated info
  const newInfo = getCollisionInfo(separated.a, separated.b);
  const impulsed = applyCollisionImpulse(separated.a, separated.b, {
    ...newInfo,
    normal: info.normal, // Use original normal
  });

  return {
    player: impulsed.a,
    bot: impulsed.b,
    result: "none",
    collided: true,
  };
}

// ============================================================================
// Utility Exports
// ============================================================================

export { COLLISION_CONFIG };
