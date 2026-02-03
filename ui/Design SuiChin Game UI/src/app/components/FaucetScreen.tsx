import { ArrowLeft } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

interface FaucetScreenProps {
  onBack: () => void;
  lastClaimTime: number;
  onClaim: (tier1: number, tier2: number, tier3: number) => void;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function FaucetScreen({
  onBack,
  lastClaimTime,
  onClaim,
}: FaucetScreenProps) {
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    tier1: number;
    tier2: number;
    tier3: number;
  } | null>(null);
  const [remainingTime, setRemainingTime] = useState("");
  const [claimableCount, setClaimableCount] = useState(0);

  // Calculate claimable chuns and remaining time
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const timePassed = now - lastClaimTime;

      // claimable = min(floor((now - faucet_last_claim) / (2 hours)), 10)
      const numChuns = Math.min(Math.floor(timePassed / TWO_HOURS_MS), 10);
      setClaimableCount(numChuns);

      if (numChuns === 0) {
        // Show remaining time until next chun
        const nextClaimAt = lastClaimTime + TWO_HOURS_MS;
        const remaining = Math.max(0, nextClaimAt - now);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor(
          (remaining % (60 * 60 * 1000)) / (60 * 1000),
        );
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
        setRemainingTime(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        );
      } else {
        setRemainingTime("");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lastClaimTime]);

  const handleClaim = useCallback(async () => {
    if (claimableCount === 0) return;

    setClaiming(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // For each claimable, random tier uniformly (1/2/3)
    const results = { tier1: 0, tier2: 0, tier3: 0 };
    for (let i = 0; i < claimableCount; i++) {
      const rand = Math.floor(Math.random() * 3); // 0, 1, 2
      if (rand === 0) results.tier1++;
      else if (rand === 1) results.tier2++;
      else results.tier3++;
    }

    // Call parent to update profile
    onClaim(results.tier1, results.tier2, results.tier3);

    setClaimResult(results);
    setClaiming(false);
  }, [claimableCount, onClaim]);

  const handleClose = () => {
    setClaimResult(null);
    onBack();
  };

  const canClaim = claimableCount > 0;

  return (
    <div className="min-h-screen bg-[#fff7ed]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={handleClose}
            className="bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ArrowLeft className="size-6 text-[#4a5565]" />
          </button>
          <h1 className="font-bold text-[30px] text-[#1e2939]">
            Xin Chun (Faucet)
          </h1>
        </div>

        {!claimResult ? (
          <div className="bg-white rounded-3xl shadow-2xl p-10">
            {/* Số chun có thể nhận */}
            <div className="text-center mb-6">
              <p className="font-bold text-[18px] text-[#6a7282] mb-4">
                Số Chun Có Thể Nhận
              </p>
              <p className="font-bold text-[96px] text-[#ff6900] leading-none mb-4">
                {claimableCount}
              </p>
              <p className="text-[16px] text-[#99a1af]">
                Công thức: 2 giờ = 1 chun (Tối đa 10)
              </p>
              {!canClaim && remainingTime && (
                <p className="text-[18px] text-[#f6339a] mt-4 font-bold">
                  ⏳ Chờ thêm: {remainingTime}
                </p>
              )}
            </div>

            {/* Claim Button */}
            <button
              onClick={handleClaim}
              disabled={!canClaim || claiming}
              className={`w-full h-[72px] rounded-2xl font-bold text-[24px] text-white shadow-xl transition-all ${
                canClaim && !claiming
                  ? "bg-gradient-to-r from-[#ff8904] to-[#f6339a] hover:shadow-2xl hover:scale-105"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {claiming ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="size-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang xin...
                </span>
              ) : canClaim ? (
                "XIN NGAY"
              ) : (
                "CHƯA ĐỦ THỜI GIAN"
              )}
            </button>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-2xl p-12 text-center"
            >
              <div className="text-[100px] mb-6">🎁</div>
              <h3 className="font-bold text-[36px] text-green-600 mb-8">
                Nhận thành công!
              </h3>

              <div className="flex items-center justify-center gap-8 mb-10">
                {claimResult.tier1 > 0 && (
                  <div className="bg-gradient-to-br from-orange-100 to-orange-200 px-8 py-6 rounded-2xl border-3 border-orange-400">
                    <div className="text-[48px] mb-2">🥉</div>
                    <div className="font-bold text-[32px] text-gray-900">
                      ×{claimResult.tier1}
                    </div>
                  </div>
                )}
                {claimResult.tier2 > 0 && (
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 px-8 py-6 rounded-2xl border-3 border-gray-400">
                    <div className="text-[48px] mb-2">🥈</div>
                    <div className="font-bold text-[32px] text-gray-900">
                      ×{claimResult.tier2}
                    </div>
                  </div>
                )}
                {claimResult.tier3 > 0 && (
                  <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 px-8 py-6 rounded-2xl border-3 border-yellow-400">
                    <div className="text-[48px] mb-2">🥇</div>
                    <div className="font-bold text-[32px] text-gray-900">
                      ×{claimResult.tier3}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleClose}
                className="bg-green-500 text-white px-10 py-4 rounded-xl font-bold text-[18px] hover:bg-green-600 transition-colors shadow-lg"
              >
                Đóng
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
