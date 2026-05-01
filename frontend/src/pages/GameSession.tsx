import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import GameCanvas from "../components/GameCanvas";
import { useGame } from "@/providers/GameContext";
import { COOLDOWN_MS } from "@/config/sui.config";

type Phase = "playing" | "submitting";

export default function GameSession() {
  const navigate = useNavigate();
  const { playerData, reportResult, refreshProfile } = useGame();
  const resolvedCurrentStreak = playerData?.streak ?? 0;
  const resolvedOnBack = () => {
    void refreshProfile();
    navigate("/dashboard");
  };
  const [phase, setPhase] = useState<Phase>("playing");
  const [roundKey, setRoundKey] = useState(0);
  const [sessionWins, setSessionWins] = useState(0);
  const [sessionLosses, setSessionLosses] = useState(0);
  const [streak, setStreak] = useState(resolvedCurrentStreak);

  useEffect(() => {
    if (!playerData) return;
    if (playerData.chun_raw <= 0) {
      toast.error("Bạn đã hết Chun. Hãy nhận thêm Chun rồi quay lại chơi.");
      resolvedOnBack();
    }
  }, [playerData]);

  const submitResult = (isWin: boolean) => {
    if ((playerData?.chun_raw ?? 0) <= 0) {
      toast.error("Bạn đã hết Chun. Hãy nhận thêm Chun trước khi chơi tiếp.");
      resolvedOnBack();
      return;
    }

    const lastPlayedMs = playerData?.last_played_ms ?? 0;
    const remainingMs =
      lastPlayedMs > 0 ? COOLDOWN_MS - (Date.now() - lastPlayedMs) : 0;
    if (remainingMs > 0) {
      toast.error(`Cooldown chưa hết, thử lại sau ${Math.ceil(remainingMs / 1000)} giây.`);
      // Reset the round so the UI doesn't freeze; allow player to retry play.
      setRoundKey((k) => k + 1);
      return;
    }

    const willReachZeroAfterThisRound =
      !isWin && (playerData?.chun_raw ?? 0) <= 1;

    setPhase("submitting");
    toast.loading("Dang luu ket qua len blockchain...", { id: "report" });

    reportResult(
      isWin,
      () => {
        if (isWin) {
          setSessionWins((w) => w + 1);
          setStreak((s) => s + 1);
          toast.success("Thang! Ket qua da luu on-chain.", { id: "report" });
        } else {
          setSessionLosses((l) => l + 1);
          setStreak(0);
          toast.error("Thua! Ket qua da luu on-chain.", { id: "report" });
        }

        if (willReachZeroAfterThisRound) {
          toast.info("Bạn đã hết Chun. Hãy nhận thêm Chun rồi quay lại chơi.");
          resolvedOnBack();
          return;
        }

        setPhase("playing");
        setRoundKey((k) => k + 1);
      },
      () => {
        toast.error("Luu ket qua that bai.", { id: "report" });
        setPhase("playing");
      },
    );
  };

  return (
    <div className="relative">
      <GameCanvas
        key={roundKey}
        onWin={() => submitResult(true)}
        onLose={() => submitResult(false)}
        onBack={resolvedOnBack}
        enabled={phase === "playing"}
      />

      <div className="absolute top-4 right-4 z-40 bg-white/90 border-4 border-sunny-300 rounded-2xl px-4 py-2 shadow-xl text-sm font-bold text-gray-800">
        {sessionWins}W / {sessionLosses}L · Streak {streak}
      </div>

      {phase === "submitting" && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 border-4 border-playful-blue shadow-2xl text-center"
          >
            <p className="font-display font-black text-2xl text-gray-900 mb-2">
              Dang luu ket qua...
            </p>
            <p className="text-gray-600 font-semibold">
              Vui long doi trong giay lat.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
