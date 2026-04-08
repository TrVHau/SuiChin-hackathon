/// Treasury and redemption economics for craft flows.
module suichin::craft_treasury {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::sui::SUI;
    use suichin::cuon_chun::{Self, CuonChunNFT};

    // Craft scaling constants.
    const COST_CHUN_BASE: u64 = 10;
    const COST_CHUN_MAX: u64 = 640;
    const HALVING_INTERVAL: u64 = 1_000;

    // Shared denominator for bps math.
    const BPS_DENOM: u64 = 10_000;

    // Contribution split across tier buckets.
    const BRONZE_BUCKET_BPS: u64 = 1_200; // 12%
    const SILVER_BUCKET_BPS: u64 = 3_700; // 37%
    const GOLD_BUCKET_BPS: u64 = 5_100; // 51%

    // Fixed redeem payouts (per NFT burn).
    const BRONZE_FIXED_PAYOUT: u64 = 20_000_000; // 0.02 SUI
    const SILVER_FIXED_PAYOUT: u64 = 120_000_000; // 0.12 SUI
    const GOLD_FIXED_PAYOUT: u64 = 500_000_000; // 0.50 SUI

    // Per-epoch max redeemed amount in each bucket.
    const REDEEM_EPOCH_CAP_BPS: u64 = 1_500; // 15% / epoch

    // Errors.
    const E_INVALID_TIER: u64 = 502;
    const E_ZERO_FUND_AMOUNT: u64 = 504;
    const E_BUCKET_INSUFFICIENT: u64 = 505;
    const E_REDEEM_RATE_LIMIT: u64 = 506;
    const E_INVALID_BUCKET_CONFIG: u64 = 507;

    /// Shared treasury with isolated buckets + epoch accounting.
    public struct Treasury has key {
        id: UID,
        bronze_pool: Balance<SUI>,
        silver_pool: Balance<SUI>,
        gold_pool: Balance<SUI>,
        total_crafts: u64,

        redeem_epoch: u64,
        bronze_epoch_start: u64,
        silver_epoch_start: u64,
        gold_epoch_start: u64,
        bronze_redeemed_epoch: u64,
        silver_redeemed_epoch: u64,
        gold_redeemed_epoch: u64,
    }

    public struct TreasuryFunded has copy, drop {
        funder: address,
        amount: u64,
        bronze_added: u64,
        silver_added: u64,
        gold_added: u64,
        new_total_balance: u64,
    }

    public struct ChunRedeemed has copy, drop {
        seller: address,
        tier: u8,
        payout: u64,
        tier_pool_after: u64,
        total_pool_after: u64,
        redeem_epoch: u64,
    }

    fun init(ctx: &mut TxContext) {
        let treasury = Treasury {
            id: object::new(ctx),
            bronze_pool: balance::zero<SUI>(),
            silver_pool: balance::zero<SUI>(),
            gold_pool: balance::zero<SUI>(),
            total_crafts: 0,

            redeem_epoch: 0,
            bronze_epoch_start: 0,
            silver_epoch_start: 0,
            gold_epoch_start: 0,
            bronze_redeemed_epoch: 0,
            silver_redeemed_epoch: 0,
            gold_redeemed_epoch: 0,
        };
        transfer::share_object(treasury);
    }

    /// cost = COST_CHUN_BASE * 2^(total_crafts / HALVING_INTERVAL), capped at COST_CHUN_MAX.
    public fun current_craft_cost(treasury: &Treasury): u64 {
        let steps = treasury.total_crafts / HALVING_INTERVAL;
        if (steps >= 6) {
            COST_CHUN_MAX
        } else {
            let mut multiplier: u64 = 1;
            let mut i = 0;
            while (i < steps) {
                multiplier = multiplier * 2;
                i = i + 1;
            };
            COST_CHUN_BASE * multiplier
        }
    }

    fun tier_fixed_payout(tier: u8): u64 {
        if (tier == 1) {
            BRONZE_FIXED_PAYOUT
        } else if (tier == 2) {
            SILVER_FIXED_PAYOUT
        } else if (tier == 3) {
            GOLD_FIXED_PAYOUT
        } else {
            abort E_INVALID_TIER
        }
    }

