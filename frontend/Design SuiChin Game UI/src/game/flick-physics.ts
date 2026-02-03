// ============================================================================
// FLICK PHYSICS ENGINE - High-skill 2D turn-based "búng chun" game
// ============================================================================
// Core principle: Skill-based control, NOT realistic physics
// Win condition: Final visual overlap ("đè lên") only
// ============================================================================

import type { Vector2D } from "./types";

// ============================================================================
// Vector2D Utilities
// ============================================================================

export const vec2 = {
  add: (a: Vector2D, b: Vector2D): Vector2D => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vector2D, b: Vector2D): Vector2D => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (v: Vector2D, s: number): Vector2D => ({ x: v.x * s, y: v.y * s }),
  length: (v: Vector2D): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vector2D): Vector2D => {
    const len = vec2.length(v);
    return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
  },
  dot: (a: Vector2D, b: Vector2D): number => a.x * b.x + a.y * b.y,
  distance: (a: Vector2D, b: Vector2D): number => vec2.length(vec2.sub(a, b)),
  rotate: (v: Vector2D, angle: number): Vector2D => ({
    x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
    y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
  }),
  lerp: (a: Vector2D, b: Vector2D, t: number): Vector2D => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }),
};

// ============================================================================
// Physics Configuration
// ============================================================================

export const FLICK_CONFIG = {
  // === Chun properties ===
  CHUN_RADIUS: 32,

  // === Friction Model (CRITICAL) ===
  // Dynamic friction: high speed = slides more, low speed = grips
  FRICTION_HIGH_SPEED: 0.985, // Low friction when moving fast
  FRICTION_LOW_SPEED: 0.92, // High friction when slowing down
  FRICTION_SPEED_THRESHOLD: 3, // Speed below which high friction applies
  VELOCITY_EPSILON: 0.08, // Snap to zero below this
  SETTLE_FRAMES_REQUIRED: 25, // Frames at near-zero to confirm settled

  // === Flick Strength Curve (NON-LINEAR) ===
  // Small pulls = precise, Medium = optimal, Large = punished
  MAX_PULL_LENGTH: 120, // Max drag distance
  OPTIMAL_PULL_RATIO: 0.6, // 60% of max = optimal power
  OVERSHOOT_PENALTY_START: 0.75, // Start punishing above 75%

  // Power scaling (non-linear curve)
  POWER_MIN: 2,
  POWER_OPTIMAL: 12,
  POWER_MAX: 10, // Max is LESS than optimal (overshoot punishment)

  // Overshoot punishment
  OVERSHOOT_FRICTION_MULT: 1.3, // Extra friction on overshoot
  OVERSHOOT_DEVIATION_MAX: 0.15, // Max angular deviation (radians)

  // === Off-center Flick ===
  // Contact offset causes lateral drift
  OFF_CENTER_DRIFT_SCALE: 0.3, // How much off-center affects direction
  OFF_CENTER_POWER_LOSS: 0.15, // Power loss for off-center hits

  // === Collision ===
  // Khi bắn trúng: attacker chậm lại và có thể đè lên defender
  COLLISION_ATTACKER_SLOWDOWN: 0.15, // Attacker giữ lại 15% tốc độ (dừng gần như ngay)
  COLLISION_DEFENDER_PUSH: 0.25, // Defender bị đẩy nhẹ (25% của impulse)
  COLLISION_MIN_OVERLAP: 0.3, // Cho phép overlap 30% bán kính (để đè lên nhau)

  // === Wall Bounce ===
  WALL_BOUNCE: 0.5, // Energy retained on wall hit

  // === Win Detection ===
  WIN_OVERLAP_TOLERANCE: 1.0, // Chỉ cần chạm nhau (dist < sumRadii) là đủ để xét thắng
  WIN_Y_MARGIN: 3, // Y difference needed to decide "on top"

  // === Game Feel ===
  HIT_STOP_FRAMES: 4, // Freeze frames on win (~66ms at 60fps)
  CAMERA_SHAKE_INTENSITY: 8,
  TRAIL_LENGTH: 5,

  // === Bot AI ===
  BOT_THINK_TIME_MIN: 600,
  BOT_THINK_TIME_MAX: 1400,

  // Bot difficulty by tier (1 = easy, 3 = hard)
  BOT_DIFFICULTY: {
    1: {
      // DỄ - Bot ngu, bắn lung tung
      aimError: Math.PI / 1.8, // ~100 degrees - bắn rất sai
      powerError: 0.6, // Sai lệch lực 60%
      overshootChance: 0.7, // 70% bắn quá mạnh
      optimalAimChance: 0.1, // Chỉ 10% bắn chính xác vào player
      randomShotChance: 0.3, // 30% bắn random hoàn toàn
      thinkTimeMin: 400,
      thinkTimeMax: 800, // Bắn nhanh, không suy nghĩ
    },
    2: {
      // BÌNH THƯỜNG - Bot cân bằng
      aimError: Math.PI / 6, // ~30 degrees - sai vừa phải
      powerError: 0.3,
      overshootChance: 0.35, // Đôi khi overshoot
      optimalAimChance: 0.5, // 50% bắn chính xác
      randomShotChance: 0.1, // 10% bắn random
      thinkTimeMin: 800,
      thinkTimeMax: 1400,
    },
    3: {
      // KHÓ - Bot thông minh, bắn chính xác
      aimError: Math.PI / 15, // ~12 degrees - rất chính xác
      powerError: 0.08, // Sai lệch rất ít
      overshootChance: 0.05, // Hiếm khi overshoot
      optimalAimChance: 0.85, // 85% bắn chính xác vào player
      randomShotChance: 0, // Không bắn random
      thinkTimeMin: 1200,
      thinkTimeMax: 2000, // Suy nghĩ lâu hơn
    },
  } as Record<
    number,
    {
      aimError: number;
      powerError: number;
      overshootChance: number;
      optimalAimChance: number;
      randomShotChance: number;
      thinkTimeMin: number;
      thinkTimeMax: number;
    }
  >,

  // === Timing ===
  MAX_SIMULATION_FRAMES: 300, // Force settle after this many frames
};

