import { X, Clock, Gift } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastClaimTime: number;
  onClaim: (tier1: number, tier2: number, tier3: number) => void;
}

export default function FaucetModal({ isOpen, onClose, lastClaimTime, onClaim }: FaucetModalProps) {
  const [timeUntilClaim, setTimeUntilClaim] = useState("");
  const [canClaim, setCanClaim] = useState(false);
  const [chunsToReceive, setChunsToReceive] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ tier1: number; tier2: number; tier3: number } | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const timePassed = now - lastClaimTime;
      const twoHours = 2 * 60 * 60 * 1000;
      
      if (timePassed >= twoHours) {
        // Calculate how many chuns can be claimed
        const hoursPassed = timePassed / (60 * 60 * 1000);
        const numChuns = Math.min(Math.floor(hoursPassed / 2), 10);
        setChunsToReceive(numChuns);
        setCanClaim(true);
        setTimeUntilClaim("");
      } else {
        const timeLeft = twoHours - timePassed;
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
        
        setTimeUntilClaim(`${hours}h ${minutes}m ${seconds}s`);
        setCanClaim(false);
        setChunsToReceive(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [lastClaimTime]);

  const handleClaim = async () => {
    if (!canClaim || chunsToReceive === 0) return;
    
    setClaiming(true);
    
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Random distribution of chuns
    const results = { tier1: 0, tier2: 0, tier3: 0 };
    for (let i = 0; i < chunsToReceive; i++) {
      const rand = Math.random();
      if (rand < 0.33) results.tier1++;
      else if (rand < 0.66) results.tier2++;
      else results.tier3++;
    }
    
    setClaimResult(results);
    onClaim(results.tier1, results.tier2, results.tier3);
    setClaiming(false);
  };

  const handleClose = () => {
    setClaimResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl max-w-lg w-full shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-pink-500 p-3 rounded-xl">
                <Gift className="size-6 text-white" />
              </div>
              <h2 className="font-bold text-[24px] text-gray-900">Xin Chun (Faucet)</h2>
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
            {!claimResult ? (
              <>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 mb-6 border border-pink-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="size-5 text-pink-600" />
                    <h3 className="font-bold text-[18px] text-gray-900">Thời gian chờ</h3>
                  </div>
                  
                  {canClaim ? (
                    <div>
                      <p className="text-green-600 font-bold text-[20px] mb-2">✅ Sẵn sàng nhận chun!</p>
                      <p className="text-gray-700">
                        Bạn có thể nhận <strong className="text-pink-600">{chunsToReceive} chun</strong> ngay bây giờ
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-700 mb-2">Còn lại:</p>
                      <p className="font-bold text-[28px] text-pink-600">{timeUntilClaim}</p>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <h4 className="font-bold text-[14px] text-gray-900 mb-2">📖 Cách hoạt động</h4>
                  <ul className="text-[14px] text-gray-700 space-y-1">
                    <li>• Mỗi 2 giờ được nhận 1 chun</li>
                    <li>• Tối đa 10 chun (20 giờ)</li>
                    <li>• Mỗi chun random tier (🥉🥈🥇)</li>
                    <li>• Miễn phí gas (Sponsored)</li>
                  </ul>
                </div>

                <button
                  onClick={handleClaim}
                  disabled={!canClaim || claiming}
                  className={`w-full py-4 rounded-xl font-bold text-[16px] transition-all ${
                    canClaim && !claiming
                      ? "bg-pink-500 text-white hover:bg-pink-600 shadow-lg hover:shadow-xl"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {claiming ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang xin chun...
                    </span>
                  ) : canClaim ? (
                    `Nhận ${chunsToReceive} Chun`
                  ) : (
                    "Chưa đủ thời gian"
                  )}
                </button>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="text-[80px] mb-4">🎁</div>
                <h3 className="font-bold text-[32px] text-green-600 mb-6">Nhận thành công!</h3>
                
                <div className="flex items-center justify-center gap-6 mb-8">
                  {claimResult.tier1 > 0 && (
                    <div className="bg-orange-50 px-6 py-4 rounded-xl border-2 border-orange-200">
                      <div className="text-[32px] mb-2">🥉</div>
                      <div className="font-bold text-[24px]">×{claimResult.tier1}</div>
                    </div>
                  )}
                  {claimResult.tier2 > 0 && (
                    <div className="bg-gray-50 px-6 py-4 rounded-xl border-2 border-gray-300">
                      <div className="text-[32px] mb-2">🥈</div>
                      <div className="font-bold text-[24px]">×{claimResult.tier2}</div>
                    </div>
                  )}
                  {claimResult.tier3 > 0 && (
                    <div className="bg-yellow-50 px-6 py-4 rounded-xl border-2 border-yellow-300">
                      <div className="text-[32px] mb-2">🥇</div>
                      <div className="font-bold text-[24px]">×{claimResult.tier3}</div>
                    </div>
                  )}
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
