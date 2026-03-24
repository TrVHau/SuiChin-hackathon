import { ArrowLeft, Hammer, Sparkles } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { buildCraftChunTx } from "@/lib/sui-client";
import {
  TREASURY_OBJECT_ID,
  PACKAGE_ID,
  computeCraftCost,
} from "@/config/sui.config";

// ── Confetti ──
const CONFETTI_COLORS = ["#FF6B6B","#FFE66D","#4ECDC4","#A78BFA","#34D399","#F472B6","#FCD34D","#60A5FA"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 700,
        y: -(Math.random() * 600 + 100),
        rotate: Math.random() * 720 - 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: Math.random() * 10 + 6,
        delay: Math.random() * 0.3,
      })),
    [],
  );
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4, rotate: p.rotate }}
          transition={{ duration: 1.4, ease: "easeOut", delay: p.delay }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "2px",
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

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
  const [craftCost, setCraftCost] = useState<number>(10);
  const [displayChunRaw, setDisplayChunRaw] = useState<number>(chunRaw);

  useEffect(() => {
    setDisplayChunRaw(chunRaw);
  }, [chunRaw]);

  // Fetch halving cost from Treasury
  useEffect(() => {
    if (!TREASURY_OBJECT_ID) return;
    suiClient
      .getObject({ id: TREASURY_OBJECT_ID, options: { showContent: true } })
      .then((obj) => {
        const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
        const total = Number(fields?.total_crafts ?? 0);
        setCraftCost(computeCraftCost(total));
      })
      .catch(() => {/* keep default */});
  }, [suiClient]);

  const canCraft = displayChunRaw >= craftCost && !!TREASURY_OBJECT_ID;

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

    const createdObjects = (txBlock.objectChanges ?? []).filter(
      (change) => change.type === "created",
    );

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
      suiClient.getObject({ id: profileId, options: { showContent: true } }),
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

    const tx = buildCraftChunTx(profileId, TREASURY_OBJECT_ID);

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
            const cfg =
              TIER_CONFIG[data.tier as keyof typeof TIER_CONFIG] ??
              TIER_CONFIG[0];
            const rollText = data.roll >= 0 ? ` (roll: ${data.roll})` : "";
            if (data.success) {
              toast.success(`${cfg.headline}${rollText}`, {
                id: "craft",
              });
            } else {
              toast.error(`${cfg.headline}${rollText}`, {
                id: "craft",
              });
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
            onSuccess?.();
            setCrafting(false);
            return;
          }
          setCrafting(false);
          onSuccess?.();
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
              {craftResult.tier >= 2 && <Confetti />}
              <motion.div
                animate={{ rotate: [0, -15, 15, -15, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.9 }}
                className="text-9xl mb-6 flex justify-center"
              >
                {craftResult.tier === 0 ? (
                  <img
                    src="/nft/scrap.png"
                    alt="Scrap"
                    className="size-28 rounded-3xl object-cover border-4 border-gray-300 shadow-lg"
                  />
                ) : (
                  cfg.emoji
                )}
              </motion.div>
              <h2
                className={`font-display font-black text-3xl mb-3 ${cfg.color}`}
              >
                {cfg.headline}
              </h2>
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
          ) : crafting ? (
            /* ── Forging Animation ── */
            <motion.div
              key="forging"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-4xl shadow-2xl p-10 border-8 border-playful-purple text-center"
            >
              <div className="relative flex justify-center mb-6">
                <motion.div
                  animate={{
                    rotate: [-15, 15, -15, 15, -15],
                    scale: [1, 1.15, 1, 1.15, 1],
                  }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="text-9xl select-none"
                >
                  ⚒️
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 2.2, 1], opacity: [0.25, 0.05, 0.25] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                  className="absolute size-24 rounded-full bg-playful-purple/30 self-center -z-10"
                />
              </div>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="mb-4 flex justify-center"
              >
                <img
                  src="/nft/tier1_v1.png"
                  alt="Tier 1 NFT"
                  className="size-16 rounded-2xl object-cover border-2 border-playful-purple/30"
                />
              </motion.div>
              <h2 className="font-display font-black text-3xl text-playful-purple mb-2">
                Đang rèn NFT...
              </h2>
              <p className="text-gray-500 font-semibold mb-6">
                Chờ blockchain xác nhận ⛓️
              </p>
              <div className="flex justify-center gap-2">
                {[0, 0.25, 0.5].map((delay, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.6, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.75, repeat: Infinity, delay }}
                    className="size-3 bg-playful-purple rounded-full"
                  />
                ))}
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
                      <img
                        src="/img/chun_raw.jpg"
                        alt="Chun Raw"
                        className="size-14 rounded-2xl object-cover mx-auto mb-2 border-2 border-sunny-200"
                      />
                      <p className="font-black text-2xl text-playful-orange">
                        {craftCost}
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
                      <img
                        src="/nft/tier1_v1.png"
                        alt="Tier 1 NFT"
                        className="size-14 rounded-2xl object-cover mx-auto mb-2 border-2 border-playful-purple/30"
                      />
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
                    {displayChunRaw}
                    {!canCraft && displayChunRaw < craftCost && (
                      <span className="text-sm font-semibold text-red-400 ml-2">
                        (cần {craftCost - displayChunRaw} nữa)
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

