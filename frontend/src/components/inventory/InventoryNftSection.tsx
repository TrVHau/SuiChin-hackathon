import { motion } from "framer-motion";
import type { CuonChunNFT } from "@/hooks/useOwnedNFTs";
import InventoryFilterTabs, {
  type TierFilter,
} from "@/components/inventory/InventoryFilterTabs";
import InventoryNFTCard from "@/components/inventory/InventoryNFTCard";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

interface InventoryNftSectionProps {
  cuonChuns: CuonChunNFT[];
  filteredNFTs: CuonChunNFT[];
  tierFilter: TierFilter;
  setTierFilter: (filter: TierFilter) => void;
  onOpenMarketplace: () => void;
  onOpenTradeUp: () => void;
  onRedeem: (nft: CuonChunNFT) => void;
  onRecycleNft: (nft: CuonChunNFT) => void;
  isRecyclingNft: (objectId: string) => boolean;
  isRedeeming: (objectId: string) => boolean;
  getRedeemLabel: (tier: number) => string;
  isRedeemDisabled: (tier: number) => boolean;
  getRedeemDisabledReason: (tier: number) => string | undefined;
}

export default function InventoryNftSection({
  cuonChuns,
  filteredNFTs,
  tierFilter,
  setTierFilter,
  onOpenMarketplace,
  onOpenTradeUp,
  onRedeem,
  onRecycleNft,
  isRecyclingNft,
  isRedeeming,
  getRedeemLabel,
  isRedeemDisabled,
  getRedeemDisabledReason,
}: InventoryNftSectionProps) {
  if (cuonChuns.length === 0) return null;

  return (
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

      <InventoryFilterTabs value={tierFilter} onChange={setTierFilter} />

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
              <InventoryNFTCard
                nft={nft}
                onList={onOpenMarketplace}
                onTradeUp={
                  nft.tier === 1 || nft.tier === 2 ? onOpenTradeUp : undefined
                }
                onRedeem={() => onRedeem(nft)}
                onRecycle={() => onRecycleNft(nft)}
                recycling={isRecyclingNft(nft.objectId)}
                redeeming={isRedeeming(nft.objectId)}
                redeemLabel={getRedeemLabel(nft.tier)}
                redeemDisabled={isRedeemDisabled(nft.tier)}
                redeemDisabledReason={getRedeemDisabledReason(nft.tier)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
