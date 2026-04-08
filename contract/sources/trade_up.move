/// Module trade_up — đổi NFT tier thấp lấy tier cao hơn.
///
/// Bronze→Silver: 8 Bronze vào → 70% Silver | 30% Scrap
/// Silver→Gold:   6 Silver vào → 55% Gold   | 45% Scrap
///
/// Input luôn bị burn BẤT KỂ kết quả.
module suichin::trade_up {
    use std::bcs;
    use sui::clock::{Self, Clock};
    use sui::event;
    use suichin::cuon_chun::{Self, CuonChunNFT};
    use suichin::scrap;

    // ─── Constants ────────────────────────────────────────────────────────────
    const BRONZE_INPUT:           u64 = 8;
    const SILVER_INPUT:           u64 = 6;
    const BRONZE_TO_SILVER_RATE:  u64 = 70; // 70% thành công
    const SILVER_TO_GOLD_RATE:    u64 = 55; // 55% thành công

    // ─── Error codes ──────────────────────────────────────────────────────────
    const E_WRONG_INPUT_COUNT: u64 = 200;
    const E_WRONG_TIER:        u64 = 201;

    // ─── Events ───────────────────────────────────────────────────────────────
    public struct TradeUpResult has copy, drop {
        trader: address,
        from_tier: u8,
        to_tier: u8,      // 0 nếu thất bại (Scrap)
        success: bool,
        inputs_burned: u64,
        roll: u64,
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /// Pseudo-RNG dùng chung — seed từ clock + epoch + addr
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

        let seed = clock_ms ^ (epoch * 1_000_007) ^ addr_seed;
        seed % 100
    }

    /// Kiểm tra và burn toàn bộ NFTs trong vector.
    /// Abort nếu bất kỳ NFT nào sai tier.
    fun burn_all(mut nfts: vector<CuonChunNFT>, expected_tier: u8) {
        let len = vector::length(&nfts);
        let mut i = 0;
        while (i < len) {
            let nft = vector::pop_back(&mut nfts);
            assert!(cuon_chun::tier(&nft) == expected_tier, E_WRONG_TIER);
            cuon_chun::burn(nft);
            i = i + 1;
        };
        vector::destroy_empty(nfts);
    }

    // ─── Entry Functions ──────────────────────────────────────────────────────

    /// Trade-up 8 Bronze → Silver (70%) hoặc Scrap (30%).
    /// Tất cả input bị burn dù thành công hay thất bại.
    public fun trade_up_bronze_to_silver(
        nfts: vector<CuonChunNFT>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(vector::length(&nfts) == BRONZE_INPUT, E_WRONG_INPUT_COUNT);
        let sender = tx_context::sender(ctx);
        let inputs_burned = BRONZE_INPUT;

        // Burn tất cả input (verify tier bên trong)
        burn_all(nfts, 1);

        let roll = roll_rng(clock, ctx);
        if (roll < BRONZE_TO_SILVER_RATE) {
            // 70% → Silver
            let variant = ((roll % 4) + 1) as u8;
            let nft = cuon_chun::mint(2, variant, ctx);
            transfer::public_transfer(nft, sender);
            event::emit(TradeUpResult {
                trader: sender,
                from_tier: 1,
                to_tier: 2,
                success: true,
                inputs_burned,
                roll,
            });
        } else {
            // 30% → Scrap
            let s = scrap::mint(ctx);
            transfer::public_transfer(s, sender);
            event::emit(TradeUpResult {
                trader: sender,
                from_tier: 1,
                to_tier: 0,
                success: false,
                inputs_burned,
                roll,
            });
        };
    }

    /// Trade-up 6 Silver → Gold (55%) hoặc Scrap (45%).
    /// Tất cả input bị burn dù thành công hay thất bại.
    public fun trade_up_silver_to_gold(
        nfts: vector<CuonChunNFT>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(vector::length(&nfts) == SILVER_INPUT, E_WRONG_INPUT_COUNT);
        let sender = tx_context::sender(ctx);
        let inputs_burned = SILVER_INPUT;

        // Burn tất cả input (verify tier bên trong)
        burn_all(nfts, 2);

        let roll = roll_rng(clock, ctx);
        if (roll < SILVER_TO_GOLD_RATE) {
            // 55% → Gold
            let variant = ((roll % 3) + 1) as u8;
            let nft = cuon_chun::mint(3, variant, ctx);
            transfer::public_transfer(nft, sender);
            event::emit(TradeUpResult {
                trader: sender,
                from_tier: 2,
                to_tier: 3,
                success: true,
                inputs_burned,
                roll,
            });
        } else {
            // 45% → Scrap
            let s = scrap::mint(ctx);
            transfer::public_transfer(s, sender);
            event::emit(TradeUpResult {
                trader: sender,
                from_tier: 2,
                to_tier: 0,
                success: false,
                inputs_burned,
                roll,
            });
        };
    }
}
