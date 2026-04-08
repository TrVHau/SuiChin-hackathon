/// Tests for suichin::craft module with bucketed pool + fixed redeem payouts.
#[test_only]
module suichin::craft_tests {
    use sui::clock;
    use sui::coin;
    use sui::sui::SUI;
    use sui::test_scenario;
    use suichin::craft;
    use suichin::craft_treasury::Treasury;
    use suichin::cuon_chun::{Self, CuonChunNFT};
    use suichin::player_profile::{Self, PlayerProfile};

    const ADMIN: address = @0xA;
    const PLAYER: address = @0xB;

    fun init_player_with_chun(
        scenario: &mut test_scenario::Scenario,
        chun_raw: u64,
    ) {
        test_scenario::next_tx(scenario, PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(scenario));
        };

        test_scenario::next_tx(scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, chun_raw);
            test_scenario::return_to_sender(scenario, profile);
        };
    }

    #[test]
    fun test_craft_init_creates_treasury_only() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let treasury = test_scenario::take_shared<Treasury>(&scenario);
            assert!(craft::treasury_balance(&treasury) == 0, 0);
            test_scenario::return_shared(treasury);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_fund_treasury_permissionless() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1_000_000_000, test_scenario::ctx(&mut scenario));
            craft::fund_treasury(&mut treasury, payment, test_scenario::ctx(&mut scenario));

            assert!(craft::treasury_balance(&treasury) == 1_000_000_000, 0);
            assert!(craft::bronze_pool_balance(&treasury) == 120_000_000, 1);
            assert!(craft::silver_pool_balance(&treasury) == 370_000_000, 2);
            assert!(craft::gold_pool_balance(&treasury) == 510_000_000, 3);
            test_scenario::return_shared(treasury);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_fund_treasury_zero_rejected() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(0, test_scenario::ctx(&mut scenario));
            craft::fund_treasury(&mut treasury, payment, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(treasury);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_quote_redeem_amount_by_tier_fixed() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(2_000_000_000, test_scenario::ctx(&mut scenario));
            craft::fund_treasury(&mut treasury, payment, test_scenario::ctx(&mut scenario));

            assert!(craft::quote_redeem_amount(&treasury, 1) == 20_000_000, 0);
            assert!(craft::quote_redeem_amount(&treasury, 2) == 120_000_000, 1);
            assert!(craft::quote_redeem_amount(&treasury, 3) == 500_000_000, 2);
            test_scenario::return_shared(treasury);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_quote_redeem_amount_zero_when_bucket_low() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(100_000_000, test_scenario::ctx(&mut scenario));
            craft::fund_treasury(&mut treasury, payment, test_scenario::ctx(&mut scenario));

            // Gold bucket receives only 51_000_000, below fixed payout 500_000_000.
            assert!(craft::quote_redeem_amount(&treasury, 3) == 0, 0);
            test_scenario::return_shared(treasury);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_craft_chun_contributes_to_pool() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };
        init_player_with_chun(&mut scenario, 10);

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(200_000_000, test_scenario::ctx(&mut scenario));

            craft::craft_chun(
                &mut profile,
                &mut treasury,
                payment,
                &clock,
                test_scenario::ctx(&mut scenario),
            );

            assert!(player_profile::chun_raw(&profile) == 0, 0);
            assert!(craft::treasury_balance(&treasury) == 100_000_000, 1);
            test_scenario::return_to_sender(&scenario, profile);
            test_scenario::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_craft_chun_insufficient_payment() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };
        init_player_with_chun(&mut scenario, 10);

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(50_000_000, test_scenario::ctx(&mut scenario));

            craft::craft_chun(
                &mut profile,
                &mut treasury,
                payment,
                &clock,
                test_scenario::ctx(&mut scenario),
            );

            test_scenario::return_to_sender(&scenario, profile);
            test_scenario::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_craft_not_owner() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };
        init_player_with_chun(&mut scenario, 10);

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut profile = test_scenario::take_from_address<PlayerProfile>(&scenario, PLAYER);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(100_000_000, test_scenario::ctx(&mut scenario));

            craft::craft_chun(
                &mut profile,
                &mut treasury,
                payment,
                &clock,
                test_scenario::ctx(&mut scenario),
            );

            test_scenario::return_to_address(PLAYER, profile);
            test_scenario::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_redeem_chun_reduces_pool() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(2_000_000_000, test_scenario::ctx(&mut scenario));
            craft::fund_treasury(&mut treasury, payment, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(treasury);
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let nft = cuon_chun::mint(1, 1u8, test_scenario::ctx(&mut scenario));
            transfer::public_transfer(nft, PLAYER);
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let nft = test_scenario::take_from_sender<CuonChunNFT>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let pool_before = craft::treasury_balance(&treasury);

            craft::redeem_chun(&mut treasury, nft, test_scenario::ctx(&mut scenario));

            assert!(craft::treasury_balance(&treasury) == pool_before - 20_000_000, 0);
            test_scenario::return_shared(treasury);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_redeem_fails_when_bucket_insufficient() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        // Fund only 0.1 SUI -> gold bucket = 51_000_000 < 500_000_000 payout.
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(100_000_000, test_scenario::ctx(&mut scenario));
            craft::fund_treasury(&mut treasury, payment, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(treasury);
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let nft = cuon_chun::mint(3, 1u8, test_scenario::ctx(&mut scenario));
            transfer::public_transfer(nft, PLAYER);
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let nft = test_scenario::take_from_sender<CuonChunNFT>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            craft::redeem_chun(&mut treasury, nft, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(treasury);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_redeem_rate_limited_per_epoch() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        // Bronze bucket from this fund = 240_000_000.
        // Epoch cap is 15% => 36_000_000.
        // Bronze payout is 20_000_000, so 2nd redeem in same epoch should fail.
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(2_000_000_000, test_scenario::ctx(&mut scenario));
            craft::fund_treasury(&mut treasury, payment, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(treasury);
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let nft1 = cuon_chun::mint(1, 1u8, test_scenario::ctx(&mut scenario));
            let nft2 = cuon_chun::mint(1, 2u8, test_scenario::ctx(&mut scenario));
            transfer::public_transfer(nft1, PLAYER);
            transfer::public_transfer(nft2, PLAYER);
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let nft = test_scenario::take_from_sender<CuonChunNFT>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            craft::redeem_chun(&mut treasury, nft, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(treasury);
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let nft = test_scenario::take_from_sender<CuonChunNFT>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            craft::redeem_chun(&mut treasury, nft, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(treasury);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_current_craft_cost_after_halving() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            craft::set_total_crafts_for_testing(&mut treasury, 0);
            assert!(craft::current_craft_cost(&treasury) == 10, 0);

            craft::set_total_crafts_for_testing(&mut treasury, 1_000);
            assert!(craft::current_craft_cost(&treasury) == 20, 1);

            craft::set_total_crafts_for_testing(&mut treasury, 2_000);
            assert!(craft::current_craft_cost(&treasury) == 40, 2);

            craft::set_total_crafts_for_testing(&mut treasury, 6_000);
            assert!(craft::current_craft_cost(&treasury) == 640, 3);

            craft::set_total_crafts_for_testing(&mut treasury, 9_999);
            assert!(craft::current_craft_cost(&treasury) == 640, 4);

            test_scenario::return_shared(treasury);
        };
        test_scenario::end(scenario);
    }
}
