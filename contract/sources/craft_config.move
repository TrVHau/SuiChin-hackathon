/// Craft configuration and admin controls.
module suichin::craft_config {
    use sui::event;

    const BPS_DENOM: u64 = 10_000;

    const E_INVALID_TIER: u64 = 502;
    const E_ZERO_FUND_AMOUNT: u64 = 504;
    const E_INVALID_FUSION_RECIPE: u64 = 510;
    const E_INVALID_SUCCESS_BPS: u64 = 511;

    const EVENT_VERSION: u64 = 1;
    const DEFAULT_INDEXER_VERSION: u64 = 1;
    const DEFAULT_CRAFT_SUCCESS_BPS: u64 = 2_000; // 20%
    const DEFAULT_MINT_POOL_CONTRIBUTION: u64 = 100_000_000; // 0.1 SUI in MIST
    const DEFAULT_SCRAP_FUSION_RECIPE: u64 = 20;
    const DEFAULT_BRONZE_RECYCLE_CHUN: u64 = 4;
    const DEFAULT_SILVER_RECYCLE_CHUN: u64 = 8;
    const DEFAULT_GOLD_RECYCLE_CHUN: u64 = 15;

    /// Admin capability to manage craft/recycle/fusion configuration.
    public struct CraftAdminCap has key, store {
        id: UID,
    }

    /// Shared config consumed by craft-related indexer flows.
    public struct SystemConfig has key {
        id: UID,
        event_version: u64,
        indexer_version: u64,
        paused: bool,
        craft_success_bps: u64,
        mint_pool_contribution: u64,
        scrap_fusion_recipe: u64,
        bronze_recycle_chun: u64,
        silver_recycle_chun: u64,
        gold_recycle_chun: u64,
        next_craft_id: u64,
    }

    public struct AdminConfigUpdated has copy, drop {
        version: u64,
        admin: address,
        indexer_version: u64,
        paused: bool,
        craft_success_bps: u64,
        mint_pool_contribution: u64,
        scrap_fusion_recipe: u64,
        bronze_recycle_chun: u64,
        silver_recycle_chun: u64,
        gold_recycle_chun: u64,
        correlation_id: u64,
    }

    fun init(ctx: &mut TxContext) {
        let config = SystemConfig {
            id: object::new(ctx),
            event_version: EVENT_VERSION,
            indexer_version: DEFAULT_INDEXER_VERSION,
            paused: false,
            craft_success_bps: DEFAULT_CRAFT_SUCCESS_BPS,
            mint_pool_contribution: DEFAULT_MINT_POOL_CONTRIBUTION,
            scrap_fusion_recipe: DEFAULT_SCRAP_FUSION_RECIPE,
            bronze_recycle_chun: DEFAULT_BRONZE_RECYCLE_CHUN,
            silver_recycle_chun: DEFAULT_SILVER_RECYCLE_CHUN,
            gold_recycle_chun: DEFAULT_GOLD_RECYCLE_CHUN,
            next_craft_id: 1,
        };
        transfer::share_object(config);

        let cap = CraftAdminCap { id: object::new(ctx) };
        transfer::transfer(cap, tx_context::sender(ctx));
    }

    fun digest_prefix_u64(ctx: &TxContext): u64 {
        let digest = tx_context::digest(ctx);
        (*vector::borrow(digest, 0) as u64)
            | ((*vector::borrow(digest, 1) as u64) << 8)
            | ((*vector::borrow(digest, 2) as u64) << 16)
            | ((*vector::borrow(digest, 3) as u64) << 24)
            | ((*vector::borrow(digest, 4) as u64) << 32)
            | ((*vector::borrow(digest, 5) as u64) << 40)
            | ((*vector::borrow(digest, 6) as u64) << 48)
            | ((*vector::borrow(digest, 7) as u64) << 56)
    }