// ============================================================================
// Types
// ============================================================================

export interface Chun {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  label: string;
  // For game feel
  lastSpeed: number;
  trailPositions: Vector2D[];
}

export interface WorldBounds {
  width: number;
  height: number;
}

export type WinResult = "none" | "player_wins" | "bot_wins";

export interface FlickInput {
  direction: Vector2D; // Normalized direction
  power: number; // 0-1 normalized
  contactOffset: Vector2D; // Offset from center where finger touched
}

export interface FlickResult {
  velocity: Vector2D;
  wasOvershoot: boolean;
  effectivePower: number;
}

// ============================================================================
// Chun Factory
// ============================================================================

export function createChun(
  x: number,
  y: number,
  color: string,
  label: string,
): Chun {
  return {
    position: { x, y },
    velocity: { x: 0, y: 0 },
    radius: FLICK_CONFIG.CHUN_RADIUS,
    color,
    label,
    lastSpeed: 0,
    trailPositions: [],
  };
}

// ============================================================================
// Flick Calculation (HIGH SKILL)
// ============================================================================

/**
 * Calculate flick velocity from player input
 * Implements non-linear strength curve with overshoot punishment
 */
export function calculateFlickVelocity(input: FlickInput): FlickResult {
  const { direction, power, contactOffset } = input;
  const cfg = FLICK_CONFIG;

  // === Non-linear power curve ===
  let effectivePower: number;
  let wasOvershoot = false;
  let deviationAngle = 0;

  if (power <= cfg.OPTIMAL_PULL_RATIO) {
    // Below optimal: linear scaling up to optimal power
    const t = power / cfg.OPTIMAL_PULL_RATIO;
    effectivePower = cfg.POWER_MIN + (cfg.POWER_OPTIMAL - cfg.POWER_MIN) * t;
  } else if (power <= cfg.OVERSHOOT_PENALTY_START) {
    // Between optimal and penalty: slight decrease
    const t =
      (power - cfg.OPTIMAL_PULL_RATIO) /
      (cfg.OVERSHOOT_PENALTY_START - cfg.OPTIMAL_PULL_RATIO);
    effectivePower =
      cfg.POWER_OPTIMAL - (cfg.POWER_OPTIMAL - cfg.POWER_MAX) * t * 0.3;
  } else {
    // Overshoot zone: punished
    wasOvershoot = true;
    const overshootAmount =
      (power - cfg.OVERSHOOT_PENALTY_START) / (1 - cfg.OVERSHOOT_PENALTY_START);

    // Power decreases significantly
    effectivePower = cfg.POWER_MAX * (1 - overshootAmount * 0.4);

    // Add angular deviation (punishment)
    deviationAngle =
      (Math.random() - 0.5) * cfg.OVERSHOOT_DEVIATION_MAX * overshootAmount * 2;
  }

  // === Off-center contact effect ===
  const offsetMagnitude = vec2.length(contactOffset);
  if (offsetMagnitude > 0.1) {
    // Reduce power for off-center hits
    effectivePower *= 1 - offsetMagnitude * cfg.OFF_CENTER_POWER_LOSS;

    // Add lateral drift
    const perpendicular = { x: -direction.y, y: direction.x };
    const driftDirection = vec2.dot(contactOffset, perpendicular) > 0 ? 1 : -1;
    deviationAngle +=
      driftDirection * offsetMagnitude * cfg.OFF_CENTER_DRIFT_SCALE;
  }

  // Apply deviation
  const finalDirection = vec2.rotate(direction, deviationAngle);

  // Calculate final velocity
  const velocity = vec2.scale(finalDirection, effectivePower);

  return {
    velocity,
    wasOvershoot,
    effectivePower,
  };
}

