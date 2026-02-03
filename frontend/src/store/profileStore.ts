import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlayerProfile {
  address: string;
  tier1: number;
  tier2: number;
  tier3: number;
  maxStreak: number;
  currentStreak: number;
  faucetLastClaim: number;
  claimedAchievements: number[];
  chun_rolls: string[];
}

interface ProfileStore {
  profile: PlayerProfile | null;
  setProfile: (profile: PlayerProfile) => void;
  updateProfile: (updates: Partial<PlayerProfile>) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),
      clearProfile: () => set({ profile: null }),
    }),
    {
      name: 'suichin-profile',
    }
  )
);
