import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GameScreenProps {
  playerData: {
    tier1: number;
    tier2: number;
    tier3: number;
    maxStreak: number;
    currentStreak: number;
  };
  onExitGame: (results: GameResults) => void;
}

export interface GameResults {
  deltaTier1: number;
  deltaTier2: number;
  deltaTier3: number;
  newMaxStreak: number;
  newCurrentStreak: number;
}

interface ChunPosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

type GameState = "select" | "playing" | "result";

export default function GameScreen({
  playerData,
  onExitGame,
}: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("select");
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  // Local session tracking
  const [sessionTier1, setSessionTier1] = useState(playerData.tier1);
  const [sessionTier2, setSessionTier2] = useState(playerData.tier2);
  const [sessionTier3, setSessionTier3] = useState(playerData.tier3);
  const [sessionCurrentStreak, setSessionCurrentStreak] = useState(
    playerData.currentStreak,
  );
  const [sessionMaxStreak, setSessionMaxStreak] = useState(
    playerData.maxStreak,
  );

  const [matchResult, setMatchResult] = useState<"win" | "lose" | null>(null);
  const [playerChun, setPlayerChun] = useState<ChunPosition | null>(null);
  const [botChun, setBotChun] = useState<ChunPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const animationFrameRef = useRef<number>();

  const totalPoints = sessionTier1 * 1 + sessionTier2 * 2 + sessionTier3 * 3;

  const getTierEmoji = (tier: number) => {
    if (tier === 1) return "🥉";
    if (tier === 2) return "🥈";
    return "🥇";
  };

  const getTierColor = (tier: number) => {
    if (tier === 1) return "#cd7f32";
    if (tier === 2) return "#c0c0c0";
    return "#ffd700";
  };

  const canPlayTier = (tier: number) => {
    if (tier === 1) return sessionTier1 > 0;
    if (tier === 2) return sessionTier2 > 0;
    return sessionTier3 > 0;
  };

  const startMatch = (tier: number) => {
    if (!canPlayTier(tier)) return;

    setSelectedTier(tier);
    setGameState("playing");
    setMatchResult(null);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize positions
    setPlayerChun({
      x: canvas.width / 2 - 100,
      y: canvas.height - 100,
      vx: 0,
      vy: 0,
      radius: 30,
    });

    setBotChun({
      x: canvas.width / 2 + 100,
      y: 100,
      vx: 0,
      vy: 0,
      radius: 30,
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!playerChun || gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - playerChun.x;
    const dy = y - playerChun.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= playerChun.radius) {
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPlayerChun((prev) => (prev ? { ...prev, x, y } : null));
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !playerChun) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    // Launch chun with velocity
    setPlayerChun((prev) =>
      prev
        ? {
            ...prev,
            vx: dx * 0.3,
            vy: dy * 0.3,
          }
        : null,
    );

    setIsDragging(false);

    // Bot AI move after 1 second
    setTimeout(() => {
      setBotChun((prev) =>
        prev
          ? {
              ...prev,
              vx: (Math.random() - 0.5) * 15,
              vy: Math.random() * 10 + 5,
            }
          : null,
      );
    }, 1000);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== "playing") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw game area
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update physics (no gravity - 2D sliding)
      if (playerChun && !isDragging) {
        const newPlayerChun = { ...playerChun };
        newPlayerChun.x += newPlayerChun.vx;
        newPlayerChun.y += newPlayerChun.vy;
        // No gravity - pure friction
        newPlayerChun.vx *= 0.96;
        newPlayerChun.vy *= 0.96;
        // Snap to zero when very slow
        if (Math.abs(newPlayerChun.vx) < 0.1) newPlayerChun.vx = 0;
        if (Math.abs(newPlayerChun.vy) < 0.1) newPlayerChun.vy = 0;

        // Bounce off walls
        if (
          newPlayerChun.x < newPlayerChun.radius ||
          newPlayerChun.x > canvas.width - newPlayerChun.radius
        ) {
          newPlayerChun.vx *= -0.8;
          newPlayerChun.x = Math.max(
            newPlayerChun.radius,
            Math.min(canvas.width - newPlayerChun.radius, newPlayerChun.x),
          );
        }
        if (
          newPlayerChun.y < newPlayerChun.radius ||
          newPlayerChun.y > canvas.height - newPlayerChun.radius
        ) {
          newPlayerChun.vy *= -0.8;
          newPlayerChun.y = Math.max(
            newPlayerChun.radius,
            Math.min(canvas.height - newPlayerChun.radius, newPlayerChun.y),
          );
        }

        setPlayerChun(newPlayerChun);
      }

      if (botChun) {
        const newBotChun = { ...botChun };
        newBotChun.x += newBotChun.vx;
        newBotChun.y += newBotChun.vy;
        // No gravity - pure friction
        newBotChun.vx *= 0.96;
        newBotChun.vy *= 0.96;
        // Snap to zero when very slow
        if (Math.abs(newBotChun.vx) < 0.1) newBotChun.vx = 0;
        if (Math.abs(newBotChun.vy) < 0.1) newBotChun.vy = 0;

        if (
          newBotChun.x < newBotChun.radius ||
          newBotChun.x > canvas.width - newBotChun.radius
        ) {
          newBotChun.vx *= -0.8;
          newBotChun.x = Math.max(
            newBotChun.radius,
            Math.min(canvas.width - newBotChun.radius, newBotChun.x),
          );
        }
        if (
          newBotChun.y < newBotChun.radius ||
          newBotChun.y > canvas.height - newBotChun.radius
        ) {
          newBotChun.vy *= -0.8;
          newBotChun.y = Math.max(
            newBotChun.radius,
            Math.min(canvas.height - newBotChun.radius, newBotChun.y),
          );
        }

        setBotChun(newBotChun);
      }

      // Check collision and determine winner
      if (
        playerChun &&
        botChun &&
        Math.abs(playerChun.vx) < 0.5 &&
        Math.abs(playerChun.vy) < 0.5 &&
        Math.abs(botChun.vx) < 0.5 &&
        Math.abs(botChun.vy) < 0.5
      ) {
        const dx = playerChun.x - botChun.x;
        const dy = playerChun.y - botChun.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < playerChun.radius + botChun.radius + 10) {
          // Determine winner based on vertical position
          const result = playerChun.y < botChun.y ? "win" : "lose";
          setMatchResult(result);
          setGameState("result");
        }
      }

      // Draw bot chun
      if (botChun) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(botChun.x, botChun.y, botChun.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("BOT", botChun.x, botChun.y);
      }

      // Draw player chun
      if (playerChun) {
        ctx.fillStyle = selectedTier ? getTierColor(selectedTier) : "#3b82f6";
        ctx.beginPath();
        ctx.arc(playerChun.x, playerChun.y, playerChun.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          selectedTier ? getTierEmoji(selectedTier) : "YOU",
          playerChun.x,
          playerChun.y,
        );
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playerChun, botChun, isDragging, gameState, selectedTier]);

  const handleContinue = () => {
    if (!selectedTier) return;

    // Update session stats
    if (matchResult === "win") {
      if (selectedTier === 1) setSessionTier1((prev) => prev + 1);
      if (selectedTier === 2) setSessionTier2((prev) => prev + 1);
      if (selectedTier === 3) setSessionTier3((prev) => prev + 1);

      const newStreak = sessionCurrentStreak + 1;
      setSessionCurrentStreak(newStreak);
      setSessionMaxStreak(Math.max(sessionMaxStreak, newStreak));
    } else {
      if (selectedTier === 1) setSessionTier1((prev) => Math.max(0, prev - 1));
      if (selectedTier === 2) setSessionTier2((prev) => Math.max(0, prev - 1));
      if (selectedTier === 3) setSessionTier3((prev) => Math.max(0, prev - 1));

      setSessionCurrentStreak(0);
    }

    setGameState("select");
    setMatchResult(null);
    setSelectedTier(null);
  };

  const handleExit = () => {
    const results: GameResults = {
      deltaTier1: sessionTier1 - playerData.tier1,
      deltaTier2: sessionTier2 - playerData.tier2,
      deltaTier3: sessionTier3 - playerData.tier3,
      newMaxStreak: sessionMaxStreak,
      newCurrentStreak: sessionCurrentStreak,
    };

    onExitGame(results);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg flex items-center justify-between">
          <button
            onClick={handleExit}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="size-5" />
            Thoát & Lưu
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🥉</span>
              <span className="font-bold">{sessionTier1}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🥈</span>
              <span className="font-bold">{sessionTier2}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🥇</span>
              <span className="font-bold">{sessionTier3}</span>
            </div>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-orange-500" />
              <span className="font-bold text-orange-500">
                {sessionCurrentStreak}
              </span>
            </div>
          </div>
        </div>

        {/* Game Area */}
        {gameState === "select" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-xl"
          >
            <h2 className="font-bold text-[32px] text-center mb-2">
              Chọn Chun Để Đặt Cược
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Thắng: +1 chun | Thua: -1 chun
            </p>

            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <button
                onClick={() => startMatch(1)}
                disabled={!canPlayTier(1)}
                className={`p-8 rounded-2xl border-4 transition-all ${
                  canPlayTier(1)
                    ? "border-orange-300 bg-orange-50 hover:bg-orange-100 hover:scale-105"
                    : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="text-[64px] mb-4">🥉</div>
                <div className="font-bold text-[20px] mb-2">Tier 1</div>
                <div className="text-gray-600">Có: {sessionTier1}</div>
              </button>

              <button
                onClick={() => startMatch(2)}
                disabled={!canPlayTier(2)}
                className={`p-8 rounded-2xl border-4 transition-all ${
                  canPlayTier(2)
                    ? "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:scale-105"
                    : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="text-[64px] mb-4">🥈</div>
                <div className="font-bold text-[20px] mb-2">Tier 2</div>
                <div className="text-gray-600">Có: {sessionTier2}</div>
              </button>

              <button
                onClick={() => startMatch(3)}
                disabled={!canPlayTier(3)}
                className={`p-8 rounded-2xl border-4 transition-all ${
                  canPlayTier(3)
                    ? "border-yellow-300 bg-yellow-50 hover:bg-yellow-100 hover:scale-105"
                    : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="text-[64px] mb-4">🥇</div>
                <div className="font-bold text-[20px] mb-2">Tier 3</div>
                <div className="text-gray-600">Có: {sessionTier3}</div>
              </button>
            </div>
          </motion.div>
        )}

        {gameState === "playing" && (
          <div className="bg-white rounded-2xl p-4 shadow-xl">
            <div className="bg-blue-50 rounded-lg p-3 mb-4 text-center">
              <p className="text-[14px] text-gray-700">
                <strong>Hướng dẫn:</strong> Kéo chun của bạn và thả để búng. Mục
                tiêu: Đè chun của bạn lên chun bot!
              </p>
            </div>
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="border-4 border-gray-300 rounded-xl w-full max-w-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </div>
        )}

        {gameState === "result" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-12 shadow-xl text-center"
            >
              {matchResult === "win" ? (
                <>
                  <div className="text-[80px] mb-4">🎉</div>
                  <h2 className="font-bold text-[48px] text-green-600 mb-4">
                    THẮNG!
                  </h2>
                  <p className="text-[20px] text-gray-700 mb-2">
                    +1 chun {getTierEmoji(selectedTier!)}
                  </p>
                  <p className="text-[18px] text-orange-500 mb-8">
                    Streak: {sessionCurrentStreak + 1}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-[80px] mb-4">😢</div>
                  <h2 className="font-bold text-[48px] text-red-600 mb-4">
                    THUA!
                  </h2>
                  <p className="text-[20px] text-gray-700 mb-2">
                    -1 chun {getTierEmoji(selectedTier!)}
                  </p>
                  <p className="text-[18px] text-gray-500 mb-8">
                    Streak reset về 0
                  </p>
                </>
              )}

              <button
                onClick={handleContinue}
                className="bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-[18px] hover:bg-blue-600 transition-colors"
              >
                Chơi Tiếp
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
