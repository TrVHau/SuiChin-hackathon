/// Module craft — xử lý việc craft NFT từ chun raw + SUI fee.
/// Cũng chứa Treasury (lưu SUI thu được) và AdminCap (rút tiền).
///
/// Xác suất craft:
///   roll 0–79  → Scrap   (80%)
///   roll 80–91 → Bronze  (12%)
///   roll 92–97 → Silver  ( 6%)
///   roll 98–99 → Gold    ( 2%)
///
/// Chi phí chun_raw tăng theo halving: cost = 10 × 2^(total_crafts / 1000), giới hạn 640.
/// Pseudo-RNG seed = clock_ms XOR (epoch × 1_000_003) XOR addr_seed
/// (Đủ cho hackathon demo. Production nên dùng sui::random VRF.)
module suichin::craft {
    use std::bcs;
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::sui::SUI;
    use suichin::cuon_chun;
    use suichin::player_profile::{Self, PlayerProfile};
    use suichin::scrap;

    // ─── Constants ────────────────────────────────────────────────────────────
    const CRAFT_FEE:         u64 = 100_000_000; // 0.1 SUI in MIST
    const COST_CHUN_BASE:    u64 = 10;           // chi phí gốc
    const COST_CHUN_MAX:     u64 = 640;          // giới hạn tối đa
    const HALVING_INTERVAL:  u64 = 1_000;        // số craft để tăng gấp đôi

    // Số variant mỗi tier (Bronze=4, Silver=4, Gold=3)
    const BRONZE_VARIANTS: u64 = 4;
    const SILVER_VARIANTS: u64 = 4;
    const GOLD_VARIANTS:   u64 = 3;

    // Phạm vi roll
    const ROLL_BRONZE_START: u64 = 80;
    const ROLL_SILVER_START: u64 = 92;
    const ROLL_GOLD_START:   u64 = 98;

    // ─── Error codes ──────────────────────────────────────────────────────────
    const E_INSUFFICIENT_PAYMENT: u64 = 500;
    const E_NOT_OWNER:            u64 = 501;

    // ─── Shared Objects ───────────────────────────────────────────────────────

    /// Treasury lưu SUI thu được từ phí craft. Shared object.
    public struct Treasury has key {
        id: UID,
        balance: Balance<SUI>,
        total_crafts: u64, // tổng số lần craft thành công NFT (dùng tính halving)
    }

    /// AdminCap cho phép rút tiền từ Treasury. Owned bởi deployer.
    public struct AdminCap has key, store {
        id: UID,
    }

    // ─── Events ───────────────────────────────────────────────────────────────
    public struct CraftResult has copy, drop {
        crafter: address,
        success: bool,
        tier: u8,     // 0 nếu Scrap
        roll: u64,    // raw roll 0–99
        fee_paid: u64,
    }

