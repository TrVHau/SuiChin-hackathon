/// NFT Valuation Lobby PvP Escrow.
///
/// Room lifecycle and settlement logic are kept here.
/// Admin/configuration is split into `nft_valuation_lobby_config`.
module suichin::nft_valuation_lobby {
    use std::bcs;
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::dynamic_object_field as dof;
    use sui::ed25519;
    use sui::event;
    use sui::sui::SUI;
    use suichin::cuon_chun::{Self, CuonChunNFT};
    use suichin::nft_valuation_lobby_config::{Self as lobby_config, LobbyAdminCap, LobbyConfig};
    use suichin::scrap;

    const STATUS_WAITING: u8 = 0;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_SETTLED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;
    const STATUS_EMERGENCY_REFUNDED: u8 = 4;

    const E_PAUSED: u64 = 700;
    const E_INVALID_TARGET_POINTS: u64 = 701;
    const E_INVALID_STATUS: u64 = 702;
    const E_INSUFFICIENT_POINTS: u64 = 703;
    const E_NOT_CREATOR: u64 = 704;
    const E_ROOM_EXPIRED: u64 = 705;
    const E_JOINER_ALREADY_SET: u64 = 706;
    const E_CANNOT_JOIN_OWN_ROOM: u64 = 707;
    const E_SIGNATURE_EXPIRED: u64 = 709;
    const E_INVALID_NONCE: u64 = 710;
    const E_INVALID_SIGNATURE: u64 = 711;
    const E_INVALID_PARTICIPANTS: u64 = 712;
    const E_REFUND_NOT_READY: u64 = 714;
    const E_INVALID_DEADLINE: u64 = 716;
    const E_SIGNER_MISMATCH: u64 = 717;
    const E_NO_JOINER: u64 = 718;

    const SETTLEMENT_INTENT_SCOPE: u8 = 1;

    public struct BetRoom has key {
        id: UID,
        creator: address,
        joiner: Option<address>,
        target_points: u64,
        status: u8,
        created_at_ms: u64,
        activated_at_ms: Option<u64>,
        deadline_ms: u64,
        signer_pubkey: vector<u8>,
        escrow_snapshot_hash: vector<u8>,
        nonce: u64,

        creator_coin: Balance<SUI>,
        joiner_coin: Balance<SUI>,
        creator_nft_ids: vector<ID>,
        joiner_nft_ids: vector<ID>,
        creator_points: u64,
        joiner_points: u64,
        fee_bps: u16,
    }

    public struct SettlementMessage has drop, store {
        intent_scope: u8,
        chain_id: u8,
        package_id: address,
        room_id: ID,
        winner: address,
        loser: address,
        match_digest: vector<u8>,
        nonce: u64,
        deadline_ms: u64,
    }

    public struct RoomCreated has copy, drop {
        version: u64,
        room_id: ID,
        creator: address,
        target_points: u64,
        creator_points: u64,
        deadline_ms: u64,
        timestamp_ms: u64,
    }

    public struct RoomJoined has copy, drop {
        version: u64,
        room_id: ID,
        joiner: address,
        joiner_points: u64,
        timestamp_ms: u64,
    }

    public struct RoomActivated has copy, drop {
        version: u64,
        room_id: ID,
        activated_at_ms: u64,
    }

    public struct RoomCancelled has copy, drop {
        version: u64,
        room_id: ID,
        by: address,
        reason: u8, // 1 = creator cancelled waiting room
        timestamp_ms: u64,
    }

    public struct RoomSettled has copy, drop {
        version: u64,
        room_id: ID,
        winner: address,
        loser: address,
        fee_paid: u64,
        creator_points: u64,
        joiner_points: u64,
        match_digest: vector<u8>,
        timestamp_ms: u64,
    }

    public struct EmergencyRefunded has copy, drop {
        version: u64,
        room_id: ID,
        refund_mode: u8, // 1 = timeout admin/any caller trigger
        timestamp_ms: u64,
    }

    fun points_from_coin(config: &LobbyConfig, coin_amount: u64): u64 {
        coin_amount * lobby_config::coin_point_rate(config)
    }

    fun points_satisfy(config: &LobbyConfig, points: u64, target_points: u64): bool {
        if (lobby_config::strict_equal_points(config)) {
            points == target_points
        } else {
            points >= target_points
        }
    }

