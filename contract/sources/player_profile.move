/// Module quản lý PlayerProfile — trạng thái on-chain mỗi ví.
/// Mỗi ví tạo 1 profile bằng init_profile(), sau mỗi ván gọi
/// report_result() để cập nhật chun_raw, wins, losses, streak.
/// Mới: faucet tich lũy chun 2h/lan, và PvP staking qua MatchOracle.
module suichin::player_profile {
    use sui::clock::{Self, Clock};
    use sui::event;

    // ─── Constants ───────────────────────────────────────────────────────────────
    const COOLDOWN_MS: u64          = 10_000;     // 10 giây giữa hai lần report_result
    const MAX_DELTA_CHUN: u64       = 20;          // delta tối đa mỗi ván
    //const FAUCET_COOLDOWN_MS: u64   = 7_200_000;  // 2 giờ giữa mỗi 1 chun tich lũy
    const FAUCET_COOLDOWN_MS: u64   = 60_000;     // (test-only) 1 phút giữa mỗi 1 chun tich lũy
    const FAUCET_MAX_STACK: u64     = 10;          // tối đa chun stack được

    // ─── Error codes ────────────────────────────────────────────────────────────
    const E_NOT_OWNER:                u64 = 100;
    const E_COOLDOWN_ACTIVE:          u64 = 101;
    const E_DELTA_TOO_LARGE:          u64 = 102;
    const E_INSUFFICIENT_CHUN:        u64 = 103;
    const E_FAUCET_NOTHING_TO_CLAIM:  u64 = 104;
    const E_INSUFFICIENT_STAKED:      u64 = 105;

    // ─── Structs ──────────────────────────────────────────────────────────────
    /// 1 object per wallet — owned bởi sender sau init_profile()
    public struct PlayerProfile has key {
        id: UID,
        owner: address,
        chun_raw: u64,
        wins: u64,
        losses: u64,
        streak: u64,
        last_played_ms: u64,  // anti-spam cooldown timestamp
        staked_chun: u64,     // chun đang lòck cho PvP match
        last_faucet_ms: u64,  // timestamp claim faucet cuối (0 = chưa claim)
    }

    /// Capability được giữ bởi backend — chỉ holder mới gọi resolve_match().
    public struct MatchOracle has key, store {
        id: UID,
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

    public struct FaucetClaimed has copy, drop {
        owner: address,
        amount: u64,
        new_chun_raw: u64,
    }

    public struct MatchLocked has copy, drop {
        owner: address,
        amount: u64,
    }

    public struct MatchResolved has copy, drop {
        winner: address,
        loser: address,
        amount: u64,
    }

    // ─── Init ───────────────────────────────────────────────────────────────

    /// Tạo MatchOracle và transfer cho deployer khi publish package.
    fun init(ctx: &mut TxContext) {
        let oracle = MatchOracle { id: object::new(ctx) };
        transfer::transfer(oracle, tx_context::sender(ctx));
    }

    // ─── Entry Functions ───────────────────────────────────────────────────────

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
            staked_chun: 0,
            last_faucet_ms: 0,
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

    public fun chun_raw(profile: &PlayerProfile): u64      { profile.chun_raw }
    public fun streak(profile: &PlayerProfile): u64        { profile.streak }
    public fun wins(profile: &PlayerProfile): u64          { profile.wins }
    public fun losses(profile: &PlayerProfile): u64        { profile.losses }
    public fun owner(profile: &PlayerProfile): address     { profile.owner }
    public fun staked_chun(profile: &PlayerProfile): u64   { profile.staked_chun }
    public fun last_faucet_ms(profile: &PlayerProfile): u64 { profile.last_faucet_ms }

    /// View: số chun đang tích lũy chưa claim (0 nếu chưa đủ 1 chu kỳ).
    public fun pending_faucet(profile: &PlayerProfile, clock: &Clock): u64 {
        let now = clock::timestamp_ms(clock);
        // last_faucet_ms == 0 → chưa claim lần nào, now - 0 = now (rất lớn) → cap = MAX_STACK
        let elapsed_ms = now - profile.last_faucet_ms;
        let pending = elapsed_ms / FAUCET_COOLDOWN_MS;
        if (pending > FAUCET_MAX_STACK) { FAUCET_MAX_STACK } else { pending }
    }

    // ─── Package-internal Helpers ─────────────────────────────────────────────

    /// Trừ chun_raw (chỉ gọi được từ trong package — ví dụ craft.move).
    /// Abort nếu số dư không đủ.
    public(package) fun spend_chun(profile: &mut PlayerProfile, amount: u64) {
        assert!(profile.chun_raw >= amount, E_INSUFFICIENT_CHUN);
        profile.chun_raw = profile.chun_raw - amount;
    }

    /// Hoàn trả staked chun vào chun_raw (dùng khi match bị hủy).
    public(package) fun unlock_from_match(profile: &mut PlayerProfile, amount: u64) {
        assert!(profile.staked_chun >= amount, E_INSUFFICIENT_STAKED);
        profile.staked_chun = profile.staked_chun - amount;
        profile.chun_raw = profile.chun_raw + amount;
    }

    // ─── Faucet ──────────────────────────────────────────────────────────────

    /// Claim toàn bộ chun đang tích lũy.
    /// Abort E_FAUCET_NOTHING_TO_CLAIM nếu chưa đủ 1 chu kỳ (7200 giây).
    public fun claim_faucet(
        profile: &mut PlayerProfile,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == profile.owner, E_NOT_OWNER);
        let amount = pending_faucet(profile, clock);
        assert!(amount > 0, E_FAUCET_NOTHING_TO_CLAIM);
        profile.chun_raw = profile.chun_raw + amount;
        profile.last_faucet_ms = clock::timestamp_ms(clock);
        event::emit(FaucetClaimed {
            owner: profile.owner,
            amount,
            new_chun_raw: profile.chun_raw,
        });
    }

    // ─── PvP Staking ─────────────────────────────────────────────────────────

    /// Lock `amount` chun_raw → staked_chun trước khi vào PvP match.
    /// Chỉ owner của profile mới gọi được.
    public fun lock_for_match(
        profile: &mut PlayerProfile,
        amount: u64,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == profile.owner, E_NOT_OWNER);
        assert!(profile.chun_raw >= amount, E_INSUFFICIENT_CHUN);
        profile.chun_raw = profile.chun_raw - amount;
        profile.staked_chun = profile.staked_chun + amount;
        event::emit(MatchLocked { owner: profile.owner, amount });
    }

    /// Chuyển `amount` staked_chun từ loser → winner.chun_raw.
    /// Chỉ MatchOracle holder mới gọi được.
    public fun resolve_match(
        winner: &mut PlayerProfile,
        loser: &mut PlayerProfile,
        amount: u64,
        _oracle: &MatchOracle,
    ) {
        assert!(loser.staked_chun >= amount, E_INSUFFICIENT_STAKED);
        loser.staked_chun = loser.staked_chun - amount;
        winner.chun_raw = winner.chun_raw + amount;
        event::emit(MatchResolved {
            winner: winner.owner,
            loser: loser.owner,
            amount,
        });
    }

    // ─── Test-only Helpers ────────────────────────────────────────────────────

    #[test_only]
    public fun set_chun_raw_for_testing(profile: &mut PlayerProfile, amount: u64) {
        profile.chun_raw = amount;
    }

    #[test_only]
    public fun create_match_oracle_for_testing(ctx: &mut TxContext): MatchOracle {
        MatchOracle { id: object::new(ctx) }
    }
}
