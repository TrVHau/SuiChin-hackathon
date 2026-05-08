import { CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ConnectButton,
  useConnectWallet,
  useCurrentAccount,
  useWallets,
} from "@mysten/dapp-kit";
import { EnokiClient, createDefaultEncryption, isEnokiWallet } from "@mysten/enoki";
import { createStore, get, set } from "idb-keyval";
import { toast } from "sonner";
import { useLoginHandler } from "@/hooks/useLoginHandler";
import { useGame } from "@/providers/GameContext";
import {
  ENOKI_FACEBOOK_CLIENT_ID,
  ENOKI_GOOGLE_CLIENT_ID,
  ENOKI_PUBLIC_API_KEY,
  ENOKI_TWITCH_CLIENT_ID,
  NETWORK,
} from "@/config/sui.config";

const ENOKI_CALLBACK_PROVIDER_KEY = "suichin:enoki-callback-provider";
const ENOKI_SESSION_KEY = "zklogin-session";
const ENOKI_STATE_KEY = "zklogin-state";

type SocialProvider = "google" | "facebook" | "twitch";

function getClientIdForProvider(provider: SocialProvider) {
  if (provider === "google") return ENOKI_GOOGLE_CLIENT_ID;
  if (provider === "facebook") return ENOKI_FACEBOOK_CLIENT_ID;
  return ENOKI_TWITCH_CLIENT_ID;
}

function inferProviderFromCallback(): SocialProvider {
  const hash = new URLSearchParams(
    window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash,
  );
  const issuer = hash.get("iss") ?? "";
  if (issuer.includes("facebook")) return "facebook";
  if (issuer.includes("twitch")) return "twitch";
  return "google";
}

async function persistEnokiCallbackSession() {
  const hash = new URLSearchParams(
    window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash,
  );
  const jwt = hash.get("id_token");
  if (!jwt) return;

  const provider = inferProviderFromCallback();
  const clientId = getClientIdForProvider(provider);
  if (!ENOKI_PUBLIC_API_KEY || !clientId) {
    throw new Error("Missing Enoki API key or OAuth client ID");
  }

  const enokiClient = new EnokiClient({ apiKey: ENOKI_PUBLIC_API_KEY });
  const { address, publicKey } = await enokiClient.getZkLogin({ jwt });
  const stateStore = createStore(`${ENOKI_PUBLIC_API_KEY}_${clientId}`, "enoki");
  await set(ENOKI_STATE_KEY, JSON.stringify({ address, publicKey }), stateStore);

  const sessionStore = createStore(
    `${ENOKI_PUBLIC_API_KEY}_${NETWORK}_${clientId}`,
    "enoki",
  );
  const encryptedSession = await get<string>(ENOKI_SESSION_KEY, sessionStore);
  if (!encryptedSession) {
    throw new Error("Missing Enoki session started before Google login");
  }

  const encryption = createDefaultEncryption();
  const session = JSON.parse(
    await encryption.decrypt(ENOKI_PUBLIC_API_KEY, encryptedSession),
  );
  await set(
    ENOKI_SESSION_KEY,
    await encryption.encrypt(
      ENOKI_PUBLIC_API_KEY,
      JSON.stringify({ ...session, jwt }),
    ),
    sessionStore,
  );

  window.localStorage.setItem(ENOKI_CALLBACK_PROVIDER_KEY, provider);
}

