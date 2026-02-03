// Profile management - localStorage persistence for player data

const PROFILE_STORAGE_KEY = "suichin_profile";

/**
 * Player profile interface
 */
export interface PlayerProfile {
  address: string;
  tier1: number;
  tier2: number;
  tier3: number;
  current_streak: number;
  max_streak: number;
  faucet_last_claim: number;
  achievements: number[];
  chun_rolls: string[]; // NFT roll IDs
}

/**
 * Default profile values
 */
export function createDefaultProfile(): PlayerProfile {
  return {
    address: generateRandomAddress(),
    tier1: 0,
    tier2: 0,
    tier3: 0,
    current_streak: 0,
    max_streak: 0,
    faucet_last_claim: 0,
    achievements: [],
    chun_rolls: [],
  };
}

/**
 * Generate a random wallet-like address
 */
function generateRandomAddress(): string {
  const chars = "0123456789abcdef";
  let address = "0x";
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

/**
 * Load profile from localStorage
 * @returns PlayerProfile if found, null otherwise
 */
export function loadProfile(): PlayerProfile | null {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    // Validate required fields exist
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    // Merge with defaults to ensure all fields exist (backwards compatibility)
    const defaults = createDefaultProfile();
    return {
      ...defaults,
      ...parsed,
      // Ensure arrays are arrays
      achievements: Array.isArray(parsed.achievements)
        ? parsed.achievements
        : defaults.achievements,
      chun_rolls: Array.isArray(parsed.chun_rolls)
        ? parsed.chun_rolls
        : defaults.chun_rolls,
    };
  } catch (error) {
    console.error("Failed to load profile from localStorage:", error);
    return null;
  }
}

/**
 * Save profile to localStorage
 * @param profile The profile to save
 */
export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Failed to save profile to localStorage:", error);
  }
}

/**
 * Get existing profile or create a new one
 * @returns PlayerProfile (existing or newly created)
 */
export function getOrCreateProfile(): PlayerProfile {
  const existing = loadProfile();
  if (existing) {
    return existing;
  }

  const newProfile = createDefaultProfile();
  saveProfile(newProfile);
  return newProfile;
}

/**
 * Delete profile from localStorage
 */
export function deleteProfile(): void {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to delete profile:", error);
  }
}

/**
 * Compute total points from profile tiers
 * Tier 1 = 1 point, Tier 2 = 2 points, Tier 3 = 3 points
 * @param profile The player profile
 * @returns Total points
 */
export function computeTotalPoints(profile: PlayerProfile): number {
  return profile.tier1 * 1 + profile.tier2 * 2 + profile.tier3 * 3;
}

/**
 * Compute total chun count
 * @param profile The player profile
 * @returns Total chun count
 */
export function computeTotalChuns(profile: PlayerProfile): number {
  return profile.tier1 + profile.tier2 + profile.tier3;
}

/**
 * Check if profile has any chuns to play
 * @param profile The player profile
 * @returns true if player has at least one chun
 */
export function hasChuns(profile: PlayerProfile): boolean {
  return computeTotalChuns(profile) > 0;
}

/**
 * Check if player can play a specific tier
 * @param profile The player profile
 * @param tier The tier to check (1, 2, or 3)
 * @returns true if player has chuns of that tier
 */
export function canPlayTier(profile: PlayerProfile, tier: number): boolean {
  switch (tier) {
    case 1:
      return profile.tier1 > 0;
    case 2:
      return profile.tier2 > 0;
    case 3:
      return profile.tier3 > 0;
    default:
      return false;
  }
}

/**
 * Update profile after a match result
 * @param profile Current profile
 * @param tier The tier that was played
 * @param won Whether the player won
 * @returns Updated profile (does not save automatically)
 */
export function applyMatchResult(
  profile: PlayerProfile,
  tier: number,
  won: boolean,
): PlayerProfile {
  const updated = { ...profile };

  if (won) {
    // Win: +1 chun of that tier, increment streak
    if (tier === 1) updated.tier1++;
    else if (tier === 2) updated.tier2++;
    else if (tier === 3) updated.tier3++;

    updated.current_streak++;
    updated.max_streak = Math.max(updated.max_streak, updated.current_streak);
  } else {
    // Lose: -1 chun of that tier (if available), reset streak
    if (tier === 1 && updated.tier1 > 0) updated.tier1--;
    else if (tier === 2 && updated.tier2 > 0) updated.tier2--;
    else if (tier === 3 && updated.tier3 > 0) updated.tier3--;

    updated.current_streak = 0;
  }

  return updated;
}
