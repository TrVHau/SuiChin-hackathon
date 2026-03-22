# Đặc Tả Handoff Contract Multiplayer (Cho Member Làm Contract)

## 1. Mục tiêu
Tài liệu này mô tả chính xác phạm vi phía contract cần có cho backend multiplayer mới.
Đây là artifact handoff cho teammate phụ trách viết và deploy Move contract.

## 2. Bối cảnh sản phẩm (đã chốt)
Nguồn tham chiếu: `aidlc-docs/inception/elaboration-multiplayer-requirements-questions.md`

Các quyết định đã khóa:
- Mode bắt buộc: 1v1 realtime, async challenge, tournament.
- Cách tìm đối thủ: random, invite theo address, open challenge.
- Mô hình backend: hybrid (realtime off-chain + finalize/reward on-chain).
- Staking: tùy chọn theo từng challenge (phải hỗ trợ cả stake và non-stake).
- UI: Multiplayer là tab top-level.

## 3. Phạm vi contract
Module mới cần có:
1. `duel_v2.move`
2. `tournament.move`

Tái sử dụng các module kinh tế/profile hiện có nếu phù hợp (`player_profile`, NFT modules).
Không ép migrate các feature craft/trade-up không liên quan trong phase này.

## 4. Module bắt buộc A: `duel_v2.move`

### 4.1 Trách nhiệm chính
- Tạo/quản lý duel challenge.
- Hỗ trợ invite challenge và open challenge.
- Hỗ trợ luồng có stake và không stake.
- Nhận submit kết quả từ người chơi.
- Finalize winner và payout (nếu có stake).
- Xử lý cancel/expire/refund.

### 4.2 Gợi ý object
1. `DuelConfig` (shared):
- admin address / admin cap link
- oracle address / oracle cap link
- default expiry windows
- protocol fee bps (nếu cần sau này)

2. `DuelChallenge` (shared hoặc managed qua dynamic field):
- `id: UID`
- `challenger: address`
- `opponent: option<address>` (none = open challenge)
- `mode: u8` (1 realtime, 2 async)
- `stake_enabled: bool`
- `stake_mist: u64`
- `status: u8` (0 open, 1 accepted, 2 active, 3 submitted, 4 finalized, 5 cancelled, 6 expired)
- `challenger_result: option<u8>` (0 thua, 1 thắng, optional)
- `opponent_result: option<u8>`
- `winner: option<address>`
- `created_at_ms: u64`
- `expires_at_ms: u64`

3. `DuelEscrow` (khi stake bật):
- balance gắn với challenge cho cả hai phía

### 4.3 Entry function bắt buộc
1. `create_challenge(...)`
- Hỗ trợ invite và open challenge.
- Nếu `stake_enabled = true`, người tạo nạp stake coin.
- Emit `ChallengeCreated`.

2. `accept_challenge(...)`
- Caller hợp lệ: đúng người được mời HOẶC bất kỳ ai nếu open challenge.
- Nếu stake bật: người accept phải nạp stake bằng đúng mức.
- Emit `ChallengeAccepted`.

3. `cancel_challenge(...)`
- Chỉ challenger được phép, trước khi có accept.
- Refund stake cho challenger nếu đã nạp.
- Emit `ChallengeCancelled`.

4. `expire_challenge(...)`
- Bất kỳ ai cũng có thể gọi sau `expires_at_ms`.
- Refund an toàn toàn bộ stake đã nạp.
- Emit `ChallengeExpired`.

5. `submit_result(...)`
- Mỗi bên submit result marker cho challenge.
- Không cho submit trùng từ cùng một phía.
- Emit `ResultSubmitted`.

6. `finalize_challenge(...)`
- Caller hợp lệ: chỉ oracle authority (luồng ký backend).
- Chốt winner dựa trên submitted states và verdict từ server.
- Chuyển payout nếu stake bật.
- Emit `ChallengeFinalized` và event payout.

7. `finalize_challenge_no_stake(...)` (tùy chọn tách riêng)
- Dành cho mode không stake, vẫn finalize và emit winner event.

### 4.4 Quy tắc vòng đời
- Open -> Accepted -> Active -> Finalized
- Open -> Cancelled
- Open/Accepted -> Expired
- Mọi terminal state phải immutable và finalize lặp lại không gây double spend.

