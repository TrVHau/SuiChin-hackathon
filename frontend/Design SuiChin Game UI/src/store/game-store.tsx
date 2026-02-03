// Game state store using React Context

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react";
import type { PlayerProfile, SessionStats, MatchResult } from "@/game/types";
import {
  loadProfile,
  saveProfile,
  createDefaultProfile,
  loadSessionStats,
  saveSessionStats,
  clearSessionStats,
  createDefaultSessionStats,
} from "./storage";

// State types
interface GameStoreState {
  profile: PlayerProfile | null;
  session: SessionStats | null;
  isLoggedIn: boolean;
  isSessionActive: boolean;
  selectedTier: number | null;
}

// Action types
type GameStoreAction =
  | { type: "LOGIN"; payload: PlayerProfile }
  | { type: "LOGOUT" }
  | { type: "UPDATE_PROFILE"; payload: Partial<PlayerProfile> }
  | { type: "START_SESSION" }
  | { type: "END_SESSION" }
  | { type: "SELECT_TIER"; payload: number }
  | { type: "CLEAR_TIER" }
  | { type: "MATCH_RESULT"; payload: { result: MatchResult; tier: number } }
  | {
      type: "CLAIM_FAUCET";
      payload: { tier1: number; tier2: number; tier3: number };
    }
  | {
      type: "MINT_NFT";
      payload: { tier1: number; tier2: number; tier3: number };
    }
  | { type: "CLAIM_ACHIEVEMENT"; payload: number };

// Initial state
const initialState: GameStoreState = {
  profile: null,
  session: null,
  isLoggedIn: false,
  isSessionActive: false,
  selectedTier: null,
};

// Reducer
function gameStoreReducer(
  state: GameStoreState,
  action: GameStoreAction,
): GameStoreState {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        profile: action.payload,
        isLoggedIn: true,
      };

    case "LOGOUT":
      return {
        ...initialState,
      };

    case "UPDATE_PROFILE":
      if (!state.profile) return state;
      return {
        ...state,
        profile: { ...state.profile, ...action.payload },
      };

    case "START_SESSION":
      if (!state.profile) return state;
      return {
        ...state,
        session: {
          tier1: state.profile.tier1,
          tier2: state.profile.tier2,
          tier3: state.profile.tier3,
          currentStreak: state.profile.currentStreak,
          maxStreak: state.profile.maxStreak,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
        },
        isSessionActive: true,
      };

    case "END_SESSION":
      if (!state.profile || !state.session) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          tier1: state.session.tier1,
          tier2: state.session.tier2,
          tier3: state.session.tier3,
          currentStreak: state.session.currentStreak,
          maxStreak: state.session.maxStreak,
          totalGamesPlayed:
            state.profile.totalGamesPlayed + state.session.gamesPlayed,
          totalWins: state.profile.totalWins + state.session.wins,
        },
        session: null,
        isSessionActive: false,
        selectedTier: null,
      };

    case "SELECT_TIER":
      return {
        ...state,
        selectedTier: action.payload,
      };

    case "CLEAR_TIER":
      return {
        ...state,
        selectedTier: null,
      };

    case "MATCH_RESULT": {
      if (!state.session) return state;

      const { result, tier } = action.payload;
      const newSession = { ...state.session };

      newSession.gamesPlayed++;

      if (result === "win") {
        newSession.wins++;
        if (tier === 1) newSession.tier1++;
        else if (tier === 2) newSession.tier2++;
        else if (tier === 3) newSession.tier3++;

        newSession.currentStreak++;
        newSession.maxStreak = Math.max(
          newSession.maxStreak,
          newSession.currentStreak,
        );
      } else if (result === "lose") {
        newSession.losses++;
        if (tier === 1 && newSession.tier1 > 0) newSession.tier1--;
        else if (tier === 2 && newSession.tier2 > 0) newSession.tier2--;
        else if (tier === 3 && newSession.tier3 > 0) newSession.tier3--;

        newSession.currentStreak = 0;
      }
      // Draw: no changes

      return {
        ...state,
        session: newSession,
        selectedTier: null,
      };
    }

    case "CLAIM_FAUCET":
      if (!state.profile) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          tier1: state.profile.tier1 + action.payload.tier1,
          tier2: state.profile.tier2 + action.payload.tier2,
          tier3: state.profile.tier3 + action.payload.tier3,
          faucetLastClaim: Date.now(),
        },
      };

    case "MINT_NFT":
      if (!state.profile) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          tier1: state.profile.tier1 - action.payload.tier1,
          tier2: state.profile.tier2 - action.payload.tier2,
          tier3: state.profile.tier3 - action.payload.tier3,
        },
      };

    case "CLAIM_ACHIEVEMENT":
      if (!state.profile) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          claimedAchievements: [
            ...state.profile.claimedAchievements,
            action.payload,
          ],
        },
      };

    default:
      return state;
  }
}

