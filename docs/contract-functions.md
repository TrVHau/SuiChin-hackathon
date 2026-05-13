# Công dụng các hàm trong smart contract

Tài liệu này ghi nhanh công dụng của các hàm chính trong bộ contract Move của SuiChin. Mục tiêu là giúp đọc code nhanh, hiểu luồng xử lý, và biết mỗi module chịu trách nhiệm gì.

## 1. `craft_config.move`

Module này quản lý toàn bộ cấu hình hệ thống cho cơ chế craft và recycle.

| Hàm                                | Công dụng                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `init()`                           | Khởi tạo `SystemConfig` dùng chung và cấp `AdminCap` cho admin.             |
| `digest_prefix_u64()`              | Tạo một số định danh ngắn từ transaction digest để dùng cho correlation id. |
| `emit_admin_config_updated()`      | Phát event khi cấu hình admin thay đổi.                                     |
| `set_pause()`                      | Bật hoặc tắt trạng thái pause của hệ thống.                                 |
| `set_indexer_version()`            | Cập nhật version để indexer/backend theo dõi cấu hình mới.                  |
| `set_craft_success_bps()`          | Đặt tỉ lệ thành công craft theo basis points.                               |
| `set_mint_pool_contribution()`     | Cập nhật mức đóng góp vào pool mint.                                        |
| `set_scrap_fusion_recipe()`        | Cấu hình công thức fuse scrap.                                              |
| `set_recycle_payouts()`            | Cập nhật mức payout khi recycle theo tier.                                  |
| `reserve_next_craft_id()`          | Cấp phát craft id tiếp theo.                                                |
| `recycle_reward_for_tier()`        | Trả về mức thưởng recycle tương ứng với tier.                               |
| `event_version()`                  | Đọc version của event/cấu hình.                                             |
| `indexer_version()`                | Đọc version dành cho indexer.                                               |
| `paused()`                         | Kiểm tra hệ thống đang bị pause hay không.                                  |
| `craft_success_bps()`              | Đọc tỉ lệ craft success hiện tại.                                           |
| `mint_pool_contribution()`         | Đọc mức đóng góp vào mint pool.                                             |
| `scrap_fusion_recipe()`            | Đọc công thức fuse scrap hiện tại.                                          |
| `bronze_recycle_chun()`            | Đọc payout recycle cho Bronze.                                              |
| `default_mint_pool_contribution()` | Đọc giá trị đóng góp mint pool mặc định.                                    |

## 2. `craft_actions.move`

Module này chứa logic tạo kết quả craft, recycle scrap, burn NFT, và fuse scrap.

| Hàm                                        | Công dụng                                                |
| ------------------------------------------ | -------------------------------------------------------- |
| `roll_rng()`                               | Tạo roll pseudo-random 0-99 từ clock, epoch, và sender.  |
| `digest_prefix_u64()`                      | Tạo correlation id ngắn từ digest.                       |
| `burn_scrap_vector()`                      | Burn một vector scrap NFT.                               |
| `tier_for_roll()`                          | Chuyển roll thành tier kết quả.                          |
| `variant_count_for_tier()`                 | Trả về số variant của một tier.                          |
| `variant_from_seed_for_tier()`             | Chọn variant theo seed cho một tier.                     |
| `emit_legacy_craft_result()`               | Emit event craft theo format legacy.                     |
| `mint_nft_for_tier_and_transfer()`         | Mint Cuon Chun NFT theo tier rồi transfer cho recipient. |
| `mint_scrap_and_transfer()`                | Mint Scrap rồi transfer cho recipient.                   |
| `craft_chun()`                             | Luồng craft cũ, dùng fee và ngẫu nhiên.                  |
| `craft_chun_with_randomness()`             | Luồng craft mới dựa trên config và randomness.           |
| `burn_nft_for_chun()`                      | Burn NFT để recycle sang Chun.                           |
| `burn_multiple_nfts_for_chun()`            | Burn nhiều NFT để recycle sang Chun.                     |
| `recycle_scrap_for_chun()`                 | Đổi scrap sang Chun.                                     |
| `recycle_batch_scraps_for_chun()`          | Đổi nhiều scrap sang Chun.                               |
| `fuse_scraps_for_bronze()`                 | Fuse scrap theo công thức cũ để mint Bronze.             |
| `fuse_scraps_for_bronze_with_randomness()` | Fuse scrap theo luồng mới có randomness.                 |

## 3. `craft.move`

Module này là lớp facade, chủ yếu forward sang các module craft, treasury, config, và action.