### 4.5 Quy tắc phân quyền
- Check caller chặt cho create/accept/cancel/submit/finalize.
- Check ownership ở cấp object cho mọi action theo address.
- Finalize chỉ qua oracle với validate cap/authority rõ ràng.

## 5. Module bắt buộc B: `tournament.move`

### 5.1 Trách nhiệm chính
- Tạo tournament season/instance.
- Đăng ký người chơi (có hoặc không entry fee).
- Đóng đăng ký và chốt bracket.
- Ghi nhận tiến trình match.
- Finalize thứ hạng và payout.

### 5.2 Gợi ý object
1. `TournamentConfig` (shared):
- admin/oracle config
- fee settings
- max participants defaults

2. `Tournament` (shared):
- `id: UID`
- `status: u8` (0 registration, 1 seeded, 2 running, 3 completed, 4 cancelled)
- `entry_fee_mist: u64`
- `prize_pool: Balance<SUI>`
- `max_participants: u64`
- `registered_count: u64`
- `start_at_ms: u64`
- `end_at_ms: u64`

3. `TournamentMatch` / bracket storage:
- match id
- round index
- player A/B
- winner (optional)
- completion marker

### 5.3 Entry function bắt buộc
1. `create_tournament(...)` (admin only)
2. `register_tournament(...)` (player; có/không có fee)
3. `close_registration_and_seed(...)` (admin/oracle)
4. `report_match_result(...)` (oracle authority)
5. `finalize_tournament(...)` (oracle/admin authority)
6. `claim_prize(...)` (nếu payout theo kiểu pull-based)
7. `cancel_tournament(...)` + refunds (admin, theo pre-start rules)

## 6. Event contract (bắt buộc để backend index)
Phải emit event cho mọi state transition chính:
- `ChallengeCreated`
- `ChallengeAccepted`
- `ChallengeCancelled`
- `ChallengeExpired`
- `ResultSubmitted`
- `ChallengeFinalized`
- `StakeRefunded`
- `StakePaidOut`
- `TournamentCreated`
- `TournamentRegistered`
- `TournamentSeeded`
- `TournamentMatchResult`
- `TournamentFinalized`
- `TournamentPrizePaid`

Event fields phải có ID ổn định (`challenge_id` / `tournament_id`), participant addresses, timestamp, status.

## 7. Contract backend cần nhận sau deploy
Sau khi deploy, contract owner phải bàn giao cho backend team:
1. `PACKAGE_ID`
2. Shared object IDs:
- `DuelConfig` ID
- `TournamentConfig` ID
- Các `Tournament` ID đang active (nếu pre-create)
3. Chi tiết oracle authority:
- mô hình cap/object ownership
- policy account dùng để ký
4. Event type strings (đúng format `module::EventName`)
5. Danh sách ABI/function signature bản cuối (copy-paste ready)
6. Error code map (numeric code -> meaning)

## 8. Security requirements (blocking)
Áp dụng cho thiết kế contract trong scope này:
- Authorization: deny-by-default cho hành động đặc quyền.
- Input bounds: validate mode/status/enums/amount ranges.
- Fail-safe default: không payout nếu state không hợp lệ/chưa đủ điều kiện.
- Idempotency: finalize/expire gọi lặp không được double spend.
- Không hardcode secrets.
- Emit event đủ để audit các transition quan trọng.

## 9. Test matrix tối thiểu (deliverable của contract owner)
`duel_v2.move`:
1. Tạo invite challenge (stake/no-stake).
2. Accept invite với caller đúng/sai.
3. Accept open challenge.
4. Cancel trước accept.
5. Expire sau timeout.
6. Submit kết quả từ cả hai phía.
7. Oracle finalize thành công.
8. Finalize lặp lại (phải an toàn).
9. Refund đúng khi cancel/expire.
10. Payout đúng (winner nhận số tiền kỳ vọng).

`tournament.move`:
1. Registration flow và giới hạn.
2. Seed + lock bracket.
3. Report match result và progression.
4. Finalize + payout distribution.
5. Cancel/refund flow.

## 10. Definition of Done (phía contract)
Hoàn thành khi đáp ứng đủ:
1. Implement xong `duel_v2.move`, `tournament.move`.
2. Unit test pass.
3. Deploy lên network mục tiêu hoàn tất.
4. Bàn giao IDs + ABI + error map + event catalog.
5. Backend team chạy end-to-end flow create/accept/finalize được trên object đã deploy, không cần chỉnh chain thủ công.
