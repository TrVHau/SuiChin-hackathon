import { ArrowLeft, Trophy, Lock, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

interface AchievementScreenProps {
  maxStreak: number;
  claimedAchievements: number[];
  onBack: () => void;
  onClaimAchievement: (milestone: number) => void;
}

const ACHIEVEMENTS = [
  { milestone: 1, title: "Người Mới Bắt Đầu", icon: "🎯", color: "from-green-400 to-green-600" },
  { milestone: 5, title: "Người Chơi Xuất Sắc", icon: "⭐", color: "from-blue-400 to-blue-600" },
  { milestone: 18, title: "Tay Chun Thiên Tài", icon: "🌟", color: "from-purple-400 to-purple-600" },
  { milestone: 36, title: "Cao Thủ Búng Chun", icon: "💫", color: "from-orange-400 to-orange-600" },
  { milestone: 67, title: "Huyền Thoại Búng Chun", icon: "👑", color: "from-yellow-400 to-yellow-600" },
];

export default function AchievementScreen({
  maxStreak,
  claimedAchievements,
  onBack,
  onClaimAchievement,
}: AchievementScreenProps) {
  const getAchievementStatus = (milestone: number) => {
    if (claimedAchievements.includes(milestone)) return "claimed";
    if (maxStreak >= milestone) return "claimable";
    return "locked";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="size-5" />
            Quay lại
          </button>
          
          <div className="flex items-center gap-3">
            <Trophy className="size-6 text-yellow-600" />
            <div className="text-right">
              <div className="text-[12px] text-gray-600">Max Streak</div>
              <div className="font-bold text-[20px] text-yellow-600">{maxStreak}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-12">
          <h1 className="font-bold text-[36px] sm:text-[48px] text-gray-900 mb-3">
            Thành Tích
          </h1>
          <p className="text-[16px] sm:text-[18px] text-gray-600 max-w-2xl mx-auto">
            Chinh phục các mốc streak để unlock danh hiệu Soulbound NFT
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-gray-900">Tiến trình của bạn</span>
            <span className="text-[14px] text-gray-600">
              {claimedAchievements.length} / {ACHIEVEMENTS.length} đã đạt được
            </span>
          </div>
          <div className="bg-gray-200 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-500"
              style={{ width: `${(claimedAchievements.length / ACHIEVEMENTS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="space-y-4">
          {ACHIEVEMENTS.map((achievement, index) => {
            const status = getAchievementStatus(achievement.milestone);
            
            return (
              <motion.div
                key={achievement.milestone}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-2xl p-6 shadow-lg border-2 transition-all ${
                  status === "claimed"
                    ? "border-green-500"
                    : status === "claimable"
                    ? "border-yellow-500 shadow-xl"
                    : "border-gray-200 opacity-75"
                }`}
              >
                <div className="flex items-center gap-6">
                  {/* Icon */}
                  <div
                    className={`size-20 sm:size-24 rounded-2xl flex items-center justify-center text-[40px] sm:text-[48px] bg-gradient-to-br ${achievement.color} ${
                      status === "locked" ? "opacity-50 grayscale" : ""
                    }`}
                  >
                    {achievement.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-[20px] sm:text-[24px] text-gray-900 mb-1">
                          {achievement.title}
                        </h3>
                        <p className="text-[14px] text-gray-600">
                          Streak milestone: <strong className="text-gray-900">{achievement.milestone}</strong>
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      <div>
                        {status === "claimed" && (
                          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full border border-green-300">
                            <CheckCircle className="size-4" />
                            <span className="text-[12px] font-bold">Đã nhận</span>
                          </div>
                        )}
                        {status === "claimable" && (
                          <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full border border-yellow-300 animate-pulse">
                            <Trophy className="size-4" />
                            <span className="text-[12px] font-bold">Có thể nhận!</span>
                          </div>
                        )}
                        {status === "locked" && (
                          <div className="flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full border border-gray-300">
                            <Lock className="size-4" />
                            <span className="text-[12px] font-bold">Khóa</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress to unlock */}
                    {status === "locked" && (
                      <div className="mt-3">
                        <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-purple-500 h-full transition-all"
                            style={{ width: `${Math.min((maxStreak / achievement.milestone) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-[12px] text-gray-600 mt-1">
                          Còn {achievement.milestone - maxStreak} streak nữa
                        </p>
                      </div>
                    )}

                    {/* Claim Button */}
                    {status === "claimable" && (
                      <button
                        onClick={() => onClaimAchievement(achievement.milestone)}
                        className="mt-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105"
                      >
                        Claim Danh Hiệu
                      </button>
                    )}
                  </div>
                </div>

                {/* Soulbound Badge */}
                {(status === "claimed" || status === "claimable") && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-[12px] text-purple-600">
                      <div className="bg-purple-100 px-2 py-1 rounded border border-purple-300">
                        <span className="font-bold">🔒 Soulbound NFT</span>
                      </div>
                      <span className="text-gray-600">Không thể chuyển nhượng</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h4 className="font-bold text-[16px] text-gray-900 mb-3">📖 Về Danh Hiệu</h4>
          <ul className="text-[14px] text-gray-700 space-y-2">
            <li>• Danh hiệu được unlock khi đạt Max Streak tương ứng</li>
            <li>• Mỗi danh hiệu là một Soulbound NFT (không thể chuyển nhượng)</li>
            <li>• Thua 1 trận → Current Streak reset về 0 (Max Streak giữ nguyên)</li>
            <li>• Miễn phí gas khi claim (Sponsored Transaction)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
