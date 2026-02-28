# Lộ trình nâng cấp Frontend v2

> Cập nhật frontend từ v1 (prototype) lên v2 — tương thích đầy đủ với smart contract hiện tại.

---

## Tình trạng hiện tại (v1)

### Có gì rồi

- Login/Connect wallet (dapp-kit)
- Dashboard hiển thị profile
- GameSession (canvas bắn chun 2D, physics engine)
- MintScreen (craft cơ bản)
- AchievementScreen (badge gallery)
- FaucetScreen (testnet helper)
- SuiProvider (wallet provider)
- Game engine: physics, collision, renderer, bot-ai, drag input

### Vấn đề của v1

Frontend v1 được build cho **contract cũ** — giao diện gọi sai module/function:

| v1 Frontend gọi                                                 | Contract v2 thật sự                                                                                |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `player::create_profile`                                        | `player_profile::init_profile`                                                                     |
| `game::record_session(deltaTier1, deltaTier2, deltaTier3, ...)` | `player_profile::report_result(delta, is_win)`                                                     |
| `game::claim_faucet`                                            | _(không tồn tại trong contract v2)_                                                                |
| `game::craft_roll(useTier1, useTier2, useTier3)`                | `craft::craft_chun(profile, treasury, payment, clock)`                                             |
| Fields: `tier1, tier2, tier3, max_streak, current_streak`       | Fields: `chun_raw, wins, losses, streak, last_played_ms`                                           |
| Modules: `player`, `game`, `chun_roll`                          | Modules: `player_profile`, `craft`, `cuon_chun`, `scrap`, `trade_up`, `marketplace`, `achievement` |

### Tính năng thiếu hoàn toàn

- **Marketplace** (list / buy / cancel) — contract có nhưng FE chưa có
- **Trade-up** (Bronze→Silver, Silver→Gold) — contract có nhưng FE chưa có
- **Inventory** (xem NFT sở hữu, Scrap, filter theo tier) — chưa có
- **Craft v2** (dùng chun_raw on-chain + 0.1 SUI fee) — logic sai
- **Query owned objects** (CuonChunNFT, Scrap, AchievementBadge) — chưa có

---

## Lộ trình xây dựng

### Phase 0: Foundation — Cập nhật infrastructure (2-3 ngày)

> Không thay đổi UI, chỉ sửa lại "bộ não" kết nối blockchain.

#### 0.1 — Cập nhật `sui.config.ts`

```typescript
// MỚI — khớp với contract v2
export const SUI_CONFIG = {
  NETWORK: "testnet",
  PACKAGE_ID: "0x...", // từ output deploy
  MARKET_OBJECT_ID: "0x...", // Market shared object
  TREASURY_OBJECT_ID: "0x...", // Treasury shared object

  // Module types (để query owned objects)
  CUON_CHUN_TYPE: `${PACKAGE_ID}::cuon_chun::CuonChunNFT`,
  SCRAP_TYPE: `${PACKAGE_ID}::scrap::Scrap`,
  BADGE_TYPE: `${PACKAGE_ID}::achievement::AchievementBadge`,
  PROFILE_TYPE: `${PACKAGE_ID}::player_profile::PlayerProfile`,

  // Constants khớp contract
  CRAFT_CHUN_COST: 10,
  CRAFT_FEE_MIST: 100_000_000n, // 0.1 SUI
  BRONZE_TRADE_UP_COUNT: 8,
  SILVER_TRADE_UP_COUNT: 6,
  COOLDOWN_MS: 10_000,
  MAX_DELTA_CHUN: 20,
};
```

#### 0.2 — Viết lại `lib/sui-client.ts` (transaction builders)

Tạo lại toàn bộ transaction builders khớp contract v2:

