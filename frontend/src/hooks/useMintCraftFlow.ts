import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { buildCraftChunTx } from "@/lib/sui-client";
import { useGame } from "@/providers/GameContext";
import {
  TREASURY_OBJECT_ID,
  PACKAGE_ID,
  computeCraftCost,
} from "@/config/sui.config";

export interface CraftResultData {
  tier: number;
  success: boolean;
  roll: number;
}

export const MINT_TIER_CONFIG = {
  0: {
    label: "Scrap",
    emoji: "💀",
    color: "text-gray-500",
    borderColor: "border-gray-400",
    bg: "bg-gray-100",
    headline: "Thất bại — Nhận Scrap!",
  },
  1: {
    label: "Bronze",
    emoji: "🥉",
    color: "text-amber-700",
    borderColor: "border-amber-400",
    bg: "bg-amber-50",
    headline: "Bronze NFT! 🥉",
  },
  2: {
    label: "Silver",
    emoji: "🥈",
    color: "text-slate-600",
    borderColor: "border-slate-400",
    bg: "bg-slate-50",
    headline: "Silver NFT! ✨🥈",
  },
  3: {
    label: "Gold",
    emoji: "🥇",
    color: "text-yellow-600",
    borderColor: "border-yellow-400",
    bg: "bg-yellow-50",
    headline: "GOLD NFT! 🥇🎉",
  },
} as const;

export type MintVisualConfig =
  (typeof MINT_TIER_CONFIG)[keyof typeof MINT_TIER_CONFIG];

