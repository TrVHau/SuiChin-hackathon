import { useCallback, useEffect, useMemo, useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { toast } from "sonner";
import { PACKAGE_ID, TREASURY_OBJECT_ID } from "@/config/sui.config";
import type { CuonChunNFT } from "@/hooks/useOwnedNFTs";
import { buildRedeemChunTx } from "@/lib/sui-client";

const MIST_PER_SUI = 1_000_000_000n;
const REDEEM_EPOCH_CAP_BPS = 1_500n;
const BPS_DENOM = 10_000n;

const FIXED_PAYOUT_BY_TIER: Record<number, bigint> = {
  1: 20_000_000n,
  2: 120_000_000n,
  3: 500_000_000n,
};

interface TreasurySnapshot {
  bronzePool: bigint;
  silverPool: bigint;
  goldPool: bigint;
  bronzeEpochStart: bigint;
  silverEpochStart: bigint;
  goldEpochStart: bigint;
  bronzeRedeemedEpoch: bigint;
  silverRedeemedEpoch: bigint;
  goldRedeemedEpoch: bigint;
}

interface RedeemPreview {
  payoutMist: bigint;
  canRedeem: boolean;
  reason?: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.max(0, Math.floor(value)));
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  if (isRecord(value) && "value" in value) return toBigInt(value.value);
  if (isRecord(value) && "fields" in value && isRecord(value.fields) && "value" in value.fields) {
    return toBigInt(value.fields.value);
  }
  return 0n;
}

function formatSui(mist: bigint): string {
  const whole = mist / MIST_PER_SUI;
  const frac3 = ((mist % MIST_PER_SUI) / 1_000_000n).toString().padStart(3, "0");
  return `${whole.toString()}.${frac3} SUI`;
}

function payoutByTier(tier: number): bigint {
  return FIXED_PAYOUT_BY_TIER[tier] ?? 0n;
}

function bucketByTier(snapshot: TreasurySnapshot, tier: number): {
  pool: bigint;
  epochStart: bigint;
  redeemedEpoch: bigint;
} | null {
  if (tier === 1) {
    return {
      pool: snapshot.bronzePool,
      epochStart: snapshot.bronzeEpochStart,
      redeemedEpoch: snapshot.bronzeRedeemedEpoch,
    };
  }
  if (tier === 2) {
    return {
      pool: snapshot.silverPool,
      epochStart: snapshot.silverEpochStart,
      redeemedEpoch: snapshot.silverRedeemedEpoch,
    };
  }
  if (tier === 3) {
    return {
      pool: snapshot.goldPool,
      epochStart: snapshot.goldEpochStart,
      redeemedEpoch: snapshot.goldRedeemedEpoch,
    };
  }
  return null;
}

function computePreview(snapshot: TreasurySnapshot | null, tier: number): RedeemPreview {
  const payoutMist = payoutByTier(tier);
  if (payoutMist <= 0n) {
    return { payoutMist: 0n, canRedeem: false, reason: "Tier NFT khong hop le." };
  }
  if (!snapshot) {
    return { payoutMist, canRedeem: true };
  }

  const bucket = bucketByTier(snapshot, tier);
  if (!bucket) {
    return { payoutMist, canRedeem: false, reason: "Tier NFT khong hop le." };
  }

  if (bucket.pool < payoutMist) {
    return { payoutMist, canRedeem: false, reason: "Pool tier hien tai khong du thanh khoan." };
  }

  const epochCap = (bucket.epochStart * REDEEM_EPOCH_CAP_BPS) / BPS_DENOM;
  const redeemed = bucket.redeemedEpoch;
  const remainingCap = epochCap > redeemed ? epochCap - redeemed : 0n;
  if (remainingCap < payoutMist) {
    return {
      payoutMist,
      canRedeem: false,
      reason: "Da cham gioi han redeem theo epoch. Thu lai o epoch tiep theo.",
    };
  }

  return { payoutMist, canRedeem: true };
}

function parseTreasurySnapshot(contentFields: unknown): TreasurySnapshot | null {
  if (!isRecord(contentFields)) return null;
  return {
    bronzePool: toBigInt(contentFields.bronze_pool),
    silverPool: toBigInt(contentFields.silver_pool),
    goldPool: toBigInt(contentFields.gold_pool),
    bronzeEpochStart: toBigInt(contentFields.bronze_epoch_start),
    silverEpochStart: toBigInt(contentFields.silver_epoch_start),
    goldEpochStart: toBigInt(contentFields.gold_epoch_start),
    bronzeRedeemedEpoch: toBigInt(contentFields.bronze_redeemed_epoch),
    silverRedeemedEpoch: toBigInt(contentFields.silver_redeemed_epoch),
    goldRedeemedEpoch: toBigInt(contentFields.gold_redeemed_epoch),
  };
}

