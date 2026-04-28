/// Craft, recycle and fusion gameplay actions.
module suichin::craft_actions {
    use std::bcs;
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::random::{Self, Random};
    use sui::sui::SUI;
    use suichin::craft_config::{Self as craft_config, SystemConfig};
    use suichin::craft_treasury::{Self as craft_treasury, Treasury};
    use suichin::cuon_chun::{Self, CuonChunNFT};
    use suichin::player_profile::{Self, PlayerProfile};
    use suichin::scrap;

    // Variant counts per tier.
    const BRONZE_VARIANTS: u64 = 4;
    const SILVER_VARIANTS: u64 = 4;
    const GOLD_VARIANTS: u64 = 3;

    // Roll ranges for legacy pseudo-random craft flow.
    const ROLL_BRONZE_START: u64 = 80;
    const ROLL_SILVER_START: u64 = 92;
    const ROLL_GOLD_START: u64 = 98;

    // Errors.
    const E_INSUFFICIENT_MINT_PAYMENT: u64 = 500;
    const E_NOT_OWNER: u64 = 501;
    const E_PAUSED: u64 = 508;
    const E_WRONG_SCRAP_COUNT: u64 = 509;
    const E_INVALID_FUSION_RECIPE: u64 = 510;

    public struct CraftResult has copy, drop {
        crafter: address,
        success: bool,
        tier: u8, // 0 if Scrap
        roll: u64, // raw roll 0..99
        chun_spent: u64,
        sui_paid: u64,
    }

    public struct CraftRequested has copy, drop {
        version: u64,
        craft_id: u64,
        player: address,
        chun_spent: u64,
        sui_paid: u64,
        timestamp_ms: u64,
        correlation_id: u64,
    }

    public struct CraftRandomnessFulfilled has copy, drop {
        version: u64,
        craft_id: u64,
        player: address,
        random_value: u64,
        timestamp_ms: u64,
        correlation_id: u64,
    }

    public struct CraftResultFinalized has copy, drop {
        version: u64,
        craft_id: u64,
        player: address,
        random_value: u64,
        is_success: bool,
        tier: u8,
        nft_minted_id: Option<ID>,
        timestamp_ms: u64,
        correlation_id: u64,
    }

    public struct RecycleRewardIssued has copy, drop {
        version: u64,
        actor: address,
        burned_asset_id: ID,
        burned_asset_type: u8, // 1 = CuonChunNFT, 2 = Scrap
        reward_chun: u64,
        tier: u8,
        timestamp_ms: u64,
        correlation_id: u64,
    }

    public struct ScrapsFused has copy, drop {
        version: u64,
        actor: address,
        scraps_burned: u64,
        minted_tier: u8,
        minted_variant: u8,
        minted_nft_id: ID,
        timestamp_ms: u64,
        correlation_id: u64,
    }

    public struct InventoryChanged has copy, drop {
        version: u64,
        actor: address,
        action: vector<u8>,
        amount: u64,
        tier: u8,
        timestamp_ms: u64,
        correlation_id: u64,
    }