export function useMintCraftFlow() {
  const { playerData, refreshProfile } = useGame();
  const resolvedProfileId = playerData?.objectId ?? "";
  const resolvedChunRaw = playerData?.chun_raw ?? 0;

  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [crafting, setCrafting] = useState(false);
  const [craftResult, setCraftResult] = useState<CraftResultData | null>(null);
  const [craftCost, setCraftCost] = useState<number>(10);
  const [displayChunRaw, setDisplayChunRaw] = useState<number>(resolvedChunRaw);

  useEffect(() => {
    setDisplayChunRaw(resolvedChunRaw);
  }, [resolvedChunRaw]);

  useEffect(() => {
    if (!TREASURY_OBJECT_ID) return;
    suiClient
      .getObject({ id: TREASURY_OBJECT_ID, options: { showContent: true } })
      .then((obj) => {
        const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
        const total = Number(fields?.total_crafts ?? 0);
        setCraftCost(computeCraftCost(total));
      })
      .catch(() => {
        // Keep default if treasury read fails.
      });
  }, [suiClient]);

  const canCraft = displayChunRaw >= craftCost && Boolean(TREASURY_OBJECT_ID);
  const treasuryConfigured = Boolean(TREASURY_OBJECT_ID);

  const cfg = useMemo(
    () =>
      craftResult
        ? MINT_TIER_CONFIG[craftResult.tier as keyof typeof MINT_TIER_CONFIG] ??
          MINT_TIER_CONFIG[0]
        : null,
    [craftResult],
  );

  const parseCraftEvent = async (digest: string): Promise<CraftResultData> => {
    const txBlock = await suiClient.getTransactionBlock({
      digest,
      options: { showEvents: true, showEffects: true, showObjectChanges: true },
    });

    const status = (txBlock.effects as { status?: { status?: string; error?: string } } | undefined)
      ?.status;
    if (status?.status === "failure") {
      throw new Error(status.error ?? "Transaction failed");
    }

    const event = txBlock.events?.find((e) => e.type === `${PACKAGE_ID}::craft::CraftResult`);
    if (event?.parsedJson) {
      const { tier, success, roll } = event.parsedJson as {
        tier: number;
        success: boolean;
        roll: number;
      };
      return {
        tier: Number(tier),
        success: Boolean(success),
        roll: Number(roll),
      };
    }

    const createdObjects = (txBlock.objectChanges ?? []).filter((change) => change.type === "created");

    const createdScrap = createdObjects.find((change) =>
      String(change.objectType ?? "").includes("::scrap::Scrap"),
    );
    if (createdScrap) {
      return { tier: 0, success: false, roll: -1 };
    }

    const createdNft = createdObjects.find((change) =>
      String(change.objectType ?? "").includes("::cuon_chun::CuonChunNFT"),
    );
    if (createdNft) {
      const createdObjectId = "objectId" in createdNft ? String(createdNft.objectId) : "";
      if (createdObjectId) {
        const nftObj = await suiClient.getObject({
          id: createdObjectId,
          options: { showContent: true },
        });
        const fields = (nftObj.data?.content as { fields?: Record<string, unknown> } | undefined)
          ?.fields;
        const tier = Number(fields?.tier ?? 1);
        return { tier, success: true, roll: -1 };
      }
      return { tier: 1, success: true, roll: -1 };
    }

    throw new Error("Khong doc duoc ket qua craft tren chain");
  };

  const readLiveCraftState = async (): Promise<{ liveChun: number; liveCost: number }> => {
    const [profileObj, treasuryObj] = await Promise.all([
      suiClient.getObject({ id: resolvedProfileId, options: { showContent: true } }),
      suiClient.getObject({ id: TREASURY_OBJECT_ID, options: { showContent: true } }),
    ]);

    const profileFields = (profileObj.data?.content as { fields?: Record<string, unknown> })?.fields;
    const treasuryFields = (treasuryObj.data?.content as { fields?: Record<string, unknown> })?.fields;

    const liveChun = Number(profileFields?.chun_raw ?? 0);
    const totalCrafts = Number(treasuryFields?.total_crafts ?? 0);
    const liveCost = computeCraftCost(totalCrafts);

    return { liveChun, liveCost };
  };

  const handleCraft = async () => {
    if (!canCraft || crafting) return;
    if (!resolvedProfileId) {
      toast.error("Khong tim thay profile");
      return;
    }

    try {
      const { liveChun, liveCost } = await readLiveCraftState();
      setDisplayChunRaw(liveChun);
      setCraftCost(liveCost);
      if (liveChun < liveCost) {
        toast.error(`Khong du Chun Raw. Can ${liveCost}, hien co ${liveChun}.`);
        return;
      }
    } catch {
      toast.error("Khong doc duoc trang thai on-chain truoc khi craft.");
      return;
    }

    setCrafting(true);
    toast.loading("Dang craft Cuon Chun NFT...", { id: "craft" });

    const tx = buildCraftChunTx(resolvedProfileId, TREASURY_OBJECT_ID);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          try {
            const data = await parseCraftEvent(result.digest);
            setCraftResult(data);

            try {
              const { liveChun, liveCost } = await readLiveCraftState();
              setDisplayChunRaw(liveChun);
              setCraftCost(liveCost);
            } catch {
              // Keep existing UI state if post-craft read fails.
            }

            const resolvedCfg =
              MINT_TIER_CONFIG[data.tier as keyof typeof MINT_TIER_CONFIG] ?? MINT_TIER_CONFIG[0];
            const rollText = data.roll >= 0 ? ` (roll: ${data.roll})` : "";

            if (data.success) {
              toast.success(`${resolvedCfg.headline}${rollText}`, { id: "craft" });
            } else {
              toast.error(`${resolvedCfg.headline}${rollText}`, { id: "craft" });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            toast.error(`Craft that bai: ${message}`, { id: "craft" });
            try {
              const { liveChun, liveCost } = await readLiveCraftState();
              setDisplayChunRaw(liveChun);
              setCraftCost(liveCost);
            } catch {
              // Ignore extra read errors here.
            }
            void refreshProfile();
            setCrafting(false);
            return;
          }
          setCrafting(false);
          void refreshProfile();
        },
        onError: (err) => {
          setCrafting(false);
          const message = String(err?.message ?? "");
          if (message.includes("103")) {
            toast.error("Craft that bai: Khong du Chun Raw (Abort 103)", { id: "craft" });
            return;
          }
          if (message.includes("500")) {
            toast.error("Craft that bai: Khong du 0.1 SUI phi craft", { id: "craft" });
            return;
          }
          toast.error(`Craft that bai: ${message}`, { id: "craft" });
        },
      },
    );
  };

  return {
    crafting,
    craftResult,
    craftCost,
    displayChunRaw,
    canCraft,
    treasuryConfigured,
    cfg,
    handleCraft,
    handleReset: () => setCraftResult(null),
  };
}
