import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface PvpMatchedCardProps {
  opponent: string | null;
  submitting: boolean;
}

export default function PvpMatchedCard({ opponent, submitting }: PvpMatchedCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-3xl border-4 border-green-400 p-8 shadow-xl text-center"
    >
      <p className="text-5xl mb-3">🥊</p>
      <p className="font-black text-2xl text-gray-900 mb-2">Tìm thấy đối thủ!</p>
      <p className="text-gray-500 break-all text-sm mb-4">{opponent}</p>
      <div className="flex items-center justify-center gap-2">
        <Loader2 className="size-5 animate-spin text-green-500" />
        <span className="font-semibold text-green-600">
          {submitting ? "Đã gửi kết quả, chờ đối thủ..." : "Đang vào trận..."}
        </span>
      </div>
    </motion.div>
  );
}