    fun tier_pool_balance(treasury: &Treasury, tier: u8): u64 {
        if (tier == 1) {
            balance::value(&treasury.bronze_pool)
        } else if (tier == 2) {
            balance::value(&treasury.silver_pool)
        } else if (tier == 3) {
            balance::value(&treasury.gold_pool)
        } else {
            abort E_INVALID_TIER
        }
    }

    fun split_bucket_amounts(amount: u64): (u64, u64, u64) {
        assert!(
            BRONZE_BUCKET_BPS + SILVER_BUCKET_BPS + GOLD_BUCKET_BPS == BPS_DENOM,
            E_INVALID_BUCKET_CONFIG
        );
        let bronze = amount * BRONZE_BUCKET_BPS / BPS_DENOM;
        let silver = amount * SILVER_BUCKET_BPS / BPS_DENOM;
        let mut gold = amount * GOLD_BUCKET_BPS / BPS_DENOM;
        let assigned = bronze + silver + gold;
        if (assigned < amount) {
            gold = gold + (amount - assigned);
        };
        (bronze, silver, gold)
    }

    fun sync_redeem_epoch(treasury: &mut Treasury, current_epoch: u64) {
        if (treasury.redeem_epoch != current_epoch) {
            treasury.redeem_epoch = current_epoch;
            treasury.bronze_epoch_start = balance::value(&treasury.bronze_pool);
            treasury.silver_epoch_start = balance::value(&treasury.silver_pool);
            treasury.gold_epoch_start = balance::value(&treasury.gold_pool);
            treasury.bronze_redeemed_epoch = 0;
            treasury.silver_redeemed_epoch = 0;
            treasury.gold_redeemed_epoch = 0;
        };
    }

    fun apply_bucket_deposit(
        treasury: &mut Treasury,
        payment: Coin<SUI>,
        current_epoch: u64,
        ctx: &mut TxContext,
    ): (u64, u64, u64, u64) {
        let amount = coin::value(&payment);
        let (bronze_added, silver_added, gold_added) = split_bucket_amounts(amount);

        let mut remaining = payment;
        if (bronze_added > 0) {
            let bronze_coin = coin::split(&mut remaining, bronze_added, ctx);
            balance::join(&mut treasury.bronze_pool, coin::into_balance(bronze_coin));
        };
        if (silver_added > 0) {
            let silver_coin = coin::split(&mut remaining, silver_added, ctx);
            balance::join(&mut treasury.silver_pool, coin::into_balance(silver_coin));
        };
        balance::join(&mut treasury.gold_pool, coin::into_balance(remaining));

        // Include fresh deposits in current-epoch cap base.
        sync_redeem_epoch(treasury, current_epoch);
        treasury.bronze_epoch_start = treasury.bronze_epoch_start + bronze_added;
        treasury.silver_epoch_start = treasury.silver_epoch_start + silver_added;
        treasury.gold_epoch_start = treasury.gold_epoch_start + gold_added;

        (amount, bronze_added, silver_added, gold_added)
    }

    public(package) fun apply_craft_deposit(
        treasury: &mut Treasury,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ): u64 {
        let (amount, _, _, _) = apply_bucket_deposit(treasury, payment, tx_context::epoch(ctx), ctx);
        amount
    }

    public(package) fun increment_total_crafts(treasury: &mut Treasury) {
        treasury.total_crafts = treasury.total_crafts + 1;
    }

    /// Anyone can top up treasury. No owner-only path.
    public fun fund_treasury(
        treasury: &mut Treasury,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let amount = coin::value(&payment);
        assert!(amount > 0, E_ZERO_FUND_AMOUNT);

        let (_total, bronze_added, silver_added, gold_added) =
            apply_bucket_deposit(treasury, payment, tx_context::epoch(ctx), ctx);

        event::emit(TreasuryFunded {
            funder: tx_context::sender(ctx),
            amount,
            bronze_added,
            silver_added,
            gold_added,
            new_total_balance: treasury_balance(treasury),
        });
    }

    /// Returns fixed payout if the tier bucket has enough liquidity now, otherwise 0.
    public fun quote_redeem_amount(treasury: &Treasury, tier: u8): u64 {
        let payout = tier_fixed_payout(tier);
        if (tier_pool_balance(treasury, tier) >= payout) payout else 0
    }