| Hàm                               | Công dụng                                         |
| --------------------------------- | ------------------------------------------------- |
| `test_init()`                     | Khởi tạo dữ liệu test cho treasury và config.     |
| `init()`                          | Khởi tạo toàn bộ subsystem craft.                 |
| `fund_treasury()`                 | Nạp SUI vào treasury.                             |
| `withdraw()`                      | Rút SUI từ treasury bằng admin cap.               |
| `set_pause()`                     | Forward để pause/unpause hệ thống.                |
| `set_indexer_version()`           | Forward cập nhật version cho indexer.             |
| `set_craft_success_bps()`         | Forward cập nhật tỉ lệ craft thành công.          |
| `set_mint_pool_contribution()`    | Forward cập nhật đóng góp mint pool.              |
| `set_scrap_fusion_recipe()`       | Forward cập nhật công thức fuse scrap.            |
| `set_recycle_payouts()`           | Forward cập nhật payout recycle.                  |
| `craft_chun()`                    | Forward luồng craft.                              |
| `recycle_scrap_for_chun()`        | Forward luồng recycle scrap.                      |
| `recycle_batch_scraps_for_chun()` | Forward recycle nhiều scrap.                      |
| `fuse_scraps_for_bronze()`        | Forward fuse scrap thành Bronze.                  |
| `redeem_chun()`                   | Forward đổi Cuon Chun NFT lấy payout từ treasury. |
| `treasury_balance()`              | Đọc số dư treasury.                               |
| `bronze_pool_balance()`           | Đọc số dư pool Bronze.                            |
| `silver_pool_balance()`           | Đọc số dư pool Silver.                            |
| `gold_pool_balance()`             | Đọc số dư pool Gold.                              |
| `total_crafts()`                  | Đọc tổng số craft đã thực hiện.                   |

## 4. `craft_treasury.move`

Module này quản lý treasury, phân bổ tiền, và cơ chế redeem Chun.

| Hàm                         | Công dụng                                                |
| --------------------------- | -------------------------------------------------------- |
| `init()`                    | Tạo shared treasury object.                              |
| `current_craft_cost()`      | Tính chi phí craft hiện tại theo cơ chế halving.         |
| `tier_fixed_payout()`       | Trả về payout cố định cho từng tier.                     |
| `tier_pool_balance()`       | Đọc balance của pool theo tier.                          |
| `split_bucket_amounts()`    | Chia khoản tiền đầu vào vào các pool Bronze/Silver/Gold. |
| `withdraw_with_epoch_cap()` | Rút tiền theo giới hạn mỗi epoch.                        |
| `emit_redeem_event()`       | Emit event khi redeem.                                   |
| `sync_redeem_epoch()`       | Reset hoặc đồng bộ thống kê theo epoch mới.              |
| `apply_bucket_deposit()`    | Áp dụng khoản nạp vào các pool.                          |
| `apply_craft_deposit()`     | Xử lý khoản nạp từ craft.                                |
| `increment_total_crafts()`  | Tăng bộ đếm tổng craft.                                  |
| `fund_treasury()`           | Nạp SUI và emit event funding.                           |
| `quote_redeem_amount()`     | Ước tính số SUI có thể nhận khi redeem.                  |
| `redeem_chun()`             | Burn NFT và trả payout từ treasury.                      |
| `treasury_balance()`        | Đọc tổng balance treasury.                               |
| `bronze_pool_balance()`     | Đọc balance pool Bronze.                                 |
| `silver_pool_balance()`     | Đọc balance pool Silver.                                 |
| `gold_pool_balance()`       | Đọc balance pool Gold.                                   |
| `total_crafts()`            | Đọc tổng số craft.                                       |

## 5. `cuon_chun.move`

Module này định nghĩa NFT chính của game.

| Hàm           | Công dụng                                                           |
| ------------- | ------------------------------------------------------------------- |
| `init()`      | Thiết lập metadata display và chuyển object cần thiết cho deployer. |
| `mint()`      | Mint một Cuon Chun NFT hợp lệ theo tier và variant.                 |
| `burn()`      | Burn Cuon Chun NFT.                                                 |
| `tier()`      | Đọc tier của NFT.                                                   |
| `variant()`   | Đọc variant của NFT.                                                |
| `name()`      | Đọc tên hiển thị.                                                   |
| `image_url()` | Đọc URL hình ảnh.                                                   |

## 6. `scrap.move`

Module này quản lý NFT scrap sinh ra khi craft hoặc trade-up thất bại.

| Hàm           | Công dụng                             |
| ------------- | ------------------------------------- |
| `mint_for()`  | Mint scrap cho một người nhận cụ thể. |
| `mint()`      | Mint scrap cho người gọi hàm.         |
| `burn()`      | Burn scrap NFT.                       |
| `name()`      | Đọc tên scrap.                        |
| `image_url()` | Đọc URL hình ảnh của scrap.           |

