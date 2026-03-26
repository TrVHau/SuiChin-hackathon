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
      className="bg-white rounded-3xl border-4 border-red-400 p-4 md:p-8 shadow-xl text-center"
    >
      <p className="font-black text-3xl text-gray-900 mb-1">Vòng {pvp.round}</p>
      <p className="text-gray-500 mb-4">Ban de len chun doi thu de thang</p>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 mb-4 text-left">
        <p className="text-xs font-semibold text-gray-700 mb-1">
          Trang thai realtime
        </p>
        <p className="text-xs text-gray-600">
          Luot hien tai: {pvp.myTurn ? "Ban" : "Doi thu"}
        </p>
        {pvp.lastShot ? (
          <p className="text-xs text-gray-600 mt-1">
            Cu ban moi nhat #{pvp.lastShot.seq} -{" "}
            {pvp.lastShot.byWallet === myAddress ? "Ban" : "Doi thu"}: (
            {pvp.lastShot.x}, {pvp.lastShot.y}) luc {pvp.lastShot.force}
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            Chua co cu ban nao duoc gui.
          </p>
        )}
      </div>

      <div className="mb-4">
        <PvpBattleBoard
          pvp={pvp}
          myAddress={myAddress}
          onShoot={onShoot}
          onLocalFinish={onLocalFinish}
        />
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Tran ket thuc khi mot ben bi de. Ket qua luu local, chua ghi on-chain.
      </p>
    </motion.div>
  );
}
