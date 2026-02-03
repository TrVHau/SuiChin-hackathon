import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  tier1: number;
  tier2: number;
  tier3: number;
  totalPoints: number;
  address: string;
  onLogout?: () => void;
}

export default function Header({ tier1, tier2, tier3, totalPoints, address, onLogout }: HeaderProps) {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b-8 border-sunny-300 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-sunny-400 to-playful-orange size-16 rounded-3xl shadow-lg border-4 border-white relative overflow-hidden flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-white/20"></div>
              <img src="/logo.png" alt="Logo" className="absolute inset-0 w-full h-full object-cover drop-shadow-lg" />
            </motion.div>
            <div>
              <h1 className="font-display font-black text-2xl text-gray-900">SuiChin</h1>
              <p className="text-sm text-gray-600 font-bold">{shortAddress}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            {/* Total Points */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-r from-playful-purple to-playful-pink px-5 py-3 rounded-full border-4 border-white shadow-lg"
            >
              <p className="text-xs text-white font-bold">Tổng điểm</p>
              <p className="font-display font-black text-2xl text-white">{totalPoints}</p>
            </motion.div>

            {/* Chun Inventory */}
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full border-4 border-sunny-300 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥉</span>
                <span className="font-display font-black text-lg text-gray-900">{tier1}</span>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥈</span>
                <span className="font-display font-black text-lg text-gray-900">{tier2}</span>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥇</span>
                <span className="font-display font-black text-lg text-gray-900">{tier3}</span>
              </div>
            </div>

            {/* Logout */}
            {onLogout && (
              <motion.button
                onClick={onLogout}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="bg-playful-pink hover:bg-red-500 p-4 rounded-full transition-colors border-4 border-white shadow-lg"
                title="Đăng xuất"
              >
                <LogOut className="size-6 text-white" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
