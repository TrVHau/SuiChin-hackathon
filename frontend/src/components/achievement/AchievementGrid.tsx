import { Trophy } from "lucide-react";
import AchievementCard from "@/components/achievement/AchievementCard";
import { ACHIEVEMENTS } from "@/components/achievement/achievementData";

interface AchievementGridProps {
  maxStreak: number;
  claimedMilestones: number[];
  onClaim: (milestone: number) => void;
}

export default function AchievementGrid({
  maxStreak,
  claimedMilestones,
  onClaim,
}: AchievementGridProps) {
  return (
    <div className="bg-white rounded-4xl shadow-2xl p-8 mb-8 border-8 border-sunny-400">
      <div className="flex items-center gap-4 mb-6">
        <Trophy className="size-10 text-sunny-600" />
        <div>
          <h2 className="font-display font-black text-3xl text-gray-900">
            Soulbound NFT Achievements
          </h2>
          <p className="text-gray-600 font-semibold">Danh hiệu không thể chuyển nhượng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ACHIEVEMENTS.map((achievement, index) => (
          <AchievementCard
            key={achievement.milestone}
            achievement={achievement}
            index={index}
            maxStreak={maxStreak}
            isClaimed={claimedMilestones.includes(achievement.milestone)}
            onClaim={onClaim}
          />
        ))}
      </div>
    </div>
  );
}
