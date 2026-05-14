import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Target, Trophy } from "lucide-react";
import GameCanvas, {
  type PvPRemoteShot,
  type PvPShot,
  type Turn,
} from "@/components/GameCanvas";
import type { PvPState } from "@/hooks/usePvP";

interface PvpPlayingCardProps {
  pvp: PvPState;
  myAddress?: string;
  onSubmitShot: (shot: { x: number; y: number; force: number }) => void;
  onReportResult: (winnerWallet: string) => void;
}

function shortWallet(wallet?: string | null) {
  if (!wallet) return "-";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function oppositeSide(side: Turn): Turn {
  return side === "player" ? "bot" : "player";
}

function sameWallet(a?: string | null, b?: string | null) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

export default function PvpPlayingCard({
  pvp,
  myAddress,
  onSubmitShot,
  onReportResult,
}: PvpPlayingCardProps) {
  const localSide: Turn = "player";
  const opponentSide = oppositeSide(localSide);
  const currentTurnSide: Turn | undefined = pvp.currentTurnWallet
    ? sameWallet(pvp.currentTurnWallet, myAddress)
      ? localSide
      : opponentSide
    : undefined;
  const currentTurnLabel = pvp.myTurn
    ? "Cua ban"
    : shortWallet(pvp.currentTurnWallet);

  const remoteShot = useMemo<PvPRemoteShot | null>(() => {
    if (!pvp.lastShot || sameWallet(pvp.lastShot.byWallet, myAddress)) {
      return null;
    }
    return {
      id: `${pvp.lastShot.byWallet}:${pvp.lastShot.seq}:${pvp.lastShot.atMs}`,
      side: opponentSide,
      velocity: {
        x: -pvp.lastShot.x,
        y: -pvp.lastShot.y,
      },
      pullLength: pvp.lastShot.force,
    };
  }, [myAddress, opponentSide, pvp.lastShot]);

  const submitShot = useCallback(
    (shot: PvPShot) => {
      onSubmitShot({
        x: shot.velocity.x,
        y: shot.velocity.y,
        force: shot.pullLength,
      });
    },
    [onSubmitShot],
  );

  const reportWinner = useCallback(
    (winnerSide: Turn) => {
      if (pvp.submittedResult) return;
      const winnerWallet = winnerSide === localSide ? myAddress : pvp.opponent;
      if (!winnerWallet) return;
      onReportResult(winnerWallet);
    },
    [localSide, myAddress, onReportResult, pvp.opponent, pvp.submittedResult],
  );

  return (
    <motion.div
      key={pvp.challengeId ?? "pvp-game"}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[linear-gradient(160deg,rgba(2,6,23,0.99),rgba(15,23,42,0.96)_45%,rgba(20,83,45,0.95))] p-4 text-white shadow-[0_26px_80px_rgba(15,23,42,0.42)] md:p-6"
    >
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
              Luot: {currentTurnLabel}
            </span>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase text-white/45">Ban</p>
            <div className="mt-2 flex items-center gap-3">
              <p className="min-w-0 truncate font-black">
                {shortWallet(myAddress)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase text-white/45">Doi thu</p>
            <div className="mt-2 flex items-center gap-3">
              <p className="min-w-0 truncate font-black">
                {shortWallet(pvp.opponent)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase text-white/45">Cu ban gan nhat</p>
            <p className="mt-1 font-black">
              {pvp.lastShot ? `#${pvp.lastShot.seq}` : "Chua co"}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-3">
          <GameCanvas
            mode="pvp"
            showHeader={false}
            onBack={() => undefined}
            enabled={
              pvp.status === "playing" && !pvp.submittedResult && !pvp.paused
            }
            localSide={localSide}
            currentTurnSide={currentTurnSide}
            playerLabel="YOU"
            opponentLabel="OPP"
            remoteShot={remoteShot}
            onShot={submitShot}
            onRoundResult={reportWinner}
          />
        </div>

        {pvp.paused && (
          <div className="mt-4 rounded-[22px] border border-amber-300/40 bg-amber-400/15 p-4 text-sm font-bold text-amber-100">
            {pvp.pausedReason ??
              "Tran dang tam dung de cho nguoi choi ket noi lai."}
          </div>
        )}

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
    </motion.div>
  );
}
