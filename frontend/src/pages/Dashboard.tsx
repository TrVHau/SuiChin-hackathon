import { motion } from "framer-motion";
import Header from "@/components/Header";
import { PlayGameCard } from "@/components/PlayGameCard";
import { StreakCard } from "@/components/StreakCard";
import { FeatureCards } from "@/components/FeatureCards";
import FaucetPanel from "@/components/FaucetPanel";
import { useGame } from "@/providers/GameContext";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";

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

export default function Dashboard() {
  const { playerData, refreshProfile, createProfile, loading } = useGame();
  const { cuonChuns } = useOwnedNFTs();

  const tier1Count = cuonChuns.filter((nft) => nft.tier === 1).length;
  const tier2Count = cuonChuns.filter((nft) => nft.tier === 2).length;
  const tier3Count = cuonChuns.filter((nft) => nft.tier === 3).length;

  if (!playerData) {
    return (
      <div className="min-h-screen bg-sunny-gradient flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-900">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sunny-gradient pb-24 lg:pb-0">
      <Header
        tier1={tier1Count}
        tier2={tier2Count}
        tier3={tier3Count}
        totalPoints={playerData.chun_raw}
        suiBalanceMist={playerData.suiBalanceMist}
        address={playerData.address}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          <PlayGameCard />
          <StreakCard />
        </motion.div>

        <FeatureCards />

        <motion.div
          id="faucet-panel"
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-8 scroll-mt-32"
        >
          <motion.div
            variants={item}
            className="bg-white border-8 border-playful-teal rounded-4xl p-8 text-left shadow-2xl"
          >
            {playerData.objectId ? (
              <FaucetPanel
                profileId={playerData.objectId}
                lastFaucetMs={playerData.last_faucet_ms ?? 0}
                onSuccess={() => {
                  void refreshProfile();
                }}
              />
            ) : (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="bg-playful-teal/10 p-3 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg">
                    <img
                      src="/img/chun_raw.jpg"
                      alt="Chun Raw"
                      className="size-16 rounded-2xl object-cover"
                    />
                  </div>
                  <h3 className="font-display font-black text-3xl text-gray-900 mb-2">
                    Nhan Chun de bat dau
                  </h3>
                  <p className="text-gray-700 font-semibold text-lg">
                    Vi nay chua co profile on-chain. Tao profile truoc, sau do
                    ban co the nhan Chun faucet va choi game.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    void createProfile(() => {
                      void refreshProfile();
                    });
                  }}
                  className="rounded-2xl border-4 border-amber-700 bg-yellow-300 px-8 py-4 text-lg font-black text-gray-900 shadow-lg transition-all hover:bg-yellow-200 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-400"
                >
                  {loading ? "Dang tao profile..." : "Tao profile nhan Chun"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
