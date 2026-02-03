import { ArrowLeft, Minus, Plus } from "lucide-react";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useProfile } from "@/hooks/useProfile";

interface MintScreenProps {
  onBack: () => void;
}

// ChunRoll type for NFT
interface ChunRoll {
  id: string;
  tier: number;
  image_url: string;
}

export default function MintScreen({ onBack }: MintScreenProps) {
  const { profile, updateProfile } = useProfile();

  const [useTier1, setUseTier1] = useState(0);
  const [useTier2, setUseTier2] = useState(0);
  const [useTier3, setUseTier3] = useState(0);
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{
    tier: number;
    emoji: string;
  } | null>(null);

  // Clamp to available
  const availableChuns = {
    tier1: profile?.tier1 ?? 0,
    tier2: profile?.tier2 ?? 0,
    tier3: profile?.tier3 ?? 0,
  };

  const totalPoints = useTier1 * 1 + useTier2 * 2 + useTier3 * 3;
  const canMint = totalPoints >= 10;

  const getTierEmoji = (tier: number) => {
    if (tier === 1) return "🥉";
    if (tier === 2) return "🥈";
    return "🥇";
  };

  // Probability based on total points
  const getTierProbability = (points: number) => {
    if (points >= 30) return { tier1: 50, tier2: 35, tier3: 15 };
    if (points >= 20) return { tier1: 60, tier2: 30, tier3: 10 };
    return { tier1: 75, tier2: 20, tier3: 5 };
  };

  const prob = getTierProbability(totalPoints);

  const handleMint = useCallback(async () => {
    if (!canMint || !profile) return;

    setMinting(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Roll random tier based on probability
    const rand = Math.random() * 100;
    let resultTier = 1;

    // 10-19: 75/20/5, 20-29: 60/30/10, 30+: 50/35/15
    if (rand < prob.tier3) {
      resultTier = 3;
    } else if (rand < prob.tier3 + prob.tier2) {
      resultTier = 2;
    } else {
      resultTier = 1;
    }

    // Create new ChunRoll
    const newRoll: ChunRoll = {
      id: `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tier: resultTier,
      image_url: `https://placeholder.suichin.game/nft/${resultTier}`,
    };

    // Deduct used chuns from profile and add ChunRoll
    updateProfile({
      tier1: profile.tier1 - useTier1,
      tier2: profile.tier2 - useTier2,
      tier3: profile.tier3 - useTier3,
      chun_rolls: [...profile.chun_rolls, JSON.stringify(newRoll)],
    });

    setMintResult({
      tier: resultTier,
      emoji: getTierEmoji(resultTier),
    });

    setMinting(false);
  }, [canMint, profile, prob, useTier1, useTier2, useTier3, updateProfile]);

  const handleClose = () => {
    setUseTier1(0);
    setUseTier2(0);
    setUseTier3(0);
    setMintResult(null);
    onBack();
  };

  const increment = (tier: number) => {
    if (tier === 1 && useTier1 < availableChuns.tier1)
      setUseTier1(useTier1 + 1);
    if (tier === 2 && useTier2 < availableChuns.tier2)
      setUseTier2(useTier2 + 1);
    if (tier === 3 && useTier3 < availableChuns.tier3)
      setUseTier3(useTier3 + 1);
  };

  const decrement = (tier: number) => {
    if (tier === 1 && useTier1 > 0) setUseTier1(useTier1 - 1);
    if (tier === 2 && useTier2 > 0) setUseTier2(useTier2 - 1);
    if (tier === 3 && useTier3 > 0) setUseTier3(useTier3 - 1);
  };

  return (
    <div className="min-h-screen bg-[#faf5ff]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={handleClose}
            className="bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ArrowLeft className="size-6 text-[#4a5565]" />
          </button>
          <h1 className="font-bold text-[30px] text-[#1e2939]">
            Mint Cuộn Chun
          </h1>
        </div>

        {!mintResult ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Chọn Chun */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h3 className="font-bold text-[16px] text-[#364153] mb-6">
                Chọn Chun để đổi điểm
              </h3>

              <div className="space-y-4 mb-6">
                {/* Tier 1 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded-full bg-[#ff8904]"></div>
                    <span className="font-bold text-[16px] text-[#364153]">
                      Tier 1 (1 điểm)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => decrement(1)}
                      className="bg-[#f3f4f6] p-2 rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={useTier1 === 0}
                    >
                      <Minus className="size-4 text-[#101828]" />
                    </button>
                    <span className="font-bold text-[16px] text-[#101828] w-8 text-center">
                      {useTier1}
                    </span>
                    <button
                      onClick={() => increment(1)}
                      className="bg-[#f3f4f6] p-2 rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={useTier1 >= availableChuns.tier1}
                    >
                      <Plus className="size-4 text-[#101828]" />
                    </button>
                  </div>
                </div>

                {/* Tier 2 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded-full bg-[#99a1af]"></div>
                    <span className="font-bold text-[16px] text-[#364153]">
                      Tier 2 (2 điểm)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => decrement(2)}
                      className="bg-[#f3f4f6] p-2 rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={useTier2 === 0}
                    >
                      <Minus className="size-4 text-[#101828]" />
                    </button>
                    <span className="font-bold text-[16px] text-[#101828] w-8 text-center">
                      {useTier2}
                    </span>
                    <button
                      onClick={() => increment(2)}
                      className="bg-[#f3f4f6] p-2 rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={useTier2 >= availableChuns.tier2}
                    >
                      <Plus className="size-4 text-[#101828]" />
                    </button>
                  </div>
                </div>

                {/* Tier 3 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded-full bg-[#fdc700]"></div>
                    <span className="font-bold text-[16px] text-[#364153]">
                      Tier 3 (3 điểm)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => decrement(3)}
                      className="bg-[#f3f4f6] p-2 rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={useTier3 === 0}
                    >
                      <Minus className="size-4 text-[#101828]" />
                    </button>
                    <span className="font-bold text-[16px] text-[#101828] w-8 text-center">
                      {useTier3}
                    </span>
                    <button
                      onClick={() => increment(3)}
                      className="bg-[#f3f4f6] p-2 rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={useTier3 >= availableChuns.tier3}
                    >
                      <Plus className="size-4 text-[#101828]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-[#f3f4f6] pt-4 flex items-center justify-between">
                <span className="font-bold text-[16px] text-[#4a5565]">
                  Tổng điểm:
                </span>
                <span
                  className={`font-bold text-[30px] ${totalPoints >= 10 ? "text-green-600" : "text-[#99a1af]"}`}
                >
                  {totalPoints}/10
                </span>
              </div>
            </div>

            {/* Right: Probability & Mint Button */}
            <div className="flex flex-col gap-6">
              {/* Probability */}
              <div className="bg-white border-2 border-white rounded-3xl shadow-lg p-6">
                <h3 className="font-bold text-[16px] text-[#364153] mb-6">
                  Tỷ lệ ra NFT
                </h3>

                <div className="space-y-4">
                  {/* Common */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[12px] text-[#6a7282]">
                        Common
                      </span>
                      <span className="font-bold text-[12px] text-[#6a7282]">
                        {prob.tier1}%
                      </span>
                    </div>
                    <div className="bg-[#e5e7eb] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#99a1af] h-full transition-all"
                        style={{ width: `${prob.tier1}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Rare */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[12px] text-[#6a7282]">
                        Rare
                      </span>
                      <span className="font-bold text-[12px] text-[#6a7282]">
                        {prob.tier2}%
                      </span>
                    </div>
                    <div className="bg-[#e5e7eb] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#51a2ff] h-full transition-all"
                        style={{ width: `${prob.tier2}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Legendary */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[12px] text-[#6a7282]">
                        Legendary
                      </span>
                      <span className="font-bold text-[12px] text-[#6a7282]">
                        {prob.tier3}%
                      </span>
                    </div>
                    <div className="bg-[#e5e7eb] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#fdc700] h-full transition-all"
                        style={{ width: `${prob.tier3}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mint Button */}
              <button
                onClick={handleMint}
                disabled={!canMint || minting}
                className={`h-[68px] rounded-2xl font-bold text-[20px] shadow-xl transition-all ${
                  canMint && !minting
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-2xl hover:scale-105"
                    : "bg-[#e5e7eb] text-[#99a1af] cursor-not-allowed"
                }`}
              >
                {minting ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="size-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang mint...
                  </span>
                ) : canMint ? (
                  "XÁC NHẬN MINT"
                ) : (
                  "CHƯA ĐỦ ĐIỂM"
                )}
              </button>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl p-12 text-center"
            >
              <div className="text-[120px] mb-6">{mintResult.emoji}</div>
              <h3 className="font-bold text-[40px] text-green-600 mb-4">
                🎉 Mint thành công!
              </h3>
              <p className="text-[24px] text-gray-700 mb-10">
                Bạn đã nhận được{" "}
                <strong>Cuộn Chun NFT Tier {mintResult.tier}</strong>
              </p>

              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-10 mb-10 border-3 border-purple-300">
                <div className="text-[100px] mb-4">{mintResult.emoji}</div>
                <div className="font-bold text-[28px] text-gray-900">
                  Cuộn Chun Tier {mintResult.tier}
                </div>
                <div className="text-[16px] text-gray-600 mt-3">
                  NFT Transferable
                </div>
              </div>

              <button
                onClick={handleClose}
                className="bg-green-500 text-white px-12 py-4 rounded-xl font-bold text-[18px] hover:bg-green-600 transition-colors shadow-lg"
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
