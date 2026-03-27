import { useMemo } from "react";
import { motion } from "framer-motion";

const CONFETTI_COLORS = [
  "#FF6B6B",
  "#FFE66D",
  "#4ECDC4",
  "#A78BFA",
  "#34D399",
  "#F472B6",
  "#FCD34D",
  "#60A5FA",
];

interface ConfettiBurstProps {
  piecesCount?: number;
}

export default function ConfettiBurst({ piecesCount = 30 }: ConfettiBurstProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: piecesCount }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 700,
        y: -(Math.random() * 600 + 100),
        rotate: Math.random() * 720 - 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: Math.random() * 10 + 6,
        delay: Math.random() * 0.3,
      })),
    [piecesCount],
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4, rotate: p.rotate }}
          transition={{ duration: 1.4, ease: "easeOut", delay: p.delay }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "2px",
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}
