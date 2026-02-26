# Frontend

## Stack

| Thư viện              | Vai trò                         |
| --------------------- | ------------------------------- |
| React 18 + TypeScript | UI framework                    |
| Vite                  | Build tool                      |
| Tailwind CSS          | Styling                         |
| HTML5 Canvas          | Game renderer                   |
| `@mysten/sui`         | Sui SDK (build, sign, query tx) |
| `@mysten/dapp-kit`    | Wallet connect, hooks           |

---

## Cấu trúc thư mục

```
frontend/src/
├── main.tsx                    # Entry point
├── App.tsx                     # Router, layout
├── env.d.ts
│
├── config/
│   └── sui.config.ts           # PACKAGE_ID, MARKET_ID, TREASURY_ID, ...
│
├── lib/
│   ├── playerStore.ts          # Off-chain state (chun, streak) theo địa chỉ ví
│   ├── gameEngine.ts           # Logic reward, streak calculation
│   └── suiTx.ts                # Wrapper tất cả on-chain transactions
│
├── game/
│   ├── engine.ts               # Game loop, state machine
│   ├── physics.ts              # Va chạm, lực, bounce
│   ├── renderer.ts             # Canvas draw calls
│   ├── bot-ai.ts               # Bot AI logic
│   └── types.ts                # GameState, Marble, Vec2, ...
│
├── hooks/
│   ├── useGameEngine.ts        # React hook wrap game loop
│   ├── useDragInput.ts         # Touch/mouse drag input
│   ├── useCanvasRenderer.ts    # Canvas ref + render cycle
│   └── useSuiProfile.ts        # Query owned NFTs, badges
│
├── components/
│   ├── Header.tsx              # Nav + wallet connect button
│   ├── LoginScreen.tsx         # Màn hình connect wallet
│   ├── Dashboard.tsx           # /play — game canvas chính
│   ├── GameSession.tsx         # Wrapper session gameplay
│   ├── GameCanvas.tsx          # Canvas component
│   ├── MintScreen.tsx          # /workshop — craft NFT
│   ├── AchievementScreen.tsx   # /achievements — badge gallery
│   ├── FaucetScreen.tsx        # (optional) testnet faucet helpers
│   └── ErrorBoundary.tsx
│
└── providers/
    └── SuiProvider.tsx         # @mysten/dapp-kit QueryClientProvider
```

---

## Ba module cốt lõi

### 1. `playerStore.ts`

Quản lý off-chain state của người chơi theo địa chỉ ví.

```typescript
interface PlayerState {
  chun: number;
  currentStreak: number;
  bestStreak: number;
}

const STORAGE_KEY = (addr: string) => `playerState:${addr}`;

// Load state khi connect ví
function getState(address: string): PlayerState;

// Cộng chun (sau khi thắng ván)
function addChun(address: string, amount: number): void;

// Trừ chun (sau khi craft thành công on-chain)
function spendChun(address: string, amount: number): void; // không về âm

// Cập nhật streak
function updateStreak(
  address: string,
  currentStreak: number,
  bestStreak: number,
): void;

// Reset state (debug / new wallet)
function resetState(address: string): void;
```

**Quan trọng:** `spendChun` chỉ được gọi **sau khi tx on-chain success** — tránh trừ oan khi tx fail.

---

### 2. `gameEngine.ts`

Tính toán kết quả ván chơi.

```typescript
interface RoundResult {
  playerWon: boolean;
  deltaChun: number; // số chun thay đổi (dương = cộng, âm = trừ)
  newCurrentStreak: number;
  newBestStreak: number;
  milestoneReached: number | null; // 1 | 5 | 18 | 36 | 67 | null
}

// Gọi sau mỗi ván kết thúc
function processRoundResult(
  playerWon: boolean,
  currentStreak: number,
  bestStreak: number,
): RoundResult;

// currentStreak thưởng thêm:
// Win: deltaChun = 1 + currentStreak (streak bonus)
// Lose: deltaChun = -1
```

---

### 3. `suiTx.ts`

Wrapper tất cả on-chain transactions. Dùng `@mysten/sui` Transaction builder.

