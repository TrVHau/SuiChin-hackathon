import { motion } from "framer-motion";

export type TierFilter = "all" | 1 | 2 | 3;

const FILTER_TABS: { label: string; value: TierFilter; emoji: string }[] = [
  { label: "Tất cả", value: "all", emoji: "" },
  { label: "Bronze", value: 1, emoji: "🥉" },
  { label: "Silver", value: 2, emoji: "🥈" },
  { label: "Gold", value: 3, emoji: "🥇" },
];

interface InventoryFilterTabsProps {
  value: TierFilter;
  onChange: (value: TierFilter) => void;
}

export default function InventoryFilterTabs({
  value,
  onChange,
}: InventoryFilterTabsProps) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {FILTER_TABS.map((tab) => (
        <motion.button
          key={String(tab.value)}
          onClick={() => onChange(tab.value)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-4 py-1.5 rounded-2xl text-sm font-black border-2 transition-all ${
            value === tab.value
              ? "bg-playful-purple text-white border-white shadow-md"
              : "bg-white text-gray-600 border-gray-200 hover:border-playful-purple"
          }`}
        >
          {tab.emoji} {tab.label}
        </motion.button>
      ))}
    </div>
  );
}