```typescript
// player_profile
buildInitProfile()             // → player_profile::init_profile(ctx)
buildReportResult(profileId, delta, isWin)
                               // → player_profile::report_result(profile, delta, is_win, clock, ctx)

// craft
buildCraftChun(profileId, treasuryId, paymentCoinId)
                               // → craft::craft_chun(profile, treasury, payment, clock, ctx)

// trade_up
buildTradeUpBronzeToSilver(nftIds: string[])
                               // → trade_up::trade_up_bronze_to_silver(nfts, clock, ctx)
buildTradeUpSilverToGold(nftIds: string[])
                               // → trade_up::trade_up_silver_to_gold(nfts, clock, ctx)

// marketplace
buildListNFT(marketId, nftId, price)
                               // → marketplace::list(market, nft, price, clock, ctx)
buildBuyNFT(marketId, listingId, paymentCoinId)
                               // → marketplace::buy(market, listing_id, payment, ctx)
buildCancelListing(marketId, listingId)
                               // → marketplace::cancel(market, listing_id, ctx)

// achievement
buildClaimBadge(profileId, badgeType)
                               // → achievement::claim_badge(profile, badge_type, clock, ctx)
```

#### 0.3 — Viết lại `hooks/useSuiProfile.ts`

Cập nhật interface và query logic khớp contract v2:

```typescript
interface PlayerProfileData {
  objectId: string;
  owner: string;
  chun_raw: number; // thay thế tier1/tier2/tier3
  wins: number;
  losses: number;
  streak: number;
  last_played_ms: number;
}
```

#### 0.4 — Tạo hooks mới cho NFT queries

```typescript
// hooks/useOwnedNFTs.ts
// Query tất cả CuonChunNFT, Scrap, AchievementBadge của wallet
function useOwnedNFTs() → { cuonChuns: NFT[], scraps: Scrap[], badges: Badge[], loading, refetch }

// hooks/useMarketplace.ts
// Query active listings từ Market shared object
function useMarketplace() → { listings: Listing[], loading, refetch }
```

**Deliverables Phase 0:**

- [ ] `sui.config.ts` cập nhật đúng constants + object IDs
- [ ] `sui-client.ts` có đủ transaction builders cho 7 modules
- [ ] `useSuiProfile.ts` query đúng PlayerProfile v2
- [ ] `useOwnedNFTs.ts` query CuonChunNFT + Scrap + Badge
- [ ] `useMarketplace.ts` query listings

---

### Phase 1: Core Gameplay Flow (2-3 ngày)

> Sửa lại luồng chơi game → report kết quả on-chain đúng contract.

#### 1.1 — Sửa `GameSession.tsx`

**Hiện tại:** Gọi `recordSession(deltaTier1, deltaTier2, deltaTier3, ...)` — sai contract.

**Cần sửa:** Sau mỗi ván, gọi `report_result(profile, delta, is_win)`:

- Thắng: `delta = min(1 + streak, 20)`, `is_win = true`
- Thua: `delta = 1`, `is_win = false`

```
Kết thúc ván → tính kết quả → buildReportResult() → signAndExecute
            → onSuccess: refetch profile (chun_raw, streak đã cập nhật on-chain)
            → UI hiển thị: "+5 chun 🔥" hoặc "-1 chun 😢"
```

#### 1.2 — Sửa `Dashboard.tsx`

Hiển thị dữ liệu đúng từ PlayerProfile v2:

- **Chun raw:** `profile.chun_raw` (thay vì tier1/tier2/tier3)
- **Streak:** `profile.streak`
- **Wins / Losses:** `profile.wins` / `profile.losses`
- **Owned NFTs:** từ `useOwnedNFTs()` → đếm Bronze/Silver/Gold

#### 1.3 — Xóa FaucetScreen

Contract v2 không có `claim_faucet`. Chun kiếm được qua gameplay (`report_result`).

**Deliverables Phase 1:**

- [ ] GameSession gọi đúng `report_result`
- [ ] Dashboard hiển thị đúng chun_raw, wins, losses, streak
- [ ] Dashboard hiển thị số lượng NFT sở hữu (Bronze/Silver/Gold)
- [ ] Xóa hoặc disable FaucetScreen

---

### Phase 2: Workshop — Craft NFT (2-3 ngày)

> Xây dựng lại màn Craft khớp với `craft::craft_chun`.

#### 2.1 — Redesign `MintScreen.tsx` → `WorkshopScreen.tsx`

