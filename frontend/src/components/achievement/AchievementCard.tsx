import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import type { AchievementItem } from "@/components/achievement/achievementData";

interface AchievementCardProps {
  achievement: AchievementItem;
  index: number;
  maxStreak: number;
  isClaimed: boolean;
  onClaim: (milestone: number) => void;
}

export default function AchievementCard({
  achievement,
  index,
  maxStreak,
  isClaimed,
  onClaim,
}: AchievementCardProps) {
  const isUnlocked = maxStreak >= achievement.milestone;
  const canClaim = isUnlocked && !isClaimed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={canClaim ? { scale: 1.02, rotate: 1 } : {}}
      className={`rounded-3xl p-6 border-4 transition-all ${
        isClaimed
          ? "bg-playful-green/20 border-playful-green shadow-xl"
          : isUnlocked
            ? "bg-sunny-200 border-sunny-400 shadow-xl"
            : "bg-gray-100 border-gray-300 opacity-60"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="text-6xl">
          <img src={achievement.image} alt={achievement.title} className="w-12 h-12" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-display font-black text-2xl text-gray-900">{achievement.title}</h3>
            {isClaimed && (
              <span className="bg-playful-green text-white text-xs px-3 py-1 rounded-full font-bold">
                CLAIMED
              </span>
            )}
            {!isUnlocked && <Lock className="size-5 text-gray-400" />}
          </div>
          <p className="text-gray-700 mb-4 font-semibold">{achievement.description}</p>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-display font-black text-gray-800 text-lg">
                Streak: {achievement.milestone}
              </span>
            </div>
            {canClaim && (
              <motion.button
                onClick={() => onClaim(achievement.milestone)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="bg-gradient-to-r from-sunny-500 to-playful-orange text-white px-6 py-3 rounded-full font-display font-black shadow-lg border-2 border-white"
              >
                CLAIM
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {!isUnlocked && (
        <div className="mt-4">
          <div className="bg-gray-300 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sunny-400 to-playful-orange h-full transition-all"
              style={{ width: `${Math.min((maxStreak / achievement.milestone) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-1 font-semibold">
            {maxStreak}/{achievement.milestone}
          </p>
        </div>
      )}
    </motion.div>
  );
}
