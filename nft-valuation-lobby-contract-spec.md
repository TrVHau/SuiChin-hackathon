# Đặc Tả Contract: NFT Valuation Lobby PvP Escrow (Sui)

Tài liệu này đã được đồng bộ theo contract hiện tại trong `contract/sources/nft_valuation_lobby.move` và `contract/sources/nft_valuation_lobby_config.move`.

## 1. Mục tiêu chức năng

Thiết kế cơ chế PvP 2 người chơi theo mô hình cược theo tổng giá trị điểm, không bắt buộc hai bên phải cược cùng loại tài sản.

Nguyên tắc chính:

- Mỗi trận có một mức `target_points`.
- Người chơi có thể nạp hỗn hợp NFT `CuonChunNFT` và coin SUI miễn tổng điểm đạt luật định.
- Tài sản của cả hai bên bị khóa on-chain trong `BetRoom` trước khi trận bắt đầu.
- Kết quả trận được backend game ký số và contract chỉ chấp nhận kết quả có chữ ký hợp lệ.
- Settlement là atomic: người thắng nhận toàn bộ pool theo quy tắc, người thua nhận `Scrap`, hệ thống trích platform fee.

## 2. Giá trị Web3 cần thể hiện

Mục tiêu trình bày với hội đồng và người không rành blockchain:

- Ownership thật: tài sản được khóa và giải ngân bởi smart contract, không phụ thuộc niềm tin vào server.
- Minh bạch: điều kiện thắng thua và phân phối tài sản được thực thi on-chain.
- Chống quỵt kèo: không thể rút tài sản giữa trận khi trạng thái đã `ACTIVE`.
- Chống giả mạo kết quả: chỉ chấp nhận thông điệp có chữ ký backend hợp lệ và signer nằm trong whitelist.

## 3. Luồng nghiệp vụ tổng quan

### Bước 1: Create and Deposit

- A chọn NFT cược và số coin bù.
- Contract định giá tất cả tài sản theo bảng quy đổi điểm trong `LobbyConfig`.
- Nếu tổng điểm không đạt yêu cầu `target_points`, giao dịch bị reject.
- Nếu hợp lệ, tạo `BetRoom` ở trạng thái `WAITING` và khóa tài sản A vào escrow.

### Bước 2: Match and Deposit

- B nạp tài sản (NFT, coin, hoặc mix) sao cho đạt điều kiện theo luật điểm.
- Contract kiểm tra và khóa tài sản B vào cùng `BetRoom`.
- Chuyển trạng thái `BetRoom` từ `WAITING` sang `ACTIVE`.
- Từ thời điểm `ACTIVE`, không còn luồng cancel đơn phương.

### Bước 3: Off-chain Battle

- Trận đấu chạy off-chain trên Node.js + Socket.IO để đảm bảo realtime.
- Backend lưu vết dữ liệu trận như turns, shots, timeout, disconnect.

### Bước 4: Settlement by Signed Result

- Backend ký thông điệp kết quả gồm `room_id`, `winner`, `loser`, `match_digest`, `nonce`, `deadline_ms`.
- Contract verify chữ ký bằng public key đã cấu hình và nằm trong whitelist.
- Nếu hợp lệ:
  - Phân phối toàn bộ escrow cho winner theo quy tắc.
  - Mint `Scrap` cho loser.
  - Trích platform fee về treasury.
  - Đặt trạng thái `BetRoom` thành `SETTLED`.

### Bước 5: Emergency refund

- Nếu room đã `ACTIVE` nhưng quá hạn mà chưa settle được, contract cho phép emergency refund sau thời gian chờ cấu hình.
- Refund này tách biệt với luồng settle bình thường.

## 4. Thiết kế object và dữ liệu on-chain

### 4.1 `BetRoom` (shared object)

- `id: UID`
- `creator: address`
- `joiner: option<address>`
- `target_points: u64`
- `status: u8` với các giá trị:
  - `0 = WAITING`
  - `1 = ACTIVE`
  - `2 = SETTLED`
  - `3 = CANCELLED`
  - `4 = EMERGENCY_REFUNDED`
- `created_at_ms: u64`
- `activated_at_ms: option<u64>`
- `deadline_ms: u64`
- `signer_pubkey: vector<u8>`
- `escrow_snapshot_hash: vector<u8>`
- `nonce: u64`
- `creator_coin: Balance<SUI>`
- `joiner_coin: Balance<SUI>`
- `creator_nft_ids: vector<ID>`
- `joiner_nft_ids: vector<ID>`
- `creator_points: u64`
- `joiner_points: u64`
- `fee_bps: u16`

### 4.2 `LobbyConfig` (admin controlled shared object)

