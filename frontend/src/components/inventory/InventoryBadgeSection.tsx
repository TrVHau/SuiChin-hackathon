import { motion } from "framer-motion";
import type { AchievementBadgeItem } from "@/hooks/useOwnedNFTs";
import InventoryBadgeCard from "@/components/inventory/InventoryBadgeCard";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

interface InventoryBadgeSectionProps {
  badges: AchievementBadgeItem[];
}

export default function InventoryBadgeSection({ badges }: InventoryBadgeSectionProps) {
  if (badges.length === 0) return null;

  return (
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
            <InventoryBadgeCard badge={badge} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
