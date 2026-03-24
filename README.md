# SuiChin

> **Game búng chun Web3 trên Sui Blockchain**  
> Chơi game → kiếm Chun Raw → craft NFT → trade-up → PvP → bán trên marketplace.

![Sui](https://img.shields.io/badge/Sui-Testnet-blue) ![Move](https://img.shields.io/badge/Sui_Move-2024-blueviolet) ![React](https://img.shields.io/badge/React-18-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

---

## Giới thiệu

SuiChin là game **bắn chun 2D** (marble flicking) có tích hợp blockchain. Gameplay chạy hoàn toàn off-chain (không tốn gas), còn quyền sở hữu tài sản và kinh tế game được đảm bảo bởi **Sui Blockchain**.

**Vòng lặp chính:**

```
Chơi game / Faucet  →  Chun Raw  →  Craft NFT  →  Trade-Up  →  Marketplace / PvP
```

- Không token riêng, không lợi nhuận hứa hẹn
- Blockchain làm đúng 1 việc: **chứng minh quyền sở hữu và thực thi giao dịch**

---

## Tính năng

| Tính năng             | Mô tả                                                                      |
| --------------------- | -------------------------------------------------------------------------- |
| **Game bắn chun**     | Physics-based marble game, đấu bot off-chain                               |
| **Faucet on-chain**   | Nhận 1 Chun Raw mỗi 2 giờ, stack tối đa 10                                 |
| **Craft NFT**         | Tiêu Chun Raw + SUI → Cuộn Chun NFT (Bronze / Silver / Gold)               |
| **Halving**           | Chi phí craft tăng theo cơ chế halving (×2 mỗi 1.000 craft, tối đa 640)    |
| **NFT Variants**      | Mỗi tier có nhiều skin: Bronze 4 skins, Silver 4 skins, Gold 3 skins       |
| **Trade-Up**          | Burn 8 Bronze → 70% Silver; Burn 6 Silver → 55% Gold                       |
| **Marketplace**       | Escrow on-chain, mua bán bằng SUI                                          |
| **PvP Matchmaking**   | Khoá Chun NFT, đấu realtime qua WebSocket, thắng nhận phần thưởng on-chain |
| **Achievement Badge** | Soulbound NFT mở khoá theo streak thắng                                    |

---

## Tài sản on-chain

| Tài sản              | Nơi lưu                            | Vai trò                            |
| -------------------- | ---------------------------------- | ---------------------------------- |
| **Chun Raw**         | `PlayerProfile` (per wallet)       | Nguyên liệu craft                  |
| **Cuộn Chun NFT**    | Sui owned object                   | Tài sản chính (3 tier, nhiều skin) |
| **Scrap**            | Sui owned object                   | Byproduct craft/trade-up thất bại  |
| **AchievementBadge** | Sui soulbound object               | Danh hiệu streak                   |
| **MatchOracle**      | Sui shared object (backend wallet) | Ký kết quả PvP on-chain            |

---

## Kinh tế học

### Nguồn tạo Chun Raw

- **Thắng ván** — `report_result()` cộng `1 + streak` chun (tối đa 20/ván, cooldown 10s)
- **Faucet** — `claim_faucet()` cộng 1 chun mỗi 2 giờ, stack tối đa 10

### Chi phí craft (Halving)

| Tổng craft    | Bước | Chi phí            |
| ------------- | ---- | ------------------ |
| 0 – 999       | 0    | 10 Chun Raw        |
| 1.000 – 1.999 | 1    | 20 Chun Raw        |
| 2.000 – 2.999 | 2    | 40 Chun Raw        |
| …             | …    | …                  |
| ≥ 6.000       | ≥ 6  | 640 Chun Raw (cap) |

> Phí SUI luôn cố định **0.1 SUI/lần** craft, vào Treasury admin có thể rút.

### Xác suất craft

| Kết quả    | Tỉ lệ |
| ---------- | ----- |
| Bronze NFT | ~12%  |
| Silver NFT | ~6%   |
| Gold NFT   | ~2%   |
| Scrap      | ~80%  |

### Trade-Up (sink NFT)

```
8 Bronze  →  70% Silver + 30% Scrap   (input luôn bị burn)
6 Silver  →  55% Gold   + 45% Scrap   (input luôn bị burn)
```

---

## Stack công nghệ

| Thành phần     | Công nghệ                             |
| -------------- | ------------------------------------- |
| Blockchain     | Sui Testnet                           |
| Smart Contract | Sui Move (edition 2024)               |
| Frontend       | React 18 + TypeScript + Vite          |
| Canvas Game    | HTML5 Canvas (physics engine tự viết) |
| Web3           | `@mysten/sui` SDK, `@mysten/dapp-kit` |
| Backend        | Node.js + Express + WebSocket (`ws`)  |
| Deploy Backend | Railway                               |

---

## Cấu trúc thư mục

```
SuiChin-hackathon/
├── contract/
│   ├── Move.toml
│   ├── sources/
│   │   ├── player_profile.move  # PlayerProfile, faucet, staking PvP
│   │   ├── cuon_chun.move       # NFT (3 tier, multi-skin variants)
│   │   ├── scrap.move           # Byproduct
│   │   ├── craft.move           # Craft, Treasury, halving cost
│   │   ├── trade_up.move        # Trade-up Bronze→Silver→Gold
│   │   ├── marketplace.move     # Escrow marketplace
│   │   └── achievement.move     # Soulbound streak badge
│   └── tests/                   # Unit tests cho từng module
├── frontend/
│   └── src/
│       ├── game/                # Physics engine, canvas renderer, bot AI
│       ├── components/          # UI screens (Dashboard, Mint, PvP, Marketplace…)
│       ├── hooks/               # useFaucet, usePvP, useOwnedNFTs, useSuiProfile…
│       ├── lib/sui-client.ts    # Transaction builders
│       ├── config/sui.config.ts # Package IDs, halving helpers, constants
│       └── providers/           # SuiProvider (dapp-kit)
├── backend/
│   └── src/
│       ├── index.ts             # Express + WebSocket server
│       ├── matchmaking.ts       # Queue & pairing logic
│       ├── room-manager.ts      # Game room state
│       ├── ws-handler.ts        # WebSocket message handler
│       ├── sui-client.ts        # Oracle keypair, resolve_match() call
│       ├── routes/game.ts       # REST: /craft-cost, /faucet-pending
│       └── types.ts             # Shared types
└── docs/                        # Tài liệu chi tiết
```

---

## Cài đặt & Chạy thử

### Yêu cầu

- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) ≥ 1.18
- Node.js ≥ 18
- Ví Sui (Slippi / Sui Wallet) có SUI testnet

