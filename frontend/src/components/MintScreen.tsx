import { ArrowLeft, Minus, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface MintScreenProps {
  onBack: () => void;
  playerData: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  onMint: (useTier1: number, useTier2: number, useTier3: number, resultTier: number) => void;
}

export default function MintScreen({ onBack, playerData, onMint }: MintScreenProps) {
  const [useTier1, setUseTier1] = useState(0);
  const [useTier2, setUseTier2] = useState(0);
  const [useTier3, setUseTier3] = useState(0);
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ tier: number; emoji: string } | null>(null);

  const totalPoints = useTier1 * 1 + useTier2 * 2 + useTier3 * 3;
  const canMint = totalPoints >= 10;

  const getTierEmoji = (tier: number) => {
    if (tier === 1) return '🥉';
    if (tier === 2) return '🥈';
    return '🥇';
  };

  const getTierProbability = (points: number) => {
    if (points >= 30) return { tier1: 50, tier2: 35, tier3: 15 };
    if (points >= 20) return { tier1: 60, tier2: 30, tier3: 10 };
    return { tier1: 75, tier2: 20, tier3: 5 };
  };

  const prob = getTierProbability(totalPoints);

  const handleMint = async () => {
    if (!canMint) return;

    setMinting(true);
    toast.loading('Đang mint NFT...', { id: 'mint' });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const rand = Math.random() * 100;
    let resultTier = 1;

    if (rand < prob.tier3) {
      resultTier = 3;
    } else if (rand < prob.tier3 + prob.tier2) {
      resultTier = 2;
    } else {
      resultTier = 1;
    }

    onMint(useTier1, useTier2, useTier3, resultTier);
    setMintResult({ tier: resultTier, emoji: getTierEmoji(resultTier) });
    setMinting(false);
    toast.success(`Mint thành công Cuộn Chun Tier ${resultTier}!`, { id: 'mint' });
  };

  const handleClose = () => {
    setUseTier1(0);
    setUseTier2(0);
    setUseTier3(0);
    setMintResult(null);
    onBack();
  };

  const increment = (tier: number) => {
    if (tier === 1 && useTier1 < playerData.tier1) setUseTier1(useTier1 + 1);
    if (tier === 2 && useTier2 < playerData.tier2) setUseTier2(useTier2 + 1);
    if (tier === 3 && useTier3 < playerData.tier3) setUseTier3(useTier3 + 1);
  };

  const decrement = (tier: number) => {
    if (tier === 1 && useTier1 > 0) setUseTier1(useTier1 - 1);
    if (tier === 2 && useTier2 > 0) setUseTier2(useTier2 - 1);
    if (tier === 3 && useTier3 > 0) setUseTier3(useTier3 - 1);
  };

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-6 mb-8">
          <motion.button
            onClick={handleClose}
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            className="bg-white p-5 rounded-full shadow-2xl border-4 border-playful-purple"
          >
            <ArrowLeft className="size-7 text-playful-purple" />
          </motion.button>
          <div className="flex items-center gap-3">
            <span className="text-5xl">🎨</span>
            <h1 className="font-display font-black text-4xl text-gray-900">Mint Cuộn Chun NFT</h1>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!mintResult ? (
            <motion.div
              key="mint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Left: Select Chuns */}
              <div className="bg-white rounded-4xl shadow-2xl p-8 border-8 border-playful-blue">
                <h3 className="font-display font-black text-2xl text-gray-900 mb-6">Chọn Chun để đổi điểm</h3>

                <div className="space-y-5 mb-8">
                  {/* Tier 1 */}
                  <div className="bg-chun-tier1/20 rounded-3xl p-5 border-4 border-chun-tier1/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">🥉</span>
                        <div>
                          <p className="font-display font-black text-lg text-gray-900">Tier 1</p>
                          <p className="text-sm text-gray-600 font-semibold">1 điểm • Có {playerData.tier1}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <motion.button
                          onClick={() => decrement(1)}
                          disabled={useTier1 === 0}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="bg-white p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 border-2 border-gray-300"
                        >
                          <Minus className="size-5 text-gray-700" />
                        </motion.button>
                        <span className="font-display font-black text-2xl text-gray-900 w-12 text-center">
                          {useTier1}
                        </span>
                        <motion.button
                          onClick={() => increment(1)}
                          disabled={useTier1 >= playerData.tier1}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="bg-white p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 border-2 border-gray-300"
                        >
                          <Plus className="size-5 text-gray-700" />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="bg-chun-tier2/20 rounded-3xl p-5 border-4 border-chun-tier2/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">🥈</span>
                        <div>
                          <p className="font-display font-black text-lg text-gray-900">Tier 2</p>
                          <p className="text-sm text-gray-600 font-semibold">2 điểm • Có {playerData.tier2}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <motion.button
                          onClick={() => decrement(2)}
                          disabled={useTier2 === 0}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="bg-white p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 border-2 border-gray-300"
                        >
                          <Minus className="size-5 text-gray-700" />
                        </motion.button>
                        <span className="font-display font-black text-2xl text-gray-900 w-12 text-center">
                          {useTier2}
                        </span>
                        <motion.button
                          onClick={() => increment(2)}
                          disabled={useTier2 >= playerData.tier2}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="bg-white p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 border-2 border-gray-300"
                        >
                          <Plus className="size-5 text-gray-700" />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="bg-chun-tier3/20 rounded-3xl p-5 border-4 border-chun-tier3/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">🥇</span>
                        <div>
                          <p className="font-display font-black text-lg text-gray-900">Tier 3</p>
                          <p className="text-sm text-gray-600 font-semibold">3 điểm • Có {playerData.tier3}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <motion.button
                          onClick={() => decrement(3)}
                          disabled={useTier3 === 0}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="bg-white p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 border-2 border-gray-300"
                        >
                          <Minus className="size-5 text-gray-700" />
                        </motion.button>
                        <span className="font-display font-black text-2xl text-gray-900 w-12 text-center">
                          {useTier3}
                        </span>
                        <motion.button
                          onClick={() => increment(3)}
                          disabled={useTier3 >= playerData.tier3}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="bg-white p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 border-2 border-gray-300"
                        >
                          <Plus className="size-5 text-gray-700" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Points */}
                <div className="bg-gradient-to-r from-playful-purple to-playful-pink rounded-3xl p-6 border-4 border-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <p className="font-display font-black text-2xl text-white">Tổng điểm</p>
                    <p className="font-display font-black text-5xl text-white">{totalPoints}</p>
                  </div>
                  <p className="text-sm text-white/90 mt-2 font-semibold">
                    {canMint ? '✓ Đủ điểm để mint!' : '⚠️ Cần tối thiểu 10 điểm'}
                  </p>
                </div>
              </div>

              {/* Right: Probability & Mint */}
              <div className="bg-white rounded-4xl shadow-2xl p-8 border-8 border-playful-purple">
                <h3 className="font-display font-black text-2xl text-gray-900 mb-6">Xác suất nhận NFT</h3>

                <div className="space-y-4 mb-8">
                  <div className="bg-chun-tier1/20 rounded-3xl p-5 border-4 border-chun-tier1/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">🥉</span>
                        <p className="font-display font-black text-lg text-gray-900">Cuộn Chun Đồng</p>
                      </div>
                      <p className="font-display font-black text-3xl text-chun-tier1">{prob.tier1}%</p>
                    </div>
                  </div>

                  <div className="bg-chun-tier2/20 rounded-3xl p-5 border-4 border-chun-tier2/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">🥈</span>
                        <p className="font-display font-black text-lg text-gray-900">Cuộn Chun Bạc</p>
                      </div>
                      <p className="font-display font-black text-3xl text-chun-tier2">{prob.tier2}%</p>
                    </div>
                  </div>

                  <div className="bg-chun-tier3/20 rounded-3xl p-5 border-4 border-chun-tier3/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">🥇</span>
                        <p className="font-display font-black text-lg text-gray-900">Cuộn Chun Vàng</p>
                      </div>
                      <p className="font-display font-black text-3xl text-chun-tier3">{prob.tier3}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-sunny-100 rounded-3xl p-6 mb-6 border-4 border-sunny-300">
                  <p className="text-sm text-gray-700 font-bold mb-2">💡 Mẹo:</p>
                  <ul className="text-sm text-gray-600 space-y-1 font-semibold">
                    <li>• 10-19 điểm: 75%/20%/5%</li>
                    <li>• 20-29 điểm: 60%/30%/10%</li>
                    <li>• 30+ điểm: 50%/35%/15%</li>
                  </ul>
                </div>

                <motion.button
                  onClick={handleMint}
                  disabled={!canMint || minting}
                  whileHover={canMint && !minting ? { scale: 1.05 } : {}}
                  whileTap={canMint && !minting ? { scale: 0.95 } : {}}
                  className={`w-full h-24 rounded-full font-display font-black text-3xl shadow-2xl transition-all flex items-center justify-center gap-4 border-4 ${
                    canMint && !minting
                      ? 'bg-gradient-to-r from-playful-purple to-playful-blue text-white border-white'
                      : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                  }`}
                >
                  {minting ? (
                    <>
                      <div className="size-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang mint...
                    </>
                  ) : canMint ? (
                    <>
                      <Sparkles className="size-8" />
                      MINT NFT
                    </>
                  ) : (
                    'CHƯA ĐỦ ĐIỂM'
                  )}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-4xl shadow-2xl p-12 text-center max-w-2xl mx-auto border-8 border-playful-green"
            >
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 150 }}
                className="text-9xl mb-6"
              >
                {mintResult.emoji}
              </motion.div>
              <h3 className="font-display font-black text-5xl text-playful-green mb-4">Mint thành công!</h3>
              <p className="text-3xl text-gray-700 mb-8 font-bold">
                Cuộn Chun {mintResult.tier === 1 ? 'Đồng' : mintResult.tier === 2 ? 'Bạc' : 'Vàng'}
              </p>

              <div className="bg-sunny-100 rounded-3xl p-6 mb-8 border-4 border-sunny-300">
                <p className="text-lg text-gray-700 font-semibold">NFT đã được thêm vào ví của bạn!</p>
              </div>

              <motion.button
                onClick={handleClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-playful-green text-white px-16 py-5 rounded-full font-display font-black text-2xl shadow-2xl border-4 border-white"
              >
                Hoàn tất ✓
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
