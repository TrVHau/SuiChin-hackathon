import { useProfileStore } from '@/store/profileStore';

export const useProfile = () => {
  const { profile, setProfile, updateProfile, clearProfile } = useProfileStore();

  const createProfile = (address: string) => {
    const newProfile = {
      address,
      tier1: 0,
      tier2: 0,
      tier3: 0,
      maxStreak: 0,
      currentStreak: 0,
      faucetLastClaim: Date.now() - 24 * 60 * 60 * 1000, // 24h ago for instant claim
      claimedAchievements: [],
      chun_rolls: [],
    };
    setProfile(newProfile);
    return newProfile;
  };

  return {
    profile,
    setProfile,
    updateProfile,
    clearProfile,
    createProfile,
  };
};