    // ─── Init ─────────────────────────────────────────────────────────────────
    fun init(ctx: &mut TxContext) {
        let treasury = Treasury {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            total_crafts: 0,
        };
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::share_object(treasury);
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /// Chi phí chun_raw hiện tại dựa trên halving.
    /// cost = COST_CHUN_BASE × 2^(total_crafts / HALVING_INTERVAL), tối đa COST_CHUN_MAX.
    public fun current_craft_cost(treasury: &Treasury): u64 {
        let steps = treasury.total_crafts / HALVING_INTERVAL;
        // Giới hạn: 2^6 = 64 → 10×64 = 640 = COST_CHUN_MAX
        if (steps >= 6) {
            COST_CHUN_MAX
        } else {
            // 2^steps — dùng vòng lặp đơn giản
            let mut multiplier: u64 = 1;
            let mut i = 0;
            while (i < steps) {
                multiplier = multiplier * 2;
                i = i + 1;
            };
            COST_CHUN_BASE * multiplier
        }
    }

    /// Pseudo-RNG đơn giản cho hackathon demo.
    /// Seed = clock_ms XOR (epoch × 1_000_003) XOR (8 bytes đầu của địa chỉ)
    fun roll_rng(clock: &Clock, ctx: &TxContext): u64 {
        let clock_ms = clock::timestamp_ms(clock);
        let epoch    = tx_context::epoch(ctx);
        let sender   = tx_context::sender(ctx);
        let addr_bytes = bcs::to_bytes(&sender);

        let addr_seed: u64 =
            (*vector::borrow(&addr_bytes, 0) as u64)        |
            ((*vector::borrow(&addr_bytes, 1) as u64) << 8) |
            ((*vector::borrow(&addr_bytes, 2) as u64) << 16)|
            ((*vector::borrow(&addr_bytes, 3) as u64) << 24)|
            ((*vector::borrow(&addr_bytes, 4) as u64) << 32)|
            ((*vector::borrow(&addr_bytes, 5) as u64) << 40)|
            ((*vector::borrow(&addr_bytes, 6) as u64) << 48)|
            ((*vector::borrow(&addr_bytes, 7) as u64) << 56);

        let seed = clock_ms ^ (epoch * 1_000_003) ^ addr_seed;
        seed % 100
    }

    // ─── Entry Functions ──────────────────────────────────────────────────────

    /// Craft một CuonChunNFT hoặc Scrap.
    /// Yêu cầu: profile.chun_raw >= 10 và payment >= 0.1 SUI.
    /// Trừ chun_raw trước khi RNG. Tiền thừa trả lại sender.
    #[allow(lint(self_transfer))]
    public fun craft_chun(
        profile: &mut PlayerProfile,
        treasury: &mut Treasury,
        mut payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);

        // Verify ownership
        assert!(sender == player_profile::owner(profile), E_NOT_OWNER);

        // Kiểm tra phí
        let payment_value = coin::value(&payment);
        assert!(payment_value >= CRAFT_FEE, E_INSUFFICIENT_PAYMENT);

        // Trừ chun_raw trước khi RNG (sẽ abort nếu không đủ chun)
        let chun_cost = current_craft_cost(treasury);
        player_profile::spend_chun(profile, chun_cost);

        // Tách đúng CRAFT_FEE vào Treasury, hoàn trả phần dư
        let fee_coin = coin::split(&mut payment, CRAFT_FEE, ctx);
        balance::join(&mut treasury.balance, coin::into_balance(fee_coin));
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, sender);
        } else {
            coin::destroy_zero(payment);
        };

        // RNG — roll tier
        let roll = roll_rng(clock, ctx);
        // roll2 dùng để chọn variant (seed thêm total_crafts để tách biệt)
        let variant_seed = clock::timestamp_ms(clock) ^ treasury.total_crafts;

        if (roll < ROLL_BRONZE_START) {
            // 80% → Scrap
            let s = scrap::mint(ctx);
            transfer::public_transfer(s, sender);
            event::emit(CraftResult { crafter: sender, success: false, tier: 0, roll, fee_paid: CRAFT_FEE });
        } else if (roll < ROLL_SILVER_START) {
            // 12% → Bronze
            let variant = ((variant_seed % BRONZE_VARIANTS) + 1) as u8;
            let nft = cuon_chun::mint(1, variant, ctx);
            transfer::public_transfer(nft, sender);
            treasury.total_crafts = treasury.total_crafts + 1;
            event::emit(CraftResult { crafter: sender, success: true, tier: 1, roll, fee_paid: CRAFT_FEE });
        } else if (roll < ROLL_GOLD_START) {
            // 6% → Silver
            let variant = ((variant_seed % SILVER_VARIANTS) + 1) as u8;
            let nft = cuon_chun::mint(2, variant, ctx);
            transfer::public_transfer(nft, sender);
            treasury.total_crafts = treasury.total_crafts + 1;
            event::emit(CraftResult { crafter: sender, success: true, tier: 2, roll, fee_paid: CRAFT_FEE });
        } else {
            // 2% → Gold
            let variant = ((variant_seed % GOLD_VARIANTS) + 1) as u8;
            let nft = cuon_chun::mint(3, variant, ctx);
            transfer::public_transfer(nft, sender);
            treasury.total_crafts = treasury.total_crafts + 1;
            event::emit(CraftResult { crafter: sender, success: true, tier: 3, roll, fee_paid: CRAFT_FEE });
        };
    }

    /// Rút SUI từ Treasury. Chỉ AdminCap holder mới gọi được.
    #[allow(lint(self_transfer))]
    public fun withdraw(
        _cap: &AdminCap,
        treasury: &mut Treasury,
        amount: u64,
        ctx: &mut TxContext,
    ) {
        let withdrawn = balance::split(&mut treasury.balance, amount);
        let coin = coin::from_balance(withdrawn, ctx);
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    // ─── Accessors ────────────────────────────────────────────────────────────
    public fun treasury_balance(treasury: &Treasury): u64 {
        balance::value(&treasury.balance)
    }

    public fun total_crafts(treasury: &Treasury): u64 {
        treasury.total_crafts
    }

    // ─── Test-only Helpers ───────────────────────────────────────────────────────────

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx)
    }

    #[test_only]
    public fun set_total_crafts_for_testing(treasury: &mut Treasury, n: u64) {
        treasury.total_crafts = n;
    }
}