    fun deposit_nfts_to_room(
        room: &mut BetRoom,
        mut nfts: vector<CuonChunNFT>,
        is_creator: bool,
        config: &LobbyConfig,
    ): u64 {
        let mut points = 0;
        let len = vector::length(&nfts);
        let mut i = 0;
        while (i < len) {
            let nft = vector::pop_back(&mut nfts);
            let nft_id = object::id(&nft);
            points = points + lobby_config::points_for_tier(config, cuon_chun::tier(&nft));
            dof::add(&mut room.id, nft_id, nft);
            if (is_creator) {
                vector::push_back(&mut room.creator_nft_ids, nft_id);
            } else {
                vector::push_back(&mut room.joiner_nft_ids, nft_id);
            };
            i = i + 1;
        };
        vector::destroy_empty(nfts);
        points
    }

    fun transfer_nfts_from_ids(room_id: &mut UID, ids: &mut vector<ID>, recipient: address) {
        let len = vector::length(ids);
        let mut i = 0;
        while (i < len) {
            let nft_id = vector::pop_back(ids);
            let nft: CuonChunNFT = dof::remove(room_id, nft_id);
            transfer::public_transfer(nft, recipient);
            i = i + 1;
        };
    }

    fun transfer_all_coin(balance_in: &mut Balance<SUI>, recipient: address, ctx: &mut TxContext) {
        let amount = balance::value(balance_in);
        if (amount > 0) {
            let b = balance::withdraw_all(balance_in);
            let c = coin::from_balance(b, ctx);
            transfer::public_transfer(c, recipient);
        };
    }

    fun clone_bytes(bytes: &vector<u8>): vector<u8> {
        let mut out = vector[];
        let len = vector::length(bytes);
        let mut i = 0;
        while (i < len) {
            vector::push_back(&mut out, *vector::borrow(bytes, i));
            i = i + 1;
        };
        out
    }

    fun build_settlement_message(
        chain_id: u8,
        room_id: ID,
        winner: address,
        loser: address,
        match_digest: &vector<u8>,
        nonce: u64,
        deadline_ms: u64,
    ): vector<u8> {
        let payload = SettlementMessage {
            intent_scope: SETTLEMENT_INTENT_SCOPE,
            chain_id,
            package_id: @suichin,
            room_id,
            winner,
            loser,
            match_digest: clone_bytes(match_digest),
            nonce,
            deadline_ms,
        };
        bcs::to_bytes(&payload)
    }

    fun assert_valid_winner_loser(room: &BetRoom, winner: address, loser: address) {
        assert!(option::is_some(&room.joiner), E_NO_JOINER);
        let joiner = *option::borrow(&room.joiner);
        let valid = (winner == room.creator && loser == joiner)
            || (winner == joiner && loser == room.creator);
        assert!(valid, E_INVALID_PARTICIPANTS);
    }

    // Wrappers kept for compatibility with existing callers.
    public fun set_pause(config: &mut LobbyConfig, cap: &LobbyAdminCap, paused: bool) {
        lobby_config::set_pause(config, cap, paused);
    }

    public fun set_point_rules(
        config: &mut LobbyConfig,
        cap: &LobbyAdminCap,
        bronze_points: u64,
        silver_points: u64,
        gold_points: u64,
    ) {
        lobby_config::set_point_rules(config, cap, bronze_points, silver_points, gold_points);
    }

    public fun set_coin_point_rate(
        config: &mut LobbyConfig,
        cap: &LobbyAdminCap,
        coin_point_rate: u64,
    ) {
        lobby_config::set_coin_point_rate(config, cap, coin_point_rate);
    }

    public fun set_platform_fee(
        config: &mut LobbyConfig,
        cap: &LobbyAdminCap,
        platform_fee_bps: u16,
    ) {
        lobby_config::set_platform_fee(config, cap, platform_fee_bps);
    }

    public fun set_emergency_refund_delay(
        config: &mut LobbyConfig,
        cap: &LobbyAdminCap,
        delay_ms: u64,
    ) {
        lobby_config::set_emergency_refund_delay(config, cap, delay_ms);
    }

    public fun set_chain_id(
        config: &mut LobbyConfig,
        cap: &LobbyAdminCap,
        chain_id: u8,
    ) {
        lobby_config::set_chain_id(config, cap, chain_id);
    }

    public fun set_treasury(
        config: &mut LobbyConfig,
        cap: &LobbyAdminCap,
        treasury: address,
    ) {
        lobby_config::set_treasury(config, cap, treasury);
    }

    public fun set_strict_equal_points(
        config: &mut LobbyConfig,
        cap: &LobbyAdminCap,
        strict_equal_points: bool,
    ) {
        lobby_config::set_strict_equal_points(config, cap, strict_equal_points);
    }

    public fun add_signer_pubkey(
        config: &mut LobbyConfig,
        cap: &LobbyAdminCap,
        signer_pubkey: vector<u8>,
    ) {
        lobby_config::add_signer_pubkey(config, cap, signer_pubkey);
    }

