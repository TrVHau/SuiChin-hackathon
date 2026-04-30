export const NETWORK = (import.meta.env.VITE_SUI_NETWORK || "devnet") as
  | "testnet"
  | "mainnet"
  | "devnet"
  | "localnet";

export const PACKAGE_ID =
  import.meta.env.VITE_SUI_PACKAGE_ID ||
  "0x54e6483d4622e18a2275088eed97debfa16c8837a7765e974cea4ef8b2ee04d3";
export const LOBBY_PACKAGE_ID =
  import.meta.env.VITE_LOBBY_PACKAGE_ID || PACKAGE_ID;
export const LOBBY_CONFIG_OBJECT_ID =
  import.meta.env.VITE_LOBBY_CONFIG_OBJECT_ID ||
  "0x2de7948800c6f46d0fbe3409bd034334b8b213cb68f98fcebc6fab637251cbc6";
export const LOBBY_SIGNER_PUBKEY =
  import.meta.env.VITE_LOBBY_SIGNER_PUBKEY ||
  "AM0K19eocENUQLaqfPXy5BCZ/+Iwki1bYo/6rwiDSX/X";
export const LOBBY_DEFAULT_TARGET_POINTS = Number(
  import.meta.env.VITE_LOBBY_DEFAULT_TARGET_POINTS || 1000,
);
export const LOBBY_DEFAULT_COIN_MIST = BigInt(
  import.meta.env.VITE_LOBBY_DEFAULT_COIN_MIST || "100000000",
);
export const MARKET_OBJECT_ID = import.meta.env.VITE_MARKET_OBJECT_ID || "";
export const TREASURY_OBJECT_ID = import.meta.env.VITE_TREASURY_OBJECT_ID || "";
export const CRAFT_CONFIG_OBJECT_ID =
  import.meta.env.VITE_CRAFT_CONFIG_OBJECT_ID ||
  "0x47c3853aa21c23efe2e2480d69b260bcbc170b947dcebdcb392ab3e87181ca0c";
export const RANDOM_OBJECT_ID = import.meta.env.VITE_RANDOM_OBJECT_ID || "0x8";
export const CLOCK_OBJECT_ID = "0x6";
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export const RPC_ENDPOINTS = {
  testnet: "https://fullnode.testnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
  localnet: "http://127.0.0.1:9000",
};

export const MODULES = {
  PLAYER_PROFILE: "player_profile",
  CRAFT: "craft",
  CUON_CHUN: "cuon_chun",
  SCRAP: "scrap",
  TRADE_UP: "trade_up",
  MARKETPLACE: "marketplace",
  ACHIEVEMENT: "achievement",
} as const;

export const CUON_CHUN_TYPE = `${PACKAGE_ID}::${MODULES.CUON_CHUN}::CuonChunNFT`;
export const SCRAP_TYPE = `${PACKAGE_ID}::${MODULES.SCRAP}::Scrap`;
export const BADGE_TYPE = `${PACKAGE_ID}::${MODULES.ACHIEVEMENT}::AchievementBadge`;
export const PLAYER_PROFILE_TYPE = `${PACKAGE_ID}::${MODULES.PLAYER_PROFILE}::PlayerProfile`;

export const CRAFT_CHUN_COST = 10;
export const CRAFT_POOL_CONTRIBUTION_MIST = 100_000_000n;
export const MAX_DELTA_CHUN = 20;
export const COOLDOWN_MS = 10_000;

// Must stay in sync with `player_profile.move` (FAUCET_COOLDOWN_MS = 7_200_000).
export const FAUCET_COOLDOWN_MS = 7_200_000;
export const FAUCET_MAX_STACK = 10;

export const HALVING_INTERVAL = 1_000;
export const COST_CHUN_BASE = 10;
export const COST_CHUN_MAX = 640;

export function computeCraftCost(totalCrafts: number): number {
  const steps = Math.floor(totalCrafts / HALVING_INTERVAL);
  return steps >= 6 ? COST_CHUN_MAX : COST_CHUN_BASE * Math.pow(2, steps);
}

export const BACKEND_WS_URL =
  import.meta.env.VITE_BACKEND_WS_URL ?? "http://localhost:4000/multiplayer";
export const BACKEND_REST_URL =
  import.meta.env.VITE_BACKEND_REST_URL ?? "http://localhost:4000";

export const ENOKI_PUBLIC_API_KEY =
  import.meta.env.VITE_ENOKI_PUBLIC_API_KEY ?? "";
export const ENOKI_GOOGLE_CLIENT_ID =
  import.meta.env.VITE_ENOKI_GOOGLE_CLIENT_ID ?? "";
export const ENOKI_FACEBOOK_CLIENT_ID =
  import.meta.env.VITE_ENOKI_FACEBOOK_CLIENT_ID ?? "";
export const ENOKI_TWITCH_CLIENT_ID =
  import.meta.env.VITE_ENOKI_TWITCH_CLIENT_ID ?? "";

export const ACHIEVEMENT_MILESTONES = {
  BEGINNER: 1,
  SKILLED: 5,
  EXPERT: 18,
  MASTER: 36,
  LEGEND: 67,
} as const;

export const TIER_NAMES: Record<number, string> = {
  1: "Dong",
  2: "Bac",
  3: "Vang",
};

export const TIER_COLORS: Record<number, string> = {
  1: "#CD7F32",
  2: "#C0C0C0",
  3: "#FFD700",
};