## 7. `player_profile.move`

Module này lưu trạng thái người chơi, Chun Raw, streak, faucet, và logic PvP.

| Hàm                                 | Công dụng                                            |
| ----------------------------------- | ---------------------------------------------------- |
| `init()`                            | Tạo MatchOracle phục vụ test/admin.                  |
| `init_profile()`                    | Tạo `PlayerProfile` cho người chơi.                  |
| `emit_profile_updated()`            | Emit event khi profile thay đổi.                     |
| `assert_owner()`                    | Kiểm tra người gọi có phải owner hay không.          |
| `now_ms()`                          | Lấy thời gian hiện tại theo mili-giây.               |
| `report_result()`                   | Cập nhật Chun Raw, wins, losses, streak sau mỗi ván. |
| `chun_raw()`                        | Đọc Chun Raw hiện tại.                               |
| `streak()`                          | Đọc streak thắng.                                    |
| `wins()`                            | Đọc số trận thắng.                                   |
| `losses()`                          | Đọc số trận thua.                                    |
| `owner()`                           | Đọc địa chỉ owner của profile.                       |
| `staked_chun()`                     | Đọc số Chun đang bị khóa cho match.                  |
| `last_faucet_ms()`                  | Đọc timestamp faucet gần nhất.                       |
| `pending_faucet()`                  | Tính lượng Chun faucet có thể claim.                 |
| `spend_chun()`                      | Trừ Chun Raw nội bộ.                                 |
| `credit_chun()`                     | Cộng Chun Raw nội bộ.                                |
| `unlock_from_match()`               | Mở khóa Chun sau match.                              |
| `claim_faucet()`                    | Claim Chun từ faucet nếu đủ điều kiện.               |
| `lock_for_match()`                  | Khóa Chun để tham gia PvP.                           |
| `resolve_match()`                   | Giải quyết kết quả match giữa hai profile.           |
| `set_chun_raw_for_testing()`        | Helper test để set Chun Raw.                         |
| `create_match_oracle_for_testing()` | Helper test tạo MatchOracle.                         |

## 8. `marketplace.move`

Module này triển khai marketplace escrow cho Cuon Chun NFT.

| Hàm                         | Công dụng                                             |
| --------------------------- | ----------------------------------------------------- |
| `init()`                    | Tạo và share market object.                           |
| `assert_listing_exists()`   | Kiểm tra listing còn tồn tại.                         |
| `listing_party_and_price()` | Lấy seller và price từ listing.                       |
| `list()`                    | Escrow NFT và tạo listing.                            |
| `buy()`                     | Mua NFT, trả SUI cho seller, refund tiền thừa nếu có. |
| `cancel()`                  | Hủy listing và trả NFT về seller.                     |
| `has_listing()`             | Kiểm tra NFT đang được list hay không.                |
| `listing_price()`           | Đọc giá listing.                                      |
| `listing_seller()`          | Đọc seller của listing.                               |
| `listing_tier()`            | Đọc tier của NFT đang list.                           |
| `test_init()`               | Khởi tạo market cho test.                             |

## 9. `achievement.move`

Module này quản lý badge thành tích dạng soulbound NFT.

| Hàm                   | Công dụng                                  |
| --------------------- | ------------------------------------------ |
| `milestone_streak()`  | Map loại badge sang ngưỡng streak cần đạt. |
| `badge_name()`        | Tạo tên badge theo loại badge.             |
| `badge_description()` | Tạo mô tả badge.                           |
| `badge_image_url()`   | Tạo URL hình ảnh badge.                    |
| `claim_badge()`       | Kiểm tra điều kiện và mint badge.          |
| `badge_type()`        | Đọc loại badge.                            |
| `name()`              | Đọc tên badge.                             |
| `description()`       | Đọc mô tả badge.                           |
| `image_url()`         | Đọc hình badge.                            |
| `earned_at()`         | Đọc thời điểm nhận badge.                  |

## 10. `nft_valuation_lobby_config.move`

Module này lưu cấu hình cho lobby định giá NFT và quản lý signer allowlist.

