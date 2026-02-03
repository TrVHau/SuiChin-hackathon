import { useState, useEffect } from "react";
import LoginScreen from "@/app/components/LoginScreen";
import DashboardNew from "@/app/components/DashboardNew";
import FaucetScreen from "@/app/components/FaucetScreen";
import MintScreen from "@/app/components/MintScreen";
import AchievementScreenNew from "@/app/components/AchievementScreenNew";
import GameSessionManager from "@/app/components/GameSessionManager";
import MatchScreen from "@/app/components/MatchScreenEnhanced";
import { Toaster, toast } from "sonner";

type Screen =
  | "login"
  | "dashboard"
  | "faucet"
  | "mint"
  | "achievements"
  | "session"
  | "match";

interface PlayerProfile {
  address: string;
  tier1: number;
  tier2: number;
  tier3: number;
  maxStreak: number;
  currentStreak: number;
  faucetLastClaim: number;
  claimedAchievements: number[];
}

interface SessionData {
  tier1: number;
  tier2: number;
  tier3: number;
  currentStreak: number;
  maxStreak: number;
  deltaTier1: number;
  deltaTier2: number;
  deltaTier3: number;
  selectedTier: number | null;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(
    null,
  );
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  // Mock login
  const handleLogin = async () => {
    toast.loading("Đang kết nối zkLogin...", { id: "login" });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const savedProfile = localStorage.getItem("suichin_profile");

    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setPlayerProfile(profile);
      toast.success("Đăng nhập thành công! Chào mừng trở lại!", {
        id: "login",
      });
    } else {
      const newProfile: PlayerProfile = {
        address: "0x" + Math.random().toString(16).slice(2, 42),
        tier1: 0,
        tier2: 0,
        tier3: 0,
        maxStreak: 0,
        currentStreak: 0,
        faucetLastClaim: Date.now() - 20 * 60 * 60 * 1000,
        claimedAchievements: [],
      };

      setPlayerProfile(newProfile);
      localStorage.setItem("suichin_profile", JSON.stringify(newProfile));
      toast.success("Profile mới đã được tạo! Hãy xin chun để bắt đầu!", {
        id: "login",
      });
    }

