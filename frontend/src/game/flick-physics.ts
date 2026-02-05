
import type { Vector2D } from "./types";


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


export const FLICK_CONFIG = {
  CHUN_RADIUS: 32,

  FRICTION_HIGH_SPEED: 0.985, 
  FRICTION_LOW_SPEED: 0.92, 
  FRICTION_SPEED_THRESHOLD: 3, 
  VELOCITY_EPSILON: 0.08, 
  SETTLE_FRAMES_REQUIRED: 25, 

  MAX_PULL_LENGTH: 120, 
  OPTIMAL_PULL_RATIO: 0.6, 
  OVERSHOOT_PENALTY_START: 0.75, 

  POWER_MIN: 2,
  POWER_OPTIMAL: 12,
  POWER_MAX: 10, 

  OVERSHOOT_FRICTION_MULT: 1.3, 
  OVERSHOOT_DEVIATION_MAX: 0.15, 

  OFF_CENTER_DRIFT_SCALE: 0.3, 
  OFF_CENTER_POWER_LOSS: 0.15, 

  COLLISION_ATTACKER_SLOWDOWN: 0.15, 
  COLLISION_DEFENDER_PUSH: 0.25, 
  COLLISION_MIN_OVERLAP: 0.3, 

  WALL_BOUNCE: 0.5, 

  WIN_OVERLAP_TOLERANCE: 1.0, 
  WIN_Y_MARGIN: 3, 

  HIT_STOP_FRAMES: 4, 
  CAMERA_SHAKE_INTENSITY: 8,
  TRAIL_LENGTH: 5,

  BOT_THINK_TIME_MIN: 600,
  BOT_THINK_TIME_MAX: 1400,

  BOT_DIFFICULTY: {
    1: {
      aimError: Math.PI / 1.8,
      powerError: 0.6, 
      overshootChance: 0.7, 
      optimalAimChance: 0.1, 
      randomShotChance: 0.3, 
      thinkTimeMin: 400,
      thinkTimeMax: 800, 
    },
    2: {
      aimError: Math.PI / 6, 
      powerError: 0.3,
      overshootChance: 0.35, 
      optimalAimChance: 0.5, 
      randomShotChance: 0.1, 
      thinkTimeMin: 800,
      thinkTimeMax: 1400,
    },
    3: {
      aimError: Math.PI / 15,
      powerError: 0.08,
      overshootChance: 0.05, 
      optimalAimChance: 0.85, 
      randomShotChance: 0, 
      thinkTimeMin: 1200,
      thinkTimeMax: 2000,
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

  MAX_SIMULATION_FRAMES: 300, 
};


export interface Chun {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  label: string;
  lastSpeed: number;
  trailPositions: Vector2D[];
}

export interface WorldBounds {
  width: number;
  height: number;
}

export type WinResult = "none" | "player_wins" | "bot_wins";

export interface FlickInput {
  direction: Vector2D; 
  power: number; 
  contactOffset: Vector2D; 
}

export interface FlickResult {
  velocity: Vector2D;
  wasOvershoot: boolean;
  effectivePower: number;
}

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


export function calculateFlickVelocity(input: FlickInput): FlickResult {
  const { direction, power, contactOffset } = input;
  const cfg = FLICK_CONFIG;

  let effectivePower: number;
  let wasOvershoot = false;
  let deviationAngle = 0;

  if (power <= cfg.OPTIMAL_PULL_RATIO) {
    const t = power / cfg.OPTIMAL_PULL_RATIO;
    effectivePower = cfg.POWER_MIN + (cfg.POWER_OPTIMAL - cfg.POWER_MIN) * t;
  } else if (power <= cfg.OVERSHOOT_PENALTY_START) {
    const t =
      (power - cfg.OPTIMAL_PULL_RATIO) /
      (cfg.OVERSHOOT_PENALTY_START - cfg.OPTIMAL_PULL_RATIO);
    effectivePower =
      cfg.POWER_OPTIMAL - (cfg.POWER_OPTIMAL - cfg.POWER_MAX) * t * 0.3;
  } else {
    wasOvershoot = true;
    const overshootAmount =
      (power - cfg.OVERSHOOT_PENALTY_START) / (1 - cfg.OVERSHOOT_PENALTY_START);

    effectivePower = cfg.POWER_MAX * (1 - overshootAmount * 0.4);

    deviationAngle =
      (Math.random() - 0.5) * cfg.OVERSHOOT_DEVIATION_MAX * overshootAmount * 2;
  }

  const offsetMagnitude = vec2.length(contactOffset);
  if (offsetMagnitude > 0.1) {
    effectivePower *= 1 - offsetMagnitude * cfg.OFF_CENTER_POWER_LOSS;

    const perpendicular = { x: -direction.y, y: direction.x };
    const driftDirection = vec2.dot(contactOffset, perpendicular) > 0 ? 1 : -1;
    deviationAngle +=
      driftDirection * offsetMagnitude * cfg.OFF_CENTER_DRIFT_SCALE;
  }

  const finalDirection = vec2.rotate(direction, deviationAngle);

  const velocity = vec2.scale(finalDirection, effectivePower);

  return {
    velocity,
    wasOvershoot,
    effectivePower,
  };
}

export function dragToFlick(
  chunCenter: Vector2D,
  dragStart: Vector2D,
  dragEnd: Vector2D,
): FlickInput {
  const pullVector = vec2.sub(dragEnd, dragStart);
  const pullLength = vec2.length(pullVector);

  const direction =
    pullLength > 0
      ? vec2.normalize(vec2.scale(pullVector, -1))
      : { x: 0, y: 0 };

  const power = Math.min(pullLength / FLICK_CONFIG.MAX_PULL_LENGTH, 1);

  const contactOffset = vec2.sub(dragStart, chunCenter);
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

export function updateChunPhysics(
  chun: Chun,
  bounds: WorldBounds,
  wasOvershoot: boolean = false,
): void {
  const cfg = FLICK_CONFIG;
  const speed = vec2.length(chun.velocity);

  chun.lastSpeed = speed;
  if (speed > 2) {
    chun.trailPositions.unshift({ ...chun.position });
    if (chun.trailPositions.length > cfg.TRAIL_LENGTH) {
      chun.trailPositions.pop();
    }
  } else {
    chun.trailPositions = [];
  }

  let friction: number;
  if (speed > cfg.FRICTION_SPEED_THRESHOLD) {
    friction = cfg.FRICTION_HIGH_SPEED;
  } else {
    friction = cfg.FRICTION_LOW_SPEED;
  }

  if (wasOvershoot) {
    friction /= cfg.OVERSHOOT_FRICTION_MULT;
  }

  chun.velocity = vec2.scale(chun.velocity, friction);

  if (vec2.length(chun.velocity) < cfg.VELOCITY_EPSILON) {
    chun.velocity = { x: 0, y: 0 };
  }

  chun.position = vec2.add(chun.position, chun.velocity);

  const r = chun.radius;

  if (chun.position.x - r < 0) {
    chun.position.x = r;
    chun.velocity.x = Math.abs(chun.velocity.x) * cfg.WALL_BOUNCE;
  }
  if (chun.position.x + r > bounds.width) {
    chun.position.x = bounds.width - r,
    chun.velocity.x = -Math.abs(chun.velocity.x) * cfg.WALL_BOUNCE;
  }
  if (chun.position.y - r < 0) {
    chun.position.y = r;
    chun.velocity.y = Math.abs(chun.velocity.y) * cfg.WALL_BOUNCE;
  }
  if (chun.position.y + r > bounds.height) {
    chun.position.y = bounds.height - r;
    chun.velocity.y = -Math.abs(chun.velocity.y) * cfg.WALL_BOUNCE;
  }
} 

export function resolveChunCollision(
  a: Chun,
  b: Chun,
  aIsAttacker: boolean = true,
): boolean {
  const cfg = FLICK_CONFIG;
  const dist = vec2.distance(a.position, b.position);
  const minDist = a.radius + b.radius;

  const allowedOverlap = minDist * cfg.COLLISION_MIN_OVERLAP;
  const effectiveMinDist = minDist - allowedOverlap;

  if (dist >= effectiveMinDist) return false;

  const normal = vec2.normalize(vec2.sub(b.position, a.position));
  const overlap = effectiveMinDist - dist;

  if (overlap > 0) {
    const separation = overlap / 2;
    a.position = vec2.sub(a.position, vec2.scale(normal, separation));
    b.position = vec2.add(b.position, vec2.scale(normal, separation));
  }

  const aSpeed = vec2.length(a.velocity);
  const bSpeed = vec2.length(b.velocity);

  const aIsMoving = aSpeed > 0.5;
  const bIsMoving = bSpeed > 0.5;

  if (aIsMoving && !bIsMoving) {
    a.velocity = vec2.scale(a.velocity, cfg.COLLISION_ATTACKER_SLOWDOWN);

    const pushStrength = aSpeed * cfg.COLLISION_DEFENDER_PUSH;
    b.velocity = vec2.add(b.velocity, vec2.scale(normal, pushStrength));
  } else if (bIsMoving && !aIsMoving) {
    b.velocity = vec2.scale(b.velocity, cfg.COLLISION_ATTACKER_SLOWDOWN);

    const pushStrength = bSpeed * cfg.COLLISION_DEFENDER_PUSH;
    a.velocity = vec2.sub(a.velocity, vec2.scale(normal, pushStrength));
  } else if (aIsMoving && bIsMoving) {
    const relativeVel = vec2.sub(a.velocity, b.velocity);
    const relativeSpeed = vec2.dot(relativeVel, normal);

    if (relativeSpeed > 0) {
      const impulse = relativeSpeed * 0.4;
      const impulseVec = vec2.scale(normal, impulse);
      a.velocity = vec2.sub(a.velocity, impulseVec);
      b.velocity = vec2.add(b.velocity, impulseVec);
    }
  }

  return true;
}


export function isChunSettled(chun: Chun): boolean {
  return vec2.length(chun.velocity) < FLICK_CONFIG.VELOCITY_EPSILON;
}

export function areBothSettled(a: Chun, b: Chun): boolean {
  return isChunSettled(a) && isChunSettled(b);
}



export function checkSettledWin(
  player: Chun,
  bot: Chun,
  lastAttacker: "player" | "bot" | null,
): WinResult {
  const cfg = FLICK_CONFIG;
  const dist = vec2.distance(player.position, bot.position);
  const sumRadii = player.radius + bot.radius;

  const isOverlapping = dist < sumRadii * cfg.WIN_OVERLAP_TOLERANCE;

  if (!isOverlapping) {
    return "none";
  }

  if (lastAttacker === "player") {
    return "player_wins";
  } else if (lastAttacker === "bot") {
    return "bot_wins";
  }

  const yDiff = bot.position.y - player.position.y;
  if (yDiff > cfg.WIN_Y_MARGIN) {
    return "player_wins";
  } else if (yDiff < -cfg.WIN_Y_MARGIN) {
    return "bot_wins";
  }

  return lastAttacker === "player" ? "player_wins" : "bot_wins";
}


export function calculateBotFlick(
  bot: Chun,
  player: Chun,
  tier: number,
): FlickInput {
  const cfg = FLICK_CONFIG;
  const difficulty = cfg.BOT_DIFFICULTY[tier] || cfg.BOT_DIFFICULTY[2];

  if (Math.random() < difficulty.randomShotChance) {
    const randomAngle = Math.random() * Math.PI * 2;
    const randomPower = 0.3 + Math.random() * 0.5;
    return {
      direction: { x: Math.cos(randomAngle), y: Math.sin(randomAngle) },
      power: randomPower,
      contactOffset: { x: 0, y: 0 },
    };
  }

  let direction: Vector2D;

  if (Math.random() < difficulty.optimalAimChance) {
    const toPlayer = vec2.normalize(vec2.sub(player.position, bot.position));
    const aimError = (Math.random() - 0.5) * difficulty.aimError;
    direction = vec2.rotate(toPlayer, aimError);
  } else {
    const toPlayer = vec2.normalize(vec2.sub(player.position, bot.position));
    const bigError = (Math.random() - 0.5) * difficulty.aimError * 2;
    direction = vec2.rotate(toPlayer, bigError);
  }

  const dist = vec2.distance(bot.position, player.position);
  const maxDist = 500;
  const basePower = Math.min(dist / maxDist, 0.9);

  let targetPower: number;

  if (Math.random() < difficulty.overshootChance) {
    targetPower = cfg.OVERSHOOT_PENALTY_START + Math.random() * 0.25;
  } else {
    const optimalVariance = tier === 3 ? 0.1 : tier === 2 ? 0.2 : 0.4;
    targetPower =
      cfg.OPTIMAL_PULL_RATIO *
      (1 - optimalVariance + Math.random() * optimalVariance * 2);
  }

  const powerError = (Math.random() - 0.5) * difficulty.powerError;
  const power = Math.max(0.2, Math.min(1, targetPower + powerError));

  const contactOffset = { x: 0, y: 0 };

  return {
    direction,
    power,
    contactOffset,
  };
}

export function getBotThinkTime(tier: number = 2): number {
  const cfg = FLICK_CONFIG;
  const difficulty = cfg.BOT_DIFFICULTY[tier] || cfg.BOT_DIFFICULTY[2];
  return (
    difficulty.thinkTimeMin +
    Math.random() * (difficulty.thinkTimeMax - difficulty.thinkTimeMin)
  );
}

export function getPowerColor(power: number): string {
  const cfg = FLICK_CONFIG;

  if (power < cfg.OPTIMAL_PULL_RATIO) {
    const t = power / cfg.OPTIMAL_PULL_RATIO;
    const r = Math.floor(t * 255);
    const g = 255;
    return `rgb(${r}, ${g}, 0)`;
  } else if (power < cfg.OVERSHOOT_PENALTY_START) {
    return "#facc15";
  } else {
    const t =
      (power - cfg.OVERSHOOT_PENALTY_START) / (1 - cfg.OVERSHOOT_PENALTY_START);
    const g = Math.floor((1 - t) * 180);
    return `rgb(255, ${g}, 0)`;
  }
}

export function getPowerZone(
  power: number,
): "weak" | "optimal" | "strong" | "overshoot" {
  const cfg = FLICK_CONFIG;
  if (power < 0.3) return "weak";
  if (power < cfg.OPTIMAL_PULL_RATIO) return "strong";
  if (power < cfg.OVERSHOOT_PENALTY_START) return "optimal";
  return "overshoot";
}
