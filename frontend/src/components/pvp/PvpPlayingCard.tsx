import { motion } from "framer-motion";
import type { PvPState } from "@/hooks/usePvP";
import PvpBattleBoard from "./PvpBattleBoard";

interface PvpPlayingCardProps {
  pvp: PvPState;
  myAddress?: string;
  onShoot: (shot: { x: number; y: number; force: number }) => void;
  onLocalFinish: (winnerWallet: string | null) => void;
}

export default function PvpPlayingCard({
  pvp,
  myAddress,
  onShoot,
  onLocalFinish,
}: PvpPlayingCardProps) {
  return (
    <motion.div
      key={`round-${pvp.round}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[linear-gradient(160deg,rgba(2,6,23,0.99),rgba(15,23,42,0.96)_45%,rgba(30,41,59,0.98))] p-4 md:p-8 text-center text-white shadow-[0_26px_80px_rgba(15,23,42,0.42)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_25%)]" />
      <div className="relative">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-white/5 p-4 text-left backdrop-blur">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-white/55">
            Private battle room
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-white">
            Vòng {pvp.round}
          </p>
          <p className="mt-1 text-sm text-white/70">
            Búng Chun để dọn bàn và đẩy đối thủ ra khỏi phòng.
          </p>
        </div>
        <div className="grid gap-2 text-right text-xs font-bold text-white/80">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Turn: {pvp.myTurn ? "Bạn" : "Đối thủ"}</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Room: {pvp.roomId ?? "-"}</span>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/6 p-3 md:p-4 mb-4 text-left backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/55 mb-1">
          Trang thai realtime
        </p>
        <p className="text-xs text-white/80">
          Luot hien tai: <span className="font-black text-white">{pvp.myTurn ? "Ban" : "Doi thu"}</span>
        </p>
        {pvp.lastShot ? (
          <p className="text-xs text-white/70 mt-1">
            Cu ban moi nhat #{pvp.lastShot.seq} -{" "}
            <span className="font-black text-white">{pvp.lastShot.byWallet === myAddress ? "Ban" : "Doi thu"}</span>: (
            {pvp.lastShot.x}, {pvp.lastShot.y}) luc {pvp.lastShot.force}
          </p>
        ) : (
          <p className="text-xs text-white/55 mt-1">
            Chua co cu ban nao duoc gui.
          </p>
        )}
      </div>

      <div className="mb-4 rounded-[30px] border border-white/10 bg-black/20 p-3 md:p-4 shadow-2xl">
        <PvpBattleBoard
          pvp={pvp}
          myAddress={myAddress}
          onShoot={onShoot}
          onLocalFinish={onLocalFinish}
        />
      </div>

      <p className="mt-2 text-xs leading-6 text-white/60">
        Phòng riêng kết thúc khi một bên bị đẩy khỏi bàn. Backend finalize và trả về settlement payload để winner settle on-chain.
      </p>
      </div>
    </motion.div>
  );
}
