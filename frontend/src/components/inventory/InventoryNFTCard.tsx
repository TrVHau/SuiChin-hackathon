import { ShoppingCart, ArrowUpCircle, Coins } from "lucide-react";
import { motion } from "framer-motion";
import type { CuonChunNFT } from "@/hooks/useOwnedNFTs";

const TIER_LABELS: Record<
  number,
  { label: string; emoji: string; color: string }
> = {
  1: { label: "Bronze", emoji: "🥉", color: "border-amber-400 bg-amber-50" },
  2: { label: "Silver", emoji: "🥈", color: "border-gray-400 bg-gray-50" },
  3: { label: "Gold", emoji: "🥇", color: "border-yellow-400 bg-yellow-50" },
};

interface InventoryNFTCardProps {
  nft: CuonChunNFT;
  onList: () => void;
  onTradeUp?: () => void;
  onRedeem?: () => void;
  onRecycle?: () => void;
  recycling?: boolean;
  redeemLabel?: string;
  redeeming?: boolean;
  redeemDisabled?: boolean;
  redeemDisabledReason?: string;
}

export default function InventoryNFTCard({
  nft,
  onList,
  onTradeUp,
  onRedeem,
  onRecycle,
  recycling = false,
  redeemLabel,
  redeeming = false,
  redeemDisabled = false,
  redeemDisabledReason,
}: InventoryNFTCardProps) {
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
        <motion.button
          onClick={onList}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-black py-1.5 rounded-xl bg-white border-2 border-playful-blue text-playful-blue hover:bg-playful-blue hover:text-white transition-colors"
        >
          <ShoppingCart className="size-3" />
          List
        </motion.button>
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
      {onRedeem && (
        <motion.button
          onClick={onRedeem}
          whileHover={{ scale: redeemDisabled || redeeming ? 1 : 1.04 }}
          whileTap={{ scale: redeemDisabled || redeeming ? 1 : 0.96 }}
          disabled={redeemDisabled || redeeming}
          title={redeemDisabledReason}
          className="mt-1 w-full flex items-center justify-center gap-1 text-xs font-black py-1.5 rounded-xl bg-white border-2 border-playful-green text-playful-green hover:bg-playful-green hover:text-white transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <Coins className="size-3" />
          {redeeming ? "Redeeming..." : (redeemLabel ?? "Redeem")}
        </motion.button>
      )}
      {onRecycle && (
        <motion.button
          onClick={onRecycle}
          whileHover={{ scale: recycling ? 1 : 1.04 }}
          whileTap={{ scale: recycling ? 1 : 0.96 }}
          disabled={recycling}
          className="mt-1 w-full flex items-center justify-center gap-1 text-xs font-black py-1.5 rounded-xl bg-white border-2 border-red-300 text-red-600 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <Coins className="size-3" />
          {recycling ? "Recycling..." : "Recycle -> Chun"}
        </motion.button>
      )}
      {redeemDisabledReason && (
        <p className="mt-1 text-[10px] leading-tight text-gray-500 font-semibold">
          {redeemDisabledReason}
        </p>
      )}
    </motion.div>
  );
}
