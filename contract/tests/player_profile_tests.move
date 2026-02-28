/// Tests for suichin::player_profile module
/// Covers: init_profile, report_result (win/lose/streak/cooldown/delta/owner checks)
#[test_only]
module suichin::player_profile_tests {
    use sui::test_scenario;
    use sui::clock;
    use suichin::player_profile::{Self, PlayerProfile};

    const PLAYER: address = @0xB;
    const OTHER: address  = @0xC;

    #[test]
    fun test_init_profile() {
        let mut scenario = test_scenario::begin(PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            assert!(player_profile::chun_raw(&profile) == 0, 0);
            assert!(player_profile::wins(&profile) == 0, 1);
            assert!(player_profile::losses(&profile) == 0, 2);
            assert!(player_profile::streak(&profile) == 0, 3);
            assert!(player_profile::owner(&profile) == PLAYER, 4);
            test_scenario::return_to_sender(&scenario, profile);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_report_result_win() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::report_result(
                &mut profile, 5, true, &clock,
                test_scenario::ctx(&mut scenario),
            );
            assert!(player_profile::chun_raw(&profile) == 5, 0);
            assert!(player_profile::wins(&profile) == 1, 1);
            assert!(player_profile::streak(&profile) == 1, 2);
            assert!(player_profile::losses(&profile) == 0, 3);
            test_scenario::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_report_result_lose() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        // Create profile & win once to have chun_raw > 0 and streak > 0
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::report_result(
                &mut profile, 5, true, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        // Lose — chun decreases by 1, streak resets
        clock::set_for_testing(&mut clock, 200_000);
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::report_result(
                &mut profile, 0, false, &clock,
                test_scenario::ctx(&mut scenario),
            );
            assert!(player_profile::chun_raw(&profile) == 4, 0); // 5 − 1
            assert!(player_profile::losses(&profile) == 1, 1);
            assert!(player_profile::streak(&profile) == 0, 2);
            assert!(player_profile::wins(&profile) == 1, 3);     // unchanged
            test_scenario::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_report_result_lose_floor_zero() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        // Lose when chun_raw == 0 → stays at 0
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::report_result(
                &mut profile, 0, false, &clock,
                test_scenario::ctx(&mut scenario),
            );
            assert!(player_profile::chun_raw(&profile) == 0, 0);
            assert!(player_profile::losses(&profile) == 1, 1);
            test_scenario::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_report_result_multiple_wins_streak() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        // Win 3 times in a row
        let mut i = 0;
        while (i < 3) {
            clock::set_for_testing(&mut clock, 100_000 + ((i + 1) * 20_000));
            test_scenario::next_tx(&mut scenario, PLAYER);
            {
                let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
                player_profile::report_result(
                    &mut profile, 5, true, &clock,
                    test_scenario::ctx(&mut scenario),
                );
                test_scenario::return_to_sender(&scenario, profile);
            };
            i = i + 1;
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            assert!(player_profile::chun_raw(&profile) == 15, 0); // 3 × 5
            assert!(player_profile::wins(&profile) == 3, 1);
            assert!(player_profile::streak(&profile) == 3, 2);
            test_scenario::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_report_result_delta_too_large() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        // delta=21 > MAX_DELTA_CHUN(20) → abort
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::report_result(
                &mut profile, 21, true, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_report_result_cooldown_active() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        // First report (success)
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::report_result(
                &mut profile, 5, true, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        // Second report 1ms later — cooldown 10_000ms not met → abort
        clock::set_for_testing(&mut clock, 100_001);
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::report_result(
                &mut profile, 3, true, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_report_result_not_owner() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        // OTHER tries to modify PLAYER's profile → abort
        test_scenario::next_tx(&mut scenario, OTHER);
        {
            let mut profile = test_scenario::take_from_address<PlayerProfile>(&scenario, PLAYER);
            player_profile::report_result(
                &mut profile, 5, true, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_address(PLAYER, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_spend_chun_via_set_and_check() {
        let mut scenario = test_scenario::begin(PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 50);
            assert!(player_profile::chun_raw(&profile) == 50, 0);
            test_scenario::return_to_sender(&scenario, profile);
        };
        test_scenario::end(scenario);
    }
}