// Context
interface GameStoreContextValue {
  state: GameStoreState;
  dispatch: React.Dispatch<GameStoreAction>;

  // Helper actions
  login: () => Promise<void>;
  logout: () => void;
  startSession: () => void;
  endSession: () => void;
  selectTier: (tier: number) => void;
  clearTier: () => void;
  reportMatchResult: (result: MatchResult, tier: number) => void;
  claimFaucet: (tier1: number, tier2: number, tier3: number) => void;
  mintNFT: (tier1: number, tier2: number, tier3: number) => void;
  claimAchievement: (milestone: number) => void;
}

const GameStoreContext = createContext<GameStoreContextValue | null>(null);

// Provider
export function GameStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameStoreReducer, initialState);

  // Load profile on mount
  useEffect(() => {
    const savedProfile = loadProfile();
    if (savedProfile) {
      dispatch({ type: "LOGIN", payload: savedProfile });
    }
  }, []);

  // Save profile on changes
  useEffect(() => {
    if (state.profile) {
      saveProfile(state.profile);
    }
  }, [state.profile]);

  // Save session on changes
  useEffect(() => {
    if (state.session) {
      saveSessionStats(state.session);
    } else {
      clearSessionStats();
    }
  }, [state.session]);

  // Helper actions
  const login = async () => {
    // Simulate login delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let profile = loadProfile();
    if (!profile) {
      profile = createDefaultProfile();
    }

    dispatch({ type: "LOGIN", payload: profile });
  };

  const logout = () => {
    dispatch({ type: "LOGOUT" });
  };

  const startSession = () => {
    dispatch({ type: "START_SESSION" });
  };

  const endSession = () => {
    dispatch({ type: "END_SESSION" });
  };

  const selectTier = (tier: number) => {
    dispatch({ type: "SELECT_TIER", payload: tier });
  };

  const clearTier = () => {
    dispatch({ type: "CLEAR_TIER" });
  };

  const reportMatchResult = (result: MatchResult, tier: number) => {
    if (result) {
      dispatch({ type: "MATCH_RESULT", payload: { result, tier } });
    }
  };

  const claimFaucet = (tier1: number, tier2: number, tier3: number) => {
    dispatch({ type: "CLAIM_FAUCET", payload: { tier1, tier2, tier3 } });
  };

  const mintNFT = (tier1: number, tier2: number, tier3: number) => {
    dispatch({ type: "MINT_NFT", payload: { tier1, tier2, tier3 } });
  };

  const claimAchievement = (milestone: number) => {
    dispatch({ type: "CLAIM_ACHIEVEMENT", payload: milestone });
  };

  const value: GameStoreContextValue = {
    state,
    dispatch,
    login,
    logout,
    startSession,
    endSession,
    selectTier,
    clearTier,
    reportMatchResult,
    claimFaucet,
    mintNFT,
    claimAchievement,
  };

  return (
    <GameStoreContext.Provider value={value}>
      {children}
    </GameStoreContext.Provider>
  );
}

// Hook
export function useGameStore(): GameStoreContextValue {
  const context = useContext(GameStoreContext);
  if (!context) {
    throw new Error("useGameStore must be used within GameStoreProvider");
  }
  return context;
}
