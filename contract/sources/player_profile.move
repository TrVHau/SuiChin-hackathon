/// Module quản lý PlayerProfile — trạng thái on-chain mỗi ví.
/// Mỗi ví tạo 1 profile bằng init_profile(), sau mỗi ván gọi
/// report_result() để cập nhật chun_raw, wins, losses, streak.
module suichin::player_profile {
    use sui::clock::{Self, Clock};
    use sui::event;

    // ─── Constants ────────────────────────────────────────────────────────────
    const COOLDOWN_MS: u64     = 10_000; // 10 giây giữa hai lần report_result
    const MAX_DELTA_CHUN: u64  = 20;     // delta tối đa mỗi ván

    // ─── Error codes ──────────────────────────────────────────────────────────
    const E_NOT_OWNER:          u64 = 100;
    const E_COOLDOWN_ACTIVE:    u64 = 101;
    const E_DELTA_TOO_LARGE:    u64 = 102;
    const E_INSUFFICIENT_CHUN:  u64 = 103;

    // ─── Structs ──────────────────────────────────────────────────────────────
    /// 1 object per wallet — owned bởi sender sau init_profile()
    public struct PlayerProfile has key {
        id: UID,
        owner: address,
        chun_raw: u64,
        wins: u64,
        losses: u64,
        streak: u64,
        last_played_ms: u64, // anti-spam cooldown timestamp
    }

    // ─── Events ───────────────────────────────────────────────────────────────
    public struct ProfileCreated has copy, drop {
        owner: address,
    }

    public struct ResultReported has copy, drop {
        owner: address,
        delta: u64,
        is_win: bool,
        new_chun_raw: u64,
    }

    // ─── Entry Functions ──────────────────────────────────────────────────────

    /// Tạo PlayerProfile cho sender. Gọi 1 lần khi connect ví lần đầu.
    public fun init_profile(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let profile = PlayerProfile {
            id: object::new(ctx),
            owner: sender,
            chun_raw: 0,
            wins: 0,
            losses: 0,
            streak: 0,
            last_played_ms: 0,
        };
        event::emit(ProfileCreated { owner: sender });
        transfer::transfer(profile, sender);
    }

    /// Cập nhật chun_raw + stats sau mỗi ván.
    /// Thắng: chun_raw += delta, wins++, streak++
    /// Thua:  chun_raw -= 1 (sàn 0), losses++, streak = 0
    public fun report_result(
        profile: &mut PlayerProfile,
        delta: u64,
        is_win: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == profile.owner, E_NOT_OWNER);

        let clock_ms = clock::timestamp_ms(clock);
        // Bỏ qua cooldown nếu chưa từng chơi (last_played_ms == 0)
        assert!(
            profile.last_played_ms == 0 || clock_ms - profile.last_played_ms >= COOLDOWN_MS,
            E_COOLDOWN_ACTIVE
        );
        assert!(delta <= MAX_DELTA_CHUN, E_DELTA_TOO_LARGE);

        if (is_win) {
            profile.chun_raw = profile.chun_raw + delta;
            profile.wins = profile.wins + 1;
            profile.streak = profile.streak + 1;
        } else {
            profile.chun_raw = if (profile.chun_raw > 0) { profile.chun_raw - 1 } else { 0 };
            profile.losses = profile.losses + 1;
            profile.streak = 0;
        };
        profile.last_played_ms = clock_ms;

        event::emit(ResultReported {
            owner: sender,
            delta,
            is_win,
            new_chun_raw: profile.chun_raw,
        });
    }

    // ─── Public Accessors ─────────────────────────────────────────────────────

    public fun chun_raw(profile: &PlayerProfile): u64 { profile.chun_raw }
    public fun streak(profile: &PlayerProfile): u64   { profile.streak }
    public fun wins(profile: &PlayerProfile): u64     { profile.wins }
    public fun losses(profile: &PlayerProfile): u64   { profile.losses }
    public fun owner(profile: &PlayerProfile): address { profile.owner }

    // ─── Package-internal Helpers ─────────────────────────────────────────────

    /// Trừ chun_raw (chỉ gọi được từ trong package — ví dụ craft.move).
    /// Abort nếu số dư không đủ.
    public(package) fun spend_chun(profile: &mut PlayerProfile, amount: u64) {
        assert!(profile.chun_raw >= amount, E_INSUFFICIENT_CHUN);
        profile.chun_raw = profile.chun_raw - amount;
    }

    // ─── Test-only Helpers ───────────────────────────────────────────────────────────

    #[test_only]
    public fun set_chun_raw_for_testing(profile: &mut PlayerProfile, amount: u64) {
        profile.chun_raw = amount;
    }
}
