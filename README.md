# SuiChin — Game Búng Chun trên Sui

SuiChin là một dự án Hackathon: trò chơi Web3 đơn giản chạy trên Sui Blockchain. Người chơi búng chun đấu với bot, tích chuỗi thắng (streak), thu thập "chun" theo 3 tier, mint Cuộn Chun NFT và nhận Achievement (Soulbound NFT) khi đạt milestone.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng chính](#tính-năng-chính)
- [Yêu cầu & Chuẩn bị](#yêu-cầu--chuẩn-bị)
- [Chạy nhanh (Quick Start)](#chạy-nhanh-quick-start)
- [Kiến trúc & Thư mục](#kiến-trúc--thư-mục)
- [Smart Contracts (Move)](#smart-contracts-move)
- [Kiểm thử](#kiểm-thử)
- [Triển khai & Gợi ý](#triển-khai--gợi-ý)
- [Đóng góp](#đóng-góp)
- [Liên hệ & License](#liên-hệ--license)

---

## Tổng quan

- Gameplay: phần xử lý vật lý (physics) diễn ra off-chain trên canvas; kết quả session được lưu on-chain bằng các Move calls.
- Assets trên chain:
  - `ChunRoll` — transferable NFT (tier 1/2/3)
  - `Achievement` — soulbound NFT (milestone theo streak)

## Tính năng chính

- Đăng nhập nhanh (zkLogin / ví Sui)
- Gameplay: búng chun vs bot (HTML5 Canvas)
- Hệ thống chun theo 3 tier (stake & reward)
- Faucet: xin chun miễn phí (cooldown, giới hạn)
- Mint Cuộn Chun NFT theo điểm
- Claim Achievement (Soulbound NFT) khi đạt milestone

## Yêu cầu & Chuẩn bị

- Node.js 18+ và `npm` hoặc `pnpm`
- (Để build/test/deploy contracts) Sui CLI cài đặt và cấu hình RPC/wallet

## Chạy nhanh (Quick Start)

1. Chạy frontend (dev):

```bash
cd frontend
npm install
npm run dev
```

Mở browser tại địa chỉ mà Vite báo (mặc định `http://localhost:5173`).

2. Build & test contracts (tùy chọn):

```bash
cd contract
sui move build
sui move test
# publish (testnet/mainnet):
sui client publish --gas-budget 100000000
```

> Lưu ý: các lệnh `sui` yêu cầu Sui CLI và thông tin ví/RPC đã cấu hình.

## Kiến trúc & Thư mục

- `contract/` — Move package, source, tests, `DEPLOYMENT.md`
- `frontend/` — React + TypeScript + Vite app (UI, game engine, hooks)
- `docs/` — mô tả, sequence diagrams

Vài file quan trọng:

- `contract/Move.toml` — package config
- `contract/sources/*.move` — module Move
- `frontend/src/App.tsx` — entry React
- `frontend/package.json` — scripts & deps

## Smart Contracts (Move)

Modules chính (tóm tắt):

- `player.move` — `PlayerProfile` (tier counts, streak, faucet cooldown, achievements)
- `game.move` — `record_session`, `claim_faucet`, `craft_roll`
- `chun_roll.move` — `ChunRoll` NFT (transferable)
- `achievement.move` — `Achievement` soulbound NFT

Entry functions ví dụ:

- `create_profile()` — tạo PlayerProfile
- `record_session(...)` — cập nhật delta sau session
- `claim_faucet()` — claim chun theo cooldown
- `craft_roll(use_t1,use_t2,use_t3)` — mint ChunRoll
- `claim_achievement(milestone)` — mint Achievement

Xem thêm: [contract/README.md](contract/README.md) và [docs/sequence.md](docs/sequence.md).

## Kiểm thử

- Contracts: `cd contract && sui move test`
- Frontend: dev server + kiểm tra manual. Có thể thêm unit/integration tests cho components khi cần.

## Triển khai & Gợi ý

1. Chuẩn bị ví và RPC cho Sui (testnet/mainnet).
2. Build và test Move package.
3. Publish Move package và cập nhật `Move.toml`/addresses nếu cần.
4. Build frontend (`npm run build`) và deploy lên Vercel/Netlify/GitHub Pages.

## Đóng góp

1. Fork repo → tạo branch `feature/...` hoặc `fix/...`.
2. Kiểm tra và chạy test liên quan.
3. Mở Pull Request mô tả rõ ràng thay đổi.

## Liên hệ & License

Nếu cần hỗ trợ, mở issue trong repo.

License: MIT

---

Ghi chú: nếu bạn muốn tôi soạn README tiếng Anh, chèn badges, logo/ảnh minh họa, hoặc viết hướng dẫn deploy chi tiết (kèm biến môi trường và ví dụ RPC), tôi sẽ cập nhật ngay theo yêu cầu.
