export const NETWORK = (import.meta.env.VITE_SUI_NETWORK || "testnet") as "testnet" | "mainnet" | "devnet" | "localnet";
export const PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID || "0x0";
export const CLOCK_ID = "0x6";
export const RPC_ENDPOINTS = {
  testnet: "https://fullnode.testnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
  localnet: "http://127.0.0.1:9000",
};

export const MODULES = {
  PLAYER: "player",
  GAME: "game",
  CHUN_ROLL: "chun_roll",
  ACHIEVEMENT: "achievement",
} as const;

export const ACHIEVEMENT_MILESTONES = {
  BEGINNER: 1,
  SKILLED: 5,
  EXPERT: 18,
  MASTER: 36,
  LEGEND: 67,
} as const;

export const TIER_NAMES = {
  1: "Đồng 🥉",
  2: "Bạc 🥈",
  3: "Vàng 🥇",
} as const;

export const TIER_POINTS = {
  1: 1,
  2: 2,
  3: 3,
} as const;
