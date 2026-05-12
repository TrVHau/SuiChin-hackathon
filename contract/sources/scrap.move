/// Module định nghĩa Scrap — byproduct nhận được khi craft / trade-up thất bại.
/// Transferable nhưng không có thị trường chính thức (UI enforce không cho list).
/// Chỉ package nội bộ mới có thể mint / burn.
module suichin::scrap {
    use std::string::{Self, String};
    use sui::event;

    // ─── Struct ───────────────────────────────────────────────────────────────
    public struct Scrap has key, store {
        id: UID,
        name: String,
        image_url: String,
    }

    // ─── Events ───────────────────────────────────────────────────────────────
    public struct ScrapMinted has copy, drop {
        scrap_id: ID,
        recipient: address,
    }

    public struct ScrapBurned has copy, drop {
        scrap_id: ID,
    }

    // ─── Package-internal Functions ───────────────────────────────────────────

    /// Mint Scrap moi cho mot recipient cu the. Chi goi duoc tu trong cung package.
    public(package) fun mint_for(recipient: address, ctx: &mut TxContext): Scrap {
        let scrap = Scrap {
            id: object::new(ctx),
            name: string::utf8(b"Manh Vun Chun"),
            image_url: string::utf8(
                b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/nft/scrap.png"
            ),
        };
        event::emit(ScrapMinted {
            scrap_id: object::id(&scrap),
            recipient,
        });
        scrap
    }

    /// Mint Scrap moi. Chi goi duoc tu trong cung package.
    public(package) fun mint(ctx: &mut TxContext): Scrap {
        mint_for(tx_context::sender(ctx), ctx)
    }

    /// Burn Scrap. Chỉ gọi được từ trong cùng package.
    public(package) fun burn(scrap: Scrap) {
        let Scrap { id, name: _, image_url: _ } = scrap;
        event::emit(ScrapBurned { scrap_id: object::uid_to_inner(&id) });
        object::delete(id);
    }

    // ─── Public Accessors ─────────────────────────────────────────────────────
    public fun name(scrap: &Scrap): String      { scrap.name }
    public fun image_url(scrap: &Scrap): String { scrap.image_url }
}
