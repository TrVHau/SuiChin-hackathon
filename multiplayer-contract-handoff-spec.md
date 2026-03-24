# Đặc Tả Handoff Contract Multiplayer (Cho Member Làm Contract)

## 1. Mục tiêu
Tài liệu này mô tả chính xác phạm vi phía contract cần có cho backend multiplayer mới.
Đây là artifact handoff cho teammate phụ trách viết và deploy Move contract.

## 2. Bối cảnh sản phẩm (đã chốt)
Nguồn tham chiếu: `aidlc-docs/inception/elaboration-multiplayer-requirements-questions.md`

Các quyết định đã khóa:
- Mode bắt buộc: 1v1 realtime, async challenge.
- Không triển khai tournament/create giải trong scope hiện tại.
- Cách tìm đối thủ: random, invite theo address, open challenge.
- Mô hình backend: hybrid (realtime off-chain + finalize/reward on-chain).
- Staking: tùy chọn theo từng challenge (phải hỗ trợ cả stake và non-stake).
- UI: Multiplayer là tab top-level.

## 2.1 Cơ chế gameplay và thắng thua (bắt buộc mô tả trong contract)
Phần này là nguồn tham chiếu để implement logic trạng thái và payout.

### A. Realtime 1v1
1. Hai người vào cùng một challenge/match.
2. Backend realtime xác định kết quả ván và gửi verdict.
3. Contract nhận submit/finalize theo verdict backend.

Quy tắc thắng thua:
- `WIN`: người thắng nhận reward/payout theo mode stake.
- `LOSE`: người thua không nhận payout.
- `FORFEIT`: nếu một bên timeout/không submit trong thời gian cho phép thì xử thua.
- `DRAW` (tùy bật): nếu backend kết luận hòa thì refund theo chính sách draw.

### B. Async challenge
1. Challenger tạo challenge, opponent vào chơi sau.
2. Mỗi bên có một cửa sổ thời gian để submit kết quả.
3. Khi đủ điều kiện, oracle/backend finalize trên chain.

Quy tắc thắng thua:
- So sánh theo tiêu chí backend chốt (ví dụ score/time/round result).
- Nếu một bên không submit trước hạn: bên đó thua theo `FORFEIT`.
- Nếu cả hai không submit trước hạn: challenge `EXPIRED`, hoàn tiền theo rule.

### C. Quy tắc payout stake (mode stake = true)
Quy tắc đề xuất để implement rõ trong contract:
1. Cả hai bên nạp stake bằng nhau.
2. Kết quả `WIN/LOSE`: winner nhận toàn bộ pot (hoặc trừ protocol fee nếu có).
3. Kết quả `DRAW`: hoàn stake cho cả hai bên theo policy.
4. `CANCEL/EXPIRE`: refund an toàn theo trạng thái vòng đời.

### D. Quy tắc chốt tranh chấp
Contract không tự verify gameplay frame-by-frame.
Nguồn xác thực cuối cùng là oracle/backend signer đã được cấp quyền finalize.

## 3. Phạm vi contract
Module mới cần có:
1. `duel_v2.move`

Tái sử dụng các module kinh tế/profile hiện có nếu phù hợp (`player_profile`, NFT modules).
Không ép migrate các feature craft/trade-up không liên quan trong phase này.

## 4. Module bắt buộc: `duel_v2.move`

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
- `challenger_result: option<u8>` (0 thua, 1 thắng, 2 hòa, 3 forfeit)
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

## 5. Event contract (bắt buộc để backend index)
Phải emit event cho mọi state transition chính:
- `ChallengeCreated`
- `ChallengeAccepted`
- `ChallengeCancelled`
- `ChallengeExpired`
- `ResultSubmitted`
- `ChallengeFinalized`
- `StakeRefunded`
- `StakePaidOut`

Event fields phải có ID ổn định (`challenge_id`), participant addresses, timestamp, status.

## 6. Contract backend cần nhận sau deploy
Sau khi deploy, contract owner phải bàn giao cho backend team:
1. `PACKAGE_ID`
2. Shared object IDs:
- `DuelConfig` ID
3. Chi tiết oracle authority:
- mô hình cap/object ownership
- policy account dùng để ký
4. Event type strings (đúng format `module::EventName`)
5. Danh sách ABI/function signature bản cuối (copy-paste ready)
6. Error code map (numeric code -> meaning)

## 7. Security requirements (blocking)
Áp dụng cho thiết kế contract trong scope này:
- Authorization: deny-by-default cho hành động đặc quyền.
- Input bounds: validate mode/status/enums/amount ranges.
- Fail-safe default: không payout nếu state không hợp lệ/chưa đủ điều kiện.
- Idempotency: finalize/expire gọi lặp không được double spend.
- Không hardcode secrets.
- Emit event đủ để audit các transition quan trọng.

## 8. Test matrix tối thiểu (deliverable của contract owner)
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

## 9. Definition of Done (phía contract)
Hoàn thành khi đáp ứng đủ:
1. Implement xong `duel_v2.move`.
2. Unit test pass.
3. Deploy lên network mục tiêu hoàn tất.
4. Bàn giao IDs + ABI + error map + event catalog.
5. Backend team chạy end-to-end flow create/accept/finalize được trên object đã deploy, không cần chỉnh chain thủ công.
