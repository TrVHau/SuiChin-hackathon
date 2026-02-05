
import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { vec2 } from "./physics";
import type { Vector2D } from "./types";
import {
  resolveCollision,
  checkSettledOverlapWin,
  type Circle,
  type CollisionResult,
} from "./collision";


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
  onRoundEnd?: (result: RoundResult) => void;
  onStateChange?: (state: CanvasGameState) => void;
  debug?: boolean;
  enabled?: boolean;
} 

export interface GameCanvasHandle {
  resetGame: () => void;
  getPhase: () => GamePhase;
}

export interface CanvasGameState {
  phase: GamePhase;
  currentTurn: Turn;
  playerPosition: Vector2D;
  botPosition: Vector2D;
  playerVelocity: Vector2D;
  botVelocity: Vector2D;
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
  GRAVITY: 0,
  FRICTION: 0.96,
  WALL_BOUNCE: 0.7,
  FLOOR_BOUNCE: 0.7,
  CHUN_RADIUS: 32,
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


const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function GameCanvas(
    { tier = 1, onRoundEnd, onStateChange, debug = false, enabled = true },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>(0);

    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });

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
      position: { x: 600, y: 100 },
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


    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          const newWidth = Math.max(400, Math.floor(width));
          const newHeight = Math.max(300, Math.floor(height));
          setCanvasSize({ width: newWidth, height: newHeight });
        }
      });

      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }, []);

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

    useEffect(() => {
      playerRef.current.color = getTierColor(tier);
    }, [tier]);

    const winResultRef = useRef<CollisionResult>("none");


    const updatePhysics = useCallback(() => {
      const player = playerRef.current;
      const bot = botRef.current;
      const { width, height } = canvasSize;

      player.position.x += player.velocity.x;
      player.position.y += player.velocity.y;

      player.velocity.x *= PHYSICS.FRICTION;
      player.velocity.y *= PHYSICS.FRICTION;

      if (
        Math.abs(player.velocity.x) < 0.1 &&
        Math.abs(player.velocity.y) < 0.1
      ) {
        player.velocity.x = 0;
        player.velocity.y = 0;
      }

      if (player.position.x - player.radius < 0) {
        player.position.x = player.radius;
        player.velocity.x = Math.abs(player.velocity.x) * PHYSICS.WALL_BOUNCE;
      }
      if (player.position.x + player.radius > width) {
        player.position.x = width - player.radius;
        player.velocity.x = -Math.abs(player.velocity.x) * PHYSICS.WALL_BOUNCE;
      }
      if (player.position.y - player.radius < 0) {
        player.position.y = player.radius;
        player.velocity.y = Math.abs(player.velocity.y) * PHYSICS.WALL_BOUNCE;
      }
      if (player.position.y + player.radius > height) {
        player.position.y = height - player.radius;
        player.velocity.y = -Math.abs(player.velocity.y) * PHYSICS.FLOOR_BOUNCE;
      }

      const playerCircle: Circle = {
        position: player.position,
        velocity: player.velocity,
        radius: player.radius,
      };
      const botCircle: Circle = {
        position: bot.position,
        velocity: bot.velocity,
        radius: bot.radius,
      };

      const collisionResult = resolveCollision(playerCircle, botCircle);

      if (collisionResult.collided) {
        player.position = collisionResult.player.position;
        player.velocity = collisionResult.player.velocity;
        bot.position = collisionResult.bot.position;
        bot.velocity = collisionResult.bot.velocity;

        if (collisionResult.result !== "none") {
          winResultRef.current = collisionResult.result;
        }
      }

      bot.position.x += bot.velocity.x;
      bot.position.y += bot.velocity.y;
      bot.velocity.x *= PHYSICS.FRICTION;
      bot.velocity.y *= PHYSICS.FRICTION;

      if (Math.abs(bot.velocity.x) < 0.1 && Math.abs(bot.velocity.y) < 0.1) {
        bot.velocity.x = 0;
        bot.velocity.y = 0;
      }

      if (bot.position.x - bot.radius < 0) {
        bot.position.x = bot.radius;
        bot.velocity.x = Math.abs(bot.velocity.x) * PHYSICS.WALL_BOUNCE;
      }
      if (bot.position.x + bot.radius > width) {
        bot.position.x = width - bot.radius;
        bot.velocity.x = -Math.abs(bot.velocity.x) * PHYSICS.WALL_BOUNCE;
      }
      if (bot.position.y - bot.radius < 0) {
        bot.position.y = bot.radius;
        bot.velocity.y = Math.abs(bot.velocity.y) * PHYSICS.WALL_BOUNCE;
      }
      if (bot.position.y + bot.radius > height) {
        bot.position.y = height - bot.radius;
        bot.velocity.y = -Math.abs(bot.velocity.y) * PHYSICS.FLOOR_BOUNCE;
      }
    }, [canvasSize]);

    const checkSettled = useCallback((): boolean => {
      const player = playerRef.current;
      const bot = botRef.current;
      const playerSpeed = vec2.length(player.velocity);
      const botSpeed = vec2.length(bot.velocity);
      return (
        playerSpeed < PHYSICS.VELOCITY_THRESHOLD &&
        botSpeed < PHYSICS.VELOCITY_THRESHOLD
      );
    }, []);


    const calculateBotMove = useCallback((): Vector2D => {
      const bot = botRef.current;
      const player = playerRef.current;

      const toPlayer = vec2.sub(player.position, bot.position);
      const baseDirection = vec2.normalize(toPlayer);

      const randomness = PHYSICS.BOT_AIM_RANDOMNESS[tier] ?? Math.PI / 4;
      const errorAngle = (Math.random() - 0.5) * randomness;

      const aimDirection: Vector2D = {
        x:
          baseDirection.x * Math.cos(errorAngle) -
          baseDirection.y * Math.sin(errorAngle),
        y:
          baseDirection.x * Math.sin(errorAngle) +
          baseDirection.y * Math.cos(errorAngle),
      };

      const distance = vec2.length(toPlayer);
      const normalizedDist = Math.min(distance / 400, 1);

      const basePower =
        PHYSICS.BOT_MIN_POWER +
        (PHYSICS.BOT_MAX_POWER - PHYSICS.BOT_MIN_POWER) * normalizedDist;
      const powerVariance = (Math.random() - 0.5) * 2;
      const finalPower = Math.max(
        PHYSICS.BOT_MIN_POWER,
        Math.min(PHYSICS.BOT_MAX_POWER, basePower + powerVariance),
      );

      return vec2.scale(aimDirection, finalPower);
    }, [tier]);

    const triggerBotTurn = useCallback(() => {
      if (phaseRef.current === "ended") return;

      phaseRef.current = "bot-thinking";

      const thinkTime =
        PHYSICS.BOT_THINK_TIME_MIN +
        Math.random() *
          (PHYSICS.BOT_THINK_TIME_MAX - PHYSICS.BOT_THINK_TIME_MIN);

      botThinkTimerRef.current = setTimeout(() => {
        if (phaseRef.current !== "bot-thinking") return;

        const impulse = calculateBotMove();
        botRef.current.velocity = impulse;

        lastAttackerRef.current = "bot";
        phaseRef.current = "bot-simulating";
        settleCountRef.current = 0;
      }, thinkTime);
    }, [calculateBotMove]);


    const drawBackground = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        const { width, height } = canvasSize;

        ctx.fillStyle = COLORS.BACKGROUND;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = COLORS.GRID;
        ctx.lineWidth = 0.5;
        const gridSize = 40;

        for (let x = 0; x <= width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y <= height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      },
      [canvasSize],
    );

    const drawChun = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        chun: ChunState,
        highlight: boolean = false,
      ) => {
        ctx.save();

        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.beginPath();
        ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
        ctx.strokeStyle = chun.color;
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.shadowColor = "transparent";

        if (highlight) {
          ctx.strokeStyle = "#fdc700";
          ctx.lineWidth = 4;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(chun.label, chun.position.x, chun.position.y);

        ctx.restore();
      },
      [],
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

    const drawPhaseIndicator = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        const phase = phaseRef.current;
        const turn = currentTurnRef.current;
        let text = "";
        let bgColor = "rgba(0, 0, 0, 0.7)";

        switch (phase) {
          case "idle":
            text = "🎯 Lượt bạn - Kéo chun để bắn!";
            bgColor = "rgba(34, 139, 34, 0.8)";
            break;
          case "player-aiming":
            text = "🎯 Thả để bắn...";
            bgColor = "rgba(34, 139, 34, 0.8)";
            break;
          case "player-simulating":
            text = "⏳ Đang di chuyển...";
            break;
          case "bot-thinking":
            text = "🤖 Bot đang suy nghĩ...";
            bgColor = "rgba(220, 38, 38, 0.8)";
            break;
          case "bot-simulating":
            text = "🤖 Lượt Bot - Đang di chuyển...";
            bgColor = "rgba(220, 38, 38, 0.8)";
            break;
          case "settling":
            text = turn === "player" ? "⏳ Đang dừng..." : "🤖 Đang dừng...";
            break;
          case "ended":
            text = "🏁 Kết thúc!";
            break;
        }

        ctx.save();
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasSize.width, 40);
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, canvasSize.width / 2, 20);
        ctx.restore();
      },
      [canvasSize],
    );

    const drawDebug = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        if (!debug) return;

        const player = playerRef.current;
        const bot = botRef.current;
        const playerSpeed = vec2.length(player.velocity);
        const botSpeed = vec2.length(bot.velocity);

        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, canvasSize.height - 80, 220, 80);
        ctx.fillStyle = "#00ff00";
        ctx.font = "12px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`Phase: ${phaseRef.current}`, 10, canvasSize.height - 65);
        ctx.fillText(
          `Turn: ${currentTurnRef.current}`,
          10,
          canvasSize.height - 50,
        );
        ctx.fillText(
          `Player: ${playerSpeed.toFixed(2)}`,
          10,
          canvasSize.height - 35,
        );
        ctx.fillText(`Bot: ${botSpeed.toFixed(2)}`, 10, canvasSize.height - 20);
        ctx.restore();
      },
      [debug, canvasSize],
    );

    const render = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        drawBackground(ctx);
        const highlightBot =
          phaseRef.current === "bot-thinking" ||
          phaseRef.current === "bot-simulating";
        const highlightPlayer =
          phaseRef.current === "idle" || phaseRef.current === "player-aiming";
        drawChun(ctx, botRef.current, highlightBot);
        drawChun(ctx, playerRef.current, highlightPlayer);
        drawAimLine(ctx);
        drawPhaseIndicator(ctx);
        drawDebug(ctx);
      },
      [drawBackground, drawChun, drawAimLine, drawPhaseIndicator, drawDebug],
    );

    const handleWin = useCallback(
      (result: RoundResult) => {
        phaseRef.current = "ended";
        const player = playerRef.current;
        const bot = botRef.current;

        onRoundEnd?.(result);
        onStateChange?.({
          phase: "ended",
          currentTurn: currentTurnRef.current,
          playerPosition: { ...player.position },
          botPosition: { ...bot.position },
          playerVelocity: { ...player.velocity },
          botVelocity: { ...bot.velocity },
        });
      },
      [onRoundEnd, onStateChange],
    );

    const switchTurn = useCallback(() => {
      console.log(
        "[GameCanvas] switchTurn called! Current turn:",
        currentTurnRef.current,
        "Phase:",
        phaseRef.current,
      );
      if (currentTurnRef.current === "player") {
        currentTurnRef.current = "bot";
        console.log("[GameCanvas] Now it's bot turn, calling triggerBotTurn");
        triggerBotTurn();
      } else {
        currentTurnRef.current = "player";
        phaseRef.current = "idle";
        console.log("[GameCanvas] Now it's player turn, phase=idle");
      }
    }, [triggerBotTurn]);

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


        if (winResultRef.current !== "none") {
          let result: RoundResult = "draw";
          if (winResultRef.current === "player_wins") result = "win";
          else if (winResultRef.current === "bot_wins") result = "lose";
          handleWin(result);
        } else if (checkSettled()) {
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
      };
    }, [gameLoop]);

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


    const resetGame = useCallback(() => {
      if (botThinkTimerRef.current) {
        clearTimeout(botThinkTimerRef.current);
        botThinkTimerRef.current = null;
      }

      phaseRef.current = "idle";
      currentTurnRef.current = "player";
      lastAttackerRef.current = null;
      settleCountRef.current = 0;
      winResultRef.current = "none";

      playerRef.current.position = {
        x: canvasSize.width * 0.25,
        y: canvasSize.height - 80,
      };
      playerRef.current.velocity = { x: 0, y: 0 };

      botRef.current.position = {
        x: canvasSize.width * 0.75,
        y: 80,
      };
      botRef.current.velocity = { x: 0, y: 0 };

      dragRef.current.isDragging = false;
    }, [canvasSize]);

    useImperativeHandle(
      ref,
      () => ({
        resetGame,
        getPhase: () => phaseRef.current,
      }),
      [resetGame],
    );

    useEffect(() => {
      return () => {
        if (botThinkTimerRef.current) {
          clearTimeout(botThinkTimerRef.current);
        }
      };
    }, []);


    return (
      <div
        ref={containerRef}
        className="w-full h-full min-h-[300px]"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-full cursor-crosshair"
          style={{ display: "block", backgroundColor: COLORS.BACKGROUND }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
        />
      </div>
    );
  },
);

export default GameCanvas;
