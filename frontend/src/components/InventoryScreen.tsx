import { ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import type {
  CuonChunNFT,
  ScrapItem,
  AchievementBadgeItem,
} from "@/hooks/useOwnedNFTs";

interface InventoryScreenProps {
  onBack: () => void;
}

const TIER_LABELS: Record<
  number,
  { label: string; emoji: string; color: string }
> = {
  1: { label: "Bronze", emoji: "🥉", color: "border-amber-400 bg-amber-50" },
  2: { label: "Silver", emoji: "🥈", color: "border-gray-400 bg-gray-50" },
  3: { label: "Gold", emoji: "🥇", color: "border-yellow-400 bg-yellow-50" },
};

function NFTCard({ nft }: { nft: CuonChunNFT }) {
  const tier = TIER_LABELS[nft.tier] ?? TIER_LABELS[1];
  return (
    <motion.div
      whileHover={{ scale: 1.04, rotate: 1 }}
      className={`rounded-3xl border-4 p-4 shadow-lg ${tier.color}`}
    >
      {nft.image_url ? (
        <img
          src={nft.image_url}
          alt={nft.name}
          className="w-full aspect-square object-cover rounded-2xl mb-3"
        />
      ) : (
        <div className="w-full aspect-square rounded-2xl mb-3 bg-white/60 flex items-center justify-center text-6xl">
          🏮
        </div>
      )}
      <p className="font-display font-black text-sm text-gray-900 truncate">
        {nft.name}
      </p>
      <p className="text-xs font-bold text-gray-500">
        {tier.emoji} {tier.label}
      </p>
      <p className="text-xs text-gray-400 font-mono truncate mt-1">
        {nft.objectId.slice(0, 10)}...
      </p>
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

export default function InventoryScreen({ onBack }: InventoryScreenProps) {
  const { cuonChuns, scraps, badges, loading, refetch } = useOwnedNFTs();

  const totalItems = cuonChuns.length + scraps.length + badges.length;

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              className="bg-white p-5 rounded-full shadow-2xl border-4 border-playful-blue"
            >
              <ArrowLeft className="size-7 text-playful-blue" />
            </motion.button>
            <div className="flex items-center gap-3">
              <span className="text-5xl">🎒</span>
              <div>
                <h1 className="font-display font-black text-4xl text-gray-900">
                  Kho Đồ
                </h1>
                <p className="text-gray-600 font-semibold">
                  {totalItems} vật phẩm
                </p>
              </div>
            </div>
          </div>
          <motion.button
            onClick={refetch}
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

        {loading && totalItems === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🔍</div>
              <p className="font-bold text-gray-600 text-xl">
                Đang tải kho đồ...
              </p>
            </div>
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
                <h2 className="font-display font-black text-2xl text-gray-900 mb-4 flex items-center gap-2">
                  🏮 Cuộn Chun NFT
                  <span className="bg-playful-purple text-white text-sm font-black px-3 py-1 rounded-full">
                    {cuonChuns.length}
                  </span>
                </h2>
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                >
                  {cuonChuns.map((nft) => (
                    <motion.div key={nft.objectId} variants={item}>
                      <NFTCard nft={nft} />
                    </motion.div>
                  ))}
                </motion.div>
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
