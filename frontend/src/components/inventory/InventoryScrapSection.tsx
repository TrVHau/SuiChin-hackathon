import { motion } from "framer-motion";
import type { ScrapItem } from "@/hooks/useOwnedNFTs";
import InventoryScrapCard from "@/components/inventory/InventoryScrapCard";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

interface InventoryScrapSectionProps {
  scraps: ScrapItem[];
  onRecycleScrap: (scrap: ScrapItem) => void;
  onFuseScraps: (scraps: ScrapItem[]) => void;
  fusing: boolean;
  recyclingScrapId?: string | null;
}

export default function InventoryScrapSection({
  scraps,
  onRecycleScrap,
  onFuseScraps,
  fusing,
  recyclingScrapId,
}: InventoryScrapSectionProps) {
  if (scraps.length === 0) return null;

  return (
    <section>
      <h2 className="font-display font-black text-2xl text-gray-900 mb-4 flex items-center gap-2">
        🧩 Scrap
        <span className="bg-playful-green text-white text-sm font-black px-3 py-1 rounded-full">
          {scraps.length}
        </span>
      </h2>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => onRecycleScrap(scraps[0])}
          disabled={Boolean(recyclingScrapId) || fusing || scraps.length === 0}
          className="rounded-xl border-2 border-green-300 bg-green-50 px-4 py-2 text-sm font-black text-green-700 disabled:opacity-50"
        >
          {recyclingScrapId ? "Dang recycle..." : "Recycle 1 Scrap -> Chun"}
        </button>
        <button
          onClick={() => onFuseScraps(scraps)}
          disabled={fusing || scraps.length < 20}
          className="rounded-xl border-2 border-playful-purple bg-purple-50 px-4 py-2 text-sm font-black text-playful-purple disabled:opacity-50"
        >
          {fusing ? "Dang fuse..." : "Fuse 20 Scrap -> 1 Bronze"}
        </button>
      </div>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      >
        {scraps.map((scrap) => (
          <motion.div key={scrap.objectId} variants={item}>
            <InventoryScrapCard scrap={scrap} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
