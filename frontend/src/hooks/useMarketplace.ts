import { useSuiClient } from "@mysten/dapp-kit";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { MARKET_OBJECT_ID } from "@/config/sui.config";

export interface ListingMeta {
  listingId: string;
  nftObjectId: string;
  seller: string;
  price: bigint;
  tier: number;
  variant: number;
  name: string;
  image_url: string;
  listed_at: number;
}

export interface MarketplaceData {
  listings: ListingMeta[];
  loading: boolean;
  refetch: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function tryGetIdString(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("0x")) return value;
  if (!isRecord(value)) return null;

  const direct = value.id;
  if (typeof direct === "string" && direct.startsWith("0x")) return direct;

  const nestedFields = value.fields;
  if (isRecord(nestedFields)) {
    const nestedId = tryGetIdString(nestedFields.id);
    if (nestedId) return nestedId;
  }

  return null;
}

function extractTableId(rawListings: unknown): string | null {
  if (!isRecord(rawListings)) return null;

  const idFromSelf = tryGetIdString(rawListings);
  if (idFromSelf) return idFromSelf;

  const idFromFields = isRecord(rawListings.fields)
    ? tryGetIdString(rawListings.fields)
    : null;
  if (idFromFields) return idFromFields;

  return null;
}

function extractListingId(rawNameValue: unknown): string {
  if (typeof rawNameValue === "string") return rawNameValue;
  if (isRecord(rawNameValue) && typeof rawNameValue.id === "string") return rawNameValue.id;
  return String(rawNameValue ?? "");
}

function extractListingMetaValue(rawFields: unknown): Record<string, unknown> | null {
  if (!isRecord(rawFields)) return null;
  const rawValue = rawFields.value;
  if (!isRecord(rawValue)) return null;
  if (isRecord(rawValue.fields)) return rawValue.fields;
  return rawValue;
}

async function resolveNftVisualMeta(
  suiClient: ReturnType<typeof useSuiClient>,
  nftObjectId: string,
): Promise<{ name: string; image_url: string; tier: number; variant: number }> {
  const fallback = {
    name: "Cuon Chun NFT",
    image_url: "",
    tier: 1,
    variant: 1,
  };

  try {
    const nftObj = await suiClient.getObject({
      id: nftObjectId,
      options: { showContent: true },
    });

    const content = nftObj.data?.content;
    if (!content || !("fields" in content)) return fallback;
    const f = content.fields as Record<string, unknown>;

    return {
      name: String(f.name ?? fallback.name),
      image_url: String(f.image_url ?? ""),
      tier: Number(f.tier ?? fallback.tier),
      variant: Number(f.variant ?? fallback.variant),
    };
  } catch {
    return fallback;
  }
}

export function useMarketplace(): MarketplaceData {
  const suiClient = useSuiClient();
  const [listings, setListings] = useState<ListingMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!MARKET_OBJECT_ID) {
      setListings([]);
      return;
    }

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
      const tableId = extractTableId(fields.listings);
      if (!tableId) {
        setListings([]);
        return;
      }

      const dynamicFields = await suiClient.getDynamicFields({ parentId: tableId });

      const listingPromises = dynamicFields.data.map(async (df) => {
        const fieldObj = await suiClient.getDynamicFieldObject({
          parentId: tableId,
          name: df.name,
        });
        const fc = fieldObj.data?.content;
        if (!fc || !("fields" in fc)) return null;

        const f = extractListingMetaValue(fc.fields);
        if (!f) return null;

        const listingId = extractListingId(df.name.value);
        const nftObjectId =
          typeof f.nft_id === "string" && f.nft_id.startsWith("0x")
            ? f.nft_id
            : listingId;

        const visualMeta = await resolveNftVisualMeta(suiClient, nftObjectId);

        return {
          listingId,
          nftObjectId,
          seller: String(f.seller ?? ""),
          price: BigInt(String(f.price ?? "0")),
          tier: Number(f.tier ?? visualMeta.tier),
          variant: Number(f.variant ?? visualMeta.variant),
          name: String(f.name ?? visualMeta.name),
          image_url: String(f.image_url ?? visualMeta.image_url),
          listed_at: Number(f.listed_at ?? 0),
        } satisfies ListingMeta;
      });

      const results = await Promise.all(listingPromises);
      setListings(results.filter(Boolean) as ListingMeta[]);
    } catch (error) {
      console.error("Error fetching marketplace listings:", error);
      toast.error("Khong the tai marketplace");
    } finally {
      setLoading(false);
    }
  }, [suiClient]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return { listings, loading, refetch: fetchListings };
}
