# Sequence Diagrams - SuiChin

## 🔐 1. Đăng nhập & Tạo Profile

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant zkLogin
    participant SuiContract as Sui Contract

    User->>Frontend: Click "Đăng nhập"
    Frontend->>zkLogin: Khởi tạo zkLogin
    zkLogin->>User: Redirect đến OAuth Provider
    User->>zkLogin: Xác thực thành công
    zkLogin->>Frontend: Trả về zkProof + address

    Frontend->>SuiContract: Kiểm tra PlayerProfile(address)
    alt Profile chưa tồn tại
        Frontend->>SuiContract: create_profile() [SPONSORED]
        SuiContract->>Frontend: Trả về PlayerProfile object
        Note over SuiContract: tier1=0, tier2=0, tier3=0<br/>max_streak=0, current_streak=0<br/>faucet_last_claim=0 (set xa để nhận 10 chun)
    else Profile đã có
        SuiContract->>Frontend: Trả về PlayerProfile hiện tại
    end

    Frontend->>User: Hiển thị Dashboard
```

---

## 🎮 2. Game Session (Off-chain Gameplay → On-chain Save)

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant GameEngine as Game Engine (Canvas)
    participant SuiContract as Sui Contract

    User->>Frontend: Click "Chơi game"
    Frontend->>User: Hiển thị màn hình game

    Note over User,GameEngine: === SESSION BẮT ĐẦU (Off-chain) ===
    Frontend->>Frontend: Snapshot: old_tier1, old_tier2, old_tier3<br/>old_max_streak, old_current_streak

    loop Mỗi trận trong session
        User->>Frontend: Chọn tier chun để đặt cược (1/2/3)

        alt Không đủ chun tier đó (local check)
            Frontend->>User: "Không đủ chun! Chọn tier khác hoặc xin chun"
        else Đủ chun
            Frontend->>GameEngine: Bắt đầu trận đấu

            loop Luân phiên búng chun (Off-chain Physics)
                User->>GameEngine: Kéo thả để búng chun
                GameEngine->>GameEngine: Tính toán physics (momentum, collision)
                GameEngine->>GameEngine: Bot AI búng chun
                GameEngine->>GameEngine: Kiểm tra điều kiện kết thúc
            end

            alt User thắng
                GameEngine->>Frontend: Kết quả: WIN
                Frontend->>Frontend: local_tier[chosen] += 1
                Frontend->>Frontend: current_streak += 1
                Frontend->>User: Hiển thị "Thắng! +1 chun tier X, Streak: Y"
            else User thua
                GameEngine->>Frontend: Kết quả: LOSE
                Frontend->>Frontend: local_tier[chosen] -= 1
                Frontend->>Frontend: max_streak = max(max_streak, current_streak)
                Frontend->>Frontend: current_streak = 0
                Frontend->>User: Hiển thị "Thua! -1 chun tier X, Streak reset"
            end
        end

        User->>Frontend: Chọn "Chơi tiếp" hoặc "Thoát"
    end

    Note over User,SuiContract: === KẾT THÚC SESSION → LƯU LÊN BLOCKCHAIN ===

    User->>Frontend: Click "Thoát" / Kết thúc session

    Frontend->>Frontend: Tính delta
    Note over Frontend: delta_tier1 = new_tier1 - old_tier1 (có thể âm)<br/>delta_tier2 = new_tier2 - old_tier2<br/>delta_tier3 = new_tier3 - old_tier3<br/>new_max_streak (cao nhất đạt được)<br/>new_current_streak (streak khi thoát)

    Frontend->>SuiContract: record_session(<br/>  delta_tier1, delta_tier2, delta_tier3,<br/>  new_max_streak, new_current_streak<br/>) [SPONSORED]

    SuiContract->>SuiContract: Validate delta hợp lệ (rate limit, cooldown)
    SuiContract->>SuiContract: Cập nhật PlayerProfile
    Note over SuiContract: tier1 = tier1 + delta_tier1 (check >= 0)<br/>tier2 = tier2 + delta_tier2 (check >= 0)<br/>tier3 = tier3 + delta_tier3 (check >= 0)<br/>max_streak = max(max_streak, new_max_streak)<br/>current_streak = new_current_streak

    SuiContract->>Frontend: Transaction success
    Frontend->>User: "Kết quả đã lưu! Chun: X/Y/Z, Streak: A"
```

