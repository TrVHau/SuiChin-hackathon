/// Smoke tests for suichin::nft_valuation_lobby.
#[test_only]
module suichin::nft_valuation_lobby_tests {
    use sui::clock::{Self, Clock};
    use sui::coin;
    use sui::sui::SUI;
    use sui::test_scenario;
    use suichin::cuon_chun;
    use suichin::nft_valuation_lobby::{Self, BetRoom};
    use suichin::nft_valuation_lobby_config::{LobbyAdminCap, LobbyConfig};

    const ADMIN: address = @0xA;
    const CREATOR: address = @0xB;
    const JOINER: address = @0xC;

    fun setup_config(scenario: &mut test_scenario::Scenario) {
        test_scenario::next_tx(scenario, ADMIN);
        {
            nft_valuation_lobby::test_init(test_scenario::ctx(scenario));
        };

        test_scenario::next_tx(scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<LobbyAdminCap>(scenario);
            let mut config = test_scenario::take_shared<LobbyConfig>(scenario);
            nft_valuation_lobby::add_signer_pubkey(&mut config, &cap, b"signer_1");
            nft_valuation_lobby::set_coin_point_rate(&mut config, &cap, 1);
            nft_valuation_lobby::set_platform_fee(&mut config, &cap, 100);
            nft_valuation_lobby::set_emergency_refund_delay(&mut config, &cap, 1_000);
            test_scenario::return_to_sender(scenario, cap);
            test_scenario::return_shared(config);
        };
    }

    fun creator_create_waiting_room(
        scenario: &mut test_scenario::Scenario,
        clock: &Clock,
        deadline_ms: u64,
    ) {
        test_scenario::next_tx(scenario, CREATOR);
        {
            let nft = cuon_chun::mint(1, 1, test_scenario::ctx(scenario));
            let mut nfts = vector[];
            vector::push_back(&mut nfts, nft);
            let zero_coin = coin::zero<SUI>(test_scenario::ctx(scenario));
            let config = test_scenario::take_shared<LobbyConfig>(scenario);
            nft_valuation_lobby::create_room_with_deposit(
                &config,
                100,
                nfts,
                zero_coin,
                b"signer_1",
                deadline_ms,
                clock,
                test_scenario::ctx(scenario),
            );
            test_scenario::return_shared(config);
        };
    }

    #[test]
    fun test_create_and_join_room() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        setup_config(&mut scenario);
        creator_create_waiting_room(&mut scenario, &clock, 200_000);

        test_scenario::next_tx(&mut scenario, JOINER);
        {
            let nft = cuon_chun::mint(1, 1, test_scenario::ctx(&mut scenario));
            let mut nfts = vector[];
            vector::push_back(&mut nfts, nft);
            let zero_coin = coin::zero<SUI>(test_scenario::ctx(&mut scenario));
            let config = test_scenario::take_shared<LobbyConfig>(&scenario);
            let mut room = test_scenario::take_shared<BetRoom>(&scenario);
            nft_valuation_lobby::join_room_with_deposit(
                &config,
                &mut room,
                nfts,
                zero_coin,
                &clock,
                test_scenario::ctx(&mut scenario),
            );
            assert!(nft_valuation_lobby::status(&room) == 1, 0);
            assert!(nft_valuation_lobby::creator_points(&room) == 100, 1);
            assert!(nft_valuation_lobby::joiner_points(&room) == 100, 2);
            test_scenario::return_shared(config);
            test_scenario::return_shared(room);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_cancel_waiting_room() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        setup_config(&mut scenario);
        creator_create_waiting_room(&mut scenario, &clock, 200_000);

        test_scenario::next_tx(&mut scenario, CREATOR);
        {
            let config = test_scenario::take_shared<LobbyConfig>(&scenario);
            let mut room = test_scenario::take_shared<BetRoom>(&scenario);
            nft_valuation_lobby::cancel_waiting_room(
                &config,
                &mut room,
                &clock,
                test_scenario::ctx(&mut scenario),
            );
            assert!(nft_valuation_lobby::status(&room) == 3, 0);
            test_scenario::return_shared(config);
            test_scenario::return_shared(room);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_emergency_refund_after_timeout() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        setup_config(&mut scenario);
        creator_create_waiting_room(&mut scenario, &clock, 101_000);

        test_scenario::next_tx(&mut scenario, JOINER);
        {
            let nft = cuon_chun::mint(1, 1, test_scenario::ctx(&mut scenario));
            let mut nfts = vector[];
            vector::push_back(&mut nfts, nft);
            let zero_coin = coin::zero<SUI>(test_scenario::ctx(&mut scenario));
            let config = test_scenario::take_shared<LobbyConfig>(&scenario);
            let mut room = test_scenario::take_shared<BetRoom>(&scenario);
            nft_valuation_lobby::join_room_with_deposit(
                &config,
                &mut room,
                nfts,
                zero_coin,
                &clock,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(config);
            test_scenario::return_shared(room);
        };

        clock::set_for_testing(&mut clock, 103_000);
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let config = test_scenario::take_shared<LobbyConfig>(&scenario);
            let mut room = test_scenario::take_shared<BetRoom>(&scenario);
            nft_valuation_lobby::emergency_refund(
                &config,
                &mut room,
                &clock,
                test_scenario::ctx(&mut scenario),
            );
            assert!(nft_valuation_lobby::status(&room) == 4, 0);
            test_scenario::return_shared(config);
            test_scenario::return_shared(room);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}
