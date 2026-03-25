import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Award,
  Package,
  ArrowUpCircle,
  ShoppingCart,
  Swords,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface Feature {
  id: string;
  emoji: string;
  icon: any;
  title: string;
  desc: string;
  borderClass: string;
  bgClass: string;
  route: string;
  rotate: number;
}

const features: Feature[] = [
  {
    id: "workshop",
    emoji: "🎨",
    icon: ImageIcon,
    title: "Craft Chun NFT",
    desc: "Dùng 10 Chun Raw + 0.1 SUI để craft Cuộn Chun NFT",
    borderClass: "border-playful-purple",
    bgClass: "bg-playful-purple",
    route: "/workshop",
    rotate: 2,
  },
  {
    id: "achievements",
    emoji: "🏆",
    icon: Award,
    title: "Thành Tích",
    desc: "Soulbound NFT danh hiệu",
    borderClass: "border-sunny-400",
    bgClass: "bg-sunny-400",
    route: "/achievements",
    rotate: -2,
  },
  {
    id: "inventory",
    emoji: "📦",
    icon: Package,
    title: "Inventory",
    desc: "Xem NFT Chun của bạn",
    borderClass: "border-playful-blue",
    bgClass: "bg-playful-blue",
    route: "/inventory",
    rotate: 1,
  },
  {
    id: "tradeup",
    emoji: "⬆️",
    icon: ArrowUpCircle,
    title: "Trade Up",
    desc: "Nâng cấp NFT Chun",
    borderClass: "border-playful-green",
    bgClass: "bg-playful-green",
    route: "/trade-up",
    rotate: -1,
  },
  {
    id: "marketplace",
    emoji: "🛒",
    icon: ShoppingCart,
    title: "Marketplace",
    desc: "Mua bán NFT Chun",
    borderClass: "border-playful-pink",
    bgClass: "bg-playful-pink",
    route: "/marketplace",
    rotate: 2,
  },
  {
    id: "pvp",
    emoji: "⚔️",
    icon: Swords,
    title: "PvP Arena",
    desc: "Đánh với người chơi khác để tranh phần thưởng",
    borderClass: "border-red-400",
    bgClass: "bg-red-500",
    route: "/pvp",
    rotate: -2,
  },
];

export function FeatureCards() {
  const navigate = useNavigate();

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <h2 className="font-display font-black text-4xl text-gray-900 mb-6">
        Tính năng khác
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.button
              key={feature.id}
              variants={item}
              onClick={() => navigate(feature.route)}
              whileHover={{ scale: 1.05, rotate: feature.rotate }}
              whileTap={{ scale: 0.95 }}
              className={`bg-white border-8 rounded-4xl p-8 text-left shadow-2xl group relative overflow-hidden ${feature.borderClass}`}
            >
              <div className="absolute top-4 right-4 text-6xl opacity-20 group-hover:scale-150 transition-transform">
                {feature.emoji}
              </div>
              <div className="relative z-10">
                <div className={`p-5 rounded-3xl mb-5 inline-block border-4 border-white shadow-lg text-white ${feature.bgClass}`}>
                  <Icon className="size-12" />
                </div>
                <h3 className="font-display font-black text-3xl text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-700 font-semibold text-lg">
                  {feature.desc}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
