import { motion } from 'framer-motion';
import { Droplets } from 'lucide-react';
import { useFaucet } from '@/hooks/useFaucet';
import { FAUCET_COOLDOWN_MS, FAUCET_MAX_STACK } from '@/config/sui.config';

interface FaucetPanelProps {
  profileId: string;
  lastFaucetMs: number;
  onSuccess?: () => void;
}

export default function FaucetPanel({ profileId, lastFaucetMs, onSuccess }: FaucetPanelProps) {
  const { claimFaucet, pendingFaucet, claiming, faucetSupport } = useFaucet(profileId);
  const pending = pendingFaucet(lastFaucetMs);

  const nextMs = lastFaucetMs + FAUCET_COOLDOWN_MS;
  const remainingMin = Math.max(0, Math.ceil((nextMs - Date.now()) / 60_000));

  return (
    <div className="bg-white/80 border-4 border-playful-teal rounded-3xl p-5 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <Droplets className="size-6 text-playful-teal" />
        <h3 className="font-display font-black text-lg text-gray-900">Faucet Chun</h3>
        <span className="ml-auto text-xs font-bold text-gray-500">
          Stack: {Math.min(pending, FAUCET_MAX_STACK)} / {FAUCET_MAX_STACK}
        </span>
      </div>

      {/* Stack bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <motion.div
          className="bg-playful-teal h-3 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(Math.min(pending, FAUCET_MAX_STACK) / FAUCET_MAX_STACK) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {faucetSupport === "unsupported" ? (
        <p className="text-center text-sm text-amber-700 font-semibold">
          Faucet khong duoc ho tro tren package hien tai.
        </p>
      ) : pending > 0 ? (
        <motion.button
          onClick={() => claimFaucet(lastFaucetMs, onSuccess)}
          disabled={claiming}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          className="w-full py-3 rounded-2xl font-black text-white text-lg
                     bg-playful-teal hover:brightness-110 transition-all
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {claiming ? '⏳ Đang nhận...' : `Nhận ${pending} Chun 💧`}
        </motion.button>
      ) : (
        <p className="text-center text-sm text-gray-500 font-semibold">
          ⏰ Còn {remainingMin} phút để tích lũy thêm
        </p>
      )}
      <p className="text-center text-xs text-gray-400 mt-2">
        Mỗi 2 giờ = +1 Chun · tối đa {FAUCET_MAX_STACK}
      </p>
    </div>
  );
}
