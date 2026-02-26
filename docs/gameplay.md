# Cơ chế Gameplay

## Tổng quan

SuiChin là game **bắn chun 2D** (marble flicking game) người chơi đấu với bot. Gameplay hoàn toàn **off-chain** — không tốn gas để chơi. Kết quả gameplay tích lũy thành **chun raw** (nguyên liệu), sau đó người chơi mang vào Workshop để craft NFT on-chain.

---

## Cơ chế bắn chun

### Màn hình

- Mặt phẳng 2D
- Chun của player và bot đặt đối diện
- Người chơi kéo-thả để búng chun (physics-based, drag input)

### Luân phiên

```
Player bắn → Bot bắn → Player bắn → ...
```

Chơi đến khi một bên thắng (chun đối phương bị đè).

### Kết quả một ván

| Kết quả   | Thay đổi                                                                                      |
| --------- | --------------------------------------------------------------------------------------------- |
| **Thắng** | `chun += (1 + currentStreak)`, `currentStreak++`                                              |
| **Thua**  | `chun -= 1` (không về âm), `bestStreak = max(bestStreak, currentStreak)`, `currentStreak = 0` |

> Streak thưởng thêm chun khi thắng liên tiếp — khuyến khích chơi dài.

---

## Chun raw — Off-chain state

### Lưu trữ

```typescript
// Key theo địa chỉ ví — mỗi ví có state độc lập
localStorage.setItem(
  `playerState:${walletAddress}`,
  JSON.stringify({
    chun: 12,
    currentStreak: 3,
    bestStreak: 7,
  }),
);
```

### Tại sao off-chain?

- Chơi mượt, không tốn gas cho mỗi ván
- Phù hợp phạm vi demo/hackathon
- Nếu production: có thể đưa lên chain (Coin type) hoặc backend verify

### Câu hỏi thường gặp

**"Người chơi có thể hack chun không?"**  
→ Demo scope: chun off-chain nên có thể tự sửa. Nếu production: backend verify hoặc ZK proof.  
→ Điều quan trọng hơn: NFT on-chain không thể giả mạo — dù có hack chun thì vẫn phải trả SUI để craft.

---

## Streak và Achievement

### Streak là gì?

`currentStreak` đếm số ván thắng liên tiếp, reset về 0 khi thua.  
`bestStreak` là kỷ lục cao nhất — dùng để unlock Achievement Badge.

### Milestone Achievement

| Streak | Badge | Tên danh hiệu         |
| ------ | ----- | --------------------- |
| 1      | 🥉    | Người Mới Bắt Đầu     |
| 5      | 🥈    | Người Chơi Xuất Sắc   |
| 18     | 🏆    | Tay Chun Thiên Tài    |
| 36     | ⭐    | Cao Thủ Búng Chun     |
| 67     | 💎    | Huyền Thoại Búng Chun |

Khi `bestStreak` đạt mốc mới, frontend tự động gọi `claim_badge()` on-chain.  
Badge là **Soulbound** — không thể chuyển nhượng, gắn vĩnh viễn với địa chỉ ví.

---

## Từ gameplay đến NFT — Vòng lặp đầy đủ

```
┌─────────────────────────────────────────────────────────┐
│                    GAMEPLAY LOOP                        │
│                                                         │
│  Chơi ván  →  Thắng  →  +chun (off-chain)              │
│      ↑           │                                      │
│      │           ↓                                      │
│  Bot AI    chun >= 10?                                  │
│                  │ YES                                   │
│                  ↓                                      │
│           Workshop: 10 chun + 0.1 SUI                   │
│                  │                                      │
│         ┌────────┴────────┐                             │
│       80% FAIL         20% SUCCESS                      │
│         │                 │                             │
│       Scrap          Bronze/Silver/Gold NFT             │
│         │                 │                             │
│         └────────┬────────┘                             │
│                  ▼                                      │
│           Inventory (ví Sui)                            │
│                  │                                      │
│         Trade-up (opcional)                             │
│         8 Bronze → 70% Silver                           │
│         6 Silver → 55% Gold                             │
│                  │                                      │
│           Marketplace                                   │
│         List → Buy → SUI                                │
└─────────────────────────────────────────────────────────┘
```

---

## Bot AI

Bot chơi theo thuật toán đơn giản (off-chain):

- Tính toán lực bắn dựa trên khoảng cách
- Có độ nhiễu ngẫu nhiên để tạo cảm giác thật
- Difficulty có thể điều chỉnh (không ảnh hưởng on-chain)

---

## Giới hạn anti-abuse (Demo scope)

| Cơ chế                      | Giá trị       | Mục đích                   |
| --------------------------- | ------------- | -------------------------- |
| Chun không về âm            | min = 0       | Tránh state âm             |
| SUI phí craft               | 0.1 SUI / lần | Cost-of-production thực    |
| Chỉ trừ chun sau tx success | —             | Tránh mất chun khi tx fail |
