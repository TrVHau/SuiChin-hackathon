/// Mo-dun huy hieu thanh tich theo streak.
module suichin::achievement {
    use std::string::{Self, String};
    use sui::clock::{Self, Clock};
    use sui::event;
    use suichin::player_profile::{Self, PlayerProfile};

    const E_INVALID_BADGE_TYPE: u64 = 400;
    const E_STREAK_TOO_LOW:     u64 = 401;
    const E_NOT_OWNER:          u64 = 402;

    public struct AchievementBadge has key {
        id: UID,
        badge_type: u64,
        name: String,
        description: String,
        image_url: String,
        earned_at: u64,
    }

    public struct BadgeClaimed has copy, drop {
        badge_id: ID,
        recipient: address,
        badge_type: u64,
        earned_at: u64,
    }


    fun milestone_streak(badge_type: u64): u64 {
        if      (badge_type == 1)  { 1  }
        else if (badge_type == 5)  { 5  }
        else if (badge_type == 18) { 18 }
        else if (badge_type == 36) { 36 }
        else if (badge_type == 67) { 67 }
        else { abort E_INVALID_BADGE_TYPE }
    }

    fun badge_name(badge_type: u64): String {
        if      (badge_type == 1)  { string::utf8(b"Nguoi Moi Bat Dau")    }
        else if (badge_type == 5)  { string::utf8(b"Nguoi Choi Xuat Sac")  }
        else if (badge_type == 18) { string::utf8(b"Tay Chun Thien Tai")   }
        else if (badge_type == 36) { string::utf8(b"Cao Thu Bung Chun")    }
        else                       { string::utf8(b"Huyen Thoai Bung Chun")}
    }

    fun badge_description(badge_type: u64): String {
        if      (badge_type == 1)  { string::utf8(b"Dat streak 1 lan thang lien tiep")  }
        else if (badge_type == 5)  { string::utf8(b"Dat streak 5 lan thang lien tiep")  }
        else if (badge_type == 18) { string::utf8(b"Dat streak 18 lan thang lien tiep") }
        else if (badge_type == 36) { string::utf8(b"Dat streak 36 lan thang lien tiep") }
        else                       { string::utf8(b"Dat streak 67 lan thang lien tiep") }
    }

    fun badge_image_url(badge_type: u64): String {
        if      (badge_type == 1)  { string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/achievements/achievement1.png")  }
        else if (badge_type == 5)  { string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/achievements/achievement2.png")  }
        else if (badge_type == 18) { string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/achievements/achievement3.png") }
        else if (badge_type == 36) { string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/achievements/achievement4.png") }
        else                       { string::utf8(b"https://raw.githubusercontent.com/TrVHau/SuiChin-hackathon/refs/heads/main/frontend/public/achievements/achievement5.png") }
    }


    public fun claim_badge(
        profile: &PlayerProfile,
        badge_type: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == player_profile::owner(profile), E_NOT_OWNER);
        let required_streak = milestone_streak(badge_type);
        assert!(player_profile::streak(profile) >= required_streak, E_STREAK_TOO_LOW);
        let earned_at = clock::timestamp_ms(clock);

        let badge = AchievementBadge {
            id: object::new(ctx),
            badge_type,
            name: badge_name(badge_type),
            description: badge_description(badge_type),
            image_url: badge_image_url(badge_type),
            earned_at,
        };

        event::emit(BadgeClaimed {
            badge_id: object::id(&badge),
            recipient: sender,
            badge_type,
            earned_at,
        });
        transfer::transfer(badge, sender);
    }

    public fun badge_type(badge: &AchievementBadge): u64    { badge.badge_type }

    public fun name(badge: &AchievementBadge): String       { badge.name }

    public fun description(badge: &AchievementBadge): String{ badge.description }

    public fun image_url(badge: &AchievementBadge): String  { badge.image_url }

    public fun earned_at(badge: &AchievementBadge): u64     { badge.earned_at }
}
