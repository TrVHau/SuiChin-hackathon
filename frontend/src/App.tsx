import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";
import MintScreen from "@/components/MintScreen";
import AchievementScreen from "@/components/AchievementScreen";
import GameSession from "@/components/GameSession";
import InventoryScreen from "@/components/InventoryScreen";
import TradeUpScreen from "@/components/TradeUpScreen";
import MarketplaceScreen from "@/components/MarketplaceScreen";
import PvPScreen from "@/components/PvPScreen";
import { useSuiProfile } from "@/hooks/useSuiProfile";
import { toast } from "sonner";

type Screen =
  | "login"
  | "dashboard"
  | "workshop"
  | "achievements"
  | "session"
  | "inventory"
  | "tradeup"
  | "marketplace"
  | "pvp";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const {
    account,
    profile,
    hasProfile,
    createProfile,
    reportResult,
    refreshProfile,
  } = useSuiProfile();

  const handleLogin = async () => {
    if (!account) {
      toast.error("Vui lòng kết nối ví trước");
      return;
    }

    if (hasProfile && profile) {
      toast.success("Chào mừng trở lại!");
      setCurrentScreen("dashboard");
    } else {
      toast.loading("Chưa có profile. Đang tạo mới...", {
        id: "createProfile",
      });
      createProfile(
        () => {
          toast.success("Tạo profile thành công!", { id: "createProfile" });
          setCurrentScreen("dashboard");
        },
        () => {
          toast.dismiss("createProfile");
        },
      );
    }
  };

  const handleLogout = () => {
    setCurrentScreen("login");
    toast.success("Đã đăng xuất");
  };

  useEffect(() => {
    if (!account && currentScreen !== "login") {
      setCurrentScreen("login");
    }
  }, [account, currentScreen]);

  return (
    <>
      <Toaster position="top-center" richColors />

      <AnimatePresence mode="wait">
        {currentScreen === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoginScreen onLogin={handleLogin} />
          </motion.div>
        )}

        {currentScreen === "dashboard" && profile && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard
              playerData={{
                chun_raw: profile.chun_raw,
                wins: profile.wins,
                losses: profile.losses,
                streak: profile.streak,
                address: account?.address || "",
                last_played_ms: profile.last_played_ms,
                staked_chun: profile.staked_chun,
                last_faucet_ms: profile.last_faucet_ms,
                objectId: profile.objectId,
              }}
              onStartGame={() => setCurrentScreen("session")}
              onOpenMint={() => setCurrentScreen("workshop")}
              onOpenAchievements={() => setCurrentScreen("achievements")}
              onOpenInventory={() => setCurrentScreen("inventory")}
              onOpenTradeUp={() => setCurrentScreen("tradeup")}
              onOpenMarketplace={() => setCurrentScreen("marketplace")}
              onOpenPvP={() => setCurrentScreen("pvp")}
              onNavigate={(screen) => setCurrentScreen(screen)}
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {currentScreen === "workshop" && profile && (
          <motion.div
            key="workshop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MintScreen
              onBack={() => setCurrentScreen("dashboard")}
              profileId={profile.objectId}
              chunRaw={profile.chun_raw}
              onSuccess={refreshProfile}
            />
          </motion.div>
        )}

        {currentScreen === "achievements" && profile && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AchievementScreen
              onBack={() => setCurrentScreen("dashboard")}
              maxStreak={profile.streak}
              profileId={profile.objectId}
            />
          </motion.div>
        )}

        {currentScreen === "session" && profile && (
          <motion.div
            key="session"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameSession
              onBack={() => {
                refreshProfile();
                setCurrentScreen("dashboard");
              }}
              currentStreak={profile.streak}
              onReportResult={(isWin, onDone, onError) => {
                reportResult(
                  isWin,
                  () => {
                    refreshProfile();
                    onDone?.();
                  },
                  onError,
                );
              }}
            />
          </motion.div>
        )}

        {currentScreen === "inventory" && (
          <motion.div
            key="inventory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <InventoryScreen
              onBack={() => setCurrentScreen("dashboard")}
              onOpenMarketplace={() => setCurrentScreen("marketplace")}
              onOpenTradeUp={() => setCurrentScreen("tradeup")}
            />
          </motion.div>
        )}

        {currentScreen === "tradeup" && (
          <motion.div
            key="tradeup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <TradeUpScreen onBack={() => setCurrentScreen("dashboard")} />
          </motion.div>
        )}

        {currentScreen === "marketplace" && (
          <motion.div
            key="marketplace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MarketplaceScreen onBack={() => setCurrentScreen("dashboard")} />
          </motion.div>
        )}

        {currentScreen === "pvp" && profile && (
          <motion.div
            key="pvp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PvPScreen
              onBack={() => setCurrentScreen("dashboard")}
              profileId={profile.objectId}
              chunRaw={profile.chun_raw}
              onSuccess={refreshProfile}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
