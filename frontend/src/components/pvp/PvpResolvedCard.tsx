import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import type { PvPState } from "@/hooks/usePvP";

interface PvpResolvedCardProps {
  pvp: PvPState;
  isMe: (address: string) => boolean;
  onBack: () => void;
}

export default function PvpResolvedCard({
  pvp,
  isMe,
  onBack,
}: PvpResolvedCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[linear-gradient(160deg,rgba(17,24,39,0.98),rgba(15,23,42,0.96)_45%,rgba(6,95,70,0.9))] p-8 text-center text-white shadow-[0_26px_70px_rgba(15,23,42,0.35)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.16),transparent_28%)]" />
      <div className="relative">
        <Trophy className="mx-auto mb-4 size-16 text-amber-300" />
        <p className="mb-2 text-3xl font-black text-white">
          {!pvp.winner
            ? "Hoa tran"
            : isMe(pvp.winner)
              ? "Ban thang!"
              : "Ban thua"}
        </p>
        {pvp.resultTx && (
          <p className="mb-6 break-all text-xs text-white/55">
            Tx digest: {pvp.resultTx.slice(0, 20)}...
          </p>
        )}
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="w-full rounded-2xl border border-white/10 bg-white/10 py-4 text-xl font-black text-white hover:bg-white/15"
        >
          Ve Dashboard
        </motion.button>
      </div>
    </motion.div>
  );
}