    public fun remove_signer_pubkey(
        config: &mut LobbyConfig,
        cap: &LobbyAdminCap,
        signer_pubkey: vector<u8>,
    ) {
        lobby_config::remove_signer_pubkey(config, cap, signer_pubkey);
    }

    public fun create_room_with_deposit(
        config: &LobbyConfig,
        target_points: u64,
        nfts: vector<CuonChunNFT>,
        coin_input: Coin<SUI>,
        selected_signer: vector<u8>,
        deadline_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(!lobby_config::paused(config), E_PAUSED);
        assert!(target_points > 0, E_INVALID_TARGET_POINTS);
        lobby_config::require_active_signer(config, &selected_signer);

        let now_ms = clock::timestamp_ms(clock);
        assert!(deadline_ms > now_ms, E_INVALID_DEADLINE);

        let creator = tx_context::sender(ctx);
        let creator_balance = coin::into_balance(coin_input);
        let creator_coin_points = points_from_coin(config, balance::value(&creator_balance));

        let mut room = BetRoom {
            id: object::new(ctx),
            creator,
            joiner: option::none(),
            target_points,
            status: STATUS_WAITING,
            created_at_ms: now_ms,
            activated_at_ms: option::none(),
            deadline_ms,
            signer_pubkey: selected_signer,
            escrow_snapshot_hash: vector[],
            nonce: 0,
            creator_coin: creator_balance,
            joiner_coin: balance::zero<SUI>(),
            creator_nft_ids: vector[],
            joiner_nft_ids: vector[],
            creator_points: 0,
            joiner_points: 0,
            fee_bps: lobby_config::platform_fee_bps(config),
        };

        let nft_points = deposit_nfts_to_room(&mut room, nfts, true, config);
        room.creator_points = creator_coin_points + nft_points;
        assert!(points_satisfy(config, room.creator_points, target_points), E_INSUFFICIENT_POINTS);

        room.escrow_snapshot_hash = bcs::to_bytes(&room.creator_points);
        let room_id = object::id(&room);
        event::emit(RoomCreated {
            version: lobby_config::event_version(config),
            room_id,
            creator,
            target_points,
            creator_points: room.creator_points,
            deadline_ms,
            timestamp_ms: now_ms,
        });

        transfer::share_object(room);
    }

    public fun join_room_with_deposit(
        config: &LobbyConfig,
        room: &mut BetRoom,
        nfts: vector<CuonChunNFT>,
        coin_input: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(!lobby_config::paused(config), E_PAUSED);
        assert!(room.status == STATUS_WAITING, E_INVALID_STATUS);
        assert!(option::is_none(&room.joiner), E_JOINER_ALREADY_SET);

        let joiner = tx_context::sender(ctx);
        assert!(joiner != room.creator, E_CANNOT_JOIN_OWN_ROOM);
        let now_ms = clock::timestamp_ms(clock);
        assert!(now_ms <= room.deadline_ms, E_ROOM_EXPIRED);

        let joiner_balance = coin::into_balance(coin_input);
        let joiner_coin_points = points_from_coin(config, balance::value(&joiner_balance));
        balance::join(&mut room.joiner_coin, joiner_balance);

        room.joiner = option::some(joiner);
        let nft_points = deposit_nfts_to_room(room, nfts, false, config);
        room.joiner_points = joiner_coin_points + nft_points;
        assert!(
            points_satisfy(config, room.joiner_points, room.target_points),
            E_INSUFFICIENT_POINTS
        );

        room.status = STATUS_ACTIVE;
        room.activated_at_ms = option::some(now_ms);
        room.escrow_snapshot_hash = bcs::to_bytes(&(room.creator_points + room.joiner_points));

        let room_id = object::id(room);
        event::emit(RoomJoined {
            version: lobby_config::event_version(config),
            room_id,
            joiner,
            joiner_points: room.joiner_points,
            timestamp_ms: now_ms,
        });
        event::emit(RoomActivated {
            version: lobby_config::event_version(config),
            room_id,
            activated_at_ms: now_ms,
        });
    }

    public fun cancel_waiting_room(
        config: &LobbyConfig,
        room: &mut BetRoom,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(!lobby_config::paused(config), E_PAUSED);
        assert!(room.status == STATUS_WAITING, E_INVALID_STATUS);
        let sender = tx_context::sender(ctx);
        assert!(sender == room.creator, E_NOT_CREATOR);

        transfer_all_coin(&mut room.creator_coin, room.creator, ctx);
        transfer_nfts_from_ids(&mut room.id, &mut room.creator_nft_ids, room.creator);
        room.status = STATUS_CANCELLED;

        event::emit(RoomCancelled {
            version: lobby_config::event_version(config),
            room_id: object::id(room),
            by: sender,
            reason: 1,
            timestamp_ms: clock::timestamp_ms(clock),
        });
    }

