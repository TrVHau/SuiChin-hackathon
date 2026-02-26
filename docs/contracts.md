# Smart Contracts

## Tổng quan module

```
contract/sources/
├── cuon_chun.move      # CuonChunNFT — NFT chính
├── scrap.move          # Scrap — byproduct thất bại
├── craft.move          # Craft + Treasury + AdminCap
├── trade_up.move       # Trade-up Bronze→Silver→Gold
├── marketplace.move    # Escrow marketplace
└── achievement.move    # Soulbound Achievement Badge
```

Package: `suichin`  
Edition: `2024.beta`

---

## Module: `cuon_chun`

### Struct

```move
// has key + store:
//   key   → là Sui object (có UID, có thể own)
//   store → có thể nằm trong struct khác (escrow) + pass qua vector<T>
public struct CuonChunNFT has key, store {
    id: UID,
    tier: u8,          // 1=Bronze, 2=Silver, 3=Gold
    name: String,
    image_url: String,
}
```

### Functions

| Function                       | Visibility        | Mô tả                                       |
| ------------------------------ | ----------------- | ------------------------------------------- |
| `mint(tier, ctx): CuonChunNFT` | `public(package)` | Mint NFT mới, chỉ gọi được từ trong package |
| `burn(nft)`                    | `public(package)` | Burn NFT, emit event                        |
| `tier(nft): u8`                | `public`          | Đọc tier                                    |
| `name(nft): String`            | `public`          | Đọc name                                    |
| `image_url(nft): String`       | `public`          | Đọc image URL                               |

### Events

```move
ChunNFTMinted { nft_id: ID, tier: u8, recipient: address }
ChunNFTBurned { nft_id: ID, tier: u8 }
```

### Display (wallet metadata)

| Key           | Value                                |
| ------------- | ------------------------------------ |
| `name`        | `{name}`                             |
| `image_url`   | `{image_url}`                        |
| `description` | `"Cuon Chun SuiChin - Tier: {tier}"` |
| `project_url` | GitHub repo                          |

---

## Module: `scrap`

### Struct

```move
// Byproduct khi craft/trade-up thất bại
// Transferable nhưng không list được trên Marketplace (UI enforce)
public struct Scrap has key, store {
    id: UID,
    name: String,
    image_url: String,
}
```

### Functions

| Function           | Visibility        | Mô tả      |
| ------------------ | ----------------- | ---------- |
| `mint(ctx): Scrap` | `public(package)` | Mint Scrap |
| `burn(scrap)`      | `public(package)` | Burn Scrap |

---

## Module: `craft`

### Shared objects (tạo khi `init`)

```move
// Treasury — lưu SUI thu từ phí craft
public struct Treasury has key {
    id: UID,
    balance: Balance<SUI>,
}

// AdminCap — cho phép rút tiền từ Treasury
public struct AdminCap has key, store {
    id: UID,
}
```

### Constants

```move
const CRAFT_FEE: u64 = 100_000_000; // 0.1 SUI = 100_000_000 MIST
```

### RNG logic

```
Roll 0–99:
  0–79  → Scrap   (80%)
 80–91  → Bronze  (12%)
 92–97  → Silver  ( 6%)
 98–99  → Gold    ( 2%)

Seed = clock_ms XOR (epoch × 1_000_003) XOR (address_bytes[:8])
```

> Pseudo-RNG đủ cho hackathon demo. Production nên dùng `sui::random` (on-chain VRF).

### Entry functions

```move
// Craft một CuonChunNFT. Tốn CRAFT_FEE SUI.
// Tiền thừa được trả lại sender.
public fun craft_chun(
    treasury: &mut Treasury,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
)

// Rút SUI từ Treasury. Chỉ AdminCap holder.
public fun withdraw(
    _cap: &AdminCap,
    treasury: &mut Treasury,
    amount: u64,
    ctx: &mut TxContext
)
```

### Events

```move
CraftResult {
    crafter: address,
    success: bool,
    tier: u8,      // 0 nếu Scrap
    roll: u64,     // raw roll 0–99
    fee_paid: u64,
}
```

---

## Module: `trade_up`

### Constants

```move
const BRONZE_INPUT: u64 = 8;          // cần 8 Bronze
const SILVER_INPUT: u64 = 6;          // cần 6 Silver
const BRONZE_TO_SILVER_RATE: u64 = 70; // 70% thành công
const SILVER_TO_GOLD_RATE:   u64 = 55; // 55% thành công
```

### Entry functions

