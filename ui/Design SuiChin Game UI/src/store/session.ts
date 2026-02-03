// Session management - tracks in-game session state separately from profile

import type { PlayerProfile } from "./profile";
import { saveProfile } from "./profile";

/**
 * Match result type
 */
export type MatchResult = "WIN" | "LOSE";

/**
 * Session state interface
 * Tracks local balances during a game session before committing to profile
 */
export interface SessionState {
  // Session status
  isActive: boolean;

  // Local balances (copied from profile at session start)
  tier1: number;
  tier2: number;
  tier3: number;
  current_streak: number;
  max_streak: number;

  // Currently chosen tier for the round (null if not chosen)
  chosenTier: 1 | 2 | 3 | null;

  // Session statistics
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;

  // Delta tracking (changes from original profile)
  deltaTier1: number;
  deltaTier2: number;
  deltaTier3: number;

  // Original snapshot for reference
  originalSnapshot: {
    tier1: number;
    tier2: number;
    tier3: number;
    current_streak: number;
    max_streak: number;
  } | null;
}

/**
 * Create initial empty session state
 */
export function createEmptySession(): SessionState {
  return {
    isActive: false,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    current_streak: 0,
    max_streak: 0,
    chosenTier: null,
    roundsPlayed: 0,
    roundsWon: 0,
    roundsLost: 0,
    deltaTier1: 0,
    deltaTier2: 0,
    deltaTier3: 0,
    originalSnapshot: null,
  };
}

/**
 * Start a new session from profile snapshot
 * @param profile The player profile to snapshot
 * @returns New active session state
 */
export function startSession(profile: PlayerProfile): SessionState {
  return {
    isActive: true,
    tier1: profile.tier1,
    tier2: profile.tier2,
    tier3: profile.tier3,
    current_streak: profile.current_streak,
    max_streak: profile.max_streak,
    chosenTier: null,
    roundsPlayed: 0,
    roundsWon: 0,
    roundsLost: 0,
    deltaTier1: 0,
    deltaTier2: 0,
    deltaTier3: 0,
    originalSnapshot: {
      tier1: profile.tier1,
      tier2: profile.tier2,
      tier3: profile.tier3,
      current_streak: profile.current_streak,
      max_streak: profile.max_streak,
    },
  };
}

/**
 * Check if player can choose a specific tier
 * @param session Current session state
 * @param tier The tier to check
 * @returns true if player has at least 1 chun of that tier
 */
export function canChooseTier(session: SessionState, tier: 1 | 2 | 3): boolean {
  if (!session.isActive) return false;

  switch (tier) {
    case 1:
      return session.tier1 > 0;
    case 2:
      return session.tier2 > 0;
    case 3:
      return session.tier3 > 0;
    default:
      return false;
  }
}

/**
 * Choose a tier for the current round
 * @param session Current session state
 * @param tier The tier to choose (1, 2, or 3)
 * @returns Updated session state, or null if invalid choice
 */
export function chooseTier(
  session: SessionState,
  tier: 1 | 2 | 3,
): SessionState | null {
  if (!session.isActive) {
    console.error("Cannot choose tier: session not active");
    return null;
  }

  if (!canChooseTier(session, tier)) {
    console.error(`Cannot choose tier ${tier}: insufficient chuns`);
    return null;
  }

  return {
    ...session,
    chosenTier: tier,
  };
}

/**
 * Clear the chosen tier (e.g., after a round ends)
 * @param session Current session state
 * @returns Updated session state
 */
export function clearChosenTier(session: SessionState): SessionState {
  return {
    ...session,
    chosenTier: null,
  };
}

/**
 * Apply match result to session
 * @param session Current session state
 * @param result WIN or LOSE
 * @param tier The tier that was played (uses chosenTier if not provided)
 * @returns Updated session state
 */
