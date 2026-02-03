/// Module: game
/// Description: Logic game chính - record_session, claim_faucet, craft_roll
module suichin::game {
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::bcs;
    use suichin::player::{Self, PlayerProfile};
    use suichin::chun_roll;

    // ===== Constants =====

    // Anti-cheat limits
    const MAX_DELTA_PER_SESSION: u64 = 50; // Max 50 điểm thay đổi/session
    const MIN_SESSION_COOLDOWN_MS: u64 = 3000; // 3 giây giữa các session

    // Faucet config
    const FAUCET_COOLDOWN_MS: u64 = 7200000; // 2 giờ = 7200000ms
    const FAUCET_INTERVAL_MS: u64 = 7200000; // Mỗi 2 giờ = 1 chun
    const MAX_FAUCET_CHUNS: u64 = 10; // Tối đa 10 chun

    // Craft roll requirements
    const MIN_POINTS_TO_CRAFT: u64 = 10; // Tối thiểu 10 điểm để mint

    // ===== Errors =====

    const E_DELTA_TOO_LARGE: u64 = 100;
    const E_COOLDOWN_NOT_READY: u64 = 101;
    const E_INSUFFICIENT_CHUN: u64 = 102;
    const E_INVALID_STREAK: u64 = 104;
    const E_INSUFFICIENT_POINTS: u64 = 105;
    const E_FAUCET_NOT_READY: u64 = 106;

    // ===== Events =====

    public struct SessionRecorded has copy, drop {
        profile_id: ID,
        delta_tier1: u64, // Dùng u64 cho event, abs value
        delta_tier2: u64,
        delta_tier3: u64,
        is_positive: bool, // true nếu thắng nhiều, false nếu thua nhiều
        new_max_streak: u64,
        new_current_streak: u64,
        timestamp: u64,
    }

    public struct FaucetClaimed has copy, drop {
        profile_id: ID,
        tier1_received: u64,
        tier2_received: u64,
        tier3_received: u64,
        total_chuns: u64,
        timestamp: u64,
    }

    public struct ChunRollCrafted has copy, drop {
        profile_id: ID,
        nft_id: ID,
        tier: u8,
        points_used: u64,
        timestamp: u64,
    }

    // ===== Public Entry Functions =====

    /// Record kết quả session sau khi chơi off-chain
    /// Delta có thể âm (thua nhiều) hoặc dương (thắng nhiều)
    public fun record_session(
        profile: &mut PlayerProfile,
        clock: &Clock,
        delta_tier1: u64, // Absolute value
        delta_tier2: u64,
        delta_tier3: u64,
        is_tier1_positive: bool, // true = +delta, false = -delta
        is_tier2_positive: bool,
        is_tier3_positive: bool,
        new_max_streak: u64,
        new_current_streak: u64,
        _ctx: &mut TxContext
    ) {
        // CRITICAL: Owner validation
        assert!(player::owner(profile) == tx_context::sender(_ctx), E_COOLDOWN_NOT_READY);
        
        let current_time = clock::timestamp_ms(clock);
        let last_time = player::last_session_time(profile);

        // Anti-cheat: Cooldown check
        assert!(
            last_time == 0 || current_time >= last_time + MIN_SESSION_COOLDOWN_MS,
            E_COOLDOWN_NOT_READY
        );

        // Anti-cheat: Rate limiting
        let total_delta = delta_tier1 + delta_tier2 * 2 + delta_tier3 * 3;
        assert!(total_delta <= MAX_DELTA_PER_SESSION, E_DELTA_TOO_LARGE);

        // Anti-cheat: Streak validation
        assert!(new_current_streak <= new_max_streak, E_INVALID_STREAK);
        let old_max_streak = player::max_streak(profile);
        assert!(new_max_streak >= old_max_streak, E_INVALID_STREAK);

        // Calculate new chun values
        let old_tier1 = player::get_chun(profile, 1);
        let old_tier2 = player::get_chun(profile, 2);
        let old_tier3 = player::get_chun(profile, 3);

        let new_tier1 = if (is_tier1_positive) {
            old_tier1 + delta_tier1
        } else {
            assert!(old_tier1 >= delta_tier1, E_INSUFFICIENT_CHUN);
            old_tier1 - delta_tier1
        };

        let new_tier2 = if (is_tier2_positive) {
            old_tier2 + delta_tier2
        } else {
            assert!(old_tier2 >= delta_tier2, E_INSUFFICIENT_CHUN);
            old_tier2 - delta_tier2
        };

        let new_tier3 = if (is_tier3_positive) {
            old_tier3 + delta_tier3
        } else {
            assert!(old_tier3 >= delta_tier3, E_INSUFFICIENT_CHUN);
            old_tier3 - delta_tier3
        };

        // Update profile
        player::update_chun(profile, new_tier1, new_tier2, new_tier3);
        player::update_streak(profile, new_max_streak, new_current_streak);
        player::update_session_time(profile, current_time);

        // Emit event
        event::emit(SessionRecorded {
            profile_id: object::id(profile),
            delta_tier1,
            delta_tier2,
            delta_tier3,
            is_positive: is_tier1_positive && is_tier2_positive && is_tier3_positive,
            new_max_streak,
            new_current_streak,
            timestamp: current_time,
        });
    }

