import { X, Ticket, Info } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface MintNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableChuns: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  onMint: (useTier1: number, useTier2: number, useTier3: number) => void;
}

export default function MintNFTModal({ isOpen, onClose, availableChuns, onMint }: MintNFTModalProps) {
  const [useTier1, setUseTier1] = useState(0);
  const [useTier2, setUseTier2] = useState(0);
  const [useTier3, setUseTier3] = useState(0);
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ tier: number; emoji: string } | null>(null);

  const totalPoints = useTier1 * 1 + useTier2 * 2 + useTier3 * 3;
  const canMint = totalPoints >= 10;

  const getTierEmoji = (tier: number) => {
    if (tier === 1) return "🥉";
    if (tier === 2) return "🥈";
    return "🥇";
  };

  const getTierProbability = (points: number) => {
    if (points >= 30) return { tier1: 50, tier2: 35, tier3: 15 };
    if (points >= 20) return { tier1: 60, tier2: 30, tier3: 10 };
    return { tier1: 75, tier2: 20, tier3: 5 };
  };

  const handleMint = async () => {
    if (!canMint) return;
    
    setMinting(true);
    
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Random tier based on points
    const prob = getTierProbability(totalPoints);
    const rand = Math.random() * 100;
    let resultTier = 1;
    
    if (rand < prob.tier3) {
      resultTier = 3;
    } else if (rand < prob.tier3 + prob.tier2) {
      resultTier = 2;
    } else {
      resultTier = 1;
    }
    
    setMintResult({
      tier: resultTier,
      emoji: getTierEmoji(resultTier),
    });
    
    onMint(useTier1, useTier2, useTier3);
    setMinting(false);
  };

  const handleClose = () => {
    setUseTier1(0);
    setUseTier2(0);
    setUseTier3(0);
    setMintResult(null);
    onClose();
  };

  const prob = getTierProbability(totalPoints);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-3 rounded-xl">
                <Ticket className="size-6 text-white" />
              </div>
              <h2 className="font-bold text-[24px] text-gray-900">Mint Cuộn Chun NFT</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="size-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!mintResult ? (
              <>
                {/* Info Banner */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <div className="flex gap-3">
                    <Info className="size-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-[14px] text-gray-700">
                      <p className="font-bold mb-1">Cần tối thiểu 10 điểm để mint</p>
                      <p>Tier NFT được random dựa trên tổng điểm. Điểm càng cao, tỷ lệ tier cao càng lớn!</p>
                    </div>
                  </div>
                </div>

                {/* Chun Selection */}
                <div className="space-y-4 mb-6">
                  <h3 className="font-bold text-[18px] text-gray-900">Chọn số chun sử dụng</h3>
                  
                  {/* Tier 1 */}
                  <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[24px]">🥉</span>
                        <div>
                          <div className="font-bold text-gray-900">Tier 1 (Đồng)</div>
                          <div className="text-[12px] text-gray-600">Có sẵn: {availableChuns.tier1}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] text-gray-600">Giá trị</div>
                        <div className="font-bold text-orange-600">1 điểm</div>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={availableChuns.tier1}
                      value={useTier1}
                      onChange={(e) => setUseTier1(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-center mt-2 font-bold text-[18px] text-gray-900">{useTier1}</div>
                  </div>

                  {/* Tier 2 */}
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[24px]">🥈</span>
                        <div>
                          <div className="font-bold text-gray-900">Tier 2 (Bạc)</div>
                          <div className="text-[12px] text-gray-600">Có sẵn: {availableChuns.tier2}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] text-gray-600">Giá trị</div>
                        <div className="font-bold text-gray-600">2 điểm</div>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={availableChuns.tier2}
                      value={useTier2}
                      onChange={(e) => setUseTier2(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-center mt-2 font-bold text-[18px] text-gray-900">{useTier2}</div>
                  </div>

                  {/* Tier 3 */}
                  <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[24px]">🥇</span>
                        <div>
                          <div className="font-bold text-gray-900">Tier 3 (Vàng)</div>
                          <div className="text-[12px] text-gray-600">Có sẵn: {availableChuns.tier3}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] text-gray-600">Giá trị</div>
                        <div className="font-bold text-yellow-600">3 điểm</div>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={availableChuns.tier3}
                      value={useTier3}
                      onChange={(e) => setUseTier3(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-center mt-2 font-bold text-[18px] text-gray-900">{useTier3}</div>
                  </div>
                </div>

                {/* Total Points */}
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-6 mb-6 border-2 border-purple-300">
                  <div className="text-center">
                    <div className="text-[14px] text-gray-600 mb-2">Tổng điểm</div>
                    <div className={`font-bold text-[48px] ${totalPoints >= 10 ? "text-green-600" : "text-gray-400"}`}>
                      {totalPoints}
                    </div>
                    <div className="text-[12px] text-gray-600">
                      {totalPoints < 10 ? `Còn thiếu ${10 - totalPoints} điểm` : "✅ Đủ điểm để mint!"}
                    </div>
                  </div>
                </div>

                {/* Probability Display */}
                {totalPoints >= 10 && (
                  <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
                    <div className="font-bold text-[14px] text-gray-900 mb-3">Tỷ lệ random tier NFT:</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px]">🥉 Tier 1</span>
                        <span className="font-bold text-orange-600">{prob.tier1}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[14px]">🥈 Tier 2</span>
                        <span className="font-bold text-gray-600">{prob.tier2}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[14px]">🥇 Tier 3</span>
                        <span className="font-bold text-yellow-600">{prob.tier3}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mint Button */}
                <button
                  onClick={handleMint}
                  disabled={!canMint || minting}
                  className={`w-full py-4 rounded-xl font-bold text-[16px] transition-all ${
                    canMint && !minting
                      ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {minting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang mint NFT...
                    </span>
                  ) : canMint ? (
                    "Xác nhận Mint"
                  ) : (
                    "Chưa đủ 10 điểm"
                  )}
                </button>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="text-[100px] mb-6">{mintResult.emoji}</div>
                <h3 className="font-bold text-[36px] text-green-600 mb-4">🎉 Mint thành công!</h3>
                <p className="text-[20px] text-gray-700 mb-8">
                  Bạn đã nhận được <strong>Cuộn Chun NFT Tier {mintResult.tier}</strong>
                </p>
                
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-6 mb-8 max-w-sm mx-auto border-2 border-purple-300">
                  <div className="text-[80px] mb-4">{mintResult.emoji}</div>
                  <div className="font-bold text-[24px] text-gray-900">Cuộn Chun Tier {mintResult.tier}</div>
                  <div className="text-[14px] text-gray-600 mt-2">NFT Transferable</div>
                </div>

                <button
                  onClick={handleClose}
                  className="bg-green-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                >
                  Đóng
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
