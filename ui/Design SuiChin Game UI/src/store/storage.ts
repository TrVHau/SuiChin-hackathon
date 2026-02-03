// Local storage utilities for profile/session persistence

import type { PlayerProfile, SessionStats } from "@/game/types";

const STORAGE_KEYS = {
  PROFILE: "suichin_profile",
  SESSION: "suichin_session",
  SETTINGS: "suichin_settings",
} as const;

/**
 * Default player profile
 */
export function createDefaultProfile(): PlayerProfile {
  return {
    address: "0x" + Math.random().toString(16).slice(2, 42),
    tier1: 0,
    tier2: 0,
    tier3: 0,
    maxStreak: 0,
    currentStreak: 0,
    faucetLastClaim: Date.now() - 20 * 60 * 60 * 1000, // 20 hours ago
    claimedAchievements: [],
    totalGamesPlayed: 0,
    totalWins: 0,
  };
}

/**
 * Load player profile from localStorage
 */
export function loadProfile(): PlayerProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Ensure backwards compatibility with new fields
    return {
      ...createDefaultProfile(),
      ...parsed,
    };
  } catch (error) {
    console.error("Failed to load profile:", error);
    return null;
  }
}

/**
 * Save player profile to localStorage
 */
export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to save profile:", error);
  }
}

/**
 * Clear player profile from localStorage
 */
export function clearProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
  } catch (error) {
    console.error("Failed to clear profile:", error);
  }
}

/**
 * Session stats for current game session
 */
export function createDefaultSessionStats(): SessionStats {
  return {
    tier1: 0,
    tier2: 0,
    tier3: 0,
    currentStreak: 0,
    maxStreak: 0,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
  };
}

/**
 * Load session stats from localStorage
 */
export function loadSessionStats(): SessionStats | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!stored) return null;

    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to load session:", error);
    return null;
  }
}

/**
 * Save session stats to localStorage
 */
export function saveSessionStats(stats: SessionStats): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(stats));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

/**
 * Clear session stats from localStorage
 */
export function clearSessionStats(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
}

/**
 * Game settings
 */
export interface GameSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showTutorial: boolean;
}

export function createDefaultSettings(): GameSettings {
  return {
    soundEnabled: true,
    vibrationEnabled: true,
    showTutorial: true,
  };
}

export function loadSettings(): GameSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!stored) return createDefaultSettings();

    return {
      ...createDefaultSettings(),
      ...JSON.parse(stored),
    };
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}
