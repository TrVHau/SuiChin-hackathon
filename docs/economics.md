# Kinh tế học trong game

## Tổng quan vòng lặp kinh tế

```
SOURCE (tạo ra)              SINK (tiêu hủy)
────────────────             ────────────────
Chun raw: gameplay thắng     Chun raw: craft (10/lần)
Bronze NFT: craft 12%        Bronze: trade-up (burn 8)
Silver NFT: craft 6% +       Silver: trade-up (burn 6)
            trade-up 70%     SUI: craft fee (0.1/lần)
Gold NFT: craft 2% +
          trade-up 55%
Scrap: craft/trade-up fail
AchievementBadge: streak
```

---

## Phân tích nguồn NFT

### Bronze

- Tạo ra: `craft_chun()` với xác suất 12%
- Tiêu vào: `trade_up_bronze_to_silver()` (đốt 8 Bronze)
- Giá trị tối thiểu = cost-of-production:
  - Trung bình cần ~8.3 lần craft để ra 1 Bronze
  - Chi phí: 8.3 × 0.1 SUI = **~0.83 SUI / Bronze**

### Silver

- Tạo ra 2 nguồn:
  1. `craft_chun()` xác suất 6% → trung bình 16.7 lần craft = **~1.67 SUI**
  2. `trade_up_bronze_to_silver()` 70% → cần ít nhất 8 Bronze ≈ **~6.6 SUI** (tùy thị trường Bronze)
- Tổng supply Silver thấp hơn Bronze đáng kể → rarer → giá cao hơn

### Gold

- Tạo ra 2 nguồn:
  1. `craft_chun()` xác suất 2% → trung bình 50 lần = **~5 SUI**
  2. `trade_up_silver_to_gold()` 55% → cần 6 Silver → tốn nhiều nhất
- Gold là rarest → highest value → thị trường tự định giá

---

## Cơ chế chống lạm phát

### Trade-up là NFT sink

```
8 Bronze → burn 8 Bronze → 70% Silver + 30% Scrap
6 Silver → burn 6 Silver → 55% Gold   + 45% Scrap
```

- Input luôn bị burn **bất kể kết quả**
- 1 Silver từ trade-up = tiêu hủy 8 Bronze
- 1 Gold từ trade-up = tiêu hủy 6 Silver = tiêu hủy 48 Bronze

→ **Tạo áp lực giảm supply NFT tier thấp** khi người chơi muốn tier cao.

### Craft fee tạo giá trị thực

Mỗi lần craft tốn 0.1 SUI thực sự. Player không thể spam craft miễn phí.  
Dù thất bại (80%), vẫn mất SUI → **Bronze/Silver/Gold có cost-of-production thực**.

---

## Scrap — "Fail không mất trắng"

Scrap là consolation prize:

- Luôn nhận được khi fail craft/trade-up
- Transferable — có thể tặng hoặc bán
- Not listable on Marketplace (UI enforce) → không có giá thị trường chính thức
- **Roadmap:** Tái craft nhiều Scrap → giảm phí hoặc reroll

Mục đích tâm lý: giảm frustration khi fail. Người chơi cảm thấy "không mất trắng" → tiếp tục vòng lặp.

---

## Marketplace dynamics

### Ai list NFT?

- Người chơi muốn đổi NFT lấy SUI (profit)
- Người chơi dư Bronze muốn bán rẻ thay vì trade-up (risk averse)

### Ai mua NFT?

- Muốn shortcut: mua Bronze/Silver thay vì craft nhiều lần
- Muốn Gold nhanh: mua Silver để trade-up
- Collector: thu thập Achievement NFT (không apply ở đây vì badge soulbound)

### Giá được xác định thế nào?

Hoàn toàn **player-to-player**. Không có giá sàn, không oracle.  
Thị trường tự cân bằng theo:

- Cost-of-production (càng rare tier càng cao)
- Demand từ người muốn shortcut
- Supply từ người chơi có nhiều NFT

---

## Tại sao không cần token riêng?

| Vấn đề nếu có token | Giải pháp SuiChin                              |
| ------------------- | ---------------------------------------------- |
| Token dễ bị dump    | Chỉ dùng SUI testnet — không có giá trị đầu cơ |
| Ponzi mechanics     | Không có staking APY, không emission schedule  |
| Phức tạp khi demo   | SUI coin đơn giản, ai cũng có testnet SUI      |
| Regulatory risk     | Không token = không chứng khoán                |

---

## Bảng tóm tắt số liệu kinh tế

| Chỉ số                  | Giá trị             |
| ----------------------- | ------------------- |
| Craft fee               | 0.1 SUI / lần       |
| Chun raw cost           | 10 chun / lần craft |
| Bronze rate             | 12% (1/8.3 craft)   |
| Silver rate (craft)     | 6% (1/16.7 craft)   |
| Gold rate (craft)       | 2% (1/50 craft)     |
| Trade-up Bronze→Silver  | 8 Bronze, 70%       |
| Trade-up Silver→Gold    | 6 Silver, 55%       |
| Min cost Bronze         | ~0.83 SUI           |
| Min cost Silver (craft) | ~1.67 SUI           |
| Min cost Gold (craft)   | ~5 SUI              |
