import { motion } from "framer-motion";
import { useFaucet } from "@/hooks/useFaucet";
import { FAUCET_COOLDOWN_MS, FAUCET_MAX_STACK } from "@/config/sui.config";

interface FaucetPanelProps {
  profileId: string;
  lastFaucetMs: number;
  onSuccess?: () => void;
}

export default function FaucetPanel({
  profileId,
  lastFaucetMs,
  onSuccess,
}: FaucetPanelProps) {
  const { claimFaucet, pendingFaucet, claiming, faucetSupport } = useFaucet(profileId);
  const pendingRaw = pendingFaucet(lastFaucetMs);
  const pending = Number.isFinite(pendingRaw) ? pendingRaw : 0;

  const nextMs = lastFaucetMs + FAUCET_COOLDOWN_MS;
  const remainingMin = Math.max(0, Math.ceil((nextMs - Date.now()) / 60_000));
  const clampedStack = Math.max(0, Math.min(pending, FAUCET_MAX_STACK));
  const rawProgress = FAUCET_MAX_STACK > 0 ? (clampedStack / FAUCET_MAX_STACK) * 100 : 0;
  const stackProgress = clampedStack > 0 ? Math.max(6, rawProgress) : 0;

  return (
    <div className="text-left">
      <div className="bg-playful-teal/10 p-3 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg">
        <img
          src="/img/chun_raw.jpg"
          alt="Chun Raw"
          className="size-16 rounded-2xl object-cover"
        />
      </div>

      <h3 className="font-display font-black text-3xl text-gray-900 mb-2">Faucet Chun</h3>
      <p className="text-gray-700 font-semibold text-lg mb-4">
        Moi 1 phut nhan duoc 1 Chun, toi da {FAUCET_MAX_STACK} stack.
      </p>

      <div className="mb-4">
        <div className="w-full rounded-full h-3 border border-gray-300 overflow-hidden bg-gray-200">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${stackProgress}%`,
              background: "linear-gradient(90deg, #14b8a6 0%, #22d3ee 100%)",
            }}
          />
        </div>
        <p className="mt-2 text-sm font-bold text-gray-500">
          Stack: {Math.min(pending, FAUCET_MAX_STACK)} / {FAUCET_MAX_STACK} ({Math.round(stackProgress)}%)
        </p>
      </div>

      <>
        <motion.button
          onClick={() => claimFaucet(lastFaucetMs, onSuccess)}
          disabled={claiming || pending <= 0 || faucetSupport === "unsupported"}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className="w-full py-3 rounded-2xl font-black text-black text-lg bg-yellow-300 border-4 border-amber-700 shadow-lg hover:bg-yellow-200 transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-400 disabled:opacity-100 disabled:cursor-not-allowed"
        >
          {claiming
            ? "Dang nhan..."
            : faucetSupport === "unsupported"
              ? "Faucet khong ho tro"
              : pending > 0
                ? `Nhan ${pending} Chun`
                : "Chua den luot claim"}
        </motion.button>
        {faucetSupport === "unsupported" && (
          <p className="text-sm text-amber-700 font-semibold mt-2">
            Package hien tai khong ho tro ham faucet.
          </p>
        )}
        {pending <= 0 && (
          <p className="text-sm text-gray-500 font-semibold mt-2">
            Con {remainingMin} phut de tich luy them.
          </p>
        )}
      </>
    </div>
  );
}