---

## 🎁 3. Xin Chun (Faucet)

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant SuiContract as Sui Contract

    User->>Frontend: Click "Xin chun"

    Frontend->>SuiContract: Kiểm tra PlayerProfile.faucet_last_claim
    SuiContract->>Frontend: Trả về faucet_last_claim timestamp

    Frontend->>Frontend: Tính cooldown
    Note over Frontend: time_passed = now - faucet_last_claim<br/>Cần >= 2 giờ (7200 seconds)

    alt Chưa đủ cooldown
        Frontend->>User: "Chờ X phút Y giây nữa mới xin được"
    else Đã đủ cooldown (hoặc lần đầu = 0)
        User->>Frontend: Confirm "Xin chun"
        Frontend->>SuiContract: claim_faucet() [SPONSORED]

        SuiContract->>SuiContract: Random số lượng chun (1-10)
        Note over SuiContract: random_count = 4 (ví dụ)

        loop 4 lần (mỗi chun random riêng)
            SuiContract->>SuiContract: Random tier (33.33% mỗi tier)
            Note over SuiContract: Chun 1 → tier 1<br/>Chun 2 → tier 1<br/>Chun 3 → tier 2<br/>Chun 4 → tier 3
        end

        SuiContract->>SuiContract: Cộng vào PlayerProfile
        Note over SuiContract: tier1 += 2<br/>tier2 += 1<br/>tier3 += 1

        SuiContract->>SuiContract: Cập nhật faucet_last_claim = now
        SuiContract->>Frontend: Trả về kết quả (tier1_count, tier2_count, tier3_count)
        Frontend->>User: "Nhận được: 2×🥉, 1×🥈, 1×🥇"
    end
```

---

## 🎨 4. Mint Cuộn Chun NFT

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant SuiContract as Sui Contract

    User->>Frontend: Click "Mint cuộn chun"

    Frontend->>SuiContract: Lấy PlayerProfile (tier1, tier2, tier3)
    SuiContract->>Frontend: Trả về số chun hiện có

    Frontend->>Frontend: Tính tổng điểm hiện tại
    Note over Frontend: max_points = tier1×1 + tier2×2 + tier3×3

    alt Tổng điểm < 10
        Frontend->>User: "Chưa đủ 10 điểm để mint (hiện có: X)"
    else Tổng điểm >= 10
        Frontend->>User: Hiển thị form chọn chun
        Note over Frontend: Slider/Input: Chọn số lượng mỗi tier<br/>Hiển thị realtime: Tổng điểm = ?

        User->>Frontend: Chọn số lượng chun
        Note over User: Ví dụ:<br/>use_tier1 = 4<br/>use_tier2 = 3<br/>use_tier3 = 1<br/>→ Tổng = 4 + 6 + 3 = 13 điểm

        Frontend->>Frontend: Validate
        Note over Frontend: 1. Tổng điểm >= 10?<br/>2. use_tierX <= có sẵn tierX?

        alt Không hợp lệ
            Frontend->>User: "Số lượng không hợp lệ hoặc không đủ chun"
        else Hợp lệ
            User->>Frontend: Click "Xác nhận Mint"

            Frontend->>SuiContract: craft_roll(<br/>  use_tier1, use_tier2, use_tier3<br/>) [SPONSORED]

            SuiContract->>SuiContract: Tính total_points
            Note over SuiContract: total = use_tier1×1 + use_tier2×2 + use_tier3×3

            SuiContract->>SuiContract: Validate total >= 10
            SuiContract->>SuiContract: Validate đủ chun trong PlayerProfile
            SuiContract->>SuiContract: Trừ chun
            Note over SuiContract: tier1 -= use_tier1<br/>tier2 -= use_tier2<br/>tier3 -= use_tier3

            SuiContract->>SuiContract: Random tier cuộn chun NFT
            Note over SuiContract: Dựa trên total_points:<br/>10-19: 75% tier1, 20% tier2, 5% tier3<br/>20-29: 60% tier1, 30% tier2, 10% tier3<br/>30+: 50% tier1, 35% tier2, 15% tier3

            SuiContract->>SuiContract: Mint ChunRoll NFT với tier đã random
            SuiContract->>User: Transfer ChunRoll NFT
            SuiContract->>Frontend: Transaction success (nft_id, tier)

            Frontend->>User: "🎉 Mint thành công! Nhận được Cuộn Chun Tier X"
        end
    end
```

