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
      className="relative overflow-hidden rounded-[32px] border border-emerald-200/40 bg-[linear-gradient(160deg,rgba(6,78,59,0.98),rgba(8,145,178,0.92)_55%,rgba(15,23,42,0.98))] p-8 text-center text-white shadow-[0_26px_70px_rgba(15,23,42,0.35)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.2),transparent_30%)]" />
      <div className="relative">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-2xl backdrop-blur">
          <span className="text-4xl">🥊</span>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.35em] text-white/60">
          Match ready
        </p>
        <p className="mt-2 text-3xl font-black tracking-tight text-white">
          Đã tìm thấy phòng đối đầu
        </p>
        <p className="mx-auto mt-3 max-w-md break-all text-sm leading-6 text-white/75">
          {opponent}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur">
          <Loader2 className="size-4 animate-spin text-emerald-300" />
          <span>{submitting ? "Đã gửi kết quả, chờ đối thủ xác nhận" : "Đang mở phòng chơi riêng"}</span>
        </div>
      </div>
    </motion.div>
  );
}