    fun roll_rng(clock: &Clock, ctx: &TxContext): u64 {
        let clock_ms = clock::timestamp_ms(clock);
        let epoch = tx_context::epoch(ctx);
        let sender = tx_context::sender(ctx);
        let addr_bytes = bcs::to_bytes(&sender);

        let addr_seed: u64 =
            (*vector::borrow(&addr_bytes, 0) as u64) |
            ((*vector::borrow(&addr_bytes, 1) as u64) << 8) |
            ((*vector::borrow(&addr_bytes, 2) as u64) << 16) |
            ((*vector::borrow(&addr_bytes, 3) as u64) << 24) |
            ((*vector::borrow(&addr_bytes, 4) as u64) << 32) |
            ((*vector::borrow(&addr_bytes, 5) as u64) << 40) |
            ((*vector::borrow(&addr_bytes, 6) as u64) << 48) |
            ((*vector::borrow(&addr_bytes, 7) as u64) << 56);

        let seed = clock_ms ^ (epoch * 1_000_003) ^ addr_seed;
        seed % 100
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

    fun burn_scrap_vector(mut scraps: vector<scrap::Scrap>) {
        let len = vector::length(&scraps);
        let mut i = 0;
        while (i < len) {
            let s = vector::pop_back(&mut scraps);
            scrap::burn(s);
            i = i + 1;
        };
        vector::destroy_empty(scraps);
    }

    /// Craft Chun NFT or Scrap using legacy pseudo-random roll.
    /// Requires SUI contribution to treasury on each craft.
    #[allow(lint(self_transfer))]
    public fun craft_chun(
        profile: &mut PlayerProfile,
        treasury: &mut Treasury,
        mut payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == player_profile::owner(profile), E_NOT_OWNER);

        let deposit_amount = craft_config::default_mint_pool_contribution();
        assert!(coin::value(&payment) >= deposit_amount, E_INSUFFICIENT_MINT_PAYMENT);

        let chun_cost = craft_treasury::current_craft_cost(treasury);
        player_profile::spend_chun(profile, chun_cost);

        let deposit_coin = coin::split(&mut payment, deposit_amount, ctx);
        craft_treasury::apply_craft_deposit(treasury, deposit_coin, ctx);

        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, sender);
        } else {
            coin::destroy_zero(payment);
        };

        let roll = roll_rng(clock, ctx);
        let variant_seed = clock::timestamp_ms(clock) ^ craft_treasury::total_crafts(treasury);

        if (roll < ROLL_BRONZE_START) {
            let s = scrap::mint(ctx);
            transfer::public_transfer(s, sender);
            event::emit(CraftResult {
                crafter: sender,
                success: false,
                tier: 0,
                roll,
                chun_spent: chun_cost,
                sui_paid: deposit_amount,
            });
        } else if (roll < ROLL_SILVER_START) {
            let variant = ((variant_seed % BRONZE_VARIANTS) + 1) as u8;
            let nft = cuon_chun::mint(1, variant, ctx);
            transfer::public_transfer(nft, sender);
            craft_treasury::increment_total_crafts(treasury);
            event::emit(CraftResult {
                crafter: sender,
                success: true,
                tier: 1,
                roll,
                chun_spent: chun_cost,
                sui_paid: deposit_amount,
            });
        } else if (roll < ROLL_GOLD_START) {
            let variant = ((variant_seed % SILVER_VARIANTS) + 1) as u8;
            let nft = cuon_chun::mint(2, variant, ctx);
            transfer::public_transfer(nft, sender);
            craft_treasury::increment_total_crafts(treasury);
            event::emit(CraftResult {
                crafter: sender,
                success: true,
                tier: 2,
                roll,
                chun_spent: chun_cost,
                sui_paid: deposit_amount,
            });
        } else {
            let variant = ((variant_seed % GOLD_VARIANTS) + 1) as u8;
            let nft = cuon_chun::mint(3, variant, ctx);
            transfer::public_transfer(nft, sender);
            craft_treasury::increment_total_crafts(treasury);
            event::emit(CraftResult {
                crafter: sender,
                success: true,
                tier: 3,
                roll,
                chun_spent: chun_cost,
                sui_paid: deposit_amount,
            });
        };
    }

    /// Native-random craft flow for indexer + VRF-like transparency.
    #[allow(lint(public_random), lint(self_transfer))]
    public fun craft_chun_with_randomness(
        profile: &mut PlayerProfile,
        treasury: &mut Treasury,
        config: &mut SystemConfig,
        mut payment: Coin<SUI>,
        random_obj: &Random,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == player_profile::owner(profile), E_NOT_OWNER);
        assert!(!craft_config::paused(config), E_PAUSED);

        let deposit_amount = craft_config::mint_pool_contribution(config);
        assert!(coin::value(&payment) >= deposit_amount, E_INSUFFICIENT_MINT_PAYMENT);

        let craft_id = craft_config::reserve_next_craft_id(config);
        let chun_cost = craft_treasury::current_craft_cost(treasury);
        player_profile::spend_chun(profile, chun_cost);

        let deposit_coin = coin::split(&mut payment, deposit_amount, ctx);
        craft_treasury::apply_craft_deposit(treasury, deposit_coin, ctx);

        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, sender);
        } else {
            coin::destroy_zero(payment);
        };

        let timestamp_ms = clock::timestamp_ms(clock);
        let event_version = craft_config::event_version(config);

        event::emit(CraftRequested {
            version: event_version,
            craft_id,
            player: sender,
            chun_spent: chun_cost,
            sui_paid: deposit_amount,
            timestamp_ms,
            correlation_id: craft_id,
        });

        let mut generator = random::new_generator(random_obj, ctx);
        let random_value_u8 = random::generate_u8_in_range(&mut generator, 1, 100);
        let random_value = random_value_u8 as u64;
        event::emit(CraftRandomnessFulfilled {
            version: event_version,
            craft_id,
            player: sender,
            random_value,
            timestamp_ms,
            correlation_id: craft_id,
        });

        let success = random_value * 100 <= craft_config::craft_success_bps(config);
        if (success) {
            let variant = random::generate_u8_in_range(&mut generator, 1, BRONZE_VARIANTS as u8);
            let nft = cuon_chun::mint(1, variant, ctx);
            let minted_nft_id = object::id(&nft);
            transfer::public_transfer(nft, sender);
            craft_treasury::increment_total_crafts(treasury);

            event::emit(CraftResultFinalized {
                version: event_version,
                craft_id,
                player: sender,
                random_value,
                is_success: true,
                tier: 1,
                nft_minted_id: option::some(minted_nft_id),
                timestamp_ms,
                correlation_id: craft_id,
            });
            event::emit(InventoryChanged {
                version: event_version,
                actor: sender,
                action: b"CRAFT_MINT_NFT",
                amount: 1,
                tier: 1,
                timestamp_ms,
                correlation_id: craft_id,
            });

            // Keep legacy event for backward compatibility with existing indexers.
            event::emit(CraftResult {
                crafter: sender,
                success: true,
                tier: 1,
                roll: random_value - 1,
                chun_spent: chun_cost,
                sui_paid: deposit_amount,
            });
        } else {
            let s = scrap::mint(ctx);
            transfer::public_transfer(s, sender);

            event::emit(CraftResultFinalized {
                version: event_version,
                craft_id,
                player: sender,
                random_value,
                is_success: false,
                tier: 0,
                nft_minted_id: option::none(),
                timestamp_ms,
                correlation_id: craft_id,
            });
            event::emit(InventoryChanged {
                version: event_version,
                actor: sender,
                action: b"CRAFT_MINT_SCRAP",
                amount: 1,
                tier: 0,
                timestamp_ms,
                correlation_id: craft_id,
            });
            event::emit(CraftResult {
                crafter: sender,
                success: false,
                tier: 0,
                roll: random_value - 1,
                chun_spent: chun_cost,
                sui_paid: deposit_amount,
            });
        };
    }

    public fun burn_nft_for_chun(
        profile: &mut PlayerProfile,
        config: &SystemConfig,
        nft: CuonChunNFT,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == player_profile::owner(profile), E_NOT_OWNER);
        assert!(!craft_config::paused(config), E_PAUSED);

        let nft_id = object::id(&nft);
        let tier = cuon_chun::tier(&nft);
        let reward = craft_config::recycle_reward_for_tier(config, tier);
        cuon_chun::burn(nft);
        player_profile::credit_chun(profile, reward);

        let timestamp_ms = clock::timestamp_ms(clock);
        let correlation_id = digest_prefix_u64(ctx);
        let event_version = craft_config::event_version(config);
        event::emit(RecycleRewardIssued {
            version: event_version,
            actor: sender,
            burned_asset_id: nft_id,
            burned_asset_type: 1,
            reward_chun: reward,
            tier,
            timestamp_ms,
            correlation_id,
        });
        event::emit(InventoryChanged {
            version: event_version,
            actor: sender,
            action: b"BURN_NFT_FOR_CHUN",
            amount: reward,
            tier,
            timestamp_ms,
            correlation_id,
        });
    }

    public fun burn_multiple_nfts_for_chun(
        profile: &mut PlayerProfile,
        config: &SystemConfig,
        mut nfts: vector<CuonChunNFT>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == player_profile::owner(profile), E_NOT_OWNER);
        assert!(!craft_config::paused(config), E_PAUSED);

        let timestamp_ms = clock::timestamp_ms(clock);
        let correlation_id = digest_prefix_u64(ctx);
        let event_version = craft_config::event_version(config);
        let mut total_reward = 0;
        let len = vector::length(&nfts);
        let mut i = 0;
        while (i < len) {
            let nft = vector::pop_back(&mut nfts);
            let nft_id = object::id(&nft);
            let tier = cuon_chun::tier(&nft);
            let reward = craft_config::recycle_reward_for_tier(config, tier);
            cuon_chun::burn(nft);
            total_reward = total_reward + reward;
            event::emit(RecycleRewardIssued {
                version: event_version,
                actor: sender,
                burned_asset_id: nft_id,
                burned_asset_type: 1,
                reward_chun: reward,
                tier,
                timestamp_ms,
                correlation_id,
            });
            i = i + 1;
        };
        vector::destroy_empty(nfts);
        player_profile::credit_chun(profile, total_reward);
        event::emit(InventoryChanged {
            version: event_version,
            actor: sender,
            action: b"BURN_NFT_BATCH_FOR_CHUN",
            amount: total_reward,
            tier: 0,
            timestamp_ms,
            correlation_id,
        });
    }

    public fun recycle_scrap_for_chun(
        profile: &mut PlayerProfile,
        config: &SystemConfig,
        scrap_item: scrap::Scrap,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == player_profile::owner(profile), E_NOT_OWNER);
        assert!(!craft_config::paused(config), E_PAUSED);

        let scrap_id = object::id(&scrap_item);
        let reward = craft_config::bronze_recycle_chun(config);
        scrap::burn(scrap_item);
        player_profile::credit_chun(profile, reward);

        let timestamp_ms = clock::timestamp_ms(clock);
        let correlation_id = digest_prefix_u64(ctx);
        let event_version = craft_config::event_version(config);
        event::emit(RecycleRewardIssued {
            version: event_version,
            actor: sender,
            burned_asset_id: scrap_id,
            burned_asset_type: 2,
            reward_chun: reward,
            tier: 0,
            timestamp_ms,
            correlation_id,
        });
        event::emit(InventoryChanged {
            version: event_version,
            actor: sender,
            action: b"RECYCLE_SCRAP_FOR_CHUN",
            amount: reward,
            tier: 0,
            timestamp_ms,
            correlation_id,
        });
    }

    public fun recycle_batch_scraps_for_chun(
        profile: &mut PlayerProfile,
        config: &SystemConfig,
        mut scraps: vector<scrap::Scrap>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == player_profile::owner(profile), E_NOT_OWNER);
        assert!(!craft_config::paused(config), E_PAUSED);

        let timestamp_ms = clock::timestamp_ms(clock);
        let correlation_id = digest_prefix_u64(ctx);
        let event_version = craft_config::event_version(config);
        let reward_each = craft_config::bronze_recycle_chun(config);
        let len = vector::length(&scraps);
        let mut i = 0;
        while (i < len) {
            let scrap_item = vector::pop_back(&mut scraps);
            let scrap_id = object::id(&scrap_item);
            scrap::burn(scrap_item);
            event::emit(RecycleRewardIssued {
                version: event_version,
                actor: sender,
                burned_asset_id: scrap_id,
                burned_asset_type: 2,
                reward_chun: reward_each,
                tier: 0,
                timestamp_ms,
                correlation_id,
            });
            i = i + 1;
        };
        vector::destroy_empty(scraps);
        let total_reward = len * reward_each;
        player_profile::credit_chun(profile, total_reward);
        event::emit(InventoryChanged {
            version: event_version,
            actor: sender,
            action: b"RECYCLE_SCRAP_BATCH_FOR_CHUN",
            amount: total_reward,
            tier: 0,
            timestamp_ms,
            correlation_id,
        });
    }

    /// Current economy recipe: 20 Scrap -> 1 Bronze NFT (no extra SUI fee).
    #[allow(lint(self_transfer))]
    public fun fuse_scraps_for_bronze(
        config: &SystemConfig,
        scraps: vector<scrap::Scrap>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(!craft_config::paused(config), E_PAUSED);
        let recipe = craft_config::scrap_fusion_recipe(config);
        assert!(recipe > 0, E_INVALID_FUSION_RECIPE);
        assert!(vector::length(&scraps) == recipe, E_WRONG_SCRAP_COUNT);
        burn_scrap_vector(scraps);

        let sender = tx_context::sender(ctx);
        let minted_variant = 1;
        let nft = cuon_chun::mint(1, minted_variant, ctx);
        let minted_nft_id = object::id(&nft);
        transfer::public_transfer(nft, sender);

        let timestamp_ms = clock::timestamp_ms(clock);
        let correlation_id = digest_prefix_u64(ctx);
        let event_version = craft_config::event_version(config);
        event::emit(ScrapsFused {
            version: event_version,
            actor: sender,
            scraps_burned: recipe,
            minted_tier: 1,
            minted_variant,
            minted_nft_id,
            timestamp_ms,
            correlation_id,
        });
        event::emit(InventoryChanged {
            version: event_version,
            actor: sender,
            action: b"SCRAPS_FUSED_TO_BRONZE",
            amount: recipe,
            tier: 1,
            timestamp_ms,
            correlation_id,
        });
    }

    /// Optional variant path using native randomness.
    #[allow(lint(public_random), lint(self_transfer))]
    public fun fuse_scraps_for_bronze_with_randomness(
        config: &SystemConfig,
        scraps: vector<scrap::Scrap>,
        random_obj: &Random,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(!craft_config::paused(config), E_PAUSED);
        let recipe = craft_config::scrap_fusion_recipe(config);
        assert!(recipe > 0, E_INVALID_FUSION_RECIPE);
        assert!(vector::length(&scraps) == recipe, E_WRONG_SCRAP_COUNT);
        burn_scrap_vector(scraps);

        let mut generator = random::new_generator(random_obj, ctx);
        let minted_variant = random::generate_u8_in_range(&mut generator, 1, BRONZE_VARIANTS as u8);
        let sender = tx_context::sender(ctx);
        let nft = cuon_chun::mint(1, minted_variant, ctx);
        let minted_nft_id = object::id(&nft);
        transfer::public_transfer(nft, sender);

        let timestamp_ms = clock::timestamp_ms(clock);
        let correlation_id = digest_prefix_u64(ctx);
        let event_version = craft_config::event_version(config);
        event::emit(ScrapsFused {
            version: event_version,
            actor: sender,
            scraps_burned: recipe,
            minted_tier: 1,
            minted_variant,
            minted_nft_id,
            timestamp_ms,
            correlation_id,
        });
        event::emit(InventoryChanged {
            version: event_version,
            actor: sender,
            action: b"SCRAPS_FUSED_TO_BRONZE_RANDOM",
            amount: recipe,
            tier: 1,
            timestamp_ms,
            correlation_id,
        });
    }
}
