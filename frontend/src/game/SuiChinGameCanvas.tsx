// SuiChin Game Canvas - Playable game component with Canvas2D rendering

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameEngine } from "@/hooks/useGameEngine";
import { useCanvasRenderer } from "@/hooks/useCanvasRenderer";
import { useDragInput } from "@/hooks/useDragInput";
import type { MatchResult, GameConfig } from "@/game/types";
import { DEFAULT_GAME_CONFIG } from "@/game/types";

interface SuiChinGameCanvasProps {
  selectedTier: number;
  onMatchEnd: (result: "win" | "lose") => void;
  onForfeit: () => void;
  config?: Partial<GameConfig>;
}

export default function SuiChinGameCanvas({
  selectedTier,
  onMatchEnd,
  onForfeit,
  config = {},
}: SuiChinGameCanvasProps) {
  const [showResult, setShowResult] = useState(false);
  const [finalResult, setFinalResult] = useState<MatchResult>(null);

  const gameConfig = { ...DEFAULT_GAME_CONFIG, ...config };

  const handleGameOver = useCallback(
    (result: MatchResult) => {
      setFinalResult(result);
      setShowResult(true);

      // Delay before calling onMatchEnd to show the result
      setTimeout(() => {
        if (result === "win" || result === "lose") {
          onMatchEnd(result);
        } else if (result === "draw") {
          // Treat draw as a loss for simplicity
          onMatchEnd("lose");
        }
      }, 2000);
    },
    [onMatchEnd],
  );

  const { gameState, isRunning, startGame, stopGame, playerFlick } =
    useGameEngine({
      selectedTier,
      config: gameConfig,
      onGameOver: handleGameOver,
    });

  const { canvasRef, render } = useCanvasRenderer({
    width: gameConfig.boardWidth,
    height: gameConfig.boardHeight,
  });

  const canPlayerAim = gameState?.turnPhase === "player-aim" && isRunning;

  const {
    isDragging,
    dragStart,
    dragCurrent,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDragInput({
    canvasRef,
    chunPosition: gameState?.playerChun.position ?? { x: 0, y: 0 },
    chunRadius: gameState?.playerChun.radius ?? 32,
    enabled: canPlayerAim,
    onFlick: playerFlick,
  });

  // Start game on mount
  useEffect(() => {
    startGame();
    return () => stopGame();
  }, [startGame, stopGame]);

  // Render loop
  useEffect(() => {
    if (!gameState) return;

    const aimInfo = isDragging
      ? {
          isDragging,
          startPos: dragStart,
          currentPos: dragCurrent,
        }
      : null;

    render(gameState, aimInfo);
  }, [gameState, isDragging, dragStart, dragCurrent, render]);

  const getTierName = () => {
    if (selectedTier === 1) return "Tier 1 Match";
    if (selectedTier === 2) return "Tier 2 Match";
    return "Tier 3 Match";
  };

  return (
    <div className="min-h-screen bg-[#101828] flex items-center justify-center p-6">
      <div className="bg-[#1e2939] rounded-3xl overflow-hidden max-w-5xl w-full shadow-2xl">
        {/* Header */}
        <div className="bg-[#1e2939] border-b border-[#364153] px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-[20px] text-white">{getTierName()}</h2>
          <button
            onClick={onForfeit}
            className="bg-[rgba(130,24,26,0.5)] border border-[#9f0712] text-[#ff6467] px-4 py-2 rounded-lg hover:bg-[rgba(130,24,26,0.7)] transition-colors"
          >
            Thoát (Chịu Thua)
          </button>
        </div>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={gameConfig.boardWidth}
            height={gameConfig.boardHeight}
            className="w-full cursor-pointer touch-none"
            style={{ backgroundColor: "#1e2939" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          {/* Result Overlay */}
          <AnimatePresence>
            {showResult && finalResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/70 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="text-center"
                >
                  {finalResult === "win" ? (
                    <>
                      <div className="text-[100px] mb-4">🎉</div>
                      <h3 className="font-bold text-[60px] text-green-400">
                        THẮNG!
                      </h3>
                    </>
                  ) : finalResult === "lose" ? (
                    <>
                      <div className="text-[100px] mb-4">😢</div>
                      <h3 className="font-bold text-[60px] text-red-400">
                        THUA!
                      </h3>
                    </>
                  ) : (
                    <>
                      <div className="text-[100px] mb-4">🤝</div>
                      <h3 className="font-bold text-[60px] text-yellow-400">
                        HÒA!
                      </h3>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Instructions */}
        <div className="bg-[#1e2939] border-t border-[#364153] px-6 py-3">
          <p className="text-center text-[14px] text-gray-400">
            {gameState?.turnPhase === "player-aim"
              ? "🎯 Kéo chun của bạn và thả để búng!"
              : gameState?.turnPhase === "bot-aim"
                ? "🤖 Bot đang suy nghĩ..."
                : "⏳ Đang di chuyển..."}
          </p>
        </div>
      </div>
    </div>
  );
}
