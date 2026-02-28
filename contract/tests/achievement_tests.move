/// Tests for suichin::achievement module
/// Covers: claim_badge (success/streak_too_low/invalid_type/not_owner)
#[test_only]
module suichin::achievement_tests {
    use sui::test_scenario;
    use sui::clock;
    use suichin::player_profile::{Self, PlayerProfile};
    use suichin::achievement::{Self, AchievementBadge};

    const PLAYER: address = @0xB;
    const OTHER: address  = @0xC;

    // ── Helper: create profile and win N times ───────────────────────────
    fun setup_profile_with_streak(
        scenario: &mut test_scenario::Scenario,
        clock: &mut Clock,
        wins: u64,
    ) {
        test_scenario::next_tx(scenario, PLAYER);
        {
            player_profile::init_profile(test_scenario::ctx(scenario));
        };

        let mut i = 0;
        while (i < wins) {
            clock::set_for_testing(clock, 100_000 + ((i + 1) * 20_000));
            test_scenario::next_tx(scenario, PLAYER);
            {
                let mut profile = test_scenario::take_from_sender<PlayerProfile>(scenario);
                player_profile::report_result(
                    &mut profile, 5, true, clock,
                    test_scenario::ctx(scenario),
                );
                test_scenario::return_to_sender(scenario, profile);
            };
            i = i + 1;
        };
    }

    #[test]
    fun test_claim_badge_streak_1() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        setup_profile_with_streak(&mut scenario, &mut clock, 1);

        // Claim badge type 1 (requires streak >= 1)
        clock::set_for_testing(&mut clock, 500_000);
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_badge(
                &profile, 1, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        // Verify badge was minted
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let badge = test_scenario::take_from_sender<AchievementBadge>(&scenario);
            assert!(achievement::badge_type(&badge) == 1, 0);
            test_scenario::return_to_sender(&scenario, badge);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_claim_badge_streak_5() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        setup_profile_with_streak(&mut scenario, &mut clock, 5);

        clock::set_for_testing(&mut clock, 500_000);
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_badge(
                &profile, 5, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let badge = test_scenario::take_from_sender<AchievementBadge>(&scenario);
            assert!(achievement::badge_type(&badge) == 5, 0);
            test_scenario::return_to_sender(&scenario, badge);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_claim_multiple_badges() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        setup_profile_with_streak(&mut scenario, &mut clock, 5);

        // Claim badge 1 and badge 5 in sequence
        clock::set_for_testing(&mut clock, 500_000);
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_badge(
                &profile, 1, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        clock::set_for_testing(&mut clock, 600_000);
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_badge(
                &profile, 5, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_claim_badge_streak_too_low() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        // Try to claim badge type 5 with streak 0 → abort (E_STREAK_TOO_LOW)
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_badge(
                &profile, 5, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_claim_badge_invalid_type() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            player_profile::init_profile(test_scenario::ctx(&mut scenario));
        };

        // badge_type 99 is invalid → abort (E_INVALID_BADGE_TYPE)
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_badge(
                &profile, 99, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_claim_badge_not_owner() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        setup_profile_with_streak(&mut scenario, &mut clock, 1);

        // OTHER tries to claim using PLAYER's profile → abort (E_NOT_OWNER)
        clock::set_for_testing(&mut clock, 500_000);
        test_scenario::next_tx(&mut scenario, OTHER);
        {
            let profile = test_scenario::take_from_address<PlayerProfile>(&scenario, PLAYER);
            achievement::claim_badge(
                &profile, 1, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_address(PLAYER, profile);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_badge_accessors() {
        let mut scenario = test_scenario::begin(PLAYER);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        setup_profile_with_streak(&mut scenario, &mut clock, 1);

        clock::set_for_testing(&mut clock, 500_000);
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let profile = test_scenario::take_from_sender<PlayerProfile>(&scenario);
            achievement::claim_badge(
                &profile, 1, &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_to_sender(&scenario, profile);
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let badge = test_scenario::take_from_sender<AchievementBadge>(&scenario);
            assert!(achievement::badge_type(&badge) == 1, 0);
            assert!(achievement::earned_at(&badge) == 500_000, 1);
            let _name = achievement::name(&badge);
            let _desc = achievement::description(&badge);
            let _url  = achievement::image_url(&badge);
            test_scenario::return_to_sender(&scenario, badge);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}
