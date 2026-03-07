import { create } from "zustand";
import type { PlayerProfileData } from "@/hooks/useSuiProfile";
import type {
  CuonChunNFT,
  ScrapItem,
  AchievementBadgeItem,
} from "@/hooks/useOwnedNFTs";
import type { ListingMeta } from "@/hooks/useMarketplace";

interface GameStore {
  // State
  profile: PlayerProfileData | null;
  ownedNFTs: CuonChunNFT[];
  scraps: ScrapItem[];
  badges: AchievementBadgeItem[];
  listings: ListingMeta[];

  // Setters — called by hooks after fetching data
  setProfile: (profile: PlayerProfileData | null) => void;
  setOwnedNFTs: (nfts: CuonChunNFT[]) => void;
  setScraps: (scraps: ScrapItem[]) => void;
  setBadges: (badges: AchievementBadgeItem[]) => void;
  setListings: (listings: ListingMeta[]) => void;

  // Derived helpers
  bronzeCount: () => number;
  silverCount: () => number;
  goldCount: () => number;
}

export const useGameStore = create<GameStore>((set, get) => ({
  profile: null,
  ownedNFTs: [],
  scraps: [],
  badges: [],
  listings: [],

  setProfile: (profile) => set({ profile }),
  setOwnedNFTs: (ownedNFTs) => set({ ownedNFTs }),
  setScraps: (scraps) => set({ scraps }),
  setBadges: (badges) => set({ badges }),
  setListings: (listings) => set({ listings }),

  bronzeCount: () => get().ownedNFTs.filter((n) => n.tier === 1).length,
  silverCount: () => get().ownedNFTs.filter((n) => n.tier === 2).length,
  goldCount: () => get().ownedNFTs.filter((n) => n.tier === 3).length,
}));
