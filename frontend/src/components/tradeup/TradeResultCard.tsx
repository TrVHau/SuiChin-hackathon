import { motion } from "framer-motion";
import ConfettiBurst from "@/components/common/ConfettiBurst";
import type {
  TradeUpResultData,
  TradeResultVisualConfig,
} from "@/hooks/useTradeUpFlow";

interface TradeResultCardProps {
  result: TradeUpResultData;
  cfg: TradeResultVisualConfig;
  onReset: () => void;
}

export default function TradeResultCard({ result, cfg, onReset }: TradeResultCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`rounded-4xl shadow-2xl p-8 border-8 text-center mb-6 ${cfg.bg} ${cfg.borderColor}`}
    >
      {result.success && result.toTier >= 2 && <ConfettiBurst />}
      <motion.div
        animate={{ rotate: [0, -15, 15, -15, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 0.9 }}
        className="text-8xl mb-4"
      >
        {cfg.emoji}
      </motion.div>
      <h3 className={`font-display font-black text-2xl mb-2 ${cfg.color}`}>{cfg.headline}</h3>
      <p className="text-gray-500 font-semibold mb-1">Roll: {result.roll} / 99</p>
      <p className="text-gray-500 text-sm mb-4">
        {result.success ? "NFT đã về ví 🎉" : "Scrap đã về ví — thử lại lần sau!"}
      </p>
      <motion.button
        onClick={onReset}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="btn-playful bg-playful-orange text-white border-4 border-white px-8"
      >
        Trade tiếp
      </motion.button>
    </motion.div>
  );
}
