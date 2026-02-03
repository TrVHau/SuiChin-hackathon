# Mô tả sản phẩm - SuiChin

## 🎯 Tổng quan

SuiChin là game búng chun Web3 trên Sui Blockchain. Người chơi đấu với bot, thắng để kiếm chun (điểm), tích đủ điểm thì mint cuộn chun NFT. Chuỗi thắng liên tiếp sẽ nhận Soulbound NFT danh hiệu.

---

## ✨ Tính năng chính

### 1. Đăng nhập với zkLogin

- Kết nối ví Sui (zkLogin)
- Không cần tạo tài khoản phức tạp
- Tự động tạo profile khi đăng nhập lần đầu

### 2. Sponsored Transactions (Miễn phí gas) // triển khai sau này hiện vẫn phải tự kí tx

- Mọi transaction đều được sponsor
- Người chơi không cần SUI để chơi
- Giảm rào cản gia nhập cho người mới

### 3. Gameplay: Búng Chun vs Bot

**Cơ chế chơi:**

1. **Màn hình**: Mặt phẳng 2D với chun của player và bot //bắt đầu session
2. **Trước khi chơi** chọn loại chun đề đáu (1,2,3) xong đấu hoặc thoát thì ra bước 7
3. **Luân phiên**: Player → Bot → Player...
4. **Mỗi lượt**: Kéo thả để búng chun (physics-based) chơi đến khi nào thắng hoặc thua
5. **Kết quả**:
   - **Thắng**: Chun bạn đè lên chun bot → +1 chun cùng tier đã chọn, streak++
   - **Thua**: Chun bot đè lên chun bạn → -1 chun tier đã chọn, streak = 0,
6. **Chơi liên tục** chọn chun xong đấu
7. **Kết thúc session** → Lưu kết quả lên blockchain (off-chain gameplay)

### 4. Hệ thống Chun (Betting System)

**Stake & Win:**

- Trước mỗi trận, chọn 1 trong 3 tier chun để đặt cược (stake)
- Phải có ít nhất 1 chun của tier đó mới chơi được
- **Thắng**: +1 chun cùng tier → Có thể tiếp tục chơi
- **Thua**: -1 chun tier đã chọn → có thể tiếp tục chơi
  | Tier | Giá trị (mint) |
  | ---------------- | -------------- |
  | Tier 1 (Đồng) 🥉 | 1 điểm |
  | Tier 2 (Bạc) 🥈 | 2 điểm |
  | Tier 3 (Vàng) 🥇 | 3 điểm |

**Ví dụ:**

- vào trận xong hiển thị chọn loại chun 1
- thắng thì chun 1 được cộng thêm current_streak+1
- chọn chun 2
- thắng thì chun 2 được cộng thêm current_streak+1
- chọn chun 1
- thua thì chun chun 1 bị trừ ,lưu max_streak = max(max_streak,current) current_streak = 0
- chọn chun 1
- thắng thì chun 1 được cộng thêm current_streak +1
- chọn thoát
- gửi tx lưu vào blockchain

### 5. Xin Chun (Faucet)

Nếu hết chun, người chơi có thể "xin chun" (giống xin tiền bố mẹ):

- **Nhận**: Random 1 chun trong 3 tier (33% mỗi tier)
- **Giới hạn**: Tối đa 10 lần/1 lần xin
- **Cooldown**: 2 giờ giữa các lần xin
- **Miễn phí gas**: Sponsored transaction

**Lý do:**

- Giúp người mới bắt đầu khi chưa có chun nào
- Giải cứu khi thua hết chun
- Giới hạn để tránh abuse

**ví dụ**

- lân cuối và là 7h trước
- ấn vào xin chun thì được nhận random 3 chun mỗi loại random
- néu lần cuói vào là 2ngày trước nhưng ko được nhận 24 cái mà tối đa 10 cái

### 6. Mint Cuộn Chun NFT

- **Điều kiện**: Tổng điểm ≥ 10
- **Công thức**: `total = tier1×1 + tier2×2 + tier3×3`
- **Tier cuộn chun**: Random, điểm càng cao → tỷ lệ tier cao càng lớn

| Điểm dùng | Tier 1 | Tier 2 | Tier 3 |
| --------- | ------ | ------ | ------ |
| 10-19     | 75%    | 20%    | 5%     |
| 20-29     | 60%    | 30%    | 10%    |
| 30+       | 50%    | 35%    | 15%    |

**ví dụ**

- có 5 chun 1 , 3 chun 2,2 chun 3
- chọn 4 chun 1,3 chun 2, 1 chung 3
- tổng 13>=10 thì bấm xác nhận
- gửi tx cập nhật số chun và random ra nft cuộn chun

### 7. Soulbound NFT - Danh hiệu (Streak Achievements)

**Streak** chỉ dùng để unlock danh hiệu, không ảnh hưởng tier chun nhận được.

Không thể transfer, ghi nhận thành tích chuỗi thắng liên tiếp:

| Streak | Danh hiệu             | Điều kiện               |
| ------ | --------------------- | ----------------------- |
| 1      | Người Mới Bắt Đầu     | Thắng 1 trận            |
| 5      | Người Chơi Xuất Sắc   | Thắng liên tiếp 5 trận  |
| 18     | Tay Chun Thiên Tài    | Thắng liên tiếp 18 trận |
| 36     | Cao Thủ Búng Chun     | Thắng liên tiếp 36 trận |
| 67     | Huyền Thoại Búng Chun | Thắng liên tiếp 67 trận |

_Thua 1 trận → Streak reset về 0_

---

## 🔐 Bảo mật (Hackathon scope)

### Anti-cheat cơ bản:

1. **Rate limiting**: Max 50 điểm/session
2. **Cooldown**: Tối thiểu 3 giây giữa các lần record
3. **Validation**: Contract kiểm tra delta hợp lệ

### Roadmap bảo mật (Post-hackathon):

- Backend validator với signature verification
- VRF cho random công bằng
- Replay attack prevention

---

## 📦 Smart Contract Modules

```
contracts/sources/
├── player.move       # PlayerProfile object
├── game.move         # record_session(), craft_roll()
├── chun_roll.move    # ChunRoll NFT
└── achievement.move  # Soulbound Achievement NFT
```

### Objects

| Object        | Type  | Transferable   |
| ------------- | ----- | -------------- |
| PlayerProfile | Owned | Yes            |
| ChunRoll      | Owned | Yes            |
| Achievement   | Owned | No (Soulbound) |
