import { Wallet, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-sunny-gradient">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full flex flex-col items-center gap-8"
      >
        {/* Playful Logo */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative"
        >
          <div className="bg-gradient-to-br from-sunny-300 to-playful-orange rounded-full shadow-2xl size-48 flex items-center justify-center relative overflow-hidden border-8 border-white">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
            
            <motion.img 
              src="/logo.png"
              alt="SuiChin Logo"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 w-full h-full object-cover drop-shadow-2xl"
            />
          </div>
          
          {/* Floating decorations */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-4 -right-4 text-5xl"
          >
            ⭐
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute -bottom-2 -left-4 text-4xl"
          >
            ✨
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h1 className="font-display font-black text-7xl text-gray-900 mb-3 drop-shadow-sm">
            SuiChin
          </h1>
          <p className="font-bold text-2xl text-gray-700">
            Búng chun, kiếm NFT! 
            <span className="inline-block emoji-bounce ml-2">🎮</span>
          </p>
        </motion.div>

        {/* Login Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full flex flex-col gap-5"
        >
          <motion.button
            onClick={onLogin}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-playful-blue to-playful-purple h-20 rounded-full shadow-2xl w-full flex items-center justify-center gap-3 border-4 border-white"
          >
            <Wallet className="size-8 text-white drop-shadow" />
            <span className="font-display font-bold text-2xl text-white drop-shadow">
              Đăng nhập với zkLogin
            </span>
          </motion.button>

          <div className="bg-white border-4 border-playful-green rounded-3xl p-4 flex items-center justify-center gap-3 shadow-lg">
            <CheckCircle className="size-7 text-playful-green" />
            <p className="font-bold text-base text-gray-900">
              Miễn phí gas 100%!
            </p>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-4 w-full mt-4"
        >
          {[
            { emoji: '🎮', text: 'Game đơn giản' },
            { emoji: '🔥', text: 'Streak thưởng' },
            { emoji: '🎨', text: 'NFT độc đáo' },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white/90 backdrop-blur border-4 border-sunny-400 rounded-3xl p-4 text-center shadow-lg"
            >
              <div className="text-4xl mb-2 emoji-bounce">{item.emoji}</div>
              <p className="text-xs font-bold text-gray-800">{item.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
