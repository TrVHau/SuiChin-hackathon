import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import {
  buildTradeUpBronzeToSilverTx,
  buildTradeUpSilverToGoldTx,
} from "@/lib/sui-client";
import { PACKAGE_ID } from "@/config/sui.config";

export type TradeMode = "bronze-to-silver" | "silver-to-gold";

export interface TradeUpResultData {
  toTier: number;
  fromTier: number;
  success: boolean;
  roll: number;
}

export const TRADE_RESULT_CONFIG = {
  0: {
    label: "Scrap",
    emoji: "💀",
    color: "text-gray-500",
    borderColor: "border-gray-400",
    bg: "bg-gray-100",
    headline: "Thất bại — Nhận Scrap!",
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

export type TradeResultVisualConfig =
  (typeof TRADE_RESULT_CONFIG)[keyof typeof TRADE_RESULT_CONFIG];

export const TRADE_CONFIG: Record<
  TradeMode,
  {
    title: string;
    inputTier: number;
    inputRequired: number;
    outputLabel: string;
    successChance: string;
    inputEmoji: string;
    outputEmoji: string;
    borderColor: string;
  }
> = {
  "bronze-to-silver": {
    title: "Bronze → Silver",
    inputTier: 1,
    inputRequired: 8,
    outputLabel: "Silver NFT (70%) hoặc Scrap (30%)",
    successChance: "70%",
    inputEmoji: "🥉",
    outputEmoji: "🥈",
    borderColor: "border-amber-400",
  },
  "silver-to-gold": {
    title: "Silver → Gold",
    inputTier: 2,
    inputRequired: 6,
    outputLabel: "Gold NFT (55%) hoặc Scrap (45%)",
    successChance: "55%",
    inputEmoji: "🥈",
    outputEmoji: "🥇",
    borderColor: "border-gray-400",
  },
};

export function useTradeUpFlow() {
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { cuonChuns, loading, refetch } = useOwnedNFTs();

  const [mode, setMode] = useState<TradeMode>("bronze-to-silver");
  const [selected, setSelected] = useState<string[]>([]);
  const [trading, setTrading] = useState(false);
  const [result, setResult] = useState<TradeUpResultData | null>(null);

  const config = TRADE_CONFIG[mode];

  const eligible = useMemo(
    () => cuonChuns.filter((n) => n.tier === config.inputTier),
    [cuonChuns, config.inputTier],
  );

  const canTrade = selected.length === config.inputRequired && !trading;

  const parseTradeEvent = async (digest: string): Promise<TradeUpResultData> => {
    const txBlock = await suiClient.getTransactionBlock({
      digest,
      options: { showEvents: true },
    });

    const event = txBlock.events?.find((e) => e.type === `${PACKAGE_ID}::trade_up::TradeUpResult`);
    if (event?.parsedJson) {
      const { to_tier, from_tier, success, roll } = event.parsedJson as {
        to_tier: number;
        from_tier: number;
        success: boolean;
        roll: number;
      };
      return {
        toTier: Number(to_tier),
        fromTier: Number(from_tier),
        success: Boolean(success),
        roll: Number(roll),
      };
    }

    const fallbackTier = mode === "bronze-to-silver" ? 2 : 3;
    return {
      toTier: fallbackTier,
      fromTier: config.inputTier,
      success: true,
      roll: 0,
    };
  };

  const handleModeChange = (nextMode: TradeMode) => {
    setMode(nextMode);
    setSelected([]);
    setResult(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= config.inputRequired) {
        toast.error(`Chỉ cần chọn ${config.inputRequired} NFT`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleTradeUp = () => {
    if (!canTrade) return;

    setTrading(true);
    toast.loading("Đang trade-up trên blockchain...", { id: "tradeup" });

    const tx =
      mode === "bronze-to-silver"
        ? buildTradeUpBronzeToSilverTx(selected)
        : buildTradeUpSilverToGoldTx(selected);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (res) => {
          try {
            const data = await parseTradeEvent(res.digest);
            setResult(data);

            const cfg =
              TRADE_RESULT_CONFIG[data.toTier as keyof typeof TRADE_RESULT_CONFIG] ??
              TRADE_RESULT_CONFIG[0];
            if (data.success) {
              toast.success(`${cfg.headline} (roll: ${data.roll})`, { id: "tradeup" });
            } else {
              toast.error(`${cfg.headline} (roll: ${data.roll})`, { id: "tradeup" });
            }
          } catch {
            setResult({ toTier: 2, fromTier: 1, success: true, roll: 0 });
            toast.success("Trade-up hoàn tất! Kiểm tra kho đồ 🎉", { id: "tradeup" });
          }

          setTrading(false);
          setSelected([]);
          refetch();
        },
        onError: (err) => {
          setTrading(false);
          toast.error(`Trade-up thất bại: ${err.message}`, { id: "tradeup" });
        },
      },
    );
  };

  return {
    loading,
    refetch,
    mode,
    selected,
    trading,
    result,
    config,
    eligible,
    canTrade,
    handleModeChange,
    toggleSelect,
    handleTradeUp,
    clearSelection: () => setSelected([]),
    clearResult: () => setResult(null),
    resultConfig:
      result &&
      (TRADE_RESULT_CONFIG[result.toTier as keyof typeof TRADE_RESULT_CONFIG] ??
        TRADE_RESULT_CONFIG[0]),
  };
}
