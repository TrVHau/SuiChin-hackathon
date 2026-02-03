// ============================================================================
// JUICY MATCH SCREEN - Play with the new juicy physics!
// ============================================================================

import { useRef, useCallback, useState, useEffect } from "react";
import JuicyGameCanvas, {
  type JuicyGameCanvasHandle,
  type RoundResult,
} from "@/game/JuicyGameCanvas";
import { type GameEvent } from "@/game/juicy-physics";

interface JuicyMatchScreenProps {
  tier?: number;
  onExit?: () => void;
  onRoundComplete?: (result: RoundResult, tier: number) => void;
  debug?: boolean;
}

export default function JuicyMatchScreen({
  tier = 1,
  onExit,
  onRoundComplete,
  debug = false,
}: JuicyMatchScreenProps) {
  const gameRef = useRef<JuicyGameCanvasHandle>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [roundCount, setRoundCount] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  // Handle round end
  const handleRoundEnd = useCallback(
    (result: RoundResult) => {
      setRoundResult(result);
      setRoundCount((c) => c + 1);

      if (result === "win") {
        setWins((w) => w + 1);
      } else if (result === "lose") {
        setLosses((l) => l + 1);
      }

      onRoundComplete?.(result, tier);
    },
    [tier, onRoundComplete],
  );

  // Handle game events (for sound/haptics)
  const handleGameEvent = useCallback((event: GameEvent) => {
    // Could add sound effects here based on event.type
    // console.log("Game event:", event.type, event.intensity);
  }, []);

  // Play again
  const handlePlayAgain = useCallback(() => {
    setRoundResult(null);
    gameRef.current?.startRound();
  }, []);

  // Tier display
  const getTierInfo = (t: number) => {
    switch (t) {
      case 1:
        return { name: "Đồng", color: "#ff8904", emoji: "🥉" };
      case 2:
        return { name: "Bạc", color: "#c0c7d4", emoji: "🥈" };
      case 3:
        return { name: "Vàng", color: "#fdc700", emoji: "🥇" };
      default:
        return { name: "Đồng", color: "#ff8904", emoji: "🥉" };
    }
  };

  const tierInfo = getTierInfo(tier);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Thoát
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xl">{tierInfo.emoji}</span>
          <span className="font-bold text-lg" style={{ color: tierInfo.color }}>
            Tier {tier} - {tierInfo.name}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-400">Thắng: {wins}</span>
          <span className="text-red-400">Thua: {losses}</span>
          <span className="text-gray-400">Ván: {roundCount}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative">
        <JuicyGameCanvas
          ref={gameRef}
          tier={tier}
          onRoundEnd={handleRoundEnd}
          onGameEvent={handleGameEvent}
          debug={debug}
          enabled={roundResult === null}
        />

        {/* Round Result Overlay */}
        {roundResult && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-8 text-center shadow-2xl border border-gray-700 animate-in fade-in zoom-in duration-300">
              <div className="text-6xl mb-4">
                {roundResult === "win"
                  ? "🎉"
                  : roundResult === "lose"
                    ? "😢"
                    : "🤝"}
              </div>
              <h2
                className="text-4xl font-bold mb-2"
                style={{
                  color:
                    roundResult === "win"
                      ? "#4ade80"
                      : roundResult === "lose"
                        ? "#ef4444"
                        : "#facc15",
                }}
              >
                {roundResult === "win"
                  ? "THẮNG!"
                  : roundResult === "lose"
                    ? "THUA!"
                    : "HÒA!"}
              </h2>
              <p className="text-gray-400 mb-6">
                {roundResult === "win"
                  ? "Tuyệt vời! Bạn đã đè bẹp đối thủ!"
                  : roundResult === "lose"
                    ? "Bot đã chiến thắng. Thử lại nhé!"
                    : "Trận đấu bất phân thắng bại!"}
              </p>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handlePlayAgain}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
                >
                  🔄 Chơi lại
                </button>
                <button
                  onClick={onExit}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-xl transition-colors"
                >
                  ↩️ Thoát
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
          <span>🎯 Kéo viên bi của bạn để bắn</span>
          <span>💥 Đè lên đối thủ để thắng</span>
          <span>⚡ Búng mạnh = bay xa hơn</span>
        </div>
      </div>
    </div>
  );
}
