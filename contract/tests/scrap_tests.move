/// Tests for suichin::scrap module
/// Covers: mint, burn, accessors
#[test_only]
module suichin::scrap_tests {
    use sui::test_scenario;
    use suichin::scrap;

    const ADMIN: address = @0xA;

    #[test]
    fun test_mint_and_burn_scrap() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let s = scrap::mint(test_scenario::ctx(&mut scenario));
            scrap::burn(s);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_scrap_accessors() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let s = scrap::mint(test_scenario::ctx(&mut scenario));
            let _name = scrap::name(&s);
            let _url  = scrap::image_url(&s);
            scrap::burn(s);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mint_multiple_scraps() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            let s1 = scrap::mint(test_scenario::ctx(&mut scenario));
            let s2 = scrap::mint(test_scenario::ctx(&mut scenario));
            let s3 = scrap::mint(test_scenario::ctx(&mut scenario));
            scrap::burn(s1);
            scrap::burn(s2);
            scrap::burn(s3);
        };
        test_scenario::end(scenario);
    }
}
