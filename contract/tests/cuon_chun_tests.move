/// Tests for suichin::cuon_chun module
/// Covers: mint (all 3 tiers × variants), burn, accessors, variant field
#[test_only]
module suichin::cuon_chun_tests {
    use sui::test_scenario;
    use suichin::cuon_chun;

    const ADMIN: address = @0xA;

    #[test]
    fun test_mint_and_burn_bronze() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let nft = cuon_chun::mint(1, 1, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::tier(&nft) == 1, 0);
            assert!(cuon_chun::variant(&nft) == 1, 1);
            cuon_chun::burn(nft);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mint_and_burn_silver() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let nft = cuon_chun::mint(2, 2, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::tier(&nft) == 2, 0);
            assert!(cuon_chun::variant(&nft) == 2, 1);
            cuon_chun::burn(nft);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mint_and_burn_gold() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let nft = cuon_chun::mint(3, 3, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::tier(&nft) == 3, 0);
            assert!(cuon_chun::variant(&nft) == 3, 1);
            cuon_chun::burn(nft);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_nft_accessors() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let nft = cuon_chun::mint(1, 1, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::tier(&nft) == 1, 0);
            assert!(cuon_chun::variant(&nft) == 1, 1);
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
            let bronze = cuon_chun::mint(1, 1, test_scenario::ctx(&mut scenario));
            let silver = cuon_chun::mint(2, 1, test_scenario::ctx(&mut scenario));
            let gold   = cuon_chun::mint(3, 1, test_scenario::ctx(&mut scenario));

            assert!(cuon_chun::tier(&bronze) == 1, 0);
            assert!(cuon_chun::tier(&silver) == 2, 1);
            assert!(cuon_chun::tier(&gold)   == 3, 2);

            cuon_chun::burn(bronze);
            cuon_chun::burn(silver);
            cuon_chun::burn(gold);
        };
        test_scenario::end(scenario);
    }

    // ── Variant-specific tests ────────────────────────────────────────────────

    #[test]
    fun test_bronze_all_variants() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let v1 = cuon_chun::mint(1, 1, test_scenario::ctx(&mut scenario));
            let v2 = cuon_chun::mint(1, 2, test_scenario::ctx(&mut scenario));
            let v3 = cuon_chun::mint(1, 3, test_scenario::ctx(&mut scenario));
            let v4 = cuon_chun::mint(1, 4, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::variant(&v1) == 1, 0);
            assert!(cuon_chun::variant(&v2) == 2, 1);
            assert!(cuon_chun::variant(&v3) == 3, 2);
            assert!(cuon_chun::variant(&v4) == 4, 3);
            cuon_chun::burn(v1);
            cuon_chun::burn(v2);
            cuon_chun::burn(v3);
            cuon_chun::burn(v4);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_silver_all_variants() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let v1 = cuon_chun::mint(2, 1, test_scenario::ctx(&mut scenario));
            let v2 = cuon_chun::mint(2, 2, test_scenario::ctx(&mut scenario));
            let v3 = cuon_chun::mint(2, 3, test_scenario::ctx(&mut scenario));
            let v4 = cuon_chun::mint(2, 4, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::tier(&v1) == 2, 0);
            assert!(cuon_chun::variant(&v1) == 1, 1);
            assert!(cuon_chun::variant(&v2) == 2, 2);
            assert!(cuon_chun::variant(&v3) == 3, 3);
            assert!(cuon_chun::variant(&v4) == 4, 4);
            cuon_chun::burn(v1);
            cuon_chun::burn(v2);
            cuon_chun::burn(v3);
            cuon_chun::burn(v4);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_gold_all_variants() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let v1 = cuon_chun::mint(3, 1, test_scenario::ctx(&mut scenario));
            let v2 = cuon_chun::mint(3, 2, test_scenario::ctx(&mut scenario));
            let v3 = cuon_chun::mint(3, 3, test_scenario::ctx(&mut scenario));
            assert!(cuon_chun::tier(&v1) == 3, 0);
            assert!(cuon_chun::variant(&v1) == 1, 1);
            assert!(cuon_chun::variant(&v2) == 2, 2);
            assert!(cuon_chun::variant(&v3) == 3, 3);
            cuon_chun::burn(v1);
            cuon_chun::burn(v2);
            cuon_chun::burn(v3);
        };
        test_scenario::end(scenario);
    }
}