```
┌──────────────────────────────────────────────┐
│  🔨 Workshop                                 │
│                                              │
│  Chun raw: 37    [từ profile on-chain]       │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  CRAFT CUỘN CHUN                       │  │
│  │                                        │  │
│  │  Chi phí:                              │  │
│  │    • 10 chun raw  [on-chain]           │  │
│  │    • 0.1 SUI      [gas + fee]          │  │
│  │                                        │  │
│  │  Tỉ lệ:                               │  │
│  │    🥉 Bronze 12% │ 🥈 Silver 6%       │  │
│  │    🥇 Gold    2% │ 💀 Scrap  80%      │  │
│  │                                        │  │
│  │  [  🎲 CRAFT  ]                        │  │
│  │  (disabled nếu chun_raw < 10)          │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  📦 Kết quả gần đây:                        │
│  • Bronze! 🥉  (roll: 85)                   │
│  • Scrap 💀    (roll: 23)                    │
└──────────────────────────────────────────────┘
```

#### 2.2 — Logic craft

```typescript
async function handleCraft() {
  // 1. Check chun_raw >= 10 (from on-chain profile)
  // 2. Build tx: craft_chun(profile, treasury, coin<SUI> 0.1, clock)
  //    - Tự split 0.1 SUI từ gas coin
  // 3. Sign & execute
  // 4. Parse CraftResult event → show animation:
  //    - success: true → NFT tier reveal (spinning animation)
  //    - success: false → Scrap (consolation animation)
  // 5. Refetch profile + owned NFTs
}
```

#### 2.3 — Animation craft result

- Spinning card animation khi chờ kết quả
- Reveal: màu sắc theo tier (Bronze=nâu, Silver=bạc, Gold=vàng, Scrap=xám)
- Confetti cho Silver/Gold

**Deliverables Phase 2:**

- [ ] WorkshopScreen thay thế MintScreen
- [ ] Gọi đúng `craft::craft_chun` với profile + treasury + SUI payment
- [ ] Parse `CraftResult` event hiển thị kết quả
- [ ] Animation spinning + reveal
- [ ] Auto refetch profile + inventory sau craft

---

### Phase 3: Inventory Screen (2 ngày)

> Màn hình xem tất cả NFT và Scrap sở hữu.

#### 3.1 — Tạo `InventoryScreen.tsx`

```
┌──────────────────────────────────────────────┐
│  📦 Kho đồ                                  │
│                                              │
│  Filter: [All] [Bronze] [Silver] [Gold]      │
│                                              │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │ 🥉  │  │ 🥉  │  │ 🥈  │  │ 🥇  │        │
│  │Cuộn │  │Cuộn │  │Cuộn │  │Cuộn │        │
│  │Đồng │  │Đồng │  │Bạc  │  │Vàng │        │
│  │     │  │     │  │     │  │     │        │
│  │[List]│  │[List]│  │[List]│  │[List]│       │
│  └─────┘  └─────┘  └─────┘  └─────┘        │
│                                              │
│  ─── Mảnh vụn (Scrap) ───                   │
│  Scrap × 5                                   │
│                                              │
│  ─── Danh hiệu (Soulbound) ───              │
│  🥉 Người Mới Bắt Đầu                       │
│  🥈 Người Chơi Xuất Sắc                      │
└──────────────────────────────────────────────┘
```

#### 3.2 — Query owned objects

```typescript
// Dùng suiClient.getOwnedObjects với filter StructType
const cuonChuns = await queryOwned(CUON_CHUN_TYPE); // parse tier, name, image_url
const scraps = await queryOwned(SCRAP_TYPE);
const badges = await queryOwned(BADGE_TYPE); // parse badge_type, name, earned_at
```

#### 3.3 — NFT card component

Tạo reusable `NFTCard` component:

- Hiển thị ảnh NFT (từ `image_url`)
- Tier badge overlay (Bronze/Silver/Gold)
- Action buttons: [List on Market] / [Select for Trade-up]

**Deliverables Phase 3:**

- [ ] InventoryScreen với grid layout
- [ ] Filter theo tier
- [ ] NFTCard component (ảnh + tier + actions)
- [ ] Hiển thị Scrap riêng (không cho list)
- [ ] Hiển thị Achievement Badges (soulbound, không action)

---

### Phase 4: Trade-up (2-3 ngày)

> Đổi NFT tier thấp lấy tier cao hơn.

#### 4.1 — Tạo `TradeUpScreen.tsx`

