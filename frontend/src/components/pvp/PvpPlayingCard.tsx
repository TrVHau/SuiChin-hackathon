import { motion } from "framer-motion";
import type { PvPState } from "@/hooks/usePvP";

interface PvpPlayingCardProps {
  pvp: PvPState;
  myAddress?: string;
  onReportRound: (winnerAddress: string) => void;
}

export default function PvpPlayingCard({
  pvp,
  myAddress,
  onReportRound,
}: PvpPlayingCardProps) {
  return (
    <motion.div
      key={`round-${pvp.round}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border-4 border-red-400 p-8 shadow-xl text-center"
    >
      <p className="font-black text-3xl text-gray-900 mb-1">Vòng {pvp.round}</p>
      <p className="text-gray-500 mb-6">Best of 3</p>
      <div className="flex justify-around mb-8">
        <div>
          <p className="text-4xl font-black text-playful-blue">{pvp.scores[0]}</p>
          <p className="text-xs text-gray-500">Bạn</p>
        </div>
        <p className="text-3xl font-black text-gray-400">:</p>
        <div>
          <p className="text-4xl font-black text-red-500">{pvp.scores[1]}</p>
          <p className="text-xs text-gray-500">Đối thủ</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3">(Demo: chọn kết quả vòng)</p>
      <div className="flex gap-3">
        <motion.button
          onClick={() => onReportRound(myAddress ?? "")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={Boolean(pvp.submittedResult)}
          className="flex-1 py-3 rounded-2xl font-black text-white bg-green-500 hover:bg-green-600"
        >
          Tôi thắng ✅
        </motion.button>
        <motion.button
          onClick={() => onReportRound(pvp.opponent ?? "")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={Boolean(pvp.submittedResult)}
          className="flex-1 py-3 rounded-2xl font-black text-white bg-red-400 hover:bg-red-500"
        >
          Tôi thua ❌
        </motion.button>
      </div>
      {pvp.submittedResult && (
        <p className="text-xs text-gray-500 mt-3">
          Đã gửi kết quả của bạn, đang chờ backend finalize...
        </p>
      )}
    </motion.div>
  );
}
