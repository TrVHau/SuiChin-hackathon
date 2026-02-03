import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import GameCanvas from './GameCanvas';

interface GameSessionProps {
  onBack: () => void;
  initialData: {
    tier1: number;
    tier2: number;
    tier3: number;
    currentStreak: number;
    maxStreak: number;
  };
  onSaveSession: (sessionData: SessionData) => void;
}

export interface SessionData {
  deltaTier1: number;
  deltaTier2: number;
  deltaTier3: number;
  isTier1Positive: boolean;
  isTier2Positive: boolean;
  isTier3Positive: boolean;
  newMaxStreak: number;
  newCurrentStreak: number;
}

export default function GameSession({ onBack, initialData, onSaveSession }: GameSessionProps) {
  const [sessionState, setSessionState] = useState({
    tier1: initialData.tier1,
    tier2: initialData.tier2,
    tier3: initialData.tier3,
    currentStreak: initialData.currentStreak,
    maxStreak: initialData.maxStreak,
  });

  const [matchesPlayed, setMatchesPlayed] = useState(0);
  const [showCanvas, setShowCanvas] = useState(false);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  const handleWin = () => {
    if (selectedTier === null) return;

    setSessionState((prev) => {
      const newCurrentStreak = prev.currentStreak + 1;
      const newMaxStreak = Math.max(prev.maxStreak, newCurrentStreak);

      return {
        ...prev,
        [`tier${selectedTier}`]: (prev[`tier${selectedTier}` as keyof typeof prev] as number) + 1,
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak,
      };
    });

    setMatchesPlayed((prev) => prev + 1);
    setShowCanvas(false);
    setSelectedTier(null);
    toast.success('Thắng! +1 chun, streak++');
  };

  const handleLose = () => {
    if (selectedTier === null) return;

    setSessionState((prev) => ({
      ...prev,
      [`tier${selectedTier}`]: Math.max(0, (prev[`tier${selectedTier}` as keyof typeof prev] as number) - 1),
      currentStreak: 0,
    }));

    setMatchesPlayed((prev) => prev + 1);
    setShowCanvas(false);
    setSelectedTier(null);
    toast.error('Thua! -1 chun, streak reset');
  };

  const handleStartMatch = (tier: number) => {
    if ((sessionState[`tier${tier}` as keyof typeof sessionState] as number) <= 0) {
      toast.error('Không đủ chun tier này!');
      return;
    }
    setSelectedTier(tier);
    setShowCanvas(true);
  };

  const handleSaveAndExit = async () => {
    toast.loading('Đang lưu session...', { id: 'save' });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const deltaTier1 = sessionState.tier1 - initialData.tier1;
    const deltaTier2 = sessionState.tier2 - initialData.tier2;
    const deltaTier3 = sessionState.tier3 - initialData.tier3;

    const sessionData: SessionData = {
      deltaTier1: Math.abs(deltaTier1),
      deltaTier2: Math.abs(deltaTier2),
      deltaTier3: Math.abs(deltaTier3),
      isTier1Positive: deltaTier1 >= 0,
      isTier2Positive: deltaTier2 >= 0,
      isTier3Positive: deltaTier3 >= 0,
      newMaxStreak: sessionState.maxStreak,
      newCurrentStreak: sessionState.currentStreak,
    };

    onSaveSession(sessionData);
    toast.success('Session đã được lưu!', { id: 'save' });
  };

  if (showCanvas && selectedTier) {
    return (
      <GameCanvas
        tier={selectedTier}
        onWin={handleWin}
        onLose={handleLose}
        onBack={() => {
          setShowCanvas(false);
          setSelectedTier(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              className="bg-white p-5 rounded-full shadow-2xl border-4 border-playful-blue"
            >
              <ArrowLeft className="size-7 text-playful-blue" />
            </motion.button>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-5xl">🎮</span>
                <h1 className="font-display font-black text-4xl text-gray-900">Game Session</h1>
              </div>
              <p className="text-gray-600 font-semibold text-lg">Trận đấu: {matchesPlayed}</p>
            </div>
          </div>
          <motion.button
            onClick={handleSaveAndExit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-playful-green text-white px-8 py-4 rounded-full font-display font-black text-xl flex items-center gap-3 shadow-2xl border-4 border-white"
          >
            <Save className="size-6" />
            Lưu & Thoát
          </motion.button>
        </div>

        {/* Session Stats */}
        <div className="bg-white rounded-4xl shadow-2xl p-8 mb-8 border-8 border-playful-purple">
          <h2 className="font-display font-black text-2xl text-gray-900 mb-6">Trạng thái Session</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { tier: 1, emoji: '🥉', color: 'chun-tier1' },
              { tier: 2, emoji: '🥈', color: 'chun-tier2' },
              { tier: 3, emoji: '🥇', color: 'chun-tier3' },
              { tier: 'streak', emoji: '🔥', color: 'playful-orange' },
            ].map((item) => (
              <div key={item.tier} className={`bg-${item.color}/20 rounded-3xl p-5 text-center border-4 border-${item.color}/40`}>
                <div className="text-4xl mb-2">{item.emoji}</div>
                <p className="text-sm text-gray-600 mb-1 font-bold">
                  {item.tier === 'streak' ? 'Streak' : `Tier ${item.tier}`}
                </p>
                <p className="font-display font-black text-3xl text-gray-900">
                  {item.tier === 'streak' ? sessionState.currentStreak : sessionState[`tier${item.tier}` as keyof typeof sessionState]}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-semibold">
                  {item.tier === 'streak' ? `Max: ${sessionState.maxStreak}` : `${(sessionState[`tier${item.tier}` as keyof typeof sessionState] as number) - (initialData[`tier${item.tier}` as keyof typeof initialData] as number) >= 0 ? '+' : ''}${(sessionState[`tier${item.tier}` as keyof typeof sessionState] as number) - (initialData[`tier${item.tier}` as keyof typeof initialData] as number)}`}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Selection */}
        <div className="bg-white rounded-4xl shadow-2xl p-8 border-8 border-playful-blue">
          <h2 className="font-display font-black text-2xl text-gray-900 mb-6">Chọn Tier để chơi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((tier) => (
              <motion.button
                key={tier}
                onClick={() => handleStartMatch(tier)}
                disabled={(sessionState[`tier${tier}` as keyof typeof sessionState] as number) <= 0}
                whileHover={(sessionState[`tier${tier}` as keyof typeof sessionState] as number) > 0 ? { scale: 1.05, rotate: 2 } : {}}
                whileTap={(sessionState[`tier${tier}` as keyof typeof sessionState] as number) > 0 ? { scale: 0.95 } : {}}
                className={`rounded-3xl p-8 text-center transition-all border-4 ${
                  (sessionState[`tier${tier}` as keyof typeof sessionState] as number) > 0
                    ? tier === 1
                      ? 'bg-chun-tier1/20 border-chun-tier1 hover:shadow-2xl'
                      : tier === 2
                      ? 'bg-chun-tier2/20 border-chun-tier2 hover:shadow-2xl'
                      : 'bg-chun-tier3/20 border-chun-tier3 hover:shadow-2xl'
                    : 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="text-7xl mb-4">
                  {tier === 1 ? '🥉' : tier === 2 ? '🥈' : '🥇'}
                </div>
                <h3 className="font-display font-black text-3xl text-gray-900 mb-2">
                  Tier {tier}
                </h3>
                <p className="text-gray-700 mb-3 font-semibold text-lg">{tier} điểm/chun</p>
                <p className="font-display font-black text-2xl text-gray-900">
                  Có: {sessionState[`tier${tier}` as keyof typeof sessionState]}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
