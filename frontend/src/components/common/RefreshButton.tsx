import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
}

export default function RefreshButton({ onClick, loading = false }: RefreshButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="bg-white p-4 rounded-full shadow-xl border-4 border-gray-200 disabled:opacity-50"
    >
      <RefreshCw className={`size-6 text-gray-600 ${loading ? "animate-spin" : ""}`} />
    </motion.button>
  );
}