```
┌──────────────────────────────────────────────┐
│  🔄 Trade-up                                 │
│                                              │
│  Tab: [Bronze → Silver]  [Silver → Gold]     │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  8 Bronze → 1 Silver (70%)             │  │
│  │                                        │  │
│  │  Chọn 8 Bronze NFT:                    │  │
│  │  [✅] Cuộn Đồng #1                     │  │
│  │  [✅] Cuộn Đồng #2                     │  │
│  │  [✅] Cuộn Đồng #3                     │  │
│  │  [ ] Cuộn Đồng #4                      │  │
│  │  ...                                   │  │
│  │                                        │  │
│  │  Đã chọn: 3/8                          │  │
│  │                                        │  │
│  │  ⚠️ TẤT CẢ input sẽ bị BURN            │  │
│  │  bất kể thành công hay thất bại!       │  │
│  │                                        │  │
│  │  [  🔄 TRADE UP  ]  (disabled nếu < 8) │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

#### 4.2 — Logic trade-up

```typescript
// Bronze → Silver
async function handleTradeUpBronze(selectedNftIds: string[]) {
  assert(selectedNftIds.length === 8);
  const tx = buildTradeUpBronzeToSilver(selectedNftIds);
  // signAndExecute → parse TradeUpResult event
  // success: true → "Nhận được Silver! 🥈"
  // success: false → "Nhận Scrap 😢 (8 Bronze đã burn)"
  // refetch inventory
}

// Silver → Gold
async function handleTradeUpSilver(selectedNftIds: string[]) {
  assert(selectedNftIds.length === 6);
  const tx = buildTradeUpSilverToGold(selectedNftIds);
  // tương tự...
}
```

#### 4.3 — UX quan trọng

- Hiển thị rõ **"NFT sẽ bị burn dù thành công hay thất bại"**
- Confirmation dialog trước khi trade-up
- Animation: NFTs rút vào lồng quay → reveal kết quả

**Deliverables Phase 4:**

- [ ] TradeUpScreen với 2 tabs (Bronze→Silver, Silver→Gold)
- [ ] Multi-select NFT từ inventory
- [ ] Confirm dialog cảnh báo burn
- [ ] Gọi đúng `trade_up_bronze_to_silver` / `trade_up_silver_to_gold`
- [ ] Parse `TradeUpResult` event
- [ ] Animation kết quả

---

### Phase 5: Marketplace (3-4 ngày) ⭐ Tính năng chính thiếu

> Mua bán NFT giữa người chơi bằng SUI.

#### 5.1 — Tạo `MarketplaceScreen.tsx`

```
┌──────────────────────────────────────────────────────┐
│  🏪 Marketplace                                      │
│                                                      │
│  Filter: [All] [Bronze] [Silver] [Gold]  [My Listings]│
│  Sort:   [Giá thấp→cao]  [Mới nhất]                  │
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │  🥈     │  │  🥉     │  │  🥇     │              │
│  │ Silver  │  │ Bronze  │  │  Gold   │              │
│  │         │  │         │  │         │              │
│  │ 0.5 SUI │  │ 0.1 SUI │  │ 2.0 SUI │              │
│  │ 0x1a..  │  │ 0x3f..  │  │ 0xb2..  │              │
│  │         │  │         │  │         │              │
│  │ [ BUY ] │  │ [ BUY ] │  │[CANCEL] │ ← my listing │
│  └─────────┘  └─────────┘  └─────────┘              │
│                                                      │
│  ─── List NFT của bạn ───                            │
│  [Chọn NFT từ Inventory] → [Đặt giá] → [LIST]       │
└──────────────────────────────────────────────────────┘
```

#### 5.2 — Query listings

Marketplace dùng `Table<ID, ListingMeta>` + `dynamic_object_field`. Cách query:

```typescript
// Option A: Query Market object → parse Table content
// Option B: Listen events (Listed, Sold, Cancelled) → build local state

