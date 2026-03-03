/// Tests for suichin::trade_up module
/// Covers: bronze→silver, silver→gold, wrong count, wrong tier
#[test_only]
module suichin::trade_up_tests {
    use sui::test_scenario;
    use sui::clock;
    use suichin::cuon_chun;
    use suichin::trade_up;

    const PLAYER: address = @0xB;

    // ── Helper: mint N NFTs of given tier ─────────────────────────────────
    fun mint_nfts(
        scenario: &mut test_scenario::Scenario,
        count: u64,
        tier: u8,
    ): vector<cuon_chun::CuonChunNFT> {
        let mut nfts = vector[];
        let mut i = 0;
        while (i < count) {
            vector::push_back(
                &mut nfts,
                cuon_chun::mint(tier, test_scenario::ctx(scenario)),
            );
            i = i + 1;
        };
        nfts
    }

    #[test]
    fun test_trade_up_bronze_to_silver() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let nfts = mint_nfts(&mut scenario, 8, 1);
            trade_up::trade_up_bronze_to_silver(
                nfts, &clock,
                test_scenario::ctx(&mut scenario),
            );
            // Completed without abort. Output is RNG-dependent (Silver or Scrap).
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_trade_up_silver_to_gold() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let nfts = mint_nfts(&mut scenario, 6, 2);
            trade_up::trade_up_silver_to_gold(
                nfts, &clock,
                test_scenario::ctx(&mut scenario),
            );
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_trade_up_bronze_wrong_count_too_few() {
        let mut scenario = test_scenario::begin(PLAYER);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            // Only 5 Bronze instead of required 8 → abort (E_WRONG_INPUT_COUNT)
            let nfts = mint_nfts(&mut scenario, 5, 1);
            trade_up::trade_up_bronze_to_silver(
                nfts, &clock,
                test_scenario::ctx(&mut scenario),
            );
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_trade_up_bronze_wrong_count_too_many() {
        let mut scenario = test_scenario::begin(PLAYER);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            // 10 Bronze instead of required 8 → abort (E_WRONG_INPUT_COUNT)
            let nfts = mint_nfts(&mut scenario, 10, 1);
            trade_up::trade_up_bronze_to_silver(
                nfts, &clock,
                test_scenario::ctx(&mut scenario),
            );
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_trade_up_bronze_wrong_tier() {
        let mut scenario = test_scenario::begin(PLAYER);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            // 8 Silver NFTs instead of Bronze → abort (E_WRONG_TIER)
            let nfts = mint_nfts(&mut scenario, 8, 2);
            trade_up::trade_up_bronze_to_silver(
                nfts, &clock,
                test_scenario::ctx(&mut scenario),
            );
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_trade_up_silver_wrong_count() {
        let mut scenario = test_scenario::begin(PLAYER);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            // Only 3 Silver instead of required 6 → abort (E_WRONG_INPUT_COUNT)
            let nfts = mint_nfts(&mut scenario, 3, 2);
            trade_up::trade_up_silver_to_gold(
                nfts, &clock,
                test_scenario::ctx(&mut scenario),
            );
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_trade_up_silver_wrong_tier() {
        let mut scenario = test_scenario::begin(PLAYER);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            // 6 Bronze NFTs instead of Silver → abort (E_WRONG_TIER)
            let nfts = mint_nfts(&mut scenario, 6, 1);
            trade_up::trade_up_silver_to_gold(
                nfts, &clock,
                test_scenario::ctx(&mut scenario),
            );
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}
