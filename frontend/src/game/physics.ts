
import type { Vector2D, Chun, GameBoard, GameConfig } from "./types";

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

  normalize: (v: Vector2D): Vector2D => {
    const len = vec2.length(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },

  dot: (a: Vector2D, b: Vector2D): number => a.x * b.x + a.y * b.y,

  distance: (a: Vector2D, b: Vector2D): number => vec2.length(vec2.sub(a, b)),

  clone: (v: Vector2D): Vector2D => ({ x: v.x, y: v.y }),

  zero: (): Vector2D => ({ x: 0, y: 0 }),
};

export function calculateFlickVelocity(
  startPos: Vector2D,
  endPos: Vector2D,
  maxPower: number,
): Vector2D {
  const direction = vec2.sub(endPos, startPos);
  const power = Math.min(vec2.length(direction) * 0.3, maxPower);
  const normalized = vec2.normalize(direction);
  return vec2.scale(normalized, power);
}

export function updateChunPhysics(
  chun: Chun,
  board: GameBoard,
  deltaTime: number = 1,
): Chun {
  const newPosition = vec2.add(
    chun.position,
    vec2.scale(chun.velocity, deltaTime),
  );

  const newVelocity = vec2.scale(chun.velocity, board.friction);

  let finalPosition = { ...newPosition };
  let finalVelocity = { ...newVelocity };

  if (finalPosition.x - chun.radius < 0) {
    finalPosition.x = chun.radius;
    finalVelocity.x = Math.abs(finalVelocity.x) * board.wallBounce;
  }

  if (finalPosition.x + chun.radius > board.width) {
    finalPosition.x = board.width - chun.radius;
    finalVelocity.x = -Math.abs(finalVelocity.x) * board.wallBounce;
  }

  if (finalPosition.y - chun.radius < 0) {
    finalPosition.y = chun.radius;
    finalVelocity.y = Math.abs(finalVelocity.y) * board.wallBounce;
  }

  if (finalPosition.y + chun.radius > board.height) {
    finalPosition.y = board.height - chun.radius;
    finalVelocity.y = -Math.abs(finalVelocity.y) * board.wallBounce;
  }

  return {
    ...chun,
    position: finalPosition,
    velocity: finalVelocity,
  };
}

export function checkChunCollision(a: Chun, b: Chun): boolean {
  const distance = vec2.distance(a.position, b.position);
  return distance < a.radius + b.radius;
}

export function resolveChunCollision(a: Chun, b: Chun): [Chun, Chun] {
  const distance = vec2.distance(a.position, b.position);
  const minDistance = a.radius + b.radius;

  if (distance >= minDistance) return [a, b];

  const normal = vec2.normalize(vec2.sub(b.position, a.position));

  const overlap = minDistance - distance;
  const separation = vec2.scale(normal, overlap / 2);

  const newPosA = vec2.sub(a.position, separation);
  const newPosB = vec2.add(b.position, separation);

  const relativeVelocity = vec2.sub(a.velocity, b.velocity);
  const velocityAlongNormal = vec2.dot(relativeVelocity, normal);

  if (velocityAlongNormal > 0) {
    return [
      { ...a, position: newPosA },
      { ...b, position: newPosB },
    ];
  }

  const restitution = 0.8;
  const impulse = (-(1 + restitution) * velocityAlongNormal) / 2;

  const impulseVector = vec2.scale(normal, impulse);

  return [
    {
      ...a,
      position: newPosA,
      velocity: vec2.sub(a.velocity, impulseVector),
    },
    {
      ...b,
      position: newPosB,
      velocity: vec2.add(b.velocity, impulseVector),
    },
  ];
}

export function isChunStationary(chun: Chun, threshold: number): boolean {
  return vec2.length(chun.velocity) < threshold;
}

export function areAllChunsStationary(
  chuns: Chun[],
  threshold: number,
): boolean {
  return chuns.every((chun) => isChunStationary(chun, threshold));
}

export function determineWinner(
  playerChun: Chun,
  botChun: Chun,
): "player" | "bot" | "draw" {
  const distance = vec2.distance(playerChun.position, botChun.position);
  const minDistance = playerChun.radius + botChun.radius;

  if (distance > minDistance + 20) {
    if (playerChun.position.y < botChun.position.y - 10) return "player";
    if (botChun.position.y < playerChun.position.y - 10) return "bot";
    return "draw";
  }

  const yDiff = botChun.position.y - playerChun.position.y;

  if (yDiff > 5) return "player";
  if (yDiff < -5) return "bot";
  return "draw";
}

export function getInitialPositions(config: GameConfig): {
  player: Vector2D;
  bot: Vector2D;
} {
  const centerX = config.boardWidth / 2;

  return {
    player: {
      x: centerX - 120,
      y: config.boardHeight - 80,
    },
    bot: {
      x: centerX + 120,
      y: 80,
    },
  };
}
