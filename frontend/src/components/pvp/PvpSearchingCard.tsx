import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface PvpSearchingCardProps {
  wager: number;
  onCancel: () => void;
}

export default function PvpSearchingCard({ wager, onCancel }: PvpSearchingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-3xl border-4 border-yellow-400 p-8 shadow-xl text-center"
    >
      <Loader2 className="size-12 text-yellow-500 animate-spin mx-auto mb-4" />
      <p className="font-black text-2xl text-gray-900 mb-2">Đang tìm đối thủ...</p>
      <p className="text-gray-500">
        Cược: <b>{wager} Chun</b>
      </p>
      <motion.button
        onClick={onCancel}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="mt-6 px-6 py-3 rounded-2xl border-4 border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
      >
        Hủy
      </motion.button>
    </motion.div>
  );
}
