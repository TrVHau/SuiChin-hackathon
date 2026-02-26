# SuiChin — Tổng quan dự án

> **Game búng chun Web3 trên Sui Blockchain**  
> Chơi game → kiếm nguyên liệu → craft NFT → mua bán trên marketplace.

---

## Mục tiêu

Chứng minh vòng lặp GameFi thực tế và đơn giản:

```
Chơi game  →  Kiếm chun raw  →  Craft Cuộn Chun NFT  →  Mua bán bằng SUI
```

Không token riêng, không lợi nhuận hứa hẹn, không PvP phức tạp.  
Blockchain chỉ làm đúng 1 việc: **chứng minh quyền sở hữu NFT và thực thi giao dịch**.

---

## Hai lớp tài sản

| Lớp       | Tên               | Nơi lưu                        | Vai trò                 |
| --------- | ----------------- | ------------------------------ | ----------------------- |
| Off-chain | **Chun raw**      | localStorage (theo địa chỉ ví) | Nguyên liệu gameplay    |
| On-chain  | **Cuộn Chun NFT** | Sui Blockchain                 | Sản phẩm có thể mua bán |

**Chun raw** là số nguyên đơn giản — người chơi kiếm được bằng cách thắng ván bắn chun, tiêu vào Workshop để craft NFT.

**Cuộn Chun NFT** là Sui object thật sự — có 3 tier (Bronze / Silver / Gold), hiển thị trong ví, mua bán bằng SUI testnet.

---

## Stack công nghệ

| Thành phần      | Công nghệ                         |
| --------------- | --------------------------------- |
| Blockchain      | Sui Testnet                       |
| Smart Contract  | Sui Move (edition 2024)           |
| Frontend        | React + TypeScript + Vite         |
| Canvas          | HTML5 Canvas                      |
| Web3            | `@mysten/sui` SDK, Sui Wallet     |
| State off-chain | localStorage                      |
| Ảnh NFT         | Static hosting (GitHub raw / CDN) |

---

## Cấu trúc thư mục

```
SuiChin-hackathon/
├── contract/
│   ├── Move.toml
│   └── sources/
│       ├── cuon_chun.move       # NFT chính (tier Bronze/Silver/Gold)
│       ├── scrap.move           # Byproduct thất bại
│       ├── craft.move           # Craft NFT, Treasury, AdminCap
│       ├── trade_up.move        # Trade-up Bronze→Silver→Gold
│       ├── marketplace.move     # Escrow + mua bán SUI
│       └── achievement.move     # Soulbound Badge (streak)
├── frontend/
│   ├── src/
│   │   ├── game/               # Canvas engine, physics
│   │   ├── lib/
│   │   │   ├── playerStore.ts  # Off-chain state theo địa chỉ ví
│   │   │   ├── gameEngine.ts   # Tính reward, streak
│   │   │   └── suiTx.ts        # Wrapper on-chain transactions
│   │   ├── components/         # UI pages
│   │   └── config/             # Contract IDs
│   └── public/nft/             # Ảnh PNG cho NFT
└── docs/                       # Tài liệu này
```

---

## Demo flow (3–5 phút)

1. Connect ví → thấy **Chun: 0**
2. Chơi vài ván → thắng → **Chun: +15**
3. Workshop → **Craft** (10 chun + 0.1 SUI) → nhận Scrap (xui) hoặc Bronze NFT
4. Craft thêm → có 8 Bronze → **Trade-up** → 70% ra Silver
5. **List** Silver lên Marketplace với giá X SUI
6. Ví khác **Buy** → SUI chuyển tay
7. Mở Sui Wallet → thấy **Cuộn Chun Bạc** hiển thị trong tab Collectibles

---

## Tài liệu chi tiết

| File                               | Nội dung                                     |
| ---------------------------------- | -------------------------------------------- |
| [architecture.md](architecture.md) | Kiến trúc hệ thống, sơ đồ luồng dữ liệu      |
| [gameplay.md](gameplay.md)         | Cơ chế chơi game, chun raw, streak           |
| [contracts.md](contracts.md)       | Smart contracts: structs, functions, events  |
| [frontend.md](frontend.md)         | Frontend modules, UI pages, Web3 layer       |
| [economics.md](economics.md)       | Kinh tế học: source/sink, rarity, market     |
| [deployment.md](deployment.md)     | Deploy contract, cấu hình env, chạy frontend |
