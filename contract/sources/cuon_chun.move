/// Module định nghĩa CuonChunNFT — NFT chính của SuiChin.
/// Ba tier: Bronze (1) / Silver (2) / Gold (3).
/// has key + store cho phép escrow trong marketplace.
/// Chỉ package nội bộ mới có thể mint / burn.
module suichin::cuon_chun {
    use std::string::{Self, String};
    use sui::display;
    use sui::event;
    use sui::package;

    // ─── One-Time Witness (cho Display) ───────────────────────────────────────
    public struct CUON_CHUN has drop {}

    // ─── Struct ───────────────────────────────────────────────────────────────
    public struct CuonChunNFT has key, store {
        id: UID,
        tier: u8,         // 1=Bronze, 2=Silver, 3=Gold
        variant: u8,      // biến thể trong tier, bắt đầu từ 1
        name: String,
        image_url: String,
    }

    // ─── Events ───────────────────────────────────────────────────────────────
    public struct ChunNFTMinted has copy, drop {
        nft_id: ID,
        tier: u8,
        variant: u8,
        recipient: address,
    }

    public struct ChunNFTBurned has copy, drop {
        nft_id: ID,
        tier: u8,
    }

    // ─── Init (Display setup) ─────────────────────────────────────────────────
    fun init(witness: CUON_CHUN, ctx: &mut TxContext) {
        let publisher = package::claim(witness, ctx);
        let mut disp = display::new<CuonChunNFT>(&publisher, ctx);
        disp.add(
            string::utf8(b"name"),
            string::utf8(b"{name}"),
        );
        disp.add(
            string::utf8(b"image_url"),
            string::utf8(b"{image_url}"),
        );
        disp.add(
            string::utf8(b"description"),
            string::utf8(b"Cuon Chun SuiChin - Tier: {tier}"),
        );
        disp.add(
            string::utf8(b"project_url"),
            string::utf8(b"https://github.com/TrVHau/SuiChin-hackathon"),
        );
        disp.update_version();
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(disp, tx_context::sender(ctx));
    }

    // ─── Package-internal Functions ───────────────────────────────────────────

    /// Mint CuonChunNFT mới. Chỉ gọi được từ trong cùng package.
    /// tier: 1=Bronze, 2=Silver, 3=Gold
    /// variant: 1–4 cho Bronze/Silver, 1–3 cho Gold
    public(package) fun mint(tier: u8, variant: u8, ctx: &mut TxContext): CuonChunNFT {
        let name_str = if (tier == 1) {
            string::utf8(b"Cuon Chun Dong")
        } else if (tier == 2) {
            string::utf8(b"Cuon Chun Bac")
        } else {
            string::utf8(b"Cuon Chun Vang")
        };

        let image_str = if (tier == 1 && variant == 1) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier1_v1.png")
        } else if (tier == 1 && variant == 2) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier1_v2.png")
        } else if (tier == 1 && variant == 3) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier1_v3.png")
        } else if (tier == 1 && variant == 4) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier1_v4.png")
        } else if (tier == 2 && variant == 1) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier2_v1.png")
        } else if (tier == 2 && variant == 2) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier2_v2.png")
        } else if (tier == 2 && variant == 3) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier2_v3.png")
        } else if (tier == 2 && variant == 4) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier2_v4.png")
        } else if (tier == 3 && variant == 1) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier3_v1.png")
        } else if (tier == 3 && variant == 2) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier3_v2.png")
        } else {
            // tier == 3 && variant == 3 (hoặc fallback)
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/tier3_v3.png")
        };

        let nft = CuonChunNFT {
            id: object::new(ctx),
            tier,
            variant,
            name: name_str,
            image_url: image_str,
        };

        event::emit(ChunNFTMinted {
            nft_id: object::id(&nft),
            tier,
            variant,
            recipient: tx_context::sender(ctx),
        });

        nft
    }

    /// Burn CuonChunNFT. Chỉ gọi được từ trong cùng package.
    public(package) fun burn(nft: CuonChunNFT) {
        let CuonChunNFT { id, tier, variant: _, name: _, image_url: _ } = nft;
        event::emit(ChunNFTBurned { nft_id: object::uid_to_inner(&id), tier });
        object::delete(id);
    }

    // ─── Public Accessors ─────────────────────────────────────────────────────
    public fun tier(nft: &CuonChunNFT): u8         { nft.tier }
    public fun variant(nft: &CuonChunNFT): u8      { nft.variant }
    public fun name(nft: &CuonChunNFT): String     { nft.name }
    public fun image_url(nft: &CuonChunNFT): String { nft.image_url }
}
