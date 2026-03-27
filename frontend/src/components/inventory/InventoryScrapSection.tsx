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
}

export default function InventoryScrapSection({ scraps }: InventoryScrapSectionProps) {
  if (scraps.length === 0) return null;

  return (
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
            <InventoryScrapCard scrap={scrap} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