    /// Burn an NFT and receive fixed payout from its own tier bucket.
    public fun redeem_chun(
        treasury: &mut Treasury,
        nft: CuonChunNFT,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let tier = cuon_chun::tier(&nft);
        let payout = tier_fixed_payout(tier);

        let current_epoch = tx_context::epoch(ctx);
        sync_redeem_epoch(treasury, current_epoch);

        if (tier == 1) {
            let epoch_cap = treasury.bronze_epoch_start * REDEEM_EPOCH_CAP_BPS / BPS_DENOM;
            assert!(treasury.bronze_redeemed_epoch + payout <= epoch_cap, E_REDEEM_RATE_LIMIT);
            assert!(balance::value(&treasury.bronze_pool) >= payout, E_BUCKET_INSUFFICIENT);
            cuon_chun::burn(nft);
            let payout_balance = balance::split(&mut treasury.bronze_pool, payout);
            treasury.bronze_redeemed_epoch = treasury.bronze_redeemed_epoch + payout;
            let payout_coin = coin::from_balance(payout_balance, ctx);
            transfer::public_transfer(payout_coin, sender);
            event::emit(ChunRedeemed {
                seller: sender,
                tier,
                payout,
                tier_pool_after: balance::value(&treasury.bronze_pool),
                total_pool_after: treasury_balance(treasury),
                redeem_epoch: current_epoch,
            });
        } else if (tier == 2) {
            let epoch_cap = treasury.silver_epoch_start * REDEEM_EPOCH_CAP_BPS / BPS_DENOM;
            assert!(treasury.silver_redeemed_epoch + payout <= epoch_cap, E_REDEEM_RATE_LIMIT);
            assert!(balance::value(&treasury.silver_pool) >= payout, E_BUCKET_INSUFFICIENT);
            cuon_chun::burn(nft);
            let payout_balance = balance::split(&mut treasury.silver_pool, payout);
            treasury.silver_redeemed_epoch = treasury.silver_redeemed_epoch + payout;
            let payout_coin = coin::from_balance(payout_balance, ctx);
            transfer::public_transfer(payout_coin, sender);
            event::emit(ChunRedeemed {
                seller: sender,
                tier,
                payout,
                tier_pool_after: balance::value(&treasury.silver_pool),
                total_pool_after: treasury_balance(treasury),
                redeem_epoch: current_epoch,
            });
        } else if (tier == 3) {
            let epoch_cap = treasury.gold_epoch_start * REDEEM_EPOCH_CAP_BPS / BPS_DENOM;
            assert!(treasury.gold_redeemed_epoch + payout <= epoch_cap, E_REDEEM_RATE_LIMIT);
            assert!(balance::value(&treasury.gold_pool) >= payout, E_BUCKET_INSUFFICIENT);
            cuon_chun::burn(nft);
            let payout_balance = balance::split(&mut treasury.gold_pool, payout);
            treasury.gold_redeemed_epoch = treasury.gold_redeemed_epoch + payout;
            let payout_coin = coin::from_balance(payout_balance, ctx);
            transfer::public_transfer(payout_coin, sender);
            event::emit(ChunRedeemed {
                seller: sender,
                tier,
                payout,
                tier_pool_after: balance::value(&treasury.gold_pool),
                total_pool_after: treasury_balance(treasury),
                redeem_epoch: current_epoch,
            });
        } else {
            abort E_INVALID_TIER
        };
    }

    public fun treasury_balance(treasury: &Treasury): u64 {
        balance::value(&treasury.bronze_pool)
            + balance::value(&treasury.silver_pool)
            + balance::value(&treasury.gold_pool)
    }

    public fun bronze_pool_balance(treasury: &Treasury): u64 {
        balance::value(&treasury.bronze_pool)
    }

    public fun silver_pool_balance(treasury: &Treasury): u64 {
        balance::value(&treasury.silver_pool)
    }

    public fun gold_pool_balance(treasury: &Treasury): u64 {
        balance::value(&treasury.gold_pool)
    }

    public fun total_crafts(treasury: &Treasury): u64 {
        treasury.total_crafts
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx)
    }

    #[test_only]
    public fun set_total_crafts_for_testing(treasury: &mut Treasury, n: u64) {
        treasury.total_crafts = n;
    }
}
