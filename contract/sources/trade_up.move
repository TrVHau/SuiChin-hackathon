/// Mo-dun nang cap NFT theo co che trade-up.
module suichin::trade_up {
    use std::bcs;
    use sui::clock::{Self, Clock};
    use sui::event;
    use suichin::cuon_chun::{Self, CuonChunNFT};
    use suichin::scrap;

    const BRONZE_INPUT:           u64 = 8;
    const SILVER_INPUT:           u64 = 6;
    const BRONZE_TO_SILVER_RATE:  u64 = 70;
    const SILVER_TO_GOLD_RATE:    u64 = 55;

    const E_WRONG_INPUT_COUNT: u64 = 200;
    const E_WRONG_TIER:        u64 = 201;

    public struct TradeUpResult has copy, drop {
        trader: address,
        from_tier: u8,
        to_tier: u8,
        success: bool,
        inputs_burned: u64,
        roll: u64,
    }


    fun roll_rng(clock: &Clock, ctx: &TxContext): u64 {
        let clock_ms = clock::timestamp_ms(clock);
        let epoch    = tx_context::epoch(ctx);
        let sender   = tx_context::sender(ctx);
        let addr_bytes = bcs::to_bytes(&sender);

        let addr_seed: u64 =
            (*vector::borrow(&addr_bytes, 0) as u64)        |
            ((*vector::borrow(&addr_bytes, 1) as u64) << 8) |
            ((*vector::borrow(&addr_bytes, 2) as u64) << 16)|
            ((*vector::borrow(&addr_bytes, 3) as u64) << 24)|
            ((*vector::borrow(&addr_bytes, 4) as u64) << 32)|
            ((*vector::borrow(&addr_bytes, 5) as u64) << 40)|
            ((*vector::borrow(&addr_bytes, 6) as u64) << 48)|
            ((*vector::borrow(&addr_bytes, 7) as u64) << 56);

        let seed = clock_ms ^ (epoch * 1_000_007) ^ addr_seed;
        seed % 100
    }

    fun burn_all(mut nfts: vector<CuonChunNFT>, expected_tier: u8) {
        let len = vector::length(&nfts);
        let mut i = 0;
        while (i < len) {
            let nft = vector::pop_back(&mut nfts);
            assert!(cuon_chun::tier(&nft) == expected_tier, E_WRONG_TIER);
            cuon_chun::burn(nft);
            i = i + 1;
        };
        vector::destroy_empty(nfts);
    }

    fun mint_trade_up_reward(
        sender: address,
        success_rate: u64,
        to_tier: u8,
        roll: u64,
        ctx: &mut TxContext,
    ): (u8, bool) {
        if (roll < success_rate) {
            let variant = if (to_tier == 2) { ((roll % 4) + 1) as u8 } else { ((roll % 3) + 1) as u8 };
            let nft = cuon_chun::mint(to_tier, variant, ctx);
            transfer::public_transfer(nft, sender);
            (to_tier, true)
        } else {
            let s = scrap::mint(ctx);
            transfer::public_transfer(s, sender);
            (0, false)
        }
    }

    fun execute_trade_up(
        nfts: vector<CuonChunNFT>,
        required_inputs: u64,
        from_tier: u8,
        to_tier: u8,
        success_rate: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(vector::length(&nfts) == required_inputs, E_WRONG_INPUT_COUNT);
        let sender = tx_context::sender(ctx);
        burn_all(nfts, from_tier);

        let roll = roll_rng(clock, ctx);
        let (result_tier, success) = mint_trade_up_reward(sender, success_rate, to_tier, roll, ctx);

        event::emit(TradeUpResult {
            trader: sender,
            from_tier,
            to_tier: result_tier,
            success,
            inputs_burned: required_inputs,
            roll,
        });
    }


    public fun trade_up_bronze_to_silver(
        nfts: vector<CuonChunNFT>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        execute_trade_up(nfts, BRONZE_INPUT, 1, 2, BRONZE_TO_SILVER_RATE, clock, ctx);
    }

    public fun trade_up_silver_to_gold(
        nfts: vector<CuonChunNFT>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        execute_trade_up(nfts, SILVER_INPUT, 2, 3, SILVER_TO_GOLD_RATE, clock, ctx);
    }
}