---

## 🏆 5. Claim Achievement NFT (Soulbound)

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant SuiContract as Sui Contract

    User->>Frontend: Vào trang "Thành tích"

    Frontend->>SuiContract: Lấy PlayerProfile
    SuiContract->>Frontend: Trả về max_streak + achievements[]

    Frontend->>Frontend: Kiểm tra achievements có thể claim
    Note over Frontend: Milestones: 1, 5, 18, 36, 67<br/>Nếu max_streak >= milestone<br/>và chưa có trong achievements[]<br/>→ Claimable

    Frontend->>User: Hiển thị danh sách
    Note over User: ✅ Người Mới Bắt Đầu (claimed)<br/>🎁 Người Chơi Xuất Sắc (claimable)<br/>🔒 Tay Chun Thiên Tài (locked)<br/>🔒 Cao Thủ Búng Chun (locked)<br/>🔒 Huyền Thoại Búng Chun (locked)

    User->>Frontend: Click "Claim" achievement

    Frontend->>SuiContract: claim_achievement(milestone) [SPONSORED]
    Note over Frontend: milestone = 1, 5, 18, 36, hoặc 67

    SuiContract->>SuiContract: Validate max_streak >= milestone
    SuiContract->>SuiContract: Check milestone chưa có trong achievements[]

    alt Không hợp lệ
        SuiContract->>Frontend: Error: "Không đủ điều kiện hoặc đã claim"
        Frontend->>User: Hiển thị error
    else Hợp lệ
        SuiContract->>SuiContract: Mint Achievement NFT
        Note over SuiContract: Soulbound NFT:<br/>- milestone: u64<br/>- title: String<br/>- non-transferable

        SuiContract->>User: Transfer Achievement NFT (owned nhưng không transfer được)
        SuiContract->>SuiContract: Thêm milestone vào achievements[]
        SuiContract->>Frontend: Transaction success (nft_id, title)

        Frontend->>User: "🏆 Nhận danh hiệu: [Tên danh hiệu]"
    end
```

---

## 📊 Luồng tổng quan

```mermaid
graph TD
    A[Đăng nhập zkLogin] --> B{Profile tồn tại?}
    B -->|Không| C[create_profile - SPONSORED<br/>faucet_last_claim=0 để nhận 10 chun]
    B -->|Có| D[Load Profile]
    C --> D

    D --> E[Dashboard<br/>Hiển thị: Chun, Streak, NFTs]

    E --> F[Chơi Game Session]
    E --> G[Xin Chun]
    E --> H[Mint Cuộn Chun]
    E --> I[Claim Achievement]

    F --> J[Off-chain Gameplay<br/>Kéo thả búng chun, physics]
    J --> K{Nhiều trận thắng/thua}
    K --> L[record_session - SPONSORED<br/>Lưu delta + streak]
    L --> E

    G --> M[claim_faucet - SPONSORED<br/>Random 1-10 chun, mỗi chun random tier]
    M --> E

    H --> N[User chọn số chun mỗi tier]
    N --> O[craft_roll - SPONSORED<br/>Random tier NFT]
    O --> P[Nhận ChunRoll NFT<br/>Transferable]
    P --> E

    I --> Q{max_streak >= milestone?}
    Q -->|Yes| R[claim_achievement - SPONSORED]
    Q -->|No| E
    R --> S[Nhận Achievement NFT<br/>Soulbound, mỗi milestone 1 NFT]
    S --> E
