import { motion } from "framer-motion";
import type { ScrapItem } from "@/hooks/useOwnedNFTs";

interface InventoryScrapCardProps {
  scrap: ScrapItem;
}

export default function InventoryScrapCard({ scrap }: InventoryScrapCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, rotate: -1 }}
      className="rounded-3xl border-4 border-green-300 bg-green-50 p-4 shadow-lg"
    >
      {scrap.image_url ? (
        <img
          src={scrap.image_url}
          alt={scrap.name}
          className="w-full aspect-square object-cover rounded-2xl mb-3"
        />
      ) : (
        <div className="w-full aspect-square rounded-2xl mb-3 bg-white/60 flex items-center justify-center text-6xl">
          🧩
        </div>
      )}
      <p className="font-display font-black text-sm text-gray-900 truncate">{scrap.name}</p>
      <p className="text-xs font-bold text-gray-500">Scrap</p>
      <p className="text-xs text-gray-400 font-mono truncate mt-1">{scrap.objectId.slice(0, 10)}...</p>
    </motion.div>
  );
}
