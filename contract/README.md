# SuiChin Smart Contracts

Smart contracts cho game búng chun Web3 trên Sui Blockchain.

## 📦 Modules

### 1. `player.move`

Quản lý PlayerProfile - trạng thái người chơi.

**Structs:**

- `PlayerProfile`: Lưu số chun (tier1/2/3), streak, faucet cooldown, achievements

**Functions:**

- `create_profile()`: Tạo profile mới
- `get_chun()`: Lấy số chun theo tier
- `calculate_total_points()`: Tính tổng điểm
- `has_achievement()`: Kiểm tra achievement

---

### 2. `game.move`

Logic game chính - record session, faucet, craft NFT.

**Functions:**

- `record_session()`: Lưu kết quả session sau khi chơi off-chain
- `claim_faucet()`: Xin chun miễn phí (số lượng theo thời gian)
- `craft_roll()`: Mint Cuộn Chun NFT

**Anti-cheat:**

- Max 50 điểm/session
- Cooldown 3 giây giữa các session
- Validate delta hợp lệ

---

### 3. `chun_roll.move`

ChunRoll NFT - Cuộn chun transferable.

**Structs:**

- `ChunRoll`: NFT có tier (1/2/3), name, description, image_url

**Features:**

- Display Protocol tích hợp
- 3 tiers: Đồng/Bạc/Vàng
- Transferable, có thể trade

**Functions:**

- `mint()`: Mint NFT mới (package-only)
- `burn()`: Burn NFT

---

### 4. `achievement.move`

Achievement NFT - Soulbound danh hiệu.

**Structs:**

- `Achievement`: Soulbound NFT (không có `store`)

**Milestones:**

- Streak 1: Người Mới Bắt Đầu
- Streak 5: Người Chơi Xuất Sắc
- Streak 18: Tay Chun Thiên Tài
- Streak 36: Cao Thủ Búng Chun
- Streak 67: Huyền Thoại Búng Chun

**Functions:**

- `claim_achievement()`: Claim danh hiệu khi đạt milestone

---

## 🚀 Build & Deploy

### Prerequisites

```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

### Build

```bash
cd contract
sui move build
```

### Test

```bash
sui move test
```

### Deploy to Testnet

```bash
sui client publish --gas-budget 100000000
```

### Deploy to Mainnet

```bash
sui client publish --gas-budget 100000000
```

---

## 📝 Contract Flow

### 1. Create Profile

```typescript
// User đăng nhập lần đầu
await signAndExecuteTransaction({
  transaction: {
    kind: "moveCall",
    data: {
      packageObjectId: PACKAGE_ID,
      module: "player",
      function: "create_profile",
      arguments: [CLOCK_ID],
    },
  },
});
```

### 2. Play Game (Off-chain) → Record Session (On-chain)

```typescript
// Sau khi chơi nhiều trận off-chain
await signAndExecuteTransaction({
  transaction: {
    kind: "moveCall",
    data: {
      packageObjectId: PACKAGE_ID,
      module: "game",
      function: "record_session",
      arguments: [
        profileObjectId,
        CLOCK_ID,
        deltaT1,
        deltaT2,
        deltaT3,
        isT1Positive,
        isT2Positive,
        isT3Positive,
        newMaxStreak,
        newCurrentStreak,
      ],
    },
  },
});
```

### 3. Claim Faucet

```typescript
await signAndExecuteTransaction({
  transaction: {
    kind: "moveCall",
    data: {
      packageObjectId: PACKAGE_ID,
      module: "game",
      function: "claim_faucet",
      arguments: [profileObjectId, CLOCK_ID],
    },
  },
});
```

### 4. Mint Cuộn Chun NFT

```typescript
await signAndExecuteTransaction({
  transaction: {
    kind: "moveCall",
    data: {
      packageObjectId: PACKAGE_ID,
      module: "game",
      function: "craft_roll",
      arguments: [profileObjectId, CLOCK_ID, useTier1, useTier2, useTier3],
    },
  },
});
```

### 5. Claim Achievement

```typescript
await signAndExecuteTransaction({
  transaction: {
    kind: "moveCall",
    data: {
      packageObjectId: PACKAGE_ID,
      module: "achievement",
      function: "claim_achievement",
      arguments: [profileObjectId, milestone],
    },
  },
});
```

---

## 🎨 NFT Display

### ChunRoll NFT

- ✅ Display Protocol enabled
- ✅ Hiển thị trong Sui Wallet
- ✅ Metadata: name, description, image_url, tier

### Achievement NFT

- ✅ Display Protocol enabled
- ✅ Soulbound (cannot transfer)
- ✅ Metadata: title, description, image_url, milestone

---

## 🔐 Security Features

### Anti-cheat

- Rate limiting: Max 50 điểm/session
- Cooldown: 3 giây giữa các session
- Validation: Kiểm tra delta hợp lệ, streak logic

### Faucet Protection

- Cooldown: 2 giờ minimum
- Max 10 chun per claim
- Time-based distribution

### Access Control

- `public(package)`: Chỉ modules trong package gọi được
- Owner validation: Chỉ owner profile mới update được

---

## 📊 Gas Estimates

| Function          | Estimated Gas | Note               |
| ----------------- | ------------- | ------------------ |
| create_profile    | ~0.001 SUI    | Một lần duy nhất   |
| record_session    | ~0.0005 SUI   | Mỗi session        |
| claim_faucet      | ~0.0005 SUI   | Mỗi 2 giờ          |
| craft_roll        | ~0.001 SUI    | Mint NFT           |
| claim_achievement | ~0.001 SUI    | Mint Soulbound NFT |

**Total cho 1 user mới (play 10 sessions):**

- Create profile: 0.001 SUI
- 10 sessions: 0.005 SUI
- 2 faucets: 0.001 SUI
- 1 NFT mint: 0.001 SUI
- **Total: ~0.008 SUI (~$0.01)**

---

## 🛠️ TODO

### Before Deploy

- [ ] Upload NFT images (ChunRoll tier 1/2/3)
- [ ] Upload Achievement images (5 milestones)
- [ ] Update image URLs in contracts
- [ ] Test all functions on testnet
- [ ] Audit smart contracts

### Post-Hackathon

- [ ] Implement backend validator
- [ ] VRF for better randomness
- [ ] Kiosk integration for marketplace
- [ ] Dynamic NFT metadata
- [ ] Staking system

---

## 📄 License

MIT
