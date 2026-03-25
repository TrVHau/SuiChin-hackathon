import { Tag } from "lucide-react";
import { motion } from "framer-motion";
import type { CuonChunNFT } from "@/hooks/useOwnedNFTs";

const TIER_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: "Bronze", emoji: "🥉" },
  2: { label: "Silver", emoji: "🥈" },
  3: { label: "Gold", emoji: "🥇" },
};

interface MarketplaceSellTabProps {
  marketConfigured: boolean;
  nftLoading: boolean;
  cuonChuns: CuonChunNFT[];
  listingNFT: CuonChunNFT | null;
  setListingNFT: (nft: CuonChunNFT | null) => void;
  priceInput: string;
  setPriceInput: (value: string) => void;
  submitting: boolean;
  onList: () => void;
}

export default function MarketplaceSellTab({
  marketConfigured,
  nftLoading,
  cuonChuns,
  listingNFT,
  setListingNFT,
  priceInput,
  setPriceInput,
  submitting,
  onList,
}: MarketplaceSellTabProps) {
  return (
    <motion.div key="sell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {!marketConfigured && (
        <div className="bg-yellow-50 border-4 border-yellow-400 rounded-3xl p-4 mb-6">
          <p className="text-yellow-800 font-bold text-sm">
            ⚠️ VITE_MARKET_OBJECT_ID chưa được cấu hình trong .env
          </p>
        </div>
      )}

      <h2 className="font-display font-black text-xl text-gray-900 mb-4">Chọn NFT để bán</h2>

      {nftLoading ? (
        <div className="text-center py-16">
          <div className="text-6xl animate-bounce mb-4">🔍</div>
          <p className="font-bold text-gray-600">Đang tải NFT...</p>
        </div>
      ) : cuonChuns.length === 0 ? (
        <div className="bg-white rounded-4xl p-10 text-center border-8 border-gray-200 shadow-xl">
          <div className="text-7xl mb-4">📭</div>
          <p className="font-display font-black text-2xl text-gray-900 mb-2">Không có NFT để bán</p>
          <p className="text-gray-500 font-semibold">Craft Cuộn Chun NFT ở Workshop trước</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-6">
            {cuonChuns.map((nft: CuonChunNFT) => {
              const tier = TIER_LABELS[nft.tier] ?? TIER_LABELS[1];
              const isSelected = listingNFT?.objectId === nft.objectId;
              return (
                <motion.button
                  key={nft.objectId}
                  onClick={() => setListingNFT(isSelected ? null : nft)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  className={`rounded-3xl border-4 p-3 transition-all ${
                    isSelected
                      ? "border-playful-green bg-green-50 shadow-xl ring-4 ring-playful-green/40"
                      : "border-gray-200 bg-white shadow-md"
                  }`}
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
                      className="w-full aspect-square object-cover rounded-2xl mb-2"
                    />
                  )}
                  <p className="text-xs font-bold text-gray-700">
                    {tier.emoji} {tier.label}
                  </p>
                  <p className="text-xs text-gray-400 font-mono truncate">{nft.objectId.slice(0, 6)}...</p>
                </motion.button>
              );
            })}
          </div>

          {listingNFT && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-4xl p-6 border-8 border-playful-green shadow-2xl"
            >
              <h3 className="font-display font-black text-xl text-gray-900 mb-4">
                Đặt giá cho {TIER_LABELS[listingNFT.tier]?.emoji} {listingNFT.name}
              </h3>
              <div className="flex gap-3 items-center mb-4">
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="Giá (SUI)..."
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="flex-1 border-4 border-gray-200 rounded-2xl px-4 py-3 font-bold text-xl focus:outline-none focus:border-playful-green"
                />
                <span className="font-black text-gray-600 text-xl">SUI</span>
              </div>
              <motion.button
                onClick={onList}
                disabled={!priceInput || submitting}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`w-full btn-playful text-xl flex items-center justify-center gap-3 border-4 ${
                  priceInput && !submitting
                    ? "bg-playful-green text-white border-white shadow-xl"
                    : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <div className="size-5 border-4 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Tag className="size-6" />
                )}
                {submitting ? "Đang list..." : "LIST NFT"}
              </motion.button>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
