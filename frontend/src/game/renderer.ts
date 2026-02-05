
import type { Chun, GameBoard, TurnPhase, Vector2D, GameState } from "./types";
import { vec2 } from "./physics";

export interface RenderConfig {
  gridSize: number;
  gridColor: string;
  backgroundColor: string;
  playerColor: string;
  botColor: string;
  aimLineColor: string;
  aimLineWidth: number;
  showDebug: boolean;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  gridSize: 40,
  gridColor: "#364153",
  backgroundColor: "#1e2939",
  playerColor: "#fdc700",
  botColor: "#ef4444",
  aimLineColor: "rgba(255, 255, 255, 0.6)",
  aimLineWidth: 3,
  showDebug: false,
};

const TIER_COLORS: Record<number, string> = {
  1: "#ff8904",
  2: "#99a1af",
  3: "#fdc700",
};

export function getTierColor(tier: number): string {
  return TIER_COLORS[tier] || TIER_COLORS[1];
}

/**
 * Clear and draw background
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  board: GameBoard,
  config: RenderConfig,
): void {
  // Background
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, board.width, board.height);

  // Grid
  ctx.strokeStyle = config.gridColor;
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= board.width; x += config.gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, board.height);
    ctx.stroke();
  }

  for (let y = 0; y <= board.height; y += config.gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(board.width, y);
    ctx.stroke();
  }
}

/**
 * Draw a chun (ring/donut shape - vòng tròn)
 */
export function drawChun(
  ctx: CanvasRenderingContext2D,
  chun: Chun,
  isHighlighted: boolean = false,
): void {
  ctx.save();

  // Shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  // Outer circle (filled)
  ctx.beginPath();
  ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
  ctx.fillStyle = chun.color;
  ctx.fill();

  // Inner circle (hole - tạo vòng mỏng như ảnh)
  const holeRadius = chun.radius * 0.85; // 85% - viền mỏng
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(chun.position.x, chun.position.y, holeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Add 3D gradient to ring
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
  ctx.arc(chun.position.x, chun.position.y, holeRadius, 0, Math.PI * 2, true); // Subtract hole
  ctx.fillStyle = gradient;
  ctx.fill('evenodd');

  // Highlight ring
  if (isHighlighted) {
    ctx.strokeStyle = "#fdc700";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(chun.position.x, chun.position.y, chun.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Pulse effect
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

  // Label on the ring
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

/**
 * Draw aim line during player drag
 */
export function drawAimLine(
  ctx: CanvasRenderingContext2D,
  startPos: Vector2D,
  currentPos: Vector2D,
  maxPower: number,
  config: RenderConfig,
): void {
  const direction = vec2.sub(currentPos, startPos);
  const power = Math.min(vec2.length(direction), maxPower * 3);
  const normalizedPower = power / (maxPower * 3);

  ctx.save();

  // Draw projected path (dotted line in opposite direction)
  const launchDirection = vec2.scale(vec2.normalize(direction), -1);
  const projectedEnd = vec2.add(
    startPos,
    vec2.scale(launchDirection, power * 2),
  );

  ctx.strokeStyle = config.aimLineColor;
  ctx.lineWidth = config.aimLineWidth;
  ctx.setLineDash([10, 8]);

  ctx.beginPath();
  ctx.moveTo(startPos.x, startPos.y);
  ctx.lineTo(projectedEnd.x, projectedEnd.y);
  ctx.stroke();

  // Arrow head
  const arrowSize = 12;
  const angle = Math.atan2(
    projectedEnd.y - startPos.y,
    projectedEnd.x - startPos.x,
  );

  ctx.setLineDash([]);
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

  // Power indicator bar
  const barWidth = 60;
  const barHeight = 8;
  const barX = startPos.x - barWidth / 2;
  const barY = startPos.y + 50;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Power fill
  const powerColor =
    normalizedPower < 0.5
      ? `rgb(${Math.floor(normalizedPower * 2 * 255)}, 255, 0)`
      : `rgb(255, ${Math.floor((1 - (normalizedPower - 0.5) * 2) * 255)}, 0)`;
  ctx.fillStyle = powerColor;
  ctx.fillRect(barX, barY, barWidth * normalizedPower, barHeight);

  // Border
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.restore();
}

/**
 * Draw turn indicator
 */
export function drawTurnIndicator(
  ctx: CanvasRenderingContext2D,
  board: GameBoard,
  turnPhase: TurnPhase,
  currentTurn: "player" | "bot",
): void {
  ctx.save();

  const text =
    turnPhase === "player-aim"
      ? "🎯 Lượt của bạn - Kéo chun để bắn!"
      : turnPhase === "bot-aim"
        ? "🤖 Bot đang suy nghĩ..."
        : turnPhase === "player-flick" || turnPhase === "bot-flick"
          ? "⏳ Đang di chuyển..."
          : turnPhase === "round-end"
            ? "🏁 Kết thúc!"
            : "";

  if (!text) {
    ctx.restore();
    return;
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, board.width, 40);

  ctx.fillStyle = "white";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, board.width / 2, 20);

  ctx.restore();
}

/**
 * Draw match result overlay
 */
export function drawResultOverlay(
  ctx: CanvasRenderingContext2D,
  board: GameBoard,
  result: "win" | "lose" | "draw",
): void {
  ctx.save();

  // Darken background
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(0, 0, board.width, board.height);

  // Result text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const emoji = result === "win" ? "🎉" : result === "lose" ? "😢" : "🤝";
  const text =
    result === "win" ? "THẮNG!" : result === "lose" ? "THUA!" : "HÒA!";
  const color =
    result === "win" ? "#22c55e" : result === "lose" ? "#ef4444" : "#f59e0b";

  // Emoji
  ctx.font = "80px Arial";
  ctx.fillText(emoji, board.width / 2, board.height / 2 - 50);

  // Main text
  ctx.font = "bold 48px Arial, sans-serif";
  ctx.fillStyle = color;
  ctx.fillText(text, board.width / 2, board.height / 2 + 40);

  ctx.restore();
}

/**
 * Draw full game frame
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  aimInfo: {
    isDragging: boolean;
    startPos: Vector2D;
    currentPos: Vector2D;
  } | null,
  config: RenderConfig = DEFAULT_RENDER_CONFIG,
): void {
  const { board, playerChun, botChun, turnPhase, currentTurn, matchResult } =
    gameState;

  // Clear and draw background
  drawBackground(ctx, board, config);

  // Draw bot chun
  drawChun(ctx, botChun, currentTurn === "bot");

  // Draw player chun
  drawChun(ctx, playerChun, currentTurn === "player");

  // Draw aim line if player is aiming
  if (aimInfo && aimInfo.isDragging && turnPhase === "player-aim") {
    drawAimLine(
      ctx,
      aimInfo.startPos,
      aimInfo.currentPos,
      gameState.board.friction * 30,
      config,
    );
  }

  // Draw turn indicator
  if (!matchResult) {
    drawTurnIndicator(ctx, board, turnPhase, currentTurn);
  }

  // Draw result overlay
  if (matchResult && matchResult !== null) {
    drawResultOverlay(ctx, board, matchResult);
  }
}