    fun emit_admin_config_updated(config: &SystemConfig, ctx: &TxContext) {
        event::emit(AdminConfigUpdated {
            version: config.event_version,
            admin: tx_context::sender(ctx),
            indexer_version: config.indexer_version,
            paused: config.paused,
            craft_success_bps: config.craft_success_bps,
            mint_pool_contribution: config.mint_pool_contribution,
            scrap_fusion_recipe: config.scrap_fusion_recipe,
            bronze_recycle_chun: config.bronze_recycle_chun,
            silver_recycle_chun: config.silver_recycle_chun,
            gold_recycle_chun: config.gold_recycle_chun,
            correlation_id: digest_prefix_u64(ctx),
        });
    }

    public fun set_pause(
        config: &mut SystemConfig,
        _cap: &CraftAdminCap,
        paused: bool,
        ctx: &TxContext,
    ) {
        config.paused = paused;
        emit_admin_config_updated(config, ctx);
    }

    public fun set_indexer_version(
        config: &mut SystemConfig,
        _cap: &CraftAdminCap,
        version: u64,
        ctx: &TxContext,
    ) {
        config.indexer_version = version;
        emit_admin_config_updated(config, ctx);
    }

    public fun set_craft_success_bps(
        config: &mut SystemConfig,
        _cap: &CraftAdminCap,
        bps: u64,
        ctx: &TxContext,
    ) {
        assert!(bps <= BPS_DENOM, E_INVALID_SUCCESS_BPS);
        config.craft_success_bps = bps;
        emit_admin_config_updated(config, ctx);
    }

    public fun set_mint_pool_contribution(
        config: &mut SystemConfig,
        _cap: &CraftAdminCap,
        amount: u64,
        ctx: &TxContext,
    ) {
        assert!(amount > 0, E_ZERO_FUND_AMOUNT);
        config.mint_pool_contribution = amount;
        emit_admin_config_updated(config, ctx);
    }

    public fun set_scrap_fusion_recipe(
        config: &mut SystemConfig,
        _cap: &CraftAdminCap,
        scraps_required: u64,
        ctx: &TxContext,
    ) {
        assert!(scraps_required > 0, E_INVALID_FUSION_RECIPE);
        config.scrap_fusion_recipe = scraps_required;
        emit_admin_config_updated(config, ctx);
    }

    public fun set_recycle_payouts(
        config: &mut SystemConfig,
        _cap: &CraftAdminCap,
        bronze_chun: u64,
        silver_chun: u64,
        gold_chun: u64,
        ctx: &TxContext,
    ) {
        config.bronze_recycle_chun = bronze_chun;
        config.silver_recycle_chun = silver_chun;
        config.gold_recycle_chun = gold_chun;
        emit_admin_config_updated(config, ctx);
    }

    public(package) fun reserve_next_craft_id(config: &mut SystemConfig): u64 {
        let craft_id = config.next_craft_id;
        config.next_craft_id = craft_id + 1;
        craft_id
    }

    public(package) fun recycle_reward_for_tier(config: &SystemConfig, tier: u8): u64 {
        if (tier == 1) {
            config.bronze_recycle_chun
        } else if (tier == 2) {
            config.silver_recycle_chun
        } else if (tier == 3) {
            config.gold_recycle_chun
        } else {
            abort E_INVALID_TIER
        }
    }

    public fun event_version(config: &SystemConfig): u64 {
        config.event_version
    }

    public fun indexer_version(config: &SystemConfig): u64 {
        config.indexer_version
    }

    public fun paused(config: &SystemConfig): bool {
        config.paused
    }

    public fun craft_success_bps(config: &SystemConfig): u64 {
        config.craft_success_bps
    }

    public fun mint_pool_contribution(config: &SystemConfig): u64 {
        config.mint_pool_contribution
    }

    public fun scrap_fusion_recipe(config: &SystemConfig): u64 {
        config.scrap_fusion_recipe
    }

    public fun bronze_recycle_chun(config: &SystemConfig): u64 {
        config.bronze_recycle_chun
    }

    public fun default_mint_pool_contribution(): u64 {
        DEFAULT_MINT_POOL_CONTRIBUTION
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx)
    }
}
