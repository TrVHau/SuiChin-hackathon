import { User, Flame, Gift, Ticket, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useProfile } from "@/hooks/useProfile";

interface DashboardProps {
  onStartGame: () => void;
  onOpenFaucet: () => void;
  onOpenMintNFT: () => void;
  onOpenAchievements: () => void;
}

export default function Dashboard({
  onStartGame,
  onOpenFaucet,
  onOpenMintNFT,
  onOpenAchievements,
}: DashboardProps) {
  const { profile, totalPoints, isLoading } = useProfile();

  // Derive data from profile
  const playerData = {
    tier1: profile?.tier1 ?? 0,
    tier2: profile?.tier2 ?? 0,
    tier3: profile?.tier3 ?? 0,
    maxStreak: profile?.max_streak ?? 0,
    currentStreak: profile?.current_streak ?? 0,
    address: profile?.address ?? "0x...",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#fdc700] size-[48px] sm:size-[58px] rounded-lg flex items-center justify-center border-2 border-[#fdc700]">
              <span className="font-bold text-[20px] sm:text-[24px] text-[#155dfc]">
                SC
              </span>
            </div>
            <div>
              <h1 className="font-bold text-[20px] sm:text-[24px] text-gray-900">
                SuiChin
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Chun Display */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 bg-orange-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-orange-200">
                <span className="text-[16px] sm:text-[18px]">🥉</span>
                <span className="font-bold text-[14px] sm:text-[16px] text-gray-900">
                  {playerData.tier1}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-200">
                <span className="text-[16px] sm:text-[18px]">🥈</span>
                <span className="font-bold text-[14px] sm:text-[16px] text-gray-900">
                  {playerData.tier2}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-yellow-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-yellow-200">
                <span className="text-[16px] sm:text-[18px]">🥇</span>
                <span className="font-bold text-[14px] sm:text-[16px] text-gray-900">
                  {playerData.tier3}
                </span>
              </div>
            </div>

            {/* Points */}
            <div className="hidden sm:flex items-center gap-2 bg-yellow-100 px-3 py-1.5 rounded-lg border border-yellow-300">
              <Trophy className="size-4 text-yellow-600" />
              <span className="font-bold text-[16px] text-gray-900">
                {totalPoints} pts
              </span>
            </div>

            {/* User */}
            <button className="bg-blue-500 p-2 rounded-full hover:bg-blue-600 transition-colors">
              <User className="size-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Start Session Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10 size-32 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 left-10 size-40 bg-white rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <h2 className="font-bold text-[28px] sm:text-[36px] mb-3">
                Bắt Đầu Session!
              </h2>
              <p className="text-blue-100 mb-6 text-[14px] sm:text-[16px] max-w-lg">
                Vào session chơi game, đấu với bot, tích lũy streak và chun. Kết
                quả sẽ được lưu lên blockchain khi bạn thoát.
              </p>
              <button
                onClick={onStartGame}
                className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-[14px] sm:text-[16px]"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                CHƠI GAME
              </button>
            </div>
          </motion.div>

          {/* Max Streak Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <Flame className="size-6 text-orange-500" />
              <h3 className="font-bold text-[18px] text-gray-900">
                Max Streak
              </h3>
            </div>
            <p className="text-gray-500 text-[14px] mb-4">
              Kỷ lục chuỗi thắng của bạn
            </p>
            <div className="text-center mb-4">
              <p className="font-bold text-[64px] text-orange-500 leading-none">
                {playerData.maxStreak}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <p className="text-[12px] text-gray-600 mb-1">Current Streak:</p>
              <p className="font-bold text-[18px] text-orange-600">
                {playerData.currentStreak}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <div>
          <h2 className="font-bold text-[24px] text-gray-900 mb-4">
            Tính năng khác
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Faucet Card */}
            <motion.button
              onClick={onOpenFaucet}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 text-left hover:shadow-lg transition-all border border-pink-200"
            >
              <div className="bg-pink-500 size-14 rounded-xl flex items-center justify-center mb-4">
                <Gift className="size-7 text-white" />
              </div>
              <h3 className="font-bold text-[20px] text-gray-900 mb-2">
                Xin Chun (Faucet)
              </h3>
              <p className="text-gray-600 text-[14px]">Nhận chun miễn phí</p>
            </motion.button>

            {/* Mint NFT Card */}
            <motion.button
              onClick={onOpenMintNFT}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-left hover:shadow-lg transition-all border border-blue-200"
            >
              <div className="bg-blue-500 size-14 rounded-xl flex items-center justify-center mb-4">
                <Ticket className="size-7 text-white" />
              </div>
              <h3 className="font-bold text-[20px] text-gray-900 mb-2">
                Mint Cuộn Chun
              </h3>
              <p className="text-gray-600 text-[14px]">Đổi điểm lấy NFT</p>
            </motion.button>

            {/* Achievement Card */}
            <motion.button
              onClick={onOpenAchievements}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 text-left hover:shadow-lg transition-all border border-yellow-200"
            >
              <div className="bg-yellow-500 size-14 rounded-xl flex items-center justify-center mb-4">
                <Trophy className="size-7 text-white" />
              </div>
              <h3 className="font-bold text-[20px] text-gray-900 mb-2">
                Thành Tích
              </h3>
              <p className="text-gray-600 text-[14px]">Soulbound Titles</p>
            </motion.button>
          </div>
        </div>

        {/* Address Display (Mobile) */}
        <div className="lg:hidden bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-[12px] text-gray-500 mb-1">zkLogin Address</p>
          <p className="font-mono text-[12px] text-gray-900 break-all">
            {playerData.address}
          </p>
        </div>
      </main>
    </div>
  );
}
