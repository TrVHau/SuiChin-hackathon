/// Facade module for craft APIs.
///
/// Implementation is split into:
/// - `craft_config`: admin and runtime config
/// - `craft_treasury`: treasury and redemption economics
/// - `craft_actions`: gameplay actions and events
module suichin::craft {
    use sui::clock::Clock;
    use sui::coin::Coin;
    use sui::random::Random;
    use sui::sui::SUI;
    use suichin::craft_actions;
    use suichin::craft_config::{Self as config, CraftAdminCap, SystemConfig};
    use suichin::craft_treasury::{Self as treasury, Treasury};
    use suichin::cuon_chun::CuonChunNFT;
    use suichin::player_profile::PlayerProfile;
    use suichin::scrap;

    public fun current_craft_cost(treasury_obj: &Treasury): u64 {
        treasury::current_craft_cost(treasury_obj)
    }

    public fun fund_treasury(
        treasury_obj: &mut Treasury,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        treasury::fund_treasury(treasury_obj, payment, ctx);
    }

    public fun set_pause(
        config_obj: &mut SystemConfig,
        cap: &CraftAdminCap,
        paused: bool,
        ctx: &TxContext,
    ) {
        config::set_pause(config_obj, cap, paused, ctx);
    }

    public fun set_indexer_version(
        config_obj: &mut SystemConfig,
        cap: &CraftAdminCap,
        version: u64,
        ctx: &TxContext,
    ) {
        config::set_indexer_version(config_obj, cap, version, ctx);
    }

    public fun set_craft_success_bps(
        config_obj: &mut SystemConfig,
        cap: &CraftAdminCap,
        bps: u64,
        ctx: &TxContext,
    ) {
        config::set_craft_success_bps(config_obj, cap, bps, ctx);
    }

    public fun set_mint_pool_contribution(
        config_obj: &mut SystemConfig,
        cap: &CraftAdminCap,
        amount: u64,
        ctx: &TxContext,
    ) {
        config::set_mint_pool_contribution(config_obj, cap, amount, ctx);
    }

    public fun set_scrap_fusion_recipe(
        config_obj: &mut SystemConfig,
        cap: &CraftAdminCap,
        scraps_required: u64,
        ctx: &TxContext,
    ) {
        config::set_scrap_fusion_recipe(config_obj, cap, scraps_required, ctx);
    }

    public fun set_recycle_payouts(
        config_obj: &mut SystemConfig,
        cap: &CraftAdminCap,
        bronze_chun: u64,
        silver_chun: u64,
        gold_chun: u64,
        ctx: &TxContext,
    ) {
        config::set_recycle_payouts(config_obj, cap, bronze_chun, silver_chun, gold_chun, ctx);
    }

    public fun quote_redeem_amount(treasury_obj: &Treasury, tier: u8): u64 {
        treasury::quote_redeem_amount(treasury_obj, tier)
    }

    public fun craft_chun(
        profile: &mut PlayerProfile,
        treasury_obj: &mut Treasury,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        craft_actions::craft_chun(profile, treasury_obj, payment, clock, ctx);
    }

    public fun craft_chun_with_randomness(
        profile: &mut PlayerProfile,
        treasury_obj: &mut Treasury,
        config_obj: &mut SystemConfig,
        payment: Coin<SUI>,
        random_obj: &Random,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        craft_actions::craft_chun_with_randomness(
            profile,
            treasury_obj,
            config_obj,
            payment,
            random_obj,
            clock,
            ctx,
        );
    }

    public fun burn_nft_for_chun(
        profile: &mut PlayerProfile,
        config_obj: &SystemConfig,
        nft: CuonChunNFT,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        craft_actions::burn_nft_for_chun(profile, config_obj, nft, clock, ctx);
    }

    public fun burn_multiple_nfts_for_chun(
        profile: &mut PlayerProfile,
        config_obj: &SystemConfig,
        nfts: vector<CuonChunNFT>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        craft_actions::burn_multiple_nfts_for_chun(profile, config_obj, nfts, clock, ctx);
    }

    public fun recycle_scrap_for_chun(
        profile: &mut PlayerProfile,
        config_obj: &SystemConfig,
        scrap_item: scrap::Scrap,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        craft_actions::recycle_scrap_for_chun(profile, config_obj, scrap_item, clock, ctx);
    }

    public fun recycle_batch_scraps_for_chun(
        profile: &mut PlayerProfile,
        config_obj: &SystemConfig,
        scraps: vector<scrap::Scrap>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        craft_actions::recycle_batch_scraps_for_chun(profile, config_obj, scraps, clock, ctx);
    }

    public fun fuse_scraps_for_bronze(
        config_obj: &SystemConfig,
        scraps: vector<scrap::Scrap>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        craft_actions::fuse_scraps_for_bronze(config_obj, scraps, clock, ctx);
    }

    public fun fuse_scraps_for_bronze_with_randomness(
        config_obj: &SystemConfig,
        scraps: vector<scrap::Scrap>,
        random_obj: &Random,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        craft_actions::fuse_scraps_for_bronze_with_randomness(config_obj, scraps, random_obj, clock, ctx);
    }

    public fun redeem_chun(
        treasury_obj: &mut Treasury,
        nft: CuonChunNFT,
        ctx: &mut TxContext,
    ) {
        treasury::redeem_chun(treasury_obj, nft, ctx);
    }

    public fun treasury_balance(treasury_obj: &Treasury): u64 {
        treasury::treasury_balance(treasury_obj)
    }

    public fun bronze_pool_balance(treasury_obj: &Treasury): u64 {
        treasury::bronze_pool_balance(treasury_obj)
    }

    public fun silver_pool_balance(treasury_obj: &Treasury): u64 {
        treasury::silver_pool_balance(treasury_obj)
    }

    public fun gold_pool_balance(treasury_obj: &Treasury): u64 {
        treasury::gold_pool_balance(treasury_obj)
    }

    public fun total_crafts(treasury_obj: &Treasury): u64 {
        treasury::total_crafts(treasury_obj)
    }

    public fun event_version(config_obj: &SystemConfig): u64 {
        config::event_version(config_obj)
    }

    public fun indexer_version(config_obj: &SystemConfig): u64 {
        config::indexer_version(config_obj)
    }

    public fun paused(config_obj: &SystemConfig): bool {
        config::paused(config_obj)
    }

    public fun craft_success_bps(config_obj: &SystemConfig): u64 {
        config::craft_success_bps(config_obj)
    }

    public fun mint_pool_contribution(config_obj: &SystemConfig): u64 {
        config::mint_pool_contribution(config_obj)
    }

    public fun scrap_fusion_recipe(config_obj: &SystemConfig): u64 {
        config::scrap_fusion_recipe(config_obj)
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        treasury::test_init(ctx);
        config::test_init(ctx);
    }

    #[test_only]
    public fun set_total_crafts_for_testing(treasury_obj: &mut Treasury, n: u64) {
        treasury::set_total_crafts_for_testing(treasury_obj, n);
    }
}
