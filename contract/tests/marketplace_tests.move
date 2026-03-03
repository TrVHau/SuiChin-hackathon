/// Tests for suichin::marketplace module
/// Covers: list, buy, cancel, error cases (own buy, not seller, insufficient payment, zero price)
#[test_only]
module suichin::marketplace_tests {
    use sui::test_scenario;
    use sui::clock::{Self, Clock};
    use sui::coin;
    use sui::sui::SUI;
    use suichin::cuon_chun::{Self, CuonChunNFT};
    use suichin::marketplace::{Self, Market};

    const ADMIN: address  = @0xA;
    const PLAYER: address = @0xB;
    const BUYER: address  = @0xC;

    // ── Helper: setup Market + mint NFT to PLAYER ────────────────────────
    fun setup_market_and_list(
        scenario: &mut test_scenario::Scenario,
        clock: &Clock,
        price: u64,
        tier: u8,
    ): ID {
        // Player mints an NFT
        test_scenario::next_tx(scenario, PLAYER);
        {
            let nft = cuon_chun::mint(tier, test_scenario::ctx(scenario));
            transfer::public_transfer(nft, PLAYER);
        };

        // Player lists NFT on marketplace
        test_scenario::next_tx(scenario, PLAYER);
        let nft = test_scenario::take_from_sender<CuonChunNFT>(scenario);
        let id = object::id(&nft);
        let mut market = test_scenario::take_shared<Market>(scenario);
        marketplace::list(
            &mut market, nft, price, clock,
            test_scenario::ctx(scenario),
        );
        test_scenario::return_shared(market);
        id
    }

    #[test]
    fun test_list_and_buy_flow() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            marketplace::test_init(test_scenario::ctx(&mut scenario));
        };

        let nft_id = setup_market_and_list(&mut scenario, &clock, 1_000_000_000, 1);

        // Verify listing metadata
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let market = test_scenario::take_shared<Market>(&scenario);
            assert!(marketplace::has_listing(&market, nft_id), 0);
            assert!(marketplace::listing_price(&market, nft_id) == 1_000_000_000, 1);
            assert!(marketplace::listing_seller(&market, nft_id) == PLAYER, 2);
            assert!(marketplace::listing_tier(&market, nft_id) == 1, 3);
            test_scenario::return_shared(market);
        };

        // Buyer purchases NFT (overpays → refund)
        test_scenario::next_tx(&mut scenario, BUYER);
        {
            let mut market = test_scenario::take_shared<Market>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                2_000_000_000, test_scenario::ctx(&mut scenario),
            );
            marketplace::buy(
                &mut market, nft_id, payment,
                test_scenario::ctx(&mut scenario),
            );
            assert!(!marketplace::has_listing(&market, nft_id), 0);
            test_scenario::return_shared(market);
        };

        // Verify buyer now owns the NFT
        test_scenario::next_tx(&mut scenario, BUYER);
        {
            let nft = test_scenario::take_from_sender<CuonChunNFT>(&scenario);
            assert!(cuon_chun::tier(&nft) == 1, 0);
            test_scenario::return_to_sender(&scenario, nft);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_list_and_buy_exact_payment() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            marketplace::test_init(test_scenario::ctx(&mut scenario));
        };

        let nft_id = setup_market_and_list(&mut scenario, &clock, 500_000_000, 2);

        // Buyer pays exact price
        test_scenario::next_tx(&mut scenario, BUYER);
        {
            let mut market = test_scenario::take_shared<Market>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                500_000_000, test_scenario::ctx(&mut scenario),
            );
            marketplace::buy(
                &mut market, nft_id, payment,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(market);
        };

        test_scenario::next_tx(&mut scenario, BUYER);
        {
            let nft = test_scenario::take_from_sender<CuonChunNFT>(&scenario);
            assert!(cuon_chun::tier(&nft) == 2, 0);
            test_scenario::return_to_sender(&scenario, nft);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_list_and_cancel_flow() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            marketplace::test_init(test_scenario::ctx(&mut scenario));
        };

        let nft_id = setup_market_and_list(&mut scenario, &clock, 500_000_000, 2);

        // Player cancels their listing
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut market = test_scenario::take_shared<Market>(&scenario);
            marketplace::cancel(
                &mut market, nft_id,
                test_scenario::ctx(&mut scenario),
            );
            assert!(!marketplace::has_listing(&market, nft_id), 0);
            test_scenario::return_shared(market);
        };

        // Verify player got NFT back
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let nft = test_scenario::take_from_sender<CuonChunNFT>(&scenario);
            assert!(cuon_chun::tier(&nft) == 2, 0);
            test_scenario::return_to_sender(&scenario, nft);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_buy_own_listing() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            marketplace::test_init(test_scenario::ctx(&mut scenario));
        };

        let nft_id = setup_market_and_list(&mut scenario, &clock, 1_000_000_000, 1);

        // Player tries to buy own listing → abort (E_CANNOT_BUY_OWN)
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut market = test_scenario::take_shared<Market>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                1_000_000_000, test_scenario::ctx(&mut scenario),
            );
            marketplace::buy(
                &mut market, nft_id, payment,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(market);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_cancel_not_seller() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            marketplace::test_init(test_scenario::ctx(&mut scenario));
        };

        let nft_id = setup_market_and_list(&mut scenario, &clock, 1_000_000_000, 1);

        // BUYER (not seller) tries to cancel → abort (E_NOT_SELLER)
        test_scenario::next_tx(&mut scenario, BUYER);
        {
            let mut market = test_scenario::take_shared<Market>(&scenario);
            marketplace::cancel(
                &mut market, nft_id,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(market);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_buy_insufficient_payment() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            marketplace::test_init(test_scenario::ctx(&mut scenario));
        };

        let nft_id = setup_market_and_list(&mut scenario, &clock, 1_000_000_000, 1);

        // Buyer pays only 500_000_000 (need 1_000_000_000) → abort
        test_scenario::next_tx(&mut scenario, BUYER);
        {
            let mut market = test_scenario::take_shared<Market>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                500_000_000, test_scenario::ctx(&mut scenario),
            );
            marketplace::buy(
                &mut market, nft_id, payment,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(market);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_multiple_listings() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 100_000);

        {
            marketplace::test_init(test_scenario::ctx(&mut scenario));
        };

        let id1 = setup_market_and_list(&mut scenario, &clock, 1_000_000_000, 1);
        let id2 = setup_market_and_list(&mut scenario, &clock, 2_000_000_000, 3);

        // Both listings active
        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let market = test_scenario::take_shared<Market>(&scenario);
            assert!(marketplace::has_listing(&market, id1), 0);
            assert!(marketplace::has_listing(&market, id2), 1);
            test_scenario::return_shared(market);
        };

        // Buy first, cancel second
        test_scenario::next_tx(&mut scenario, BUYER);
        {
            let mut market = test_scenario::take_shared<Market>(&scenario);
            let payment = coin::mint_for_testing<SUI>(
                1_000_000_000, test_scenario::ctx(&mut scenario),
            );
            marketplace::buy(
                &mut market, id1, payment,
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(market);
        };

        test_scenario::next_tx(&mut scenario, PLAYER);
        {
            let mut market = test_scenario::take_shared<Market>(&scenario);
            marketplace::cancel(
                &mut market, id2,
                test_scenario::ctx(&mut scenario),
            );
            assert!(!marketplace::has_listing(&market, id1), 0);
            assert!(!marketplace::has_listing(&market, id2), 1);
            test_scenario::return_shared(market);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}
