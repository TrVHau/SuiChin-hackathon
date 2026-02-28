/// Tests for suichin::craft module
/// Covers: init (Treasury+AdminCap), craft_chun, withdraw, error cases
#[test_only]
module suichin::craft_tests {
    use sui::test_scenario;
    use sui::clock;
    use sui::coin;
    use sui::sui::SUI;
    use suichin::player_profile::{Self, PlayerProfile};
    use suichin::craft::{Self, Treasury, AdminCap};

    const ADMIN: address  = @0xA;
    const PLAYER: address = @0xB;

    #[test]
    fun test_craft_init_creates_treasury_and_admin() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let treasury = test_scenario::take_shared<Treasury>(&scenario);
            assert!(craft::treasury_balance(&treasury) == 0, 0);
            test_scenario::return_shared(treasury);

            let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            test_scenario::return_to_sender(&scenario, admin_cap);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_craft_chun_succeeds() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        // Init craft module (Treasury + AdminCap)
        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        // Create player profile
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        // Set chun_raw to 10 for craft
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 10);
            test_scenario::return_to_sender(&scenario, profile);
        };

        // Craft NFT (0.2 SUI payment, 0.1 SUI fee, 0.1 refund)
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                200_000_000, test_scenario::ctx(&mut scenario),
            );

            craft::craft_chun(
                &mut profile, &mut treasury, payment, &clock,
                test_scenario::ctx(&mut scenario),
            );

            // chun_raw should decrease by 10
            assert!(player_profile::chun_raw(&profile) == 0, 0);
            // Treasury should receive 0.1 SUI (100_000_000 MIST)
            assert!(craft::treasury_balance(&treasury) == 100_000_000, 1);

            test_scenario::return_to_sender(&scenario, profile);
            test_scenario::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_craft_exact_payment() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 10);
            test_scenario::return_to_sender(&scenario, profile);
        };

        // Exact 0.1 SUI payment — no refund needed (coin destroyed)
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                100_000_000, test_scenario::ctx(&mut scenario),
            );

            craft::craft_chun(
                &mut profile, &mut treasury, payment, &clock,
                test_scenario::ctx(&mut scenario),
            );

            assert!(craft::treasury_balance(&treasury) == 100_000_000, 0);

            test_scenario::return_to_sender(&scenario, profile);
            test_scenario::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_craft_insufficient_payment() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 10);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            // Only 50_000_000 MIST (need 100_000_000) → abort
            let payment = coin::mint_for_testing<SUI>(
                50_000_000, test_scenario::ctx(&mut scenario),
            );

            craft::craft_chun(
                &mut profile, &mut treasury, payment, &clock,
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
    fun test_craft_insufficient_chun() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        // Profile has 0 chun_raw (need 10) → abort
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                200_000_000, test_scenario::ctx(&mut scenario),
            );

            craft::craft_chun(
                &mut profile, &mut treasury, payment, &clock,
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

        // PLAYER creates profile
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 10);
            test_scenario::return_to_sender(&scenario, profile);
        };

        // ADMIN tries to craft using PLAYER's profile → abort (E_NOT_OWNER)
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut profile = test_scenario::take_from_address<PlayerProfile>(&scenario, PLAYER);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                200_000_000, test_scenario::ctx(&mut scenario),
            );

            craft::craft_chun(
                &mut profile, &mut treasury, payment, &clock,
                test_scenario::ctx(&mut scenario),
            );

            test_scenario::return_to_address(PLAYER, profile);
            test_scenario::return_shared(treasury);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_admin_withdraw() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        // Player crafts → puts SUI in treasury
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 10);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                100_000_000, test_scenario::ctx(&mut scenario),
            );
            craft::craft_chun(
                &mut profile, &mut treasury, payment, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
            test_scenario::return_shared(treasury);
        };

        // Admin withdraws 50_000_000 from treasury
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            craft::withdraw(
                &admin_cap, &mut treasury, 50_000_000,
                test_scenario::ctx(&mut scenario),
            );
            assert!(craft::treasury_balance(&treasury) == 50_000_000, 0);
            test_scenario::return_shared(treasury);
            test_scenario::return_to_sender(&scenario, admin_cap);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_admin_withdraw_all() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            craft::test_init(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 10);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                100_000_000, test_scenario::ctx(&mut scenario),
            );
            craft::craft_chun(
                &mut profile, &mut treasury, payment, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
            test_scenario::return_shared(treasury);
        };

        // Withdraw entire balance
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut treasury = test_scenario::take_shared<Treasury>(&scenario);
            craft::withdraw(
                &admin_cap, &mut treasury, 100_000_000,
                test_scenario::ctx(&mut scenario),
            );
            assert!(craft::treasury_balance(&treasury) == 0, 0);
            test_scenario::return_shared(treasury);
            test_scenario::return_to_sender(&scenario, admin_cap);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}
