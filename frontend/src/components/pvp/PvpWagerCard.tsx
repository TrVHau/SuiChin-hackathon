import { motion } from "framer-motion";

const WAGER_OPTIONS = [1, 5, 10, 20, 50];

interface PvpWagerCardProps {
  selectedWager: number;
  chunRaw: number;
  onSelect: (wager: number) => void;
  onJoin: () => void;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  badgeLabel?: string;
}

export default function PvpWagerCard({
  selectedWager,
  chunRaw,
  onSelect,
  onJoin,
  title = "Chọn mức cược",
  subtitle = "Thiết lập mức cược trước khi vào phòng riêng.",
  ctaLabel = "Tìm trận ⚔️",
  badgeLabel = "Private room",
}: PvpWagerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[32px] border border-white/20 bg-[linear-gradient(135deg,rgba(27,31,59,0.98),rgba(53,84,166,0.94)_52%,rgba(13,148,136,0.92))] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.35)] text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,219,140,0.22),transparent_28%)]" />
      <div className="relative">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-white/70">
              {badgeLabel}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              {title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/78">
              {subtitle}
            </p>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 text-right shadow-lg backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">
              Chun khả dụng
            </p>
            <p className="text-2xl font-black text-white">{chunRaw}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {WAGER_OPTIONS.map((w) => (
          <button
            key={w}
            onClick={() => onSelect(w)}
            className={`flex min-h-24 flex-col items-center justify-center rounded-3xl border px-4 py-4 text-center transition-all duration-200
              ${
                selectedWager === w
                  ? "border-white/70 bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.18)] scale-[1.02]"
                  : "border-white/15 bg-white/8 text-white hover:border-white/40 hover:bg-white/12"
              }
              ${chunRaw < w ? "opacity-40 cursor-not-allowed" : ""}`}
            disabled={chunRaw < w}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-current/65">
              Cược
            </span>
            <span className="mt-1 text-3xl font-black leading-none">
              {w}
            </span>
            <span className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-current/80">
              <img
                src="/img/chun_raw.jpg"
                alt="Chun Raw"
                className="size-4 rounded-md object-cover border border-white/30"
              />
              Chun
            </span>
          </button>
        ))}
        </div>

        <div className="mb-5 rounded-[28px] border border-white/15 bg-black/20 px-4 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-white/80">
            <span>Đang chọn</span>
            <span className="font-black text-white">{selectedWager} Chun</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#f6d365,#fda085,#8fd3f4)] transition-all"
              style={{ width: `${Math.min(100, (selectedWager / Math.max(chunRaw, 1)) * 100)}%` }}
            />
          </div>
        </div>

        <motion.button
          onClick={onJoin}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={chunRaw < selectedWager}
          className="w-full rounded-[22px] bg-white px-5 py-4 text-lg font-black text-slate-950 shadow-[0_18px_40px_rgba(255,255,255,0.12)] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ctaLabel}
        </motion.button>
      </div>
    </motion.div>
  );
}