export function applyMatchResult(
  session: SessionState,
  result: MatchResult,
  tier?: 1 | 2 | 3,
): SessionState {
  if (!session.isActive) {
    console.error("Cannot apply result: session not active");
    return session;
  }

  const playedTier = tier ?? session.chosenTier;
  if (!playedTier) {
    console.error("Cannot apply result: no tier chosen");
    return session;
  }

  const updated = { ...session };
  updated.roundsPlayed++;

  if (result === "WIN") {
    // WIN: +1 chun of chosen tier, streak +1
    updated.roundsWon++;

    switch (playedTier) {
      case 1:
        updated.tier1++;
        updated.deltaTier1++;
        break;
      case 2:
        updated.tier2++;
        updated.deltaTier2++;
        break;
      case 3:
        updated.tier3++;
        updated.deltaTier3++;
        break;
    }

    updated.current_streak++;
    updated.max_streak = Math.max(updated.max_streak, updated.current_streak);
  } else {
    // LOSE: -1 chun of chosen tier (min 0), reset streak
    updated.roundsLost++;

    switch (playedTier) {
      case 1:
        if (updated.tier1 > 0) {
          updated.tier1--;
          updated.deltaTier1--;
        }
        break;
      case 2:
        if (updated.tier2 > 0) {
          updated.tier2--;
          updated.deltaTier2--;
        }
        break;
      case 3:
        if (updated.tier3 > 0) {
          updated.tier3--;
          updated.deltaTier3--;
        }
        break;
    }

    // Update max_streak before resetting current
    updated.max_streak = Math.max(updated.max_streak, updated.current_streak);
    updated.current_streak = 0;
  }

  // Clear chosen tier after applying result
  updated.chosenTier = null;

  return updated;
}

/**
 * Exit session and commit changes to profile
 * @param session Current session state
 * @param profile The player profile to update
 * @returns Updated profile with session changes committed
 */
export function exitSessionAndCommitToProfile(
  session: SessionState,
  profile: PlayerProfile,
): PlayerProfile {
  if (!session.isActive) {
    console.warn("Session not active, returning profile unchanged");
    return profile;
  }

  const updatedProfile: PlayerProfile = {
    ...profile,
    tier1: session.tier1,
    tier2: session.tier2,
    tier3: session.tier3,
    current_streak: session.current_streak,
    max_streak: session.max_streak,
  };

  // Persist to localStorage
  saveProfile(updatedProfile);

  return updatedProfile;
}

/**
 * Get session summary for display
 */
export interface SessionSummary {
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;
  netTier1: number;
  netTier2: number;
  netTier3: number;
  netTotal: number;
  peakStreak: number;
}

/**
 * Get summary of session results
 * @param session Current session state
 * @returns Session summary
 */
export function getSessionSummary(session: SessionState): SessionSummary {
  return {
    roundsPlayed: session.roundsPlayed,
    roundsWon: session.roundsWon,
    roundsLost: session.roundsLost,
    netTier1: session.deltaTier1,
    netTier2: session.deltaTier2,
    netTier3: session.deltaTier3,
    netTotal: session.deltaTier1 + session.deltaTier2 + session.deltaTier3,
    peakStreak: session.max_streak,
  };
}

/**
 * Check if session has any chuns left to play
 * @param session Current session state
 * @returns true if at least one tier has chuns
 */
export function sessionHasChuns(session: SessionState): boolean {
  return session.tier1 > 0 || session.tier2 > 0 || session.tier3 > 0;
}

/**
 * Get total chuns in session
 * @param session Current session state
 * @returns Total chun count
 */
export function getSessionTotalChuns(session: SessionState): number {
  return session.tier1 + session.tier2 + session.tier3;
}

/**
 * Compute total points in session
 * @param session Current session state
 * @returns Total points (tier1*1 + tier2*2 + tier3*3)
 */
export function getSessionTotalPoints(session: SessionState): number {
  return session.tier1 * 1 + session.tier2 * 2 + session.tier3 * 3;
}
