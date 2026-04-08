# Contract Handoff Spec: Indexer, zkLogin, VRF, Recycle, Scrap Fusion

## 1. Muc tieu

Tai lieu nay mo ta bo chuc nang mo rong can ban giao cho dev contract va cac ben lien quan (backend, frontend, indexer). Muc tieu la lam cho du an:

- Bot phu thuoc vao RPC public cua Sui.
- Co trai nghiem dang nhap Web2-like bang Sui zkLogin.
- Co co che craft cong boang bach bang VRF co the kiem chung.
- Co vong lap dot/hoan doi NFT va scrap de tao them sink economy.
- Co co che gop nhieu scrap + SUI de tao NFT dong cap bronze.

## 2. Pham vi

### Trong pham vi tai lieu nay

- Yeu cau contract phai emit event day du de indexer tu dong dong bo.
- Yeu cau contract phai ho tro luong cua craft/ burn / fuse / settlement moi.
- Yeu cau contract phai chuan hoa object model de backend co the trace va query.
- Yeu cau contract phai san sang cho nguoi dung dang nhap qua zkLogin, tuc la ownership luon dua tren address on-chain chuan Sui, khong phu thuoc Sui Wallet extension.

### Ngoai pham vi truc tiep cua contract

- Xay dung indexer Node.js + PostgreSQL.
- Cai dat Sui zkLogin UI/flow tren frontend.
- Cung cap VRF oracle service va chu ky ngoai chuoi.

Diem quan trong: phan "ngoai pham vi" van phai duoc mo ta ro de dev contract biet can emit gi va can ky vong gi tu backend/frontend.

## 3. Tong quan kien truc de giam phu thuoc ben 3

De du an thuc su co chat rieng, khong nen chi dua vao Sui RPC public va explorer ben ngoai. Kien truc de xuat:

1. Contract emit event on-chain cho moi hanh dong quan trong.
2. Custom Indexer Node.js lang nghe event va luu sang PostgreSQL.
3. FE/BE chi doc du lieu tu indexer noI bo la chinh, RPC public chi dung de fallback hoac sync ban dau.
4. Contract luon cung cap event versioned va idempotent de indexer co the re-sync an toan.

## 4. Feature A - Custom Indexer (giam phu thuoc RPC ben ngoai)

### 4.1 Muc tieu nghiep vu

- Theo doi tat ca event quan trong tu smart contract.
- Dong bo vao PostgreSQL de phuc vu leaderboard, lich su tran, lich su craft, lich su burn/fuse, inventory, va proof.
- Giam rate-limit va race condition do goi RPC cong khai qua nhieu.

### 4.2 Contract can cung cap gi

Contract khong phai viet indexer, nhung phai san xuat du lieu "indexable".
Bat buoc emit event cho:

- Player profile changes.
- Faucet claim.
- Match lock / unlock / resolve.
- Craft attempt va craft result.
- Burn/recycle.
- Scrap fusion.
- NFT mint / burn / transfer co y nghia kinh te.
- Admin config changes.
- Randomness request / randomness result neu co VRF.

### 4.3 Event schema khuyen nghi

Moi event nen co:

- version: u64 hoac u8.
- action_type: string hoac enum.
- actor: address.
- object_id / room_id / asset_ids.
- amount / tier / points.
- tx_digest hoac tx_version neu co the trace.
- timestamp_ms.
- correlation_id hoac request_id de indexer no sanh.

### 4.4 Database ma hoa indexer phai luu

Indexer PostgreSQL nen co cac bang toi thieu:

- blocks_sync_state
- contract_events
- player_profiles_snapshot
- bet_rooms
- crafts
- burns
- scrap_fusions
- nft_ownership_history
- reward_distribution

### 4.5 Yeu cau consistency

- Indexer phai idempotent.
- Phai co checkpoint block/tx version.
- Phai xu ly reorg / duplicate event neu source cung cap.
- Phai co retry queue khi PostgreSQL down.

### 4.6 API indexer de FE/BE dung

