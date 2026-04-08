/// Config + admin controls for NFT valuation lobby.
module suichin::nft_valuation_lobby_config {
    const E_FEE_TOO_HIGH: u64 = 713;
    const E_SIGNER_NOT_FOUND: u64 = 715;
    const E_INVALID_SIGNER: u64 = 708;
    const E_INVALID_TIER: u64 = 719;

    const EVENT_VERSION: u64 = 1;
    const MAX_PLATFORM_FEE_BPS: u16 = 300; // <= 3%

    public struct LobbyAdminCap has key, store {
        id: UID,
    }

    public struct LobbyConfig has key {
        id: UID,
        tier_points_bronze: u64,
        tier_points_silver: u64,
        tier_points_gold: u64,
        coin_point_rate: u64,
        platform_fee_bps: u16,
        emergency_refund_delay_ms: u64,
        active_signer_pubkeys: vector<vector<u8>>,
        paused: bool,
        strict_equal_points: bool,
        chain_id: u8,
        treasury: address,
        event_version: u64,
    }

    fun init(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let config = LobbyConfig {
            id: object::new(ctx),
            tier_points_bronze: 100,
            tier_points_silver: 250,
            tier_points_gold: 1000,
            coin_point_rate: 1,
            platform_fee_bps: 100, // 1%
            emergency_refund_delay_ms: 86_400_000, // 24h
            active_signer_pubkeys: vector[],
            paused: false,
            strict_equal_points: false,
            chain_id: 0,
            treasury: sender,
            event_version: EVENT_VERSION,
        };
        transfer::share_object(config);

        let cap = LobbyAdminCap { id: object::new(ctx) };
        transfer::transfer(cap, sender);
    }

    fun signer_is_active(config: &LobbyConfig, signer: &vector<u8>): bool {
        let mut i = 0;
        let len = vector::length(&config.active_signer_pubkeys);
        while (i < len) {
            if (*vector::borrow(&config.active_signer_pubkeys, i) == *signer) {
                return true
            };
            i = i + 1;
        };
        false
    }

    public(package) fun require_active_signer(config: &LobbyConfig, signer: &vector<u8>) {
        assert!(signer_is_active(config, signer), E_INVALID_SIGNER);
    }

    public fun points_for_tier(config: &LobbyConfig, tier: u8): u64 {
        if (tier == 1) {
            config.tier_points_bronze
        } else if (tier == 2) {
            config.tier_points_silver
        } else if (tier == 3) {
            config.tier_points_gold
        } else {
            abort E_INVALID_TIER
        }
    }

    public fun event_version(config: &LobbyConfig): u64 {
        config.event_version
    }

    public fun coin_point_rate(config: &LobbyConfig): u64 {
        config.coin_point_rate
    }

    public fun platform_fee_bps(config: &LobbyConfig): u16 {
        config.platform_fee_bps
    }

    public fun emergency_refund_delay_ms(config: &LobbyConfig): u64 {
        config.emergency_refund_delay_ms
    }

    public fun paused(config: &LobbyConfig): bool {
        config.paused
    }

    public fun strict_equal_points(config: &LobbyConfig): bool {
        config.strict_equal_points
    }

    public fun chain_id(config: &LobbyConfig): u8 {
        config.chain_id
    }

    public fun treasury(config: &LobbyConfig): address {
        config.treasury
    }

    public fun set_pause(config: &mut LobbyConfig, _cap: &LobbyAdminCap, paused: bool) {
        config.paused = paused;
    }

    public fun set_point_rules(
        config: &mut LobbyConfig,
        _cap: &LobbyAdminCap,
        bronze_points: u64,
        silver_points: u64,
        gold_points: u64,
    ) {
        config.tier_points_bronze = bronze_points;
        config.tier_points_silver = silver_points;
        config.tier_points_gold = gold_points;
    }

    public fun set_coin_point_rate(
        config: &mut LobbyConfig,
        _cap: &LobbyAdminCap,
        coin_point_rate: u64,
    ) {
        config.coin_point_rate = coin_point_rate;
    }

    public fun set_platform_fee(
        config: &mut LobbyConfig,
        _cap: &LobbyAdminCap,
        platform_fee_bps: u16,
    ) {
        assert!(platform_fee_bps <= MAX_PLATFORM_FEE_BPS, E_FEE_TOO_HIGH);
        config.platform_fee_bps = platform_fee_bps;
    }

    public fun set_emergency_refund_delay(
        config: &mut LobbyConfig,
        _cap: &LobbyAdminCap,
        delay_ms: u64,
    ) {
        config.emergency_refund_delay_ms = delay_ms;
    }

    public fun set_chain_id(
        config: &mut LobbyConfig,
        _cap: &LobbyAdminCap,
        chain_id: u8,
    ) {
        config.chain_id = chain_id;
    }

    public fun set_treasury(
        config: &mut LobbyConfig,
        _cap: &LobbyAdminCap,
        treasury: address,
    ) {
        config.treasury = treasury;
    }

    public fun set_strict_equal_points(
        config: &mut LobbyConfig,
        _cap: &LobbyAdminCap,
        strict_equal_points: bool,
    ) {
        config.strict_equal_points = strict_equal_points;
    }

    public fun add_signer_pubkey(
        config: &mut LobbyConfig,
        _cap: &LobbyAdminCap,
        signer_pubkey: vector<u8>,
    ) {
        if (!signer_is_active(config, &signer_pubkey)) {
            vector::push_back(&mut config.active_signer_pubkeys, signer_pubkey);
        };
    }

    public fun remove_signer_pubkey(
        config: &mut LobbyConfig,
        _cap: &LobbyAdminCap,
        signer_pubkey: vector<u8>,
    ) {
        let mut i = 0;
        let len = vector::length(&config.active_signer_pubkeys);
        while (i < len) {
            if (*vector::borrow(&config.active_signer_pubkeys, i) == signer_pubkey) {
                vector::remove(&mut config.active_signer_pubkeys, i);
                return
            };
            i = i + 1;
        };
        abort E_SIGNER_NOT_FOUND
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx)
    }
}
