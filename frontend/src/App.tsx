import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import LoginScreen from '@/components/LoginScreen';
import Dashboard from '@/components/Dashboard';
import FaucetScreen from '@/components/FaucetScreen';
import MintScreen from '@/components/MintScreen';
import AchievementScreen from '@/components/AchievementScreen';
import GameSession, { SessionData } from '@/components/GameSession';
import { useSuiProfile } from '@/hooks/useSuiProfile';

type Screen = 'login' | 'dashboard' | 'faucet' | 'mint' | 'achievements' | 'session';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const {
    account,
    profile,
    hasProfile,
    createProfile,
    recordSession,
    claimFaucet,
    craftRoll,
    claimAchievement,
  } = useSuiProfile();

  const handleLogin = async () => {
    if (!account) {
      toast.error('Vui lòng kết nối ví trước');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    if (hasProfile && profile) {
      toast.success('Chào mừng trở lại!');
      setCurrentScreen('dashboard');
    } else {
      toast.loading('Chưa có profile. Đang tạo mới...', { id: 'createProfile' });
      createProfile();
      
      setTimeout(() => {
        toast.success('Tạo profile thành công!', { id: 'createProfile' });
        setCurrentScreen('dashboard');
      }, 4000);
    }
  };

  const handleLogout = () => {
    setCurrentScreen('login');
    toast.success('Đã đăng xuất');
  };

  const handleClaimFaucet = () => {
    claimFaucet();
  };

  const handleMint = (useTier1: number, useTier2: number, useTier3: number) => {
    craftRoll(useTier1, useTier2, useTier3);
  };

  const handleClaimAchievement = (milestone: number) => {
    claimAchievement(milestone);
  };

  const handleSaveSession = (sessionData: SessionData) => {
    if (!profile) return;

    recordSession(
      sessionData.deltaTier1,
      sessionData.deltaTier2,
      sessionData.deltaTier3,
      sessionData.isTier1Positive,
      sessionData.isTier2Positive,
      sessionData.isTier3Positive,
      sessionData.newMaxStreak,
      sessionData.newCurrentStreak
    );

    setCurrentScreen('dashboard');
  };

  if (!account && currentScreen !== 'login') {
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
              playerData={{
                tier1: profile.tier1,
                tier2: profile.tier2,
                tier3: profile.tier3,
                maxStreak: profile.maxStreak,
                currentStreak: profile.currentStreak,
                address: account?.address || '',
              }}
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
              playerData={{
                tier1: profile.tier1,
                tier2: profile.tier2,
                tier3: profile.tier3,
              }}
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
              claimedAchievements={profile.achievements}
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
              initialData={{
                tier1: profile.tier1,
                tier2: profile.tier2,
                tier3: profile.tier3,
                maxStreak: profile.maxStreak,
                currentStreak: profile.currentStreak,
              }}
              onSaveSession={handleSaveSession}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
