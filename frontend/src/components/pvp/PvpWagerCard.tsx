import { motion } from "framer-motion";

const WAGER_OPTIONS = [1, 5, 10, 20, 50];

interface PvpWagerCardProps {
  selectedWager: number;
  chunRaw: number;
  onSelect: (wager: number) => void;
  onJoin: () => void;
}

export default function PvpWagerCard({
  selectedWager,
  chunRaw,
  onSelect,
  onJoin,
}: PvpWagerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border-4 border-playful-purple p-6 shadow-xl"
    >
      <h2 className="font-black text-xl text-gray-900 mb-4">Chọn số Chun cược:</h2>
      <div className="flex flex-wrap gap-3 mb-6">
        {WAGER_OPTIONS.map((w) => (
          <button
            key={w}
            onClick={() => onSelect(w)}
            className={`px-5 py-2.5 rounded-2xl font-black text-lg border-4 transition-all
              ${
                selectedWager === w
                  ? "bg-playful-purple text-white border-playful-purple scale-105"
                  : "bg-white text-gray-800 border-gray-200 hover:border-playful-purple"
              }
              ${chunRaw < w ? "opacity-40 cursor-not-allowed" : ""}`}
            disabled={chunRaw < w}
          >
            <span className="inline-flex items-center gap-2">
              {w}
              <img
                src="/img/chun_raw.jpg"
                alt="Chun Raw"
                className="size-5 rounded-md object-cover border border-gray-300"
              />
            </span>
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Chun Raw của bạn: <b>{chunRaw}</b>
      </p>
      <motion.button
        onClick={onJoin}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        disabled={chunRaw < selectedWager}
        className="w-full py-4 rounded-2xl font-black text-white text-xl
                   bg-red-500 hover:bg-red-600 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      >
        Tìm trận ⚔️
      </motion.button>
    </motion.div>
  );
}
