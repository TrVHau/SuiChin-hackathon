# 🎮 SuiChin - Game Búng Chun trên Sui Blockchain

<div align="center">

**Trò chơi búng chun Web3 kết hợp gameplay vật lý và NFT**

[![Sui Move](https://img.shields.io/badge/Sui-Move-blue)](https://sui.io)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6)](https://www.typescriptlang.org)

</div>

---

## 📖 Giới thiệu

**SuiChin** là game búng chun on-chain nơi người chơi:

- 🎯 Đấu với bot AI qua gameplay vật lý 2D
- 💰 Thu thập chun 3 tier (Đồng 🥉, Bạc 🥈, Vàng 🥇)
- 🎨 Mint NFT "Cuộn Chun" (transferable)
- 🏆 Nhận Achievement NFT (soulbound) khi đạt milestone streak

**Tech Stack**: Sui Move • React 18 • TypeScript • Vite • Tailwind CSS • Framer Motion

---

## ✨ Tính năng

### Core Gameplay

- **Physics-based**: Kéo thả búng chun với lực và góc tùy chỉnh
- **Bot AI**: 3 độ khó (Easy/Medium/Hard)
- **Betting System**: Stake chun trước mỗi trận
  - Thắng: +1 chun + streak +1
  - Thua: -1 chun + streak reset
- **Off-chain gameplay, on-chain results**

### Hệ thống Chun

| Tier    | Giá trị | Độ hiếm    |
| ------- | ------- | ---------- |
| 🥉 Đồng | 1 điểm  | Phổ biến   |
| 🥈 Bạc  | 2 điểm  | Trung bình |
| 🥇 Vàng | 3 điểm  | Hiếm       |

### NFT System

- **ChunRoll NFT** (Transferable): Craft bằng điểm, random tier
- **Achievement NFT** (Soulbound): 5 milestones (1, 5, 18, 36, 67 streak)

### Faucet

- Claim chun miễn phí mỗi 2 giờ
- Random tier, max 10 chun

---

## 🚀 Quick Start

### Yêu cầu

- Node.js >= 18
- npm hoặc pnpm

### Cài đặt

```bash
# Clone repo
git clone https://github.com/your-username/SuiChin-hackathon.git
cd SuiChin-hackathon/frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env với Package ID

# Run dev server
npm run dev
```

Mở browser: `http://localhost:5173`

### Build Production

```bash
npm run build
# Output: dist/
```

---

## 📁 Structure

```
SuiChin-hackathon/
├── contract/           # Sui Move Smart Contracts
│   ├── sources/
│   │   ├── player.move        # PlayerProfile
│   │   ├── game.move          # Game logic
│   │   ├── chun_roll.move     # ChunRoll NFT
│   │   └── achievement.move   # Achievement SBT
│   └── tests/
│
├── frontend/           # React App
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── hooks/            # useSuiProfile, etc.
│   │   ├── game/             # Game engine
│   │   └── lib/              # Sui transactions
│   └── public/
│
└── docs/               # Documentation
```

---

## 🔧 Smart Contracts

**Package ID (Testnet)**:

```
0x6f821d9c081a903fa0932b2872ed095ada4a13c1b53edf5d7855fed58d58317a
```

### Modules

**player.move** - PlayerProfile object

```move
- create_profile(clock)
- Lưu trữ: chun balance, streak, faucet cooldown, achievements
```

**game.move** - Game logic

```move
- record_session(...)     # Lưu kết quả session
- claim_faucet(...)       # Claim chun miễn phí
- craft_roll(...)         # Mint ChunRoll NFT
```

**chun_roll.move** - ChunRoll NFT (transferable)

**achievement.move** - Achievement NFT (soulbound)

### Build & Test

```bash
cd contract
sui move build
sui move test
sui client publish --gas-budget 100000000
```

---

## 🎮 How to Play

1. **Connect Wallet** → Sui Wallet, Suiet, hoặc Ethos
2. **Create Profile** → Tự động tạo khi login lần đầu
3. **Claim Faucet** → Nhận chun miễn phí
4. **Play Game**:
   - Chọn tier chun để stake
   - Búng chun đánh bot
   - Thắng = +chun +streak, Thua = -chun reset streak
5. **Mint NFT** → Dùng điểm craft ChunRoll
6. **Claim Achievement** → Nhận SBT khi đạt milestone

---

## 🛡️ Anti-cheat

- ✅ Session cooldown: 3 giây
- ✅ Max delta: 50 điểm/session
- ✅ Streak validation
- ✅ Owner verification

---

## 📚 Documentation

- [Báo cáo dự án](BAO_CAO.md) - Chi tiết kỹ thuật
- [Feature descriptions](docs/description.md)
- [Sequence diagrams](docs/sequence.md)
- [Sui Docs](https://docs.sui.io)

---

## 🤝 Contributing

Contributions welcome! Fork → Create branch → Commit → Push → Pull Request

---

## 📄 License

MIT License

---

<div align="center">

**Phát triển cho Sui Hackathon 2025**

Made with ❤️ on Sui Blockchain

</div>