    public fun settle_room_with_signature(
        config: &LobbyConfig,
        room: &mut BetRoom,
        winner: address,
        loser: address,
        match_digest: vector<u8>,
        nonce: u64,
        deadline_ms: u64,
        signature: vector<u8>,
        signer_pubkey: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(!lobby_config::paused(config), E_PAUSED);
        assert!(room.status == STATUS_ACTIVE, E_INVALID_STATUS);
        assert!(nonce == room.nonce, E_INVALID_NONCE);
        assert!(clock::timestamp_ms(clock) < deadline_ms, E_SIGNATURE_EXPIRED);
        assert!(signer_pubkey == room.signer_pubkey, E_SIGNER_MISMATCH);
        lobby_config::require_active_signer(config, &signer_pubkey);
        assert_valid_winner_loser(room, winner, loser);

        let room_id = object::id(room);
        let msg = build_settlement_message(
            lobby_config::chain_id(config),
            room_id,
            winner,
            loser,
            &match_digest,
            nonce,
            deadline_ms,
        );
        assert!(ed25519::ed25519_verify(&signature, &signer_pubkey, &msg), E_INVALID_SIGNATURE);

        let mut pool = balance::withdraw_all(&mut room.creator_coin);
        let joiner_pool = balance::withdraw_all(&mut room.joiner_coin);
        balance::join(&mut pool, joiner_pool);
        let gross_pool = balance::value(&pool);
        let fee_paid = gross_pool * (room.fee_bps as u64) / 10_000;
        if (fee_paid > 0) {
            let fee_balance = balance::split(&mut pool, fee_paid);
            let fee_coin = coin::from_balance(fee_balance, ctx);
            transfer::public_transfer(fee_coin, lobby_config::treasury(config));
        };
        let winner_coin = balance::value(&pool);
        if (winner_coin > 0) {
            let payout_coin = coin::from_balance(pool, ctx);
            transfer::public_transfer(payout_coin, winner);
        } else {
            balance::destroy_zero(pool);
        };

        transfer_nfts_from_ids(&mut room.id, &mut room.creator_nft_ids, winner);
        transfer_nfts_from_ids(&mut room.id, &mut room.joiner_nft_ids, winner);

        let loser_scrap = scrap::mint_for(loser, ctx);
        transfer::public_transfer(loser_scrap, loser);

        room.status = STATUS_SETTLED;
        room.nonce = room.nonce + 1;

        event::emit(RoomSettled {
            version: lobby_config::event_version(config),
            room_id,
            winner,
            loser,
            fee_paid,
            creator_points: room.creator_points,
            joiner_points: room.joiner_points,
            match_digest,
            timestamp_ms: clock::timestamp_ms(clock),
        });
    }

    public fun emergency_refund(
        config: &LobbyConfig,
        room: &mut BetRoom,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(!lobby_config::paused(config), E_PAUSED);
        assert!(room.status == STATUS_ACTIVE, E_INVALID_STATUS);

        let now_ms = clock::timestamp_ms(clock);
        let refund_at = room.deadline_ms + lobby_config::emergency_refund_delay_ms(config);
        assert!(now_ms >= refund_at, E_REFUND_NOT_READY);
        assert!(option::is_some(&room.joiner), E_NO_JOINER);
        let joiner = *option::borrow(&room.joiner);

        transfer_all_coin(&mut room.creator_coin, room.creator, ctx);
        transfer_all_coin(&mut room.joiner_coin, joiner, ctx);
        transfer_nfts_from_ids(&mut room.id, &mut room.creator_nft_ids, room.creator);
        transfer_nfts_from_ids(&mut room.id, &mut room.joiner_nft_ids, joiner);
        room.status = STATUS_EMERGENCY_REFUNDED;

        event::emit(EmergencyRefunded {
            version: lobby_config::event_version(config),
            room_id: object::id(room),
            refund_mode: 1,
            timestamp_ms: now_ms,
        });
    }

    public fun status(room: &BetRoom): u8 {
        room.status
    }

    public fun creator(room: &BetRoom): address {
        room.creator
    }

    public fun target_points(room: &BetRoom): u64 {
        room.target_points
    }

    public fun creator_points(room: &BetRoom): u64 {
        room.creator_points
    }

    public fun joiner_points(room: &BetRoom): u64 {
        room.joiner_points
    }

    public fun platform_fee_bps(config: &LobbyConfig): u16 {
        lobby_config::platform_fee_bps(config)
    }

    public fun chain_id(config: &LobbyConfig): u8 {
        lobby_config::chain_id(config)
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        lobby_config::test_init(ctx)
    }
}