| Hàm                            | Công dụng                                        |
| ------------------------------ | ------------------------------------------------ |
| `init()`                       | Tạo config và admin cap.                         |
| `signer_is_active()`           | Kiểm tra signer key có đang active không.        |
| `require_active_signer()`      | Bắt buộc signer phải nằm trong allowlist.        |
| `points_for_tier()`            | Map tier sang điểm.                              |
| `event_version()`              | Đọc version event.                               |
| `emergency_refund_delay_ms()`  | Đọc thời gian chờ refund khẩn cấp.               |
| `paused()`                     | Đọc trạng thái pause.                            |
| `strict_equal_points()`        | Đọc chế độ so khớp điểm tuyệt đối hay tối thiểu. |
| `chain_id()`                   | Đọc chain id dùng cho payload ký.                |
| `set_pause()`                  | Bật/tắt pause.                                   |
| `set_point_rules()`            | Cập nhật rule tính điểm.                         |
| `set_emergency_refund_delay()` | Cập nhật thời gian chờ refund khẩn cấp.          |
| `set_chain_id()`               | Cập nhật chain id.                               |
| `set_strict_equal_points()`    | Bật/tắt chế độ so điểm bằng nhau.                |
| `add_signer_pubkey()`          | Thêm signer public key vào allowlist.            |
| `remove_signer_pubkey()`       | Xóa signer public key khỏi allowlist.            |
| `test_init()`                  | Helper khởi tạo test.                            |

## 11. `nft_valuation_lobby.move`

Module này điều phối phòng định giá NFT, escrow NFT, settlement, và emergency refund.

| Hàm                            | Công dụng                                                                |
| ------------------------------ | ------------------------------------------------------------------------ |
| `points_satisfy()`             | Kiểm tra điều kiện điểm exact/minimum.                                   |
| `deposit_nfts_to_room()`       | Escrow NFT vào room và cộng tổng điểm.                                   |
| `transfer_nfts_from_ids()`     | Trả NFT escrow về một recipient.                                         |
| `clone_bytes()`                | Sao chép bytes để tạo payload ký.                                        |
| `build_settlement_message()`   | Tạo message settlement để signer ký.                                     |
| `assert_valid_winner_loser()`  | Kiểm tra cặp winner/loser hợp lệ.                                        |
| `set_pause()`                  | Forward cập nhật pause.                                                  |
| `set_point_rules()`            | Forward cập nhật rule điểm.                                              |
| `set_emergency_refund_delay()` | Forward cập nhật delay refund.                                           |
| `set_chain_id()`               | Forward cập nhật chain id.                                               |
| `set_strict_equal_points()`    | Forward cập nhật chế độ so điểm.                                         |
| `add_signer_pubkey()`          | Forward thêm signer.                                                     |
| `remove_signer_pubkey()`       | Forward xóa signer.                                                      |
| `create_room_with_deposit()`   | Tạo room và deposit NFT của người tạo.                                   |
| `join_room_with_deposit()`     | Join room và deposit NFT của đối thủ.                                    |
| `cancel_waiting_room()`        | Hủy room đang chờ và trả escrow.                                         |
| `settle_room_with_signature()` | Verify chữ ký, transfer NFT cho winner, mint scrap cho loser, chốt room. |
| `emergency_refund()`           | Hoàn NFT sau khi hết thời gian chờ emergency refund.                     |
| `status()`                     | Đọc trạng thái room.                                                     |
| `creator()`                    | Đọc creator của room.                                                    |
| `target_points()`              | Đọc target points.                                                       |
| `creator_points()`             | Đọc điểm của creator.                                                    |
| `joiner_points()`              | Đọc điểm của joiner.                                                     |
| `chain_id()`                   | Đọc chain id hiện tại.                                                   |
| `test_init()`                  | Khởi tạo test config.                                                    |

## 12. `trade_up.move`

Module này xử lý cơ chế nâng tier bằng cách burn NFT đầu vào và mint kết quả mới.

| Hàm                           | Công dụng                                         |
| ----------------------------- | ------------------------------------------------- |
| `roll_rng()`                  | Tạo roll cho kết quả trade-up.                    |
| `burn_all()`                  | Burn toàn bộ NFT đầu vào sau khi validate tier.   |
| `mint_trade_up_reward()`      | Mint reward nâng cấp hoặc Scrap tùy theo kết quả. |
| `execute_trade_up()`          | Engine chung cho toàn bộ trade-up flow.           |
| `trade_up_bronze_to_silver()` | Trade 8 Bronze lên Silver.                        |
| `trade_up_silver_to_gold()`   | Trade 6 Silver lên Gold.                          |

## Ghi chú

- Đây là bản mô tả theo code hiện tại trong `contract/sources/`.
- Nếu contract thay đổi, nên cập nhật lại tài liệu này cùng lúc với code.
- Nếu bạn muốn, mình có thể làm tiếp một bản “chi tiết hơn” theo từng hàm entry, kèm luồng input/output và error code.
