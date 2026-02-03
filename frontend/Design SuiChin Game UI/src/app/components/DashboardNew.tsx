import svgPaths from "@/imports/svg-zgg1cxget1";
import Header from "@/app/components/Header";
import { motion } from "motion/react";

interface DashboardNewProps {
  playerData: {
    tier1: number;
    tier2: number;
    tier3: number;
    maxStreak: number;
    currentStreak: number;
    address: string;
  };
  onStartGame: () => void;
  onOpenFaucet: () => void;
  onOpenMintNFT: () => void;
  onOpenAchievements: () => void;
}

function FlameIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24">
      <path d={svgPaths.p3a055c00} stroke="#FF6900" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

export default function DashboardNew({
  playerData,
  onStartGame,
  onOpenFaucet,
  onOpenMintNFT,
  onOpenAchievements,
}: DashboardNewProps) {
  const totalPoints = playerData.tier1 * 1 + playerData.tier2 * 2 + playerData.tier3 * 3;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        tier1={playerData.tier1}
        tier2={playerData.tier2}
        tier3={playerData.tier3}
        totalPoints={totalPoints}
        address={playerData.address}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Start Session Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10 size-40 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 left-10 size-48 bg-white rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <h2 className="font-bold text-[36px] mb-3">Bắt Đầu Session!</h2>
              <p className="text-blue-100 mb-6 text-[16px] max-w-lg">
                Vào session chơi game, đấu với bot, tích lũy streak và chun. Kết quả sẽ được lưu lên blockchain khi bạn thoát.
              </p>
              <button
                onClick={onStartGame}
                className="bg-white text-blue-600 px-6 py-3.5 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-3"
              >
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
            className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-4">
              <FlameIcon />
              <h3 className="font-bold text-[20px] text-[#1e2939]">Max Streak</h3>
            </div>
            <p className="text-[#6a7282] text-[16px] mb-6">Kỷ lục chuỗi thắng của bạn</p>
            <div className="text-center mb-4">
              <p className="font-bold text-[80px] text-[#ff6900] leading-none">{playerData.maxStreak}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <p className="text-[14px] text-gray-600 mb-1">Current Streak:</p>
              <p className="font-bold text-[24px] text-[#ff6900]">{playerData.currentStreak}</p>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <div>
          <h2 className="font-bold text-[24px] text-[#1e2939] mb-6">Tính năng khác</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Faucet */}
            <motion.button
              onClick={onOpenFaucet}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-3xl p-8 text-left hover:shadow-xl transition-all border-2 border-pink-200"
            >
              <div className="text-pink-500 mb-4">
                <GiftIcon />
              </div>
              <h3 className="font-bold text-[24px] text-[#1e2939] mb-2">Xin Chun (Faucet)</h3>
              <p className="text-gray-600 text-[16px]">Nhận chun miễn phí</p>
            </motion.button>

            {/* Mint NFT */}
            <motion.button
              onClick={onOpenMintNFT}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 text-left hover:shadow-xl transition-all border-2 border-blue-200"
            >
              <div className="text-blue-500 mb-4">
                <TicketIcon />
              </div>
              <h3 className="font-bold text-[24px] text-[#1e2939] mb-2">Mint Cuộn Chun</h3>
              <p className="text-gray-600 text-[16px]">Đổi điểm lấy NFT</p>
            </motion.button>

            {/* Achievements */}
            <motion.button
              onClick={onOpenAchievements}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-3xl p-8 text-left hover:shadow-xl transition-all border-2 border-yellow-200"
            >
              <div className="text-yellow-600 mb-4">
                <TrophyIcon />
              </div>
              <h3 className="font-bold text-[24px] text-[#1e2939] mb-2">Thành Tích</h3>
              <p className="text-gray-600 text-[16px]">Soulbound Titles</p>
            </motion.button>
          </div>
        </div>
      </main>
    </div>
  );
}
