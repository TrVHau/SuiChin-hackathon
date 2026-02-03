import { ArrowLeft, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface FaucetScreenProps {
  onBack: () => void;
  lastClaimTime: number;
  onClaim: (tier1: number, tier2: number, tier3: number) => void;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function FaucetScreen({ onBack, lastClaimTime, onClaim }: FaucetScreenProps) {
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ tier1: number; tier2: number; tier3: number } | null>(null);
  const [remainingTime, setRemainingTime] = useState('');
  const [claimableCount, setClaimableCount] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const timePassed = now - lastClaimTime;
      const numChuns = Math.min(Math.floor(timePassed / TWO_HOURS_MS), 10);
      setClaimableCount(numChuns);

      if (numChuns === 0) {
        const nextClaimAt = lastClaimTime + TWO_HOURS_MS;
        const remaining = Math.max(0, nextClaimAt - now);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
        setRemainingTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      } else {
        setRemainingTime('');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastClaimTime]);

  const handleClaim = async () => {
    if (claimableCount === 0) return;

    setClaiming(true);
    toast.loading('Đang xin chun...', { id: 'faucet' });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const results = { tier1: 0, tier2: 0, tier3: 0 };
    for (let i = 0; i < claimableCount; i++) {
      const rand = Math.floor(Math.random() * 3);
      if (rand === 0) results.tier1++;
      else if (rand === 1) results.tier2++;
      else results.tier3++;
    }

    onClaim(results.tier1, results.tier2, results.tier3);
    setClaimResult(results);
    setClaiming(false);
    toast.success(`Nhận thành công ${claimableCount} chun!`, { id: 'faucet' });
  };

  const handleClose = () => {
    setClaimResult(null);
    onBack();
  };

  const canClaim = claimableCount > 0;

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <motion.button
            onClick={handleClose}
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            className="bg-white p-5 rounded-full shadow-2xl border-4 border-playful-pink"
          >
            <ArrowLeft className="size-7 text-playful-pink" />
          </motion.button>
          <div className="flex items-center gap-3">
            <span className="text-5xl">🎁</span>
            <h1 className="font-display font-black text-4xl text-gray-900">Xin Chun</h1>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!claimResult ? (
            <motion.div
              key="claim"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-4xl shadow-2xl p-10 border-8 border-playful-pink"
            >
              {/* Claimable Count */}
              <div className="text-center mb-8">
                <p className="font-display font-bold text-2xl text-gray-700 mb-4">Số Chun Có Thể Nhận</p>
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-playful-pink/20 rounded-full blur-3xl"></div>
                  <motion.p
                    key={claimableCount}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-display font-black text-9xl text-playful-pink leading-none mb-4 relative"
                  >
                    {claimableCount}
                  </motion.p>
                </div>
                <p className="text-lg text-gray-600 font-semibold">Công thức: 2 giờ = 1 chun (Tối đa 10)</p>
                
                {!canClaim && remainingTime && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 bg-sunny-200 border-4 border-sunny-400 rounded-3xl p-5"
                  >
                    <div className="flex items-center justify-center gap-3 text-gray-800">
                      <Clock className="size-7" />
                      <p className="font-display font-black text-2xl">Chờ thêm: {remainingTime}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-chun-tier1/20 rounded-3xl p-5 text-center border-4 border-chun-tier1/40">
                  <div className="text-5xl mb-3">🥉</div>
                  <p className="font-display font-bold text-gray-800">Tier 1</p>
                  <p className="text-sm text-gray-600 font-semibold">33.3%</p>
                </div>
                <div className="bg-chun-tier2/20 rounded-3xl p-5 text-center border-4 border-chun-tier2/40">
                  <div className="text-5xl mb-3">🥈</div>
                  <p className="font-display font-bold text-gray-800">Tier 2</p>
                  <p className="text-sm text-gray-600 font-semibold">33.3%</p>
                </div>
                <div className="bg-chun-tier3/20 rounded-3xl p-5 text-center border-4 border-chun-tier3/40">
                  <div className="text-5xl mb-3">🥇</div>
                  <p className="font-display font-bold text-gray-800">Tier 3</p>
                  <p className="text-sm text-gray-600 font-semibold">33.3%</p>
                </div>
              </div>

              {/* Claim Button */}
              <motion.button
                onClick={handleClaim}
                disabled={!canClaim || claiming}
                whileHover={canClaim && !claiming ? { scale: 1.05 } : {}}
                whileTap={canClaim && !claiming ? { scale: 0.95 } : {}}
                className={`w-full h-24 rounded-full font-display font-black text-3xl shadow-2xl transition-all border-4 ${
                  canClaim && !claiming
                    ? 'bg-gradient-to-r from-playful-pink to-playful-purple text-white border-white'
                    : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                }`}
              >
                {claiming ? (
                  <span className="flex items-center justify-center gap-4">
                    <div className="size-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xin...
                  </span>
                ) : canClaim ? (
                  'XIN NGAY 🎁'
                ) : (
                  'CHƯA ĐỦ THỜI GIAN ⏰'
                )}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-4xl shadow-2xl p-12 text-center border-8 border-playful-green"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-9xl mb-6"
              >
                🎉
              </motion.div>
              <h3 className="font-display font-black text-5xl text-playful-green mb-10">Nhận thành công!</h3>

              <div className="flex items-center justify-center gap-6 mb-10">
                {claimResult.tier1 > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-chun-tier1/20 px-8 py-8 rounded-3xl border-4 border-chun-tier1"
                  >
                    <div className="text-6xl mb-3">🥉</div>
                    <div className="font-display font-black text-4xl text-gray-900">×{claimResult.tier1}</div>
                  </motion.div>
                )}
                {claimResult.tier2 > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-chun-tier2/20 px-8 py-8 rounded-3xl border-4 border-chun-tier2"
                  >
                    <div className="text-6xl mb-3">🥈</div>
                    <div className="font-display font-black text-4xl text-gray-900">×{claimResult.tier2}</div>
                  </motion.div>
                )}
                {claimResult.tier3 > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-chun-tier3/20 px-8 py-8 rounded-3xl border-4 border-chun-tier3"
                  >
                    <div className="text-6xl mb-3">🥇</div>
                    <div className="font-display font-black text-4xl text-gray-900">×{claimResult.tier3}</div>
                  </motion.div>
                )}
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
