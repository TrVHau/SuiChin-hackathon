import { Hammer } from "lucide-react";
import { motion } from "framer-motion";
import ConfettiBurst from "@/components/common/ConfettiBurst";
import type { CraftResultData, MintVisualConfig } from "@/hooks/useMintCraftFlow";

interface MintResultCardProps {
  craftResult: CraftResultData;
  cfg: MintVisualConfig;
  onReset: () => void;
  onBack: () => void;
}

export default function MintResultCard({
  craftResult,
  cfg,
  onReset,
  onBack,
}: MintResultCardProps) {
  return (
    <motion.div
      key="result"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`rounded-4xl shadow-2xl p-10 border-8 text-center ${cfg.bg} ${cfg.borderColor}`}
    >
      {craftResult.tier >= 2 && <ConfettiBurst />}
      <motion.div
        animate={{ rotate: [0, -15, 15, -15, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 0.9 }}
        className="text-9xl mb-6 flex justify-center"
      >
        {craftResult.tier === 0 ? (
          <img
            src="/nft/scrap.png"
            alt="Scrap"
            className="size-28 rounded-3xl object-cover border-4 border-gray-300 shadow-lg"
          />
        ) : (
          cfg.emoji
        )}
      </motion.div>
      <h2 className={`font-display font-black text-3xl mb-3 ${cfg.color}`}>
        {cfg.headline}
      </h2>
      <p className="text-gray-500 mb-8">
        {craftResult.success
          ? "NFT đã về ví của bạn 🎉"
          : "Scrap đã về ví — thử lại lần sau!"}
      </p>
      <div className="flex gap-4">
        <motion.button
          onClick={onReset}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 btn-playful bg-playful-purple text-white border-4 border-white text-xl"
        >
          <Hammer className="size-6" />
          Craft tiếp
        </motion.button>
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 btn-playful bg-white text-gray-800 border-4 border-gray-300 text-xl"
        >
          Về Dashboard
        </motion.button>
      </div>
    </motion.div>
  );
}
