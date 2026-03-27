import { motion } from "framer-motion";

export type MarketplaceTab = "browse" | "sell";

interface MarketplaceTabSwitcherProps {
  tab: MarketplaceTab;
  onChange: (tab: MarketplaceTab) => void;
}

export default function MarketplaceTabSwitcher({
  tab,
  onChange,
}: MarketplaceTabSwitcherProps) {
  return (
    <div className="flex gap-4 mb-8">
      {(["browse", "sell"] as MarketplaceTab[]).map((t) => (
        <motion.button
          key={t}
          onClick={() => onChange(t)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={`flex-1 py-4 rounded-3xl font-display font-black text-xl border-4 transition-all ${
            tab === t
              ? "bg-playful-green text-white border-white shadow-2xl"
              : "bg-white text-gray-700 border-gray-200 shadow-md"
          }`}
        >
          {t === "browse" ? "🔍 Mua NFT" : "🏷️ Bán NFT"}
        </motion.button>
      ))}
    </div>
  );
}