export function useRedeemChunFlow(onRedeemSuccess?: () => void) {
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [treasurySnapshot, setTreasurySnapshot] = useState<TreasurySnapshot | null>(null);
  const [treasurySyncing, setTreasurySyncing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const treasuryConfigured = Boolean(TREASURY_OBJECT_ID);

  const refreshTreasury = useCallback(async (): Promise<TreasurySnapshot | null> => {
    if (!TREASURY_OBJECT_ID) {
      setTreasurySnapshot(null);
      return null;
    }

    setTreasurySyncing(true);
    try {
      const obj = await suiClient.getObject({
        id: TREASURY_OBJECT_ID,
        options: { showContent: true },
      });

      const content = obj.data?.content;
      if (!content || !("fields" in content)) {
        setTreasurySnapshot(null);
        return null;
      }

      const parsed = parseTreasurySnapshot(content.fields);
      setTreasurySnapshot(parsed);
      return parsed;
    } catch {
      setTreasurySnapshot(null);
      return null;
    } finally {
      setTreasurySyncing(false);
    }
  }, [suiClient]);

  useEffect(() => {
    void refreshTreasury();
  }, [refreshTreasury]);

  const getRedeemPreview = useCallback(
    (tier: number): RedeemPreview => {
      if (!treasuryConfigured) {
        return {
          payoutMist: payoutByTier(tier),
          canRedeem: false,
          reason: "Chua cau hinh TREASURY_OBJECT_ID.",
        };
      }
      return computePreview(treasurySnapshot, tier);
    },
    [treasuryConfigured, treasurySnapshot],
  );

  const getRedeemLabel = useCallback(
    (tier: number): string => `Redeem ${formatSui(getRedeemPreview(tier).payoutMist)}`,
    [getRedeemPreview],
  );

  const handleRedeem = useCallback(
    async (nft: CuonChunNFT) => {
      if (!TREASURY_OBJECT_ID) {
        toast.error("Chua cau hinh TREASURY_OBJECT_ID.");
        return;
      }

      const latestSnapshot = await refreshTreasury();
      const preview = computePreview(latestSnapshot, nft.tier);
      if (!preview.canRedeem) {
        toast.error(preview.reason ?? "Khong the redeem NFT nay luc nay.");
        return;
      }

      setRedeemingId(nft.objectId);
      toast.loading("Dang redeem NFT tren blockchain...", { id: "redeem" });

      const tx = buildRedeemChunTx(TREASURY_OBJECT_ID, nft.objectId);
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            let payout = preview.payoutMist;
            try {
              const txBlock = await suiClient.getTransactionBlock({
                digest: result.digest,
                options: { showEvents: true },
              });
              const event = txBlock.events?.find(
                (e) => e.type === `${PACKAGE_ID}::craft::ChunRedeemed`,
              );
              if (event?.parsedJson && isRecord(event.parsedJson) && "payout" in event.parsedJson) {
                payout = toBigInt(event.parsedJson.payout);
              }
            } catch {
              // Keep fallback payout from local preview.
            }

            toast.success(`Redeem thanh cong: +${formatSui(payout)}`, { id: "redeem" });
            setRedeemingId(null);
            await refreshTreasury();
            onRedeemSuccess?.();
          },
          onError: async (err) => {
            const message = String(err?.message ?? "");
            if (message.includes("505")) {
              toast.error("Bucket tier khong du thanh khoan de redeem.", { id: "redeem" });
            } else if (message.includes("506")) {
              toast.error("Da dat gioi han redeem epoch nay. Thu lai sau.", { id: "redeem" });
            } else {
              toast.error(`Redeem that bai: ${message}`, { id: "redeem" });
            }
            setRedeemingId(null);
            await refreshTreasury();
          },
        },
      );
    },
    [refreshTreasury, signAndExecute, suiClient, onRedeemSuccess],
  );

  return useMemo(
    () => ({
      treasuryConfigured,
      treasurySyncing,
      redeemingId,
      handleRedeem,
      refreshTreasury,
      getRedeemLabel,
      getRedeemPreview,
      isRedeeming: (objectId: string) => redeemingId === objectId,
    }),
    [
      treasuryConfigured,
      treasurySyncing,
      redeemingId,
      handleRedeem,
      refreshTreasury,
      getRedeemLabel,
      getRedeemPreview,
    ],
  );
}
