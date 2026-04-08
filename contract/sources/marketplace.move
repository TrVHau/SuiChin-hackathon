/// Module marketplace — escrow peer-to-peer cho CuonChunNFT.
///
/// Thiết kế:
///   Market (shared object)
///     ├─ listings: Table<ID, ListingMeta>   ← metadata
///     └─ [dynamic_object_fields]
///           └─ nft_id → CuonChunNFT         ← NFT bị lock
///
/// Không dùng Listing riêng làm shared object vì Sui không cho xóa shared
/// object → listings sẽ tích lũy vĩnh viễn. Thay vào đó NFT được lock
/// trong dynamic_object_field và metadata trong Table, cả hai xóa được.
module suichin::marketplace {
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::dynamic_object_field as dof;
    use sui::event;
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use suichin::cuon_chun::{Self, CuonChunNFT};

    // ─── Error codes ──────────────────────────────────────────────────────────
    const E_INSUFFICIENT_PAYMENT: u64 = 300;
    const E_NOT_SELLER:           u64 = 301;
    const E_CANNOT_BUY_OWN:       u64 = 302;
    const E_ZERO_PRICE:           u64 = 303;
    const E_LISTING_NOT_FOUND:    u64 = 304;

    // ─── Structs ──────────────────────────────────────────────────────────────

    /// Shared object — single marketplace cho toàn bộ game.
    public struct Market has key {
        id: UID,
        listings: Table<ID, ListingMeta>,
    }

    /// Metadata của một listing, lưu trong Market.listings.
    public struct ListingMeta has store, drop {
        seller: address,
        price: u64,      // MIST (1 SUI = 1_000_000_000 MIST)
        tier: u8,        // để FE filter
        listed_at: u64,  // timestamp ms
    }

    // ─── Events ───────────────────────────────────────────────────────────────
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

    // ─── Init ─────────────────────────────────────────────────────────────────
    fun init(ctx: &mut TxContext) {
        let market = Market {
            id: object::new(ctx),
            listings: table::new(ctx),
        };
        transfer::share_object(market);
    }

    // ─── Entry Functions ──────────────────────────────────────────────────────

    /// List NFT lên marketplace với giá price (MIST). NFT bị lock vào Market.
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

        // Lock NFT vào dynamic object field của Market
        dof::add(&mut market.id, nft_id, nft);

        // Lưu metadata
        let meta = ListingMeta {
            seller,
            price,
            tier,
            listed_at: clock::timestamp_ms(clock),
        };
        table::add(&mut market.listings, nft_id, meta);

        event::emit(Listed { listing_id: nft_id, seller, tier, price });
    }

    /// Mua NFT theo listing_id. Tiền thừa được hoàn trả buyer.
    public fun buy(
        market: &mut Market,
        listing_id: ID,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&market.listings, listing_id), E_LISTING_NOT_FOUND);

        let buyer = tx_context::sender(ctx);

        // Borrow metadata để check điều kiện TRƯỚC khi remove
        let seller = table::borrow(&market.listings, listing_id).seller;
        let price  = table::borrow(&market.listings, listing_id).price;
        assert!(buyer != seller, E_CANNOT_BUY_OWN);
        assert!(coin::value(&payment) >= price, E_INSUFFICIENT_PAYMENT);

        // All checks passed — remove metadata và NFT
        table::remove(&mut market.listings, listing_id);
        let nft: CuonChunNFT = dof::remove(&mut market.id, listing_id);
        transfer::public_transfer(nft, buyer);

        // Tách đúng price gửi seller, hoàn trả phần thừa
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

    /// Hủy listing. Chỉ seller gốc mới gọi được.
    public fun cancel(
        market: &mut Market,
        listing_id: ID,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&market.listings, listing_id), E_LISTING_NOT_FOUND);

        let sender = tx_context::sender(ctx);

        // Borrow metadata để check quyền TRƯỚC khi remove
        let seller = table::borrow(&market.listings, listing_id).seller;
        assert!(sender == seller, E_NOT_SELLER);

        // All checks passed — remove metadata và trả NFT
        table::remove(&mut market.listings, listing_id);
        let nft: CuonChunNFT = dof::remove(&mut market.id, listing_id);
        transfer::public_transfer(nft, sender);

        event::emit(Cancelled { listing_id, seller: sender });
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────

    /// Kiểm tra một listing còn tồn tại không.
    public fun has_listing(market: &Market, listing_id: ID): bool {
        table::contains(&market.listings, listing_id)
    }

    /// Đọc metadata của listing.
    public fun listing_price(market: &Market, listing_id: ID): u64 {
        table::borrow(&market.listings, listing_id).price
    }

    public fun listing_seller(market: &Market, listing_id: ID): address {
        table::borrow(&market.listings, listing_id).seller
    }

    public fun listing_tier(market: &Market, listing_id: ID): u8 {
        table::borrow(&market.listings, listing_id).tier
    }

    // ─── Test-only Helpers ───────────────────────────────────────────────────────────

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx)
    }
}