- GET /players/:address/profile
- GET /players/:address/inventory
- GET /rooms/:roomId
- GET /crafts/:address/history
- GET /leaderboard
- GET /proofs/:roomId

## 5. Feature B - Sui zkLogin (zero-friction login)

### 5.1 Muc tieu

- Nguoi choi dang nhap bang Google, Twitch, Facebook.
- Khong bat buoc cai Sui Wallet extension.
- Tai san van nam tren chuoi va address van la address Sui hop le.

### 5.2 Dieu can hieu dung

zkLogin la viec cua frontend/auth layer, khong phai Move contract "xac thuc Google". Contract chi can:

- Tiep nhan address hop le do zkLogin tao ra.
- Khong phan biet wallet extension hay embedded wallet.
- Chi kiem tra ownership dua tren sender/address.

### 5.3 Contract implication

Dev contract can dam bao:

- Moi ham chi dua vao tx_context::sender.
- Khong co logic phu thuoc cai dat wallet extension.
- Khong hardcode assumption "wallet external signing".
- Quan ly owner theo address chuan Sui.

### 5.4 Yeu cau phia frontend/backend

- FE can luu session cua zkLogin va tao Sui address tu id token.
- BE can nhan address nay nhu danh tinh nguoi choi.
- Indexer phai xem day la mot address binh thuong.

### 5.5 UX message de truyen thong

- "Dang nhap bang Google, tai san cua ban van nam tren blockchain."
- "Khong can cai vi, khong can biet blockchain de choi."

## 6. Feature C - VRF cho Craft NFT

6.1 Mục tiêuMinh bạch tuyệt đối: Tỉ lệ thành công 20% được quyết định bởi lớp thực thi của Blockchain Sui (Protocol-level randomness).Trải nghiệm tức thì (Zero Latency): Người chơi nhận kết quả Craft ngay trong cùng một giao dịch, không cần đợi Oracle bên thứ ba phản hồi.Chống gian lận: Nhà phát hành game hoàn toàn không thể can thiệp vào kết quả quay số.
6.2 Yêu cầu kỹ thuật cho Dev ContractSử dụng module sui::random chính chủ của Sui để triển khai:Hàm thực thi (entry fun): Phải tiếp nhận đối tượng Random làm tham số (địa chỉ mặc định: 0x8).Cơ chế bảo mật: Hàm thực thi này phải được đánh dấu là entry và không được có giá trị trả về (return value) để tránh việc các Smart Contract khác tấn công bằng cách thử-sai (Look-ahead attack).
6.3 Quy trình thực hiện (Workflow)Input: Người chơi gửi yêu cầu Craft kèm theo nguyên liệu (Scrap + Coin).Logic trong Move:Sử dụng random::new_generator để tạo bộ sinh số ngẫu nhiên.Gọi random::generate_u8_in_range(generator, 1, 100) để lấy một số từ 1 đến 100.Quy tắc: Nếu số trả về $\le 20$, xác định là Thành công (Mint NFT). Nếu $> 20$, xác định là Thất bại (Trả về Scrap an ủi).Output: Thực hiện Mint tài sản tương ứng và chuyển thẳng vào ví người chơi.
6.4 Dữ liệu Event bắt buộc (Cho Indexer)Mỗi lần Craft, Contract phải phát ra Event CraftResult chứa:craft_id: ID duy nhất của lượt craft.player: Địa chỉ người thực hiện.random_value: Con số ngẫu nhiên đã quay được (để người chơi có thể kiểm chứng).is_success: Boolean (True/False).nft_minted_id: ID của NFT mới (nếu thành công).timestamp_ms: Thời gian thực hiện.
6.5 Cách truyền thông cho Hội đồng/Người dùng"Dự án sử dụng cơ chế ngẫu nhiên nội tại (Native Randomness) của mạng lưới Sui. Đây là cơ chế bảo mật cấp độ giao thức, loại bỏ hoàn toàn rủi ro thao túng từ phía Server hay bên thứ ba."Ghi chú quan trọng cho Dev Contract:"Ông lưu ý khi dùng sui::random, hàm craft của ông phải dùng Random object từ 0x8. Đừng quên thêm Random vào tham số của hàm entry fun nhé. Dùng cái này thì ông không cần viết thêm logic verify chữ ký hay đợi Oracle gì cả, code sẽ cực kỳ gọn!"

