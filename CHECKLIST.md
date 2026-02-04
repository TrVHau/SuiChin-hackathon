# ✅ DEPLOYMENT CHECKLIST — SuiChin

Sử dụng checklist này để đảm bảo deploy đúng cách và không bỏ sót bước nào.

---

## 📦 PHẦN 1: SMART CONTRACT DEPLOYMENT

### Chuẩn bị

- [ ] Sui CLI đã cài đặt và hoạt động (`sui --version`)
- [ ] Wallet đã tạo và active (`sui client active-address`)
- [ ] Đã switch sang testnet (`sui client switch --env testnet`)
- [ ] Đã có đủ SUI testnet (>= 0.5 SUI) (`sui client gas`)
- [ ] NFT images (8 ảnh) đã chuẩn bị

### Build & Test

- [ ] `cd contract && sui move build` → thành công
- [ ] `sui move test` → tất cả tests pass
- [ ] Đọc lại code để đảm bảo không có logic bugs

### Publish Contract

- [ ] `sui client publish --gas-budget 100000000`
- [ ] **Lưu Package ID từ output** (ví dụ: `0xabcd1234...`)
- [ ] Copy Package ID vào clipboard
- [ ] Verify contract trên Sui Explorer

### Upload NFT Images

- [ ] Upload 3 ảnh ChunRoll (tier 1/2/3) lên IPFS/Walrus
- [ ] Upload 5 ảnh Achievement lên IPFS/Walrus
- [ ] Lưu tất cả URLs/CIDs
- [ ] (Tùy chọn) Update image URLs trong contract và publish lại

---

## 🎨 PHẦN 2: FRONTEND INTEGRATION

### Install Dependencies

- [ ] `cd frontend`
- [ ] `npm install @mysten/dapp-kit @mysten/sui`
- [ ] `npm install @tanstack/react-query` (required by dapp-kit)
- [ ] Verify `package.json` có đủ 3 packages trên

### Config Files

- [ ] Cập nhật `frontend/src/config/sui.config.ts`:
  - [ ] `PACKAGE_ID = '0x...'` (dán Package ID đã copy)
  - [ ] `NETWORK = 'testnet'`
- [ ] File `frontend/src/lib/sui-client.ts` đã có (đã tạo)
- [ ] File `frontend/src/providers/SuiProvider.tsx` đã có (đã tạo)

### Update main.tsx

- [ ] Import `SuiProvider`
- [ ] Wrap `<App />` trong `<SuiProvider>`
- [ ] Import CSS: `@mysten/dapp-kit/dist/index.css`

Ví dụ:

```tsx
import { SuiProvider } from "./providers/SuiProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SuiProvider>
      <App />
    </SuiProvider>
  </StrictMode>,
);
```

### Replace Mock Logic với Blockchain Calls

#### LoginScreen.tsx

- [ ] Import `useWallet` from `@mysten/dapp-kit`
- [ ] Import `getPlayerProfile, buildCreateProfileTx` from `@/lib/sui-client`
- [ ] Thay mock login bằng:
  - [ ] `wallet.connect()` để kết nối ví
  - [ ] `getPlayerProfile(address)` để check profile
  - [ ] Nếu chưa có → execute `buildCreateProfileTx()`

#### GameSession.tsx

- [ ] Import `useSignAndExecuteTransaction` from `@mysten/dapp-kit`
- [ ] Import `buildRecordSessionTx` from `@/lib/sui-client`
- [ ] Trong `handleSaveAndExit()`:
  - [ ] Build transaction với `buildRecordSessionTx(...)`
  - [ ] Execute: `signAndExecuteTransaction({ transaction: tx })`
  - [ ] Handle success/error

#### FaucetScreen.tsx

- [ ] Import hooks và builder
- [ ] Replace mock claim bằng `buildClaimFaucetTx(profileId)`
- [ ] Execute transaction

#### MintScreen.tsx

- [ ] Import hooks và builder
- [ ] Replace mock mint bằng `buildCraftRollTx(profileId, ...)`
- [ ] Execute transaction

#### AchievementScreen.tsx

- [ ] Import hooks và builder
- [ ] Replace mock claim bằng `buildClaimAchievementTx(profileId, milestone)`
- [ ] Execute transaction

