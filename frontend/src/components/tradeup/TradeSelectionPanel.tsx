import { ArrowUpCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { CuonChunNFT } from "@/hooks/useOwnedNFTs";

interface TradeSelectionPanelProps {
  loading: boolean;
  eligible: CuonChunNFT[];
  selected: string[];
  inputRequired: number;
  title: string;
  inputEmoji: string;
  borderColor: string;
  canTrade: boolean;
  onToggleSelect: (id: string) => void;
  onTradeUp: () => void;
}

export default function TradeSelectionPanel({
  loading,
  eligible,
  selected,
  inputRequired,
  title,
  inputEmoji,
  borderColor,
  canTrade,
  onToggleSelect,
  onTradeUp,
}: TradeSelectionPanelProps) {
  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl animate-bounce mb-4">🔍</div>
        <p className="font-bold text-gray-600">Đang tải NFT...</p>
      </div>
    );
  }

  if (eligible.length === 0) {
    return (
      <div className="bg-white rounded-4xl p-10 text-center border-8 border-gray-200 shadow-xl">
        <div className="text-7xl mb-4">📭</div>
        <p className="font-display font-black text-2xl text-gray-900 mb-2">
          Không đủ {inputEmoji} NFT
        </p>
        <p className="text-gray-500 font-semibold">
          Cần ít nhất {inputRequired} {title.split(" → ")[0]} NFT
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-black text-xl text-gray-900">
          Chọn {inputRequired} NFT ({selected.length}/{inputRequired})
        </h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8">
        {eligible.map((nft: CuonChunNFT) => {
          const isSelected = selected.includes(nft.objectId);
          return (
            <motion.button
              key={nft.objectId}
              onClick={() => onToggleSelect(nft.objectId)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className={`rounded-3xl border-4 p-3 transition-all ${
                isSelected
                  ? "border-playful-orange bg-orange-50 shadow-xl ring-4 ring-playful-orange/40"
                  : `${borderColor} bg-white shadow-md`
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
                  className="w-full aspect-square object-cover rounded-2xl mb-2 bg-gray-100"
                />
              )}
              {isSelected && (
                <div className="absolute top-1 right-1 bg-playful-orange text-white text-xs font-black px-1.5 rounded-full">
                  ✓
                </div>
              )}
              <p className="text-xs font-bold text-gray-600 truncate">{nft.objectId.slice(0, 6)}...</p>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        onClick={onTradeUp}
        disabled={!canTrade}
        whileHover={canTrade ? { scale: 1.04 } : {}}
        whileTap={canTrade ? { scale: 0.96 } : {}}
        className={`w-full btn-playful text-2xl flex items-center justify-center gap-3 border-4 ${
          canTrade
            ? "bg-gradient-to-r from-playful-orange to-playful-pink text-white border-white shadow-2xl"
            : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
        }`}
      >
        <ArrowUpCircle className="size-7" />
        TRADE UP ({selected.length}/{inputRequired})
      </motion.button>
    </>
  );
}