## 7. Feature D - Recycle / Burn Mechanic

### 7.1 Muc tieu

- Cho phep nguoi choi dot NFT Scrap hoac NFT bi du thua de nhan lai mot luong Chun.
- Tao sink cho NFT cung, giam cung luu thong, giu gia tri NFT hiem.
- Tang doanh thu and retention bang mot vong lap economy co y nghia.

### 7.2 Luat co ban

- Dot 1 NFT khong muon giua cac tier se tra ve 1 luong Chun co dinh hoac theo tier.
- Vi du tham khao:
  - Bronze scrap / du thua: 1 NFT = 4 Chun.
  - Silver du thua: 1 NFT = 8 Chun.
  - Gold du thua: 1 NFT = 15 Chun.
- So luong tra ve phai co cap tren de tranh farm vo han.

### 7.3 Contract functions de dev can xay

- burn_nft_for_chun(nft_id)
- burn_multiple_nfts_for_chun(nft_ids)
- recycle_scrap_for_chun(scrap_id)
- recycle_batch(...) neu can toi uu gas

### 7.4 Rule an toan

- Chi owner hop le moi duoc dot.
- NFT da dot khong the duoc quan ly lai.
- Chun tra ve phai lay tu quy hoac pool re-cycling duoc dinh nghia ro rang.
- Phai co event ghi ro truoc/sau khi burn.

### 7.5 Economy reason

- Giam NFT rac.
- Tao them co hoi recuperate cho nguoi choi that bai.
- Dam bao nguoi choi khong cam thay craft fail la "mat het".

## 8. Feature E - Scrap Fusion (gop nhieu vuon + SUI = 1 NFT dong cap bronze)

### 8.1 Muc tieu

- Cho nguoi choi dung nhieu scrap + mot luong SUI de tao 1 NFT bronze.
- Tao mot sink cho scrap va mot sink cho SUI.
- Tang gia tri cho scrap va giup nguoi choi co duong nang cap tu du lieu vo dung.

### 8.2 Luat de xay

- Input:
  - N Scrap tokens hoac Scrap items.
  - Mot so SUI fee co dinh.
- Output:
  - 1 Bronze NFT co tier co dinh hoac bronze_variant random by VRF.
- Can co floor va cap de khong lam lo economy.

### 8.3 Goi y cong thuc

- 5 Scrap + 0.05 SUI -> 1 Bronze NFT
- 10 Scrap + 0.08 SUI -> 1 Bronze+ variant
- 20 Scrap + 0.10 SUI -> 1 Bronze NFT co chance hiem

Luu y: con so nay chi la placeholder, dev contract can chot theo economy design sau.
chốt công thức 20 Scrap -> 1Bronze NFT không dùng thêm sui nữa vì đã sịt cả đống tiền rồi .

### 8.4 Contract functions de xay

- fuse_scraps_for_bronze(scrap_ids, payment_coin)
- fuse_scraps_for_bronze_variant(scrap_ids, payment_coin, vrf_proof)

### 8.5 Rule an toan

- Scrap phai bi burn khi fuse.
- Phai ky quy SUI dung so.
- Phai emit event de indexer cap nhat inventory.
- Neu fuse fail, khong duoc mat scrap va mat SUI luon (atomic).

## 9. Contract objects / config can them

### 9.1 Config object

Can co mot object config chung de co the cap nhat:

- point rules / pricing.
- recycle payout rules.
- fusion recipe rules.
- vrf signer / oracle config.
- indexer version / event version.
- pause flag.

### 9.2 Randomness / oracle control object