// Cách đơn giản nhất cho hackathon:
// Query Market shared object, iterate Table entries
async function getActiveListings(marketId: string): Promise<Listing[]> {
  const market = await suiClient.getObject({
    id: marketId,
    options: { showContent: true },
  });
  // Parse market.listings table
  // Cho mỗi listing: lấy seller, price, tier, listed_at
}
```

**Lưu ý:** Sui Table không hỗ trợ iterate trực tiếp qua RPC. Cách giải quyết:

1. Dùng `suiClient.getDynamicFields(marketId)` để list tất cả dynamic fields
2. Mỗi dynamic field có `nft_id` → query metadata từ Table
3. Hoặc index events `Listed`, `Sold`, `Cancelled` từ contract

#### 5.3 — List NFT

```typescript
async function handleList(nftId: string, priceInSui: number) {
  const priceMist = BigInt(priceInSui * 1_000_000_000);
  const tx = buildListNFT(MARKET_ID, nftId, priceMist);
  // signAndExecute → NFT bị lock vào Market
  // refetch inventory + listings
}
```

#### 5.4 — Buy NFT

```typescript
async function handleBuy(listingId: string, priceMist: bigint) {
  const tx = buildBuyNFT(MARKET_ID, listingId, priceMist);
  // signAndExecute → NFT chuyển sang buyer, SUI chuyển sang seller
  // refetch listings + inventory
}
```

#### 5.5 — Cancel listing

```typescript
async function handleCancel(listingId: string) {
  const tx = buildCancelListing(MARKET_ID, listingId);
  // signAndExecute → NFT trả lại seller
  // refetch listings + inventory
}
```

#### 5.6 — UX Marketplace

- Buy: confirm dialog hiển thị giá SUI + seller address
- List: input giá (SUI) + preview NFT
- Cancel: confirm dialog
- Real-time update: refetch sau mỗi action
- Filter theo tier (Bronze/Silver/Gold)
- Tab "My Listings" để quản lý listings của mình

**Deliverables Phase 5:**

- [ ] MarketplaceScreen với grid layout
- [ ] Query active listings từ Market object
- [ ] Filter theo tier + sort theo giá/thời gian
- [ ] List NFT flow (chọn NFT → đặt giá → confirm → list)
- [ ] Buy NFT flow (xem listing → confirm giá → buy)
- [ ] Cancel listing flow (chỉ hiện nếu là seller)
- [ ] Tab "My Listings"

---

### Phase 6: Achievement v2 + Navigation (1-2 ngày)

> Polish achievements và thêm navigation chính thức.

#### 6.1 — Cập nhật `AchievementScreen.tsx`

- Query `AchievementBadge` objects từ wallet (thay vì field trong profile)
- Badge data: `badge_type`, `name`, `description`, `image_url`, `earned_at`
- Auto-detect eligible badges: so sánh `profile.streak` với milestones
- Claim button cho badges chưa có

#### 6.2 — Navigation system

Thêm navigation bar chính:

```
┌──────────────────────────────────────────┐
│  🎮 Play │ 🔨 Workshop │ 📦 Inventory │
│  🔄 Trade-up │ 🏪 Market │ 🏆 Badges  │
└──────────────────────────────────────────┘
```

Thay thế screen-based navigation hiện tại bằng tab bar / sidebar:

- Mobile: bottom tab bar (5 tabs chính)
- Desktop: sidebar hoặc top navigation

#### 6.3 — Cập nhật routing

```typescript
type Screen =
  | "login"
  | "dashboard" // overview + quick actions
  | "play" // game canvas
  | "workshop" // craft NFT
  | "inventory" // xem NFT/Scrap/Badge
  | "tradeup" // trade-up NFT
  | "marketplace" // mua bán
  | "achievements"; // badge gallery
```

**Deliverables Phase 6:**

- [ ] AchievementScreen query đúng AchievementBadge objects
- [ ] Navigation bar/tabs
- [ ] Routing đầy đủ cho tất cả screens

---

### Phase 7: Polish + UX (2-3 ngày)

> Làm đẹp, responsive, error handling.

#### 7.1 — Loading states

- Skeleton loading cho inventory grid
- Transaction pending spinner
- Optimistic UI updates

#### 7.2 — Error handling

- Transaction failure: hiển thị error code + message
- Network error: retry button
- Insufficient funds: hướng dẫn lấy testnet SUI
- Cooldown active: countdown timer

#### 7.3 — Responsive design

- Mobile-first (game canvas auto-resize)
- Touch-friendly buttons (minimum 44px tap target)
- Bottom sheet cho mobile dialogs

#### 7.4 — Toast notifications (sonner)

- Craft success/fail
- Trade-up result
- Listed on marketplace
- Purchase complete
- Badge claimed

#### 7.5 — Zustand store (state management)

```typescript
// Thay thế useState scattered → zustand centralized
interface GameStore {
  profile: PlayerProfileData | null;
  ownedNFTs: CuonChunNFT[];
  scraps: Scrap[];
  badges: AchievementBadge[];
  listings: Listing[];