    setCurrentScreen("dashboard");
  };

  useEffect(() => {
    if (playerProfile) {
      localStorage.setItem("suichin_profile", JSON.stringify(playerProfile));
    }
  }, [playerProfile]);

  const handleStartGame = () => {
    if (!playerProfile) return;

    if (
      playerProfile.tier1 === 0 &&
      playerProfile.tier2 === 0 &&
      playerProfile.tier3 === 0
    ) {
      toast.error("Bạn chưa có chun nào! Hãy xin chun để bắt đầu.");
      setCurrentScreen("faucet");
      return;
    }

    // Initialize session
    setSessionData({
      tier1: playerProfile.tier1,
      tier2: playerProfile.tier2,
      tier3: playerProfile.tier3,
      currentStreak: playerProfile.currentStreak,
      maxStreak: playerProfile.maxStreak,
      deltaTier1: 0,
      deltaTier2: 0,
      deltaTier3: 0,
      selectedTier: null,
    });

    setCurrentScreen("session");
  };

  const handleSelectTier = (tier: number) => {
    if (!sessionData) return;

    setSessionData({
      ...sessionData,
      selectedTier: tier,
    });

    setCurrentScreen("match");
  };

  const handleMatchEnd = (result: "win" | "lose") => {
    if (!sessionData) return;

    const newSessionData = { ...sessionData };
    const tier = sessionData.selectedTier;

    if (result === "win") {
      if (tier === 1) {
        newSessionData.tier1++;
        newSessionData.deltaTier1++;
      } else if (tier === 2) {
        newSessionData.tier2++;
        newSessionData.deltaTier2++;
      } else if (tier === 3) {
        newSessionData.tier3++;
        newSessionData.deltaTier3++;
      }

      newSessionData.currentStreak++;
      newSessionData.maxStreak = Math.max(
        newSessionData.maxStreak,
        newSessionData.currentStreak,
      );

      toast.success(
        `Thắng! +1 chun Tier ${tier}, Streak: ${newSessionData.currentStreak}`,
      );
    } else {
      if (tier === 1 && newSessionData.tier1 > 0) {
        newSessionData.tier1--;
        newSessionData.deltaTier1--;
      } else if (tier === 2 && newSessionData.tier2 > 0) {
        newSessionData.tier2--;
        newSessionData.deltaTier2--;
      } else if (tier === 3 && newSessionData.tier3 > 0) {
        newSessionData.tier3--;
        newSessionData.deltaTier3--;
      }

      newSessionData.currentStreak = 0;

      toast.info("Thua! -1 chun, Streak reset về 0");
    }

    newSessionData.selectedTier = null;
    setSessionData(newSessionData);
    setCurrentScreen("session");
  };

  const handleForfeit = () => {
    if (!sessionData) return;

    const tier = sessionData.selectedTier;
    const newSessionData = { ...sessionData };

    if (tier === 1 && newSessionData.tier1 > 0) {
      newSessionData.tier1--;
      newSessionData.deltaTier1--;
    } else if (tier === 2 && newSessionData.tier2 > 0) {
      newSessionData.tier2--;
      newSessionData.deltaTier2--;
    } else if (tier === 3 && newSessionData.tier3 > 0) {
      newSessionData.tier3--;
      newSessionData.deltaTier3--;
    }

    newSessionData.currentStreak = 0;
    newSessionData.selectedTier = null;

    setSessionData(newSessionData);
    setCurrentScreen("session");

    toast.info("Đã thoát trận. Streak reset về 0");
  };

  const handleEndSession = () => {
    if (!playerProfile || !sessionData) return;

    toast.loading("Đang lưu kết quả lên blockchain...", { id: "save" });

    setTimeout(() => {
      const updatedProfile: PlayerProfile = {
        ...playerProfile,
        tier1: sessionData.tier1,
        tier2: sessionData.tier2,
        tier3: sessionData.tier3,
        maxStreak: sessionData.maxStreak,
        currentStreak: sessionData.currentStreak,
      };

      setPlayerProfile(updatedProfile);
      setSessionData(null);
      setCurrentScreen("dashboard");

      toast.success("Kết quả đã được lưu trên blockchain!", { id: "save" });

      const totalDelta =
        sessionData.deltaTier1 +
        sessionData.deltaTier2 +
        sessionData.deltaTier3;
      if (totalDelta > 0) {
        toast.success(`Session thành công! +${totalDelta} chun tổng cộng! 🎉`);
      } else if (totalDelta < 0) {
        toast.info(
          `Chưa may mắn lần này. ${Math.abs(totalDelta)} chun đã mất.`,
        );
      }
    }, 1500);
  };

  const handleClaimFaucet = (tier1: number, tier2: number, tier3: number) => {
    if (!playerProfile) return;

    const updatedProfile: PlayerProfile = {
      ...playerProfile,
      tier1: playerProfile.tier1 + tier1,
      tier2: playerProfile.tier2 + tier2,
      tier3: playerProfile.tier3 + tier3,
      faucetLastClaim: Date.now(),
    };

    setPlayerProfile(updatedProfile);
    setCurrentScreen("dashboard");

    toast.success(`Đã nhận ${tier1 + tier2 + tier3} chun từ faucet!`);
  };

  const handleMintNFT = (
    useTier1: number,
    useTier2: number,
    useTier3: number,
  ) => {
    if (!playerProfile) return;

    const updatedProfile: PlayerProfile = {
      ...playerProfile,
      tier1: playerProfile.tier1 - useTier1,
      tier2: playerProfile.tier2 - useTier2,
      tier3: playerProfile.tier3 - useTier3,
    };

    setPlayerProfile(updatedProfile);
    setCurrentScreen("dashboard");

    toast.success("Cuộn Chun NFT đã được mint thành công!");
  };

  const handleClaimAchievement = async (milestone: number) => {
    if (!playerProfile) return;

    toast.loading("Đang claim danh hiệu...", { id: "claim-achievement" });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const updatedProfile: PlayerProfile = {
      ...playerProfile,
      claimedAchievements: [...playerProfile.claimedAchievements, milestone],
    };

    setPlayerProfile(updatedProfile);

    const achievement = [
      { milestone: 1, title: "Người Mới Bắt Đầu" },
      { milestone: 5, title: "Người Chơi Xuất Sắc" },
      { milestone: 18, title: "Tay Chun Thiên Tài" },
      { milestone: 36, title: "Cao Thủ Búng Chun" },
      { milestone: 67, title: "Huyền Thoại Búng Chun" },
    ].find((a) => a.milestone === milestone);

    toast.success(`🏆 Đã nhận danh hiệu: ${achievement?.title}`, {
      id: "claim-achievement",
    });
  };

  return (
    <div className="min-h-screen">
      <Toaster position="top-center" richColors />

      {currentScreen === "login" && <LoginScreen onLogin={handleLogin} />}

      {currentScreen === "dashboard" && playerProfile && (
        <DashboardNew
          playerData={{
            tier1: playerProfile.tier1,
            tier2: playerProfile.tier2,
            tier3: playerProfile.tier3,
            maxStreak: playerProfile.maxStreak,
            currentStreak: playerProfile.currentStreak,
            address: playerProfile.address,
          }}
          onStartGame={handleStartGame}
          onOpenFaucet={() => setCurrentScreen("faucet")}
          onOpenMintNFT={() => setCurrentScreen("mint")}
          onOpenAchievements={() => setCurrentScreen("achievements")}
        />
      )}

      {currentScreen === "faucet" && playerProfile && (
        <FaucetScreen
          onBack={() => setCurrentScreen("dashboard")}
          lastClaimTime={playerProfile.faucetLastClaim}
          onClaim={handleClaimFaucet}
        />
      )}

      {currentScreen === "mint" && playerProfile && (
        <MintScreen
          onBack={() => setCurrentScreen("dashboard")}
          availableChuns={{
            tier1: playerProfile.tier1,
            tier2: playerProfile.tier2,
            tier3: playerProfile.tier3,
          }}
          onMint={handleMintNFT}
        />
      )}

      {currentScreen === "achievements" && playerProfile && (
        <AchievementScreenNew
          maxStreak={playerProfile.maxStreak}
          claimedAchievements={playerProfile.claimedAchievements}
          onBack={() => setCurrentScreen("dashboard")}
          onClaimAchievement={handleClaimAchievement}
        />
      )}

      {currentScreen === "session" && sessionData && (
        <GameSessionManager
          sessionData={sessionData}
          onSelectTier={handleSelectTier}
          onEndSession={handleEndSession}
        />
      )}

      {currentScreen === "match" && sessionData && sessionData.selectedTier && (
        <MatchScreen
          selectedTier={sessionData.selectedTier}
          onMatchEnd={handleMatchEnd}
          onForfeit={handleForfeit}
        />
      )}
    </div>
  );
}