export default function LoginScreen() {
  const account = useCurrentAccount();
  const { loading } = useGame();
  const { handleLogin } = useLoginHandler();
  const { mutate: connectWallet, isPending: connectingWallet } =
    useConnectWallet();
  const [socialLoginPending, setSocialLoginPending] =
    useState<SocialProvider | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const enokiWallets = useWallets().filter(isEnokiWallet);
  const isEnokiCallbackWindow = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(
      window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash,
    );
    return (
      Boolean(window.opener) ||
      search.has("enoki-callback") ||
      hash.has("id_token") ||
      hash.has("iss")
    );
  }, []);

  const socialLoginEnabled =
    Boolean(ENOKI_PUBLIC_API_KEY) &&
    Boolean(
      ENOKI_GOOGLE_CLIENT_ID ||
      ENOKI_FACEBOOK_CLIENT_ID ||
      ENOKI_TWITCH_CLIENT_ID,
    );

  const connectEnokiProvider = (provider: SocialProvider) => {
    if (connectingWallet || socialLoginPending) {
      return;
    }

    const wallet = enokiWallets.find((item) => item.provider === provider);
    if (!wallet) {
      toast.error(
        "Nhà cung cấp này chưa sẵn sàng. Kiểm tra lại cấu hình Enoki.",
      );
      return;
    }

    setSocialLoginPending(provider);
    connectWallet(
      { wallet },
      {
        onSuccess: () => {
          setSocialLoginPending(null);
        },
        onError: (error) => {
          setSocialLoginPending(null);
          const message =
            error instanceof Error
              ? error.message
              : "Không thể đăng nhập social";
          toast.error(message);
        },
      },
    );
  };

  useEffect(() => {
    if (!isEnokiCallbackWindow) return;

    let disposed = false;
    const completeCallback = async () => {
      try {
        await persistEnokiCallbackSession();
        if (window.opener && !window.opener.closed) {
          window.opener.location.reload();
        }
        window.close();
      } catch (error) {
        if (!disposed) {
          setCallbackError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void completeCallback();
    return () => {
      disposed = true;
    };
  }, [isEnokiCallbackWindow]);

  useEffect(() => {
    if (isEnokiCallbackWindow || account || connectingWallet || socialLoginPending) {
      return;
    }

    const pendingProvider = window.localStorage.getItem(
      ENOKI_CALLBACK_PROVIDER_KEY,
    ) as SocialProvider | null;
    if (!pendingProvider) return;

    const wallet = enokiWallets.find((item) => item.provider === pendingProvider);
    if (!wallet) return;

    setSocialLoginPending(pendingProvider);
    connectWallet(
      { wallet, silent: true },
      {
        onSuccess: (result) => {
          setSocialLoginPending(null);
          if (result.accounts.length > 0) {
            window.localStorage.removeItem(ENOKI_CALLBACK_PROVIDER_KEY);
          }
        },
        onError: (error) => {
          setSocialLoginPending(null);
          window.localStorage.removeItem(ENOKI_CALLBACK_PROVIDER_KEY);
          toast.error(
            error instanceof Error
              ? error.message
              : "Khong the hoan tat dang nhap Enoki",
          );
        },
      },
    );
  }, [
    account,
    connectWallet,
    connectingWallet,
    enokiWallets,
    isEnokiCallbackWindow,
    socialLoginPending,
  ]);

  if (isEnokiCallbackWindow) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4 bg-sunny-gradient">
        <div className="w-full max-w-sm rounded-3xl border-4 border-white bg-white/90 p-8 text-center shadow-2xl">
          <Loader2 className="mx-auto mb-4 size-10 animate-spin text-playful-blue" />
          <h1 className="text-2xl font-black text-gray-900">
            Dang hoan tat dang nhap
          </h1>
          <p className="mt-3 text-sm font-semibold text-gray-600">
            {callbackError
              ? `Khong the hoan tat callback: ${callbackError}`
              : "Neu cua so nay khong tu dong dong, hay quay lai cua so SuiChin chinh."}
          </p>
        </div>
      </div>
    );
  }

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
                      disabled={connectingWallet || Boolean(socialLoginPending)}
                      onClick={() => connectEnokiProvider("google")}
                      className="w-full h-14 rounded-full shadow-lg border-4 border-white bg-white text-gray-900 font-bold disabled:opacity-60"
                    >
                      {socialLoginPending === "google"
                        ? "Đang mở Google..."
                        : "Đăng nhập với Google"}
                    </button>
                  ) : null}
                  {ENOKI_FACEBOOK_CLIENT_ID ? (
                    <button
                      type="button"
                      disabled={connectingWallet || Boolean(socialLoginPending)}
                      onClick={() => connectEnokiProvider("facebook")}
                      className="w-full h-14 rounded-full shadow-lg border-4 border-white bg-[#1877F2] text-white font-bold disabled:opacity-60"
                    >
                      {socialLoginPending === "facebook"
                        ? "Đang mở Facebook..."
                        : "Đăng nhập với Facebook"}
                    </button>
                  ) : null}
                  {ENOKI_TWITCH_CLIENT_ID ? (
                    <button
                      type="button"
                      disabled={connectingWallet || Boolean(socialLoginPending)}
                      onClick={() => connectEnokiProvider("twitch")}
                      className="w-full h-14 rounded-full shadow-lg border-4 border-white bg-[#9146FF] text-white font-bold disabled:opacity-60"
                    >
                      {socialLoginPending === "twitch"
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
