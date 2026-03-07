import {
  Flame,
  Image as ImageIcon,
  Award,
  Play,
  Package,
  ArrowUpCircle,
  ShoppingCart,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Header from "./Header";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import { COOLDOWN_MS } from "@/config/sui.config";

interface DashboardProps {
  playerData: {
    chun_raw: number;
    wins: number;
    losses: number;
    streak: number;
    address: string;
    last_played_ms: number;
  };
  onStartGame: () => void;
  onOpenMint: () => void;
  onOpenAchievements: () => void;
  onOpenInventory: () => void;
  onOpenTradeUp: () => void;
  onOpenMarketplace: () => void;
  onNavigate: (
    screen:
      | "dashboard"
      | "session"
      | "workshop"
      | "inventory"
      | "tradeup"
      | "marketplace"
      | "achievements",
  ) => void;
  onLogout: () => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard({
  playerData,
  onStartGame,
  onOpenMint,
  onOpenAchievements,
  onOpenInventory,
  onOpenTradeUp,
  onOpenMarketplace,
  onNavigate,
  onLogout,
}: DashboardProps) {
  const { cuonChuns } = useOwnedNFTs();
  const bronze = cuonChuns.filter((n) => n.tier === 1).length;
  const silver = cuonChuns.filter((n) => n.tier === 2).length;
  const gold = cuonChuns.filter((n) => n.tier === 3).length;

  // Cooldown countdown
  const [cooldownLeft, setCooldownLeft] = useState(0);
  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - playerData.last_played_ms;
      setCooldownLeft(Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000)));
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [playerData.last_played_ms]);

  return (
    <div className="min-h-screen bg-sunny-gradient pb-24 lg:pb-0">
      <Header
        tier1={bronze}
        tier2={silver}
        tier3={gold}
        totalPoints={playerData.chun_raw}
        address={playerData.address}
        currentScreen="dashboard"
        onNavigate={onNavigate}
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
            <div className="absolute -top-10 -right-10 size-40 bg-sunny-200 rounded-full opacity-30"></div>
            <div className="absolute -bottom-10 -left-10 size-40 bg-playful-pink/20 rounded-full"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-6xl emoji-bounce">🎮</span>
                <h2 className="font-display font-black text-5xl text-gray-900">
                  Chơi Game!
                </h2>
              </div>
              <p className="text-gray-700 mb-4 text-xl font-semibold max-w-lg">
                Búng chun với bot, thắng để kiếm Chun Raw và streak! Kết quả sẽ
                được lưu lên blockchain.
              </p>

              <div className="flex items-center gap-6 mb-6">
                <div className="bg-sunny-100 border-4 border-sunny-300 rounded-3xl px-5 py-3 text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    Chun Raw
                  </p>
                  <p className="font-black text-3xl text-playful-orange">
                    {playerData.chun_raw}
                  </p>
                </div>
                <div className="bg-green-50 border-4 border-green-300 rounded-3xl px-5 py-3 text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    Thắng
                  </p>
                  <p className="font-black text-3xl text-green-600">
                    {playerData.wins}
                  </p>
                </div>
                <div className="bg-red-50 border-4 border-red-300 rounded-3xl px-5 py-3 text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    Thua
                  </p>
                  <p className="font-black text-3xl text-red-500">
                    {playerData.losses}
                  </p>
                </div>
              </div>

              <motion.button
                onClick={cooldownLeft > 0 ? undefined : onStartGame}
                disabled={cooldownLeft > 0}
                whileHover={cooldownLeft === 0 ? { scale: 1.05 } : {}}
                whileTap={cooldownLeft === 0 ? { scale: 0.95 } : {}}
                className={`btn-playful text-2xl flex items-center gap-3 border-4 ${
                  cooldownLeft > 0
                    ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-playful-green to-playful-blue text-white border-white shadow-2xl"
                }`}
              >
                {cooldownLeft > 0 ? (
                  <>
                    <Clock className="size-8 animate-pulse" />
                    Chờ {cooldownLeft}s...
                  </>
                ) : (
                  <>
                    <Play className="size-8 fill-current" />
                    CHƠI NGAY!
                  </>
                )}
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
                {playerData.wins + playerData.losses > 0
                  ? Math.round(
                      (playerData.wins /
                        (playerData.wins + playerData.losses)) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div variants={container} initial="hidden" animate="show">
          <h2 className="font-display font-black text-4xl text-gray-900 mb-6">
            Tính năng khác
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workshop / Craft NFT */}
            <motion.button
              variants={item}
              onClick={onOpenMint}
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white border-8 border-playful-purple rounded-4xl p-8 text-left shadow-2xl group relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-150 transition-transform">
                🎨
              </div>
              <div className="relative z-10">
                <div className="bg-playful-purple text-white p-5 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg">
                  <ImageIcon className="size-12" />
                </div>
                <h3 className="font-display font-black text-3xl text-gray-900 mb-3">
                  Craft Chun NFT
                </h3>
                <p className="text-gray-700 font-semibold text-lg">
                  Dùng 10 Chun Raw + 0.1 SUI để craft Cuộn Chun NFT
                </p>
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
              <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-150 transition-transform">
                🏆
              </div>
              <div className="relative z-10">
                <div className="bg-sunny-400 text-white p-5 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg">
                  <Award className="size-12" />
                </div>
                <h3 className="font-display font-black text-3xl text-gray-900 mb-3">
                  Thành Tích
                </h3>
                <p className="text-gray-700 font-semibold text-lg">
                  Soulbound NFT danh hiệu
                </p>
              </div>
            </motion.button>

            {/* Inventory */}
            <motion.button
              variants={item}
              onClick={onOpenInventory}
              whileHover={{ scale: 1.05, rotate: 1 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white border-8 border-playful-blue rounded-4xl p-8 text-left shadow-2xl group relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-150 transition-transform">
                🎒
              </div>
              <div className="relative z-10">
                <div className="bg-playful-blue text-white p-5 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg">
                  <Package className="size-12" />
                </div>
                <h3 className="font-display font-black text-3xl text-gray-900 mb-3">
                  Kho Đồ
                </h3>
                <p className="text-gray-700 font-semibold text-lg">
                  Xem NFT, Scrap và Danh hiệu của bạn
                </p>
              </div>
            </motion.button>

            {/* Trade-up */}
            <motion.button
              variants={item}
              onClick={onOpenTradeUp}
              whileHover={{ scale: 1.05, rotate: -1 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white border-8 border-playful-orange rounded-4xl p-8 text-left shadow-2xl group relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-150 transition-transform">
                ⬆️
              </div>
              <div className="relative z-10">
                <div className="bg-playful-orange text-white p-5 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg">
                  <ArrowUpCircle className="size-12" />
                </div>
                <h3 className="font-display font-black text-3xl text-gray-900 mb-3">
                  Trade-up
                </h3>
                <p className="text-gray-700 font-semibold text-lg">
                  Gộp NFT để nâng tier: Bronze→Silver→Gold
                </p>
              </div>
            </motion.button>

            {/* Marketplace */}
            <motion.button
              variants={item}
              onClick={onOpenMarketplace}
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white border-8 border-playful-green rounded-4xl p-8 text-left shadow-2xl group relative overflow-hidden md:col-span-2"
            >
              <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-150 transition-transform">
                🛒
              </div>
              <div className="relative z-10">
                <div className="bg-playful-green text-white p-5 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg">
                  <ShoppingCart className="size-12" />
                </div>
                <h3 className="font-display font-black text-3xl text-gray-900 mb-3">
                  Marketplace
                </h3>
                <p className="text-gray-700 font-semibold text-lg">
                  Mua bán Cuộn Chun NFT on-chain
                </p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
