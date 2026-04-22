import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useSuiProfile } from "@/hooks/useSuiProfile";

interface PlayerData {
  chun_raw: number;
  wins: number;
  losses: number;
  streak: number;
  address: string;
  last_played_ms: number;
  staked_chun?: number;
  last_faucet_ms?: number;
  objectId?: string;
  suiBalanceMist?: number;
}

interface GameContextType {
  account: any;
  authResolved: boolean;
  profile: any;
  playerData: PlayerData | null;
  loading: boolean;
  hasProfile: boolean;
  createProfile: (
    onSuccess?: () => void,
    onError?: () => void,
  ) => Promise<void>;
  reportResult: (
    isWin: boolean,
    onDone?: () => void,
    onError?: () => void,
  ) => void;
  refreshProfile: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const {
    account,
    profile,
    loading,
    hasProfile,
    suiBalanceMist,
    createProfile,
    reportResult,
    refreshProfile,
  } = useSuiProfile();

  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    if (loading) return; // Wait until useSuiProfile completes its initial fetch

    if (account) {
      setAuthResolved(true);
      return;
    }

    // Give wallet auto-connect a short window on hard refresh before redirecting.
    const timer = setTimeout(() => setAuthResolved(true), 2500);
    return () => clearTimeout(timer);
  }, [account, loading]);

  const playerData: PlayerData | null = profile
    ? {
        chun_raw: profile.chun_raw,
        wins: profile.wins,
        losses: profile.losses,
        streak: profile.streak,
        address: account?.address || "",
        last_played_ms: profile.last_played_ms,
        staked_chun: profile.staked_chun,
        last_faucet_ms: profile.last_faucet_ms,
        objectId: profile.objectId,
        suiBalanceMist,
      }
    : account
      ? {
          chun_raw: 0,
          wins: 0,
          losses: 0,
          streak: 0,
          address: account.address,
          last_played_ms: 0,
          suiBalanceMist,
        }
      : null;

  const value: GameContextType = {
    account,
    authResolved,
    profile,
    playerData,
    loading,
    hasProfile,
    createProfile,
    reportResult,
    refreshProfile,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within GameProvider");
  }
  return context;
}
