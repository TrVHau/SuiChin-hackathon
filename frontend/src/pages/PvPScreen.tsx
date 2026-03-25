import { Loader2, Swords, Trophy } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { usePvP } from "@/hooks/usePvP";
import PageHeader from "@/components/common/PageHeader";
import { useGame } from "@/providers/GameContext";

const WAGER_OPTIONS = [1, 5, 10, 20, 50];

export default function PvPScreen() {
  const navigate = useNavigate();
  const { playerData, refreshProfile } = useGame();
  const resolvedProfileId = playerData?.objectId ?? "";
  const resolvedChunRaw = playerData?.chun_raw ?? 0;
  const handleBack = () => navigate("/dashboard");
  const handleSuccess = () => void refreshProfile();
  const account = useCurrentAccount();
  const { pvp, joinQueue, leaveQueue, reportRound } = usePvP(resolvedProfileId);
  const [selectedWager, setSelectedWager] = useState(5);

  const handleJoin = () => {
    if (resolvedChunRaw < selectedWager) return;
    joinQueue(selectedWager);
  };

  const isMe = (addr: string) => addr === account?.address;

  return (
    <div className="min-h-screen bg-gradient-to-br from-playful-purple/20 via-white to-playful-blue/20">
      <div className="max-w-md mx-auto px-6 py-10">
        <PageHeader
          onBack={handleBack}
          title="PvP Online"
          emoji="⚔️"
          backBorderClass="border-playful-purple"
          backIconClass="text-playful-purple"
        />

        {/* Idle / wager selection */}
        {(pvp.status === "idle" || pvp.status === "error") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border-4 border-playful-purple p-6 shadow-xl"
          >
            <h2 className="font-black text-xl text-gray-900 mb-4">Chọn số Chun cược:</h2>
            <div className="flex flex-wrap gap-3 mb-6">
              {WAGER_OPTIONS.map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWager(w)}
                  className={`px-5 py-2.5 rounded-2xl font-black text-lg border-4 transition-all
                    ${selectedWager === w
                      ? 'bg-playful-purple text-white border-playful-purple scale-105'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-playful-purple'
                  }
                  ${resolvedChunRaw < w ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={resolvedChunRaw < w}
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
            <p className="text-sm text-gray-500 mb-4">Chun Raw của bạn: <b>{resolvedChunRaw}</b></p>
            <motion.button
              onClick={handleJoin}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              disabled={resolvedChunRaw < selectedWager}
              className="w-full py-4 rounded-2xl font-black text-white text-xl
                         bg-red-500 hover:bg-red-600 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              Tìm trận ⚔️
            </motion.button>
          </motion.div>
        )}

        {/* Searching */}
        {(pvp.status === "connecting" || pvp.status === "waiting") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl border-4 border-yellow-400 p-8 shadow-xl text-center"
          >
            <Loader2 className="size-12 text-yellow-500 animate-spin mx-auto mb-4" />
            <p className="font-black text-2xl text-gray-900 mb-2">Đang tìm đối thủ...</p>
            <p className="text-gray-500">Cược: <b>{pvp.wager} Chun</b></p>
            <motion.button
              onClick={leaveQueue}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="mt-6 px-6 py-3 rounded-2xl border-4 border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
            >
              Hủy
            </motion.button>
          </motion.div>
        )}

        {/* Matched / locking */}
        {(pvp.status === "matched" || pvp.status === "submitting") && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl border-4 border-green-400 p-8 shadow-xl text-center"
          >
            <p className="text-5xl mb-3">🥊</p>
            <p className="font-black text-2xl text-gray-900 mb-2">Tìm thấy đối thủ!</p>
            <p className="text-gray-500 break-all text-sm mb-4">{pvp.opponent}</p>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="size-5 animate-spin text-green-500" />
              <span className="font-semibold text-green-600">
                {pvp.status === "submitting"
                  ? "Đã gửi kết quả, chờ đối thủ..."
                  : "Đang vào trận..."}
              </span>
            </div>
          </motion.div>
        )}

        {/* Playing */}
        {pvp.status === "playing" && (
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
            {/* Quick round result buttons for demo */}
            <p className="text-xs text-gray-400 mb-3">(Demo: chọn kết quả vòng)</p>
            <div className="flex gap-3">
              <motion.button
                onClick={() => reportRound(account?.address ?? '')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={Boolean(pvp.submittedResult)}
                className="flex-1 py-3 rounded-2xl font-black text-white bg-green-500 hover:bg-green-600"
              >
                Tôi thắng ✅
              </motion.button>
              <motion.button
                onClick={() => reportRound(pvp.opponent ?? '')}
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
        )}

        {/* Resolved */}
        {pvp.status === "resolved" && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl border-4 border-yellow-400 p-8 shadow-xl text-center"
          >
            <Trophy className="size-16 text-yellow-500 mx-auto mb-4" />
            <p className="font-black text-3xl text-gray-900 mb-2">
              {!pvp.winner
                ? "Hòa trận"
                : isMe(pvp.winner ?? "")
                  ? "Bạn thắng! 🏆"
                  : "Bạn thua 💀"}
            </p>
            {pvp.resultTx && (
              <p className="text-xs text-gray-400 break-all mb-6">
                Tx: {pvp.resultTx.slice(0, 20)}...
              </p>
            )}
            <motion.button
              onClick={() => {
                handleSuccess();
                handleBack();
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-4 rounded-2xl font-black text-white text-xl bg-playful-purple hover:brightness-110"
            >
              Về Dashboard
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
