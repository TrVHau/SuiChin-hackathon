import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface PvpSearchingCardProps {
  roomValue: number;
  roomId?: string;
  onCancel: () => void;
}

export default function PvpSearchingCard({ roomValue, roomId, onCancel }: PvpSearchingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[linear-gradient(160deg,rgba(17,24,39,0.98),rgba(71,85,105,0.92)_45%,rgba(30,41,59,0.98))] p-8 text-center text-white shadow-[0_26px_70px_rgba(15,23,42,0.35)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.2),transparent_30%)]" />
      <div className="relative">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-2xl backdrop-blur">
          <Loader2 className="size-10 animate-spin text-amber-300" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.35em] text-white/60">
          Private room warming up
        </p>
        <p className="mt-2 text-3xl font-black tracking-tight text-white">
          Đang ghép phòng riêng
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/75">
          Giá trị phòng hiện tại được khóa ở mức <span className="font-black text-white">{roomValue}</span>. Hệ thống đang chờ thêm một người chơi tương xứng để mở phòng.
        </p>

        <div className="mt-6 grid gap-3 rounded-[28px] border border-white/10 bg-black/20 p-4 text-left text-sm text-white/80 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Trạng thái</span>
            <span className="font-black text-amber-300">Đang mở phòng</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Giá trị phòng</span>
            <span className="font-black text-white">{roomValue}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Room ID</span>
            <span className="max-w-[55%] truncate font-black text-white">{roomId ?? "-"}</span>
          </div>
        </div>

        <motion.button
          onClick={onCancel}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 w-full rounded-[22px] border border-white/15 bg-white/10 px-6 py-4 font-black text-white transition-colors hover:bg-white/15"
        >
          Hủy phòng chờ
        </motion.button>
      </div>
    </motion.div>
  );
}
