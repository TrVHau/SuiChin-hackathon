import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface MintCraftFormProps {
  craftCost: number;
  displayChunRaw: number;
  canCraft: boolean;
  crafting: boolean;
  treasuryConfigured: boolean;
  onCraft: () => void;
}

export default function MintCraftForm({
  craftCost,
  displayChunRaw,
  canCraft,
  crafting,
  treasuryConfigured,
  onCraft,
}: MintCraftFormProps) {
  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="bg-white rounded-4xl shadow-2xl p-8 border-8 border-playful-purple mb-6">
        <h2 className="font-display font-black text-2xl text-gray-900 mb-6">
          Craft Cuộn Chun NFT
        </h2>

        <div className="bg-sunny-50 border-4 border-sunny-300 rounded-3xl p-6 mb-6">
          <h3 className="font-bold text-gray-700 uppercase text-sm mb-4">Nguyên liệu</h3>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <img
                src="/img/chun_raw.jpg"
                alt="Chun Raw"
                className="size-14 rounded-2xl object-cover mx-auto mb-2 border-2 border-sunny-200"
              />
              <p className="font-black text-2xl text-playful-orange">{craftCost}</p>
              <p className="text-sm text-gray-500 font-semibold">Chun Raw</p>
            </div>
            <div className="text-3xl text-gray-400">+</div>
            <div className="text-center">
              <div className="text-5xl mb-2">💧</div>
              <p className="font-black text-2xl text-playful-blue">0.1</p>
              <p className="text-sm text-gray-500 font-semibold">SUI</p>
            </div>
            <div className="text-3xl text-gray-400">→</div>
            <div className="text-center">
              <img
                src="/nft/tier1_v1.png"
                alt="Tier 1 NFT"
                className="size-14 rounded-2xl object-cover mx-auto mb-2 border-2 border-playful-purple/30"
              />
              <p className="font-black text-2xl text-playful-purple">1</p>
              <p className="text-sm text-gray-500 font-semibold">NFT</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 border-4 border-gray-200 rounded-3xl p-5 mb-6">
          <span className="font-bold text-gray-700">Chun Raw hiện có:</span>
          <span
            className={`font-display font-black text-3xl ${canCraft ? "text-playful-green" : "text-red-500"}`}
          >
            {displayChunRaw}
            {!canCraft && displayChunRaw < craftCost && (
              <span className="text-sm font-semibold text-red-400 ml-2">
                (cần {craftCost - displayChunRaw} nữa)
              </span>
            )}
          </span>
        </div>

        {!treasuryConfigured && (
          <div className="bg-yellow-50 border-4 border-yellow-400 rounded-3xl p-4 mb-4">
            <p className="text-yellow-800 font-bold text-sm">
              ⚠️ VITE_TREASURY_OBJECT_ID chưa được cấu hình trong .env
            </p>
          </div>
        )}

        <motion.button
          onClick={onCraft}
          disabled={!canCraft || crafting}
          whileHover={canCraft && !crafting ? { scale: 1.05 } : {}}
          whileTap={canCraft && !crafting ? { scale: 0.95 } : {}}
          className={`w-full btn-playful text-2xl flex items-center justify-center gap-3 border-4 ${
            canCraft && !crafting
              ? "bg-gradient-to-r from-playful-purple to-playful-pink text-white border-white shadow-2xl"
              : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
          }`}
        >
          {crafting ? (
            <>
              <div className="size-6 border-4 border-white/40 border-t-white rounded-full animate-spin" />
              Đang craft...
            </>
          ) : (
            <>
              <Sparkles className="size-7" />
              CRAFT NFT
            </>
          )}
        </motion.button>
      </div>

      <div className="bg-white/70 rounded-3xl p-6 border-4 border-white">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span>📖</span> Cuộn Chun NFT là gì?
        </h3>
        <ul className="space-y-2 text-gray-600 font-semibold text-sm">
          <li>• NFT on-chain được mint từ Chun Raw kiếm qua gameplay</li>
          <li>• Có thể giao dịch trên Marketplace</li>
          <li>• Dùng để Trade-up lên tier cao hơn</li>
          <li>• Mỗi NFT là unique, có tier: Bronze / Silver / Gold</li>
        </ul>
      </div>
    </motion.div>
  );
}
