
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
  FLICK_CONFIG,
  createChun,
  dragToFlick,
  calculateFlickVelocity,
  updateChunPhysics,
  resolveChunCollision,
  areBothSettled,
  checkSettledWin,
  calculateBotFlick,
  getBotThinkTime,
  getPowerColor,
  getPowerZone,
  type Chun,
  type WinResult,
} from "./flick-physics";
import type { Vector2D } from "./types";


export type RoundResult = "win" | "lose" | "draw";
export type Turn = "player" | "bot";
export type GamePhase =
  | "idle"
  | "player-aiming"
  | "player-simulating"
  | "bot-thinking"
  | "bot-simulating"
  | "settling"
  | "hit-stop"
  | "ended";

export interface FlickGameCanvasProps {
  tier?: number;
  onRoundEnd?: (result: RoundResult) => void;
  debug?: boolean;
  enabled?: boolean;
}

export interface FlickGameCanvasHandle {
  resetGame: () => void;
  getPhase: () => GamePhase;
}


const COLORS = {
  BACKGROUND: "#1a1f2e",
  GRID: "#2a3142",
  PLAYER_T1: "#ff8904",
  PLAYER_T2: "#c0c7d4",
  PLAYER_T3: "#fdc700",
  BOT: "#ef4444",
  AIM_LINE: "rgba(255, 255, 255, 0.6)",
  TRAIL: "rgba(255, 255, 255, 0.2)",
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


const FlickGameCanvas = forwardRef<FlickGameCanvasHandle, FlickGameCanvasProps>(
  function FlickGameCanvas(
    { tier = 1, onRoundEnd, debug = false, enabled = true },
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
    const simulationFrameRef = useRef(0);
    const hitStopCountRef = useRef(0);
    const wasOvershootRef = useRef(false);
    const roundResultRef = useRef<RoundResult | null>(null);

    const playerRef = useRef<Chun>(
      createChun(200, 400, getTierColor(tier), "YOU"),
    );
    const botRef = useRef<Chun>(createChun(600, 100, COLORS.BOT, "BOT"));

    const dragRef = useRef({
      isDragging: false,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
    });

    const shakeRef = useRef({ x: 0, y: 0, intensity: 0 });

    const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    useEffect(() => {
      playerRef.current.color = getTierColor(tier);
    }, [tier]);


    const resetGame = useCallback(() => {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }

      phaseRef.current = "idle";
      currentTurnRef.current = "player";
      lastAttackerRef.current = null;
      settleCountRef.current = 0;
      simulationFrameRef.current = 0;
      hitStopCountRef.current = 0;
      wasOvershootRef.current = false;
      roundResultRef.current = null;

      playerRef.current = createChun(
        canvasSize.width * 0.25,
        canvasSize.height * 0.65,
        getTierColor(tier),
        "YOU",
      );
      botRef.current = createChun(
        canvasSize.width * 0.75,
        canvasSize.height * 0.35,
        COLORS.BOT,
        "BOT",
      );

      dragRef.current.isDragging = false;
      shakeRef.current = { x: 0, y: 0, intensity: 0 };
    }, [canvasSize, tier]);

    useEffect(() => {
      if (phaseRef.current === "idle") {
        resetGame();
      }
    }, []);

    const handleWin = useCallback(
      (winResult: WinResult) => {
        let result: RoundResult = "draw";
        if (winResult === "player_wins") result = "win";
        else if (winResult === "bot_wins") result = "lose";

        roundResultRef.current = result;

        if (winResult !== "none") {
          hitStopCountRef.current = FLICK_CONFIG.HIT_STOP_FRAMES;
          shakeRef.current.intensity = FLICK_CONFIG.CAMERA_SHAKE_INTENSITY;
          phaseRef.current = "hit-stop";
        } else {
          phaseRef.current = "ended";
          onRoundEnd?.(result);
        }
      },
      [onRoundEnd],
    );


    const switchTurn = useCallback(() => {
      if (currentTurnRef.current === "player") {
        currentTurnRef.current = "bot";
        phaseRef.current = "bot-thinking";

        botTimerRef.current = setTimeout(() => {
          if (phaseRef.current !== "bot-thinking") return;

          const flickInput = calculateBotFlick(
            botRef.current,
            playerRef.current,
            tier,
          );
          const flickResult = calculateFlickVelocity(flickInput);

          botRef.current.velocity = flickResult.velocity;
          wasOvershootRef.current = flickResult.wasOvershoot;
          lastAttackerRef.current = "bot";

          phaseRef.current = "bot-simulating";
          settleCountRef.current = 0;
          simulationFrameRef.current = 0;
        }, getBotThinkTime(tier));
      } else {
        currentTurnRef.current = "player";
        phaseRef.current = "idle";
        wasOvershootRef.current = false;
      }
    }, [tier]);


    const gameLoop = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const phase = phaseRef.current;
      const bounds = canvasSize;

      if (phase === "hit-stop") {
        hitStopCountRef.current--;
        if (hitStopCountRef.current <= 0) {
          phaseRef.current = "ended";
          onRoundEnd?.(roundResultRef.current || "draw");
        }
        render(ctx);
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (
        phase === "player-simulating" ||
        phase === "bot-simulating" ||
        phase === "settling"
      ) {
        simulationFrameRef.current++;

        if (simulationFrameRef.current > FLICK_CONFIG.MAX_SIMULATION_FRAMES) {
          const win = checkSettledWin(
            playerRef.current,
            botRef.current,
            lastAttackerRef.current,
          );
          handleWin(win);
          render(ctx);
          animationRef.current = requestAnimationFrame(gameLoop);
          return;
        }

        updateChunPhysics(playerRef.current, bounds, wasOvershootRef.current);
        updateChunPhysics(botRef.current, bounds, false);

        resolveChunCollision(playerRef.current, botRef.current);

        if (areBothSettled(playerRef.current, botRef.current)) {
          settleCountRef.current++;

          if (settleCountRef.current >= FLICK_CONFIG.SETTLE_FRAMES_REQUIRED) {
            const win = checkSettledWin(
              playerRef.current,
              botRef.current,
              lastAttackerRef.current,
            );

            if (win !== "none") {
              handleWin(win);
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
    }, [canvasSize, handleWin, switchTurn, onRoundEnd]);


    const render = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        const { width, height } = canvasSize;
        const shake = shakeRef.current;

        if (shake.intensity > 0) {
          shake.x = (Math.random() - 0.5) * shake.intensity;
          shake.y = (Math.random() - 0.5) * shake.intensity;
          shake.intensity *= 0.85;
          if (shake.intensity < 0.5) shake.intensity = 0;
        }

        ctx.save();
        if (shake.intensity > 0) {
          ctx.translate(shake.x, shake.y);
        }

        ctx.fillStyle = COLORS.BACKGROUND;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = COLORS.GRID;
        ctx.lineWidth = 0.5; 
        for (let x = 0; x <= width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y <= height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        drawTrail(ctx, playerRef.current);
        drawTrail(ctx, botRef.current);

        const highlightPlayer =
          phaseRef.current === "idle" || phaseRef.current === "player-aiming";
        const highlightBot =
          phaseRef.current === "bot-thinking" ||
          phaseRef.current === "bot-simulating";

        drawChun(ctx, botRef.current, highlightBot);
        drawChun(ctx, playerRef.current, highlightPlayer);

        if (dragRef.current.isDragging) {
          drawAimLine(ctx);
        }

        ctx.restore();

        drawPhaseIndicator(ctx, width);

        if (debug) {
          drawDebug(ctx, width, height);
        }
      },
      [canvasSize, debug],
    );

    const drawTrail = (ctx: CanvasRenderingContext2D, chun: Chun) => {
      if (chun.trailPositions.length < 2) return;

      ctx.save();
      ctx.strokeStyle = COLORS.TRAIL;
      ctx.lineWidth = chun.radius * 0.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(chun.position.x, chun.position.y);
      chun.trailPositions.forEach((pos, i) => {
        ctx.globalAlpha = 1 - i / chun.trailPositions.length;
        ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();
      ctx.restore();
    };

    const drawChun = (
      ctx: CanvasRenderingContext2D,
      chun: Chun,
      highlight: boolean,
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

      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "white";
      ctx.font = "bold 13px 'Inter', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(chun.label, chun.position.x, chun.position.y);

      ctx.restore();
    };

    const drawAimLine = (ctx: CanvasRenderingContext2D) => {
      const drag = dragRef.current;
      const player = playerRef.current;

      const pullVector = vec2.sub(drag.currentPos, drag.startPos);
      const pullLength = Math.min(
        vec2.length(pullVector),
        FLICK_CONFIG.MAX_PULL_LENGTH,
      );
      const power = pullLength / FLICK_CONFIG.MAX_PULL_LENGTH;

      if (power < 0.05) return;

      const direction =
        pullLength > 0
          ? vec2.normalize(vec2.scale(pullVector, -1))
          : { x: 0, y: 0 };
      const projectedEnd = vec2.add(
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

      ctx.fillStyle = getPowerColor(power);
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * power, barHeight, 3);
      ctx.fill();

      const zone = getPowerZone(power);
      ctx.fillStyle = "white";
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        zone === "optimal"
          ? "✓ OPTIMAL"
          : zone === "overshoot"
            ? "⚠ OVERSHOOT"
            : "",
        player.position.x,
        barY + barHeight + 14,
      );

      ctx.restore();
    };

    const drawPhaseIndicator = (
      ctx: CanvasRenderingContext2D,
      width: number,
    ) => {
      const phase = phaseRef.current;
      let text = "";
      let bgColor = "rgba(0, 0, 0, 0.7)";

      switch (phase) {
        case "idle":
          text = "🎯 Lượt bạn - Kéo chun để bắn!";
          bgColor = "rgba(34, 139, 34, 0.85)";
          break;
        case "player-aiming":
          text = "🎯 Thả để bắn...";
          bgColor = "rgba(34, 139, 34, 0.85)";
          break;
        case "player-simulating":
          text = "💨 Đang di chuyển...";
          break;
        case "bot-thinking":
          text = "🤖 Bot đang suy nghĩ...";
          bgColor = "rgba(200, 50, 50, 0.85)";
          break;
        case "bot-simulating":
          text = "🤖 Lượt Bot...";
          bgColor = "rgba(200, 50, 50, 0.85)";
          break;
        case "settling":
          text = "⏳ Đang dừng...";
          break;
        case "hit-stop":
        case "ended":
          if (roundResultRef.current === "win") {
            text = "🎉 THẮNG!";
            bgColor = "rgba(34, 139, 34, 0.9)";
          } else if (roundResultRef.current === "lose") {
            text = "😢 THUA!";
            bgColor = "rgba(200, 50, 50, 0.9)";
          } else {
            text = "🤝 HÒA";
          }
          break;
      }

      ctx.save();
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, 44);
      ctx.fillStyle = "white";
      ctx.font = "bold 17px 'Inter', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, width / 2, 22);
      ctx.restore();
    };

    const drawDebug = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) => {
      const player = playerRef.current;
      const bot = botRef.current;

      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, height - 90, 280, 90);

      ctx.fillStyle = "#00ff00";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";

      const dist = vec2.distance(player.position, bot.position);
      const overlap = dist < player.radius + bot.radius;

      const lines = [
        `Phase: ${phaseRef.current} | Turn: ${currentTurnRef.current}`,
        `Player: v=${vec2.length(player.velocity).toFixed(2)}`,
        `Bot: v=${vec2.length(bot.velocity).toFixed(2)}`,
        `Distance: ${dist.toFixed(0)} | Overlap: ${overlap}`,
        `Settle: ${settleCountRef.current}/${FLICK_CONFIG.SETTLE_FRAMES_REQUIRED}`,
      ];

      lines.forEach((line, i) => {
        ctx.fillText(line, 8, height - 75 + i * 15);
      });

      ctx.restore();
    };

    useEffect(() => {
      animationRef.current = requestAnimationFrame(gameLoop);
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }, [gameLoop]);

    useEffect(() => {
      return () => {
        if (botTimerRef.current) clearTimeout(botTimerRef.current);
      };
    }, []);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !enabled || phaseRef.current !== "idle") return;

        const pos = getCanvasPosition(canvas, e.clientX, e.clientY);

        if (isInsideChun(pos, playerRef.current)) {
          dragRef.current = {
            isDragging: true,
            startPos: pos,
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

        const drag = dragRef.current;
        const player = playerRef.current;

        const flickInput = dragToFlick(
          player.position,
          drag.startPos,
          drag.currentPos,
        );

        dragRef.current.isDragging = false;
        canvas.releasePointerCapture(e.pointerId);

        if (flickInput.power > 0.08) {
          const flickResult = calculateFlickVelocity(flickInput);
          player.velocity = flickResult.velocity;
          wasOvershootRef.current = flickResult.wasOvershoot;
          lastAttackerRef.current = "player";

          phaseRef.current = "player-simulating";
          settleCountRef.current = 0;
          simulationFrameRef.current = 0;
        } else {
          phaseRef.current = "idle";
        }
      },
      [],
    );

    const handlePointerCancel = useCallback(() => {
      dragRef.current.isDragging = false;
      if (phaseRef.current === "player-aiming") {
        phaseRef.current = "idle";
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        resetGame,
        getPhase: () => phaseRef.current,
      }),
      [resetGame],
    );

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

export default FlickGameCanvas;
