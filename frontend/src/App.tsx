import { useState } from "react";
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
import { useSuiProfile } from "@/hooks/useSuiProfile";
import { toast } from "sonner";

type Screen =
  | "login"
  | "dashboard"
  | "mint"
  | "achievements"
  | "session"
  | "inventory"
  | "tradeup"
  | "marketplace";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const {
    account,
    profile,
    hasProfile,
    createProfile,
    reportResult,
    claimAchievement,
    refreshProfile,
  } = useSuiProfile();

  const handleLogin = async () => {
    if (!account) {
      toast.error("Vui lòng kết nối ví trước");
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (hasProfile && profile) {
      toast.success("Chào mừng trở lại!");
      setCurrentScreen("dashboard");
    } else {
      toast.loading("Chưa có profile. Đang tạo mới...", {
        id: "createProfile",
      });
      createProfile();
      setTimeout(() => {
        toast.success("Tạo profile thành công!", { id: "createProfile" });
        setCurrentScreen("dashboard");
      }, 4000);
    }
  };

  const handleLogout = () => {
    setCurrentScreen("login");
    toast.success("Đã đăng xuất");
  };

  const handleClaimAchievement = (milestone: number) => {
    claimAchievement(milestone);
  };

  if (!account && currentScreen !== "login") {
    setCurrentScreen("login");
  }

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
              }}
              onStartGame={() => setCurrentScreen("session")}
              onOpenMint={() => setCurrentScreen("mint")}
              onOpenAchievements={() => setCurrentScreen("achievements")}
              onOpenInventory={() => setCurrentScreen("inventory")}
              onOpenTradeUp={() => setCurrentScreen("tradeup")}
              onOpenMarketplace={() => setCurrentScreen("marketplace")}
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {currentScreen === "mint" && profile && (
          <motion.div
            key="mint"
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
              claimedAchievements={[]}
              onClaim={handleClaimAchievement}
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
              onReportResult={(isWin, onDone) => {
                reportResult(isWin, () => {
                  refreshProfile();
                  onDone?.();
                });
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
            <InventoryScreen onBack={() => setCurrentScreen("dashboard")} />
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
      </AnimatePresence>
    </>
  );
}
