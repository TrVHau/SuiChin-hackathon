// useSession hook - React hook for game session management

import { useState, useCallback, useMemo } from "react";
import type { PlayerProfile } from "@/store/profile";
import {
  type SessionState,
  type MatchResult,
  type SessionSummary,
  createEmptySession,
  startSession as startSessionFn,
  chooseTier as chooseTierFn,
  clearChosenTier as clearChosenTierFn,
  applyMatchResult as applyMatchResultFn,
  exitSessionAndCommitToProfile,
  canChooseTier,
  getSessionSummary,
  sessionHasChuns,
  getSessionTotalChuns,
  getSessionTotalPoints,
} from "@/store/session";

interface UseSessionReturn {
  // Session state
  session: SessionState;
  isActive: boolean;
  chosenTier: 1 | 2 | 3 | null;

  // Current balances
  tier1: number;
  tier2: number;
  tier3: number;
  currentStreak: number;
  maxStreak: number;

  // Computed values
  totalChuns: number;
  totalPoints: number;
  hasChuns: boolean;
  summary: SessionSummary;

  // Actions
  startSession: (profile: PlayerProfile) => void;
  chooseTier: (tier: 1 | 2 | 3) => boolean;
  clearTier: () => void;
  applyResult: (result: MatchResult, tier?: 1 | 2 | 3) => void;
  exitSession: (profile: PlayerProfile) => PlayerProfile;
  cancelSession: () => void;

  // Helpers
  canChooseTier: (tier: 1 | 2 | 3) => boolean;
}

/**
 * React hook for managing game session
 */
export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<SessionState>(createEmptySession());

  // Computed values
  const isActive = session.isActive;
  const chosenTier = session.chosenTier;

  const totalChuns = useMemo(() => getSessionTotalChuns(session), [session]);

  const totalPoints = useMemo(() => getSessionTotalPoints(session), [session]);

  const hasChuns = useMemo(() => sessionHasChuns(session), [session]);

  const summary = useMemo(() => getSessionSummary(session), [session]);

  // Actions
  const startSession = useCallback((profile: PlayerProfile) => {
    const newSession = startSessionFn(profile);
    setSession(newSession);
  }, []);

  const chooseTier = useCallback(
    (tier: 1 | 2 | 3): boolean => {
      const updated = chooseTierFn(session, tier);
      if (updated) {
        setSession(updated);
        return true;
      }
      return false;
    },
    [session],
  );

  const clearTier = useCallback(() => {
    setSession((prev) => clearChosenTierFn(prev));
  }, []);

  const applyResult = useCallback((result: MatchResult, tier?: 1 | 2 | 3) => {
    setSession((prev) => applyMatchResultFn(prev, result, tier));
  }, []);

  const exitSession = useCallback(
    (profile: PlayerProfile): PlayerProfile => {
      const updatedProfile = exitSessionAndCommitToProfile(session, profile);
      setSession(createEmptySession());
      return updatedProfile;
    },
    [session],
  );

  const cancelSession = useCallback(() => {
    setSession(createEmptySession());
  }, []);

  const checkCanChooseTier = useCallback(
    (tier: 1 | 2 | 3): boolean => canChooseTier(session, tier),
    [session],
  );

  return {
    // State
    session,
    isActive,
    chosenTier,

    // Current balances
    tier1: session.tier1,
    tier2: session.tier2,
    tier3: session.tier3,
    currentStreak: session.current_streak,
    maxStreak: session.max_streak,

    // Computed
    totalChuns,
    totalPoints,
    hasChuns,
    summary,

    // Actions
    startSession,
    chooseTier,
    clearTier,
    applyResult,
    exitSession,
    cancelSession,

    // Helpers
    canChooseTier: checkCanChooseTier,
  };
}

// Re-export types for convenience
export type { SessionState, MatchResult, SessionSummary };
export { getSessionSummary, sessionHasChuns };
