import { Flame, Gift, Image as ImageIcon, Award, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from './Header';

interface DashboardProps {
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
  onOpenMint: () => void;
  onOpenAchievements: () => void;
  onLogout: () => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Dashboard({
  playerData,
  onStartGame,
  onOpenFaucet,
  onOpenMint,
  onOpenAchievements,
  onLogout,
}: DashboardProps) {
  const totalPoints = playerData.tier1 * 1 + playerData.tier2 * 2 + playerData.tier3 * 3;
  const canPlay = playerData.tier1 > 0 || playerData.tier2 > 0 || playerData.tier3 > 0;

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <Header
        tier1={playerData.tier1}
        tier2={playerData.tier2}
        tier3={playerData.tier3}
        totalPoints={totalPoints}
        address={playerData.address}
        onLogout={onLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Play Game Card */}
          <motion.div 
            variants={item}
            whileHover={{ scale: 1.02, rotate: -1 }}
            className="lg:col-span-2 bg-white border-8 border-playful-blue rounded-4xl p-10 shadow-2xl relative overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 size-40 bg-sunny-200 rounded-full opacity-30"></div>
            <div className="absolute -bottom-10 -left-10 size-40 bg-playful-pink/20 rounded-full"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-6xl emoji-bounce">🎮</span>
                <h2 className="font-display font-black text-5xl text-gray-900">
                  Chơi Game!
                </h2>
              </div>
              <p className="text-gray-700 mb-6 text-xl font-semibold max-w-lg">
                Búng chun với bot, thắng để kiếm điểm và streak! Kết quả sẽ được lưu lên blockchain.
              </p>
              
              {!canPlay && (
                <div className="bg-sunny-200 border-4 border-sunny-400 rounded-3xl p-5 mb-6">
                  <p className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <span className="text-3xl">⚠️</span>
                    Bạn cần ít nhất 1 chun để chơi. Hãy xin chun trước!
                  </p>
                </div>
              )}
              
              <motion.button
                onClick={onStartGame}
                disabled={!canPlay}
                whileHover={canPlay ? { scale: 1.05 } : {}}
                whileTap={canPlay ? { scale: 0.95 } : {}}
                className={`btn-playful text-2xl flex items-center gap-3 border-4 ${
                  canPlay 
                    ? 'bg-gradient-to-r from-playful-green to-playful-blue text-white border-white shadow-2xl' 
                    : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                }`}
              >
                <Play className="size-8 fill-current" />
                {canPlay ? 'CHƠI NGAY!' : 'CHƯA ĐỦ CHUN'}
              </motion.button>
            </div>
          </motion.div>

          {/* Streak Card */}
          <motion.div 
            variants={item}
            whileHover={{ scale: 1.05, rotate: 2 }}
            className="bg-white border-8 border-playful-orange rounded-4xl p-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <Flame className="size-10 text-playful-orange" />
              <h3 className="font-display font-black text-2xl text-gray-900">Max Streak</h3>
            </div>
            <p className="text-gray-600 mb-6 font-semibold">Kỷ lục chuỗi thắng</p>
            <div className="text-center mb-6">
              <motion.p 
                key={playerData.maxStreak}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-display font-black text-8xl text-playful-orange leading-none"
              >
                {playerData.maxStreak}
              </motion.p>
            </div>
            <div className="bg-sunny-100 border-4 border-sunny-300 rounded-3xl p-5">
              <p className="text-sm font-bold text-gray-600 mb-1">Streak hiện tại:</p>
              <p className="font-display font-black text-4xl text-playful-orange">{playerData.currentStreak}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
        >
          <h2 className="font-display font-black text-4xl text-gray-900 mb-6">Tính năng khác</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Faucet */}
            <motion.button
              variants={item}
              onClick={onOpenFaucet}
              whileHover={{ scale: 1.05, rotate: -2 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white border-8 border-playful-pink rounded-4xl p-8 text-left shadow-2xl group relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-150 transition-transform">🎁</div>
              <div className="relative z-10">
                <div className="bg-playful-pink text-white p-5 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg">
                  <Gift className="size-12" />
                </div>
                <h3 className="font-display font-black text-3xl text-gray-900 mb-3">Xin Chun</h3>
                <p className="text-gray-700 font-semibold text-lg">Nhận chun miễn phí mỗi 2 giờ!</p>
              </div>
            </motion.button>

            {/* Mint NFT */}
            <motion.button
              variants={item}
              onClick={onOpenMint}
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white border-8 border-playful-purple rounded-4xl p-8 text-left shadow-2xl group relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-150 transition-transform">🎨</div>
              <div className="relative z-10">
                <div className="bg-playful-purple text-white p-5 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg">
                  <ImageIcon className="size-12" />
                </div>
                <h3 className="font-display font-black text-3xl text-gray-900 mb-3">Mint NFT</h3>
                <p className="text-gray-700 font-semibold text-lg">Đổi điểm lấy Cuộn Chun NFT</p>
              </div>
            </motion.button>

            {/* Achievements */}
            <motion.button
              variants={item}
              onClick={onOpenAchievements}
              whileHover={{ scale: 1.05, rotate: -2 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white border-8 border-sunny-400 rounded-4xl p-8 text-left shadow-2xl group relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-150 transition-transform">🏆</div>
              <div className="relative z-10">
                <div className="bg-sunny-400 text-white p-5 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg">
                  <Award className="size-12" />
                </div>
                <h3 className="font-display font-black text-3xl text-gray-900 mb-3">Thành Tích</h3>
                <p className="text-gray-700 font-semibold text-lg">Soulbound NFT danh hiệu</p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
