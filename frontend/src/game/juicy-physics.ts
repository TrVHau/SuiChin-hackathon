
import type { Vector2D } from "./types";

export const vec2 = {
  add: (a: Vector2D, b: Vector2D): Vector2D => ({
    x: a.x + b.x,
    y: a.y + b.y,
  }),
  sub: (a: Vector2D, b: Vector2D): Vector2D => ({
    x: a.x - b.x,
    y: a.y - b.y,
  }),
  scale: (v: Vector2D, s: number): Vector2D => ({
    x: v.x * s,
    y: v.y * s,
  }),
  length: (v: Vector2D): number => Math.sqrt(v.x * v.x + v.y * v.y),
  lengthSq: (v: Vector2D): number => v.x * v.x + v.y * v.y,
  normalize: (v: Vector2D): Vector2D => {
    const len = vec2.length(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },
  dot: (a: Vector2D, b: Vector2D): number => a.x * b.x + a.y * b.y,
  cross2D: (a: Vector2D, b: Vector2D): number => a.x * b.y - a.y * b.x,
  distance: (a: Vector2D, b: Vector2D): number => vec2.length(vec2.sub(a, b)),
  distanceSq: (a: Vector2D, b: Vector2D): number =>
    vec2.lengthSq(vec2.sub(a, b)),
  clone: (v: Vector2D): Vector2D => ({ x: v.x, y: v.y }),
  zero: (): Vector2D => ({ x: 0, y: 0 }),
  lerp: (a: Vector2D, b: Vector2D, t: number): Vector2D => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }),
  rotate: (v: Vector2D, angle: number): Vector2D => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    };
  },
  reflect: (v: Vector2D, normal: Vector2D): Vector2D => {
    const dot = vec2.dot(v, normal);
    return vec2.sub(v, vec2.scale(normal, 2 * dot));
  },
  perpendicular: (v: Vector2D): Vector2D => ({ x: -v.y, y: v.x }),
};

export const PHYSICS_CONFIG = {
  GRAVITY: 0,
  FRICTION: 0.96,
  VELOCITY_SNAP_THRESHOLD: 0.1,

  WALL_BOUNCE: 0.7,

  MAX_PULL_DISTANCE: 120,
  MIN_PULL_TO_LAUNCH: 12,

  PULL_POWER_BASE: 3,
  PULL_POWER_MULTIPLIER: 12,
  PULL_POWER_CURVE: 0.5,

  LAUNCH_DELAY_FRAMES: 1,
  // ─────────────────────────────────────────────────────────────────────────
  // CIRCLE-TO-CIRCLE COLLISION - Exaggerated push, favors attacker
  // ─────────────────────────────────────────────────────────────────────────
  RESTITUTION: 0.85,
  COLLISION_BIAS: 1.4,
  ATTACKER_PUSH_BONUS: 0.25,
  MIN_SEPARATION_VELOCITY: 0.8,
  WIN_Y_MARGIN: 5,
  WIN_OVERLAP_REQUIRED: 0.1,
  ATTACKER_ADVANTAGE: true,
  // ─────────────────────────────────────────────────────────────────────────
  // SETTLING & TURN SWITCH - Physics runs until both chuns settle
  // ─────────────────────────────────────────────────────────────────────────
  VELOCITY_THRESHOLD: 0.15, // Speed below this = considered stopped
  SETTLE_FRAMES_REQUIRED: 20, // Consecutive low-velocity frames to settle
  MAX_SIMULATION_FRAMES: 480, // Force settle after this many frames (8s @ 60fps)
  MAX_TURNS: 8, // Maximum number of turns before forced win check

  // ─────────────────────────────────────────────────────────────────────────
  // JUICE & GAME FEEL
  // ─────────────────────────────────────────────────────────────────────────
  HIT_STOP_FRAMES: 4, // Freeze frames on stomp win
  SQUASH_AMOUNT: 0.15, // How much to squash on impact (0-1)
  SQUASH_RECOVERY_SPEED: 0.2, // How fast squash returns to normal
  TRAIL_LENGTH: 8, // Number of trail positions to keep
  TRAIL_MIN_SPEED: 3, // Minimum speed to show trail
};


export interface Chun {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;

  // Juice state
  squash: number; // Current squash factor (0 = normal, positive = squashed)
  trailPositions: Vector2D[]; // Recent positions for trail effect

