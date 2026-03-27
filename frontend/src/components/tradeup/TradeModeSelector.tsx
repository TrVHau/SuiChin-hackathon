import { motion } from "framer-motion";

export type TradeMode = "bronze-to-silver" | "silver-to-gold";

interface TradeConfigItem {
  title: string;
  inputEmoji: string;
  outputEmoji: string;
}

interface TradeModeSelectorProps {
  mode: TradeMode;
  configMap: Record<TradeMode, TradeConfigItem>;
  onChange: (mode: TradeMode) => void;
}

export default function TradeModeSelector({
  mode,
  configMap,
  onChange,
}: TradeModeSelectorProps) {
  return (
    <div className="flex gap-4 mb-8">
      {(Object.entries(configMap) as [TradeMode, TradeConfigItem][]).map(
        ([key, c]) => (
          <motion.button
            key={key}
            onClick={() => onChange(key)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex-1 py-4 rounded-3xl font-display font-black text-xl border-4 transition-all ${
              mode === key
                ? "bg-playful-orange text-white border-white shadow-2xl"
                : "bg-white text-gray-700 border-gray-200 shadow-md"
            }`}
          >
            {c.inputEmoji} {c.title} {c.outputEmoji}
          </motion.button>
        ),
      )}
    </div>
  );
}
