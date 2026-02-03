// GameCanvas - Direct physics game with drag/flick controls - VÒNG TRÒN VERSION

import {
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { vec2 } from "@/game/physics";
import type { Vector2D } from "@/game/types";
import {
  resolveCollision,
  checkSettledOverlapWin,
  type Circle,
} from "@/game/collision";

// ============================================================================
// Types
// ============================================================================

export type RoundResult = "win" | "lose" | "draw";
export type Turn = "player" | "bot";
export type GamePhase =
  | "idle"
  | "player-aiming"
  | "player-simulating"
  | "bot-thinking"
  | "bot-simulating"
  | "settling"
  | "ended";

export interface GameCanvasProps {
  tier?: number;
  onWin?: () => void;
  onLose?: () => void;
  onBack: () => void;
  enabled?: boolean;
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

// ============================================================================
// Constants
// ============================================================================

const PHYSICS = {
  GRAVITY: 0,
  FRICTION: 0.96,
  WALL_BOUNCE: 0.7,
  FLOOR_BOUNCE: 0.7,
  CHUN_RADIUS: 28, // Tăng từ 20 lên 28 để vòng to hơn
  MAX_PULL_LENGTH: 150,
  PULL_POWER_SCALE: 0.25,
  VELOCITY_THRESHOLD: 0.15,
  SETTLE_FRAMES: 30,
  BOT_THINK_TIME_MIN: 500,
  BOT_THINK_TIME_MAX: 1200,
  BOT_MIN_POWER: 3,
  BOT_MAX_POWER: 12,
  BOT_AIM_RANDOMNESS: {
    1: Math.PI / 2,
    2: Math.PI / 4,
    3: Math.PI / 6,
  } as Record<number, number>,
};

const COLORS = {
  BACKGROUND: "#1e2939",
  GRID: "#364153",
  PLAYER_TIER1: "#ff8904",
  PLAYER_TIER2: "#99a1af",
  PLAYER_TIER3: "#fdc700",
  BOT: "#ef4444",
  AIM_LINE: "rgba(255, 255, 255, 0.6)",
  POWER_BAR_BG: "rgba(0, 0, 0, 0.5)",
};

// ============================================================================
// Helper functions
// ============================================================================

function getTierColor(tier: number): string {
  switch (tier) {
    case 1:
      return COLORS.PLAYER_TIER1;
    case 2:
      return COLORS.PLAYER_TIER2;
    case 3:
      return COLORS.PLAYER_TIER3;
    default:
      return COLORS.PLAYER_TIER1;
  }
}

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

/**
 * Draw a chun as VÒNG TRÒN (ring/donut)
 */
function drawChun(
  ctx: CanvasRenderingContext2D,
  chun: ChunState,
  isHighlighted: boolean = false,
): void {
  ctx.save();

  // Shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  // Outer circle
  ctx.beginPath();
  ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
  ctx.fillStyle = chun.color;
  ctx.fill();

  // Inner hole - creates THIN RING like image (vòng mỏng như ảnh)
  const holeRadius = chun.radius * 0.85; // 85% - chỉ còn viền mỏng
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(chun.position.x, chun.position.y, holeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // 3D gradient on ring
  ctx.shadowColor = "transparent";
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

  // Highlight ring
  if (isHighlighted) {
    ctx.strokeStyle = "#fdc700";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(253, 199, 0, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(chun.position.x, chun.position.y, chun.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Outer border
  ctx.beginPath();
  ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner border
  ctx.beginPath();
  ctx.arc(chun.position.x, chun.position.y, holeRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Label
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

// ============================================================================
// Component
// ============================================================================

export default function GameCanvas({
  tier = 1,
  onWin,
  onLose,
  enabled = true,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);

  const [canvasSize] = useState({ width: 900, height: 500 });
  const [showResult, setShowResult] = useState(false);
  const [finalResult, setFinalResult] = useState<RoundResult | null>(null);

  const phaseRef = useRef<GamePhase>("idle");
  const currentTurnRef = useRef<Turn>("player");
  const lastAttackerRef = useRef<"player" | "bot" | null>(null);
  const settleCountRef = useRef(0);
  const botThinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerRef = useRef<ChunState>({
    position: { x: 200, y: 400 },
    velocity: { x: 0, y: 0 },
    radius: PHYSICS.CHUN_RADIUS,
    color: getTierColor(tier),
    label: "YOU",
  });

  const botRef = useRef<ChunState>({
    position: { x: 700, y: 100 },
    velocity: { x: 0, y: 0 },
    radius: PHYSICS.CHUN_RADIUS,
    color: COLORS.BOT,
    label: "BOT",
  });

  const dragRef = useRef<DragState>({
    isDragging: false,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
  });

  // Reset positions on mount
  useEffect(() => {
    playerRef.current.position = {
      x: canvasSize.width * 0.25,
      y: canvasSize.height - 80,
    };
    botRef.current.position = {
      x: canvasSize.width * 0.75,
      y: 80,
    };
  }, [canvasSize]);

  // Update player color when tier changes
  useEffect(() => {
    playerRef.current.color = getTierColor(tier);
  }, [tier]);

  // ============================================================================
  // Physics
  // ============================================================================

  const updatePhysics = useCallback(() => {
    const player = playerRef.current;
    const bot = botRef.current;
    const { width, height } = canvasSize;

    // 1. Apply velocity cho CẢ 2 chun
    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y;
    bot.position.x += bot.velocity.x;
    bot.position.y += bot.velocity.y;

    // 2. Apply friction
    player.velocity.x *= PHYSICS.FRICTION;
    player.velocity.y *= PHYSICS.FRICTION;
    bot.velocity.x *= PHYSICS.FRICTION;
    bot.velocity.y *= PHYSICS.FRICTION;

    // 3. Wall collisions cho cả 2
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

    // 4. Chun-chun collision - PHẢI VA CHẠM (bounce) như va tường!
    const dist = vec2.distance(player.position, bot.position);
    if (dist < player.radius + bot.radius) {
      const pCircle: Circle = {
        position: player.position,
        velocity: player.velocity,
        radius: player.radius,
      };
      const bCircle: Circle = {
        position: bot.position,
        velocity: bot.velocity,
        radius: bot.radius,
      };

      const collision = resolveCollision(pCircle, bCircle);

      // Apply collision bounce - 2 chun VA CHẠM và BOUNCE!
      if (collision.collided) {
        player.position = collision.player.position;
        player.velocity = collision.player.velocity;
        bot.position = collision.bot.position;
        bot.velocity = collision.bot.velocity;
      }
    }
  }, [canvasSize]);

  const checkSettled = useCallback((): boolean => {
    const player = playerRef.current;
    const bot = botRef.current;
    const pSpeed = vec2.length(player.velocity);
    const bSpeed = vec2.length(bot.velocity);
    return (
      pSpeed < PHYSICS.VELOCITY_THRESHOLD &&
      bSpeed < PHYSICS.VELOCITY_THRESHOLD
    );
  }, []);

  const handleWin = useCallback(
    (result: RoundResult) => {
      phaseRef.current = "ended";
      setFinalResult(result);
      setShowResult(true);

      setTimeout(() => {
        if (result === "win" && onWin) {
          onWin();
        } else if (result === "lose" && onLose) {
          onLose();
        } else if (result === "draw" && onLose) {
          onLose(); // Treat draw as lose
        }
      }, 2000);
    },
    [onWin, onLose],
  );

  const triggerBotTurn = useCallback(() => {
    phaseRef.current = "bot-thinking";

    const delay = Math.random() * (PHYSICS.BOT_THINK_TIME_MAX - PHYSICS.BOT_THINK_TIME_MIN) + PHYSICS.BOT_THINK_TIME_MIN;

    botThinkTimerRef.current = setTimeout(() => {
      const bot = botRef.current;
      const player = playerRef.current;

      const targetDir = vec2.normalize(
        vec2.sub(player.position, bot.position),
      );

      const randomness = PHYSICS.BOT_AIM_RANDOMNESS[tier] || Math.PI / 4;
      const randomAngle = (Math.random() - 0.5) * randomness;
      const cos = Math.cos(randomAngle);
      const sin = Math.sin(randomAngle);
      const rotatedDir = {
        x: targetDir.x * cos - targetDir.y * sin,
        y: targetDir.x * sin + targetDir.y * cos,
      };

      const power =
        Math.random() * (PHYSICS.BOT_MAX_POWER - PHYSICS.BOT_MIN_POWER) +
        PHYSICS.BOT_MIN_POWER;
      bot.velocity = vec2.scale(rotatedDir, power);

      lastAttackerRef.current = "bot";
      phaseRef.current = "bot-simulating";
      settleCountRef.current = 0;
    }, delay);
  }, [tier]);

  const switchTurn = useCallback(() => {
    if (currentTurnRef.current === "player") {
      currentTurnRef.current = "bot";
      triggerBotTurn();
    } else {
      currentTurnRef.current = "player";
      phaseRef.current = "idle";
    }
  }, [triggerBotTurn]);

  // ============================================================================
  // Rendering
  // ============================================================================

  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = COLORS.BACKGROUND;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Grid
      ctx.strokeStyle = COLORS.GRID;
      ctx.lineWidth = 1;
      const gridSize = 40;

      for (let x = 0; x < canvasSize.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasSize.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvasSize.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasSize.width, y);
        ctx.stroke();
      }
    },
    [canvasSize],
  );

  const drawAimLine = useCallback((ctx: CanvasRenderingContext2D) => {
    const drag = dragRef.current;
    if (!drag.isDragging) return;

    const player = playerRef.current;
    const pullVector = vec2.sub(drag.currentPos, drag.startPos);
    const pullLength = Math.min(
      vec2.length(pullVector),
      PHYSICS.MAX_PULL_LENGTH,
    );
    const normalizedPower = pullLength / PHYSICS.MAX_PULL_LENGTH;

    const direction = vec2.normalize(pullVector);
    const projectedEnd = vec2.sub(
      player.position,
      vec2.scale(direction, pullLength * 1.5),
    );

    ctx.save();

    ctx.strokeStyle = COLORS.AIM_LINE;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(player.position.x, player.position.y);
    ctx.lineTo(projectedEnd.x, projectedEnd.y);
    ctx.stroke();

    ctx.setLineDash([]);
    const arrowSize = 12;
    const angle = Math.atan2(
      projectedEnd.y - player.position.y,
      projectedEnd.x - player.position.x,
    );
    ctx.beginPath();
    ctx.moveTo(projectedEnd.x, projectedEnd.y);
    ctx.lineTo(
      projectedEnd.x - arrowSize * Math.cos(angle - Math.PI / 6),
      projectedEnd.y - arrowSize * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(projectedEnd.x, projectedEnd.y);
    ctx.lineTo(
      projectedEnd.x - arrowSize * Math.cos(angle + Math.PI / 6),
      projectedEnd.y - arrowSize * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();

    // Power bar
    const barWidth = 60;
    const barHeight = 8;
    const barX = player.position.x - barWidth / 2;
    const barY = player.position.y + player.radius + 20;

    ctx.fillStyle = COLORS.POWER_BAR_BG;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const powerColor =
      normalizedPower < 0.5
        ? `rgb(${Math.floor(normalizedPower * 2 * 255)}, 255, 0)`
        : `rgb(255, ${Math.floor((1 - (normalizedPower - 0.5) * 2) * 255)}, 0)`;
    ctx.fillStyle = powerColor;
    ctx.fillRect(barX, barY, barWidth * normalizedPower, barHeight);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.restore();
  }, []);

  const render = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      drawBackground(ctx);

      const player = playerRef.current;
      const bot = botRef.current;
      const phase = phaseRef.current;

      drawChun(ctx, bot, false);
      drawChun(ctx, player, phase === "idle" || phase === "player-aiming");

      if (phase === "player-aiming") {
        drawAimLine(ctx);
      }
    },
    [drawBackground, drawAimLine],
  );

  // ============================================================================
  // Game loop
  // ============================================================================

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

      // KHÔNG check win trong collision nữa, chỉ check sau settled
      if (checkSettled()) {
        settleCountRef.current++;
        if (settleCountRef.current >= PHYSICS.SETTLE_FRAMES) {
          const player = playerRef.current;
          const bot = botRef.current;

          const settledResult = checkSettledOverlapWin(
            {
              position: player.position,
              velocity: player.velocity,
              radius: player.radius,
            },
            {
              position: bot.position,
              velocity: bot.velocity,
              radius: bot.radius,
            },
            lastAttackerRef.current,
          );

          if (settledResult !== "none") {
            let result: RoundResult = "draw";
            if (settledResult === "player_wins") result = "win";
            else if (settledResult === "bot_wins") result = "lose";
            handleWin(result);
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
  }, [updatePhysics, checkSettled, render, handleWin, switchTurn]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (botThinkTimerRef.current) {
        clearTimeout(botThinkTimerRef.current);
      }
    };
  }, [gameLoop]);

  // ============================================================================
  // Input handlers
  // ============================================================================

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !enabled || phaseRef.current !== "idle") return;

      const pos = getCanvasPosition(canvas, e.clientX, e.clientY);
      const player = playerRef.current;

      if (isInsideChun(pos, player)) {
        dragRef.current = {
          isDragging: true,
          startPos: { ...player.position },
          currentPos: pos,
        };
        phaseRef.current = "player-aiming";
        canvas.setPointerCapture(e.pointerId);
      }
    },
    [enabled],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !dragRef.current.isDragging) return;

      const pos = getCanvasPosition(canvas, e.clientX, e.clientY);
      dragRef.current.currentPos = pos;
    },
    [],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !dragRef.current.isDragging) return;

      const drag = dragRef.current;
      const player = playerRef.current;

      const pullVector = vec2.sub(drag.currentPos, drag.startPos);
      const pullLength = Math.min(
        vec2.length(pullVector),
        PHYSICS.MAX_PULL_LENGTH,
      );

      if (pullLength > 10) {
        const direction = vec2.normalize(pullVector);
        const power = pullLength * PHYSICS.PULL_POWER_SCALE;
        player.velocity = vec2.scale(direction, -power);

        lastAttackerRef.current = "player";
        phaseRef.current = "player-simulating";
        settleCountRef.current = 0;
      } else {
        phaseRef.current = "idle";
      }

      dragRef.current.isDragging = false;
      canvas.releasePointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerCancel = useCallback(() => {
    dragRef.current.isDragging = false;
    if (phaseRef.current === "player-aiming") {
      phaseRef.current = "idle";
    }
  }, []);

  // ============================================================================
  // UI
  // ============================================================================

  const tierColors = {
    1: { emoji: "🥉", name: "Bronze" },
    2: { emoji: "🥈", name: "Silver" },
    3: { emoji: "🥇", name: "Gold" },
  };

  const colors = tierColors[tier as keyof typeof tierColors];
  const canPlayerAim = phaseRef.current === "idle" || phaseRef.current === "player-aiming";

  return (
    <div className="min-h-screen bg-sunny-gradient flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-sunny-400 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.button
              onClick={() => {
                if (
                  window.confirm(
                    "Bạn có chắc muốn thoát? (Sẽ tính là THUA và -1 chun)",
                  )
                ) {
                  if (onLose) onLose();
                }
              }}
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              className="bg-white p-4 rounded-full shadow-xl border-4 border-playful-blue"
            >
              <ArrowLeft className="size-6 text-playful-blue" />
            </motion.button>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{colors.emoji}</span>
              <div>
                <h1 className="font-display font-black text-2xl text-gray-900">
                  {colors.name} Match
                </h1>
                <p className="text-gray-600 font-semibold">
                  Đè vòng tròn bot để thắng!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative" ref={containerRef}>
          {/* Helper Hint */}
          {canPlayerAim && !dragRef.current.isDragging && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-16 left-1/2 -translate-x-1/2 bg-sunny-400 px-6 py-3 rounded-full border-4 border-white shadow-2xl z-10"
            >
              <p className="font-display font-black text-gray-900 text-lg whitespace-nowrap">
                👆 Kéo vòng tròn vàng phía dưới
              </p>
            </motion.div>
          )}

          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="bg-[#1e2939] rounded-4xl shadow-2xl border-8 border-sunny-400 cursor-pointer hover:border-playful-blue transition-colors touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />

          {/* Result Overlay */}
          <AnimatePresence>
            {showResult && finalResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-4xl"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="bg-white rounded-3xl p-12 text-center border-8 border-sunny-400 shadow-2xl"
                >
                  <div className="text-9xl mb-6">
                    {finalResult === "win"
                      ? "🎉"
                      : finalResult === "lose"
                        ? "😢"
                        : "🤝"}
                  </div>
                  <h2 className="font-display font-black text-5xl text-gray-900 mb-4">
                    {finalResult === "win"
                      ? "BẠN THẮNG!"
                      : finalResult === "lose"
                        ? "BẠN THUA!"
                        : "HÒA!"}
                  </h2>
                  <p className="text-gray-600 font-semibold text-xl">
                    {finalResult === "win"
                      ? "+1 chun, streak tăng"
                      : "-1 chun, streak reset"}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white border-t-4 border-sunny-400 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="bg-playful-blue/20 rounded-3xl p-5 border-4 border-playful-blue">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-lg text-gray-900 mb-1">
                  🎮 {phaseRef.current === "idle" || phaseRef.current === "player-aiming" ? "Lượt của bạn!" : phaseRef.current === "bot-thinking" ? "Bot đang suy nghĩ..." : "Đang di chuyển..."}
                </h3>
                <p className="text-gray-800 font-semibold text-sm">
                  Kéo vòng tròn và thả để búng. Vòng tròn của bạn đè lên vòng tròn bot = THẮNG!
                </p>
              </div>
              <img src="/logo.png" alt="Logo" className="h-12 opacity-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