```

---

## 🔄 Sponsored Transactions Flow

Tất cả transactions đều được sponsor (hackathon scope):

```mermaid
sequenceDiagram
    participant Frontend
    participant GasStation as Gas Station / Sponsor Backend
    participant Sui as Sui Blockchain

    Frontend->>GasStation: Request sponsored transaction
    Note over Frontend: Payload: transaction_kind + user_signature

    GasStation->>GasStation: Validate request<br/>(rate limit, basic checks)
    GasStation->>GasStation: Thêm gas payment từ sponsor wallet
    GasStation->>GasStation: Sign transaction

    GasStation->>Sui: Submit sponsored transaction
    Sui->>Sui: Execute transaction<br/>(gas trừ từ sponsor)
    Sui->>GasStation: Transaction result (success/error)
    GasStation->>Frontend: Return result + digest
    Frontend->>Frontend: Update UI

    Note over Frontend,Sui: ✅ User không mất SUI token nào
```

---

## 🎯 Contract Data Structures & Functions

### PlayerProfile Object

```move
struct PlayerProfile has key, store {
    id: UID,
    owner: address,
    tier1: u64,              // Số chun đồng 🥉
    tier2: u64,              // Số chun bạc 🥈
    tier3: u64,              // Số chun vàng 🥇
    max_streak: u64,         // Streak cao nhất từng đạt (dùng unlock achievement)
    current_streak: u64,     // Streak hiện tại (reset về 0 khi thua)
    faucet_last_claim: u64,  // Timestamp (ms) lần xin chun cuối
    achievements: vector<u64> // Các milestone đã claim [1, 5, 18, 36, 67]
}
```

### ChunRoll NFT (Transferable)

```move
struct ChunRoll has key, store {
    id: UID,
    tier: u8,           // 1, 2, hoặc 3
    image_url: String,  // URL ảnh cuộn chun
}
```

### Achievement NFT (Soulbound)

```move
struct Achievement has key {  // Không có 'store' → non-transferable
    id: UID,
    milestone: u64,   // 1, 5, 18, 36, 67
    title: String,    // "Người Mới Bắt Đầu", "Cao Thủ Búng Chun"...
    owner: address,
}
```

### Public Functions

```move
// 1. Tạo profile mới (sponsored)
public entry fun create_profile(ctx: &mut TxContext)

// 2. Lưu kết quả session (sponsored)
public entry fun record_session(
    profile: &mut PlayerProfile,
    delta_tier1: i64,      // Âm nếu thua nhiều hơn thắng
    delta_tier2: i64,
    delta_tier3: i64,
    new_max_streak: u64,   // Streak cao nhất đạt được trong session
    new_current_streak: u64, // Streak hiện tại khi thoát
    ctx: &mut TxContext
)

// 3. Xin chun (sponsored)
public entry fun claim_faucet(
    profile: &mut PlayerProfile,
    clock: &Clock,
    ctx: &mut TxContext
)

// 4. Mint cuộn chun NFT (sponsored)
public entry fun craft_roll(
    profile: &mut PlayerProfile,
    use_tier1: u64,
    use_tier2: u64,
    use_tier3: u64,
    ctx: &mut TxContext
): ChunRoll

// 5. Claim achievement NFT (sponsored)
public entry fun claim_achievement(
    profile: &mut PlayerProfile,
    milestone: u64,  // 1, 5, 18, 36, hoặc 67
    ctx: &mut TxContext
): Achievement
```

---

## 🔒 Anti-cheat Validations (Hackathon Scope)

### record_session() validations:

- **Rate limiting**: Max 50 điểm tổng thay đổi mỗi session
- **Cooldown**: Tối thiểu 3 giây giữa các lần record
- **Non-negative check**: `tier + delta >= 0` cho mỗi tier
- **Streak hợp lý**: `new_current_streak <= new_max_streak`

### claim_faucet() validations:

- **Cooldown**: `now - faucet_last_claim >= 2 giờ (7200000 ms)`
- **Random fair**: Sử dụng `tx_context::epoch()` + `object::id()` để seed

### craft_roll() validations:

- **Minimum points**: `use_tier1 + use_tier2×2 + use_tier3×3 >= 10`
- **Sufficient balance**: `profile.tierX >= use_tierX`

### claim_achievement() validations:

- **Streak requirement**: `profile.max_streak >= milestone`
- **Not claimed**: `!vector::contains(&profile.achievements, milestone)`
- **Valid milestone**: `milestone ∈ {1, 5, 18, 36, 67}`
