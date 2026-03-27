import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { PvPState } from "@/hooks/usePvP";
import { vec2 } from "@/game/physics";
import {
  checkSettledOverlapWin,
  resolveCollision,
  type Circle,
} from "@/game/collision";

type Vec2 = { x: number; y: number };

type ChunState = {
  position: Vec2;
  velocity: Vec2;
  radius: number;
  color: string;
  label: string;
};

type DragState = {
  active: boolean;
  start: Vec2;
  current: Vec2;
};

interface PvpBattleBoardProps {
  pvp: PvPState;
  myAddress?: string;
  onShoot: (shot: { x: number; y: number; force: number }) => void;
  onLocalFinish: (winnerWallet: string | null) => void;
}

const BOARD = {
  width: 900,
  height: 500,
  friction: 0.96,
  wallBounce: 0.7,
  floorBounce: 0.7,
  radius: 28,
  maxPull: 150,
  pullPowerScale: 0.25,
  settleThreshold: 0.15,
  settleFrames: 30,
};

function drawChun(
  ctx: CanvasRenderingContext2D,
  chun: ChunState,
  highlighted: boolean,
): void {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
  ctx.fillStyle = chun.color;
  ctx.fill();

  const holeRadius = chun.radius * 0.85;
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(chun.position.x, chun.position.y, holeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  const gradient = ctx.createRadialGradient(
    chun.position.x - chun.radius * 0.3,
    chun.position.y - chun.radius * 0.3,
    holeRadius,
    chun.position.x,
    chun.position.y,
    chun.radius,
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.4)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
  ctx.beginPath();
  ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
  ctx.arc(chun.position.x, chun.position.y, holeRadius, 0, Math.PI * 2, true);
  ctx.fillStyle = gradient;
  ctx.fill("evenodd");

  ctx.fillStyle = "white";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 3;
  ctx.strokeText(chun.label, chun.position.x, chun.position.y);
  ctx.fillText(chun.label, chun.position.x, chun.position.y);

  if (highlighted) {
    ctx.strokeStyle = "#fdc700";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function pointerToCanvas(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Vec2 {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * sx,
    y: (clientY - rect.top) * sy,
  };
}

export default function PvpBattleBoard({
  pvp,
  myAddress,
  onShoot,
  onLocalFinish,
}: PvpBattleBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const settleRef = useRef(0);
  const processedShotSeqRef = useRef<number>(0);
  const simulatingRef = useRef(false);
  const localEndedRef = useRef(false);
  const lastAttackerRef = useRef<"player" | "bot" | null>(null);

  const playerRef = useRef<ChunState>({
    position: { x: BOARD.width * 0.25, y: BOARD.height - 80 },
    velocity: { x: 0, y: 0 },
    radius: BOARD.radius,
    color: "#ff8904",
    label: "YOU",
  });
  const enemyRef = useRef<ChunState>({
    position: { x: BOARD.width * 0.75, y: 80 },
    velocity: { x: 0, y: 0 },
    radius: BOARD.radius,
    color: "#ef4444",
    label: "ENEMY",
  });

  const dragRef = useRef<DragState>({
    active: false,
    start: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
  });

  const [, forceRender] = useState(0);

  useEffect(() => {
    processedShotSeqRef.current = 0;
    playerRef.current.position = {
      x: BOARD.width * 0.25,
      y: BOARD.height - 80,
    };
    playerRef.current.velocity = { x: 0, y: 0 };
    enemyRef.current.position = { x: BOARD.width * 0.75, y: 80 };
    enemyRef.current.velocity = { x: 0, y: 0 };
    simulatingRef.current = false;
    localEndedRef.current = false;
    lastAttackerRef.current = null;
    settleRef.current = 0;
  }, [pvp.challengeId]);

  useEffect(() => {
    if (!pvp.lastShot || !myAddress) return;
    if (pvp.lastShot.seq <= processedShotSeqRef.current) return;

    processedShotSeqRef.current = pvp.lastShot.seq;

    const isMyShot = pvp.lastShot.byWallet === myAddress;
    const shooter = isMyShot ? playerRef.current : enemyRef.current;

    // Opponent sends shot coordinates in their local frame where they are "YOU".
    // Mirror both axes so both clients simulate the same world direction.
    const normalizedShot = isMyShot
      ? pvp.lastShot
      : {
          ...pvp.lastShot,
          x: 100 - pvp.lastShot.x,
          y: 100 - pvp.lastShot.y,
        };

    const target = {
      x: Math.max(
        0,
        Math.min(BOARD.width, (normalizedShot.x / 100) * BOARD.width),
      ),
      y: Math.max(
        0,
        Math.min(BOARD.height, (normalizedShot.y / 100) * BOARD.height),
      ),
    };

    // Match GameCanvas formula:
    // pullLen = distance between drag current and start
    // velocity = normalize(current - start) * (-pullLen * PULL_POWER_SCALE)
    // Here `target` is projectedEnd = start - normalize(pull) * (pullLen * 1.5)
    // so normalize(target - start) already points to the final velocity direction.
    const velocityDir = vec2.normalize(vec2.sub(target, shooter.position));
    const pullLen = Math.max(0, Math.min(BOARD.maxPull, normalizedShot.force));
    const speed = pullLen * BOARD.pullPowerScale;

    shooter.velocity = vec2.scale(velocityDir, speed);
    lastAttackerRef.current = isMyShot ? "player" : "bot";
    simulatingRef.current = true;
    settleRef.current = 0;
  }, [myAddress, pvp.lastShot]);

  const updatePhysics = useCallback(() => {
    const p = playerRef.current;
    const e = enemyRef.current;

    p.position.x += p.velocity.x;
    p.position.y += p.velocity.y;
    e.position.x += e.velocity.x;
    e.position.y += e.velocity.y;

    p.velocity.x *= BOARD.friction;
    p.velocity.y *= BOARD.friction;
    e.velocity.x *= BOARD.friction;
    e.velocity.y *= BOARD.friction;

    for (const chun of [p, e]) {
      if (chun.position.x - chun.radius < 0) {
        chun.position.x = chun.radius;
        chun.velocity.x *= -BOARD.wallBounce;
      } else if (chun.position.x + chun.radius > BOARD.width) {
        chun.position.x = BOARD.width - chun.radius;
        chun.velocity.x *= -BOARD.wallBounce;
      }

      if (chun.position.y - chun.radius < 0) {
        chun.position.y = chun.radius;
        chun.velocity.y *= -BOARD.floorBounce;
      } else if (chun.position.y + chun.radius > BOARD.height) {
        chun.position.y = BOARD.height - chun.radius;
        chun.velocity.y *= -BOARD.floorBounce;
      }
    }

    const a: Circle = {
      position: p.position,
      velocity: p.velocity,
      radius: p.radius,
    };
    const b: Circle = {
      position: e.position,
      velocity: e.velocity,
      radius: e.radius,
    };
    const collision = resolveCollision(a, b);
    if (collision.collided) {
      p.position = collision.player.position;
      p.velocity = collision.player.velocity;
      e.position = collision.bot.position;
      e.velocity = collision.bot.velocity;
    }

    const settled =
      vec2.length(p.velocity) < BOARD.settleThreshold &&
      vec2.length(e.velocity) < BOARD.settleThreshold;
    if (settled) {
      settleRef.current += 1;
      if (settleRef.current >= BOARD.settleFrames) {
        simulatingRef.current = false;
        if (!localEndedRef.current) {
          const result = checkSettledOverlapWin(
            { position: p.position, velocity: p.velocity, radius: p.radius },
            { position: e.position, velocity: e.velocity, radius: e.radius },
            lastAttackerRef.current,
          );

          if (result === "player_wins") {
            localEndedRef.current = true;
            onLocalFinish(myAddress ?? null);
          } else if (result === "bot_wins") {
            localEndedRef.current = true;
            onLocalFinish(pvp.opponent ?? null);
          }
        }
      }
    } else {
      settleRef.current = 0;
    }
  }, [myAddress, onLocalFinish, pvp.opponent]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1e2939";
    ctx.fillRect(0, 0, BOARD.width, BOARD.height);

    ctx.strokeStyle = "#364153";
    ctx.lineWidth = 1;
    for (let x = 0; x < BOARD.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, BOARD.height);
      ctx.stroke();
    }
    for (let y = 0; y < BOARD.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(BOARD.width, y);
      ctx.stroke();
    }

    if (dragRef.current.active) {
      const start = dragRef.current.start;
      const current = dragRef.current.current;
      const pull = vec2.sub(current, start);
      const pullLen = Math.min(vec2.length(pull), BOARD.maxPull);
      const dir = vec2.normalize(pull);
      const projectedEnd = vec2.sub(start, vec2.scale(dir, pullLen * 1.5));

      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(projectedEnd.x, projectedEnd.y);
      ctx.stroke();
      ctx.restore();
    }

    drawChun(ctx, enemyRef.current, false);
    drawChun(ctx, playerRef.current, pvp.myTurn && !simulatingRef.current);
  }, [pvp.myTurn]);

  const loop = useCallback(() => {
    if (localEndedRef.current || pvp.status !== "playing") {
      render();
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    if (simulatingRef.current) {
      updatePhysics();
    }
    render();
    rafRef.current = requestAnimationFrame(loop);
  }, [pvp.status, render, updatePhysics]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !pvp.myTurn || simulatingRef.current) return;
      const pos = pointerToCanvas(canvas, e.clientX, e.clientY);
      if (
        vec2.distance(pos, playerRef.current.position) >
        playerRef.current.radius * 1.6
      )
        return;

      dragRef.current = {
        active: true,
        start: { ...playerRef.current.position },
        current: pos,
      };
      canvas.setPointerCapture(e.pointerId);
      forceRender((v) => v + 1);
    },
    [pvp.myTurn],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !dragRef.current.active) return;
      dragRef.current.current = pointerToCanvas(canvas, e.clientX, e.clientY);
    },
    [],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !dragRef.current.active) return;

      const pull = vec2.sub(dragRef.current.current, dragRef.current.start);
      const pullLen = Math.min(vec2.length(pull), BOARD.maxPull);
      if (pullLen > 8) {
        const dir = vec2.normalize(pull);
        const projectedEnd = vec2.sub(
          dragRef.current.start,
          vec2.scale(dir, pullLen * 1.5),
        );

        const shot = {
          x: Number(((projectedEnd.x / BOARD.width) * 100).toFixed(2)),
          y: Number(((projectedEnd.y / BOARD.height) * 100).toFixed(2)),
          // Send pull length so receiver can apply the exact same flick formula.
          force: Number(pullLen.toFixed(2)),
        };
        onShoot(shot);
      }

      dragRef.current.active = false;
      canvas.releasePointerCapture(e.pointerId);
      forceRender((v) => v + 1);
    },
    [onShoot],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-xs font-bold text-gray-600">
        <p>
          {pvp.myTurn
            ? "Den luot ban: keo va tha tren vien YOU"
            : "Dang cho doi thu ban..."}
        </p>
        <p>Seq: {pvp.lastShot?.seq ?? 0}</p>
      </div>
      <motion.canvas
        ref={canvasRef}
        width={BOARD.width}
        height={BOARD.height}
        className="w-full rounded-4xl border-8 border-sunny-400 bg-[#1e2939] touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current.active = false;
          forceRender((v) => v + 1);
        }}
      />
    </div>
  );
}
