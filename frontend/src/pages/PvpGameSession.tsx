import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Target, Trophy } from "lucide-react";
import GameCanvas, { type PvPRemoteShot, type PvPShot, type Turn } from "../components/GameCanvas";
import { useGame } from "@/providers/GameContext";
import { usePvP } from "@/hooks/usePvP";

type Phase = "playing" | "submitting" | "resolved";

function shortWallet(wallet?: string | null) {
  if (!wallet) return "-";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function oppositeSide(side: Turn): Turn {
  return side === "player" ? "bot" : "player";
}

export default function PvpGameSession() {
  const navigate = useNavigate();
  const { account, profile } = useGame();
  const { pvp, submitShot, reportRound } = usePvP(profile?.objectId);

  const [phase, setPhase] = useState<Phase>("playing");
  const [roundKey, setRoundKey] = useState(0);
  const [sessionWins, setSessionWins] = useState(0);
  const [sessionLosses, setSessionLosses] = useState(0);

  // Redirect if not in a playing state
  useEffect(() => {
    if (!account?.address) {
      navigate("/pvp");
      return;
    }

    if (
      pvp.status !== "playing" &&
      pvp.status !== "submitting" &&
      pvp.status !== "resolved"
    ) {
      navigate("/pvp");
      return;
    }
  }, [pvp.status, account?.address, navigate]);

  const handleBack = useCallback(() => {
    navigate("/pvp");
  }, [navigate]);

  // Calculate local and opponent sides
  const localSide: Turn = pvp.role === "JOINER" ? "bot" : "player";
  const opponentSide = oppositeSide(localSide);
  const currentTurnSide: Turn | undefined = pvp.currentTurnWallet
    ? pvp.currentTurnWallet === account?.address
      ? localSide
      : opponentSide
    : undefined;

  // Calculate remote shot
  const remoteShot = useMemo<PvPRemoteShot | null>(() => {
    if (!pvp.lastShot || pvp.lastShot.byWallet === account?.address) return null;
    return {
      id: `${pvp.lastShot.byWallet}:${pvp.lastShot.seq}:${pvp.lastShot.atMs}`,
      side: opponentSide,
      velocity: {
        x: pvp.lastShot.x,
        y: pvp.lastShot.y,
      },
      pullLength: pvp.lastShot.force,
    };
  }, [account?.address, opponentSide, pvp.lastShot]);

  const submitResultHandler = useCallback(
    (shot: PvPShot) => {
      submitShot({
        x: shot.velocity.x,
        y: shot.velocity.y,
        force: shot.pullLength,
      });
    },
    [submitShot],
  );

  const reportWinner = useCallback(
    (winnerSide: Turn) => {
      if (pvp.submittedResult) return;
      const winnerWallet = winnerSide === localSide ? account?.address : pvp.opponent;
      if (!winnerWallet) return;
      
      if (winnerWallet === account?.address) {
        setSessionWins((w) => w + 1);
      } else {
        setSessionLosses((l) => l + 1);
      }
      
      setPhase("submitting");
      toast.loading("Dang luu ket qua len backend...", { id: "pvp-report" });
      reportRound(winnerWallet);
    },
    [localSide, account?.address, pvp.opponent, pvp.submittedResult, reportRound],
  );

  // Sync phase with PvP status
  useEffect(() => {
    if (pvp.status === "playing") {
      setPhase("playing");
    } else if (pvp.status === "submitting") {
      setPhase("submitting");
    } else if (pvp.status === "resolved") {
      setPhase("resolved");
      toast.success("Tran dau da ket thuc!", { id: "pvp-report" });
    }
  }, [pvp.status]);

  // Success after submission
  useEffect(() => {
    if (phase === "submitting" && pvp.status === "playing") {
      toast.success("Ket qua da luu. Dang cho doi thu...", {
        id: "pvp-report",
      });
      setPhase("playing");
      setRoundKey((k) => k + 1);
    }
  }, [pvp.status, phase]);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[linear-gradient(160deg,rgba(2,6,23,0.99),rgba(15,23,42,0.96)_45%,rgba(20,83,45,0.95))] min-h-screen p-4 text-white md:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_26%)]" />
      <div className="relative">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-white/5 p-4 text-left backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-white/55">
              PvP ban chun
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight text-white">
              Cung co che nhu choi bot
            </p>
            <p className="mt-1 text-sm text-white/70">
              Keo vong tron cua ban de ban. Khong co bot auto trong PvP, moi
              cu ban cua doi thu duoc dong bo qua socket.
            </p>
          </div>
          <div className="grid gap-2 text-right text-xs font-bold text-white/80">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
              Escrow: NFT
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
              Luot: {pvp.myTurn ? "Cua ban" : shortWallet(pvp.currentTurnWallet)}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
              {sessionWins}W / {sessionLosses}L
            </span>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase text-white/45">Ban</p>
            <p className="mt-1 font-black">{shortWallet(account?.address)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase text-white/45">Doi thu</p>
            <p className="mt-1 font-black">{shortWallet(pvp.opponent)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase text-white/45">Cu ban gan nhat</p>
            <p className="mt-1 font-black">
              {pvp.lastShot ? `#${pvp.lastShot.seq}` : "Chua co"}
            </p>
          </div>
        </div>

        <div
          key={roundKey}
          className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-3 mb-4"
        >
          <GameCanvas
            mode="pvp"
            showHeader={false}
            onBack={handleBack}
            enabled={phase === "playing" && !pvp.submittedResult && !pvp.paused}
            localSide={localSide}
            currentTurnSide={currentTurnSide}
            playerLabel={localSide === "player" ? "YOU" : "OPP"}
            opponentLabel={localSide === "bot" ? "YOU" : "OPP"}
            remoteShot={remoteShot}
            onShot={submitResultHandler}
            onRoundResult={reportWinner}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-white/75">
          <div className="flex items-center gap-2">
            <Target className="size-5 text-emerald-300" />
            <span>
              Thang khi vong cua ben ban de duoc vong doi thu sau khi dung lai.
            </span>
          </div>
          {pvp.submittedResult && (
            <div className="flex items-center gap-2 font-black text-emerald-200">
              <Trophy className="size-5" />
              Da gui ket qua, dang cho doi thu xac nhan
            </div>
          )}
        </div>
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

      {phase === "resolved" && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 border-4 border-playful-blue shadow-2xl text-center max-w-md"
          >
            <p className="font-display font-black text-2xl text-gray-900 mb-4">
              {pvp.winner === account?.address ? "Ban thang!" : pvp.winner === null ? "Tran hoa!" : "Ban thua!"}
            </p>
            <p className="text-gray-600 font-semibold mb-6">
              Tran dau da ket thuc.
            </p>
            <button
              onClick={handleBack}
              className="w-full rounded-2xl bg-playful-blue px-6 py-3 font-black text-white hover:bg-blue-600 transition-colors"
            >
              Quay lai PvP Arena
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