### useProfile Hook Update

- [ ] Đọc profile từ blockchain thay vì localStorage
- [ ] Dùng `getPlayerProfile(address)` để fetch data
- [ ] Parse contract fields thành frontend format

---

## 🧪 PHẦN 3: LOCAL TESTING

### Test Kết nối

- [ ] `npm run dev`
- [ ] Mở `http://localhost:5173`
- [ ] Sui Wallet extension đã cài đặt và switch sang testnet
- [ ] Click "Đăng nhập" → wallet popup hiện ra
- [ ] Connect wallet thành công

### Test Create Profile

- [ ] Nếu là user mới → transaction tạo profile tự động chạy
- [ ] Approve transaction trong wallet
- [ ] Check Sui Explorer xem transaction thành công
- [ ] Profile object được tạo

### Test Game Flow

- [ ] Xin chun (claim faucet) → transaction thành công
- [ ] Chơi game session → record session transaction thành công
- [ ] Mint NFT → craft_roll transaction thành công
- [ ] Claim achievement → transaction thành công

### Test NFTs

- [ ] Mở Sui Wallet → tab NFTs
- [ ] ChunRoll NFT hiển thị (nếu đã mint)
- [ ] Achievement NFT hiển thị (nếu đã claim)
- [ ] Metadata đúng (name, description, image)

---

## 🚀 PHẦN 4: PRODUCTION DEPLOYMENT

### Build Frontend

- [ ] `npm run build`
- [ ] Kiểm tra folder `dist/` được tạo
- [ ] Test local build: `npm run preview`

### Deploy lên Hosting

**Vercel:**

- [ ] `npm install -g vercel`
- [ ] `vercel --prod`
- [ ] Copy deployment URL

**Netlify:**

- [ ] `npm install -g netlify-cli`
- [ ] `netlify deploy --prod --dir=dist`
- [ ] Copy deployment URL

**GitHub Pages (tùy chọn):**

- [ ] Setup GitHub Actions
- [ ] Push code
- [ ] Verify deployment

### Verify Production

- [ ] Mở deployment URL
- [ ] Connect wallet → thành công
- [ ] Tất cả features hoạt động
- [ ] NFTs display đúng
- [ ] No console errors

---

## 📝 PHẦN 5: DOCUMENTATION & CLEANUP

### Update README

- [ ] Cập nhật `README.md` với:
  - [ ] Live demo URL
  - [ ] Deployed contract address (Package ID)
  - [ ] Network info (testnet/mainnet)
  - [ ] Hướng dẫn sử dụng

### Update .env.example

- [ ] Tạo `.env.example` với template:

```
VITE_SUI_PACKAGE_ID=0x...
VITE_SUI_NETWORK=testnet
```

### Git Commit & Push

- [ ] `git add .`
- [ ] `git commit -m "Deploy SuiChin to testnet"`
- [ ] `git push origin main`

### Social & Community

- [ ] Tweet/post về deployment
- [ ] Share contract address
- [ ] Invite users để test

---

## 🎯 MAINNET DEPLOYMENT (Khi sẵn sàng)

- [ ] Test kỹ trên testnet ít nhất 1 tuần
- [ ] Audit code (tự audit hoặc thuê auditor)
- [ ] Chuẩn bị 2-5 SUI mainnet cho gas
- [ ] Update `NETWORK = 'mainnet'` trong config
- [ ] `sui client switch --env mainnet`
- [ ] `sui client publish --gas-budget 100000000`
- [ ] Update PACKAGE_ID trong frontend
- [ ] Deploy frontend với mainnet config
- [ ] Announce launch 🎉

---

## ⚠️ TROUBLESHOOTING

### Contract publish failed

- Kiểm tra gas budget đủ lớn
- Kiểm tra syntax Move code
- Xem lỗi chi tiết trong terminal

### Frontend không connect wallet

- Sui Wallet extension đã cài chưa?
- Network đã switch đúng chưa?
- Console có lỗi gì?

### Transaction failed

- Check gas có đủ không
- Xem lỗi trong Sui Explorer
- Kiểm tra arguments đúng type chưa

### NFT không hiển thị ảnh

- URLs có accessible không?
- CORS đã setup chưa?
- Metadata format đúng chưa?

---

**Good luck! 🚀**
