import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CUON_CHUN_TYPE, SCRAP_TYPE, BADGE_TYPE } from "@/config/sui.config";
import { useGameStore } from "@/stores/gameStore";

export interface CuonChunNFT {
  objectId: string;
  tier: number;     // 1=Bronze, 2=Silver, 3=Gold
  variant: number;  // 1-based skin index
  name: string;
  image_url: string;
}

export interface ScrapItem {
  objectId: string;
  name: string;
  image_url: string;
}

export interface AchievementBadgeItem {
  objectId: string;
  badge_type: number; // 1 | 5 | 18 | 36 | 67
  name: string;
  description: string;
  image_url: string;
  earned_at: number;
}

export interface OwnedNFTs {
  cuonChuns: CuonChunNFT[];
  scraps: ScrapItem[];
  badges: AchievementBadgeItem[];
  loading: boolean;
  refetch: () => void;
}

export function useOwnedNFTs(): OwnedNFTs {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const setStoreNFTs = useGameStore((s) => s.setOwnedNFTs);
  const setStoreScraps = useGameStore((s) => s.setScraps);
  const setStoreBadges = useGameStore((s) => s.setBadges);

  const [cuonChuns, setCuonChuns] = useState<CuonChunNFT[]>([]);
  const [scraps, setScraps] = useState<ScrapItem[]>([]);
  const [badges, setBadges] = useState<AchievementBadgeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!account?.address) return;

    setLoading(true);
    try {
      const [nftRes, scrapRes, badgeRes] = await Promise.all([
        suiClient.getOwnedObjects({
          owner: account.address,
          filter: { StructType: CUON_CHUN_TYPE },
          options: { showContent: true },
        }),
        suiClient.getOwnedObjects({
          owner: account.address,
          filter: { StructType: SCRAP_TYPE },
          options: { showContent: true },
        }),
        suiClient.getOwnedObjects({
          owner: account.address,
          filter: { StructType: BADGE_TYPE },
          options: { showContent: true },
        }),
      ]);

      const mapNFT = (
        obj: (typeof nftRes.data)[number],
      ): CuonChunNFT | null => {
        const content = obj.data?.content;
        if (!content || !("fields" in content) || !obj.data) return null;
        const f = content.fields as Record<string, unknown>;
        return {
          objectId: obj.data.objectId,
          tier: Number(f.tier ?? 1),
          variant: Number(f.variant ?? 1),
          name: String(f.name ?? ""),
          image_url: String(f.image_url ?? ""),
        };
      };

      const mapScrap = (
        obj: (typeof scrapRes.data)[number],
      ): ScrapItem | null => {
        const content = obj.data?.content;
        if (!content || !("fields" in content) || !obj.data) return null;
        const f = content.fields as Record<string, unknown>;
        return {
          objectId: obj.data.objectId,
          name: String(f.name ?? "Scrap"),
          image_url: String(f.image_url ?? ""),
        };
      };

      const mapBadge = (
        obj: (typeof badgeRes.data)[number],
      ): AchievementBadgeItem | null => {
        const content = obj.data?.content;
        if (!content || !("fields" in content) || !obj.data) return null;
        const f = content.fields as Record<string, unknown>;
        return {
          objectId: obj.data.objectId,
          badge_type: Number(f.badge_type ?? 0),
          name: String(f.name ?? ""),
          description: String(f.description ?? ""),
          image_url: String(f.image_url ?? ""),
          earned_at: Number(f.earned_at ?? 0),
        };
      };

      const parsedNFTs = nftRes.data
        .map(mapNFT)
        .filter(Boolean) as CuonChunNFT[];
      const parsedScraps = scrapRes.data
        .map(mapScrap)
        .filter(Boolean) as ScrapItem[];
      const parsedBadges = badgeRes.data
        .map(mapBadge)
        .filter(Boolean) as AchievementBadgeItem[];

      setCuonChuns(parsedNFTs);
      setScraps(parsedScraps);
      setBadges(parsedBadges);
      setStoreNFTs(parsedNFTs);
      setStoreScraps(parsedScraps);
      setStoreBadges(parsedBadges);
    } catch (error) {
      console.error("Error fetching owned NFTs:", error);
      toast.error("Không thể tải NFT");
    } finally {
      setLoading(false);
    }
  }, [account?.address, suiClient]);

  useEffect(() => {
    if (account?.address) {
      fetchAll();
    } else {
      setCuonChuns([]);
      setScraps([]);
      setBadges([]);
    }
  }, [account?.address]);

  return { cuonChuns, scraps, badges, loading, refetch: fetchAll };
}
