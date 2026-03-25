import { motion } from "framer-motion";

interface TradeProcessingCardProps {
  selectedCount: number;
}

export default function TradeProcessingCard({ selectedCount }: TradeProcessingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-4xl shadow-2xl p-10 border-8 border-playful-orange text-center"
    >
      <div className="relative flex justify-center mb-6">
        <motion.div
          animate={{
            scale: [1, 1.25, 1, 1.2, 1],
            rotate: [0, -10, 10, -10, 0],
          }}
          transition={{ duration: 0.7, repeat: Infinity }}
          className="text-9xl select-none"
        >
          🔥
        </motion.div>
        <motion.div
          animate={{ scale: [1, 2.8, 1], opacity: [0.3, 0.04, 0.3] }}
          transition={{ duration: 1.0, repeat: Infinity }}
          className="absolute size-24 rounded-full bg-playful-orange/30 self-center -z-10"
        />
      </div>
      <h2 className="font-display font-black text-3xl text-playful-orange mb-2">
        Đang burn &amp; forge...
      </h2>
      <p className="text-gray-500 font-semibold mb-6">{selectedCount} NFT đang bị thiêu ⛓️</p>
      <div className="flex justify-center gap-2">
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.6, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.75, repeat: Infinity, delay }}
            className="size-3 bg-playful-orange rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
}