/**
 * Convert drag input to flick
 */
export function dragToFlick(
  chunCenter: Vector2D,
  dragStart: Vector2D,
  dragEnd: Vector2D,
): FlickInput {
  const pullVector = vec2.sub(dragEnd, dragStart);
  const pullLength = vec2.length(pullVector);

  // Direction is OPPOSITE of pull (slingshot style)
  const direction =
    pullLength > 0
      ? vec2.normalize(vec2.scale(pullVector, -1))
      : { x: 0, y: 0 };

  // Power is normalized pull length
  const power = Math.min(pullLength / FLICK_CONFIG.MAX_PULL_LENGTH, 1);

  // Contact offset: where did the drag start relative to chun center
  const contactOffset = vec2.sub(dragStart, chunCenter);
  // Normalize to radius
  const normalizedOffset = vec2.scale(
    contactOffset,
    1 / FLICK_CONFIG.CHUN_RADIUS,
  );

  return {
    direction,
    power,
    contactOffset: normalizedOffset,
  };
}

// ============================================================================
// Physics Update
// ============================================================================

/**
 * Update chun physics for one frame
 * Implements dynamic friction model
 */
export function updateChunPhysics(
  chun: Chun,
  bounds: WorldBounds,
  wasOvershoot: boolean = false,
): void {
  const cfg = FLICK_CONFIG;
  const speed = vec2.length(chun.velocity);

  // Store for trail
  chun.lastSpeed = speed;
  if (speed > 2) {
    chun.trailPositions.unshift({ ...chun.position });
    if (chun.trailPositions.length > cfg.TRAIL_LENGTH) {
      chun.trailPositions.pop();
    }
  } else {
    chun.trailPositions = [];
  }

  // === Dynamic Friction ===
  let friction: number;
  if (speed > cfg.FRICTION_SPEED_THRESHOLD) {
    // High speed: low friction (slides)
    friction = cfg.FRICTION_HIGH_SPEED;
  } else {
    // Low speed: high friction (grips)
    friction = cfg.FRICTION_LOW_SPEED;
  }

  // Extra friction if overshoot
  if (wasOvershoot) {
    friction /= cfg.OVERSHOOT_FRICTION_MULT;
  }

  // Apply friction
  chun.velocity = vec2.scale(chun.velocity, friction);

  // Snap to zero
  if (vec2.length(chun.velocity) < cfg.VELOCITY_EPSILON) {
    chun.velocity = { x: 0, y: 0 };
  }

  // Update position
  chun.position = vec2.add(chun.position, chun.velocity);

  // === Wall Collisions ===
  const r = chun.radius;

  // Left wall
  if (chun.position.x - r < 0) {
    chun.position.x = r;
    chun.velocity.x = Math.abs(chun.velocity.x) * cfg.WALL_BOUNCE;
  }
  // Right wall
  if (chun.position.x + r > bounds.width) {
    chun.position.x = bounds.width - r;
    chun.velocity.x = -Math.abs(chun.velocity.x) * cfg.WALL_BOUNCE;
  }
  // Top wall
  if (chun.position.y - r < 0) {
    chun.position.y = r;
    chun.velocity.y = Math.abs(chun.velocity.y) * cfg.WALL_BOUNCE;
  }
  // Bottom wall
  if (chun.position.y + r > bounds.height) {
    chun.position.y = bounds.height - r;
    chun.velocity.y = -Math.abs(chun.velocity.y) * cfg.WALL_BOUNCE;
  }
}

