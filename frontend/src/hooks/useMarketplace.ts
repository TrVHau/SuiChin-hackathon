import { useSuiClient } from "@mysten/dapp-kit";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { MARKET_OBJECT_ID } from "@/config/sui.config";

export interface ListingMeta {
  listingId: string; // ID của NFT (dùng làm key trong Table)
  nftObjectId: string;
  seller: string;
  price: bigint;
  tier: number; // 1=Bronze, 2=Silver, 3=Gold
  listed_at: number;
}

export interface MarketplaceData {
  listings: ListingMeta[];
  loading: boolean;
  refetch: () => void;
}

export function useMarketplace(): MarketplaceData {
  const suiClient = useSuiClient();

  const [listings, setListings] = useState<ListingMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!MARKET_OBJECT_ID) return;

    setLoading(true);
    try {
      const marketObj = await suiClient.getObject({
        id: MARKET_OBJECT_ID,
        options: { showContent: true },
      });

      const content = marketObj.data?.content;
      if (!content || !("fields" in content)) {
        setListings([]);
        return;
      }

      const fields = content.fields as Record<string, unknown>;
      // listings là Table<ID, ListingMeta> — đọc qua dynamic fields
      const tableId = (fields.listings as Record<string, unknown>)?.id as
        | string
        | undefined;

      if (!tableId) {
        setListings([]);
        return;
      }

      // Lấy tất cả dynamic fields của Table (mỗi entry là một listing)
      const dynamicFields = await suiClient.getDynamicFields({
        parentId: typeof tableId === "string" ? tableId : (tableId as any).id,
      });

      const listingPromises = dynamicFields.data.map(async (df) => {
        const fieldObj = await suiClient.getDynamicFieldObject({
          parentId: typeof tableId === "string" ? tableId : (tableId as any).id,
          name: df.name,
        });
        const fc = fieldObj.data?.content;
        if (!fc || !("fields" in fc)) return null;
        const f = (fc.fields as Record<string, unknown>).value as Record<
          string,
          unknown
        >;
        if (!f) return null;
        return {
          listingId: String(df.name.value ?? ""),
          nftObjectId: String(df.name.value ?? ""),
          seller: String(f.seller ?? ""),
          price: BigInt(String(f.price ?? "0")),
          tier: Number(f.tier ?? 1),
          listed_at: Number(f.listed_at ?? 0),
        } satisfies ListingMeta;
      });

      const results = await Promise.all(listingPromises);
      setListings(results.filter(Boolean) as ListingMeta[]);
    } catch (error) {
      console.error("Error fetching marketplace listings:", error);
      toast.error("Không thể tải marketplace");
    } finally {
      setLoading(false);
    }
  }, [suiClient]);

  useEffect(() => {
    fetchListings();
  }, []);

  return { listings, loading, refetch: fetchListings };
}
