import { useNavigate } from "react-router-dom";
import { useAchievementClaimFlow } from "@/hooks/useAchievementClaimFlow";
import {
  AchievementHeader,
  AchievementGrid,
  AchievementNotes,
} from "@/components/achievement";

export default function AchievementScreen() {
  const navigate = useNavigate();
  const { resolvedMaxStreak, claimedMilestones, handleClaim } =
    useAchievementClaimFlow();
  const handleBack = () => navigate("/dashboard");

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <AchievementHeader maxStreak={resolvedMaxStreak} onBack={handleBack} />

        <AchievementGrid
          maxStreak={resolvedMaxStreak}
          claimedMilestones={claimedMilestones}
          onClaim={handleClaim}
        />

        <AchievementNotes />
      </div>
    </div>
  );
}
