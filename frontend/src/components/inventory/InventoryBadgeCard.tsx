import { motion } from "framer-motion";
import type { AchievementBadgeItem } from "@/hooks/useOwnedNFTs";

interface InventoryBadgeCardProps {
  badge: AchievementBadgeItem;
}

export default function InventoryBadgeCard({ badge }: InventoryBadgeCardProps) {
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
      <p className="font-display font-black text-sm text-gray-900 truncate">{badge.name}</p>
      <p className="text-xs text-gray-600 font-semibold line-clamp-2">{badge.description}</p>
    </motion.div>
  );
}
