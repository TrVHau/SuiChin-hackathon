import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { vec2 } from "@/game/physics";
import type { Vector2D } from "@/game/types";
import {
  resolveCollision,
  checkSettledOverlapWin,
  type Circle,
} from "@/game/collision";

export type RoundResult = "win" | "lose" | "draw";
export type Turn = "player" | "bot";
export type GameMode = "bot" | "pvp";
export type GamePhase =
  | "idle"
  | "player-aiming"
  | "player-simulating"
  | "bot-thinking"
  | "bot-simulating"
  | "settling"
  | "ended";

export interface PvPShot {
  side: Turn;
  velocity: Vector2D;
  pullLength: number;
}

export interface PvPRemoteShot {
  id: string;
  side: Turn;
  velocity: Vector2D;
  pullLength?: number;
}

export interface GameCanvasProps {
  onWin?: () => void;
  onLose?: () => void;
  onBack: () => void;
  enabled?: boolean;
  mode?: GameMode;
  localSide?: Turn;
  currentTurnSide?: Turn;
  playerLabel?: string;
  opponentLabel?: string;
  showHeader?: boolean;
  remoteShot?: PvPRemoteShot | null;
  onShot?: (shot: PvPShot) => void;
  onRoundResult?: (winnerSide: Turn) => void;
}

interface ChunState {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  label: string;
}

interface DragState {
  isDragging: boolean;
  startPos: Vector2D;
  currentPos: Vector2D;
}

const PHYSICS = {
  FRICTION: 0.96,
  WALL_BOUNCE: 0.7,
  FLOOR_BOUNCE: 0.7,
  CHUN_RADIUS: 28,
  MAX_PULL_LENGTH: 150,
  PULL_POWER_SCALE: 0.25,
  VELOCITY_THRESHOLD: 0.15,
  SETTLE_FRAMES: 30,
  BOT_THINK_TIME_MIN: 500,
  BOT_THINK_TIME_MAX: 1200,
  BOT_MIN_POWER: 3,
  BOT_MAX_POWER: 12,
  BOT_AIM_RANDOMNESS: Math.PI / 4,
};

const COLORS = {
  BACKGROUND: "#1e2939",
  GRID: "#364153",
  PLAYER: "#ff8904",
  BOT: "#ef4444",
  AIM_LINE: "rgba(255, 255, 255, 0.6)",
};

