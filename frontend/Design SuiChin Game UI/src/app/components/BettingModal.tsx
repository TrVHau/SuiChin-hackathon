import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface BettingModalProps {
  isOpen: boolean;
  tier: number;
  onClose: () => void;
  onConfirm: () => void;
}

export default function BettingModal({
  isOpen,
  tier,
  onClose,
  onConfirm,
}: BettingModalProps) {
  if (!isOpen) return null;

  const getTierName = (tierNum: number) => {
    switch (tierNum) {
      case 1:
        return "Đồng";
      case 2:
        return "Bạc";
      case 3:
        return "Vàng";
      default:
        return "Unknown";
    }
  };

  const getTierColor = (tierNum: number) => {
    switch (tierNum) {
      case 1:
        return "linear-gradient(150.484deg, rgb(255, 137, 4) 0%, rgb(255, 214, 167) 100%)";
      case 2:
        return "linear-gradient(150.484deg, rgb(153, 161, 175) 0%, rgb(229, 231, 235) 100%)";
      case 3:
        return "linear-gradient(150.484deg, rgb(253, 199, 0) 0%, rgb(254, 249, 194) 100%)";
      default:
        return "linear-gradient(150.484deg, rgb(153, 161, 175) 0%, rgb(229, 231, 235) 100%)";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header with gradient */}
            <div
              className="relative p-6 text-white"
              style={{ backgroundImage: getTierColor(tier) }}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X className="size-6" />
              </button>
              <h2 className="text-[28px] font-bold mb-2">Xác Nhận Đặt Cược</h2>
              <p className="text-white/90 text-[16px]">
                Tier {tier} - {getTierName(tier)}
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-gray-50 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600 font-medium">
                    Số Chun Đặt Cược:
                  </span>
                  <span className="text-[24px] font-bold text-gray-900">
                    1 Chun
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Độ Khó Bot:</span>
                  <span className="text-[18px] font-bold text-blue-600">
                    Trung Bình
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-4 mb-6 border-2 border-blue-100">
                <h3 className="font-bold text-[16px] text-blue-900 mb-2">
                  📜 Luật Chơi:
                </h3>
                <ul className="text-[14px] text-blue-800 space-y-1">
                  <li>
                    ✅ <strong>Thắng:</strong> +1 Chun, Streak +1
                  </li>
                  <li>
                    ❌ <strong>Thua:</strong> -1 Chun, Streak reset về 0
                  </li>
                  <li>
                    🎯 <strong>Mục tiêu:</strong> Đè chun của bạn lên chun bot!
                  </li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onClose}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 rounded-2xl transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={onConfirm}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all transform hover:scale-105"
                >
                  Xác Nhận
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
