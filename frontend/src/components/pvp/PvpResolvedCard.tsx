import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import type { PvPState } from "@/hooks/usePvP";

interface PvpResolvedCardProps {
  pvp: PvPState;
  isMe: (address: string) => boolean;
  onBack: () => void;
}

export default function PvpResolvedCard({ pvp, isMe, onBack }: PvpResolvedCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-3xl border-4 border-yellow-400 p-8 shadow-xl text-center"
    >
      <Trophy className="size-16 text-yellow-500 mx-auto mb-4" />
      <p className="font-black text-3xl text-gray-900 mb-2">
        {!pvp.winner ? "Hòa trận" : isMe(pvp.winner ?? "") ? "Bạn thắng! 🏆" : "Bạn thua 💀"}
      </p>
      {pvp.resultTx && (
        <p className="text-xs text-gray-400 break-all mb-6">Tx: {pvp.resultTx.slice(0, 20)}...</p>
      )}
      <motion.button
        onClick={onBack}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="w-full py-4 rounded-2xl font-black text-white text-xl bg-playful-purple hover:brightness-110"
      >
        Về Dashboard
      </motion.button>
    </motion.div>
  );
}
