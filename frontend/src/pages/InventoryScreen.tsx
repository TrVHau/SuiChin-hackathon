import {
  ShoppingCart,
  ArrowUpCircle,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import PageHeader from "@/components/common/PageHeader";
import RefreshButton from "@/components/common/RefreshButton";
import type {
  CuonChunNFT,
  ScrapItem,
  AchievementBadgeItem,
} from "@/hooks/useOwnedNFTs";

type TierFilter = "all" | 1 | 2 | 3;

const FILTER_TABS: { label: string; value: TierFilter; emoji: string }[] = [
  { label: "Tất cả", value: "all", emoji: "" },
  { label: "Bronze", value: 1, emoji: "🥉" },
  { label: "Silver", value: 2, emoji: "🥈" },
  { label: "Gold", value: 3, emoji: "🥇" },
];

const TIER_LABELS: Record<
  number,
  { label: string; emoji: string; color: string }
> = {
  1: { label: "Bronze", emoji: "🥉", color: "border-amber-400 bg-amber-50" },
  2: { label: "Silver", emoji: "🥈", color: "border-gray-400 bg-gray-50" },
  3: { label: "Gold", emoji: "🥇", color: "border-yellow-400 bg-yellow-50" },
};

function NFTCard({
  nft,
  onList,
  onTradeUp,
}: {
  nft: CuonChunNFT;
  onList?: () => void;
  onTradeUp?: () => void;
}) {
  const tier = TIER_LABELS[nft.tier] ?? TIER_LABELS[1];
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className={`rounded-3xl border-4 p-3 shadow-lg flex flex-col ${tier.color}`}
    >
      {nft.image_url ? (
        <img
          src={nft.image_url}
          alt={nft.name}
          className="w-full aspect-square object-cover rounded-2xl mb-2"
        />
      ) : (
        <img
          src="/nft/tier1_v1.png"
          alt="Tier 1 NFT"
          className="w-full aspect-square object-cover rounded-2xl mb-2 bg-white/60"
        />
      )}
      <p className="font-display font-black text-xs text-gray-900 truncate">
        {nft.name || `#${nft.objectId.slice(-4)}`}
      </p>
      <p className="text-xs font-bold text-gray-500 mb-2">
        {tier.emoji} {tier.label}
        {nft.variant > 0 && (
          <span className="ml-1 text-xs text-indigo-500">· v{nft.variant}</span>
        )}
      </p>
      <div className="flex gap-1 mt-auto">
        {onList && (
          <motion.button
            onClick={onList}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-black py-1.5 rounded-xl bg-white border-2 border-playful-blue text-playful-blue hover:bg-playful-blue hover:text-white transition-colors"
          >
            <ShoppingCart className="size-3" />
            List
          </motion.button>
        )}
        {onTradeUp && (
          <motion.button
            onClick={onTradeUp}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-black py-1.5 rounded-xl bg-white border-2 border-playful-orange text-playful-orange hover:bg-playful-orange hover:text-white transition-colors"
          >
            <ArrowUpCircle className="size-3" />
            Trade
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function ScrapCard({ scrap }: { scrap: ScrapItem }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, rotate: -1 }}
      className="rounded-3xl border-4 border-green-300 bg-green-50 p-4 shadow-lg"
    >
      {scrap.image_url ? (
        <img
          src={scrap.image_url}
          alt={scrap.name}
          className="w-full aspect-square object-cover rounded-2xl mb-3"
        />
      ) : (
        <div className="w-full aspect-square rounded-2xl mb-3 bg-white/60 flex items-center justify-center text-6xl">
          🧩
        </div>
      )}
      <p className="font-display font-black text-sm text-gray-900 truncate">
        {scrap.name}
      </p>
      <p className="text-xs font-bold text-gray-500">Scrap</p>
      <p className="text-xs text-gray-400 font-mono truncate mt-1">
        {scrap.objectId.slice(0, 10)}...
      </p>
    </motion.div>
  );
}

function BadgeCard({ badge }: { badge: AchievementBadgeItem }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className="rounded-3xl border-4 border-sunny-400 bg-sunny-50 p-4 shadow-lg"
    >
      {badge.image_url ? (
        <img
          src={badge.image_url}
          alt={badge.name}
          className="w-full aspect-square object-cover rounded-2xl mb-3"
        />
      ) : (
        <div className="w-full aspect-square rounded-2xl mb-3 bg-white/60 flex items-center justify-center text-6xl">
          🏆
        </div>
      )}
      <p className="font-display font-black text-sm text-gray-900 truncate">
        {badge.name}
      </p>
      <p className="text-xs text-gray-600 font-semibold line-clamp-2">
        {badge.description}
      </p>
    </motion.div>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function InventoryScreen() {
  const navigate = useNavigate();
  const handleBack = () => navigate("/dashboard");
  const handleOpenMarketplace = () => navigate("/marketplace");
  const handleOpenTradeUp = () => navigate("/trade-up");
  const { cuonChuns, scraps, badges, loading, refetch } = useOwnedNFTs();
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

  const filteredNFTs =
    tierFilter === "all"
      ? cuonChuns
      : cuonChuns.filter((n) => n.tier === tierFilter);

  const totalItems = cuonChuns.length + scraps.length + badges.length;

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <PageHeader
          onBack={handleBack}
          title="Kho Đồ"
          emoji="🎒"
          subtitle={`${totalItems} vật phẩm`}
          backBorderClass="border-playful-blue"
          backIconClass="text-playful-blue"
          rightSlot={<RefreshButton onClick={refetch} loading={loading} />}
        />

        {loading && totalItems === 0 ? (
          <div className="space-y-10">
            {/* Skeleton grid */}
            <section>
              <div className="h-8 w-40 bg-gray-200 rounded-2xl mb-4 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-3xl border-4 border-gray-200 bg-gray-100 p-4 animate-pulse"
                  >
                    <div className="w-full aspect-square rounded-2xl mb-3 bg-gray-200" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : totalItems === 0 ? (
          <div className="bg-white rounded-4xl shadow-2xl p-12 border-8 border-gray-200 text-center">
            <div className="text-8xl mb-6">📭</div>
            <h2 className="font-display font-black text-3xl text-gray-900 mb-3">
              Kho trống!
            </h2>
            <p className="text-gray-600 font-semibold text-lg">
              Craft Cuộn Chun NFT ở Workshop hoặc chơi game để kiếm thêm.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Cuon Chun NFTs */}
            {cuonChuns.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-black text-2xl text-gray-900 flex items-center gap-2">
                    <img
                      src="/nft/tier1_v1.png"
                      alt="Tier 1 NFT"
                      className="size-8 rounded-xl object-cover border-2 border-playful-purple/30"
                    />
                    Cuộn Chun NFT
                    <span className="bg-playful-purple text-white text-sm font-black px-3 py-1 rounded-full">
                      {filteredNFTs.length}
                      {tierFilter !== "all" && ` / ${cuonChuns.length}`}
                    </span>
                  </h2>
                </div>

                {/* Tier filter bar */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {FILTER_TABS.map((tab) => (
                    <motion.button
                      key={String(tab.value)}
                      onClick={() => setTierFilter(tab.value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-4 py-1.5 rounded-2xl text-sm font-black border-2 transition-all ${
                        tierFilter === tab.value
                          ? "bg-playful-purple text-white border-white shadow-md"
                          : "bg-white text-gray-600 border-gray-200 hover:border-playful-purple"
                      }`}
                    >
                      {tab.emoji} {tab.label}
                    </motion.button>
                  ))}
                </div>

                {filteredNFTs.length === 0 ? (
                  <p className="text-gray-500 font-semibold py-4">
                    Không có NFT tier này.
                  </p>
                ) : (
                  <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                  >
                    {filteredNFTs.map((nft) => (
                      <motion.div key={nft.objectId} variants={item}>
                        <NFTCard
                          nft={nft}
                          onList={handleOpenMarketplace}
                          onTradeUp={
                            nft.tier === 1 || nft.tier === 2
                              ? handleOpenTradeUp
                              : undefined
                          }
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </section>
            )}

            {/* Scrap Items */}
            {scraps.length > 0 && (
              <section>
                <h2 className="font-display font-black text-2xl text-gray-900 mb-4 flex items-center gap-2">
                  🧩 Scrap
                  <span className="bg-playful-green text-white text-sm font-black px-3 py-1 rounded-full">
                    {scraps.length}
                  </span>
                </h2>
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                >
                  {scraps.map((scrap) => (
                    <motion.div key={scrap.objectId} variants={item}>
                      <ScrapCard scrap={scrap} />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}

            {/* Achievement Badges */}
            {badges.length > 0 && (
              <section>
                <h2 className="font-display font-black text-2xl text-gray-900 mb-4 flex items-center gap-2">
                  🏆 Danh hiệu
                  <span className="bg-sunny-400 text-white text-sm font-black px-3 py-1 rounded-full">
                    {badges.length}
                  </span>
                </h2>
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                >
                  {badges.map((badge) => (
                    <motion.div key={badge.objectId} variants={item}>
                      <BadgeCard badge={badge} />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
