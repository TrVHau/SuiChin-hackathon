import { ArrowLeft, RefreshCw, ShoppingCart, Tag, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import type { CuonChunNFT } from "@/hooks/useOwnedNFTs";
import type { ListingMeta } from "@/hooks/useMarketplace";
import {
  buildListNFTTx,
  buildBuyNFTTx,
  buildCancelListingTx,
} from "@/lib/sui-client";
import { MARKET_OBJECT_ID } from "@/config/sui.config";

interface MarketplaceScreenProps {
  onBack: () => void;
}

const TIER_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: "Bronze", emoji: "🥉" },
  2: { label: "Silver", emoji: "🥈" },
  3: { label: "Gold", emoji: "🥇" },
};

function formatSui(mist: bigint): string {
  return (Number(mist) / 1_000_000_000).toFixed(3) + " SUI";
}

type Tab = "browse" | "sell";

export default function MarketplaceScreen({ onBack }: MarketplaceScreenProps) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const {
    listings,
    loading: listLoading,
    refetch: refetchListings,
  } = useMarketplace();
  const {
    cuonChuns,
    loading: nftLoading,
    refetch: refetchNFTs,
  } = useOwnedNFTs();

  const [tab, setTab] = useState<Tab>("browse");
  const [listingNFT, setListingNFT] = useState<CuonChunNFT | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const myListings = listings.filter((l) => l.seller === account?.address);

  /* ─── Buy NFT ─── */
  const handleBuy = (listing: ListingMeta) => {
    if (!MARKET_OBJECT_ID) {
      toast.error("Market object chưa được cấu hình");
      return;
    }
    setSubmitting(true);
    toast.loading("Đang mua NFT...", { id: "buy" });

    const tx = buildBuyNFTTx(
      MARKET_OBJECT_ID,
      listing.listingId,
      listing.price,
    );
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          setSubmitting(false);
          toast.success("Mua thành công! NFT đã về ví 🎉", { id: "buy" });
          refetchListings();
          refetchNFTs();
        },
        onError: (err) => {
          setSubmitting(false);
          toast.error(`Mua thất bại: ${err.message}`, { id: "buy" });
        },
      },
    );
  };

  /* ─── List NFT ─── */
  const handleList = () => {
    if (!listingNFT || !MARKET_OBJECT_ID) return;
    const priceSui = parseFloat(priceInput);
    if (isNaN(priceSui) || priceSui <= 0) {
      toast.error("Nhập giá hợp lệ (SUI)");
      return;
    }
    const priceMist = BigInt(Math.round(priceSui * 1_000_000_000));

    setSubmitting(true);
    toast.loading("Đang list NFT lên Marketplace...", { id: "list" });

    const tx = buildListNFTTx(MARKET_OBJECT_ID, listingNFT.objectId, priceMist);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          setSubmitting(false);
          setListingNFT(null);
          setPriceInput("");
          toast.success("List NFT thành công! 🏷️", { id: "list" });
          refetchListings();
          refetchNFTs();
        },
        onError: (err) => {
          setSubmitting(false);
          toast.error(`List thất bại: ${err.message}`, { id: "list" });
        },
      },
    );
  };

  /* ─── Cancel Listing ─── */
  const handleCancel = (listing: ListingMeta) => {
    if (!MARKET_OBJECT_ID) return;
    setSubmitting(true);
    toast.loading("Đang hủy listing...", { id: "cancel" });

    const tx = buildCancelListingTx(MARKET_OBJECT_ID, listing.listingId);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          setSubmitting(false);
          toast.success("Đã hủy listing, NFT về ví 👌", { id: "cancel" });
          refetchListings();
          refetchNFTs();
        },
        onError: (err) => {
          setSubmitting(false);
          toast.error(`Hủy thất bại: ${err.message}`, { id: "cancel" });
        },
      },
    );
  };

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
              className="bg-white p-5 rounded-full shadow-2xl border-4 border-playful-green"
            >
              <ArrowLeft className="size-7 text-playful-green" />
            </motion.button>
            <div className="flex items-center gap-3">
              <span className="text-5xl">🛒</span>
              <h1 className="font-display font-black text-4xl text-gray-900">
                Marketplace
              </h1>
            </div>
          </div>
          <motion.button
            onClick={() => {
              refetchListings();
              refetchNFTs();
            }}
            disabled={listLoading || nftLoading}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="bg-white p-4 rounded-full shadow-xl border-4 border-gray-200 disabled:opacity-50"
          >
            <RefreshCw
              className={`size-6 text-gray-600 ${listLoading || nftLoading ? "animate-spin" : ""}`}
            />
          </motion.button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-4 mb-8">
          {(["browse", "sell"] as Tab[]).map((t) => (
            <motion.button
              key={t}
              onClick={() => setTab(t)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`flex-1 py-4 rounded-3xl font-display font-black text-xl border-4 transition-all ${
                tab === t
                  ? "bg-playful-green text-white border-white shadow-2xl"
                  : "bg-white text-gray-700 border-gray-200 shadow-md"
              }`}
            >
              {t === "browse" ? "🔍 Mua NFT" : "🏷️ Bán NFT"}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "browse" ? (
            /* ─── Browse / Buy tab ─── */
            <motion.div
              key="browse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* My listings (can cancel) */}
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
                          <div className="text-4xl text-center mb-2">
                            {tier.emoji} 🏮
                          </div>
                          <p className="font-black text-gray-900 text-sm truncate">
                            {tier.label}
                          </p>
                          <p className="font-bold text-playful-green">
                            {formatSui(l.price)}
                          </p>
                          <motion.button
                            onClick={() => handleCancel(l)}
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

              {/* All listings */}
              <h2 className="font-display font-black text-xl text-gray-900 mb-4">
                Tất cả listing ({listings.length})
              </h2>
              {listLoading ? (
                <div className="text-center py-16">
                  <div className="text-6xl animate-bounce mb-4">🔍</div>
                  <p className="font-bold text-gray-600">
                    Đang tải marketplace...
                  </p>
                </div>
              ) : listings.length === 0 ? (
                <div className="bg-white rounded-4xl p-10 text-center border-8 border-gray-200 shadow-xl">
                  <div className="text-7xl mb-4">🏜️</div>
                  <p className="font-display font-black text-2xl text-gray-900 mb-2">
                    Chưa có gì để mua
                  </p>
                  <p className="text-gray-500 font-semibold">
                    Hãy list NFT đầu tiên!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {listings.map((l) => {
                    const tier = TIER_LABELS[l.tier] ?? TIER_LABELS[1];
                    const isOwn = l.seller === account?.address;
                    return (
                      <motion.div
                        key={l.listingId}
                        whileHover={{ scale: 1.04 }}
                        className="bg-white border-4 border-playful-green/40 rounded-3xl p-4 shadow-lg"
                      >
                        <div className="text-4xl text-center mb-2">
                          {tier.emoji} 🏮
                        </div>
                        <p className="font-black text-gray-900 text-sm">
                          {tier.label} NFT
                        </p>
                        <p className="font-bold text-playful-green text-lg">
                          {formatSui(l.price)}
                        </p>
                        <p className="text-xs text-gray-400 truncate mb-3">
                          {isOwn ? "(Của bạn)" : l.seller.slice(0, 8) + "..."}
                        </p>
                        {!isOwn && (
                          <motion.button
                            onClick={() => handleBuy(l)}
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
          ) : (
            /* ─── Sell tab ─── */
            <motion.div
              key="sell"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {!MARKET_OBJECT_ID && (
                <div className="bg-yellow-50 border-4 border-yellow-400 rounded-3xl p-4 mb-6">
                  <p className="text-yellow-800 font-bold text-sm">
                    ⚠️ VITE_MARKET_OBJECT_ID chưa được cấu hình trong .env
                  </p>
                </div>
              )}

              <h2 className="font-display font-black text-xl text-gray-900 mb-4">
                Chọn NFT để bán
              </h2>

              {nftLoading ? (
                <div className="text-center py-16">
                  <div className="text-6xl animate-bounce mb-4">🔍</div>
                  <p className="font-bold text-gray-600">Đang tải NFT...</p>
                </div>
              ) : cuonChuns.length === 0 ? (
                <div className="bg-white rounded-4xl p-10 text-center border-8 border-gray-200 shadow-xl">
                  <div className="text-7xl mb-4">📭</div>
                  <p className="font-display font-black text-2xl text-gray-900 mb-2">
                    Không có NFT để bán
                  </p>
                  <p className="text-gray-500 font-semibold">
                    Craft Cuộn Chun NFT ở Workshop trước
                  </p>
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
                            <div className="w-full aspect-square rounded-2xl mb-2 bg-gray-100 flex items-center justify-center text-4xl">
                              🏮
                            </div>
                          )}
                          <p className="text-xs font-bold text-gray-700">
                            {tier.emoji} {tier.label}
                          </p>
                          <p className="text-xs text-gray-400 font-mono truncate">
                            {nft.objectId.slice(0, 6)}...
                          </p>
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
                        Đặt giá cho {TIER_LABELS[listingNFT.tier]?.emoji}{" "}
                        {listingNFT.name}
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
                        <span className="font-black text-gray-600 text-xl">
                          SUI
                        </span>
                      </div>
                      <motion.button
                        onClick={handleList}
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
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
