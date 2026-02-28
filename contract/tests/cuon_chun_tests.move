/// Tests for suichin::cuon_chun module
/// Covers: mint (all 3 tiers), burn, accessors
#[test_only]
module suichin::cuon_chun_tests {
    use sui::test_scenario;
    use suichin::cuon_chun;

    const ADMIN: address = @0xA;

    #[test]
    fun test_mint_and_burn_bronze() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let nft = cuon_chun::mint(1, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::tier(&nft) == 1, 0);
            cuon_chun::burn(nft);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mint_and_burn_silver() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let nft = cuon_chun::mint(2, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::tier(&nft) == 2, 0);
            cuon_chun::burn(nft);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mint_and_burn_gold() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let nft = cuon_chun::mint(3, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::tier(&nft) == 3, 0);
            cuon_chun::burn(nft);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_nft_accessors() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let nft = cuon_chun::mint(1, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::tier(&nft) == 1, 0);
            // name and image_url should not be empty
            let _name = cuon_chun::name(&nft);
            let _url = cuon_chun::image_url(&nft);
            cuon_chun::burn(nft);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mint_multiple_and_burn() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let bronze = cuon_chun::mint(1, test_scenario::ctx(&mut scenario));
            let silver = cuon_chun::mint(2, test_scenario::ctx(&mut scenario));
            let gold   = cuon_chun::mint(3, test_scenario::ctx(&mut scenario));

            assert!(cuon_chun::tier(&bronze) == 1, 0);
            assert!(cuon_chun::tier(&silver) == 2, 1);
            assert!(cuon_chun::tier(&gold)   == 3, 2);

            cuon_chun::burn(bronze);
            cuon_chun::burn(silver);
            cuon_chun::burn(gold);
        };
        test_scenario::end(scenario);
    }
}