// ============================================================================
// Collision Resolution
// ============================================================================

/**
 * Resolve collision between two chuns
 *
 * Logic búng chun thật:
 * - Khi attacker bắn trúng defender → attacker chậm lại/dừng
 * - Defender bị đẩy nhẹ
 * - Cho phép overlap (đè lên nhau) - đây là cách thắng!
 */
export function resolveChunCollision(
  a: Chun,
  b: Chun,
  aIsAttacker: boolean = true,
): boolean {
  const cfg = FLICK_CONFIG;
  const dist = vec2.distance(a.position, b.position);
  const minDist = a.radius + b.radius;

  // Cho phép overlap - chỉ xử lý khi overlap quá sâu
  const allowedOverlap = minDist * cfg.COLLISION_MIN_OVERLAP;
  const effectiveMinDist = minDist - allowedOverlap;

  if (dist >= effectiveMinDist) return false;

  // Collision detected - nhưng cho phép một phần overlap
  const normal = vec2.normalize(vec2.sub(b.position, a.position));
  const overlap = effectiveMinDist - dist;

  // Chỉ separate phần overlap quá sâu (giữ lại khoảng cho phép)
  if (overlap > 0) {
    const separation = overlap / 2;
    a.position = vec2.sub(a.position, vec2.scale(normal, separation));
    b.position = vec2.add(b.position, vec2.scale(normal, separation));
  }

  // === Velocity handling ===
  const aSpeed = vec2.length(a.velocity);
  const bSpeed = vec2.length(b.velocity);

  // Xác định ai là attacker (đang di chuyển nhanh hơn)
  const aIsMoving = aSpeed > 0.5;
  const bIsMoving = bSpeed > 0.5;

  if (aIsMoving && !bIsMoving) {
    // A đang bắn vào B đứng yên
    // A chậm lại mạnh (như bị "dính")
    a.velocity = vec2.scale(a.velocity, cfg.COLLISION_ATTACKER_SLOWDOWN);

    // B bị đẩy nhẹ
    const pushStrength = aSpeed * cfg.COLLISION_DEFENDER_PUSH;
    b.velocity = vec2.add(b.velocity, vec2.scale(normal, pushStrength));
  } else if (bIsMoving && !aIsMoving) {
    // B đang bắn vào A đứng yên
    b.velocity = vec2.scale(b.velocity, cfg.COLLISION_ATTACKER_SLOWDOWN);

    const pushStrength = bSpeed * cfg.COLLISION_DEFENDER_PUSH;
    a.velocity = vec2.sub(a.velocity, vec2.scale(normal, pushStrength));
  } else if (aIsMoving && bIsMoving) {
    // Cả hai đang di chuyển - xử lý như va chạm thường
    const relativeVel = vec2.sub(a.velocity, b.velocity);
    const relativeSpeed = vec2.dot(relativeVel, normal);

    if (relativeSpeed > 0) {
      // Exchange với energy loss
      const impulse = relativeSpeed * 0.4;
      const impulseVec = vec2.scale(normal, impulse);
      a.velocity = vec2.sub(a.velocity, impulseVec);
      b.velocity = vec2.add(b.velocity, impulseVec);
    }
  }

  return true;
}

