module suichin::achievement {
    use std::string::{Self, String};
    use sui::display;
    use sui::package;
    use sui::event;
    use suichin::player::{Self, PlayerProfile};


    // Achievement milestones
    const MILESTONE_BEGINNER: u64 = 1;      // Người Mới Bắt Đầu
    const MILESTONE_SKILLED: u64 = 5;       // Người Chơi Xuất Sắc
    const MILESTONE_EXPERT: u64 = 18;       // Tay Chun Thiên Tài
    const MILESTONE_MASTER: u64 = 36;       // Cao Thủ Búng Chun
    const MILESTONE_LEGEND: u64 = 67;       // Huyền Thoại Búng Chun

    // ===== Errors =====
    const E_NOT_OWNER: u64 = 299;
    const E_INVALID_MILESTONE: u64 = 300;
    const E_INSUFFICIENT_STREAK: u64 = 301;
    const E_ALREADY_CLAIMED: u64 = 302;

    // ===== Structs =====
    public struct ACHIEVEMENT has drop {}

    public struct Achievement has key {
        id: UID,
        milestone: u64,          // 1, 5, 18, 36, 67
        title: String,           // Tên danh hiệu
        description: String,     // Mô tả achievement
        image_url: String,       // URL ảnh achievement (String để tương thích wallet)
        owner: address,          // Address của owner (để tracking)
        claimed_at: u64,         // Timestamp claim
    }

    // ===== Events =====

    public struct AchievementClaimed has copy, drop {
        achievement_id: ID,
        milestone: u64,
        title: String,
        owner: address,
        claimed_at: u64,
    }

    // ===== Init Function =====

    #[allow(lint(share_owned))]
    fun init(otw: ACHIEVEMENT, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);

        let mut display = display::new<Achievement>(&publisher, ctx);

        display.add(
            string::utf8(b"name"),
            string::utf8(b"{title}")
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
            string::utf8(b"milestone"),
            string::utf8(b"Streak {milestone}")
        );
        display.add(
            string::utf8(b"type"),
            string::utf8(b"Soulbound Achievement")
        );
        display.add(
            string::utf8(b"project_name"),
            string::utf8(b"SuiChin")
        );
        display.add(
            string::utf8(b"project_url"),
            string::utf8(b"https://github.com/TrVHau/SuiChin-hackathon")
        );

        display.update_version();

        transfer::public_share_object(display);
        transfer::public_transfer(publisher, ctx.sender());
    }

    // ===== Public Entry Functions =====

    /// Claim achievement NFT khi đạt milestone
    public fun claim_achievement(
        profile: &mut PlayerProfile,
        milestone: u64,
        ctx: &mut TxContext
    ) {
        assert!(player::owner(profile) == tx_context::sender(ctx), E_NOT_OWNER);
        
        assert!(is_valid_milestone(milestone), E_INVALID_MILESTONE);

        assert!(!player::has_achievement(profile, milestone), E_ALREADY_CLAIMED);

        let max_streak = player::max_streak(profile);
        assert!(max_streak >= milestone, E_INSUFFICIENT_STREAK);

        let title = get_milestone_title(milestone);
        let description = get_milestone_description(milestone);
        let image_url = get_milestone_image_url(milestone);
        let owner = player::owner(profile);
        let claimed_at = tx_context::epoch_timestamp_ms(ctx);

        let achievement = Achievement {
            id: object::new(ctx),
            milestone,
            title,
            description,
            image_url,
            owner,
            claimed_at,
        };

        let achievement_id = object::id(&achievement);

        player::add_achievement(profile, milestone);

        event::emit(AchievementClaimed {
            achievement_id,
            milestone,
            title,
            owner,
            claimed_at,
        });

        transfer::public_transfer(achievement, owner);
    }

    // ===== View Functions =====

    public fun milestone(achievement: &Achievement): u64 {
        achievement.milestone
    }

    public fun title(achievement: &Achievement): String {
        achievement.title
    }

    public fun owner(achievement: &Achievement): address {
        achievement.owner
    }

    public fun claimed_at(achievement: &Achievement): u64 {
        achievement.claimed_at
    }

    fun is_valid_milestone(milestone: u64): bool {
        milestone == MILESTONE_BEGINNER ||
        milestone == MILESTONE_SKILLED ||
        milestone == MILESTONE_EXPERT ||
        milestone == MILESTONE_MASTER ||
        milestone == MILESTONE_LEGEND
    }

    fun get_milestone_title(milestone: u64): String {
        if (milestone == MILESTONE_BEGINNER) {
            string::utf8(b"Nguoi Moi Bat Dau")
        } else if (milestone == MILESTONE_SKILLED) {
            string::utf8(b"Nguoi Choi Xuat Sac")
        } else if (milestone == MILESTONE_EXPERT) {
            string::utf8(b"Tay Chun Thien Tai")
        } else if (milestone == MILESTONE_MASTER) {
            string::utf8(b"Cao Thu Bung Chun")
        } else if (milestone == MILESTONE_LEGEND) {
            string::utf8(b"Huyen Thoai Bung Chun")
        } else {
            string::utf8(b"Unknown Achievement")
        }
    }

    fun get_milestone_description(milestone: u64): String {
        if (milestone == MILESTONE_BEGINNER) {
            string::utf8(b"Thang 1 tran - Buoc dau vao the gioi bung chun")
        } else if (milestone == MILESTONE_SKILLED) {
            string::utf8(b"Thang lien tiep 5 tran - Ky nang dang cap")
        } else if (milestone == MILESTONE_EXPERT) {
            string::utf8(b"Thang lien tiep 18 tran - Thien tai bung chun")
        } else if (milestone == MILESTONE_MASTER) {
            string::utf8(b"Thang lien tiep 36 tran - Bac thay vo doi")
        } else if (milestone == MILESTONE_LEGEND) {
            string::utf8(b"Thang lien tiep 67 tran - Huyen thoai song doi")
        } else {
            string::utf8(b"Unknown milestone")
        }
    }

    fun get_milestone_image_url(milestone: u64): String {
        if (milestone == MILESTONE_BEGINNER) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/dev/frontend/public/achievements/achievement1.png")
        } else if (milestone == MILESTONE_SKILLED) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/dev/frontend/public/achievements/achievement2.png")
        } else if (milestone == MILESTONE_EXPERT) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/dev/frontend/public/achievements/achievement3.png")
        } else if (milestone == MILESTONE_MASTER) {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/dev/frontend/public/achievements/achievement4.png")
        } else {
            string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/dev/frontend/public/achievements/achievement5.png")
        }
    }

    public fun get_all_milestones(): vector<u64> {
        let mut milestones = vector::empty<u64>();
        vector::push_back(&mut milestones, MILESTONE_BEGINNER);
        vector::push_back(&mut milestones, MILESTONE_SKILLED);
        vector::push_back(&mut milestones, MILESTONE_EXPERT);
        vector::push_back(&mut milestones, MILESTONE_MASTER);
        vector::push_back(&mut milestones, MILESTONE_LEGEND);
        milestones
    }

    public fun get_milestone(nft: &Achievement): u64 {
        nft.milestone
    }

    public fun get_title(nft: &Achievement): String {
        nft.title
    }

    public fun get_description(nft: &Achievement): String {
        nft.description
    }

    public fun get_owner(nft: &Achievement): address {
        nft.owner
    }

    public fun get_claimed_at(nft: &Achievement): u64 {
        nft.claimed_at
    }


    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        let otw = ACHIEVEMENT {};
        init(otw, ctx);
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init_for_testing(ctx);
    }
}
