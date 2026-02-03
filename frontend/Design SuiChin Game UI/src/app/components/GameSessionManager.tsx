import svgPaths from "@/imports/svg-dawdv5j9x6";
import { LogOut } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import BettingModal from "./BettingModal";

interface GameSessionManagerProps {
  sessionData: {
    tier1: number;
    tier2: number;
    tier3: number;
    currentStreak: number;
    deltaTier1: number;
    deltaTier2: number;
    deltaTier3: number;
  };
  onSelectTier: (tier: number) => void;
  onEndSession: () => void;
}

function FlameIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d={svgPaths.p2cf60600}
        stroke="#FF6900"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.66667"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d={svgPaths.p1775ffc0}
        stroke="#00A63E"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.66667"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M12.5 15L7.5 10L12.5 5"
        stroke="#00A63E"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.66667"
      />
    </svg>
  );
}

export default function GameSessionManager({
  sessionData,
  onSelectTier,
  onEndSession,
}: GameSessionManagerProps) {
  const [bettingModalOpen, setBettingModalOpen] = useState(false);
  const [selectedTierForBetting, setSelectedTierForBetting] = useState<
    number | null
  >(null);

  const canPlayTier = (tier: number) => {
    if (tier === 1) return sessionData.tier1 > 0;
    if (tier === 2) return sessionData.tier2 > 0;
    return sessionData.tier3 > 0;
  };

  const getTierCount = (tier: number) => {
    if (tier === 1) return sessionData.tier1;
    if (tier === 2) return sessionData.tier2;
    return sessionData.tier3;
  };

  const handleTierClick = (tier: number) => {
    if (!canPlayTier(tier)) return;
    setSelectedTierForBetting(tier);
    setBettingModalOpen(true);
  };

  const handleConfirmBet = () => {
    if (selectedTierForBetting) {
      onSelectTier(selectedTierForBetting);
      setBettingModalOpen(false);
      setSelectedTierForBetting(null);
    }
  };

  const handleCloseBettingModal = () => {
    setBettingModalOpen(false);
    setSelectedTierForBetting(null);
  };

  return (
    <div className="min-h-screen bg-[#eef2ff] py-10">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-bold text-[30px] text-[#1e2939]">Game Session</h1>

          <div className="flex items-center gap-4">
            {/* Streak */}
            <div className="bg-white rounded-2xl shadow-md px-4 py-2 flex items-center gap-2">
              <FlameIcon />
              <span className="font-bold text-[16px] text-[#364153]">
                Streak: {sessionData.currentStreak}
              </span>
            </div>

            {/* End Session */}
            <button
              onClick={onEndSession}
              className="bg-[#fb2c36] hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl transition-all flex items-center gap-2"
            >
              <LogOut className="size-5" />
              Kết thúc Session
            </button>
          </div>
        </div>

        {/* Instruction */}
        <p className="text-center text-[18px] text-[#4a5565] mb-8">
          Chọn chun để thi đấu. Thắng +1, Thua -1.
        </p>

        {/* Tier Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Tier 1 */}
          <motion.button
            onClick={() => handleTierClick(1)}
            disabled={!canPlayTier(1)}
            whileHover={canPlayTier(1) ? { scale: 1.02 } : {}}
            whileTap={canPlayTier(1) ? { scale: 0.98 } : {}}
            className={`relative bg-white rounded-3xl shadow-xl overflow-hidden transition-all ${
              !canPlayTier(1)
                ? "opacity-50 cursor-not-allowed"
                : "hover:shadow-2xl"
            }`}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(150.484deg, rgb(255, 137, 4) 0%, rgb(255, 214, 167) 100%)",
              }}
            ></div>
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[24px] text-[#1e2939]">
                  Tier 1 (Đồng)
                </h3>
                <div className="bg-white shadow-md rounded-2xl px-4 py-2">
                  <span className="font-bold text-[18px] text-[#1e2939]">
                    x{getTierCount(1)}
                  </span>
                </div>
              </div>

              {canPlayTier(1) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckIcon />
                    <span className="font-bold text-[18px] text-[#00a63e]">
                      Đặt Cược
                    </span>
                  </div>
                  <div className="rotate-180">
                    <ChevronRight />
                  </div>
                </div>
              )}
            </div>
          </motion.button>

          {/* Tier 2 */}
          <motion.button
            onClick={() => handleTierClick(2)}
            disabled={!canPlayTier(2)}
            whileHover={canPlayTier(2) ? { scale: 1.02 } : {}}
            whileTap={canPlayTier(2) ? { scale: 0.98 } : {}}
            className={`relative bg-white rounded-3xl shadow-xl overflow-hidden transition-all ${
              !canPlayTier(2)
                ? "opacity-50 cursor-not-allowed"
                : "hover:shadow-2xl"
            }`}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(150.484deg, rgb(153, 161, 175) 0%, rgb(229, 231, 235) 100%)",
              }}
            ></div>
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[24px] text-[#1e2939]">
                  Tier 2 (Bạc)
                </h3>
                <div className="bg-white shadow-md rounded-2xl px-4 py-2">
                  <span className="font-bold text-[18px] text-[#1e2939]">
                    x{getTierCount(2)}
                  </span>
                </div>
              </div>

              {canPlayTier(2) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckIcon />
                    <span className="font-bold text-[18px] text-[#00a63e]">
                      Đặt Cược
                    </span>
                  </div>
                  <div className="rotate-180">
                    <ChevronRight />
                  </div>
                </div>
              )}
            </div>
          </motion.button>

          {/* Tier 3 */}
          <motion.button
            onClick={() => handleTierClick(3)}
            disabled={!canPlayTier(3)}
            whileHover={canPlayTier(3) ? { scale: 1.02 } : {}}
            whileTap={canPlayTier(3) ? { scale: 0.98 } : {}}
            className={`relative bg-white rounded-3xl shadow-xl overflow-hidden transition-all ${
              !canPlayTier(3)
                ? "opacity-50 cursor-not-allowed"
                : "hover:shadow-2xl"
            }`}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(150.484deg, rgb(253, 199, 0) 0%, rgb(254, 249, 194) 100%)",
              }}
            ></div>
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[24px] text-[#1e2939]">
                  Tier 3 (Vàng)
                </h3>
                <div className="bg-white shadow-md rounded-2xl px-4 py-2">
                  <span className="font-bold text-[18px] text-[#1e2939]">
                    x{getTierCount(3)}
                  </span>
                </div>
              </div>

              {canPlayTier(3) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckIcon />
                    <span className="font-bold text-[18px] text-[#00a63e]">
                      Đặt Cược
                    </span>
                  </div>
                  <div className="rotate-180">
                    <ChevronRight />
                  </div>
                </div>
              )}
            </div>
          </motion.button>
        </div>

        {/* Session Log */}
        <div className="bg-white/50 backdrop-blur-sm border border-white rounded-2xl p-6">
          <h3 className="font-bold text-[16px] text-[#364153] mb-3">
            Session Log (Unsaved):
          </h3>
          <div className="flex items-center gap-6 font-mono text-[14px] text-[#4a5565]">
            <span>
              Δ T1: {sessionData.deltaTier1 >= 0 ? "+" : ""}
              {sessionData.deltaTier1}
            </span>
            <span>
              Δ T2: {sessionData.deltaTier2 >= 0 ? "+" : ""}
              {sessionData.deltaTier2}
            </span>
            <span>
              Δ T3: {sessionData.deltaTier3 >= 0 ? "+" : ""}
              {sessionData.deltaTier3}
            </span>
          </div>
        </div>
      </div>

      {/* Betting Modal */}
      <BettingModal
        isOpen={bettingModalOpen}
        tier={selectedTierForBetting || 1}
        onClose={handleCloseBettingModal}
        onConfirm={handleConfirmBet}
      />
    </div>
  );
}
