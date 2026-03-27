import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface AchievementHeaderProps {
  maxStreak: number;
  onBack: () => void;
}

export default function AchievementHeader({ maxStreak, onBack }: AchievementHeaderProps) {
  return (
    <div className="flex items-center gap-6 mb-8">
      <motion.button
        onClick={onBack}
        whileHover={{ scale: 1.1, rotate: -5 }}
        whileTap={{ scale: 0.9 }}
        className="bg-white p-5 rounded-full shadow-2xl border-4 border-sunny-400"
      >
        <ArrowLeft className="size-7 text-sunny-600" />
      </motion.button>
      <div>
        <div className="flex items-center gap-3">
          <span className="text-5xl">🏆</span>
          <h1 className="font-display font-black text-4xl text-gray-900">Thành Tích</h1>
        </div>
        <p className="text-gray-600 mt-2 font-semibold text-lg">Max Streak: {maxStreak}</p>
      </div>
    </div>
  );
}
