// Enhanced Match Screen wrapper that uses the new high-skill flick game engine
// Drop-in replacement for the original MatchScreen

import { useRef, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import FlickGameCanvas, {
  type FlickGameCanvasHandle,
  type RoundResult,
} from "@/game/FlickGameCanvas";

interface MatchScreenEnhancedProps {
  selectedTier: number;
  onMatchEnd: (result: "win" | "lose") => void;
  onForfeit: () => void;
}

/**
 * Enhanced MatchScreen using the high-skill flick physics engine
 * Features:
 * - Non-linear power curve with overshoot punishment
 * - Dynamic friction (high speed slides, low speed grips)
 * - Off-center flick causes lateral drift
 * - Win by overlap: attacker wins when landing on opponent
 * - Game feel: hit-stop, camera shake, motion trails
 */
export default function MatchScreenEnhanced({
  selectedTier,
  onMatchEnd,
  onForfeit,
}: MatchScreenEnhancedProps) {
  const gameCanvasRef = useRef<FlickGameCanvasHandle>(null);

  const handleRoundEnd = useCallback(
    (result: RoundResult) => {
      // Convert RoundResult to expected format
      if (result === "win") {
        onMatchEnd("win");
      } else if (result === "lose") {
        onMatchEnd("lose");
      } else {
        // Draw - treat as loss for simplicity
        onMatchEnd("lose");
      }
    },
    [onMatchEnd],
  );

  const getTierName = () => {
    if (selectedTier === 1) return "Tier 1 (Dễ)";
    if (selectedTier === 2) return "Tier 2 (Trung Bình)";
    return "Tier 3 (Khó)";
  };

  const getTierEmoji = () => {
    if (selectedTier === 1) return "🥉";
    if (selectedTier === 2) return "🥈";
    return "🥇";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg flex items-center justify-between">
          <button
            onClick={onForfeit}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="size-5" />
            Bỏ Cuộc (-1 Chun)
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[24px]">{getTierEmoji()}</span>
            <span className="font-bold text-lg">{getTierName()}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-[14px] text-gray-700 text-center">
              <strong>🎯 Cách chơi:</strong> Kéo và thả chun để búng. Ai đè được
              lên chun đối phương thì thắng! Lực vừa phải (OPTIMAL) là tốt nhất
              - kéo quá mạnh sẽ bị phạt.
            </p>
          </div>
        </div>

        {/* Game Canvas */}
        <div className="bg-white rounded-2xl p-4 shadow-xl">
          <div className="border-4 border-gray-300 rounded-xl overflow-hidden h-[500px]">
            <FlickGameCanvas
              ref={gameCanvasRef}
              tier={selectedTier}
              enabled={true}
              onRoundEnd={handleRoundEnd}
              debug={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
