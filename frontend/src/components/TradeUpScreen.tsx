import { ArrowLeft, ArrowUpCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import type { CuonChunNFT } from "@/hooks/useOwnedNFTs";
import {
  buildTradeUpBronzeToSilverTx,
  buildTradeUpSilverToGoldTx,
} from "@/lib/sui-client";
import { PACKAGE_ID } from "@/config/sui.config";

interface TradeUpResultData {
  toTier: number;   // 0=Scrap, 2=Silver, 3=Gold
  fromTier: number;
  success: boolean;
  roll: number;
}

const RESULT_CONFIG = {
  0: { label: "Scrap",  emoji: "💀", color: "text-gray-500",   borderColor: "border-gray-400",   bg: "bg-gray-100",  headline: "Thất bại — Nhận Scrap!" },
  2: { label: "Silver", emoji: "🥈", color: "text-slate-600",  borderColor: "border-slate-400",  bg: "bg-slate-50",  headline: "Silver NFT! ✨🥈" },
  3: { label: "Gold",   emoji: "🥇", color: "text-yellow-600", borderColor: "border-yellow-400", bg: "bg-yellow-50", headline: "GOLD NFT! 🥇🎉" },
} as const;

interface TradeUpScreenProps {
  onBack: () => void;
}

type TradeMode = "bronze-to-silver" | "silver-to-gold";

const TRADE_CONFIG: Record<
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

export default function TradeUpScreen({ onBack }: TradeUpScreenProps) {
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { cuonChuns, loading, refetch } = useOwnedNFTs();

  const [mode, setMode] = useState<TradeMode>("bronze-to-silver");
  const [selected, setSelected] = useState<string[]>([]);
  const [trading, setTrading] = useState(false);
  const [result, setResult] = useState<TradeUpResultData | null>(null);

  const parseTradeEvent = async (digest: string): Promise<TradeUpResultData> => {
    const txBlock = await suiClient.getTransactionBlock({
      digest,
      options: { showEvents: true },
    });
    const event = txBlock.events?.find(
      (e) => e.type === `${PACKAGE_ID}::trade_up::TradeUpResult`,
    );
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
    return { toTier: fallbackTier, fromTier: config.inputTier, success: true, roll: 0 };
  };

  const config = TRADE_CONFIG[mode];
  const eligible = cuonChuns.filter((n) => n.tier === config.inputTier);
  const canTrade = selected.length === config.inputRequired && !trading;

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

  const handleModeChange = (m: TradeMode) => {
    setMode(m);
    setSelected([]);
    setResult(null);
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
              RESULT_CONFIG[data.toTier as keyof typeof RESULT_CONFIG] ??
              RESULT_CONFIG[0];
            if (data.success) {
              toast.success(`${cfg.headline} (roll: ${data.roll})`, {
                id: "tradeup",
              });
            } else {
              toast.error(`${cfg.headline} (roll: ${data.roll})`, {
                id: "tradeup",
              });
            }
          } catch {
            setResult({ toTier: 2, fromTier: 1, success: true, roll: 0 });
            toast.success("Trade-up hoàn tất! Kiểm tra kho đồ 🎉", {
              id: "tradeup",
            });
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

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              className="bg-white p-5 rounded-full shadow-2xl border-4 border-playful-orange"
            >
              <ArrowLeft className="size-7 text-playful-orange" />
            </motion.button>
            <div className="flex items-center gap-3">
              <span className="text-5xl">⬆️</span>
              <h1 className="font-display font-black text-4xl text-gray-900">
                Trade-up
              </h1>
            </div>
          </div>
          <motion.button
            onClick={() => {
              refetch();
              setSelected([]);
            }}
            disabled={loading}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="bg-white p-4 rounded-full shadow-xl border-4 border-gray-200 disabled:opacity-50"
          >
            <RefreshCw
              className={`size-6 text-gray-600 ${loading ? "animate-spin" : ""}`}
            />
          </motion.button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-4 mb-8">
          {(Object.entries(TRADE_CONFIG) as [TradeMode, typeof config][]).map(
            ([key, c]) => (
              <motion.button
                key={key}
                onClick={() => handleModeChange(key)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex-1 py-4 rounded-3xl font-display font-black text-xl border-4 transition-all ${
                  mode === key
                    ? "bg-playful-orange text-white border-white shadow-2xl"
                    : "bg-white text-gray-700 border-gray-200 shadow-md"
                }`}
              >
                {c.inputEmoji} {c.title} {c.outputEmoji}
              </motion.button>
            ),
          )}
        </div>

        {/* Info card */}
        <div className="bg-white rounded-4xl shadow-2xl p-6 border-8 border-playful-orange mb-6">
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-4xl">{config.inputEmoji}</p>
              <p className="font-black text-2xl text-gray-900">
                {config.inputRequired}x
              </p>
              <p className="text-sm text-gray-500 font-semibold">
                Input (bị burn)
              </p>
            </div>
            <ArrowUpCircle className="size-10 text-playful-orange" />
            <div>
              <p className="text-4xl">{config.outputEmoji}</p>
              <p className="font-black text-2xl text-playful-green">
                {config.successChance}
              </p>
              <p className="text-sm text-gray-500 font-semibold">Thành công</p>
            </div>
          </div>
          <p className="text-center text-gray-500 font-semibold text-sm mt-4">
            ⚠️ Các NFT được chọn sẽ bị burn bất kể kết quả
          </p>
        </div>

        {/* Result card */}
        <AnimatePresence>
          {result && (() => {
            const cfg = RESULT_CONFIG[result.toTier as keyof typeof RESULT_CONFIG] ?? RESULT_CONFIG[0];
            return (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`rounded-4xl shadow-2xl p-8 border-8 text-center mb-6 ${cfg.bg} ${cfg.borderColor}`}
              >
                <motion.div
                  animate={{ rotate: [0, -15, 15, -15, 0], scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.9 }}
                  className="text-8xl mb-4"
                >
                  {cfg.emoji}
                </motion.div>
                <h3 className={`font-display font-black text-2xl mb-2 ${cfg.color}`}>
                  {cfg.headline}
                </h3>
                <p className="text-gray-500 font-semibold mb-1">
                  Roll: {result.roll} / 99
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  {result.success ? "NFT đã về ví 🎉" : "Scrap đã về ví — thử lại lần sau!"}
                </p>
                <motion.button
                  onClick={() => setResult(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-playful bg-playful-orange text-white border-4 border-white px-8"
                >
                  Trade tiếp
                </motion.button>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* NFT Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="text-6xl animate-bounce mb-4">🔍</div>
            <p className="font-bold text-gray-600">Đang tải NFT...</p>
          </div>
        ) : eligible.length === 0 ? (
          <div className="bg-white rounded-4xl p-10 text-center border-8 border-gray-200 shadow-xl">
            <div className="text-7xl mb-4">📭</div>
            <p className="font-display font-black text-2xl text-gray-900 mb-2">
              Không đủ {config.inputEmoji} NFT
            </p>
            <p className="text-gray-500 font-semibold">
              Cần ít nhất {config.inputRequired} {config.title.split(" → ")[0]}{" "}
              NFT
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-black text-xl text-gray-900">
                Chọn {config.inputRequired} NFT ({selected.length}/
                {config.inputRequired})
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8">
              {eligible.map((nft: CuonChunNFT) => {
                const isSelected = selected.includes(nft.objectId);
                return (
                  <motion.button
                    key={nft.objectId}
                    onClick={() => toggleSelect(nft.objectId)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    className={`rounded-3xl border-4 p-3 transition-all ${
                      isSelected
                        ? "border-playful-orange bg-orange-50 shadow-xl ring-4 ring-playful-orange/40"
                        : `${config.borderColor} bg-white shadow-md`
                    }`}
                  >
                    {nft.image_url ? (
                      <img
                        src={nft.image_url}
                        alt={nft.name}
                        className="w-full aspect-square object-cover rounded-2xl mb-2"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-2xl mb-2 bg-gray-100 flex items-center justify-center text-4xl">
                        🏮
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-playful-orange text-white text-xs font-black px-1.5 rounded-full">
                        ✓
                      </div>
                    )}
                    <p className="text-xs font-bold text-gray-600 truncate">
                      {nft.objectId.slice(0, 6)}...
                    </p>
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              onClick={handleTradeUp}
              disabled={!canTrade}
              whileHover={canTrade ? { scale: 1.04 } : {}}
              whileTap={canTrade ? { scale: 0.96 } : {}}
              className={`w-full btn-playful text-2xl flex items-center justify-center gap-3 border-4 ${
                canTrade
                  ? "bg-gradient-to-r from-playful-orange to-playful-pink text-white border-white shadow-2xl"
                  : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
              }`}
            >
              {trading ? (
                <>
                  <div className="size-6 border-4 border-white/40 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <ArrowUpCircle className="size-7" />
                  TRADE UP ({selected.length}/{config.inputRequired})
                </>
              )}
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