```typescript
// === CRAFT ===
async function craftChun(
  treasuryId: string,
  walletAddress: string,
): Promise<TransactionResult>;
// Tự động tách 0.1 SUI từ gas coin của ví

// === TRADE-UP ===
async function tradeUpBronze(
  nftIds: string[], // phải đúng 8 Bronze NFT IDs
): Promise<TransactionResult>;

async function tradeUpSilver(
  nftIds: string[], // phải đúng 6 Silver NFT IDs
): Promise<TransactionResult>;

// === MARKETPLACE ===
async function listNFT(
  marketId: string,
  nftId: string,
  priceInMist: bigint,
): Promise<TransactionResult>;

async function buyNFT(
  marketId: string,
  listingId: string,
  priceInMist: bigint,
): Promise<TransactionResult>;

async function cancelListing(
  marketId: string,
  listingId: string,
): Promise<TransactionResult>;

// === ACHIEVEMENT ===
async function claimBadge(
  badgeType: number, // 1|5|18|36|67
): Promise<TransactionResult>;

// === QUERIES ===
async function getOwnedCuonChun(address: string): Promise<CuonChunNFT[]>;
async function getOwnedScrap(address: string): Promise<Scrap[]>;
async function getOwnedBadges(address: string): Promise<AchievementBadge[]>;
async function getActiveListings(marketId: string): Promise<Listing[]>;
```

---

## Cấu hình contract (`sui.config.ts`)

```typescript
export const SUI_CONFIG = {
  NETWORK: "testnet",
  PACKAGE_ID: "0x...", // sau khi publish
  MARKET_OBJECT_ID: "0x...", // Market shared object
  TREASURY_OBJECT_ID: "0x...", // Treasury shared object

  // Module types (để query owned objects)
  CUON_CHUN_TYPE: `${PACKAGE_ID}::cuon_chun::CuonChunNFT`,
  SCRAP_TYPE: `${PACKAGE_ID}::scrap::Scrap`,
  BADGE_TYPE: `${PACKAGE_ID}::achievement::AchievementBadge`,

  CRAFT_CHUN_COST: 10, // off-chain cost (chun raw)
  CRAFT_FEE_MIST: 100_000_000n, // 0.1 SUI
};
```

---

## UI Pages

### `/` — Login / Connect

- Nút "Kết nối ví Sui"
- Hiển thị địa chỉ ví sau khi connect
- Tự động load `playerState:<addr>` từ localStorage

---

### `/play` — Gameplay

- Canvas bắn chun (2D physics)
- **Header bar:** `Chun: 37 | Streak: 3 🔥`
- Sau mỗi ván: animation `+2 chun` hoặc `-1 chun`
- Khi đạt milestone: toast "Achievement unlocked! 🏆"

---

### `/workshop` — Craft NFT

```
┌─────────────────────────────────┐
│  Chun của bạn: 37               │
│                                 │
│  Chi phí:                       │
│    10 chun raw                  │
│    0.1 SUI                      │
│                                 │
│  Tỉ lệ:                         │
│    Bronze 12% | Silver 6%       │
│    Gold 2%    | Scrap 80%       │
│                                 │
│  [ CRAFT ]  ← disabled nếu < 10 │
└─────────────────────────────────┘
```

Sau khi craft: animation spinning + reveal kết quả (success/fail).

---

### `/tradeup` — Trade-up

- Chọn 8 Bronze hoặc 6 Silver từ inventory
- Hiển thị tỉ lệ thành công (70% / 55%)
- Confirm → nhận Silver/Gold hoặc Scrap
- Input NFT bị burn bất kể kết quả

---

### `/inventory` — Inventory

- Grid NFT chia theo tier: Bronze | Silver | Gold
- Mỗi NFT: ảnh PNG + tier badge + nút [List] / [Trade-up]
- Scrap: section riêng ở dưới cùng (không có nút List)
- Achievement Badges: section riêng "Danh hiệu" — full width, không transferable

---

### `/market` — Marketplace

- Browse tất cả listings, filter theo tier
- Mỗi listing: ảnh NFT + tier + giá SUI + seller address (rút gọn)
- Nút [Buy]: mở confirm dialog với giá bằng SUI
- NFT của mình: nút [Cancel] thay vì [Buy]
- Nút [List]: từ inventory có thể điều hướng sang

---

## Wallet Connect

Dùng `@mysten/dapp-kit`:

```tsx
// SuiProvider.tsx wrap toàn bộ app
<SuiClientProvider networks={{ testnet: { url: getFullnodeUrl("testnet") } }}>
  <WalletProvider>
    <App />
  </WalletProvider>
</SuiClientProvider>
```

Khi connect: lấy `currentAccount.address` → load playerState.  
Khi disconnect: clear active state nhưng không xóa localStorage.
