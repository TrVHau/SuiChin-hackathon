
import type { Vector2D } from "./types";
import { vec2 } from "./physics";



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



const COLLISION_CONFIG = {
  STOMP_Y_THRESHOLD: 15, 
  STOMP_MIN_DOWN_VY: 3, 

  SETTLED_OVERLAP_MARGIN: 10, 
  OVERLAP_MIN_DISTANCE: 0.8,

  RESTITUTION: 0.2, 
  MIN_SEPARATION: 0, 
};

export function checkCircleOverlap(a: Circle, b: Circle): boolean {
  const dist = vec2.distance(a.position, b.position);
  return dist < a.radius + b.radius;
}

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
    result: "none",
    normal,
    overlap,
  };
}



export function checkStompWin(player: Circle, bot: Circle): CollisionResult {
  const yDiff = bot.position.y - player.position.y;

  if (
    yDiff > COLLISION_CONFIG.STOMP_Y_THRESHOLD &&
    player.velocity.y > COLLISION_CONFIG.STOMP_MIN_DOWN_VY
  ) {
    return "player_wins";
  }

  if (
    yDiff < -COLLISION_CONFIG.STOMP_Y_THRESHOLD &&
    bot.velocity.y > COLLISION_CONFIG.STOMP_MIN_DOWN_VY
  ) {
    return "bot_wins";
  }

  return "none";
}


export function checkSettledOverlapWin(
  player: Circle,
  bot: Circle,
  lastAttacker: "player" | "bot" | null = null,
): CollisionResult {
  const dist = vec2.distance(player.position, bot.position);
  const sumRadii = player.radius + bot.radius;

  const isOverlapping = dist < sumRadii * 0.95;

  if (!isOverlapping) {
    return "none";
  }


  if (lastAttacker === "player") {
    return "player_wins";
  } else if (lastAttacker === "bot") {
    return "bot_wins";
  }

  return "none";
}


export function resolveOverlap(
  a: Circle,
  b: Circle,
  info: CollisionInfo,
): { a: Circle; b: Circle } {
  if (!info.collided || info.overlap <= 0) {
    return { a, b };
  }

  return { a, b };
}

export function applyCollisionImpulse(
  a: Circle,
  b: Circle,
  info: CollisionInfo,
): { a: Circle; b: Circle } {
  if (!info.collided) {
    return { a, b };
  }

  const relativeVelocity = vec2.sub(a.velocity, b.velocity);
  const velocityAlongNormal = vec2.dot(relativeVelocity, info.normal);

  if (velocityAlongNormal > 0) {
    return { a, b };
  }

  const impulseScalar =
    (-(1 + COLLISION_CONFIG.RESTITUTION) * velocityAlongNormal) / 2;

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

  const separated = resolveOverlap(player, bot, info);

  return {
    player: separated.a,
    bot: separated.b,
    result: "none", 
    collided: true,
  };
}

export { COLLISION_CONFIG };
