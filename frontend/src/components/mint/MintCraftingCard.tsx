import { motion } from "framer-motion";

export default function MintCraftingCard() {
  return (
    <motion.div
      key="forging"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-4xl shadow-2xl p-10 border-8 border-playful-purple text-center"
    >
      <div className="relative flex justify-center mb-6">
        <motion.div
          animate={{
            rotate: [-15, 15, -15, 15, -15],
            scale: [1, 1.15, 1, 1.15, 1],
          }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="text-9xl select-none"
        >
          ⚒️
        </motion.div>
        <motion.div
          animate={{ scale: [1, 2.2, 1], opacity: [0.25, 0.05, 0.25] }}
          transition={{ duration: 1.1, repeat: Infinity }}
          className="absolute size-24 rounded-full bg-playful-purple/30 self-center -z-10"
        />
      </div>
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="mb-4 flex justify-center"
      >
        <img
          src="/nft/tier1_v1.png"
          alt="Tier 1 NFT"
          className="size-16 rounded-2xl object-cover border-2 border-playful-purple/30"
        />
      </motion.div>
      <h2 className="font-display font-black text-3xl text-playful-purple mb-2">
        Đang rèn NFT...
      </h2>
      <p className="text-gray-500 font-semibold mb-6">Chờ blockchain xác nhận ⛓️</p>
      <div className="flex justify-center gap-2">
        {[0, 0.25, 0.5].map((delay, i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.6, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.75, repeat: Infinity, delay }}
            className="size-3 bg-playful-purple rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
}
