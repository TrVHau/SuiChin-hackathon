# SuiChin

> Game búng chun Web3 trên Sui, kết hợp gameplay off-chain với quyền sở hữu tài sản on-chain.

![Sui](https://img.shields.io/badge/Sui-Testnet-blue) ![Move](https://img.shields.io/badge/Sui_Move-2024-blueviolet) ![React](https://img.shields.io/badge/React-18-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

## Tổng quan

SuiChin là một game bắn chun 2D có tích hợp blockchain. Phần gameplay, UI, matchmaking và xử lý session diễn ra off-chain để phản hồi nhanh; phần tài sản, kinh tế game và xác thực giao dịch được quản lý bởi Sui Move.

Luồng chính của dự án:

```text
Chơi game / Faucet -> Chun Raw -> Craft NFT -> Trade-Up -> Marketplace / PvP -> Achievement
```

Các mảng chính trong repo hiện tại:

- Frontend React + TypeScript + Vite cho dashboard, workshop, inventory, trade-up, marketplace, PvP và achievements.
- Backend Node.js + Express cho challenge, matchmaking, indexer API, valuation room và websocket multiplayer.
- Smart contract Sui Move cho profile, craft, NFT, marketplace, achievement và lobby định giá NFT.

## Tính năng hiện có

| Tính năng           | Mô tả                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Game bắn chun       | Màn chơi off-chain, điều khiển qua React UI và game state riêng.                          |
| Chun Raw on-chain   | Lưu trong `PlayerProfile`, dùng cho craft và các luồng kinh tế.                           |
| Craft NFT           | Tiêu Chun Raw + SUI để mint `CuonChunNFT` hoặc Scrap.                                     |
| Trade-Up            | Nâng tier NFT bằng cách burn input và mint kết quả mới.                                   |
| Marketplace         | List, mua, hủy listing NFT qua escrow on-chain.                                           |
| PvP / Challenge     | Tạo challenge, ghép trận, xác nhận kết quả và finalize qua backend.                       |
| Achievement         | Mint badge theo milestone streak.                                                         |
| NFT Valuation Lobby | Cấu hình lobby, signer allowlist, settlement và refund khẩn cấp.                          |
| Indexer API         | Cung cấp leaderboard, profile summary, inventory, lịch sử craft/match, floor marketplace. |

## Kiến trúc ngắn gọn

| Khối            | Vai trò                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend        | Login, dashboard, workshop, inventory, trade-up, marketplace, PvP và achievements.                                                                              |
| Backend         | API challenge, matchmaking socket, indexer REST, room proof, settlement orchestration.                                                                          |
| Contract        | `player_profile`, `craft`, `craft_config`, `cuon_chun`, `scrap`, `trade_up`, `marketplace`, `achievement`, `nft_valuation_lobby`, `nft_valuation_lobby_config`. |
| Storage backend | Có thể chạy memory hoặc Prisma/Postgres tùy biến môi trường.                                                                                                    |
| Matchmaking     | Có thể chạy memory hoặc Redis.                                                                                                                                  |
| Chain adapter   | Có thể chạy mock hoặc `sui_cli`.                                                                                                                                |

## Kho contract Move

| Module                            | Mục đích                                                      |
| --------------------------------- | ------------------------------------------------------------- |
| `player_profile.move`             | Profile người chơi, Chun Raw, streak, faucet, PvP state.      |
| `craft.move`                      | Facade cho craft, treasury, config và recycle.                |
| `craft_treasury.move`             | Treasury, payout, redeem và cơ chế halving.                   |
| `craft_config.move`               | Cấu hình craft, recycle, pool contribution, pause và version. |
| `craft_actions.move`              | RNG, mint/burn, recycle và fuse logic.                        |
| `cuon_chun.move`                  | NFT chính của game.                                           |
| `scrap.move`                      | NFT phụ khi craft/trade-up thất bại.                          |
| `trade_up.move`                   | Burn input NFT và mint reward theo xác suất.                  |
| `marketplace.move`                | Escrow marketplace cho NFT.                                   |
| `achievement.move`                | Badge thành tích dạng soulbound NFT.                          |
| `nft_valuation_lobby_config.move` | Cấu hình lobby định giá NFT và signer allowlist.              |
| `nft_valuation_lobby.move`        | Tạo room, deposit, settle và refund NFT valuation lobby.      |

Tài liệu mô tả công dụng từng hàm: [docs/contract-functions.md](docs/contract-functions.md)

## Frontend

Các route chính của app:

- `/login`
- `/dashboard`
- `/workshop`
- `/inventory`
- `/trade-up`
- `/marketplace`
- `/pvp`
- `/session`
- `/achievements`

Cấu trúc chính ở `frontend/src/` gồm `pages/`, `components/`, `hooks/`, `providers/`, `stores/`, `game/` và `config/`.

Các biến cấu hình quan trọng trong frontend:

- `VITE_SUI_NETWORK`
- `VITE_SUI_PACKAGE_ID`
- `VITE_LOBBY_PACKAGE_ID`
- `VITE_LOBBY_CONFIG_OBJECT_ID`
- `VITE_MARKET_OBJECT_ID`
- `VITE_TREASURY_OBJECT_ID`
- `VITE_CRAFT_CONFIG_OBJECT_ID`
- `VITE_BACKEND_URL`
- `VITE_BACKEND_WS_URL`
- `VITE_BACKEND_REST_URL`

## Backend

Backend hiện dùng:

- Express cho REST API.
- Socket.IO cho multiplayer gateway.
- Indexer module cho leaderboard, profile summary, inventory summary, craft history, room proof, match history và marketplace floor.
- Challenge service cho create/accept/cancel/submit/finalize challenge.
- Valuation-room service cho trạng thái phòng định giá.
- Runtime dependency check và chain adapter để kiểm tra môi trường khi chạy.

Biến môi trường chính của backend:

- `PORT`
- `BACKEND_STORAGE` (`memory` hoặc `prisma`)
- `MATCHMAKING_BACKEND` (`memory` hoặc `redis`)
- `CHAIN_ADAPTER` (`mock` hoặc `sui_cli`)
- `DATABASE_URL`
- `REDIS_URL`
- `ORACLE_API_KEY`
- `SUI_NETWORK`
- `SUI_RPC_URL`
- `SUI_PACKAGE_ID`
- `SUI_MATCH_ORACLE_ID`
- `SUI_CLI_BIN`
- `SUI_CLI_CONFIG_PATH`
- `SUI_CLI_GAS_BUDGET`
- `SUI_ORACLE_SENDER`
- `ADMIN_SECRET_KEY`
- `LOBBY_PACKAGE_ID`
- `LOBBY_CONFIG_OBJECT_ID`
- `LOBBY_SIGNER_SECRET_KEY`
- `LOBBY_SETTLEMENT_TTL_MS`
- `LOBBY_EMERGENCY_REFUND_DELAY_MS`
- `PVP_QUEUE_TIMEOUT_MS`
- `PVP_LOCK_TIMEOUT_MS`
- `PVP_DISCONNECT_GRACE_MS`

## Chạy local

### Yêu cầu

- Node.js 22 cho backend.
- Node.js 18+ cho frontend.
- Sui CLI nếu muốn build hoặc publish contract.
- Postgres và Redis nếu dùng backend với `prisma` hoặc `redis`.

### 1. Contract

```bash
cd contract
sui move build
sui move test
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

Nếu cần Postgres/Redis local:

```bash
cd backend
npm run infra:up
```

REST chạy mặc định ở `http://localhost:4000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Mặc định frontend chạy ở `http://localhost:5173`.

## Contract publish

```bash
cd contract
sui client switch --env testnet
sui client publish --gas-budget 200000000
```

Sau khi publish, cập nhật các object ID và package ID tương ứng vào frontend/backend config.

## Tài liệu

| File                                                     | Nội dung                                          |
| -------------------------------------------------------- | ------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md)             | Kiến trúc hệ thống và luồng dữ liệu               |
| [docs/gameplay.md](docs/gameplay.md)                     | Cơ chế chơi game và kinh tế Chun Raw              |
| [docs/contracts.md](docs/contracts.md)                   | Tổng quan smart contract                          |
| [docs/contract-functions.md](docs/contract-functions.md) | Giải thích công dụng từng hàm trong contract Move |
| [docs/economics.md](docs/economics.md)                   | Kinh tế, halving, source/sink                     |
| [docs/frontend.md](docs/frontend.md)                     | Các phần của frontend                             |
| [docs/deployment.md](docs/deployment.md)                 | Build, publish và cấu hình deploy                 |

## Ghi chú

- README này đã được cập nhật theo cấu trúc hiện tại của repo sau lần pull gần nhất.
- Nếu bạn muốn, mình có thể tiếp tục làm một bản ngắn hơn, giống landing page hơn, hoặc làm thêm một sơ đồ luồng kiến trúc mới cho repo.

## License

MIT
