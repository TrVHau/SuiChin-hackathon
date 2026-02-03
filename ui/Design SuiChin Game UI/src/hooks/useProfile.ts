// useProfile hook - React hook for profile management

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  type PlayerProfile,
  loadProfile,
  saveProfile,
  getOrCreateProfile,
  deleteProfile,
  computeTotalPoints,
  computeTotalChuns,
  hasChuns,
  canPlayTier,
  applyMatchResult,
} from "@/store/profile";

interface UseProfileReturn {
  // Profile state
  profile: PlayerProfile | null;
  isLoading: boolean;
  isLoggedIn: boolean;

  // Computed values
  totalPoints: number;
  totalChuns: number;
  canPlay: boolean;

  // Actions
  login: () => PlayerProfile;
  logout: () => void;
  updateProfile: (updates: Partial<PlayerProfile>) => void;
  refreshProfile: () => void;

  // Game helpers
  canPlayTier: (tier: number) => boolean;
  recordMatchResult: (tier: number, won: boolean) => void;

  // Faucet helpers
  claimFaucet: (tier1: number, tier2: number, tier3: number) => void;
  canClaimFaucet: (cooldownMs: number) => boolean;
  getNextFaucetTime: (cooldownMs: number) => number;

  // Achievement helpers
  claimAchievement: (milestone: number) => void;
  hasClaimedAchievement: (milestone: number) => boolean;
}

/**
 * React hook for managing player profile
 */
export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile on mount
  useEffect(() => {
    const existing = loadProfile();
    setProfile(existing);
    setIsLoading(false);
  }, []);

  // Save profile whenever it changes
  useEffect(() => {
    if (profile) {
      saveProfile(profile);
    }
  }, [profile]);

  // Computed values
  const totalPoints = useMemo(
    () => (profile ? computeTotalPoints(profile) : 0),
    [profile],
  );

  const totalChuns = useMemo(
    () => (profile ? computeTotalChuns(profile) : 0),
    [profile],
  );

  const canPlay = useMemo(
    () => (profile ? hasChuns(profile) : false),
    [profile],
  );

  const isLoggedIn = profile !== null;

  // Actions
  const login = useCallback((): PlayerProfile => {
    const p = getOrCreateProfile();
    setProfile(p);
    return p;
  }, []);

  const logout = useCallback(() => {
    deleteProfile();
    setProfile(null);
  }, []);

  const updateProfile = useCallback((updates: Partial<PlayerProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      return updated;
    });
  }, []);

  const refreshProfile = useCallback(() => {
    const existing = loadProfile();
    setProfile(existing);
  }, []);

  // Game helpers
  const checkCanPlayTier = useCallback(
    (tier: number): boolean => {
      if (!profile) return false;
      return canPlayTier(profile, tier);
    },
    [profile],
  );

  const recordMatchResult = useCallback((tier: number, won: boolean) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return applyMatchResult(prev, tier, won);
    });
  }, []);

  // Faucet helpers
  const claimFaucet = useCallback(
    (tier1: number, tier2: number, tier3: number) => {
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tier1: prev.tier1 + tier1,
          tier2: prev.tier2 + tier2,
          tier3: prev.tier3 + tier3,
          faucet_last_claim: Date.now(),
        };
      });
    },
    [],
  );

  const checkCanClaimFaucet = useCallback(
    (cooldownMs: number): boolean => {
      if (!profile) return false;
      const elapsed = Date.now() - profile.faucet_last_claim;
      return elapsed >= cooldownMs;
    },
    [profile],
  );

  const getNextFaucetTime = useCallback(
    (cooldownMs: number): number => {
      if (!profile) return 0;
      const nextTime = profile.faucet_last_claim + cooldownMs;
      return Math.max(0, nextTime - Date.now());
    },
    [profile],
  );

  // Achievement helpers
  const claimAchievement = useCallback((milestone: number) => {
    setProfile((prev) => {
      if (!prev) return prev;
      if (prev.achievements.includes(milestone)) return prev;
      return {
        ...prev,
        achievements: [...prev.achievements, milestone],
      };
    });
  }, []);

  const checkHasClaimedAchievement = useCallback(
    (milestone: number): boolean => {
      if (!profile) return false;
      return profile.achievements.includes(milestone);
    },
    [profile],
  );

  return {
    // State
    profile,
    isLoading,
    isLoggedIn,

    // Computed
    totalPoints,
    totalChuns,
    canPlay,

    // Actions
    login,
    logout,
    updateProfile,
    refreshProfile,

    // Game helpers
    canPlayTier: checkCanPlayTier,
    recordMatchResult,

    // Faucet helpers
    claimFaucet,
    canClaimFaucet: checkCanClaimFaucet,
    getNextFaucetTime,

    // Achievement helpers
    claimAchievement,
    hasClaimedAchievement: checkHasClaimedAchievement,
  };
}

// Re-export types and utility functions for convenience
export type { PlayerProfile };
export { computeTotalPoints, computeTotalChuns, hasChuns, canPlayTier };
