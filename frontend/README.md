# SuiChin Frontend V2

## 🎯 Giới thiệu

Frontend mới cho game SuiChin với giao diện được cải thiện, không có lỗi, và tuân thủ đúng thiết kế từ UI mockups.

## 🚀 Tính năng

- ✅ **Login Screen**: Đăng nhập với zkLogin, hiển thị logo và thông tin game
- ✅ **Dashboard**: Hiển thị thống kê người chơi, chun inventory, streak
- ✅ **Faucet**: Nhận chun miễn phí mỗi 2 giờ (tối đa 10)
- ✅ **Mint NFT**: Đổi điểm lấy Cuộn Chun NFT với xác suất dựa trên điểm
- ✅ **Achievements**: Claim Soulbound NFT khi đạt streak milestones
- ✅ **Game Session**: Chơi game búng chun, lưu kết quả lên blockchain

## 🛠️ Tech Stack

- **React 18** với TypeScript
- **Vite** - Build tool nhanh
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Zustand** - State management
- **Sonner** - Toast notifications
- **Lucide React** - Icons

## 📦 Cài đặt

```bash
cd frontend-v2
npm install
```

## 🏃 Chạy Development

```bash
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`

## 🏗️ Build Production

```bash
npm run build
npm run preview
```

## 📁 Cấu trúc thư mục

```
frontend-v2/
├── src/
│   ├── components/          # React components
│   │   ├── LoginScreen.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Header.tsx
│   │   ├── FaucetScreen.tsx
│   │   ├── MintScreen.tsx
│   │   ├── AchievementScreen.tsx
│   │   ├── GameSession.tsx
│   │   └── GameCanvas.tsx
│   ├── hooks/              # Custom hooks
│   │   └── useProfile.ts
│   ├── store/              # Zustand stores
│   │   └── profileStore.ts
│   ├── utils/              # Utility functions
│   │   └── helpers.ts
│   ├── styles/             # CSS files
│   │   └── index.css
│   ├── App.tsx             # Main app component
│   └── main.tsx           # Entry point
├── public/                 # Static assets
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🎨 Tính năng mới so với frontend cũ

1. **Cải thiện UI/UX**:
   - Animations mượt mà hơn với Framer Motion
   - Gradient backgrounds đẹp mắt
   - Toast notifications rõ ràng
   - Responsive design tốt hơn

2. **Code sạch hơn**:
   - TypeScript strict mode
   - Component separation tốt hơn
   - Custom hooks tái sử dụng
   - State management với Zustand

3. **Performance**:
   - Vite build nhanh hơn
   - Code splitting tự động
   - Optimized bundle size

4. **Gameplay**:
   - Canvas game engine đơn giản
   - Physics simulation cơ bản
   - Bot AI ngẫu nhiên

## 🔧 Cấu hình

Tất cả cấu hình được đặt trong:

- `vite.config.ts` - Vite settings
- `tailwind.config.js` - Tailwind CSS customization
- `tsconfig.json` - TypeScript settings

## 📝 Ghi chú

- Profile được lưu trong localStorage
- Mock login (không cần wallet thật để test)
- Game canvas sử dụng HTML5 Canvas API
- Tất cả transactions đều được simulate locally

## 🚧 Todo (Integration với Sui)

- [ ] Tích hợp @mysten/dapp-kit
- [ ] Kết nối zkLogin thật
- [ ] Gọi smart contract functions
- [ ] Sponsored transactions
- [ ] Display Protocol cho NFTs

## 📄 License

MIT
