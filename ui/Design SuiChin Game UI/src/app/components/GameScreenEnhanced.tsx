// GameScreenEnhanced - Game screen with session integration and GameCanvas
// This component replaces the canvas portion of GameScreen with the new GameCanvas

import { useRef, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Trophy, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GameCanvas, type GameCanvasHandle, type RoundResult } from "@/game";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";

interface GameScreenEnhancedProps {
  onExit: () => void;
}

type ScreenState = "select" | "playing" | "result";

export default function GameScreenEnhanced({
  onExit,
}: GameScreenEnhancedProps) {
  const gameCanvasRef = useRef<GameCanvasHandle>(null);
  const [screenState, setScreenState] = useState<ScreenState>("select");
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);

  // Hooks
  const { profile, updateProfile } = useProfile();
  const {
    session,
    isActive,
    tier1,
    tier2,
    tier3,
    currentStreak,
    maxStreak,
    chosenTier,
    startSession,
    chooseTier,
    clearTier,
    applyResult,
    exitSession,
    canChooseTier,
  } = useSession();

  // Start session when component mounts if not already active
  useEffect(() => {
    if (profile && !isActive) {
      startSession(profile);
    }
  }, [profile, isActive, startSession]);

  // Computed values
  const totalPoints = tier1 * 1 + tier2 * 2 + tier3 * 3;

  const getTierEmoji = (tier: number) => {
    if (tier === 1) return "🥉";
    if (tier === 2) return "🥈";
    return "🥇";
  };

  const getTierName = (tier: number) => {
    if (tier === 1) return "Tier 1 (Dễ)";
    if (tier === 2) return "Tier 2 (Trung Bình)";
    return "Tier 3 (Khó)";
  };

  // Handlers
  const handleStartMatch = useCallback(
    (tier: 1 | 2 | 3) => {
      if (!canChooseTier(tier)) return;

      chooseTier(tier);
      setScreenState("playing");
      setLastResult(null);

      // Reset game canvas
      setTimeout(() => {
        gameCanvasRef.current?.resetGame();
      }, 50);
    },
    [canChooseTier, chooseTier],
  );

  const handleRoundEnd = useCallback(
    (result: RoundResult) => {
      setLastResult(result);

      // Apply result to session
      if (chosenTier) {
        const matchResult = result === "win" ? "WIN" : "LOSE";
        applyResult(matchResult, chosenTier);
      }

      setScreenState("result");
    },
    [chosenTier, applyResult],
  );

  const handlePlayAgain = useCallback(() => {
    clearTier();
    setScreenState("select");
    setLastResult(null);
  }, [clearTier]);

  const handleExit = useCallback(() => {
    if (profile) {
      // Commit session to profile - useProfile auto-saves
      const updatedProfile = exitSession(profile);
      updateProfile(updatedProfile);
    }
    onExit();
  }, [profile, exitSession, updateProfile, onExit]);

  // Don't render until profile and session are ready
  if (!profile || !isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg flex items-center justify-between">
          <button
            onClick={handleExit}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="size-5" />
            Thoát & Lưu
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🥉</span>
              <span className="font-bold">{tier1}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🥈</span>
              <span className="font-bold">{tier2}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🥇</span>
              <span className="font-bold">{tier3}</span>
            </div>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-orange-500" />
              <span className="font-bold text-orange-500">{currentStreak}</span>
            </div>
            <div className="text-sm text-gray-500">(max: {maxStreak})</div>
          </div>
        </div>

        {/* Tier Selection */}
        {screenState === "select" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-xl"
          >
            <h2 className="font-bold text-[32px] text-center mb-2">
              Chọn Chun Để Đặt Cược
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Thắng: +1 chun | Thua: -1 chun
            </p>

            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              {/* Tier 1 */}
              <button
                onClick={() => handleStartMatch(1)}
                disabled={!canChooseTier(1)}
                className={`p-8 rounded-2xl border-4 transition-all ${
                  canChooseTier(1)
                    ? "border-orange-300 bg-orange-50 hover:bg-orange-100 hover:scale-105"
                    : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="text-[64px] mb-4">🥉</div>
                <div className="font-bold text-[20px] mb-2">Tier 1</div>
                <div className="text-sm text-gray-500 mb-2">Bot Dễ</div>
                <div className="text-gray-600">Có: {tier1}</div>
              </button>

              {/* Tier 2 */}
              <button
                onClick={() => handleStartMatch(2)}
                disabled={!canChooseTier(2)}
                className={`p-8 rounded-2xl border-4 transition-all ${
                  canChooseTier(2)
                    ? "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:scale-105"
                    : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="text-[64px] mb-4">🥈</div>
                <div className="font-bold text-[20px] mb-2">Tier 2</div>
                <div className="text-sm text-gray-500 mb-2">Bot Trung Bình</div>
                <div className="text-gray-600">Có: {tier2}</div>
              </button>

              {/* Tier 3 */}
              <button
                onClick={() => handleStartMatch(3)}
                disabled={!canChooseTier(3)}
                className={`p-8 rounded-2xl border-4 transition-all ${
                  canChooseTier(3)
                    ? "border-yellow-300 bg-yellow-50 hover:bg-yellow-100 hover:scale-105"
                    : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="text-[64px] mb-4">🥇</div>
                <div className="font-bold text-[20px] mb-2">Tier 3</div>
                <div className="text-sm text-gray-500 mb-2">Bot Khó</div>
                <div className="text-gray-600">Có: {tier3}</div>
              </button>
            </div>

            {/* No chuns warning */}
            {tier1 === 0 && tier2 === 0 && tier3 === 0 && (
              <div className="mt-8 text-center">
                <p className="text-red-500 font-medium">
                  Bạn không còn chun nào! Hãy nhận từ Faucet hoặc Mint thêm.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Game Playing */}
        {screenState === "playing" && chosenTier && (
          <div className="bg-white rounded-2xl p-4 shadow-xl">
            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-3 mb-4 flex items-center justify-between">
              <p className="text-[14px] text-gray-700">
                <strong>Hướng dẫn:</strong> Kéo chun của bạn và thả để búng. Mục
                tiêu: Đè chun lên chun bot!
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[20px]">{getTierEmoji(chosenTier)}</span>
                <span className="font-medium">{getTierName(chosenTier)}</span>
              </div>
            </div>

            {/* Game Canvas */}
            <div className="border-4 border-gray-300 rounded-xl overflow-hidden h-[500px]">
              <GameCanvas
                ref={gameCanvasRef}
                tier={chosenTier}
                enabled={true}
                onRoundEnd={handleRoundEnd}
                debug={false}
              />
            </div>
          </div>
        )}

        {/* Result Screen */}
        {screenState === "result" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-12 shadow-xl text-center"
            >
              {lastResult === "win" ? (
                <>
                  <div className="text-[80px] mb-4">🎉</div>
                  <h2 className="font-bold text-[48px] text-green-600 mb-4">
                    THẮNG!
                  </h2>
                  <p className="text-[20px] text-gray-700 mb-2">
                    +1 chun {chosenTier && getTierEmoji(chosenTier)}
                  </p>
                  <p className="text-[18px] text-orange-500 mb-8">
                    Streak: {currentStreak}
                  </p>
                </>
              ) : lastResult === "lose" ? (
                <>
                  <div className="text-[80px] mb-4">😢</div>
                  <h2 className="font-bold text-[48px] text-red-600 mb-4">
                    THUA!
                  </h2>
                  <p className="text-[20px] text-gray-700 mb-2">
                    -1 chun {chosenTier && getTierEmoji(chosenTier)}
                  </p>
                  <p className="text-[18px] text-gray-500 mb-8">
                    Streak reset về 0
                  </p>
                </>
              ) : (
                <>
                  <div className="text-[80px] mb-4">🤝</div>
                  <h2 className="font-bold text-[48px] text-gray-600 mb-4">
                    HÒA!
                  </h2>
                  <p className="text-[20px] text-gray-700 mb-8">
                    Không có thay đổi
                  </p>
                </>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handlePlayAgain}
                  className="bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-[18px] hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="size-5" />
                  Chơi Tiếp
                </button>
                <button
                  onClick={handleExit}
                  className="bg-gray-200 text-gray-700 px-8 py-4 rounded-xl font-bold text-[18px] hover:bg-gray-300 transition-colors"
                >
                  Thoát
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