- `tier_points_bronze: u64`
- `tier_points_silver: u64`
- `tier_points_gold: u64`
- `coin_point_rate: u64`
- `platform_fee_bps: u16`
- `emergency_refund_delay_ms: u64`
- `active_signer_pubkeys: vector<vector<u8>>`
- `paused: bool`
- `strict_equal_points: bool`
- `chain_id: u8`
- `treasury: address`
- `event_version: u64`

### 4.3 Admin cap

- `LobbyAdminCap` được dùng để gọi các hàm admin set pause, fee, signer, treasury, chain id, và rule điểm.

## 5. Luật định giá

Bắt buộc triển khai trực tiếp trong contract:

- Bronze NFT = 100 điểm
- Silver NFT = 250 điểm
- Gold NFT = 1000 điểm
- Coin quy đổi điểm theo `coin_point_rate`

Quy tắc kiểm tra:

- Mặc định: tổng điểm mỗi bên phải `>= target_points`.
- Nếu bật `strict_equal_points = true`, mỗi bên phải đúng bằng `target_points`.
- Contract hiện không yêu cầu 2 bên phải nạp cùng loại tài sản.

## 6. API/hàm contract hiện có

### 6.1 Khởi tạo / test setup

- `nft_valuation_lobby::test_init(ctx)`
- `nft_valuation_lobby_config::test_init(ctx)`

### 6.2 Quản trị

- `set_pause(config, cap, paused)`
- `set_point_rules(config, cap, bronze_points, silver_points, gold_points)`
- `set_coin_point_rate(config, cap, coin_point_rate)`
- `set_platform_fee(config, cap, platform_fee_bps)`
- `set_emergency_refund_delay(config, cap, delay_ms)`
- `set_chain_id(config, cap, chain_id)`
- `set_treasury(config, cap, treasury)`
- `set_strict_equal_points(config, cap, strict_equal_points)`
- `add_signer_pubkey(config, cap, signer_pubkey)`
- `remove_signer_pubkey(config, cap, signer_pubkey)`

### 6.3 Phòng cược

- `create_room_with_deposit(config, target_points, nfts, coin_input, selected_signer, deadline_ms, clock, ctx)`
- `join_room_with_deposit(config, room, nfts, coin_input, clock, ctx)`
- `cancel_waiting_room(config, room, clock, ctx)`

### 6.4 Settlement

- `settle_room_with_signature(config, room, winner, loser, match_digest, nonce, deadline_ms, signature, signer_pubkey, clock, ctx)`

### 6.5 Emergency

- `emergency_refund(config, room, clock, ctx)`

### 6.6 Helper getters

- `status(room)`
- `creator(room)`
- `target_points(room)`
- `creator_points(room)`
- `joiner_points(room)`
- `platform_fee_bps(config)`
- `chain_id(config)`

## 7. Verify chữ ký và anti-tampering

### 7.1 Cấu trúc thông điệp ký

Backend và contract phải thống nhất thông điệp ký theo đúng struct `SettlementMessage`:

- `intent_scope: u8` với giá trị hiện tại là `1`
- `chain_id: u8`
- `package_id: address` với giá trị `@suichin`
- `room_id: ID`
- `winner: address`
- `loser: address`
- `match_digest: vector<u8>`
- `nonce: u64`
- `deadline_ms: u64`

### 7.2 Logic thực thi trong Move

Trong `settle_room_with_signature` contract đang làm đúng các bước sau:

- Kiểm tra trạng thái: `room.status == ACTIVE`.
- Kiểm tra thời gian: `clock::timestamp_ms(clock) < deadline_ms`.
- Kiểm tra nonce: `nonce == room.nonce`.
- Kiểm tra `signer_pubkey == room.signer_pubkey`.
- Kiểm tra signer nằm trong whitelist `active_signer_pubkeys`.
- Reconstruct message bằng `bcs`.
- Verify bằng `sui::ed25519::ed25519_verify(&signature, &signer_pubkey, &msg)`.

### 7.3 Chặn replay

- Sau khi verify và chuyển tài sản, contract đặt `room.status = SETTLED`.
- Contract tăng `room.nonce = room.nonce + 1`.
- Đây là guard chính để cùng một chữ ký không thể dùng lại cho room đó.

## 8. Settlement economics

Thứ tự xử lý settlement hiện tại:

- Gộp toàn bộ coin của creator và joiner thành pool.
- Tính `fee_paid = gross_pool * fee_bps / 10_000`.
- Chuyển fee về `treasury`.
- Chuyển coin còn lại cho winner.
- Chuyển toàn bộ NFT escrow cho winner.
- Mint `Scrap` cho loser thông qua `scrap::mint_for(loser, ctx)`.