### 1. Build & test contract

```bash
cd contract

# Build
sui move build

# Test
sui move test
```

### 2. Deploy lên Testnet

```bash
cd contract

sui client switch --env testnet
sui client publish --gas-budget 200000000
```

Sau khi publish, copy `PACKAGE_ID` và các object IDs vào `frontend/src/config/sui.config.ts` và `backend/.env`.

### 3. Chạy frontend

```bash
cd frontend

npm install
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173) và kết nối ví.

### 4. Chạy backend (PvP matchmaking)

```bash
cd backend

cp .env.example .env
# Điền PACKAGE_ID, MATCH_ORACLE_ID, ORACLE_PRIVATE_KEY vào .env

npm install
npm run dev
```

Backend chạy tại `http://localhost:4000`, WebSocket tại `ws://localhost:4000/ws`.

---

## Demo flow (5 phút)

1. **Connect ví** → tạo `PlayerProfile` on-chain
2. **Faucet** → nhận Chun Raw miễn phí (cooldown 2h, stack 10)
3. **Chơi ván** → thắng → +Chun Raw có streak bonus
4. **Workshop → Craft** (Chun Raw + 0.1 SUI) → ra Bronze NFT (hoặc Scrap)
5. **Craft đủ 8 Bronze → Trade-Up** → 70% nhận Silver NFT
6. **Marketplace → List** Silver với giá X SUI → ví khác Buy → SUI chuyển tay
7. **PvP** → lock NFT → đấu realtime → thắng nhận thưởng on-chain
8. Mở Sui Wallet → thấy **Cuộn Chun** hiển thị trong Collectibles

---

## Tài liệu

| File                                         | Nội dung                                    |
| -------------------------------------------- | ------------------------------------------- |
| [docs/architecture.md](docs/architecture.md) | Kiến trúc hệ thống, sơ đồ luồng             |
| [docs/gameplay.md](docs/gameplay.md)         | Cơ chế game, faucet, streak                 |
| [docs/contracts.md](docs/contracts.md)       | Smart contracts: structs, functions, events |
| [docs/economics.md](docs/economics.md)       | Halving, source/sink, rarity                |
| [docs/frontend.md](docs/frontend.md)         | Frontend modules, hooks, Web3 layer         |
| [docs/deployment.md](docs/deployment.md)     | Deploy contract, env config                 |

---

## License

MIT
