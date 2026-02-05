#[test_only]
module suichin::chun_roll_tests {
    use sui::test_scenario::{Self as ts};
    use suichin::chun_roll::{Self, ChunRoll};
    use std::string;

    const ADMIN: address = @0xAD;
    const PLAYER1: address = @0x1;
    const PLAYER2: address = @0x2;

    #[test]
    fun test_mint_tier1() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize the module
        ts::next_tx(&mut scenario, ADMIN);
        {
            chun_roll::test_init(ts::ctx(&mut scenario));
        };

        // Mint tier1 NFT
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let nft = chun_roll::mint_for_testing(1, ts::ctx(&mut scenario));
            
            assert!(chun_roll::get_tier(&nft) == 1, 0);
            assert!(chun_roll::get_name(&nft) == string::utf8(b"Cuon Chun Dong"), 1);
            
            transfer::public_transfer(nft, PLAYER1);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_mint_tier2() {
        let mut scenario = ts::begin(ADMIN);
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            chun_roll::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, PLAYER1);
        {
            let nft = chun_roll::mint_for_testing(2, ts::ctx(&mut scenario));
            
            assert!(chun_roll::get_tier(&nft) == 2, 0);
            assert!(chun_roll::get_name(&nft) == string::utf8(b"Cuon Chun Bac"), 1);
            
            transfer::public_transfer(nft, PLAYER1);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_mint_tier3() {
        let mut scenario = ts::begin(ADMIN);
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            chun_roll::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, PLAYER1);
        {
            let nft = chun_roll::mint_for_testing(3, ts::ctx(&mut scenario));
            
            assert!(chun_roll::get_tier(&nft) == 3, 0);
            assert!(chun_roll::get_name(&nft) == string::utf8(b"Cuon Chun Vang"), 1);
            
            transfer::public_transfer(nft, PLAYER1);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suichin::chun_roll::E_INVALID_TIER)]
    fun test_mint_invalid_tier() {
        let mut scenario = ts::begin(ADMIN);
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            chun_roll::test_init(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, PLAYER1);
        {
            // Try to mint with invalid tier
            let nft = chun_roll::mint_for_testing(4, ts::ctx(&mut scenario));
            transfer::public_transfer(nft, PLAYER1);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_burn() {
        let mut scenario = ts::begin(ADMIN);
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            chun_roll::test_init(ts::ctx(&mut scenario));
        };

        // Mint NFT
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let nft = chun_roll::mint_for_testing(1, ts::ctx(&mut scenario));
            transfer::public_transfer(nft, PLAYER1);
        };

        // Burn NFT
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let nft = ts::take_from_sender<ChunRoll>(&scenario);
            chun_roll::burn(nft);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_transfer() {
        let mut scenario = ts::begin(ADMIN);
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            chun_roll::test_init(ts::ctx(&mut scenario));
        };

        // Mint NFT for PLAYER1
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let nft = chun_roll::mint_for_testing(2, ts::ctx(&mut scenario));
            transfer::public_transfer(nft, PLAYER1);
        };

        // Transfer to PLAYER2
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let nft = ts::take_from_sender<ChunRoll>(&scenario);
            transfer::public_transfer(nft, PLAYER2);
        };

        // Verify PLAYER2 has it
        ts::next_tx(&mut scenario, PLAYER2);
        {
            assert!(ts::has_most_recent_for_sender<ChunRoll>(&scenario), 0);
            let nft = ts::take_from_sender<ChunRoll>(&scenario);
            assert!(chun_roll::get_tier(&nft) == 2, 1);
            ts::return_to_sender(&scenario, nft);
        };

        ts::end(scenario);
    }
}
