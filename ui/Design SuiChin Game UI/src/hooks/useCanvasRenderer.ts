// Hook for Canvas2D rendering

import { useRef, useEffect, useCallback } from "react";
import type { GameState, Vector2D } from "@/game/types";
import {
  renderFrame,
  DEFAULT_RENDER_CONFIG,
  type RenderConfig,
} from "@/game/renderer";

interface UseCanvasRendererOptions {
  width: number;
  height: number;
  config?: Partial<RenderConfig>;
}

interface AimInfo {
  isDragging: boolean;
  startPos: Vector2D;
  currentPos: Vector2D;
}

interface UseCanvasRendererReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  render: (gameState: GameState, aimInfo: AimInfo | null) => void;
  clear: () => void;
}

export function useCanvasRenderer(
  options: UseCanvasRendererOptions,
): UseCanvasRendererReturn {
  const { width, height, config } = options;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderConfig = { ...DEFAULT_RENDER_CONFIG, ...config };

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
  }, [width, height]);

  const render = useCallback(
    (gameState: GameState, aimInfo: AimInfo | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      renderFrame(ctx, gameState, aimInfo, renderConfig);
    },
    [renderConfig],
  );

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
  }, [width, height]);

  return {
    canvasRef,
    render,
    clear,
  };
}
