// ============================================================================
// JUICY GAME CANVAS - Fun physics-based flick game
// ============================================================================

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  vec2,
  PHYSICS_CONFIG,
  createChun,
  calculateLaunchVelocity,
  getPullInfo,
  updateChunPhysics,
  resolveChunCollision,
  checkSettledWin,
  areBothSettled,
  calculateBotLaunch,
  getBotThinkTime,
  getSquashScale,
  getMotionStretch,
  type Chun,
  type WorldBounds,
  type GameEvent,
  type StompResult,
} from "./juicy-physics";
import type { Vector2D } from "./types";

// ============================================================================
// Types
// ============================================================================

export type RoundResult = "win" | "lose" | "draw";
export type Turn = "player" | "bot";
export type GamePhase =
  | "waiting" // Waiting to start
  | "player-idle" // Player's turn, waiting for input
  | "player-aiming" // Player dragging
  | "launch-delay" // Brief pause before launch (juice)
  | "player-simulating" // Player's shot in motion
  | "bot-thinking" // Bot's turn, "thinking"
  | "bot-simulating" // Bot's shot in motion
  | "settling" // Both settling down
  | "hit-stop" // Freeze on stomp (juice)
  | "ended"; // Round over

export interface JuicyGameCanvasProps {
  tier?: number;
  onRoundEnd?: (result: RoundResult) => void;
  onGameEvent?: (event: GameEvent) => void;
  debug?: boolean;
  enabled?: boolean;
}

export interface JuicyGameCanvasHandle {
  resetGame: () => void;
  startRound: () => void;
  getPhase: () => GamePhase;
}

// ============================================================================
// Colors
// ============================================================================

const COLORS = {
  BACKGROUND: "#1a1f2e",
  GRID: "#2a3142",
  GRID_MAJOR: "#3a4156",

  PLAYER_T1: "#ff8904",
  PLAYER_T2: "#c0c7d4",
  PLAYER_T3: "#fdc700",

  BOT: "#ef4444",
  BOT_GLOW: "rgba(239, 68, 68, 0.3)",

  AIM_LINE: "rgba(255, 255, 255, 0.7)",
  AIM_LINE_WEAK: "rgba(255, 255, 255, 0.3)",
  POWER_LOW: "#4ade80",
  POWER_MID: "#facc15",
  POWER_HIGH: "#ef4444",

  TRAIL: "rgba(255, 255, 255, 0.15)",

  WIN_TEXT: "#4ade80",
  LOSE_TEXT: "#ef4444",
};

function getTierColor(tier: number): string {
  switch (tier) {
    case 1:
      return COLORS.PLAYER_T1;
    case 2:
      return COLORS.PLAYER_T2;
    case 3:
      return COLORS.PLAYER_T3;
    default:
      return COLORS.PLAYER_T1;
  }
}

function getPowerColor(power: number): string {
  if (power < 0.4) return COLORS.POWER_LOW;
  if (power < 0.7) return COLORS.POWER_MID;
  return COLORS.POWER_HIGH;
}

// ============================================================================
// Canvas Helpers
// ============================================================================

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

function isInsideChun(pos: Vector2D, chun: Chun): boolean {
  return vec2.distance(pos, chun.position) <= chun.radius * 1.3;
}

// ============================================================================
// Component
// ============================================================================

