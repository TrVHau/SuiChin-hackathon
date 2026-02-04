/// Module: chun_roll
/// Description: ChunRoll NFT - Cuộn chun có thể transfer
module suichin::chun_roll {
    use std::string::{Self, String};
    use sui::display;
    use sui::package;
    use sui::event;

    // ===== Errors =====
    const E_INVALID_TIER: u64 = 200;

    // ===== Structs =====

    /// One-Time-Witness cho Display Protocol
    public struct CHUN_ROLL has drop {}

    /// ChunRoll NFT - Transferable
    public struct ChunRoll has key, store {
        id: UID,
        tier: u8,                // 1, 2, hoặc 3
        name: String,            // "Cuộn Chun Đồng", "Cuộn Chun Bạc", "Cuộn Chun Vàng"
        description: String,     // Mô tả
        image_url: String,       // URL ảnh NFT (String để tương thích wallet)
    }

    // ===== Events =====

    public struct ChunRollMinted has copy, drop {
        nft_id: ID,
        tier: u8,
        recipient: address,
    }

    public struct ChunRollBurned has copy, drop {
        nft_id: ID,
        tier: u8,
    }

    // ===== Init Function =====

    /// Initialize Display Protocol
    #[allow(lint(share_owned))]
    fun init(otw: CHUN_ROLL, ctx: &mut TxContext) {
        // Claim Publisher
        let publisher = package::claim(otw, ctx);

        // Setup Display Protocol
        let mut display = display::new<ChunRoll>(&publisher, ctx);

        // Define display fields
        display.add(
            string::utf8(b"name"),
            string::utf8(b"{name}")
        );
        display.add(
            string::utf8(b"description"),
            string::utf8(b"{description}")
        );
        display.add(
            string::utf8(b"image_url"),
            string::utf8(b"{image_url}")
        );
        display.add(
            string::utf8(b"tier"),
            string::utf8(b"Tier {tier}")
        );
        display.add(
            string::utf8(b"project_name"),
            string::utf8(b"SuiChin")
        );
        display.add(
            string::utf8(b"project_url"),
            string::utf8(b"https://github.com/TrVHau/SuiChin-hackathon")
        );
        display.add(
            string::utf8(b"creator"),
            string::utf8(b"SuiChin Team")
        );

        // Update version
        display.update_version();

        // Share display object (best practice for indexer)
        transfer::public_share_object(display);
        transfer::public_transfer(publisher, ctx.sender());
    }

    // ===== Public Functions =====

    /// Mint ChunRoll NFT (called by game module)
    public(package) fun mint(
        tier: u8,
        ctx: &mut TxContext
    ): ChunRoll {
        assert!(tier >= 1 && tier <= 3, E_INVALID_TIER);

        let nft = ChunRoll {
            id: object::new(ctx),
            tier,
            name: get_tier_name(tier),
            description: get_tier_description(tier),
            image_url: get_tier_image_url(tier),
        };

        let nft_id = object::id(&nft);

        event::emit(ChunRollMinted {
            nft_id,
            tier,
            recipient: ctx.sender(),
        });

        nft
    }

    /// Burn ChunRoll NFT
    public fun burn(nft: ChunRoll) {
        let ChunRoll { id, tier, name: _, description: _, image_url: _ } = nft;
        let nft_id = object::uid_to_inner(&id);

        event::emit(ChunRollBurned {
            nft_id,
            tier,
        });

        object::delete(id);
    }

    // ===== View Functions =====

    public fun tier(nft: &ChunRoll): u8 {
        nft.tier
    }

    public fun name(nft: &ChunRoll): String {
        nft.name
    }

    public fun description(nft: &ChunRoll): String {
        nft.description
    }

    public fun image_url(nft: &ChunRoll): String {
        nft.image_url
    }

    /// Getter aliases for testing
    public fun get_tier(nft: &ChunRoll): u8 {
        nft.tier
    }

    public fun get_name(nft: &ChunRoll): String {
        nft.name
    }

    public fun get_description(nft: &ChunRoll): String {
        nft.description
    }

    public fun get_image_url(nft: &ChunRoll): String {
        nft.image_url
    }

    // ===== Helper Functions =====

    /// Get tier name
    fun get_tier_name(tier: u8): String {
        if (tier == 1) {
            string::utf8(b"Cuon Chun Dong")
        } else if (tier == 2) {
            string::utf8(b"Cuon Chun Bac")
        } else {
            string::utf8(b"Cuon Chun Vang")
        }
    }

    /// Get tier description
    fun get_tier_description(tier: u8): String {
        if (tier == 1) {
            string::utf8(b"Cuon chun cap do Dong - Danh cho nguoi choi moi bat dau")
        } else if (tier == 2) {
            string::utf8(b"Cuon chun cap do Bac - Danh cho nguoi choi co kinh nghiem")
        } else {
            string::utf8(b"Cuon chun cap do Vang - Danh cho bac thay bung chun")
        }
    }

    /// Get tier image URL
    /// TODO: Replace với URL thật sau khi upload images
    fun get_tier_image_url(tier: u8): String {
        if (tier == 1) {
            // Tier 1 - Bronze
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/dev/frontend/public/nft/tier1.png")
        } else if (tier == 2) {
            // Tier 2 - Silver
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/dev/frontend/public/nft/tier2.png")
        } else {
            // Tier 3 - Gold
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/dev/frontend/public/nft/tier3.png")
        }
    }

    // ===== Test-only Functions =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        let otw = CHUN_ROLL {};
        init(otw, ctx);
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init_for_testing(ctx);
    }

    #[test_only]
    public fun mint_for_testing(tier: u8, ctx: &mut TxContext): ChunRoll {
        mint(tier, ctx)
    }
}
