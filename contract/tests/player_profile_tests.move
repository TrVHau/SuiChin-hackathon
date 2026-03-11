/// Tests for suichin::player_profile module
/// Covers: init_profile, report_result (win/lose/streak/cooldown/delta/owner checks),
///         faucet (claim/stack/cooldown), PvP staking (lock/resolve/unlock)
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

    // ─── Faucet Tests ─────────────────────────────────────────────────────────

    #[test]
    fun test_faucet_claim_full_stack() {
        // last_faucet_ms = 0 → elapsed chưa giới hạn → pending = MAX_STACK (10)
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        // 100 cooldown cycles (7_200_000 * 100) → well above max stack
        clock::set_for_testing(&mut clock, 720_000_001);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            assert!(player_profile::pending_faucet(&profile, &clock) == 10, 0);
            player_profile::claim_faucet(&mut profile, &clock, test_scenario::ctx(&mut scenario));
            assert!(player_profile::chun_raw(&profile) == 10, 1);
            assert!(player_profile::last_faucet_ms(&profile) == 720_000_001, 2);
            test_scenario::return_to_sender(&scenario, profile);
        };
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_faucet_claim_partial_stack() {
        // Elapsed = 2 cooldown periods → pending = 2
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 14_400_001); // 2 * 7_200_001 ms
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            assert!(player_profile::pending_faucet(&profile, &clock) == 2, 0);
            player_profile::claim_faucet(&mut profile, &clock, test_scenario::ctx(&mut scenario));
            assert!(player_profile::chun_raw(&profile) == 2, 1);
            test_scenario::return_to_sender(&scenario, profile);
        };
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_faucet_claim_too_soon() {
        // Elapsed < 1 cooldown period → abort E_FAUCET_NOTHING_TO_CLAIM
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 3_600_000); // only 1 hour elapsed
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            // manually set last_faucet_ms so elapsed = 3_600_000 ms (< 7_200_000)
            // We simulate by setting clock before profile creation was at 0
            // last_faucet_ms is 0 and clock is 3_600_000 → elapsed = 3_600_000 < COOLDOWN → pending = 0
            player_profile::claim_faucet(&mut profile, &clock, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, profile);
        };
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_faucet_claim_not_owner() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 720_000_001);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, OTHER);
        {
            let mut profile = test_scenario::take_from_address<PlayerProfile>(&scenario, PLAYER);
            player_profile::claim_faucet(&mut profile, &clock, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_address(PLAYER, profile);
        };
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    // ─── PvP Staking Tests ────────────────────────────────────────────────────

    #[test]
    fun test_lock_for_match() {
        let mut scenario = test_scenario::begin(PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 20);
            player_profile::lock_for_match(&mut profile, 10, test_scenario::ctx(&mut scenario));
            assert!(player_profile::chun_raw(&profile) == 10, 0);
            assert!(player_profile::staked_chun(&profile) == 10, 1);
            test_scenario::return_to_sender(&scenario, profile);
        };
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_lock_for_match_insufficient() {
        let mut scenario = test_scenario::begin(PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            // chun_raw = 0, try to lock 5 → abort
            player_profile::lock_for_match(&mut profile, 5, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, profile);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_resolve_match() {
        let mut scenario = test_scenario::begin(PLAYER);
        {
            // Create both profiles
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, OTHER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        // Fund + lock PLAYER (winner)
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 10);
            player_profile::lock_for_match(&mut profile, 10, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, profile);
        };

        // Fund + lock OTHER (loser)
        test_scenario::next_tx(&mut scenario, OTHER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 10);
            player_profile::lock_for_match(&mut profile, 10, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, profile);
        };

        // Oracle resolves: PLAYER wins 10 from OTHER
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut winner = test_scenario::take_from_address<PlayerProfile>(&scenario, PLAYER);
            let mut loser  = test_scenario::take_from_address<PlayerProfile>(&scenario, OTHER);
            let oracle = player_profile::create_match_oracle_for_testing(
                test_scenario::ctx(&mut scenario)
            );
            player_profile::resolve_match(&mut winner, &mut loser, 10, &oracle);
            // winner: chun_raw was 0 (all staked), now +10
            assert!(player_profile::chun_raw(&winner) == 10, 0);
            // loser: staked_chun was 10, now 0
            assert!(player_profile::staked_chun(&loser) == 0, 1);
            sui::test_utils::destroy(oracle);
            test_scenario::return_to_address(PLAYER, winner);
            test_scenario::return_to_address(OTHER, loser);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_unlock_from_match() {
        let mut scenario = test_scenario::begin(PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            player_profile::set_chun_raw_for_testing(&mut profile, 20);
            player_profile::lock_for_match(&mut profile, 10, test_scenario::ctx(&mut scenario));
            // Simulate cancellation: package unlocks
            player_profile::unlock_from_match(&mut profile, 10);
            assert!(player_profile::chun_raw(&profile) == 20, 0);
            assert!(player_profile::staked_chun(&profile) == 0, 1);
            test_scenario::return_to_sender(&scenario, profile);
        };
        test_scenario::end(scenario);
    }
}
