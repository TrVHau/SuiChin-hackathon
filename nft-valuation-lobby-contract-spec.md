# Đặc Tả Contract: NFT Valuation Lobby PvP Escrow (Sui)

## 1. Mục tiêu chức năng

Thiết kế cơ chế PvP 2 người chơi theo mô hình cược theo tổng giá trị điểm, không bắt buộc hai bên phải cược cùng loại tài sản.

Nguyên tắc chính:

- Mỗi trận có một mức Total Stake (điểm mục tiêu), ví dụ 1000 điểm.
- Người chơi có thể nạp hỗn hợp NFT và coin (Chun/SUI) miễn tổng điểm đạt đúng hoặc vượt ngưỡng tối thiểu theo luật.
- Tài sản của cả hai bên bị khóa on-chain trong escrow trước khi trận bắt đầu.
- Kết quả trận được backend game ký số và contract chỉ chấp nhận kết quả có chữ ký hợp lệ.
- Settlement phải atomic: người thắng nhận toàn bộ pool theo quy tắc, người thua nhận consolation scrap, hệ thống trích platform fee.

## 2. Giá trị Web3 cần thể hiện

Mục tiêu trình bày với hội đồng và người không rành blockchain:

- Ownership thật: tài sản được khóa và giải ngân bởi smart contract, không phụ thuộc niềm tin vào server.
- Minh bạch: điều kiện thắng thua và phân phối tài sản được thực thi on-chain.
- Chống quỵt kèo: không thể rút tài sản giữa trận khi trạng thái đã Active.
- Chống giả mạo kết quả: chỉ chấp nhận thông điệp có chữ ký backend hợp lệ.

## 3. Luồng nghiệp vụ tổng quan

### Bước 1: Create and Deposit (A tạo phòng)

- A chọn NFT cược và số coin bù.
- Contract định giá tất cả tài sản theo bảng quy đổi điểm.
- Nếu tổng điểm không đạt yêu cầu Total Stake của phía A, giao dịch bị reject.
- Nếu hợp lệ, tạo BetRoom ở trạng thái Waiting và khóa tài sản A vào escrow.

### Bước 2: Match and Deposit (B tham gia)

- B nạp tài sản (NFT, coin, hoặc mix) sao cho đạt điều kiện đối ứng theo luật điểm.
- Contract kiểm tra và khóa tài sản B vào cùng BetRoom.
- Chuyển trạng thái BetRoom từ Waiting sang Active.
- Từ thời điểm Active, cấm rút tài sản đơn phương.

### Bước 3: Off-chain Battle

- Trận đấu chạy off-chain trên Node.js + Socket.io để đảm bảo realtime.
- Backend lưu vết dữ liệu trận (turns, shots, timeout, disconnect).

### Bước 4: Settlement by Signed Result

- Backend ký thông điệp kết quả gồm room_id, winner, nonce, deadline.
- Contract verify chữ ký bằng public key đã cấu hình.
- Nếu hợp lệ:
- Phân phối toàn bộ escrow cho winner theo quy tắc.
- Mint scrap an ủi cho loser.
- Trích platform fee về treasury.
- Đặt trạng thái BetRoom thành Settled.

## 4. Thiết kế object và dữ liệu on-chain

Đề xuất object chính:

### 4.1 BetRoom (shared object)

- room_id: ID
- creator: address
- joiner: option<address>
- target_points: u64
- status: u8 (Waiting, Active, Settled, Cancelled, EmergencyRefunded)
- created_at_ms: u64
- activated_at_ms: option<u64>
- deadline_ms: u64
- server_pubkey_id: u64 hoặc object ref
- escrow_snapshot_hash: vector<u8> (optional, phục vụ audit)
- nonce: u64 (chống replay settlement)

### 4.2 Escrow Vault (nội bộ room)

- creator_coin_amount: u64
- joiner_coin_amount: u64
- creator_nft_ids: vector<ID>
- joiner_nft_ids: vector<ID>
- creator_points: u64
- joiner_points: u64
- fee_bps: u16

### 4.3 Config object (admin controlled)

- tier_points_bronze: u64
- tier_points_silver: u64
- tier_points_gold: u64
- coin_point_rate: u64
- platform_fee_bps: u16 (giới hạn max ví dụ <= 300 = 3%)
- emergency_refund_delay_ms: u64 (ví dụ 24h)
- active_signer_pubkeys: vector<vector<u8>>
- paused: bool

