# Kiến trúc hệ thống

## Mô hình hybrid Off-chain / On-chain

```
┌─────────────────────────────────────────────┐
│              FRONTEND (Browser)             │
│                                             │
│  ┌──────────┐  ┌────────────┐  ┌─────────┐ │
│  │gameEngine│  │playerStore │  │  suiTx  │ │
│  │(physics) │  │(localStorage│  │(SDK tx) │ │
│  └──────────┘  └────────────┘  └────┬────┘ │
│       │               │             │      │
│   deltaChun      chun: number   sign tx    │
│       └───────────────┘             │      │
└─────────────────────────────────────┼──────┘
                                      │ Sui RPC
                                      ▼
┌─────────────────────────────────────────────┐
│           SUI BLOCKCHAIN (Move)             │
│                                             │
│  player_profile.move  craft.move            │
│  marketplace.move     trade_up.move         │
│  cuon_chun.move       achievement.move      │
│  scrap.move                                 │
│                                             │
│  Owned objects (per wallet):                │
│    PlayerProfile { chun_raw, wins, streak } │
│  Shared objects:                            │
│    Market { listings: Table, ofields }      │
│    Treasury { balance: Balance<SUI> }       │
└─────────────────────────────────────────────┘
                      │
              image_url points to
                      ▼
┌─────────────────────────────────────────────┐
│         STATIC ASSET HOSTING                │
│  /nft/bronze.png                            │
│  /nft/silver.png                            │
│  /nft/gold.png                              │
│  /nft/scrap.png                             │
│  /achievements/streak-{1,5,18,36,67}.png   │
└─────────────────────────────────────────────┘
```

---

## Nguyên tắc phân chia trách nhiệm

| Tầng              | Làm gì                                          | KHÔNG làm gì                       |
| ----------------- | ----------------------------------------------- | ---------------------------------- |
| **Frontend Game** | Chạy gameplay, tính điểm, gọi `report_result`   | Không verify gameplay on-chain     |
| **Frontend Web3** | Build & sign transactions, query owned objects  | Không giữ private key              |
| **Sui Move**      | Lưu `PlayerProfile`, mint/burn NFT, escrow, RNG | Không chạy game logic              |
| **localStorage**  | Cache UI state tạm thời (không critical)        | Không lưu chun raw hay private key |

**Điểm mấu chốt:** Mỗi ví có một `PlayerProfile` on-chain riêng lưu `chun_raw`, `wins`, `losses`, `streak`. Frontend chơi xong gọi `report_result()` để cập nhật — chain là **source of truth** cho chun raw. Để tránh spam, contract enforce cooldown 10 giây và giới hạn delta tối đa 20.

---

## Luồng dữ liệu chính

### 1. Gameplay → Chun raw

```
Người chơi bắn chun  →  gameEngine tính kết quả
                               │
                    FE gọi tx report_result(profile, deltaChun, is_win)
                               │
                    Contract kiểm tra:
                      • now - last_played_ms >= COOLDOWN_MS (10 000 ms)
                      • deltaChun trong 0..MAX_DELTA_CHUN (20)
                               │
                    profile.chun_raw += delta  (thắng)
                    profile.chun_raw -= 1      (thua, sàn 0)
                    profile.wins / losses / streak cập nhật on-chain
                    profile.last_played_ms = now
```

### 2. Craft NFT

```
FE check: profile.chun_raw >= COST_CHUN_PER_CRAFT (10) ?
    NO  → Nút Craft disabled
    YES → Người chơi ký tx
           ↓
    craft_chun(profile, treasury, Coin<SUI> 0.1, clock)
           ↓
    Contract: profile.chun_raw -= 10 (trừ trước khi RNG)
    Contract RNG:
      80% → mint Scrap   → transfer sender
      12% → mint Bronze  → transfer sender
       6% → mint Silver  → transfer sender
       2% → mint Gold    → transfer sender
           ↓
    Tx SUCCESS → FE query profile.chun_raw (đã trừ on-chain)
               → FE query owned objects → refresh inventory
               → FE check profile.streak / wins
               → claimBadge(profile, badge_type) nếu đạt milestone
```

### 3. Trade-up NFT

```
FE chọn 8 Bronze (hoặc 6 Silver)
  → FE build tx với vector<ObjectID>
  → trade_up_bronze_to_silver(nfts: vector<CuonChunNFT>, clock)
       ↓
  Contract:
    verify mỗi nft.tier == 1 (Bronze) và đủ số lượng
    burn tất cả input NFT
    roll RNG:
      70% → mint Silver → transfer sender
      30% → mint Scrap  → transfer sender
```

### 4. Marketplace

```
SELLER:
  Chọn NFT → list(market, nft, price, clock)
    → NFT lock vào Market (dynamic_object_field)
    → ListingMeta lưu vào Market.listings (Table)

BUYER:
  buy(market, listing_id, Coin<SUI>)
    → check payment >= price
    → NFT release từ Market → transfer buyer
    → SUI chính xác → transfer seller
    → tiền thừa → trả buyer
    → xóa metadata khỏi Table

SELLER cancel:
  cancel(market, listing_id)
    → assert sender == seller
    → NFT release → trả seller
    → xóa metadata
```

### 5. Achievement Badge

```
Off-chain: playerStore theo dõi currentStreak, bestStreak
Khi bestStreak đạt mốc {1, 5, 18, 36, 67}:
  FE query owned AchievementBadge của address
  Nếu CHƯA có badge type đó:
    → claim_badge(badge_type, clock)
    → Contract mint AchievementBadge (has key, NO store)
    → transfer::transfer → sender (soulbound — không thể re-transfer)
```

---

## On-chain Object Model

```
PlayerProfile (has key)  ← 1 object per wallet, tạo qua init_profile()
  id: UID
  owner: address
  chun_raw: u64
  wins: u64
  losses: u64
  streak: u64
  last_played_ms: u64   ← anti-spam cooldown

CuonChunNFT (has key, store)
  id: UID
  tier: u8          ← 1=Bronze 2=Silver 3=Gold
  name: String
  image_url: String

Scrap (has key, store)
  id: UID
  name: String
  image_url: String

AchievementBadge (has key)  ← NO store = soulbound
  id: UID
  badge_type: u64   ← 1|5|18|36|67
  name: String
  description: String
  image_url: String
  earned_at: u64

Market (shared, has key)
  id: UID
  listings: Table<ID, ListingMeta>
  [dynamic_object_fields: nft_id → CuonChunNFT]

Treasury (shared, has key)
  id: UID
  balance: Balance<SUI>

AdminCap (has key, store)
  id: UID
```

---

## Lý do thiết kế Marketplace dùng dynamic_object_field

Sui không cho phép **xóa shared object**. Nếu mỗi Listing là một shared object riêng:

- Sau `buy` hoặc `cancel`, Listing object vẫn tồn tại trên chain
- Accumulate vĩnh viễn → state pollution

**Giải pháp dùng trong dự án:**

- 1 Market shared object duy nhất
- NFT escrow bằng `dynamic_object_field::add(market.id, nft_id, nft)`
- Metadata lưu trong `Table<ID, ListingMeta>` bên trong Market
- Khi cancel/buy: `dynamic_object_field::remove` + `table::remove` → sạch hoàn toàn