  // Identity
  isPlayer: boolean;
  color: string;
  label: string;
}

export function createChun(
  x: number,
  y: number,
  radius: number,
  isPlayer: boolean,
  color: string,
  label: string,
): Chun {
  return {
    position: { x, y },
    velocity: vec2.zero(),
    radius,
    squash: 0,
    trailPositions: [],
    isPlayer,
    color,
    label,
  };
}

// ============================================================================
// GAME EVENTS (for sound/visual hooks)
// ============================================================================

export type GameEventType =
  | "launch" // Player/bot launched
  | "wall_hit" // Hit wall
  | "floor_hit" // Hit floor
  | "chun_collision" // Chun hit chun
  | "stomp_win" // Stomp detected
  | "settled"; // Motion settled

export interface GameEvent {
  type: GameEventType;
  position: Vector2D;
  intensity: number; // 0-1, for sound volume/effect size
  data?: unknown;
}

// ============================================================================
// ELASTIC FLICK CALCULATION
// ============================================================================

export function calculateLaunchVelocity(
  chunPosition: Vector2D,
  dragEnd: Vector2D,
): { velocity: Vector2D; power: number } {
  const pullVector = vec2.sub(dragEnd, chunPosition);
  const pullDistance = vec2.length(pullVector);

  // Clamp to max pull
  const clampedDistance = Math.min(
    pullDistance,
    PHYSICS_CONFIG.MAX_PULL_DISTANCE,
  );

  if (clampedDistance < PHYSICS_CONFIG.MIN_PULL_TO_LAUNCH) {
    return { velocity: vec2.zero(), power: 0 };
  }

  const normalizedPull = clampedDistance / PHYSICS_CONFIG.MAX_PULL_DISTANCE;
  const curvedPull = Math.pow(normalizedPull, PHYSICS_CONFIG.PULL_POWER_CURVE);
  const power =
    PHYSICS_CONFIG.PULL_POWER_BASE +
    curvedPull * PHYSICS_CONFIG.PULL_POWER_MULTIPLIER;

  const direction = vec2.normalize(pullVector);
  const velocity = vec2.scale(direction, -power);

  return { velocity, power: normalizedPull };
}

export function getPullInfo(
  chunPosition: Vector2D,
  currentDragPos: Vector2D,
): {
  direction: Vector2D;
  clampedEnd: Vector2D;
  power: number; // 0-1
  projectedEnd: Vector2D;
} {
  const pullVector = vec2.sub(currentDragPos, chunPosition);
  const pullDistance = vec2.length(pullVector);
  const clampedDistance = Math.min(
    pullDistance,
    PHYSICS_CONFIG.MAX_PULL_DISTANCE,
  );

  const direction =
    pullDistance > 0 ? vec2.normalize(pullVector) : { x: 0, y: -1 };
  const clampedEnd = vec2.add(
    chunPosition,
    vec2.scale(direction, clampedDistance),
  );
  const power = clampedDistance / PHYSICS_CONFIG.MAX_PULL_DISTANCE;

  // Project where chun will go (opposite direction)
  const launchDirection = vec2.scale(direction, -1);
  const projectedDistance = clampedDistance * 1.5; // Visual extension
  const projectedEnd = vec2.add(
    chunPosition,
    vec2.scale(launchDirection, projectedDistance),
  );

  return { direction, clampedEnd, power, projectedEnd };
}

// ============================================================================
// PHYSICS UPDATE
// ============================================================================

export interface WorldBounds {
  width: number;
  height: number;
}

