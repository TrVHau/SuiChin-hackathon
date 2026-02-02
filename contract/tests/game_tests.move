#[test_only]
module suichin::game_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use suichin::player::{Self, PlayerProfile};
    use suichin::game;

    const PLAYER1: address = @0x1;

    fun setup_test(scenario: &mut Scenario): Clock {
        let clock = clock::create_for_testing(ts::ctx(scenario));
        
        // Create profile for player
        ts::next_tx(scenario, PLAYER1);
        {
            player::create_profile(&clock, ts::ctx(scenario));
        };
        
        clock
    }

    #[test]
    fun test_record_session_positive_delta() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        // Record session with positive delta (win)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            // Win: +5 tier1, +3 tier2, +2 tier3
            game::record_session(
                &mut profile,
                &clock,
                5,     // delta_tier1
                3,     // delta_tier2
                2,     // delta_tier3
                true,  // is_tier1_positive
                true,  // is_tier2_positive
                true,  // is_tier3_positive
                10,    // new_max_streak
                10,    // new_current_streak
                ts::ctx(&mut scenario)
            );
            
            // Check chun updated
            assert!(player::get_chun(&profile, 1) == 5, 0);
            assert!(player::get_chun(&profile, 2) == 3, 1);
            assert!(player::get_chun(&profile, 3) == 2, 2);
            assert!(player::get_current_streak(&profile) == 10, 3);
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_record_session_negative_delta() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        // First, add some chun
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            player::update_chun(&mut profile, 10, 10, 10);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Record session with negative delta (loss)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            // Lose: -3 tier1, -2 tier2, -1 tier3
            game::record_session(
                &mut profile,
                &clock,
                3,     // delta_tier1
                2,     // delta_tier2
                1,     // delta_tier3
                false, // is_tier1_positive (loss)
                false, // is_tier2_positive
                false, // is_tier3_positive
                10,    // new_max_streak (unchanged)
                0,     // new_current_streak (reset)
                ts::ctx(&mut scenario)
            );
            
            // Check chun decreased
            assert!(player::get_chun(&profile, 1) == 7, 0);  // 10 - 3
            assert!(player::get_chun(&profile, 2) == 8, 1);  // 10 - 2
            assert!(player::get_chun(&profile, 3) == 9, 2);  // 10 - 1
            assert!(player::get_current_streak(&profile) == 0, 3);
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suichin::game::E_DELTA_TOO_LARGE)]
    fun test_record_session_delta_too_large() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            // Try to record session with delta > 50
            game::record_session(
                &mut profile,
                &clock,
                60,    // Too large!
                0,
                0,
                true,
                true,
                true,
                1,
                1,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_claim_faucet() {
        let mut scenario = ts::begin(PLAYER1);
        let mut clock = setup_test(&mut scenario);
        
        // Advance clock to make faucet available
        clock::increment_for_testing(&mut clock, 7200000 * 10); // 20 hours = 10 intervals
        
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            game::claim_faucet(
                &mut profile,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            // Should receive 10 chun total (random tiers), check total points >= 10
            let total_points = player::calculate_total_points(&profile);
            assert!(total_points >= 10, 0);
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suichin::game::E_FAUCET_NOT_READY)]
    fun test_claim_faucet_too_soon() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        // First claim
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            game::claim_faucet(&mut profile, &clock, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };
        
        // Try to claim again immediately (should fail)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            game::claim_faucet(&mut profile, &clock, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suichin::game::E_INSUFFICIENT_POINTS)]
    fun test_craft_roll_insufficient_points() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            player::update_chun(&mut profile, 5, 0, 0);
            
            // Try to craft with only 5 points (min is 10)
            game::craft_roll(
                &mut profile,
                &clock,
                5,  // use 5 tier1 = 5 points
                0,
                0,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suichin::game::E_INSUFFICIENT_CHUN)]
    fun test_craft_roll_insufficient_chun() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            // Try to use more chun than available
            game::craft_roll(
                &mut profile,
                &clock,
                10, // Don't have 10 tier1
                0,
                0,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
