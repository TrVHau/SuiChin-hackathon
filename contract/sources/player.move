/// Module: player
/// Description: Quản lý PlayerProfile - thông tin người chơi
module suichin::player {
    use std::vector;
    use sui::clock::{Self, Clock};
    use sui::event;

    // ===== Errors =====
    const E_PROFILE_ALREADY_EXISTS: u64 = 1;
    const E_NOT_PROFILE_OWNER: u64 = 2;

    // ===== Structs =====

    /// PlayerProfile - Object lưu trữ trạng thái người chơi
    public struct PlayerProfile has key, store {
        id: UID,
        owner: address,
        
        // Số chun hiện có (điểm chơi game)
        tier1: u64,              // Chun đồng 🥉 (1 điểm)
        tier2: u64,              // Chun bạc 🥈 (2 điểm)
        tier3: u64,              // Chun vàng 🥇 (3 điểm)
        
        // Streak tracking
        max_streak: u64,         // Streak cao nhất từng đạt (dùng unlock achievement)
        current_streak: u64,     // Streak hiện tại (reset về 0 khi thua)
        
        // Faucet cooldown
        faucet_last_claim: u64,  // Timestamp (ms) lần xin chun cuối
        
        // Achievement tracking
        achievements: vector<u64>, // Các milestone đã claim [1, 5, 18, 36, 67]
        
        // Anti-cheat tracking
        last_session_time: u64,  // Timestamp lần record_session cuối
        total_sessions: u64,      // Tổng số session đã chơi
        
        // Metadata
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
    public entry fun create_profile(
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
            // Set faucet_last_claim xa trong quá khứ để nhận ngay 10 chun
            faucet_last_claim: 0, 
            achievements: vector::empty(),
            last_session_time: 0,
            total_sessions: 0,
            created_at: current_time,
        };

        let profile_id = object::id(&profile);

        // Emit event
        event::emit(ProfileCreated {
            profile_id,
            owner: sender,
            created_at: current_time,
        });

        // Transfer profile to owner
        transfer::transfer(profile, sender);
    }

    // ===== Public View Functions =====

    /// Lấy số chun theo tier
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

    /// Tính tổng điểm hiện có
    public fun calculate_total_points(profile: &PlayerProfile): u64 {
        profile.tier1 * 1 + profile.tier2 * 2 + profile.tier3 * 3
    }

    /// Kiểm tra đã claim achievement chưa
    public fun has_achievement(profile: &PlayerProfile, milestone: u64): bool {
        vector::contains(&profile.achievements, &milestone)
    }

    /// Lấy owner
    public fun owner(profile: &PlayerProfile): address {
        profile.owner
    }

    /// Lấy max streak
    public fun max_streak(profile: &PlayerProfile): u64 {
        profile.max_streak
    }

    /// Lấy current streak
    public fun current_streak(profile: &PlayerProfile): u64 {
        profile.current_streak
    }

    /// Lấy faucet last claim
    public fun faucet_last_claim(profile: &PlayerProfile): u64 {
        profile.faucet_last_claim
    }

    /// Lấy last session time
    public fun last_session_time(profile: &PlayerProfile): u64 {
        profile.last_session_time
    }

    // ===== Package-only Functions (Friend) =====

    /// Cập nhật số chun (dùng bởi game module)
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

    /// Cập nhật streak (dùng bởi game module)
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

    /// Cập nhật faucet claim time
    public(package) fun update_faucet_claim_time(
        profile: &mut PlayerProfile,
        timestamp: u64,
    ) {
        profile.faucet_last_claim = timestamp;
    }

    /// Cập nhật session time
    public(package) fun update_session_time(
        profile: &mut PlayerProfile,
        timestamp: u64,
    ) {
        profile.last_session_time = timestamp;
        profile.total_sessions = profile.total_sessions + 1;
    }

    /// Thêm achievement
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
