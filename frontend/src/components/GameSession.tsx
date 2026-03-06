import { ArrowLeft, Play } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import GameCanvas from "./GameCanvas";

interface GameSessionProps {
  onBack: () => void;
  currentStreak: number;
  onReportResult: (isWin: boolean, onDone?: () => void) => void;
}

type Phase = "lobby" | "playing" | "submitting" | "result";

export default function GameSession({
  onBack,
  currentStreak,
  onReportResult,
}: GameSessionProps) {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [sessionWins, setSessionWins] = useState(0);
  const [sessionLosses, setSessionLosses] = useState(0);
  const [lastResult, setLastResult] = useState<"win" | "lose" | null>(null);
  const [streak, setStreak] = useState(currentStreak);

  const handleWin = () => {
    setPhase("submitting");
    setLastResult("win");
    toast.loading("Đang lưu kết quả lên blockchain...", { id: "report" });

    onReportResult(true, () => {
      setSessionWins((w) => w + 1);
      setStreak((s) => s + 1);
      setPhase("result");
      toast.success("Thắng! Kết quả đã lưu on-chain 🎉", { id: "report" });
    });
  };

  const handleLose = () => {
    setPhase("submitting");
    setLastResult("lose");
    toast.loading("Đang lưu kết quả lên blockchain...", { id: "report" });

    onReportResult(false, () => {
      setSessionLosses((l) => l + 1);
      setStreak(0);
      setPhase("result");
      toast.error("Thua! Kết quả đã lưu on-chain", { id: "report" });
    });
  };

  if (phase === "playing" || phase === "submitting") {
    return (
      <div className="relative">
        <GameCanvas
          onWin={handleWin}
          onLose={handleLose}
          onBack={() => setPhase("lobby")}
          enabled={phase === "playing"}
        />
        {phase === "submitting" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-4xl p-10 text-center shadow-2xl border-8 border-playful-blue"
            >
              <div className="text-7xl mb-4 animate-bounce">
                {lastResult === "win" ? "🎉" : "😢"}
              </div>
              <p className="font-display font-black text-3xl text-gray-900 mb-2">
                {lastResult === "win" ? "Bạn thắng!" : "Bạn thua!"}
              </p>
              <p className="text-gray-600 font-semibold">
                Đang lưu kết quả lên Sui blockchain...
              </p>
              <div className="flex justify-center gap-2 mt-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="size-3 bg-playful-blue rounded-full"
                    animate={{ y: [0, -10, 0] }}
                    transition={{
                      repeat: Infinity,
                      delay: i * 0.2,
                      duration: 0.6,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            className="bg-white p-5 rounded-full shadow-2xl border-4 border-playful-blue"
          >
            <ArrowLeft className="size-7 text-playful-blue" />
          </motion.button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-5xl">🎮</span>
              <h1 className="font-display font-black text-4xl text-gray-900">
                {phase === "lobby" ? "Arena" : "Kết quả"}
              </h1>
            </div>
            <p className="text-gray-600 font-semibold text-lg">
              Session: {sessionWins}W / {sessionLosses}L
            </p>
          </div>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-3xl p-5 text-center border-4 border-playful-orange shadow-xl">
            <div className="text-3xl mb-1">🔥</div>
            <p className="text-xs font-bold text-gray-500 uppercase">Streak</p>
            <p className="font-display font-black text-4xl text-playful-orange">
              {streak}
            </p>
          </div>
          <div className="bg-white rounded-3xl p-5 text-center border-4 border-playful-green shadow-xl">
            <div className="text-3xl mb-1">✅</div>
            <p className="text-xs font-bold text-gray-500 uppercase">
              Thắng (session)
            </p>
            <p className="font-display font-black text-4xl text-playful-green">
              {sessionWins}
            </p>
          </div>
          <div className="bg-white rounded-3xl p-5 text-center border-4 border-playful-pink shadow-xl">
            <div className="text-3xl mb-1">❌</div>
            <p className="text-xs font-bold text-gray-500 uppercase">
              Thua (session)
            </p>
            <p className="font-display font-black text-4xl text-playful-pink">
              {sessionLosses}
            </p>
          </div>
        </div>

        {/* Result banner */}
        <AnimatePresence>
          {phase === "result" && lastResult && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-4xl p-6 mb-8 border-8 text-center ${
                lastResult === "win"
                  ? "bg-green-50 border-playful-green"
                  : "bg-red-50 border-playful-pink"
              }`}
            >
              <div className="text-6xl mb-2">
                {lastResult === "win" ? "🏆" : "💀"}
              </div>
              <p className="font-display font-black text-3xl text-gray-900">
                {lastResult === "win"
                  ? "Chiến thắng! +Chun Raw"
                  : "Thất bại! -Chun Raw"}
              </p>
              <p className="text-gray-600 font-semibold mt-1">
                Đã lưu lên Sui blockchain ✓
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play button */}
        <motion.button
          onClick={() => setPhase("playing")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full btn-playful text-3xl flex items-center justify-center gap-4 bg-gradient-to-r from-playful-green to-playful-blue text-white border-4 border-white shadow-2xl py-8"
        >
          <Play className="size-10 fill-current" />
          {phase === "result" ? "CHƠI TIẾP!" : "BẮT ĐẦU!"}
        </motion.button>
      </div>
    </div>
  );
}
