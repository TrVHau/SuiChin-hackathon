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
│  craft.move        marketplace.move         │
│  trade_up.move     achievement.move         │
│  cuon_chun.move    scrap.move               │
│                                             │
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

| Tầng              | Làm gì                                         | KHÔNG làm gì                   |
| ----------------- | ---------------------------------------------- | ------------------------------ |
| **Frontend Game** | Chạy gameplay, tính điểm, lưu chun raw         | Không verify gameplay on-chain |
| **Frontend Web3** | Build & sign transactions, query owned objects | Không giữ private key          |
| **Sui Move**      | Mint/burn NFT, escrow marketplace, RNG craft   | Không chạy game logic          |
| **localStorage**  | Lưu chun raw, streak theo địa chỉ ví           | Không lưu private key          |

**Điểm mấu chốt:** Blockchain không biết người chơi có bao nhiêu chun raw. Chain chỉ nhận lệnh "craft" kèm SUI và thực thi — hoàn toàn độc lập với gameplay.

---

## Luồng dữ liệu chính

### 1. Gameplay → Chun raw

```
Người chơi bắn chun  →  gameEngine tính kết quả  →  playerStore.addChun(delta)
                                                          │
                                                   localStorage update
                                                   playerState:<addr>.chun += delta
```

### 2. Craft NFT

```
FE check: player.chun >= 10 ?
    NO  → Nút Craft disabled
    YES → Người chơi ký tx
           ↓
    craft_chun(treasury, Coin<SUI> 0.1, clock)
           ↓
    Contract RNG:
      80% → mint Scrap   → transfer sender
      12% → mint Bronze  → transfer sender
       6% → mint Silver  → transfer sender
       2% → mint Gold    → transfer sender
           ↓
    Tx SUCCESS → playerStore.spendChun(10)
               → FE query owned objects → refresh inventory
               → check milestone → claimBadge nếu đạt
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