## 5. Luật định giá (Valuation Rules)

Bắt buộc triển khai trực tiếp trong contract:

- Bronze NFT = 100 điểm
- Silver NFT = 250 điểm
- Gold NFT = 1000 điểm
- Coin quy đổi điểm theo coin_point_rate

Quy tắc kiểm tra:

- Tổng điểm ký quỹ từng bên phải >= target_points hoặc == target_points theo mode được chọn.
- Khuyến nghị mode mặc định: >= target_points, phần vượt không hoàn trong phòng cược chuẩn.
- Nếu muốn công bằng tuyệt đối: thêm mode strict_equal_points (cả hai phải bằng đúng).

## 6. API/hàm contract bắt buộc

### 6.1 Quản trị

- init_config(...)
- set_point_rules(...)
- set_platform_fee(...)
- add_signer_pubkey(...)
- remove_signer_pubkey(...)
- set_pause(...)

### 6.2 Phòng cược

- create_room_with_deposit(
  target_points,
  nft_inputs,
  coin_input,
  selected_signer,
  deadline_ms
  )
- join_room_with_deposit(
  room_id,
  nft_inputs,
  coin_input
  )
- cancel_waiting_room(room_id)

### 6.3 Settlement

- settle_room_with_signature(
  room_id,
  winner,
  loser,
  match_digest,
  nonce,
  deadline_ms,
  signature,
  signer_pubkey
  )

### 6.4 Emergency

- emergency_refund(room_id) (admin hoặc dual-consent)
- confirm_refund_by_player(room_id) (nếu dùng cơ chế 2 chữ ký người chơi)

## 7. Verify chữ ký và anti-tampering

7.1 Cấu trúc thông điệp ký (Message to Sign)
Để chống giả mạo và dùng lại chữ ký (Replay Attack), Backend và Contract phải thống nhất một chuỗi byte (bcs serialized) theo thứ tự sau:
intent_scope: 1 byte (Dùng để phân biệt đây là chữ ký giao dịch game, tránh bị lấy chữ ký này ký cho giao dịch khác trên ví).
chain_id: Để phân biệt Testnet/Mainnet.

package_id: ID của contract này (Chống cross-protocol replay).

room_id: ID của phòng đấu cụ thể.

winner & loser: Địa chỉ ví 2 bên.

match_digest: Mã băm (hash) của log trận đấu từ Server.

nonce: Số thứ tự trận đấu (lấy từ Object BetRoom).

deadline_ms: Thời gian hết hạn của chữ ký này.

7.2 Logic thực thi trong Move (Yêu cầu cho Dev)
Bạn Dev cần thực hiện chính xác các bước sau trong hàm settle_bet:

Kiểm tra trạng thái: assert!(room.status == ACTIVE, EInvalidStatus);

Kiểm tra thời gian: assert!(clock::now_ms(clock) < deadline_ms, EExpiredSignature);

Kiểm tra Nonce: assert!(nonce == room.nonce, EInvalidNonce); (Đảm bảo chữ ký này dành riêng cho lượt đấu hiện tại).

Reconstruct Message: Sử dụng thư viện bcs để gộp các trường dữ liệu trên thành một vector<u8>.

Verify: \* Sử dụng: sui::ed25519::ed25519_verify(&signature, &server_pubkey, &message_bytes).

Nếu trả về false, lập tức abort giao dịch.

7.3 Chặn Replay (Post-settlement)
Sau khi verify thành công và chuyển tiền, phải cập nhật room.status = SETTLED.

Tăng room.nonce = room.nonce + 1.

Lưu ý: Việc chuyển trạng thái sang SETTLED là bước quan trọng nhất để chữ ký đó không bao giờ dùng lại được nữa cho phòng này.

## 8. Settlement economics

Thứ tự xử lý settlement:

- Tính gross_pool = toàn bộ coin trong escrow + NFT escrow.
- Tính platform_fee = coin_pool \* fee_bps / 10_000.
- Chuyển fee về treasury.
- Chuyển coin còn lại cho winner.
- Chuyển toàn bộ NFT escrow cho winner.
- Mint scrap cho loser (1-2 scrap theo rule cố định hoặc theo pool tier).