Lưu ý:

- Fee hiện chỉ áp trên coin pool.
- NFT không bị chia nhỏ, toàn bộ NFT của room đi về winner.
- Tất cả xử lý phải atomic trong một transaction.

## 9. Edge cases bắt buộc xử lý

### 9.1 Disconnect khi đang đấu

- Không ảnh hưởng settlement on-chain.
- Backend vẫn gửi kết quả cuối cùng kèm chữ ký.

### 9.2 Không có người join

- Room ở trạng thái `WAITING` có thể bị cancel bởi creator.
- Tài sản được trả về đúng chủ ban đầu.

### 9.3 Server sự cố

- Sau `emergency_refund_delay_ms`, cho phép emergency refund.
- Hiện contract dùng một luồng emergency refund chung, không phải dual-consent.

### 9.4 Lệch loại tài sản cược

- Hợp lệ nếu tổng điểm đáp ứng `target_points`.
- Không yêu cầu cùng tier giữa 2 bên.

### 9.5 Replay attack chữ ký

- Chặn bằng `nonce + deadline + room status + signer whitelist`.

### 9.6 Double settlement

- Chặn bằng guard `room.status == ACTIVE` trước khi settle.

## 10. Event schema thực tế

Contract hiện emit các event sau:

- `RoomCreated { version, room_id, creator, target_points, creator_points, deadline_ms, timestamp_ms }`
- `RoomJoined { version, room_id, joiner, joiner_points, timestamp_ms }`
- `RoomActivated { version, room_id, activated_at_ms }`
- `RoomCancelled { version, room_id, by, reason, timestamp_ms }`
- `RoomSettled { version, room_id, winner, loser, fee_paid, creator_points, joiner_points, match_digest, timestamp_ms }`
- `EmergencyRefunded { version, room_id, refund_mode, timestamp_ms }`

## 11. Security checklist cho dev contract

- Validate ownership NFT trước khi nạp escrow.
- Validate coin amount không overflow, không underflow.
- Fee bps bị chặn max cứng ở `MAX_PLATFORM_FEE_BPS = 300`.
- Không cho settle nếu signer không thuộc whitelist pubkey.
- Không cho cancel khi room đã `ACTIVE`.
- Không cho emergency refund khi chưa đủ thời gian.
- Không để object bị orphan do luồng lỗi giữa chừng.

## 12. Yêu cầu tích hợp backend

Backend phải cung cấp:

- Mapping `room_id` on-chain với match id off-chain.
- `match_digest` là hash biên bản trận.
- `winner` và `loser` address.
- `signer_pubkey` đúng với key whitelist trên chain.
- Retry policy gửi settlement transaction.

Khuyến nghị:

- Lưu signed payload đầy đủ ở backend để audit.
- Có idempotency key khi gọi settle để giảm duplicate tx.

## 13. Test matrix nên bám theo contract hiện tại

### 13.1 Unit tests (Move)

- create room success/fail theo points.
- join room success/fail theo points.
- cancel chỉ cho room waiting.
- settle với signature hợp lệ.
- settle với signature sai.
- settle với nonce sai.
- settle với deadline hết hạn.
- settle lặp lại phải bị reject.
- emergency refund trước/sau timeout.

### 13.2 Integration tests

- A: NFT + coin, B: coin-only, settle success.
- A: gold-only, B: mix nhiều tài sản, settle success.
- Fee và scrap mint đúng.

### 13.3 Adversarial tests

- forged signer key.
- replay cùng một signature hai lần.
- malicious join với metadata tài sản không hợp lệ.

## 14. Definition of Done

Hoàn thành khi đạt đủ:

- Có object `BetRoom` + `LobbyConfig` + escrow flow hoạt động.
- Có verify chữ ký backend thành công và chặn giả mạo.
- Có settlement atomic gồm winner payout, fee, và loser scrap.
- Có emergency refund flow.
- Event đầy đủ cho indexer/FE.
- Test pass cho tất cả case ở mục 13.

## 15. Gợi ý phạm vi triển khai theo phase

Phase 1:

- Waiting / Active / Settled.
- Create / join / cancel / settle với 1 signer.

Phase 2:

- Emergency refund.
- Hệ signer rotation nếu cần mở rộng.

Phase 3:

- Governance / monitoring hooks / indexer mở rộng.

## 16. Tóm tắt bàn giao cho dev contract

Dev contract cần tập trung 4 nhóm việc:

- Định giá tài sản trong Move bằng tier points và coin points.
- Escrow multi-asset cho cả hai bên trong cùng `BetRoom`.
- Verify chữ ký Ed25519 của backend để chốt kết quả.
- Settlement atomic có fee và mint `Scrap` cho loser.
