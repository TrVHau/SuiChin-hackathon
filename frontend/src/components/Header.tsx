import { LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useDisconnectWallet } from "@mysten/dapp-kit";
import { toast } from "sonner";

interface HeaderProps {
  tier1?: number;
  tier2?: number;
  tier3?: number;
  totalPoints: number;
  suiBalanceMist?: number;
  address: string;
}

const NAV_ITEMS = [
  { path: "/session", label: "Chơi", emoji: "🎮" },
  { path: "/workshop", label: "Workshop", emoji: "⚒️" },
  { path: "/inventory", label: "Kho đồ", emoji: "📦" },
  { path: "/trade-up", label: "Trade-up", emoji: "🔄" },
  { path: "/marketplace", label: "Chợ", emoji: "🏪" },
  { path: "/achievements", label: "Thành tích", emoji: "🏆" },
];

export default function Header({
  tier1 = 0,
  tier2 = 0,
  tier3 = 0,
  totalPoints,
  suiBalanceMist = 0,
  address,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: disconnect } = useDisconnectWallet();

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const suiBalance = suiBalanceMist / 1_000_000_000;

  const handleLogout = () => {
    disconnect();
    toast.success("Đã đăng xuất");
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header className="bg-white/80 backdrop-blur-lg border-b-8 border-sunny-300 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-br from-sunny-400 to-playful-orange size-14 rounded-3xl shadow-lg border-4 border-white relative overflow-hidden flex items-center justify-center cursor-pointer"
                onClick={() => navigate("/dashboard")}
              >
                <div className="absolute inset-0 bg-white/20"></div>
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="absolute inset-0 w-full h-full object-cover drop-shadow-lg"
                />
              </motion.div>
              <div className="hidden sm:block">
                <h1 className="font-display font-black text-2xl text-gray-900">
                  SuiChin
                </h1>
                <p className="text-xs text-gray-600 font-bold">
                  {shortAddress}
                </p>
              </div>
            </div>

            {/* Desktop nav tabs */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                    location.pathname === item.path
                      ? "bg-sunny-400 text-white shadow-md border-2 border-sunny-500"
                      : "text-gray-700 hover:bg-sunny-100 border-2 border-transparent"
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </motion.button>
              ))}
            </nav>

            {/* Stats + Logout */}
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white px-4 py-2 rounded-full border-4 border-sky-300 shadow-lg"
              >
                <p className="text-xs text-gray-500 font-bold leading-none">
                  SUI hiện có
                </p>
                <p className="font-display font-black text-xl text-sky-700 leading-tight">
                  {suiBalance.toFixed(3)}
                </p>
              </motion.div>

              {/* Total Points */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-r from-playful-purple to-playful-pink px-4 py-2 rounded-full border-4 border-white shadow-lg"
              >
                <p className="text-xs text-white font-bold leading-none">
                  Chun
                </p>
                <p className="font-display font-black text-xl text-white leading-tight">
                  {totalPoints}
                </p>
              </motion.div>

              {/* Chun Inventory */}
              <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-full border-4 border-sunny-300 shadow-lg">
                <div className="flex items-center gap-1">
                  <span className="text-xl">🥉</span>
                  <span className="font-display font-black text-base text-gray-900">
                    {tier1}
                  </span>
                </div>
                <div className="w-px h-6 bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <span className="text-xl">🥈</span>
                  <span className="font-display font-black text-base text-gray-900">
                    {tier2}
                  </span>
                </div>
                <div className="w-px h-6 bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <span className="text-xl">🥇</span>
                  <span className="font-display font-black text-base text-gray-900">
                    {tier3}
                  </span>
                </div>
              </div>

              {/* Logout */}
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="bg-playful-pink hover:bg-red-500 p-3 rounded-full transition-colors border-4 border-white shadow-lg"
                title="Đăng xuất"
              >
                <LogOut className="size-5 text-white" />
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav - shown below header on small screens */}
      <nav className="lg:hidden bg-white border-b-4 border-sunny-300 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <div className="flex items-center gap-1 py-2">
            {NAV_ITEMS.map((item) => (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1 px-3 py-1 rounded-full font-bold text-xs whitespace-nowrap transition-colors ${
                  location.pathname === item.path
                    ? "bg-sunny-400 text-white shadow-md border-2 border-sunny-500"
                    : "text-gray-700 hover:bg-sunny-100 border-2 border-transparent"
                }`}
              >
                <span>{item.emoji}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
