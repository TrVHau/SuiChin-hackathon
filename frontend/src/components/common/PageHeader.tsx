import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  onBack: () => void;
  title: string;
  emoji: string;
  backBorderClass: string;
  backIconClass: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}

export default function PageHeader({
  onBack,
  title,
  emoji,
  backBorderClass,
  backIconClass,
  subtitle,
  rightSlot,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-6">
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.1, rotate: -5 }}
          whileTap={{ scale: 0.9 }}
          className={`bg-white p-5 rounded-full shadow-2xl border-4 ${backBorderClass}`}
        >
          <ArrowLeft className={`size-7 ${backIconClass}`} />
        </motion.button>

        <div className="flex items-center gap-3">
          <span className="text-5xl">{emoji}</span>
          <div>
            <h1 className="font-display font-black text-4xl text-gray-900">{title}</h1>
            {subtitle && <p className="text-gray-600 font-semibold">{subtitle}</p>}
          </div>
        </div>
      </div>

      {rightSlot}
    </div>
  );
}
