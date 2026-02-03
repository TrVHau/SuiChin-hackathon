import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface MatchScreenProps {
  selectedTier: number;
  onMatchEnd: (result: "win" | "lose") => void;
  onForfeit: () => void;
}

interface ChunPosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export default function MatchScreen({ selectedTier, onMatchEnd, onForfeit }: MatchScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [matchResult, setMatchResult] = useState<"win" | "lose" | null>(null);
  const [playerChun, setPlayerChun] = useState<ChunPosition | null>(null);
  const [botChun, setBotChun] = useState<ChunPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();

  const getTierName = () => {
    if (selectedTier === 1) return "Tier 1 Match";
    if (selectedTier === 2) return "Tier 2 Match";
    return "Tier 3 Match";
  };

  const getTierColor = () => {
    if (selectedTier === 1) return "#ff8904";
    if (selectedTier === 2) return "#99a1af";
    return "#fdc700";
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Initialize positions
    setPlayerChun({
      x: canvas.width / 2 - 150,
      y: canvas.height - 100,
      vx: 0,
      vy: 0,
      radius: 30,
    });
    
    setBotChun({
      x: canvas.width / 2 + 150,
      y: 100,
      vx: 0,
      vy: 0,
      radius: 30,
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!playerChun || matchResult) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
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
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    setPlayerChun(prev => prev ? { ...prev, x, y } : null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !playerChun) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    
    setPlayerChun(prev => prev ? {
      ...prev,
      vx: dx * 0.3,
      vy: dy * 0.3,
    } : null);
    
    setIsDragging(false);
    
    setTimeout(() => {
      setBotChun(prev => prev ? {
        ...prev,
        vx: (Math.random() - 0.5) * 15,
        vy: Math.random() * 10 + 5,
      } : null);
    }, 1000);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || matchResult) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid background
      ctx.strokeStyle = "#364153";
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Update physics
      if (playerChun && !isDragging) {
        const newPlayerChun = { ...playerChun };
        newPlayerChun.x += newPlayerChun.vx;
        newPlayerChun.y += newPlayerChun.vy;
        newPlayerChun.vy += 0.3;
        newPlayerChun.vx *= 0.99;
        newPlayerChun.vy *= 0.99;
        
        if (newPlayerChun.x < newPlayerChun.radius || newPlayerChun.x > canvas.width - newPlayerChun.radius) {
          newPlayerChun.vx *= -0.8;
          newPlayerChun.x = Math.max(newPlayerChun.radius, Math.min(canvas.width - newPlayerChun.radius, newPlayerChun.x));
        }
        if (newPlayerChun.y < newPlayerChun.radius || newPlayerChun.y > canvas.height - newPlayerChun.radius) {
          newPlayerChun.vy *= -0.8;
          newPlayerChun.y = Math.max(newPlayerChun.radius, Math.min(canvas.height - newPlayerChun.radius, newPlayerChun.y));
        }
        
        setPlayerChun(newPlayerChun);
      }
      
      if (botChun) {
        const newBotChun = { ...botChun };
        newBotChun.x += newBotChun.vx;
        newBotChun.y += newBotChun.vy;
        newBotChun.vy += 0.3;
        newBotChun.vx *= 0.99;
        newBotChun.vy *= 0.99;
        
        if (newBotChun.x < newBotChun.radius || newBotChun.x > canvas.width - newBotChun.radius) {
          newBotChun.vx *= -0.8;
          newBotChun.x = Math.max(newBotChun.radius, Math.min(canvas.width - newBotChun.radius, newBotChun.x));
        }
        if (newBotChun.y < newBotChun.radius || newBotChun.y > canvas.height - newBotChun.radius) {
          newBotChun.vy *= -0.8;
          newBotChun.y = Math.max(newBotChun.radius, Math.min(canvas.height - newBotChun.radius, newBotChun.y));
        }
        
        setBotChun(newBotChun);
      }
      
      // Check collision
      if (playerChun && botChun && Math.abs(playerChun.vx) < 0.5 && Math.abs(playerChun.vy) < 0.5 && Math.abs(botChun.vx) < 0.5 && Math.abs(botChun.vy) < 0.5) {
        const dx = playerChun.x - botChun.x;
        const dy = playerChun.y - botChun.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < playerChun.radius + botChun.radius + 10) {
          const result = playerChun.y < botChun.y ? "win" : "lose";
          setMatchResult(result);
          setTimeout(() => onMatchEnd(result), 2000);
        }
      }
      
      // Draw bot chun
      if (botChun) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(botChun.x, botChun.y, botChun.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("BOT", botChun.x, botChun.y);
      }
      
      // Draw player chun
      if (playerChun) {
        ctx.fillStyle = getTierColor();
        ctx.beginPath();
        ctx.arc(playerChun.x, playerChun.y, playerChun.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw border if selected
        ctx.strokeStyle = "#fdc700";
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("YOU", playerChun.x, playerChun.y);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playerChun, botChun, isDragging, matchResult, selectedTier]);

  return (
    <div className="min-h-screen bg-[#101828] flex items-center justify-center p-6">
      <div className="bg-[#1e2939] rounded-3xl overflow-hidden max-w-5xl w-full shadow-2xl">
        {/* Header */}
        <div className="bg-[#1e2939] border-b border-[#364153] px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-[20px] text-white">{getTierName()}</h2>
          <button
            onClick={onForfeit}
            className="bg-[rgba(130,24,26,0.5)] border border-[#9f0712] text-[#ff6467] px-4 py-2 rounded-lg hover:bg-[rgba(130,24,26,0.7)] transition-colors"
          >
            Thoát (Chịu Thua)
          </button>
        </div>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={900}
            height={460}
            className="w-full cursor-pointer"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ backgroundColor: "#1e2939" }}
          />

          {/* Result Overlay */}
          <AnimatePresence>
            {matchResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/70 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="text-center"
                >
                  {matchResult === "win" ? (
                    <>
                      <div className="text-[100px] mb-4">🎉</div>
                      <h3 className="font-bold text-[60px] text-green-400">THẮNG!</h3>
                    </>
                  ) : (
                    <>
                      <div className="text-[100px] mb-4">😢</div>
                      <h3 className="font-bold text-[60px] text-red-400">THUA!</h3>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
