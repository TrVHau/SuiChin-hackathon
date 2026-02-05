#[test_only]
module suichin::achievement_tests {
    use sui::test_scenario::{Self as ts};
    use sui::clock::{Self, Clock};
    use suichin::player::{Self, PlayerProfile};
    use suichin::achievement::{Self, Achievement};
    use std::string;

    const PLAYER1: address = @0x1;

    fun setup_test(scenario: &mut ts::Scenario): Clock {
        let clock = clock::create_for_testing(ts::ctx(scenario));
        
        // Initialize achievement module
        ts::next_tx(scenario, PLAYER1);
        {
            achievement::test_init(ts::ctx(scenario));
        };
        
        // Create profile for player
        ts::next_tx(scenario, PLAYER1);
        {
            player::create_profile(&clock, ts::ctx(scenario));
        };
        
        clock
    }

    #[test]
    fun test_claim_beginner_achievement() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        // Set streak to 1
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            player::update_streak(&mut profile, 1, 1);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Claim beginner achievement (milestone 1)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            achievement::claim_achievement(
                &mut profile,
                1,  // MILESTONE_BEGINNER
                ts::ctx(&mut scenario)
            );
            
            // Check achievement was added to profile
            assert!(player::has_achievement(&profile, 1) == true, 0);
            
            ts::return_to_sender(&scenario, profile);
        };

        // Verify achievement NFT was created
        ts::next_tx(&mut scenario, PLAYER1);
        {
            assert!(ts::has_most_recent_for_sender<Achievement>(&scenario), 0);
            let nft = ts::take_from_sender<Achievement>(&scenario);
            
            assert!(achievement::get_milestone(&nft) == 1, 1);
            assert!(achievement::get_title(&nft) == string::utf8(b"Nguoi Moi Bat Dau"), 2);
            
            ts::return_to_sender(&scenario, nft);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_claim_skilled_achievement() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        // Set streak to 5
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            player::update_streak(&mut profile, 5, 5);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Claim skilled achievement (milestone 5)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            
            achievement::claim_achievement(&mut profile, 5, ts::ctx(&mut scenario));
            assert!(player::has_achievement(&profile, 5) == true, 0);
            
            ts::return_to_sender(&scenario, profile);
        };

        ts::next_tx(&mut scenario, PLAYER1);
        {
            let nft = ts::take_from_sender<Achievement>(&scenario);
            assert!(achievement::get_milestone(&nft) == 5, 0);
            assert!(achievement::get_title(&nft) == string::utf8(b"Nguoi Choi Xuat Sac"), 1);
            ts::return_to_sender(&scenario, nft);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suichin::achievement::E_INSUFFICIENT_STREAK)]
    fun test_claim_achievement_insufficient_streak() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        // Set streak to 3 (not enough for milestone 5)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            player::update_streak(&mut profile, 3, 3);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Try to claim milestone 5 (should fail)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_achievement(&mut profile, 5, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suichin::achievement::E_ALREADY_CLAIMED)]
    fun test_claim_achievement_already_claimed() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        // Set streak to 5
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            player::update_streak(&mut profile, 5, 5);
            ts::return_to_sender(&scenario, profile);
        };
        
        // First claim (should succeed)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_achievement(&mut profile, 5, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };
        
        // Second claim (should fail)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_achievement(&mut profile, 5, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suichin::achievement::E_INVALID_MILESTONE)]
    fun test_claim_invalid_milestone() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            player::update_streak(&mut profile, 100, 100);
            
            // Try to claim invalid milestone
            achievement::claim_achievement(&mut profile, 99, ts::ctx(&mut scenario));
            
            ts::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_claim_legend_achievement() {
        let mut scenario = ts::begin(PLAYER1);
        let clock = setup_test(&mut scenario);
        
        // Set streak to 67
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            player::update_streak(&mut profile, 67, 67);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Claim legend achievement (milestone 67)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut profile = ts::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_achievement(&mut profile, 67, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };

        ts::next_tx(&mut scenario, PLAYER1);
        {
            let nft = ts::take_from_sender<Achievement>(&scenario);
            assert!(achievement::get_milestone(&nft) == 67, 0);
            assert!(achievement::get_title(&nft) == string::utf8(b"Huyen Thoai Bung Chun"), 1);
            ts::return_to_sender(&scenario, nft);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
