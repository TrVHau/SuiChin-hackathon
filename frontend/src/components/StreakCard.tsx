import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useGame } from "@/providers/GameContext";

export function StreakCard() {
  const { playerData } = useGame();

  if (!playerData) return null;

  const winRate =
    playerData.wins + playerData.losses > 0
      ? Math.round(
          (playerData.wins / (playerData.wins + playerData.losses)) * 100
        )
      : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: 2 }}
      className="bg-white border-8 border-playful-orange rounded-4xl p-8 shadow-2xl"
    >
      <div className="flex items-center gap-3 mb-4">
        <Flame className="size-10 text-playful-orange" />
        <h3 className="font-display font-black text-2xl text-gray-900">
          Streak
        </h3>
      </div>
      <p className="text-gray-600 mb-4 font-semibold">
        Chuỗi thắng hiện tại
      </p>
      <div className="text-center mb-4">
        <motion.p
          key={playerData.streak}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-display font-black text-8xl text-playful-orange leading-none"
        >
          {playerData.streak}
        </motion.p>
      </div>
      <div className="bg-sunny-50 border-4 border-sunny-200 rounded-3xl p-4">
        <p className="text-xs font-bold text-gray-500 uppercase mb-1">
          Tỉ lệ thắng
        </p>
        <p className="font-black text-2xl text-playful-orange">
          {winRate}%
        </p>
      </div>
    </motion.div>
  );
}
