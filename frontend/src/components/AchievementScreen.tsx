import { ArrowLeft, Trophy, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface AchievementScreenProps {
  onBack: () => void;
  maxStreak: number;
  claimedAchievements: number[];
  onClaim: (milestone: number) => void;
}

const ACHIEVEMENTS = [
  {
    milestone: 1,
    title: "Khởi Đầu",
    description: "Đạt streak 1",
    image: "/achievements/achievement1.png",
  },
  {
    milestone: 5,
    title: "Nhiệt Huyết",
    description: "Đạt streak 5",
    image: "/achievements/achievement2.png",
  },
  {
    milestone: 18,
    title: "Cao Thủ",
    description: "Đạt streak 18",
    image: "/achievements/achievement3.png",
  },
  {
    milestone: 36,
    title: "Huyền Thoại",
    description: "Đạt streak 36",
    image: "/achievements/achievement4.png",
  },
  {
    milestone: 67,
    title: "Bất Khả Chiến Bại",
    description: "Đạt streak 67",
    image: "/achievements/achievement5.png",
  },
];

export default function AchievementScreen({
  onBack,
  maxStreak,
  claimedAchievements,
  onClaim,
}: AchievementScreenProps) {
  const handleClaim = async (milestone: number) => {
    toast.loading("Đang claim achievement...", { id: "achievement" });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onClaim(milestone);
    toast.success("Claim thành công!", { id: "achievement" });
  };

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-5xl mx-auto px-6 py-10">
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
              <h1 className="font-display font-black text-4xl text-gray-900">
                Thành Tích
              </h1>
            </div>
            <p className="text-gray-600 mt-2 font-semibold text-lg">
              Max Streak: {maxStreak}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-4xl shadow-2xl p-8 mb-8 border-8 border-sunny-400">
          <div className="flex items-center gap-4 mb-6">
            <Trophy className="size-10 text-sunny-600" />
            <div>
              <h2 className="font-display font-black text-3xl text-gray-900">
                Soulbound NFT Achievements
              </h2>
              <p className="text-gray-600 font-semibold">
                Danh hiệu không thể chuyển nhượng
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ACHIEVEMENTS.map((achievement, index) => {
              const isUnlocked = maxStreak >= achievement.milestone;
              const isClaimed = claimedAchievements.includes(achievement.milestone);
              const canClaim = isUnlocked && !isClaimed;

              return (
                <motion.div
                  key={achievement.milestone}
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
                      {
                        <img
                          src={achievement.image}
                          alt={achievement.title}
                          className="w-12 h-12 "
                        />
                      }
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-display font-black text-2xl text-gray-900">
                          {achievement.title}
                        </h3>
                        {isClaimed && (
                          <span className="bg-playful-green text-white text-xs px-3 py-1 rounded-full font-bold">
                            CLAIMED
                          </span>
                        )}
                        {!isUnlocked && (
                          <Lock className="size-5 text-gray-400" />
                        )}
                      </div>
                      <p className="text-gray-700 mb-4 font-semibold">
                        {achievement.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-display font-black text-gray-800 text-lg">
                            Streak: {achievement.milestone}
                          </span>
                        </div>
                        {canClaim && (
                          <motion.button
                            onClick={() => handleClaim(achievement.milestone)}
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

                  {/* Progress bar for locked achievements */}
                  {!isUnlocked && (
                    <div className="mt-4">
                      <div className="bg-gray-300 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sunny-400 to-playful-orange h-full transition-all"
                          style={{
                            width: `${Math.min((maxStreak / achievement.milestone) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-semibold">
                        {maxStreak}/{achievement.milestone}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="bg-playful-blue/20 rounded-3xl p-6 border-4 border-playful-blue">
          <h3 className="font-display font-black text-xl text-gray-900 mb-3">
            💡 Lưu ý
          </h3>
          <ul className="text-gray-800 space-y-2 font-semibold">
            <li>• Achievement là Soulbound NFT, không thể transfer</li>
            <li>• Đạt streak milestone để unlock achievement</li>
            <li>• Claim để nhận NFT danh hiệu vĩnh viễn</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