function getCanvasPosition(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Vector2D {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function isInsideChun(pos: Vector2D, chun: ChunState): boolean {
  return vec2.distance(pos, chun.position) <= chun.radius * 1.5;
}

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

  if (highlighted) {
    ctx.strokeStyle = "#fdc700";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "white";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 3;
  ctx.strokeText(chun.label, chun.position.x, chun.position.y);
  ctx.fillText(chun.label, chun.position.x, chun.position.y);
  ctx.restore();
}

export default function GameCanvas({
  onWin,
  onLose,
  onBack,
  enabled = true,
  mode = "bot",
  localSide = "player",
  currentTurnSide,
  playerLabel,
  opponentLabel,
  showHeader = true,
  remoteShot,
  onShot,
  onRoundResult,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const handledRemoteShotIdRef = useRef<string | null>(null);
  const [canvasSize] = useState({ width: 900, height: 500 });

  const phaseRef = useRef<GamePhase>("idle");
  const currentTurnRef = useRef<Turn>("player");
  const lastAttackerRef = useRef<Turn | null>(null);
  const settleCountRef = useRef(0);
  const botThinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerRef = useRef<ChunState>({
    position: { x: 200, y: 400 },
    velocity: { x: 0, y: 0 },
    radius: PHYSICS.CHUN_RADIUS,
    color: COLORS.PLAYER,
    label: playerLabel ?? "YOU",
  });
  const botRef = useRef<ChunState>({
    position: { x: 700, y: 100 },
    velocity: { x: 0, y: 0 },
    radius: PHYSICS.CHUN_RADIUS,
    color: COLORS.BOT,
    label: opponentLabel ?? "BOT",
  });
  const dragRef = useRef<DragState>({
    isDragging: false,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
  });

  useEffect(() => {
    playerRef.current.position = {
      x: canvasSize.width * 0.25,
      y: canvasSize.height - 80,
    };
    botRef.current.position = { x: canvasSize.width * 0.75, y: 80 };
  }, [canvasSize]);

  useEffect(() => {
    playerRef.current.label =
      playerLabel ?? (localSide === "player" ? "YOU" : "OPP");
    botRef.current.label =
      opponentLabel ??
      (mode === "bot" ? "BOT" : localSide === "bot" ? "YOU" : "OPP");
  }, [localSide, mode, opponentLabel, playerLabel]);

  useEffect(() => {
    if (mode !== "pvp" || !currentTurnSide) return;
    currentTurnRef.current = currentTurnSide;
    if (
      phaseRef.current !== "player-simulating" &&
      phaseRef.current !== "bot-simulating" &&
      phaseRef.current !== "settling" &&
      phaseRef.current !== "ended"
    ) {
      phaseRef.current = "idle";
    }
  }, [currentTurnSide, mode]);

  useEffect(() => {
    if (mode !== "pvp" || !remoteShot) return;
    if (handledRemoteShotIdRef.current === remoteShot.id) return;

    const targetRef = remoteShot.side === "player" ? playerRef : botRef;
    targetRef.current.velocity = remoteShot.velocity;
    lastAttackerRef.current = remoteShot.side;
    phaseRef.current =
      remoteShot.side === "player" ? "player-simulating" : "bot-simulating";
    settleCountRef.current = 0;
    handledRemoteShotIdRef.current = remoteShot.id;
  }, [mode, remoteShot]);

  const getLocalChun = useCallback(() => {
    return localSide === "player" ? playerRef.current : botRef.current;
  }, [localSide]);

  const checkSettled = useCallback(() => {
    const p = vec2.length(playerRef.current.velocity);
    const b = vec2.length(botRef.current.velocity);
    return p < PHYSICS.VELOCITY_THRESHOLD && b < PHYSICS.VELOCITY_THRESHOLD;
  }, []);

  const notifyResult = useCallback(
    (result: RoundResult, winnerSide?: Turn) => {
      phaseRef.current = "ended";
      if (mode === "pvp" && winnerSide) {
        onRoundResult?.(winnerSide);
      }
      if (result === "win") onWin?.();
      else onLose?.();
    },
    [mode, onLose, onRoundResult, onWin],
  );

  const triggerBotTurn = useCallback(() => {
    if (mode === "pvp") return;
    phaseRef.current = "bot-thinking";
    const delay =
      Math.random() * (PHYSICS.BOT_THINK_TIME_MAX - PHYSICS.BOT_THINK_TIME_MIN) +
      PHYSICS.BOT_THINK_TIME_MIN;
    botThinkTimerRef.current = setTimeout(() => {
      const bot = botRef.current;
      const player = playerRef.current;
      const targetDir = vec2.normalize(vec2.sub(player.position, bot.position));
      const randomAngle = (Math.random() - 0.5) * PHYSICS.BOT_AIM_RANDOMNESS;
      const cos = Math.cos(randomAngle);
      const sin = Math.sin(randomAngle);
      const rotated = {
        x: targetDir.x * cos - targetDir.y * sin,
        y: targetDir.x * sin + targetDir.y * cos,
      };
      const power =
        Math.random() * (PHYSICS.BOT_MAX_POWER - PHYSICS.BOT_MIN_POWER) +
        PHYSICS.BOT_MIN_POWER;
      bot.velocity = vec2.scale(rotated, power);
      lastAttackerRef.current = "bot";
      phaseRef.current = "bot-simulating";
      settleCountRef.current = 0;
    }, delay);
  }, [mode]);

  const switchTurn = useCallback(() => {
    if (mode === "pvp") {
      currentTurnRef.current =
        currentTurnRef.current === "player" ? "bot" : "player";
      phaseRef.current = "idle";
      return;
    }

    if (currentTurnRef.current === "player") {
      currentTurnRef.current = "bot";
      triggerBotTurn();
    } else {
      currentTurnRef.current = "player";
      phaseRef.current = "idle";
    }
  }, [mode, triggerBotTurn]);

  const updatePhysics = useCallback(() => {
    const player = playerRef.current;
    const bot = botRef.current;
    const { width, height } = canvasSize;
    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y;
    bot.position.x += bot.velocity.x;
    bot.position.y += bot.velocity.y;
    player.velocity.x *= PHYSICS.FRICTION;
    player.velocity.y *= PHYSICS.FRICTION;
    bot.velocity.x *= PHYSICS.FRICTION;
    bot.velocity.y *= PHYSICS.FRICTION;

    [player, bot].forEach((chun) => {
      if (chun.position.x - chun.radius < 0) {
        chun.position.x = chun.radius;
        chun.velocity.x *= -PHYSICS.WALL_BOUNCE;
      } else if (chun.position.x + chun.radius > width) {
        chun.position.x = width - chun.radius;
        chun.velocity.x *= -PHYSICS.WALL_BOUNCE;
      }
      if (chun.position.y - chun.radius < 0) {
        chun.position.y = chun.radius;
        chun.velocity.y *= -PHYSICS.FLOOR_BOUNCE;
      } else if (chun.position.y + chun.radius > height) {
        chun.position.y = height - chun.radius;
        chun.velocity.y *= -PHYSICS.FLOOR_BOUNCE;
      }
    });

    const dist = vec2.distance(player.position, bot.position);
    if (dist < player.radius + bot.radius) {
      const p: Circle = {
        position: player.position,
        velocity: player.velocity,
        radius: player.radius,
      };
      const b: Circle = {
        position: bot.position,
        velocity: bot.velocity,
        radius: bot.radius,
      };
      const collision = resolveCollision(p, b);
      if (collision.collided) {
        player.position = collision.player.position;
        player.velocity = collision.player.velocity;
        bot.position = collision.bot.position;
        bot.velocity = collision.bot.velocity;
      }
    }
  }, [canvasSize]);

  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = COLORS.BACKGROUND;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.strokeStyle = COLORS.GRID;
      ctx.lineWidth = 1;
      for (let x = 0; x < canvasSize.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasSize.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvasSize.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasSize.width, y);
        ctx.stroke();
      }
    },
    [canvasSize],
  );

  const drawAimLine = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const drag = dragRef.current;
      if (!drag.isDragging) return;
      const activeChun = getLocalChun();
      const pull = vec2.sub(drag.currentPos, drag.startPos);
      const pullLength = Math.min(vec2.length(pull), PHYSICS.MAX_PULL_LENGTH);
      const direction = vec2.normalize(pull);
      const projectedEnd = vec2.sub(
        activeChun.position,
        vec2.scale(direction, pullLength * 1.5),
      );

      ctx.save();
      ctx.strokeStyle = COLORS.AIM_LINE;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(activeChun.position.x, activeChun.position.y);
      ctx.lineTo(projectedEnd.x, projectedEnd.y);
      ctx.stroke();
      ctx.restore();
    },
    [getLocalChun],
  );

  const render = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      drawBackground(ctx);
      const phase = phaseRef.current;
      const activeSide =
        mode === "bot" ? "player" : currentTurnSide ?? currentTurnRef.current;
      drawChun(
        ctx,
        botRef.current,
        activeSide === "bot" && (phase === "idle" || phase === "player-aiming"),
      );
      drawChun(
        ctx,
        playerRef.current,
        activeSide === "player" &&
          (phase === "idle" || phase === "player-aiming"),
      );
      if (phase === "player-aiming") drawAimLine(ctx);
    },
    [currentTurnSide, drawAimLine, drawBackground, mode],
  );

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const phase = phaseRef.current;
    if (
      phase === "player-simulating" ||
      phase === "bot-simulating" ||
      phase === "settling"
    ) {
      updatePhysics();
      if (checkSettled()) {
        settleCountRef.current += 1;
        if (settleCountRef.current >= PHYSICS.SETTLE_FRAMES) {
          const settled = checkSettledOverlapWin(
            {
              position: playerRef.current.position,
              velocity: playerRef.current.velocity,
              radius: playerRef.current.radius,
            },
            {
              position: botRef.current.position,
              velocity: botRef.current.velocity,
              radius: botRef.current.radius,
            },
            lastAttackerRef.current,
          );
          if (settled !== "none") {
            const winnerSide = settled === "player_wins" ? "player" : "bot";
            const localWon =
              mode === "bot"
                ? winnerSide === "player"
                : winnerSide === localSide;
            notifyResult(localWon ? "win" : "lose", winnerSide);
          } else {
            switchTurn();
          }
        } else {
          phaseRef.current = "settling";
        }
      } else {
        settleCountRef.current = 0;
      }
    }

    render(ctx);
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [
    checkSettled,
    localSide,
    mode,
    notifyResult,
    render,
    switchTurn,
    updatePhysics,
  ]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (botThinkTimerRef.current) clearTimeout(botThinkTimerRef.current);
    };
  }, [gameLoop]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !enabled || phaseRef.current !== "idle") return;
      if (mode === "pvp" && currentTurnRef.current !== localSide) return;
      const pos = getCanvasPosition(canvas, event.clientX, event.clientY);
      const activeChun = getLocalChun();
      if (!isInsideChun(pos, activeChun)) return;
      dragRef.current = {
        isDragging: true,
        startPos: { ...activeChun.position },
        currentPos: pos,
      };
      phaseRef.current = "player-aiming";
      canvas.setPointerCapture(event.pointerId);
    },
    [enabled, getLocalChun, localSide, mode],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !dragRef.current.isDragging) return;
      dragRef.current.currentPos = getCanvasPosition(
        canvas,
        event.clientX,
        event.clientY,
      );
    },
    [],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !dragRef.current.isDragging) return;
      const pull = vec2.sub(
        dragRef.current.currentPos,
        dragRef.current.startPos,
      );
      const pullLength = Math.min(vec2.length(pull), PHYSICS.MAX_PULL_LENGTH);
      if (pullLength > 10) {
        const dir = vec2.normalize(pull);
        const velocity = vec2.scale(
          dir,
          -pullLength * PHYSICS.PULL_POWER_SCALE,
        );
        const activeRef = localSide === "player" ? playerRef : botRef;
        activeRef.current.velocity = velocity;
        lastAttackerRef.current = localSide;
        phaseRef.current =
          localSide === "player" ? "player-simulating" : "bot-simulating";
        settleCountRef.current = 0;
        onShot?.({ side: localSide, velocity, pullLength });
      } else {
        phaseRef.current = "idle";
      }
      dragRef.current.isDragging = false;
      canvas.releasePointerCapture(event.pointerId);
    },
    [localSide, onShot],
  );

  const canPlayerAim =
    enabled &&
    (phaseRef.current === "idle" || phaseRef.current === "player-aiming") &&
    (mode === "bot" || currentTurnRef.current === localSide);

  return (
    <div
      className={
        showHeader ? "min-h-screen bg-sunny-gradient flex flex-col" : "flex flex-col"
      }
    >
      {showHeader && (
        <div className="bg-white shadow-lg border-b-4 border-sunny-400 px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <motion.button
                onClick={onBack}
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                className="bg-white p-4 rounded-full shadow-xl border-4 border-playful-blue"
              >
                <ArrowLeft className="size-6 text-playful-blue" />
              </motion.button>
              <div className="flex items-center gap-3">
                <span className="text-4xl" aria-hidden="true">
                  🎯
                </span>
                <div>
                  <h1 className="font-display font-black text-2xl text-gray-900">
                    Búng chun
                  </h1>
                  <p className="text-gray-600 font-semibold">
                    {mode === "bot"
                      ? "Đè vòng tròn bot để thắng!"
                      : "Đè vòng tròn đối thủ để thắng!"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={
          showHeader
            ? "flex-1 flex items-center justify-center p-6"
            : "flex items-center justify-center p-0"
        }
      >
        <div className="relative">
          {canPlayerAim && !dragRef.current.isDragging && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-16 left-1/2 -translate-x-1/2 bg-sunny-400 px-6 py-3 rounded-full border-4 border-white shadow-2xl z-10"
            >
              <p className="font-display font-black text-gray-900 text-lg whitespace-nowrap">
                Keo vong tron cua ban
              </p>
            </motion.div>
          )}

          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="bg-[#1e2939] rounded-4xl shadow-2xl border-8 border-sunny-400 cursor-pointer hover:border-playful-blue transition-colors touch-none max-w-full"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              dragRef.current.isDragging = false;
              if (phaseRef.current === "player-aiming") phaseRef.current = "idle";
            }}
          />
        </div>
      </div>
    </div>
  );
}