export function updateChunPhysics(
  chun: Chun,
  bounds: WorldBounds,
  _applyGravity: boolean = false,
): GameEvent[] {
  const events: GameEvent[] = [];
  const speed = vec2.length(chun.velocity);

  // Update trail
  if (speed > PHYSICS_CONFIG.TRAIL_MIN_SPEED) {
    chun.trailPositions.unshift(vec2.clone(chun.position));
    if (chun.trailPositions.length > PHYSICS_CONFIG.TRAIL_LENGTH) {
      chun.trailPositions.pop();
    }
  } else if (chun.trailPositions.length > 0) {
    chun.trailPositions.pop();
  }

  // Update squash (recover towards 0)
  if (chun.squash > 0) {
    chun.squash = Math.max(
      0,
      chun.squash - PHYSICS_CONFIG.SQUASH_RECOVERY_SPEED,
    );
  }

  // Apply velocity (position update)
  chun.position.x += chun.velocity.x;
  chun.position.y += chun.velocity.y;

  // Apply constant friction damping each frame
  chun.velocity.x *= PHYSICS_CONFIG.FRICTION;
  chun.velocity.y *= PHYSICS_CONFIG.FRICTION;

  // Snap velocity to zero when very small (prevents endless tiny movements)
  if (vec2.length(chun.velocity) < PHYSICS_CONFIG.VELOCITY_SNAP_THRESHOLD) {
    chun.velocity.x = 0;
    chun.velocity.y = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WALL COLLISIONS - All walls behave identically (flat 2D plane)
  // ─────────────────────────────────────────────────────────────────────────

  // Left wall
  if (chun.position.x - chun.radius < 0) {
    chun.position.x = chun.radius;
    const impactSpeed = Math.abs(chun.velocity.x);
    chun.velocity.x = impactSpeed * PHYSICS_CONFIG.WALL_BOUNCE;

    if (impactSpeed > 1) {
      events.push({
        type: "wall_hit",
        position: { x: 0, y: chun.position.y },
        intensity: Math.min(1, impactSpeed / 10),
      });
      chun.squash = Math.min(PHYSICS_CONFIG.SQUASH_AMOUNT, impactSpeed / 20);
    }
  }

  // Right wall
  if (chun.position.x + chun.radius > bounds.width) {
    chun.position.x = bounds.width - chun.radius;
    const impactSpeed = Math.abs(chun.velocity.x);
    chun.velocity.x = -impactSpeed * PHYSICS_CONFIG.WALL_BOUNCE;

    if (impactSpeed > 1) {
      events.push({
        type: "wall_hit",
        position: { x: bounds.width, y: chun.position.y },
        intensity: Math.min(1, impactSpeed / 10),
      });
      chun.squash = Math.min(PHYSICS_CONFIG.SQUASH_AMOUNT, impactSpeed / 20);
    }
  }

  // Top wall
  if (chun.position.y - chun.radius < 0) {
    chun.position.y = chun.radius;
    const impactSpeed = Math.abs(chun.velocity.y);
    chun.velocity.y = impactSpeed * PHYSICS_CONFIG.WALL_BOUNCE;

    if (impactSpeed > 1) {
      events.push({
        type: "wall_hit",
        position: { x: chun.position.x, y: 0 },
        intensity: Math.min(1, impactSpeed / 10),
      });
      chun.squash = Math.min(PHYSICS_CONFIG.SQUASH_AMOUNT, impactSpeed / 20);
    }
  }

  // Bottom wall
  if (chun.position.y + chun.radius > bounds.height) {
    chun.position.y = bounds.height - chun.radius;
    const impactSpeed = Math.abs(chun.velocity.y);
    chun.velocity.y = -impactSpeed * PHYSICS_CONFIG.WALL_BOUNCE;

    if (impactSpeed > 1) {
      events.push({
        type: "wall_hit",
        position: { x: chun.position.x, y: bounds.height },
        intensity: Math.min(1, impactSpeed / 10),
      });
      chun.squash = Math.min(PHYSICS_CONFIG.SQUASH_AMOUNT, impactSpeed / 20);
    }
  }

  return events;
}

// ============================================================================
// CHUN-TO-CHUN COLLISION
// ============================================================================

export type StompResult = "none" | "a_wins" | "b_wins";

export interface CollisionResult {
  collided: boolean;
  stompResult: StompResult;
  impactIntensity: number; // 0-1
  impactPosition: Vector2D;
}

export function resolveChunCollision(
  a: Chun,
  b: Chun,
  lastAttacker: "a" | "b" | null,
): CollisionResult {
  const dist = vec2.distance(a.position, b.position);
  const minDist = a.radius + b.radius;

  // No collision
  if (dist >= minDist || dist === 0) {
    return {
      collided: false,
      stompResult: "none",
      impactIntensity: 0,
      impactPosition: vec2.zero(),
    };
  }

  // Collision detected!
  const overlap = minDist - dist;
  const normal = vec2.normalize(vec2.sub(b.position, a.position));
  const impactPosition = vec2.lerp(a.position, b.position, a.radius / minDist);

  // Win is only evaluated after motion settles, not during collision
  const stompResult: StompResult = "none";

  // ─────────────────────────────────────────────────────────────────────────
  // POSITIONAL CORRECTION (separate overlapping circles)
  // ─────────────────────────────────────────────────────────────────────────
  const separation = overlap / 2 + 0.5;
  a.position = vec2.sub(a.position, vec2.scale(normal, separation));
  b.position = vec2.add(b.position, vec2.scale(normal, separation));

  // ─────────────────────────────────────────────────────────────────────────
  // IMPULSE RESPONSE - Exaggerated push force, favors attacker
  // ─────────────────────────────────────────────────────────────────────────
  const relativeVelocity = vec2.sub(a.velocity, b.velocity);
  const normalVelocity = vec2.dot(relativeVelocity, normal);

  // Only resolve if moving towards each other
  if (normalVelocity > 0) {
    // Base impulse (assuming equal mass)
    const restitution = PHYSICS_CONFIG.RESTITUTION;
    let impulseScalar = (-(1 + restitution) * normalVelocity) / 2;

    // JUICE: Exaggerate the impulse for satisfying impacts
    impulseScalar *= PHYSICS_CONFIG.COLLISION_BIAS;

    // Apply base impulses (equal and opposite)
    const impulse = vec2.scale(normal, impulseScalar);
    a.velocity = vec2.sub(a.velocity, impulse);
    b.velocity = vec2.add(b.velocity, impulse);

    // ATTACKER ADVANTAGE: Give extra push to the attacker
    if (lastAttacker) {
      const attackerBonus =
        Math.abs(impulseScalar) * PHYSICS_CONFIG.ATTACKER_PUSH_BONUS;
      const bonusImpulse = vec2.scale(normal, attackerBonus);
      if (lastAttacker === "a") {
        // A is attacker, push B more
        b.velocity = vec2.add(b.velocity, bonusImpulse);
      } else {
        // B is attacker, push A more
        a.velocity = vec2.sub(a.velocity, bonusImpulse);
      }
    }

    // Ensure minimum separation velocity (prevent sticking)
    const newRelVel = vec2.dot(vec2.sub(a.velocity, b.velocity), normal);
    if (newRelVel > -PHYSICS_CONFIG.MIN_SEPARATION_VELOCITY) {
      const adjustment = vec2.scale(
        normal,
        (-PHYSICS_CONFIG.MIN_SEPARATION_VELOCITY - newRelVel) / 2,
      );
      a.velocity = vec2.sub(a.velocity, adjustment);
      b.velocity = vec2.add(b.velocity, adjustment);
    }
  }

  // JUICE: Apply squash on impact
  const impactSpeed = Math.abs(normalVelocity);
  const squashAmount = Math.min(PHYSICS_CONFIG.SQUASH_AMOUNT, impactSpeed / 15);
  a.squash = Math.max(a.squash, squashAmount);
  b.squash = Math.max(b.squash, squashAmount);

  return {
    collided: true,
    stompResult,
    impactIntensity: Math.min(1, impactSpeed / 12),
    impactPosition,
  };
}

export function checkSettledWin(
  a: Chun,
  b: Chun,
  lastAttacker: "a" | "b" | null = null,
): StompResult {
  const dist = vec2.distance(a.position, b.position);
  const minDist = a.radius + b.radius;
  const overlapRatio = 1 - dist / minDist; // Positive = overlapping, negative = apart

  // Only determine winner if circles are touching/overlapping
  // If not overlapping, return "none" so game switches turn
  if (overlapRatio < PHYSICS_CONFIG.WIN_OVERLAP_REQUIRED) {
    return "none"; // Not touching - switch turn, game continues
  }

  // Circles ARE overlapping - determine winner by Y position
  // Smaller Y = visually above on screen (wins)
  const yDiff = b.position.y - a.position.y; // Positive = A is above B

  if (yDiff > PHYSICS_CONFIG.WIN_Y_MARGIN) {
    return "a_wins"; // A has smaller Y, is visually above
  } else if (yDiff < -PHYSICS_CONFIG.WIN_Y_MARGIN) {
    return "b_wins"; // B has smaller Y, is visually above
  }

  // Circles overlapping but same Y - use attacker advantage
  if (PHYSICS_CONFIG.ATTACKER_ADVANTAGE && lastAttacker) {
    return lastAttacker === "a" ? "a_wins" : "b_wins";
  }

  return "none"; // True draw - switch turn
}

// ============================================================================
// SETTLING DETECTION
// ============================================================================

export function isChunSettled(chun: Chun): boolean {
  const speed = vec2.length(chun.velocity);
  return speed < PHYSICS_CONFIG.VELOCITY_THRESHOLD;
}

export function areBothSettled(a: Chun, b: Chun): boolean {
  return isChunSettled(a) && isChunSettled(b);
}

// ============================================================================
// BOT AI (Beatable)
// ============================================================================

export interface BotConfig {
  aimRandomness: number; // Radians of random aim error
  powerMin: number; // Minimum power multiplier (0-1)
  powerMax: number; // Maximum power multiplier (0-1)
  thinkTimeMin: number; // Minimum think time in ms
  thinkTimeMax: number; // Maximum think time in ms
}

export const BOT_DIFFICULTY: Record<number, BotConfig> = {
  1: {
    // Easy - very beatable
    aimRandomness: Math.PI / 2.5, // ±72 degrees
    powerMin: 0.25,
    powerMax: 0.55,
    thinkTimeMin: 600,
    thinkTimeMax: 1200,
  },
  2: {
    // Medium
    aimRandomness: Math.PI / 4, // ±45 degrees
    powerMin: 0.35,
    powerMax: 0.7,
    thinkTimeMin: 400,
    thinkTimeMax: 900,
  },
  3: {
    // Hard - still beatable but challenging
    aimRandomness: Math.PI / 7, // ±26 degrees
    powerMin: 0.45,
    powerMax: 0.85,
    thinkTimeMin: 300,
    thinkTimeMax: 700,
  },
};

/**
 * Calculate bot's launch velocity.
 */
export function calculateBotLaunch(
  bot: Chun,
  player: Chun,
  tier: number,
): Vector2D {
  const config = BOT_DIFFICULTY[tier] || BOT_DIFFICULTY[2];

  // Direction towards player
  const toPlayer = vec2.sub(player.position, bot.position);
  let direction = vec2.normalize(toPlayer);

  // Add random aim error
  const aimError = (Math.random() - 0.5) * 2 * config.aimRandomness;
  direction = vec2.rotate(direction, aimError);

  // Random power within tier range
  const powerFactor =
    config.powerMin + Math.random() * (config.powerMax - config.powerMin);
  const power =
    PHYSICS_CONFIG.PULL_POWER_BASE +
    powerFactor * PHYSICS_CONFIG.PULL_POWER_MULTIPLIER;

  return vec2.scale(direction, power);
}

/**
 * Get random think time for bot.
 */
export function getBotThinkTime(tier: number): number {
  const config = BOT_DIFFICULTY[tier] || BOT_DIFFICULTY[2];
  return (
    config.thinkTimeMin +
    Math.random() * (config.thinkTimeMax - config.thinkTimeMin)
  );
}

// ============================================================================
// JUICE RENDERING HELPERS
// ============================================================================

/**
 * Get squash/stretch scale for rendering.
 */
export function getSquashScale(chun: Chun): { scaleX: number; scaleY: number } {
  const squashFactor = chun.squash;
  // Squash on Y, stretch on X (or vice versa based on movement)
  const speed = vec2.length(chun.velocity);
  const isVertical = Math.abs(chun.velocity.y) > Math.abs(chun.velocity.x);

  if (isVertical) {
    return {
      scaleX: 1 + squashFactor * 0.5,
      scaleY: 1 - squashFactor,
    };
  } else {
    return {
      scaleX: 1 - squashFactor,
      scaleY: 1 + squashFactor * 0.5,
    };
  }
}

/**
 * Get motion blur/stretch for fast-moving chun.
 */
export function getMotionStretch(chun: Chun): {
  stretchX: number;
  stretchY: number;
  angle: number;
} {
  const speed = vec2.length(chun.velocity);
  const minSpeed = 5;
  const maxStretch = 0.3;

  if (speed < minSpeed) {
    return { stretchX: 1, stretchY: 1, angle: 0 };
  }

  const stretchFactor = Math.min(maxStretch, (speed - minSpeed) / 20);
  const angle = Math.atan2(chun.velocity.y, chun.velocity.x);

  return {
    stretchX: 1 + stretchFactor,
    stretchY: 1 - stretchFactor * 0.3,
    angle,
  };
}
