# Hướng dẫn Deploy

## Yêu cầu

- Sui CLI ≥ 1.18
- Node.js ≥ 18
- Ví Sui có SUI testnet (để trả gas deploy)
- `sui move` build tools

---

## 1. Cài đặt và cấu hình Sui CLI

```bash
# Kiểm tra version
sui --version

# Cài đặt testnet
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet

# Lấy địa chỉ ví
sui client address

# Faucet testnet (nếu cần SUI)
sui client faucet
```

---

## 2. Build contract

```bash
cd contract/

# Build và kiểm tra lỗi
sui move build

# Chạy tests
sui move test
```

Output kỳ vọng:

```
INCLUDING DEPENDENCY Sui
INCLUDING DEPENDENCY MoveStdlib
BUILDING suichin
Running Move unit tests
Test result: OK. Total tests: XX; passed: XX; failed: 0
```

---

## 3. Deploy contract lên Testnet

```bash
cd contract/

sui client publish --gas-budget 200000000
```

Output trả về object IDs — cần lưu lại:

```
Transaction Digest: <TX_DIGEST>

╭─────────────────────────────────────────────────────────────╮
│ Object Changes                                              │
├─────────────────────────────────────────────────────────────┤
│ Created Objects:                                            │
│   PackageID: 0x<PACKAGE_ID>                                │
│   ObjectID: 0x<TREASURY_ID>  (suichin::craft::Treasury)    │
│   ObjectID: 0x<ADMIN_CAP_ID> (suichin::craft::AdminCap)    │
│   ObjectID: 0x<MARKET_ID>    (suichin::marketplace::Market) │
╰─────────────────────────────────────────────────────────────╯
```

> **Giữ ADMIN_CAP_ID bí mật** — đây là key để rút tiền từ Treasury.

---

## 4. Cấu hình Frontend

Tạo hoặc cập nhật `frontend/src/config/sui.config.ts`:

```typescript
export const SUI_CONFIG = {
  NETWORK: "testnet" as const,

  // Điền từ output deploy ở bước 3
  PACKAGE_ID: "0x<PACKAGE_ID>",
  MARKET_OBJECT_ID: "0x<MARKET_ID>",
  TREASURY_OBJECT_ID: "0x<TREASURY_ID>",

  // Base URL ảnh NFT (GitHub raw hoặc CDN)
  IMAGE_BASE_URL:
    "https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft",

  // Module types (tự động từ PACKAGE_ID)
  get CUON_CHUN_TYPE() {
    return `${this.PACKAGE_ID}::cuon_chun::CuonChunNFT`;
  },
  get SCRAP_TYPE() {
    return `${this.PACKAGE_ID}::scrap::Scrap`;
  },
  get BADGE_TYPE() {
    return `${this.PACKAGE_ID}::achievement::AchievementBadge`;
  },

  // Game constants (phải khớp với contract)
  CRAFT_CHUN_COST: 10,
  CRAFT_FEE_MIST: 100_000_000n, // 0.1 SUI
};
```

---

## 5. Chuẩn bị ảnh NFT

Đặt các file PNG vào `frontend/public/nft/`:

```
frontend/public/nft/
├── bronze.png          # Cuộn chun đồng
├── silver.png          # Cuộn chun bạc
├── gold.png            # Cuộn chun vàng
└── scrap.png           # Mảnh vụn

frontend/public/achievements/
├── streak-1.png        # Badge streak 1
├── streak-5.png        # Badge streak 5
├── streak-18.png       # Badge streak 18
├── streak-36.png       # Badge streak 36
└── streak-67.png       # Badge streak 67
```

---

## 6. Chạy Frontend

```bash
cd frontend/

# Cài dependencies
npm install

# Development
npm run dev
# → http://localhost:5173

# Production build
npm run build
npm run preview
```

---

## 7. Cập nhật image_url trong contract (nếu cần)

Các file `cuon_chun.move`, `scrap.move`, `achievement.move` hardcode URL ảnh dạng:

```move
string::utf8(b"https://raw.githubusercontent.com/.../nft/bronze.png")
```

Nếu host ảnh ở URL khác, sửa trước khi deploy lại.

---

## 8. Quản lý Treasury (Admin)

Kiểm tra số dư:

```bash
sui client object <TREASURY_ID>
```

Rút SUI từ Treasury (cần AdminCap):

```bash
# Hoặc gọi qua frontend với ví cầm AdminCap
sui client call \
  --package <PACKAGE_ID> \
  --module craft \
  --function withdraw \
  --args <ADMIN_CAP_ID> <TREASURY_ID> <AMOUNT_IN_MIST> \
  --gas-budget 10000000
```

---

## Checklist trước khi demo

- [ ] `sui move test` pass 100%
- [ ] Deploy thành công, có đủ 4 object IDs
- [ ] `sui.config.ts` điền đúng tất cả IDs
- [ ] Ảnh NFT đã upload và accessible qua URL
- [ ] Frontend build không lỗi
- [ ] Test flow: craft → trade-up → list → buy bằng 2 ví khác nhau
- [ ] Kiểm tra NFT hiển thị đẹp trong Sui Wallet (tab Collectibles)