const JuicyGameCanvas = forwardRef<JuicyGameCanvasHandle, JuicyGameCanvasProps>(
  function JuicyGameCanvas(
    { tier = 1, onRoundEnd, onGameEvent, debug = false, enabled = true },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>(0);

    // Canvas size
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });

    // Game state refs (avoid re-renders during animation)
    const phaseRef = useRef<GamePhase>("waiting");
    const currentTurnRef = useRef<Turn>("player");
    const lastAttackerRef = useRef<"a" | "b" | null>(null);
    const settleCountRef = useRef(0);
    const simulationFrameRef = useRef(0);
    const hitStopFramesRef = useRef(0);
    const launchDelayFramesRef = useRef(0);
    const pendingLaunchVelocityRef = useRef<Vector2D | null>(null);
    const roundResultRef = useRef<RoundResult | null>(null);
    const turnCountRef = useRef(0); // Track number of turns

    // Chun refs
    const playerRef = useRef<Chun>(
      createChun(200, 400, 32, true, getTierColor(tier), "YOU"),
    );
    const botRef = useRef<Chun>(
      createChun(600, 100, 32, false, COLORS.BOT, "BOT"),
    );

    // Drag state
    const dragRef = useRef({
      isDragging: false,
      currentPos: { x: 0, y: 0 },
    });

    // Bot timer
    const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Camera shake state (game feel)
    const cameraShakeRef = useRef({ x: 0, y: 0, intensity: 0 });

    // Hit-stop timer for 50ms freeze on win
    const hitStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ──────────────────────────────────────────────────────────────────────
    // Resize
    // ──────────────────────────────────────────────────────────────────────

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          setCanvasSize({
            width: Math.max(400, Math.floor(width)),
            height: Math.max(300, Math.floor(height)),
          });
        }
      });

      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }, []);

    // Update tier color
    useEffect(() => {
      playerRef.current.color = getTierColor(tier);
    }, [tier]);

    // ──────────────────────────────────────────────────────────────────────
    // Reset & Start
    // ──────────────────────────────────────────────────────────────────────

    const resetGame = useCallback(() => {
      // Clear bot timer
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }

      // Reset state
      phaseRef.current = "waiting";
      currentTurnRef.current = "player";
      lastAttackerRef.current = null;
      settleCountRef.current = 0;
      simulationFrameRef.current = 0;
      hitStopFramesRef.current = 0;
      launchDelayFramesRef.current = 0;
      pendingLaunchVelocityRef.current = null;
      roundResultRef.current = null;
      turnCountRef.current = 0; // Reset turn counter

      // Reset chuns - positioned on opposite sides of the arena
      playerRef.current = createChun(
        canvasSize.width * 0.25,
        canvasSize.height * 0.65, // Lower portion of the arena
        32,
        true,
        getTierColor(tier),
        "YOU",
      );
      botRef.current = createChun(
        canvasSize.width * 0.75,
        canvasSize.height * 0.35, // Upper portion of the arena
        32,
        false,
        COLORS.BOT,
        "BOT",
      );

      dragRef.current.isDragging = false;
    }, [canvasSize, tier]);

    const startRound = useCallback(() => {
      resetGame();
      phaseRef.current = "player-idle";
    }, [resetGame]);

    // Auto-start on size change if waiting
    useEffect(() => {
      if (phaseRef.current === "waiting") {
        startRound();
      }
    }, [canvasSize, startRound]);

    // ──────────────────────────────────────────────────────────────────────
    // Handle Win - Called only after motion settles
    // ──────────────────────────────────────────────────────────────────────

    const handleWin = useCallback(
      (stompResult: StompResult) => {
        let result: RoundResult = "draw";

        // Player is 'a', bot is 'b' in our collision
        if (stompResult === "a_wins") {
          result = "win";
        } else if (stompResult === "b_wins") {
          result = "lose";
        }

        roundResultRef.current = result;

        // JUICE: Camera shake and hit-stop for any win
        if (stompResult !== "none") {
          cameraShakeRef.current = { x: 0, y: 0, intensity: 10 };

          // Hit-stop: brief freeze (3 frames at 60fps)
          hitStopFramesRef.current = 3;
          phaseRef.current = "hit-stop";

          onGameEvent?.({
            type: "stomp_win",
            position: vec2.lerp(
              playerRef.current.position,
              botRef.current.position,
              0.5,
            ),
            intensity: 1,
          });
        } else {
          phaseRef.current = "ended";
          onRoundEnd?.(result);
        }
      },
      [onRoundEnd, onGameEvent],
    );

    // ──────────────────────────────────────────────────────────────────────
    // Switch Turn
    // ──────────────────────────────────────────────────────────────────────

    const switchTurn = useCallback(() => {
      // Increment turn counter
      turnCountRef.current++;
      console.log(
        "[Game] switchTurn called, turn count:",
        turnCountRef.current,
        "current:",
        currentTurnRef.current,
      );

      // Check if max turns reached - force end game
      if (turnCountRef.current >= PHYSICS_CONFIG.MAX_TURNS) {
        // Determine winner by Y position (visually higher wins)
        const yDiff = botRef.current.position.y - playerRef.current.position.y;
        const result: StompResult =
          yDiff > 5 ? "a_wins" : yDiff < -5 ? "b_wins" : "none";
        handleWin(result);
        return;
      }

      if (currentTurnRef.current === "player") {
        // Switch to bot
        currentTurnRef.current = "bot";
        phaseRef.current = "bot-thinking";

        const thinkTime = getBotThinkTime(tier);
        botTimerRef.current = setTimeout(() => {
          if (phaseRef.current !== "bot-thinking") return;

          // Bot launches
          const velocity = calculateBotLaunch(
            botRef.current,
            playerRef.current,
            tier,
          );
          botRef.current.velocity = velocity;
          lastAttackerRef.current = "b";
          phaseRef.current = "bot-simulating";
          settleCountRef.current = 0;
          simulationFrameRef.current = 0;

          onGameEvent?.({
            type: "launch",
            position: botRef.current.position,
            intensity: vec2.length(velocity) / 15,
          });
        }, thinkTime);
      } else {
        // Switch to player
        currentTurnRef.current = "player";
        phaseRef.current = "player-idle";
      }
    }, [tier, onGameEvent, handleWin]);

    // ──────────────────────────────────────────────────────────────────────
    // Physics Update
    // ──────────────────────────────────────────────────────────────────────

    const updatePhysics = useCallback(() => {
      const player = playerRef.current;
      const bot = botRef.current;
      const bounds: WorldBounds = canvasSize;

      // Update both chuns (no gravity - pure 2D sliding)
      const playerEvents = updateChunPhysics(player, bounds, false);
      const botEvents = updateChunPhysics(bot, bounds, false);

      // Emit events
      [...playerEvents, ...botEvents].forEach((e) => onGameEvent?.(e));

      // Circle-to-circle collision (exaggerated push, attacker advantage)
      const collision = resolveChunCollision(
        player,
        bot,
        lastAttackerRef.current,
      );

      if (collision.collided) {
        onGameEvent?.({
          type: "chun_collision",
          position: collision.impactPosition,
          intensity: collision.impactIntensity,
        });
        // Win is only evaluated after motion settles, not during collision
      }
    }, [canvasSize, onGameEvent]);

    // ──────────────────────────────────────────────────────────────────────
    // Rendering
    // ──────────────────────────────────────────────────────────────────────

    const drawBackground = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        const { width, height } = canvasSize;

        // Background
        ctx.fillStyle = COLORS.BACKGROUND;
        ctx.fillRect(0, 0, width, height);

        // Grid
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

    const drawTrail = useCallback(
      (ctx: CanvasRenderingContext2D, chun: Chun) => {
        const speed = vec2.length(chun.velocity);
        if (speed < 3) return; // Only show trail when moving fast

        // Simple trail line behind the chun
        const trailLength = Math.min(speed * 3, 60);
        const direction = vec2.normalize(chun.velocity);
        const trailStart = {
          x: chun.position.x - direction.x * trailLength,
          y: chun.position.y - direction.y * trailLength,
        };

        ctx.save();

        // Gradient trail
        const gradient = ctx.createLinearGradient(
          trailStart.x,
          trailStart.y,
          chun.position.x,
          chun.position.y,
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(1, `${chun.color}88`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = chun.radius * 0.6;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(trailStart.x, trailStart.y);
        ctx.lineTo(chun.position.x, chun.position.y);
        ctx.stroke();

        ctx.restore();
      },
      [],
    );

    const drawChun = useCallback(
      (ctx: CanvasRenderingContext2D, chun: Chun, highlight: boolean) => {
        ctx.save();

        const { scaleX, scaleY } = getSquashScale(chun);
        const { stretchX, stretchY, angle } = getMotionStretch(chun);

        // Combine scales
        const finalScaleX = scaleX * stretchX;
        const finalScaleY = scaleY * stretchY;

        ctx.translate(chun.position.x, chun.position.y);

        // Rotate for motion stretch
        if (Math.abs(angle) > 0.1 && vec2.length(chun.velocity) > 5) {
          ctx.rotate(angle);
        }

        ctx.scale(finalScaleX, finalScaleY);

        // Shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        // Main circle - hollow ring (dây chun)
        ctx.beginPath();
        ctx.arc(0, 0, chun.radius, 0, Math.PI * 2);
        ctx.strokeStyle = chun.color;
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.shadowColor = "transparent";

        // Highlight ring
        if (highlight) {
          ctx.strokeStyle = "#fdc700";
          ctx.lineWidth = 4;
          ctx.stroke();

          // Glow
          ctx.shadowColor = "#fdc700";
          ctx.shadowBlur = 15;
          ctx.stroke();
          ctx.shadowColor = "transparent";
        }

        // Border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Reset transform for label
        ctx.setTransform(1, 0, 0, 1, chun.position.x, chun.position.y);

        // Label
        ctx.fillStyle = "white";
        ctx.font = "bold 13px 'Inter', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(chun.label, 0, 0);

        ctx.restore();
      },
      [],
    );

    const drawAimLine = useCallback((ctx: CanvasRenderingContext2D) => {
      const drag = dragRef.current;
      if (!drag.isDragging) return;

      const player = playerRef.current;
      const info = getPullInfo(player.position, drag.currentPos);

      if (info.power < 0.05) return;

      ctx.save();

      // Pull line (from chun to clamped drag position)
      ctx.strokeStyle = COLORS.AIM_LINE_WEAK;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(player.position.x, player.position.y);
      ctx.lineTo(info.clampedEnd.x, info.clampedEnd.y);
      ctx.stroke();

      // Projection line (where shot will go)
      ctx.strokeStyle = COLORS.AIM_LINE;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(player.position.x, player.position.y);
      ctx.lineTo(info.projectedEnd.x, info.projectedEnd.y);
      ctx.stroke();

      // Arrow head
      ctx.setLineDash([]);
      const arrowSize = 14;
      const arrowAngle = Math.atan2(
        info.projectedEnd.y - player.position.y,
        info.projectedEnd.x - player.position.x,
      );
      ctx.beginPath();
      ctx.moveTo(info.projectedEnd.x, info.projectedEnd.y);
      ctx.lineTo(
        info.projectedEnd.x - arrowSize * Math.cos(arrowAngle - Math.PI / 6),
        info.projectedEnd.y - arrowSize * Math.sin(arrowAngle - Math.PI / 6),
      );
      ctx.moveTo(info.projectedEnd.x, info.projectedEnd.y);
      ctx.lineTo(
        info.projectedEnd.x - arrowSize * Math.cos(arrowAngle + Math.PI / 6),
        info.projectedEnd.y - arrowSize * Math.sin(arrowAngle + Math.PI / 6),
      );
      ctx.stroke();

      // Power bar
      const barWidth = 70;
      const barHeight = 10;
      const barX = player.position.x - barWidth / 2;
      const barY = player.position.y + player.radius + 25;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 4);
      ctx.fill();
      ctx.stroke();

      // Power fill
      const powerColor = getPowerColor(info.power);
      const gradient = ctx.createLinearGradient(
        barX,
        barY,
        barX + barWidth,
        barY,
      );
      gradient.addColorStop(0, powerColor);
      gradient.addColorStop(1, powerColor);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * info.power, barHeight, 3);
      ctx.fill();

      ctx.restore();
    }, []);

    const drawPhaseIndicator = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        const phase = phaseRef.current;
        const turn = currentTurnRef.current;
        let text = "";
        let bgColor = "rgba(0, 0, 0, 0.7)";
        let emoji = "";

        switch (phase) {
          case "waiting":
            text = "Sẵn sàng...";
            emoji = "⏳";
            break;
          case "player-idle":
            text = "Lượt bạn - Kéo để bắn!";
            emoji = "🎯";
            bgColor = "rgba(34, 139, 34, 0.85)";
            break;
          case "player-aiming":
            text = "Nhắm và thả...";
            emoji = "🎯";
            bgColor = "rgba(34, 139, 34, 0.85)";
            break;
          case "launch-delay":
          case "player-simulating":
            text = "Đang bay...";
            emoji = "💨";
            break;
          case "bot-thinking":
            text = "Bot đang suy nghĩ...";
            emoji = "🤖";
            bgColor = "rgba(200, 50, 50, 0.85)";
            break;
          case "bot-simulating":
            text = "Lượt Bot...";
            emoji = "🤖";
            bgColor = "rgba(200, 50, 50, 0.85)";
            break;
          case "settling":
            text = "Đang dừng...";
            emoji = "⏳";
            break;
          case "hit-stop":
          case "ended":
            if (roundResultRef.current === "win") {
              text = "THẮNG!";
              emoji = "🎉";
              bgColor = "rgba(34, 139, 34, 0.9)";
            } else if (roundResultRef.current === "lose") {
              text = "THUA!";
              emoji = "😢";
              bgColor = "rgba(200, 50, 50, 0.9)";
            } else {
              text = "HÒA";
              emoji = "🤝";
            }
            break;
        }

        ctx.save();
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasSize.width, 44);

        ctx.fillStyle = "white";
        ctx.font = "bold 17px 'Inter', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${emoji} ${text}`, canvasSize.width / 2, 22);
        ctx.restore();
      },
      [canvasSize],
    );

    const drawDebug = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        if (!debug) return;

        const player = playerRef.current;
        const bot = botRef.current;

        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, canvasSize.height - 90, 240, 90);

        ctx.fillStyle = "#00ff00";
        ctx.font = "11px monospace";
        ctx.textAlign = "left";

        const lines = [
          `Phase: ${phaseRef.current}`,
          `Turn: ${currentTurnRef.current} (${turnCountRef.current}/${PHYSICS_CONFIG.MAX_TURNS})`,
          `Player: (${player.position.x.toFixed(0)}, ${player.position.y.toFixed(0)}) v=${vec2.length(player.velocity).toFixed(2)}`,
          `Bot: (${bot.position.x.toFixed(0)}, ${bot.position.y.toFixed(0)}) v=${vec2.length(bot.velocity).toFixed(2)}`,
          `Settle: ${settleCountRef.current}/${PHYSICS_CONFIG.SETTLE_FRAMES_REQUIRED}`,
        ];

        lines.forEach((line, i) => {
          ctx.fillText(line, 8, canvasSize.height - 75 + i * 15);
        });

        ctx.restore();
      },
      [debug, canvasSize],
    );

    const render = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        // Apply camera shake
        const shake = cameraShakeRef.current;
        if (shake.intensity > 0) {
          shake.x = (Math.random() - 0.5) * shake.intensity;
          shake.y = (Math.random() - 0.5) * shake.intensity;
          shake.intensity *= 0.85; // Decay
          if (shake.intensity < 0.5) shake.intensity = 0;
        }

        ctx.save();
        if (shake.intensity > 0) {
          ctx.translate(shake.x, shake.y);
        }

        drawBackground(ctx);

        // Trails
        drawTrail(ctx, playerRef.current);
        drawTrail(ctx, botRef.current);

        // Chuns
        const highlightPlayer =
          phaseRef.current === "player-idle" ||
          phaseRef.current === "player-aiming";
        const highlightBot =
          phaseRef.current === "bot-thinking" ||
          phaseRef.current === "bot-simulating";

        drawChun(ctx, botRef.current, highlightBot);
        drawChun(ctx, playerRef.current, highlightPlayer);

        drawAimLine(ctx);

        ctx.restore();

        // Phase indicator without shake
        drawPhaseIndicator(ctx);
        drawDebug(ctx);
      },
      [
        drawBackground,
        drawTrail,
        drawChun,
        drawAimLine,
        drawPhaseIndicator,
        drawDebug,
      ],
    );

    // ──────────────────────────────────────────────────────────────────────
    // Game Loop
    // ──────────────────────────────────────────────────────────────────────

    const gameLoop = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const phase = phaseRef.current;

      // ─────────────────────────────────────────────────────────────────────
      // HIT-STOP (juice freeze frames)
      // ─────────────────────────────────────────────────────────────────────
      if (phase === "hit-stop") {
        hitStopFramesRef.current--;
        if (hitStopFramesRef.current <= 0) {
          phaseRef.current = "ended";
          onRoundEnd?.(roundResultRef.current || "draw");
        }
        render(ctx);
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // ─────────────────────────────────────────────────────────────────────
      // LAUNCH DELAY (juice snap feeling)
      // ─────────────────────────────────────────────────────────────────────
      if (phase === "launch-delay") {
        launchDelayFramesRef.current--;
        if (launchDelayFramesRef.current <= 0) {
          // Apply the pending velocity
          if (pendingLaunchVelocityRef.current) {
            playerRef.current.velocity = pendingLaunchVelocityRef.current;
            pendingLaunchVelocityRef.current = null;
          }
          phaseRef.current = "player-simulating";
          settleCountRef.current = 0;
          simulationFrameRef.current = 0;
        }
        render(ctx);
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // ─────────────────────────────────────────────────────────────────────
      // PHYSICS SIMULATION
      // ─────────────────────────────────────────────────────────────────────
      if (
        phase === "player-simulating" ||
        phase === "bot-simulating" ||
        phase === "settling"
      ) {
        simulationFrameRef.current++;

        // Safety: force settle after max frames
        if (simulationFrameRef.current > PHYSICS_CONFIG.MAX_SIMULATION_FRAMES) {
          const settled = checkSettledWin(
            playerRef.current,
            botRef.current,
            lastAttackerRef.current,
          );
          handleWin(settled);
          render(ctx);
          animationRef.current = requestAnimationFrame(gameLoop);
          return;
        }

        updatePhysics();

        // Check if round already ended (stomp)
        if (phaseRef.current === "hit-stop" || phaseRef.current === "ended") {
          render(ctx);
          animationRef.current = requestAnimationFrame(gameLoop);
          return;
        }

        // Check if settled
        if (areBothSettled(playerRef.current, botRef.current)) {
          settleCountRef.current++;

          if (settleCountRef.current >= PHYSICS_CONFIG.SETTLE_FRAMES_REQUIRED) {
            // Check win condition (Y-position based, attacker wins ties)
            const settled = checkSettledWin(
              playerRef.current,
              botRef.current,
              lastAttackerRef.current,
            );
            console.log(
              "[Game] Settled check:",
              settled,
              "Phase:",
              phaseRef.current,
              "Turn:",
              currentTurnRef.current,
            );
            if (settled !== "none") {
              handleWin(settled);
            } else {
              // No winner yet, switch turn
              console.log("[Game] Switching turn...");
              onGameEvent?.({
                type: "settled",
                position: playerRef.current.position,
                intensity: 0.3,
              });
              switchTurn();
            }
          } else {
            phaseRef.current = "settling";
          }
        } else {
          settleCountRef.current = 0;
          // Stay in current simulating phase
        }
      }

      // Render
      render(ctx);

      // Continue loop
      animationRef.current = requestAnimationFrame(gameLoop);
    }, [updatePhysics, handleWin, switchTurn, render, onRoundEnd, onGameEvent]);

    // Start game loop
    useEffect(() => {
      animationRef.current = requestAnimationFrame(gameLoop);
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [gameLoop]);

    // Cleanup bot timer
    useEffect(() => {
      return () => {
        if (botTimerRef.current) {
          clearTimeout(botTimerRef.current);
        }
        if (hitStopTimerRef.current) {
          clearTimeout(hitStopTimerRef.current);
        }
      };
    }, []);

    // ──────────────────────────────────────────────────────────────────────
    // Input Handlers
    // ──────────────────────────────────────────────────────────────────────

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !enabled) return;
        if (phaseRef.current !== "player-idle") return;

        const pos = getCanvasPosition(canvas, e.clientX, e.clientY);
        const player = playerRef.current;

        if (isInsideChun(pos, player)) {
          dragRef.current = {
            isDragging: true,
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

        dragRef.current.currentPos = getCanvasPosition(
          canvas,
          e.clientX,
          e.clientY,
        );
      },
      [],
    );

    const handlePointerUp = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !dragRef.current.isDragging) return;

        const player = playerRef.current;
        const { velocity, power } = calculateLaunchVelocity(
          player.position,
          dragRef.current.currentPos,
        );

        dragRef.current.isDragging = false;
        canvas.releasePointerCapture(e.pointerId);

        if (power > 0) {
          // JUICE: Launch delay for snap feeling
          pendingLaunchVelocityRef.current = velocity;
          launchDelayFramesRef.current = PHYSICS_CONFIG.LAUNCH_DELAY_FRAMES;
          phaseRef.current = "launch-delay";
          lastAttackerRef.current = "a";

          onGameEvent?.({
            type: "launch",
            position: player.position,
            intensity: power,
          });
        } else {
          phaseRef.current = "player-idle";
        }
      },
      [onGameEvent],
    );

    const handlePointerCancel = useCallback(() => {
      dragRef.current.isDragging = false;
      if (phaseRef.current === "player-aiming") {
        phaseRef.current = "player-idle";
      }
    }, []);

    // ──────────────────────────────────────────────────────────────────────
    // Imperative Handle
    // ──────────────────────────────────────────────────────────────────────

    useImperativeHandle(
      ref,
      () => ({
        resetGame,
        startRound,
        getPhase: () => phaseRef.current,
      }),
      [resetGame, startRound],
    );

    // ──────────────────────────────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────────────────────────────

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

export default JuicyGameCanvas;