// ============================================================================
// Settled Detection
// ============================================================================

/**
 * Check if a chun is settled (not moving)
 */
export function isChunSettled(chun: Chun): boolean {
  return vec2.length(chun.velocity) < FLICK_CONFIG.VELOCITY_EPSILON;
}

/**
 * Check if both chuns are settled
 */
export function areBothSettled(a: Chun, b: Chun): boolean {
  return isChunSettled(a) && isChunSettled(b);
}

// ============================================================================
// Win Detection (CRITICAL)
// ============================================================================

/**
 * Check for win after both chuns have settled
 * Win is decided ONLY by final visual overlap
 *
 * Rules:
 * 1. If circles do NOT overlap → no winner
 * 2. If circles overlap → attacker wins (they successfully "đè lên")
 *
 * @param player - Player's chun
 * @param bot - Bot's chun
 * @param lastAttacker - Who flicked last
 */
export function checkSettledWin(
  player: Chun,
  bot: Chun,
  lastAttacker: "player" | "bot" | null,
): WinResult {
  const cfg = FLICK_CONFIG;
  const dist = vec2.distance(player.position, bot.position);
  const sumRadii = player.radius + bot.radius;

  // Check overlap
  const isOverlapping = dist < sumRadii * cfg.WIN_OVERLAP_TOLERANCE;

  if (!isOverlapping) {
    // No overlap → no winner, switch turn
    return "none";
  }

  // Circles ARE overlapping!
  // The ATTACKER (who flicked last) wins
  if (lastAttacker === "player") {
    return "player_wins";
  } else if (lastAttacker === "bot") {
    return "bot_wins";
  }

  // Fallback: check who is visually "on top" (smaller Y)
  const yDiff = bot.position.y - player.position.y;
  if (yDiff > cfg.WIN_Y_MARGIN) {
    return "player_wins";
  } else if (yDiff < -cfg.WIN_Y_MARGIN) {
    return "bot_wins";
  }

  // Truly ambiguous → favor attacker
  return lastAttacker === "player" ? "player_wins" : "bot_wins";
}

// ============================================================================
// Bot AI (Fair but Strong)
// ============================================================================

/**
 * Calculate bot's flick
 * Bot follows same rules as player, no cheating
 *
 * Tier 1 (DỄ): Bắn lung tung, hay sai
 * Tier 2 (BÌNH THƯỜNG): Cân bằng, đôi khi sai
 * Tier 3 (KHÓ): Thông minh, bắn chính xác
 */
