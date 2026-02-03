import svgPaths from "@/imports/svg-0cqtapp470";
import { ArrowLeft, Lock } from "lucide-react";
import { motion } from "motion/react";

interface AchievementScreenNewProps {
  maxStreak: number;
  claimedAchievements: number[];
  onBack: () => void;
  onClaimAchievement: (milestone: number) => void;
}

const ACHIEVEMENTS = [
  { milestone: 1, title: "Người Mới Bắt Đầu", description: "Thắng liên tiếp 1 trận" },
  { milestone: 5, title: "Người Chơi Xuất Sắc", description: "Thắng liên tiếp 5 trận" },
  { milestone: 18, title: "Tay Chun Thiên Tài", description: "Thắng liên tiếp 18 trận" },
  { milestone: 36, title: "Cao Thủ Búng Chun", description: "Thắng liên tiếp 36 trận" },
  { milestone: 67, title: "Huyền Thoại Búng Chun", description: "Thắng liên tiếp 67 trận" },
];

function TrophyIcon() {
  return (
    <svg className="block size-full" fill="none" viewBox="0 0 24 24">
      <path d={svgPaths.p29361940} stroke="#101828" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d={svgPaths.p33e06580} stroke="#101828" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d={svgPaths.p203c5100} stroke="#101828" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M4 22H20" stroke="#101828" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d={svgPaths.p30c79280} stroke="#101828" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d={svgPaths.p3f521e00} stroke="#101828" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="block size-full" fill="none" viewBox="0 0 24 24">
      <path d={svgPaths.p2dfab7c0} stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d={svgPaths.p2c300c0} stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export default function AchievementScreenNew({
  maxStreak,
  claimedAchievements,
  onBack,
  onClaimAchievement,
}: AchievementScreenNewProps) {
  const getAchievementStatus = (milestone: number) => {
    if (claimedAchievements.includes(milestone)) return "claimed";
    if (maxStreak >= milestone) return "claimable";
    return "locked";
  };

  return (
    <div className="min-h-screen bg-[#fefce8]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={onBack}
            className="bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ArrowLeft className="size-6 text-[#4a5565]" />
          </button>
          <h1 className="font-bold text-[30px] text-[#1e2939]">Thành Tích (Soulbound)</h1>
        </div>

        {/* Achievements List */}
        <div className="space-y-4">
          {ACHIEVEMENTS.map((achievement, index) => {
            const status = getAchievementStatus(achievement.milestone);
            
            return (
              <motion.div
                key={achievement.milestone}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-[#f3f4f6] rounded-2xl p-6 flex items-center gap-4 transition-all ${
                  status === "locked" ? "opacity-60" : ""
                }`}
              >
                {/* Icon */}
                <div className="bg-[#e5e7eb] size-12 rounded-full flex items-center justify-center shrink-0">
                  {status === "locked" ? (
                    <div className="size-6">
                      <LockIcon />
                    </div>
                  ) : (
                    <div className="size-6">
                      <TrophyIcon />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-bold text-[18px] text-[#101828] mb-1">
                    {achievement.title}
                  </h3>
                  <p className="text-[14px] text-[#6a7282]">
                    {achievement.description}
                  </p>
                </div>

                {/* Status Icon */}
                <div className="size-6 shrink-0">
                  {status === "claimed" ? (
                    <svg className="size-full text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : status === "claimable" ? (
                    <button
                      onClick={() => onClaimAchievement(achievement.milestone)}
                      className="bg-green-500 hover:bg-green-600 text-white size-full rounded-full flex items-center justify-center transition-colors"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  ) : (
                    <Lock className="size-full text-[#99a1af]" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