```move
// Trade-up 8 Bronze → Silver (70%) hoặc Scrap (30%)
// Tất cả input bị burn dù thành công hay thất bại
public fun trade_up_bronze_to_silver(
    nfts: vector<CuonChunNFT>,  // require: len==8, tier==1
    clock: &Clock,
    ctx: &mut TxContext
)

// Trade-up 6 Silver → Gold (55%) hoặc Scrap (45%)
public fun trade_up_silver_to_gold(
    nfts: vector<CuonChunNFT>,  // require: len==6, tier==2
    clock: &Clock,
    ctx: &mut TxContext
)
```

### Events

```move
TradeUpResult {
    trader: address,
    from_tier: u8,
    to_tier: u8,   // 0 nếu fail
    success: bool,
    inputs_burned: u64,
    roll: u64,
}
```

### Error codes

| Code | Constant              | Nghĩa               |
| ---- | --------------------- | ------------------- |
| 200  | `E_WRONG_INPUT_COUNT` | Số NFT không đúng   |
| 201  | `E_WRONG_TIER`        | Tier NFT không khớp |

---

## Module: `marketplace`

### Thiết kế escrow

```
Market (shared object)
  ├── listings: Table<ID, ListingMeta>   ← metadata
  └── [dynamic_object_fields]
        └── nft_id → CuonChunNFT        ← NFT bị lock
```

Không dùng Listing làm shared object riêng vì **Sui không cho xóa shared object** — dẫn đến listing tích lũy vĩnh viễn.

### Structs

```move
public struct Market has key {
    id: UID,
    listings: Table<ID, ListingMeta>,
}

public struct ListingMeta has store {
    seller: address,
    price: u64,      // MIST (1 SUI = 1_000_000_000 MIST)
    tier: u8,        // để FE filter
    listed_at: u64,
}
```

### Entry functions

```move
// List NFT lên marketplace. NFT bị lock vào Market.
public fun list(
    market: &mut Market,
    nft: CuonChunNFT,
    price: u64,    // > 0
    clock: &Clock,
    ctx: &mut TxContext
)

// Mua NFT. Tiền thừa trả buyer.
public fun buy(
    market: &mut Market,
    listing_id: ID,
    payment: Coin<SUI>,  // >= price
    ctx: &mut TxContext
)

// Hủy listing. Chỉ seller.
public fun cancel(
    market: &mut Market,
    listing_id: ID,
    ctx: &mut TxContext
)
```

### Error codes

| Code | Constant                 | Nghĩa                     |
| ---- | ------------------------ | ------------------------- |
| 300  | `E_INSUFFICIENT_PAYMENT` | Tiền không đủ             |
| 301  | `E_NOT_SELLER`           | Không phải seller         |
| 302  | `E_CANNOT_BUY_OWN`       | Không tự mua NFT của mình |
| 303  | `E_ZERO_PRICE`           | Giá không được = 0        |
| 304  | `E_LISTING_NOT_FOUND`    | Listing không tồn tại     |

### Events

```move
Listed    { listing_id: ID, seller: address, tier: u8, price: u64 }
Sold      { listing_id: ID, buyer: address, seller: address, price: u64 }
Cancelled { listing_id: ID, seller: address }
```

---

## Module: `achievement`

### Struct

```move
// has key ONLY — không có store → SOULBOUND
// Người nhận không thể gọi transfer::public_transfer
// Chỉ module này mới gọi transfer::transfer được
public struct AchievementBadge has key {
    id: UID,
    badge_type: u64,    // milestone: 1 | 5 | 18 | 36 | 67
    name: String,
    description: String,
    image_url: String,
    earned_at: u64,
}
```

### Milestones

| badge_type | Tên                   | Điều kiện   |
| ---------- | --------------------- | ----------- |
| 1          | Người Mới Bắt Đầu     | Streak ≥ 1  |
| 5          | Người Chơi Xuất Sắc   | Streak ≥ 5  |
| 18         | Tay Chun Thiên Tài    | Streak ≥ 18 |
| 36         | Cao Thủ Búng Chun     | Streak ≥ 36 |
| 67         | Huyền Thoại Búng Chun | Streak ≥ 67 |

### Entry function

```move
// Mint AchievementBadge cho sender.
// Contract KHÔNG check duplicate — FE chịu trách nhiệm.
public fun claim_badge(
    badge_type: u64,  // phải là 1|5|18|36|67
    clock: &Clock,
    ctx: &mut TxContext
)
```

### Error codes

| Code | Nghĩa                                            |
| ---- | ------------------------------------------------ |
| 400  | `E_INVALID_BADGE_TYPE` — badge_type không hợp lệ |

---

## Tóm tắt shared objects sau deploy

| Object     | Module      | Ai cầm                              |
| ---------- | ----------- | ----------------------------------- |
| `Treasury` | craft       | Shared — mọi người gửi SUI vào      |
| `AdminCap` | craft       | Deployer giữ — dùng để rút Treasury |
| `Market`   | marketplace | Shared — mọi người list/buy         |
