import { ArrowLeft, Hammer, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { buildCraftChunTx } from "@/lib/sui-client";
import {
  CRAFT_CHUN_COST,
  TREASURY_OBJECT_ID,
  PACKAGE_ID,
} from "@/config/sui.config";

interface CraftResultData {
  tier: number; // 0=Scrap, 1=Bronze, 2=Silver, 3=Gold
  success: boolean;
  roll: number;
}

const TIER_CONFIG = {
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

interface WorkshopScreenProps {
  onBack: () => void;
  profileId: string;
  chunRaw: number;
  onSuccess?: () => void;
}

export default function WorkshopScreen({
  onBack,
  profileId,
  chunRaw,
  onSuccess,
}: WorkshopScreenProps) {
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [crafting, setCrafting] = useState(false);
  const [craftResult, setCraftResult] = useState<CraftResultData | null>(null);

  const canCraft = chunRaw >= CRAFT_CHUN_COST && !!TREASURY_OBJECT_ID;

  const parseCraftEvent = async (digest: string): Promise<CraftResultData> => {
    const txBlock = await suiClient.getTransactionBlock({
      digest,
      options: { showEvents: true },
    });
    const event = txBlock.events?.find(
      (e) => e.type === `${PACKAGE_ID}::craft::CraftResult`,
    );
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
    return { tier: 1, success: true, roll: 0 };
  };

  const handleCraft = () => {
    if (!canCraft || crafting) return;

    setCrafting(true);
    toast.loading("Đang craft Cuộn Chun NFT...", { id: "craft" });

    const tx = buildCraftChunTx(profileId, TREASURY_OBJECT_ID);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          try {
            const data = await parseCraftEvent(result.digest);
            setCraftResult(data);
            const cfg =
              TIER_CONFIG[data.tier as keyof typeof TIER_CONFIG] ??
              TIER_CONFIG[0];
            if (data.success) {
              toast.success(`${cfg.headline} (roll: ${data.roll})`, {
                id: "craft",
              });
            } else {
              toast.error(`${cfg.headline} (roll: ${data.roll})`, {
                id: "craft",
              });
            }
          } catch {
            setCraftResult({ tier: 1, success: true, roll: 0 });
            toast.success("Craft hoàn tất! NFT đã về ví 🎉", { id: "craft" });
          }
          setCrafting(false);
          onSuccess?.();
        },
        onError: (err) => {
          setCrafting(false);
          toast.error(`Craft thất bại: ${err.message}`, { id: "craft" });
        },
      },
    );
  };

  const handleReset = () => setCraftResult(null);

  const cfg = craftResult
    ? (TIER_CONFIG[craftResult.tier as keyof typeof TIER_CONFIG] ??
      TIER_CONFIG[0])
    : null;

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            className="bg-white p-5 rounded-full shadow-2xl border-4 border-playful-purple"
          >
            <ArrowLeft className="size-7 text-playful-purple" />
          </motion.button>
          <div className="flex items-center gap-3">
            <span className="text-5xl">⚒️</span>
            <h1 className="font-display font-black text-4xl text-gray-900">
              Workshop
            </h1>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {craftResult && cfg ? (
            /* ── Result Screen ── */
            <motion.div
              key="result"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-4xl shadow-2xl p-10 border-8 text-center ${cfg.bg} ${cfg.borderColor}`}
            >
              <motion.div
                animate={{ rotate: [0, -15, 15, -15, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.9 }}
                className="text-9xl mb-6"
              >
                {cfg.emoji}
              </motion.div>
              <h2
                className={`font-display font-black text-3xl mb-3 ${cfg.color}`}
              >
                {cfg.headline}
              </h2>
              <p className="text-gray-500 font-semibold mb-2">
                Roll: {craftResult.roll} / 99
              </p>
              <p className="text-gray-500 mb-8">
                {craftResult.success
                  ? "NFT đã về ví của bạn 🎉"
                  : "Scrap đã về ví — thử lại lần sau!"}
              </p>
              <div className="flex gap-4">
                <motion.button
                  onClick={handleReset}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 btn-playful bg-playful-purple text-white border-4 border-white text-xl"
                >
                  <Hammer className="size-6" />
                  Craft tiếp
                </motion.button>
                <motion.button
                  onClick={onBack}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 btn-playful bg-white text-gray-800 border-4 border-gray-300 text-xl"
                >
                  Về Dashboard
                </motion.button>
              </div>
            </motion.div>
          ) : (
            /* ── Craft Form ── */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Info card */}
              <div className="bg-white rounded-4xl shadow-2xl p-8 border-8 border-playful-purple mb-6">
                <h2 className="font-display font-black text-2xl text-gray-900 mb-6">
                  Craft Cuộn Chun NFT
                </h2>

                {/* Recipe */}
                <div className="bg-sunny-50 border-4 border-sunny-300 rounded-3xl p-6 mb-6">
                  <h3 className="font-bold text-gray-700 uppercase text-sm mb-4">
                    Nguyên liệu
                  </h3>
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <div className="text-5xl mb-2">🔮</div>
                      <p className="font-black text-2xl text-playful-orange">
                        {CRAFT_CHUN_COST}
                      </p>
                      <p className="text-sm text-gray-500 font-semibold">
                        Chun Raw
                      </p>
                    </div>
                    <div className="text-3xl text-gray-400">+</div>
                    <div className="text-center">
                      <div className="text-5xl mb-2">💧</div>
                      <p className="font-black text-2xl text-playful-blue">
                        0.1
                      </p>
                      <p className="text-sm text-gray-500 font-semibold">SUI</p>
                    </div>
                    <div className="text-3xl text-gray-400">→</div>
                    <div className="text-center">
                      <div className="text-5xl mb-2">🏮</div>
                      <p className="font-black text-2xl text-playful-purple">
                        1
                      </p>
                      <p className="text-sm text-gray-500 font-semibold">NFT</p>
                    </div>
                  </div>
                </div>

                {/* Current balance */}
                <div className="flex items-center justify-between bg-gray-50 border-4 border-gray-200 rounded-3xl p-5 mb-6">
                  <span className="font-bold text-gray-700">
                    Chun Raw hiện có:
                  </span>
                  <span
                    className={`font-display font-black text-3xl ${canCraft ? "text-playful-green" : "text-red-500"}`}
                  >
                    {chunRaw}
                    {!canCraft && chunRaw < CRAFT_CHUN_COST && (
                      <span className="text-sm font-semibold text-red-400 ml-2">
                        (cần {CRAFT_CHUN_COST - chunRaw} nữa)
                      </span>
                    )}
                  </span>
                </div>

                {!TREASURY_OBJECT_ID && (
                  <div className="bg-yellow-50 border-4 border-yellow-400 rounded-3xl p-4 mb-4">
                    <p className="text-yellow-800 font-bold text-sm">
                      ⚠️ VITE_TREASURY_OBJECT_ID chưa được cấu hình trong .env
                    </p>
                  </div>
                )}

                {/* Craft button */}
                <motion.button
                  onClick={handleCraft}
                  disabled={!canCraft || crafting}
                  whileHover={canCraft && !crafting ? { scale: 1.05 } : {}}
                  whileTap={canCraft && !crafting ? { scale: 0.95 } : {}}
                  className={`w-full btn-playful text-2xl flex items-center justify-center gap-3 border-4 ${
                    canCraft && !crafting
                      ? "bg-gradient-to-r from-playful-purple to-playful-pink text-white border-white shadow-2xl"
                      : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                  }`}
                >
                  {crafting ? (
                    <>
                      <div className="size-6 border-4 border-white/40 border-t-white rounded-full animate-spin" />
                      Đang craft...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-7" />
                      CRAFT NFT
                    </>
                  )}
                </motion.button>
              </div>

              {/* Description */}
              <div className="bg-white/70 rounded-3xl p-6 border-4 border-white">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span>📖</span> Cuộn Chun NFT là gì?
                </h3>
                <ul className="space-y-2 text-gray-600 font-semibold text-sm">
                  <li>
                    • NFT on-chain được mint từ Chun Raw kiếm qua gameplay
                  </li>
                  <li>• Có thể giao dịch trên Marketplace</li>
                  <li>• Dùng để Trade-up lên tier cao hơn</li>
                  <li>• Mỗi NFT là unique, có tier: Bronze / Silver / Gold</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