Lưu ý:

- Nếu pool chứa nhiều loại asset, không để partial transfer fail giữa chừng.
- Bắt buộc atomic toàn giao dịch.

## 9. Edge cases bắt buộc xử lý

### 9.1 Disconnect khi đang đấu

- Không ảnh hưởng settlement on-chain.
- Backend vẫn gửi kết quả cuối cùng kèm chữ ký.

### 9.2 Không có người join

- A được cancel khi room còn Waiting.
- Hoàn trả đúng toàn bộ tài sản ban đầu.

### 9.3 Server sự cố

- Sau emergency_refund_delay_ms (ví dụ 24h), cho phép emergency refund.
- Hai phương án:
- Admin refund (nhanh, tập trung).
- Dual-consent refund từ cả 2 player (phi tập trung hơn).

### 9.4 Lệch loại tài sản cược

- Hợp lệ nếu tổng điểm đáp ứng target_points.
- Không yêu cầu cùng tier giữa 2 bên.

### 9.5 Replay attack chữ ký

- Chặn bằng nonce + deadline + room status guard.

### 9.6 Double settlement

- Chặn bằng status == Active trước khi settle.

## 10. Event schema đề xuất

Phải emit event đầy đủ để backend/indexer/FE truy vết:

- RoomCreated { room_id, creator, target_points, creator_points }
- RoomJoined { room_id, joiner, joiner_points }
- RoomActivated { room_id, activated_at_ms }
- RoomCancelled { room_id, by, reason }
- RoomSettled {
  room_id,
  winner,
  loser,
  fee_paid,
  creator_points,
  joiner_points,
  match_digest
  }
- EmergencyRefunded { room_id, refund_mode }

## 11. Security checklist cho dev contract

- Validate ownership NFT trước khi nạp escrow.
- Validate coin amount không overflow, không underflow.
- Fee bps bị chặn max cứng (ví dụ <= 300).
- Không cho settle nếu signer không thuộc whitelist pubkey.
- Không cho cancel khi room đã Active.
- Không cho emergency refund khi chưa đủ thời gian.
- Không để object bị orphan do luồng lỗi giữa chừng.

## 12. Yêu cầu tích hợp backend

Backend phải cung cấp:

- room_id on-chain mapping với match_id off-chain.
- match_digest (hash biên bản trận).
- winner/loser address.
- signer key rotation policy.
- retry policy gửi settle transaction.

Khuyến nghị:

- Lưu signed payload đầy đủ ở backend để audit.
- Có idempotency key khi gọi settle để giảm duplicate tx.

## 13. Test matrix bắt buộc

### 13.1 Unit tests (Move)

- create_room success/fail theo points.
- join_room success/fail theo points.
- cancel only waiting.
- settle valid signature.
- settle invalid signature.
- settle wrong nonce.
- settle expired deadline.
- settle twice rejected.
- emergency refund before/after timeout.

### 13.2 Integration tests

- A: NFT+coin, B: coin-only, settle success.
- A: gold-only, B: many assets mix, settle success.
- Fee and scrap mint correctness.

### 13.3 Adversarial tests

- forged signer key.
- replay same signature twice.
- malicious join with mismatched asset metadata.

## 14. Definition of Done

Hoàn thành khi đạt đủ:

- Có object BetRoom + Config + escrow flow hoạt động.
- Có verify chữ ký backend thành công và chặn giả mạo.
- Có settlement atomic (winner payout + fee + loser scrap).
- Có emergency refund flow.
- Event đầy đủ cho indexer/FE.
- Test pass cho tất cả case ở mục 13.

## 15. Gợi ý phạm vi triển khai theo phase

Phase 1:

- Waiting/Active/Settled, create/join/cancel/settle với 1 signer.

Phase 2:

- Emergency refund + dual-consent mode.

Phase 3:

- Signer rotation + governance + monitoring hooks.

## 16. Tóm tắt bàn giao cho dev contract

Dev contract cần tập trung 4 nhóm việc:

- Định giá tài sản (NFT tier + coin points) trong Move.
- Escrow multi-asset cho cả hai bên trong cùng BetRoom.
- Verify chữ ký Ed25519 của backend để chốt kết quả.
- Settlement atomic có fee và mint scrap cho loser.
