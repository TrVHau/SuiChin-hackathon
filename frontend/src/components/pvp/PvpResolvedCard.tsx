import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import type { PvPState } from "@/hooks/usePvP";

interface PvpResolvedCardProps {
  pvp: PvPState;
  isMe: (address: string) => boolean;
  onBack: () => void;
  onSettle?: () => void;
  settleDisabled?: boolean;
  settling?: boolean;
}

export default function PvpResolvedCard({
  pvp,
  isMe,
  onBack,
  onSettle,
  settleDisabled,
  settling,
}: PvpResolvedCardProps) {
  const canSettle = Boolean(
    onSettle &&
    pvp.winner &&
    isMe(pvp.winner) &&
    pvp.settlementPayload &&
    !pvp.settleTx,
  );

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[linear-gradient(160deg,rgba(17,24,39,0.98),rgba(15,23,42,0.96)_45%,rgba(6,95,70,0.9))] p-8 text-center text-white shadow-[0_26px_70px_rgba(15,23,42,0.35)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.16),transparent_28%)]" />
      <div className="relative">
      <Trophy className="size-16 text-amber-300 mx-auto mb-4" />
      <p className="font-black text-3xl text-white mb-2">
        {!pvp.winner
          ? "Hòa trận"
          : isMe(pvp.winner ?? "")
            ? "Bạn thắng! 🏆"
            : "Bạn thua 💀"}
      </p>
      {pvp.resultTx && (
        <p className="text-xs text-white/55 break-all mb-6">
          Tx digest: {pvp.resultTx.slice(0, 20)}...
        </p>
      )}
      {pvp.settleTx && (
        <p className="text-xs text-emerald-300 break-all mb-6">
          Settle on-chain: {pvp.settleTx.slice(0, 20)}...
        </p>
      )}
      {canSettle && (
        <motion.button
          onClick={onSettle}
          disabled={settleDisabled || settling}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="w-full py-4 mb-3 rounded-2xl font-black text-white text-xl bg-emerald-500 hover:brightness-110 disabled:opacity-60"
        >
          {settling ? "Đang settle on-chain..." : "Settle on-chain"}
        </motion.button>
      )}
      <motion.button
        onClick={onBack}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="w-full py-4 rounded-2xl font-black text-white text-xl bg-white/10 hover:bg-white/15 border border-white/10"
      >
        Về Dashboard
      </motion.button>
      </div>
    </motion.div>
  );
}
