/// Mo-dun marketplace escrow cho NFT.
module suichin::marketplace {
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::dynamic_object_field as dof;
    use sui::event;
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use suichin::cuon_chun::{Self, CuonChunNFT};

    const E_INSUFFICIENT_PAYMENT: u64 = 300;
    const E_NOT_SELLER:           u64 = 301;
    const E_CANNOT_BUY_OWN:       u64 = 302;
    const E_ZERO_PRICE:           u64 = 303;
    const E_LISTING_NOT_FOUND:    u64 = 304;


    public struct Market has key {
        id: UID,
        listings: Table<ID, ListingMeta>,
    }

    public struct ListingMeta has store, drop {
        seller: address,
        price: u64,
        tier: u8,
        listed_at: u64,
    }

    public struct Listed has copy, drop {
        listing_id: ID,
        seller: address,
        tier: u8,
        price: u64,
    }

    public struct Sold has copy, drop {
        listing_id: ID,
        buyer: address,
        seller: address,
        price: u64,
    }

    public struct Cancelled has copy, drop {
        listing_id: ID,
        seller: address,
    }

    fun init(ctx: &mut TxContext) {
        let market = Market {
            id: object::new(ctx),
            listings: table::new(ctx),
        };
        transfer::share_object(market);
    }

    fun assert_listing_exists(market: &Market, listing_id: ID) {
        assert!(table::contains(&market.listings, listing_id), E_LISTING_NOT_FOUND);
    }

    fun listing_party_and_price(market: &Market, listing_id: ID): (address, u64) {
        let meta = table::borrow(&market.listings, listing_id);
        (meta.seller, meta.price)
    }


    public fun list(
        market: &mut Market,
        nft: CuonChunNFT,
        price: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(price > 0, E_ZERO_PRICE);

        let seller = tx_context::sender(ctx);
        let nft_id = object::id(&nft);
        let tier   = cuon_chun::tier(&nft);
        dof::add(&mut market.id, nft_id, nft);
        let meta = ListingMeta {
            seller,
            price,
            tier,
            listed_at: clock::timestamp_ms(clock),
        };
        table::add(&mut market.listings, nft_id, meta);

        event::emit(Listed { listing_id: nft_id, seller, tier, price });
    }

    #[allow(lint(self_transfer))]
    public fun buy(
        market: &mut Market,
        listing_id: ID,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert_listing_exists(market, listing_id);

        let buyer = tx_context::sender(ctx);
        let (seller, price) = listing_party_and_price(market, listing_id);
        assert!(buyer != seller, E_CANNOT_BUY_OWN);
        assert!(coin::value(&payment) >= price, E_INSUFFICIENT_PAYMENT);
        table::remove(&mut market.listings, listing_id);
        let nft: CuonChunNFT = dof::remove(&mut market.id, listing_id);
        transfer::public_transfer(nft, buyer);
        let seller_payment = coin::split(&mut payment, price, ctx);
        transfer::public_transfer(seller_payment, seller);
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, buyer);
        } else {
            coin::destroy_zero(payment);
        };

        event::emit(Sold {
            listing_id,
            buyer,
            seller,
            price,
        });
    }

    #[allow(lint(self_transfer))]
    public fun cancel(
        market: &mut Market,
        listing_id: ID,
        ctx: &mut TxContext,
    ) {
        assert_listing_exists(market, listing_id);

        let sender = tx_context::sender(ctx);
        let (seller, _price) = listing_party_and_price(market, listing_id);
        assert!(sender == seller, E_NOT_SELLER);
        table::remove(&mut market.listings, listing_id);
        let nft: CuonChunNFT = dof::remove(&mut market.id, listing_id);
        transfer::public_transfer(nft, sender);

        event::emit(Cancelled { listing_id, seller: sender });
    }


    public fun has_listing(market: &Market, listing_id: ID): bool {
        table::contains(&market.listings, listing_id)
    }

    public fun listing_price(market: &Market, listing_id: ID): u64 {
        table::borrow(&market.listings, listing_id).price
    }

    public fun listing_seller(market: &Market, listing_id: ID): address {
        table::borrow(&market.listings, listing_id).seller
    }

    public fun listing_tier(market: &Market, listing_id: ID): u8 {
        table::borrow(&market.listings, listing_id).tier
    }


    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx)
    }
}