  // Actions
  refreshProfile: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  refreshListings: () => Promise<void>;
}
```

**Deliverables Phase 7:**

- [ ] Loading states cho tất cả screens
- [ ] Error handling với user-friendly messages
- [ ] Responsive mobile + desktop
- [ ] Toast notifications cho tất cả actions
- [ ] Zustand store quản lý state tập trung

---

## Tổng kết timeline

| Phase | Tên                                      | Thời gian | Ưu tiên         |
| ----- | ---------------------------------------- | --------- | --------------- |
| 0     | Foundation (config, tx builders, hooks)  | 2-3 ngày  | 🔴 Bắt buộc     |
| 1     | Core Gameplay (report_result, dashboard) | 2-3 ngày  | 🔴 Bắt buộc     |
| 2     | Workshop (craft NFT)                     | 2-3 ngày  | 🔴 Bắt buộc     |
| 3     | Inventory (xem NFT)                      | 2 ngày    | 🔴 Bắt buộc     |
| 4     | Trade-up                                 | 2-3 ngày  | 🟡 Quan trọng   |
| 5     | Marketplace (list/buy/cancel)            | 3-4 ngày  | 🔴 Bắt buộc     |
| 6     | Achievement v2 + Navigation              | 1-2 ngày  | 🟡 Quan trọng   |
| 7     | Polish + UX                              | 2-3 ngày  | 🟢 Nice-to-have |

**Tổng ước tính: 16–23 ngày** (1 developer, full-time)

**Thứ tự ưu tiên nếu cần ship nhanh:**

1. Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 5 (core loop + marketplace)
2. Phase 4 + Phase 6 (trade-up + achievements)
3. Phase 7 (polish)

---

## File structure sau khi hoàn thành v2

```
frontend/src/
├── main.tsx
├── App.tsx                         # Router + navigation
├── config/
│   └── sui.config.ts               # ✏️ Cập nhật constants + IDs
├── lib/
│   └── sui-client.ts               # ✏️ Viết lại: tất cả tx builders
├── hooks/
│   ├── useSuiProfile.ts            # ✏️ Viết lại: query PlayerProfile v2
│   ├── useOwnedNFTs.ts             # 🆕 Query CuonChunNFT + Scrap + Badge
│   ├── useMarketplace.ts           # 🆕 Query listings
│   ├── useGameEngine.ts            # giữ nguyên
│   ├── useDragInput.ts             # giữ nguyên
│   └── useCanvasRenderer.ts        # giữ nguyên
├── stores/
│   └── gameStore.ts                # 🆕 Zustand centralized state
├── components/
│   ├── Header.tsx                  # ✏️ Thêm nav tabs
│   ├── LoginScreen.tsx             # giữ nguyên
│   ├── Dashboard.tsx               # ✏️ Hiển thị chun_raw + NFT count
│   ├── GameSession.tsx             # ✏️ Gọi đúng report_result
│   ├── WorkshopScreen.tsx          # 🆕 Thay MintScreen (craft v2)
│   ├── InventoryScreen.tsx         # 🆕
│   ├── TradeUpScreen.tsx           # 🆕
│   ├── MarketplaceScreen.tsx       # 🆕
│   ├── AchievementScreen.tsx       # ✏️ Query Badge objects
│   ├── NFTCard.tsx                 # 🆕 Reusable NFT display
│   ├── ListingCard.tsx             # 🆕 Marketplace listing card
│   └── ErrorBoundary.tsx           # giữ nguyên
├── game/                           # giữ nguyên (physics engine)
├── providers/
│   └── SuiProvider.tsx             # giữ nguyên
└── styles/
    └── index.css                   # ✏️ Thêm styles mới
```

Legend: ✏️ = sửa lại | 🆕 = tạo mới
