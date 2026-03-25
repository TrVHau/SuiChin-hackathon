import { ShoppingCart, X } from "lucide-react";
import { motion } from "framer-motion";
import type { ListingMeta } from "@/hooks/useMarketplace";

const TIER_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: "Bronze", emoji: "🥉" },
  2: { label: "Silver", emoji: "🥈" },
  3: { label: "Gold", emoji: "🥇" },
};

function formatSui(mist: bigint): string {
  return (Number(mist) / 1_000_000_000).toFixed(3) + " SUI";
}

interface MarketplaceBrowseTabProps {
  listings: ListingMeta[];
  myListings: ListingMeta[];
  listLoading: boolean;
  submitting: boolean;
  accountAddress?: string;
  onCancel: (listing: ListingMeta) => void;
  onBuy: (listing: ListingMeta) => void;
}

export default function MarketplaceBrowseTab({
  listings,
  myListings,
  listLoading,
  submitting,
  accountAddress,
  onCancel,
  onBuy,
}: MarketplaceBrowseTabProps) {
  return (
    <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {myListings.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-black text-xl text-gray-900 mb-4">
            📌 Listing của bạn
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {myListings.map((l) => {
              const tier = TIER_LABELS[l.tier] ?? TIER_LABELS[1];
              return (
                <motion.div
                  key={l.listingId}
                  whileHover={{ scale: 1.03 }}
                  className="bg-yellow-50 border-4 border-yellow-400 rounded-3xl p-4 shadow-lg relative"
                >
                  <img
                    src={l.image_url || "/nft/tier1_v1.png"}
                    alt={l.name || `${tier.label} NFT`}
                    className="w-full aspect-square rounded-2xl object-cover mb-2"
                  />
                  <p className="font-black text-gray-900 text-sm truncate">{tier.label}</p>
                  <p className="font-bold text-playful-green">{formatSui(l.price)}</p>
                  <motion.button
                    onClick={() => onCancel(l)}
                    disabled={submitting}
                    whileHover={{ scale: 1.1 }}
                    className="mt-2 w-full bg-red-100 border-2 border-red-300 text-red-600 font-bold text-xs py-1.5 rounded-2xl flex items-center justify-center gap-1"
                  >
                    <X className="size-3" /> Hủy listing
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="font-display font-black text-xl text-gray-900 mb-4">
        Tất cả listing ({listings.length})
      </h2>
      {listLoading ? (
        <div className="text-center py-16">
          <div className="text-6xl animate-bounce mb-4">🔍</div>
          <p className="font-bold text-gray-600">Đang tải marketplace...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-4xl p-10 text-center border-8 border-gray-200 shadow-xl">
          <div className="text-7xl mb-4">🏜️</div>
          <p className="font-display font-black text-2xl text-gray-900 mb-2">Chưa có gì để mua</p>
          <p className="text-gray-500 font-semibold">Hãy list NFT đầu tiên!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {listings.map((l) => {
            const tier = TIER_LABELS[l.tier] ?? TIER_LABELS[1];
            const isOwn = l.seller === accountAddress;
            return (
              <motion.div
                key={l.listingId}
                whileHover={{ scale: 1.04 }}
                className="bg-white border-4 border-playful-green/40 rounded-3xl p-4 shadow-lg"
              >
                <img
                  src={l.image_url || "/nft/tier1_v1.png"}
                  alt={l.name || `${tier.label} NFT`}
                  className="w-full aspect-square rounded-2xl object-cover mb-2"
                />
                <p className="font-black text-gray-900 text-sm">{tier.label} NFT</p>
                <p className="font-bold text-playful-green text-lg">{formatSui(l.price)}</p>
                <p className="text-xs text-gray-400 truncate mb-3">
                  {isOwn ? "(Của bạn)" : l.seller.slice(0, 8) + "..."}
                </p>
                {!isOwn && (
                  <motion.button
                    onClick={() => onBuy(l)}
                    disabled={submitting}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-playful-green text-white font-bold text-sm py-2 rounded-2xl flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <ShoppingCart className="size-4" /> Mua
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
