#[test_only]
module suichin::player_tests {
    use sui::test_scenario::{Self as ts};
    use sui::clock::{Self, Clock};
    use suichin::player::{Self, PlayerProfile};

    // Test addresses
    const PLAYER1: address = @0x1;

    // Helper function to create clock
    fun create_test_clock(ctx: &mut TxContext): Clock {
        clock::create_for_testing(ctx)
    }

    #[test]
    fun test_create_profile() {
        let mut scenario = ts::begin(PLAYER1);
        
        // Create clock
        let clock = create_test_clock(ts::ctx(&mut scenario));
        
        // Create profile
        ts::next_tx(&mut scenario, PLAYER1);
        {
            player::create_profile(&clock, ts::ctx(&mut scenario));
        };

        // Verify profile was created
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            // Check initial values
            assert!(player::get_chun(&profile, 1) == 0, 0);
            assert!(player::get_chun(&profile, 2) == 0, 1);
            assert!(player::get_chun(&profile, 3) == 0, 2);
            assert!(player::calculate_total_points(&profile) == 0, 3);
            assert!(player::get_max_streak(&profile) == 0, 4);
            assert!(player::get_current_streak(&profile) == 0, 5);
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_update_chun() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = create_test_clock(ts::ctx(&mut scenario));
        
        // Create profile
        ts::next_tx(&mut scenario, PLAYER1);
        {
            player::create_profile(&clock, ts::ctx(&mut scenario));
        };

        // Update chun
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            player::update_chun(&mut profile, 10, 5, 3);
            
            assert!(player::get_chun(&profile, 1) == 10, 0);
            assert!(player::get_chun(&profile, 2) == 5, 1);
            assert!(player::get_chun(&profile, 3) == 3, 2);
            assert!(player::calculate_total_points(&profile) == 10 + 10 + 9, 3);
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_update_streak() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = create_test_clock(ts::ctx(&mut scenario));
        
        // Create profile
        ts::next_tx(&mut scenario, PLAYER1);
        {
            player::create_profile(&clock, ts::ctx(&mut scenario));
        };

        // Update streak
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            player::update_streak(&mut profile, 10, 10);
            
            assert!(player::get_max_streak(&profile) == 10, 0);
            assert!(player::get_current_streak(&profile) == 10, 1);
            
            // Update to higher streak
            player::update_streak(&mut profile, 20, 15);
            assert!(player::get_max_streak(&profile) == 20, 2);
            assert!(player::get_current_streak(&profile) == 15, 3);
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_calculate_total_points() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = create_test_clock(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, PLAYER1);
        {
            player::create_profile(&clock, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            // tier1=10, tier2=5, tier3=3
            // total = 10*1 + 5*2 + 3*3 = 10 + 10 + 9 = 29
            player::update_chun(&mut profile, 10, 5, 3);
            assert!(player::calculate_total_points(&profile) == 29, 0);
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_add_achievement() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = create_test_clock(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, PLAYER1);
        {
            player::create_profile(&clock, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            // Add achievements
            player::add_achievement(&mut profile, 1);
            assert!(player::has_achievement(&profile, 1) == true, 0);
            assert!(player::has_achievement(&profile, 5) == false, 1);
            
            player::add_achievement(&mut profile, 5);
            assert!(player::has_achievement(&profile, 5) == true, 2);
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_update_session_tracking() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = create_test_clock(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, PLAYER1);
        {
            player::create_profile(&clock, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            let timestamp = 1000000;
            player::update_session_tracking(&mut profile, timestamp);
            
            assert!(player::get_last_session_time(&profile) == timestamp, 0);
            assert!(player::get_total_sessions(&profile) == 1, 1);
            
            // Second session
            player::update_session_tracking(&mut profile, timestamp + 5000);
            assert!(player::get_total_sessions(&profile) == 2, 2);
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
