import { CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  ConnectButton,
  useConnectWallet,
  useCurrentAccount,
  useWallets,
} from "@mysten/dapp-kit";
import { isEnokiWallet } from "@mysten/enoki";
import { toast } from "sonner";
import { useLoginHandler } from "@/hooks/useLoginHandler";
import { useGame } from "@/providers/GameContext";
import {
  ENOKI_FACEBOOK_CLIENT_ID,
  ENOKI_GOOGLE_CLIENT_ID,
  ENOKI_PUBLIC_API_KEY,
  ENOKI_TWITCH_CLIENT_ID,
} from "@/config/sui.config";

export default function LoginScreen() {
  const account = useCurrentAccount();
  const { loading } = useGame();
  const { handleLogin } = useLoginHandler();
  const { mutate: connectWallet, isPending: connectingWallet } =
    useConnectWallet();
  const enokiWallets = useWallets().filter(isEnokiWallet);

  const socialLoginEnabled =
    Boolean(ENOKI_PUBLIC_API_KEY) &&
    Boolean(
      ENOKI_GOOGLE_CLIENT_ID ||
      ENOKI_FACEBOOK_CLIENT_ID ||
      ENOKI_TWITCH_CLIENT_ID,
    );

  const connectEnokiProvider = (provider: "google" | "facebook" | "twitch") => {
    const wallet = enokiWallets.find((item) => item.provider === provider);
    if (!wallet) {
      toast.error(
        "Nhà cung cấp này chưa sẵn sàng. Kiểm tra lại cấu hình Enoki.",
      );
      return;
    }

    connectWallet(
      { wallet },
      {
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Không thể đăng nhập social";
          toast.error(message);
        },
      },
    );
  };

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
          {!account ? (
            <div className="w-full flex flex-col gap-4">
              {socialLoginEnabled ? (
                <>
                  {ENOKI_GOOGLE_CLIENT_ID ? (
                    <button
                      type="button"
                      disabled={connectingWallet}
                      onClick={() => connectEnokiProvider("google")}
                      className="w-full h-14 rounded-full shadow-lg border-4 border-white bg-white text-gray-900 font-bold disabled:opacity-60"
                    >
                      {connectingWallet
                        ? "Đang mở Google..."
                        : "Đăng nhập với Google"}
                    </button>
                  ) : null}
                  {ENOKI_FACEBOOK_CLIENT_ID ? (
                    <button
                      type="button"
                      disabled={connectingWallet}
                      onClick={() => connectEnokiProvider("facebook")}
                      className="w-full h-14 rounded-full shadow-lg border-4 border-white bg-[#1877F2] text-white font-bold disabled:opacity-60"
                    >
                      {connectingWallet
                        ? "Đang mở Facebook..."
                        : "Đăng nhập với Facebook"}
                    </button>
                  ) : null}
                  {ENOKI_TWITCH_CLIENT_ID ? (
                    <button
                      type="button"
                      disabled={connectingWallet}
                      onClick={() => connectEnokiProvider("twitch")}
                      className="w-full h-14 rounded-full shadow-lg border-4 border-white bg-[#9146FF] text-white font-bold disabled:opacity-60"
                    >
                      {connectingWallet
                        ? "Đang mở Twitch..."
                        : "Đăng nhập với Twitch"}
                    </button>
                  ) : null}
                </>
              ) : null}

              <ConnectButton
                className="!w-full !h-20 !rounded-full !shadow-2xl !border-4 !border-white !bg-gradient-to-r !from-playful-blue !to-playful-purple"
                walletFilter={(wallet) => !isEnokiWallet(wallet)}
              />
            </div>
          ) : (
            <motion.button
              onClick={handleLogin}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading}
              className="bg-gradient-to-r from-playful-green to-sunny-500 h-20 rounded-full shadow-2xl w-full flex items-center justify-center gap-3 border-4 border-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="size-8 text-white drop-shadow animate-spin" />
              ) : (
                <CheckCircle className="size-8 text-white drop-shadow" />
              )}
              <span className="font-display font-bold text-2xl text-white drop-shadow">
                {loading ? "Đang xử lý..." : "Đăng nhập ngay!"}
              </span>
            </motion.button>
          )}

          <div className="bg-white border-4 border-playful-green rounded-3xl p-4 flex flex-col items-center justify-center gap-2 shadow-lg">
            <div className="flex items-center justify-center gap-3">
              <CheckCircle className="size-7 text-playful-green" />
              <p className="font-bold text-base text-gray-900">
                {account
                  ? `Đã kết nối: ${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                  : "Kết nối ví để bắt đầu!"}
              </p>
            </div>

            {account ? (
              <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center">
                <p className="text-xs font-bold text-gray-500">ID tài khoản</p>
                <p className="text-xs sm:text-sm font-mono text-gray-800 break-all select-all">
                  {account.address}
                </p>
              </div>
            ) : null}
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
            { emoji: "🎮", text: "Game đơn giản" },
            { emoji: "🔥", text: "Streak thưởng" },
            { emoji: "🎨", text: "NFT độc đáo" },
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
