module suichin::player {
    use sui::clock::{Self, Clock};
    use sui::event;

    // ===== Structs =====

    /// PlayerProfile - Object lưu trữ trạng thái người chơi
    public struct PlayerProfile has key {
        id: UID,
        owner: address,
        
        tier1: u64,              // Chun đồng 🥉 (1 điểm)
        tier2: u64,              // Chun bạc 🥈 (2 điểm)
        tier3: u64,              // Chun vàng 🥇 (3 điểm)
        
        max_streak: u64,         // Streak cao nhất từng đạt (dùng unlock achievement)
        current_streak: u64,     // Streak hiện tại (reset về 0 khi thua)
        
        faucet_last_claim: u64,  // Timestamp (ms) lần xin chun cuối
        
        achievements: vector<u64>, // Các milestone đã claim [1, 5, 18, 36, 67]
        
        last_session_time: u64,  // Timestamp lần record_session cuối
        total_sessions: u64,      // Tổng số session đã chơi
        
        created_at: u64,          // Timestamp tạo profile
    }

    // ===== Events =====

    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        owner: address,
        created_at: u64,
    }

    public struct ChunUpdated has copy, drop {
        profile_id: ID,
        tier1: u64,
        tier2: u64,
        tier3: u64,
    }

    public struct StreakUpdated has copy, drop {
        profile_id: ID,
        max_streak: u64,
        current_streak: u64,
    }

    // ===== Public Functions =====

    /// Tạo profile mới cho người chơi
    /// Chỉ được gọi 1 lần cho mỗi address
    #[allow(lint(self_transfer))]
    public fun create_profile(
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        let profile = PlayerProfile {
            id: object::new(ctx),
            owner: sender,
            tier1: 0,
            tier2: 0,
            tier3: 0,
            max_streak: 0,
            current_streak: 0,
            faucet_last_claim: 0, 
            achievements: vector::empty(),
            last_session_time: 0,
            total_sessions: 0,
            created_at: current_time,
        };

        let profile_id = object::id(&profile);

        event::emit(ProfileCreated {
            profile_id,
            owner: sender,
            created_at: current_time,
        });

        transfer::transfer(profile, sender);
    }

    // ===== Public View Functions =====

    public fun get_chun(profile: &PlayerProfile, tier: u8): u64 {
        if (tier == 1) {
            profile.tier1
        } else if (tier == 2) {
            profile.tier2
        } else if (tier == 3) {
            profile.tier3
        } else {
            0
        }
    }

    public fun calculate_total_points(profile: &PlayerProfile): u64 {
        profile.tier1 * 1 + profile.tier2 * 2 + profile.tier3 * 3
    }

    public fun has_achievement(profile: &PlayerProfile, milestone: u64): bool {
        vector::contains(&profile.achievements, &milestone)
    }

    public fun owner(profile: &PlayerProfile): address {
        profile.owner
    }

    public fun max_streak(profile: &PlayerProfile): u64 {
        profile.max_streak
    }

    public fun current_streak(profile: &PlayerProfile): u64 {
        profile.current_streak
    }

    public fun faucet_last_claim(profile: &PlayerProfile): u64 {
        profile.faucet_last_claim
    }

    public fun last_session_time(profile: &PlayerProfile): u64 {
        profile.last_session_time
    }

    public fun total_sessions(profile: &PlayerProfile): u64 {
        profile.total_sessions
    }

    public fun get_max_streak(profile: &PlayerProfile): u64 {
        profile.max_streak
    }

    public fun get_current_streak(profile: &PlayerProfile): u64 {
        profile.current_streak
    }

    public fun get_last_session_time(profile: &PlayerProfile): u64 {
        profile.last_session_time
    }

    public fun get_total_sessions(profile: &PlayerProfile): u64 {
        profile.total_sessions
    }


    public(package) fun update_chun(
        profile: &mut PlayerProfile,
        tier1_new: u64,
        tier2_new: u64,
        tier3_new: u64,
    ) {
        profile.tier1 = tier1_new;
        profile.tier2 = tier2_new;
        profile.tier3 = tier3_new;

        event::emit(ChunUpdated {
            profile_id: object::id(profile),
            tier1: tier1_new,
            tier2: tier2_new,
            tier3: tier3_new,
        });
    }

    public(package) fun update_streak(
        profile: &mut PlayerProfile,
        new_max_streak: u64,
        new_current_streak: u64,
    ) {
        profile.max_streak = new_max_streak;
        profile.current_streak = new_current_streak;

        event::emit(StreakUpdated {
            profile_id: object::id(profile),
            max_streak: new_max_streak,
            current_streak: new_current_streak,
        });
    }

    public(package) fun update_faucet_claim_time(
        profile: &mut PlayerProfile,
        timestamp: u64,
    ) {
        profile.faucet_last_claim = timestamp;
    }

    public(package) fun update_session_time(
        profile: &mut PlayerProfile,
        timestamp: u64,
    ) {
        profile.last_session_time = timestamp;
        profile.total_sessions = profile.total_sessions + 1;
    }

    public(package) fun update_session_tracking(
        profile: &mut PlayerProfile,
        timestamp: u64,
    ) {
        update_session_time(profile, timestamp);
    }

    public(package) fun add_achievement(
        profile: &mut PlayerProfile,
        milestone: u64,
    ) {
        if (!vector::contains(&profile.achievements, &milestone)) {
            vector::push_back(&mut profile.achievements, milestone);
        }
    }

    // ===== Test-only Functions =====

    #[test_only]
    public fun create_profile_for_testing(ctx: &mut TxContext): PlayerProfile {
        PlayerProfile {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            tier1: 10,
            tier2: 5,
            tier3: 2,
            max_streak: 10,
            current_streak: 5,
            faucet_last_claim: 0,
            achievements: vector::empty(),
            last_session_time: 0,
            total_sessions: 0,
            created_at: 0,
        }
    }
}