export function calculateBotFlick(
  bot: Chun,
  player: Chun,
  tier: number,
): FlickInput {
  const cfg = FLICK_CONFIG;
  const difficulty = cfg.BOT_DIFFICULTY[tier] || cfg.BOT_DIFFICULTY[2];

  // === Random shot chance (chỉ bot dễ mới bắn random) ===
  if (Math.random() < difficulty.randomShotChance) {
    // Bắn random hoàn toàn (bot ngu)
    const randomAngle = Math.random() * Math.PI * 2;
    const randomPower = 0.3 + Math.random() * 0.5;
    return {
      direction: { x: Math.cos(randomAngle), y: Math.sin(randomAngle) },
      power: randomPower,
      contactOffset: { x: 0, y: 0 },
    };
  }

  // === Aim calculation ===
  let direction: Vector2D;

  if (Math.random() < difficulty.optimalAimChance) {
    // Bắn chính xác vào player
    const toPlayer = vec2.normalize(vec2.sub(player.position, bot.position));
    const aimError = (Math.random() - 0.5) * difficulty.aimError;
    direction = vec2.rotate(toPlayer, aimError);
  } else {
    // Bắn sai hướng (aim không tốt)
    const toPlayer = vec2.normalize(vec2.sub(player.position, bot.position));
    // Sai hướng nhiều hơn
    const bigError = (Math.random() - 0.5) * difficulty.aimError * 2;
    direction = vec2.rotate(toPlayer, bigError);
  }

  // === Power calculation ===
  const dist = vec2.distance(bot.position, player.position);
  const maxDist = 500;
  const basePower = Math.min(dist / maxDist, 0.9);

  let targetPower: number;

  if (Math.random() < difficulty.overshootChance) {
    // Overshoot (bắn quá mạnh - bad)
    targetPower = cfg.OVERSHOOT_PENALTY_START + Math.random() * 0.25;
  } else {
    // Aim for optimal zone
    // Bot khó biết optimal zone tốt hơn
    const optimalVariance = tier === 3 ? 0.1 : tier === 2 ? 0.2 : 0.4;
    targetPower =
      cfg.OPTIMAL_PULL_RATIO *
      (1 - optimalVariance + Math.random() * optimalVariance * 2);
  }

  // Add power variance based on difficulty
  const powerError = (Math.random() - 0.5) * difficulty.powerError;
  const power = Math.max(0.2, Math.min(1, targetPower + powerError));

  // Bot doesn't have off-center issues (consistent)
  const contactOffset = { x: 0, y: 0 };

  return {
    direction,
    power,
    contactOffset,
  };
}

/**
 * Get bot think time based on tier
 */
export function getBotThinkTime(tier: number = 2): number {
  const cfg = FLICK_CONFIG;
  const difficulty = cfg.BOT_DIFFICULTY[tier] || cfg.BOT_DIFFICULTY[2];
  return (
    difficulty.thinkTimeMin +
    Math.random() * (difficulty.thinkTimeMax - difficulty.thinkTimeMin)
  );
}

// ============================================================================
// Rendering Helpers
// ============================================================================

/**
 * Get power indicator color
 */
export function getPowerColor(power: number): string {
  const cfg = FLICK_CONFIG;

  if (power < cfg.OPTIMAL_PULL_RATIO) {
    // Green to yellow (building up)
    const t = power / cfg.OPTIMAL_PULL_RATIO;
    const r = Math.floor(t * 255);
    const g = 255;
    return `rgb(${r}, ${g}, 0)`;
  } else if (power < cfg.OVERSHOOT_PENALTY_START) {
    // Yellow (optimal zone)
    return "#facc15";
  } else {
    // Red (overshoot zone)
    const t =
      (power - cfg.OVERSHOOT_PENALTY_START) / (1 - cfg.OVERSHOOT_PENALTY_START);
    const g = Math.floor((1 - t) * 180);
    return `rgb(255, ${g}, 0)`;
  }
}

/**
 * Get power zone label
 */
export function getPowerZone(
  power: number,
): "weak" | "optimal" | "strong" | "overshoot" {
  const cfg = FLICK_CONFIG;
  if (power < 0.3) return "weak";
  if (power < cfg.OPTIMAL_PULL_RATIO) return "strong";
  if (power < cfg.OVERSHOOT_PENALTY_START) return "optimal";
  return "overshoot";
}
