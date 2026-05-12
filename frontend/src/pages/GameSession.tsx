import { useCallback, useEffect, useState } from "react";
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
  const resolvedOnBack = useCallback(() => {
    void refreshProfile();
    navigate("/dashboard");
  }, [navigate, refreshProfile]);

  const [phase, setPhase] = useState<Phase>("playing");
  const [roundKey, setRoundKey] = useState(0);
  const [sessionWins, setSessionWins] = useState(0);
  const [sessionLosses, setSessionLosses] = useState(0);
  const [streak, setStreak] = useState(resolvedCurrentStreak);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [localNextPlayableAtMs, setLocalNextPlayableAtMs] = useState(0);

  const chainNextPlayableAtMs =
    playerData?.last_played_ms && playerData.last_played_ms > 0
      ? playerData.last_played_ms + COOLDOWN_MS
      : 0;
  const nextPlayableAtMs = Math.max(
    chainNextPlayableAtMs,
    localNextPlayableAtMs,
  );
  const cooldownRemainingMs = Math.max(0, nextPlayableAtMs - nowMs);
  const cooldownRemainingSeconds = Math.ceil(cooldownRemainingMs / 1000);
  const isCooldownActive = cooldownRemainingMs > 0;

  useEffect(() => {
    if (!isCooldownActive) return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, [isCooldownActive]);

  useEffect(() => {
    if (chainNextPlayableAtMs >= localNextPlayableAtMs) {
      setLocalNextPlayableAtMs(0);
    }
  }, [chainNextPlayableAtMs, localNextPlayableAtMs]);

  useEffect(() => {
    if (!playerData) return;
    if (playerData.chun_raw <= 0) {
      toast.error("Ban da het Chun. Hay nhan them Chun roi quay lai choi.");
      resolvedOnBack();
    }
  }, [playerData]);

  const submitResult = useCallback((isWin: boolean) => {
    if ((playerData?.chun_raw ?? 0) <= 0) {
      toast.error("Ban da het Chun. Hay nhan them Chun truoc khi choi tiep.");
      resolvedOnBack();
      return;
    }

    const remainingMs = Math.max(0, nextPlayableAtMs - Date.now());
    if (remainingMs > 0) {
      toast.error(
        `Cooldown chua het, thu lai sau ${Math.ceil(remainingMs / 1000)} giay.`,
      );
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
          toast.info("Ban da het Chun. Hay nhan them Chun roi quay lai choi.");
          resolvedOnBack();
          return;
        }

        setLocalNextPlayableAtMs(Date.now() + COOLDOWN_MS);
        setPhase("playing");
        setRoundKey((k) => k + 1);
      },
      () => {
        toast.error("Luu ket qua that bai.", { id: "report" });
        setPhase("playing");
      },
    );
  }, [nextPlayableAtMs, playerData?.chun_raw, reportResult, resolvedOnBack]);

  const handleWin = useCallback(() => submitResult(true), [submitResult]);
  const handleLose = useCallback(() => submitResult(false), [submitResult]);

  return (
    <div className="relative">
      <GameCanvas
        key={roundKey}
        onWin={handleWin}
        onLose={handleLose}
        onBack={resolvedOnBack}
        enabled={phase === "playing" && !isCooldownActive}
      />

      <div className="absolute top-4 right-4 z-40 bg-white/90 border-4 border-sunny-300 rounded-2xl px-4 py-2 shadow-xl text-sm font-bold text-gray-800">
        {sessionWins}W / {sessionLosses}L - Streak {streak}
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

      {phase === "playing" && isCooldownActive && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 border-4 border-sunny-300 shadow-2xl text-center max-w-sm mx-4"
          >
            <p className="font-display font-black text-2xl text-gray-900 mb-2">
              Cho van tiep theo
            </p>
            <p className="text-5xl font-black text-playful-orange mb-3">
              {cooldownRemainingSeconds}s
            </p>
            <p className="text-gray-600 font-semibold">
              Contract dang trong cooldown. Het dem nguoc moi bat dau van moi.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
