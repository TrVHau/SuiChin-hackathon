import { motion } from "framer-motion";
import type { PvPState } from "@/hooks/usePvP";

interface PvpPlayingCardProps {
  pvp: PvPState;
  myAddress?: string;
  onShoot: (shot: { x: number; y: number; force: number }) => void;
  onReportRound: (winnerAddress: string) => void;
}

export default function PvpPlayingCard({
  pvp,
  myAddress,
  onShoot,
  onReportRound,
}: PvpPlayingCardProps) {
  const simulateShot = () => {
    const shot = {
      x: Number((Math.random() * 100).toFixed(2)),
      y: Number((Math.random() * 100).toFixed(2)),
      force: Number((500 + Math.random() * 700).toFixed(0)),
    };
    onShoot(shot);
  };

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
          <p className="text-4xl font-black text-playful-blue">
            {pvp.scores[0]}
          </p>
          <p className="text-xs text-gray-500">Bạn</p>
        </div>
        <p className="text-3xl font-black text-gray-400">:</p>
        <div>
          <p className="text-4xl font-black text-red-500">{pvp.scores[1]}</p>
          <p className="text-xs text-gray-500">Đối thủ</p>
        </div>
      </div>

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

      <motion.button
        onClick={simulateShot}
        whileHover={{ scale: pvp.myTurn ? 1.03 : 1 }}
        whileTap={{ scale: pvp.myTurn ? 0.97 : 1 }}
        disabled={!pvp.myTurn}
        className="w-full py-3 rounded-2xl font-black text-white bg-playful-blue hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed mb-4"
      >
        {pvp.myTurn ? "Ban (gui toa do realtime)" : "Dang cho doi thu ban..."}
      </motion.button>

      <p className="text-xs text-gray-400 mb-3">
        (Tam thoi van giu nut demo de chot ket qua tran)
      </p>
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
