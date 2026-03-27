import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Play, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/providers/GameContext";
import { COOLDOWN_MS } from "@/config/sui.config";

export function PlayGameCard() {
  const navigate = useNavigate();
  const { playerData } = useGame();
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const nowMs = Date.now();
      const parsedLastPlayedMs = Number(playerData?.last_played_ms || 0);
      const lastPlayedMs = Number.isFinite(parsedLastPlayedMs) ? parsedLastPlayedMs : 0;
      const elapsed = Math.max(0, nowMs - lastPlayedMs);
      setCooldownLeft(Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000)));
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [playerData?.last_played_ms]);

  if (!playerData) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.02, rotate: -1 }}
      className="lg:col-span-2 bg-white border-8 border-playful-blue rounded-4xl p-10 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 size-40 bg-sunny-200 rounded-full opacity-30"></div>
      <div className="absolute -bottom-10 -left-10 size-40 bg-playful-pink/20 rounded-full"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-6xl emoji-bounce">🎮</span>
          <h2 className="font-display font-black text-5xl text-gray-900">
            Chơi Game!
          </h2>
        </div>
        <p className="text-gray-700 mb-4 text-xl font-semibold max-w-lg">
          Búng chun với bot, thắng để kiếm Chun Raw và streak! Kết quả sẽ
          được lưu lên blockchain.
        </p>

        <div className="flex items-center gap-6 mb-6">
          <div className="bg-sunny-100 border-4 border-sunny-300 rounded-3xl px-5 py-3 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase">
              Chun Raw
            </p>
            <p className="font-black text-3xl text-playful-orange">
              {playerData.chun_raw}
            </p>
          </div>
          <div className="bg-green-50 border-4 border-green-300 rounded-3xl px-5 py-3 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase">
              Thắng
            </p>
            <p className="font-black text-3xl text-green-600">
              {playerData.wins}
            </p>
          </div>
          <div className="bg-red-50 border-4 border-red-300 rounded-3xl px-5 py-3 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase">
              Thua
            </p>
            <p className="font-black text-3xl text-red-500">
              {playerData.losses}
            </p>
          </div>
        </div>

        <motion.button
          onClick={() => {
            if (cooldownLeft === 0) {
              navigate("/session");
            }
          }}
          disabled={cooldownLeft > 0}
          whileHover={cooldownLeft === 0 ? { scale: 1.05 } : {}}
          whileTap={cooldownLeft === 0 ? { scale: 0.95 } : {}}
          className={`btn-playful text-2xl flex items-center gap-3 border-4 ${
            cooldownLeft > 0
              ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
              : "bg-gradient-to-r from-playful-green to-playful-blue text-white border-white shadow-2xl"
          }`}
        >
          {cooldownLeft > 0 ? (
            <>
              <Clock className="size-8 animate-pulse" />
              Chờ {cooldownLeft}s...
            </>
          ) : (
            <>
              <Play className="size-8 fill-current" />
              CHƠI NGAY!
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