- Luu pubkey / signer identity neu dung VRF proof do backend/oracle cap.
- Phai ho tro rotate signer.

### 9.3 Economy registry object

- Luu mapping:
  - Bronze
  - Silver
  - Gold
  - Scrap
  - Chun point value
- Mapping nay phai hop nhat voi indexer va frontend de tranh sai lech.

## 10. Event schema bat buoc phai emit

### 10.1 Indexer sync events

- ProfileCreated
- ProfileUpdated
- InventoryChanged
- NftMinted
- NftBurned
- ScrapMinted
- ScrapBurned
- CraftRequested
- CraftRandomnessFulfilled
- CraftResultFinalized
- ScrapsFused
- RecycleRewardIssued

### 10.2 zkLogin-related events

Contract khong can event rieng cho zkLogin, nhung phai luu:

- sender address
- ownership change
- first profile init
- linked inventory state

### 10.3 Metadata bat buoc

Moi event nen co:

- version
- actor
- asset_id hoac object_id
- action
- amount
- tier
- timestamp_ms
- correlation_id

## 11. Contract functions de dev can can nhac them

Tuy khong bat buoc tat ca phai nam trong cung mot module, spec de xuat co the tach:

- init_system_config
- set_indexer_version
- set_vrf_oracle
- request_craft_randomness
- fulfill_craft_randomness
- finalize_craft
- burn_nft_for_chun
- fuse_scraps_for_bronze
- emit economy events ro rang

## 12. Bien phap phong chong gian lan

- Khong cho replay randomness proof.
- Khong cho burn/fuse neu ownership khong hop le.
- Khong cho double claim chun tu recycle.
- Khong cho cap nhat config tu tai khoan khong co quyen.
- Khong cho event version mismatch lam indexer doc sai.

## 13. Yeu cau cho backend indexer

Backend dev can:

- Lang nghe event theo checkpoint.
- Luu vao PostgreSQL.
- Tich hop retry/backfill.
- Cung cap API cho FE.
- Theo doi replay, random result, inventory change.

## 14. Yeu cau cho frontend / UX

Frontend khong phai phan cua contract, nhung phai ho tro cac co che nay:

- zkLogin login flow.
- Craft UI hien thi "Van co the kiem chung".
- Recycle UI giai thich lo do.
- Scrap fusion UI cho thay input/output ro rang.
- Event/progress history lay tu indexer, khong phai RPC public.

## 15. Test matrix de dev contract lam

### 15.1 Indexer-facing tests

- Event emit dung schema.
- Event version khong vo.
- Duplicate sync khong tao data sai.

### 15.2 zkLogin compatibility tests

- Sender address tu embedded wallet van tao profile binh thuong.
- Khong can Sui Wallet extension.
- Ownership and claim logic van chay dung.

### 15.3 VRF tests

- Randomness valid -> craft result theo ty le.
- Randomness invalid -> reject.
- Replay proof -> reject.
- Timeout -> safe fail.

### 15.4 Recycle tests

- Burn dung NFT -> nhan dung Chun.
- Burn sai owner -> reject.
- Batch burn atomic.

### 15.5 Scrap fusion tests

- Du scrap + SUI -> mint Bronze.
- Thieu scrap -> reject.
- Thieu SUI -> reject.
- Fuse atomic, khong mat asset neu fail.

## 16. Definition of Done

Hoan thanh khi:

- Event schema on-chain day du de indexer dong bo.
- Co du dong random/VRF craft flow.
- Co recycle/burn mechanic tra chun hop ly.
- Co scrap fusion tao bronze NFT.
- Contract khong phu thuoc vao RPC public de phuc vu app layer.
- Test pass cho cac edge case chinh.

## 17. Tom tat ban giao

Dev contract can tap trung 4 viec lon:

1. Dinh nghia event va object model de indexer tu dong dong bo.
2. San sang contract cho zkLogin address-based ownership.
3. Them VRF randomness flow cho craft minh bach.
4. Them recycle/burn va scrap fusion de hoan thien economy loop.