    /// Xin chun miễn phí (Faucet)
    /// Số chun nhận được = min(thời_gian_qua / 2h, 10)
    /// Mỗi chun random tier (33.33% mỗi tier)
    public fun claim_faucet(
        profile: &mut PlayerProfile,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // CRITICAL: Owner validation
        assert!(player::owner(profile) == tx_context::sender(ctx), E_COOLDOWN_NOT_READY);
        
        let current_time = clock::timestamp_ms(clock);
        let last_claim = player::faucet_last_claim(profile);

        // Check cooldown (ít nhất 2 giờ)
        let time_passed = current_time - last_claim;
        assert!(time_passed >= FAUCET_COOLDOWN_MS, E_FAUCET_NOT_READY);

        // Calculate số chun được nhận
        // num_chuns = min(floor(time_passed / 2h), 10)
        let mut num_chuns = time_passed / FAUCET_INTERVAL_MS;
        if (num_chuns > MAX_FAUCET_CHUNS) {
            num_chuns = MAX_FAUCET_CHUNS;
        };
        
        // CRITICAL: Assert num_chuns > 0
        assert!(num_chuns > 0, E_FAUCET_NOT_READY);

        // Random tier cho mỗi chun và cộng vào profile
        let mut tier1_count = 0u64;
        let mut tier2_count = 0u64;
        let mut tier3_count = 0u64;

        let mut i = 0u64;
        while (i < num_chuns) {
            // Improved random: epoch + i + sender address
            let sender_bytes = bcs::to_bytes(&tx_context::sender(ctx));
            let sender_u64 = vector::length(&sender_bytes) as u64;
            let random_seed = tx_context::epoch(ctx) + i + sender_u64;
            let tier = (random_seed % 3) + 1; // 1, 2, or 3

            if (tier == 1) {
                tier1_count = tier1_count + 1;
            } else if (tier == 2) {
                tier2_count = tier2_count + 1;
            } else {
                tier3_count = tier3_count + 1;
            };

            i = i + 1;
        };

        // Update profile
        let old_tier1 = player::get_chun(profile, 1);
        let old_tier2 = player::get_chun(profile, 2);
        let old_tier3 = player::get_chun(profile, 3);

        player::update_chun(
            profile,
            old_tier1 + tier1_count,
            old_tier2 + tier2_count,
            old_tier3 + tier3_count
        );
        player::update_faucet_claim_time(profile, current_time);

        // Emit event
        event::emit(FaucetClaimed {
            profile_id: object::id(profile),
            tier1_received: tier1_count,
            tier2_received: tier2_count,
            tier3_received: tier3_count,
            total_chuns: num_chuns,
            timestamp: current_time,
        });
    }

    /// Mint Cuộn Chun NFT
    /// User chọn số lượng chun từng tier để dùng
    /// Tier NFT được random dựa trên tổng điểm
    #[allow(lint(self_transfer))]
    public fun craft_roll(
        profile: &mut PlayerProfile,
        clock: &Clock,
        use_tier1: u64,
        use_tier2: u64,
        use_tier3: u64,
        ctx: &mut TxContext
    ) {
        // CRITICAL: Owner validation
        assert!(player::owner(profile) == tx_context::sender(ctx), E_INSUFFICIENT_CHUN);
        
        // Calculate total points
        let total_points = use_tier1 * 1 + use_tier2 * 2 + use_tier3 * 3;
        
        // Validate minimum points
        assert!(total_points >= MIN_POINTS_TO_CRAFT, E_INSUFFICIENT_POINTS);

        // Validate sufficient balance
        let current_tier1 = player::get_chun(profile, 1);
        let current_tier2 = player::get_chun(profile, 2);
        let current_tier3 = player::get_chun(profile, 3);

        assert!(current_tier1 >= use_tier1, E_INSUFFICIENT_CHUN);
        assert!(current_tier2 >= use_tier2, E_INSUFFICIENT_CHUN);
        assert!(current_tier3 >= use_tier3, E_INSUFFICIENT_CHUN);

        // Deduct chun from profile
        player::update_chun(
            profile,
            current_tier1 - use_tier1,
            current_tier2 - use_tier2,
            current_tier3 - use_tier3
        );

        // Random tier dựa trên total_points
        let nft_tier = random_nft_tier(total_points, ctx);

        // Mint NFT
        let nft = chun_roll::mint(nft_tier, ctx);
        let nft_id = object::id(&nft);

        // Emit event
        let current_time = clock::timestamp_ms(clock);
        event::emit(ChunRollCrafted {
            profile_id: object::id(profile),
            nft_id,
            tier: nft_tier,
            points_used: total_points,
            timestamp: current_time,
        });

        // Transfer NFT to sender
        transfer::public_transfer(nft, tx_context::sender(ctx));
    }

    // ===== Helper Functions =====

    /// Random tier cho NFT dựa trên số điểm
    /// 10-19: 75% tier1, 20% tier2, 5% tier3
    /// 20-29: 60% tier1, 30% tier2, 10% tier3
    /// 30+:   50% tier1, 35% tier2, 15% tier3
    fun random_nft_tier(points: u64, _ctx: &TxContext): u8 {
        // Improved random seed with sender address
        let sender_bytes = bcs::to_bytes(&tx_context::sender(_ctx));
        let sender_u64 = vector::length(&sender_bytes) as u64;
        let random_seed = tx_context::epoch(_ctx) + points + sender_u64;
        let roll = random_seed % 100; // 0-99

        if (points < 20) {
            // 10-19 points
            if (roll < 75) {
                1 // 75%
            } else if (roll < 95) {
                2 // 20%
            } else {
                3 // 5%
            }
        } else if (points < 30) {
            // 20-29 points
            if (roll < 60) {
                1 // 60%
            } else if (roll < 90) {
                2 // 30%
            } else {
                3 // 10%
            }
        } else {
            // 30+ points
            if (roll < 50) {
                1 // 50%
            } else if (roll < 85) {
                2 // 35%
            } else {
                3 // 15%
            }
        }
    }

    // ===== Test-only Functions =====

    #[test_only]
    public fun test_random_tier(points: u64, ctx: &mut TxContext): u8 {
        random_nft_tier(points, ctx)
    }
}
