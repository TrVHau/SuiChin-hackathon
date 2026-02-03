import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import LoginScreen from '@/components/LoginScreen';
import Dashboard from '@/components/Dashboard';
import FaucetScreen from '@/components/FaucetScreen';
import MintScreen from '@/components/MintScreen';
import AchievementScreen from '@/components/AchievementScreen';
import GameSession, { SessionData } from '@/components/GameSession';
import { useProfile } from '@/hooks/useProfile';

type Screen = 'login' | 'dashboard' | 'faucet' | 'mint' | 'achievements' | 'session';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const { profile, createProfile, updateProfile, clearProfile } = useProfile();

  const handleLogin = async () => {
    toast.loading('Đang kết nối zkLogin...', { id: 'login' });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (profile) {
      toast.success('Chào mừng trở lại!', { id: 'login' });
    } else {
      const address = '0x' + Math.random().toString(16).slice(2, 42);
      createProfile(address);
      toast.success('Profile mới đã được tạo! Hãy xin chun để bắt đầu!', { id: 'login' });
    }

    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    clearProfile();
    setCurrentScreen('login');
    toast.success('Đã đăng xuất');
  };

  const handleClaimFaucet = (tier1: number, tier2: number, tier3: number) => {
    if (!profile) return;

    updateProfile({
      tier1: profile.tier1 + tier1,
      tier2: profile.tier2 + tier2,
      tier3: profile.tier3 + tier3,
      faucetLastClaim: Date.now(),
    });
  };

  const handleMint = (useTier1: number, useTier2: number, useTier3: number, resultTier: number) => {
    if (!profile) return;

    const newRoll = {
      id: `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tier: resultTier,
      image_url: `/nft/tier${resultTier}.png`,
    };

    updateProfile({
      tier1: profile.tier1 - useTier1,
      tier2: profile.tier2 - useTier2,
      tier3: profile.tier3 - useTier3,
      chun_rolls: [...profile.chun_rolls, JSON.stringify(newRoll)],
    });
  };

  const handleClaimAchievement = (milestone: number) => {
    if (!profile) return;

    updateProfile({
      claimedAchievements: [...profile.claimedAchievements, milestone],
    });
  };

  const handleSaveSession = (sessionData: SessionData) => {
    if (!profile) return;

    const newTier1 = sessionData.isTier1Positive
      ? profile.tier1 + sessionData.deltaTier1
      : Math.max(0, profile.tier1 - sessionData.deltaTier1);

    const newTier2 = sessionData.isTier2Positive
      ? profile.tier2 + sessionData.deltaTier2
      : Math.max(0, profile.tier2 - sessionData.deltaTier2);

    const newTier3 = sessionData.isTier3Positive
      ? profile.tier3 + sessionData.deltaTier3
      : Math.max(0, profile.tier3 - sessionData.deltaTier3);

    updateProfile({
      tier1: newTier1,
      tier2: newTier2,
      tier3: newTier3,
      maxStreak: sessionData.newMaxStreak,
      currentStreak: sessionData.newCurrentStreak,
    });

    setCurrentScreen('dashboard');
  };

  if (!profile && currentScreen !== 'login') {
    setCurrentScreen('login');
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      
      <AnimatePresence mode="wait">
        {currentScreen === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoginScreen onLogin={handleLogin} />
          </motion.div>
        )}

        {currentScreen === 'dashboard' && profile && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard
              playerData={profile}
              onStartGame={() => setCurrentScreen('session')}
              onOpenFaucet={() => setCurrentScreen('faucet')}
              onOpenMint={() => setCurrentScreen('mint')}
              onOpenAchievements={() => setCurrentScreen('achievements')}
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {currentScreen === 'faucet' && profile && (
          <motion.div
            key="faucet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FaucetScreen
              onBack={() => setCurrentScreen('dashboard')}
              lastClaimTime={profile.faucetLastClaim}
              onClaim={handleClaimFaucet}
            />
          </motion.div>
        )}

        {currentScreen === 'mint' && profile && (
          <motion.div
            key="mint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MintScreen
              onBack={() => setCurrentScreen('dashboard')}
              playerData={profile}
              onMint={handleMint}
            />
          </motion.div>
        )}

        {currentScreen === 'achievements' && profile && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AchievementScreen
              onBack={() => setCurrentScreen('dashboard')}
              maxStreak={profile.maxStreak}
              claimedAchievements={profile.claimedAchievements}
              onClaim={handleClaimAchievement}
            />
          </motion.div>
        )}

        {currentScreen === 'session' && profile && (
          <motion.div
            key="session"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameSession
              onBack={() => setCurrentScreen('dashboard')}
              initialData={profile}
              onSaveSession={handleSaveSession}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
