# Hướng dẫn Deploy SuiChin lên Blockchain

## Bước 1: Chuẩn bị môi trường

### 1.1. Cài đặt Sui CLI

```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

Kiểm tra:

```bash
sui --version
```

### 1.2. Tạo và cấu hình ví

```bash
# Tạo ví mới (nếu chưa có)
sui client new-address ed25519

# Xem danh sách addresses
sui client addresses

# Switch sang testnet
sui client switch --env testnet

# Kiểm tra active address
sui client active-address
```

### 1.3. Xin SUI testnet từ faucet

```bash
# Faucet testnet
sui client faucet

# Hoặc truy cập: https://faucet.sui.io/
```

Kiểm tra balance:

```bash
sui client gas
```

---

## Bước 2: Deploy Smart Contracts

### 2.1. Build contract

```bash
cd contract
sui move build
```

Nếu có lỗi, kiểm tra:

- `Move.toml` đúng format
- Dependencies đầy đủ
- Syntax Move code

### 2.2. Test contract (quan trọng!)

```bash
sui move test
```

Đảm bảo tất cả tests pass.

### 2.3. Publish contract lên testnet

```bash
sui client publish --gas-budget 100000000
```

**⚠️ QUAN TRỌNG:** Lưu lại output của lệnh này, đặc biệt:

```
----- Transaction Digest ----
<digest>

----- Published Objects ----
PackageID: 0xABCDEF1234567890...   <-- ĐÂY LÀ PACKAGE_ID
```

### 2.4. Lưu Package ID

Copy Package ID và cập nhật vào:

- `frontend/src/config/sui.config.ts` → `PACKAGE_ID`
- Nếu có file `.env`:
  ```
  VITE_SUI_PACKAGE_ID=0xABCDEF1234567890...
  ```

---

## Bước 3: Cấu hình Frontend

### 3.1. Cài đặt dependencies Sui

```bash
cd frontend
npm install @mysten/dapp-kit @mysten/sui
```

### 3.2. Cập nhật `main.tsx` với Sui providers

Tạo file `frontend/src/providers/SuiProvider.tsx`:

```tsx
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient();

const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

export function SuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
```

Cập nhật `main.tsx`:

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

### 3.3. Thay thế mock logic bằng blockchain calls

Các components cần update:

- `LoginScreen.tsx` → dùng `useWallet()` để connect
- `GameSession.tsx` → call `buildRecordSessionTx()` và execute
- `FaucetScreen.tsx` → call `buildClaimFaucetTx()`
- `MintScreen.tsx` → call `buildCraftRollTx()`
- `AchievementScreen.tsx` → call `buildClaimAchievementTx()`

### 3.4. Test frontend local

```bash
npm run dev
```

Kiểm tra:

- Connect wallet thành công
- Tạo profile transaction
- Các transactions khác

---

## Bước 4: Upload NFT Images

### 4.1. Chuẩn bị images

Tạo images cho:

- ChunRoll tier 1/2/3 (3 ảnh)
- Achievements (5 ảnh cho 5 milestones)

### 4.2. Upload lên IPFS/Arweave/Walrus

Ví dụ dùng NFT.Storage (IPFS):

```bash
# Upload từng file hoặc folder
# Lấy CID/URL
```

### 4.3. Cập nhật URLs trong contract

Chỉnh file `contract/sources/chun_roll.move` và `achievement.move`:

```move
// Ví dụ trong chun_roll.move
fun get_tier_image_url(tier: u8): Url {
    if (tier == 1) {
        url::new_unsafe_from_bytes(b"ipfs://Qm.../tier1.png")
    } else if (tier == 2) {
        url::new_unsafe_from_bytes(b"ipfs://Qm.../tier2.png")
    } else {
        url::new_unsafe_from_bytes(b"ipfs://Qm.../tier3.png")
    }
}
```

Sau đó **publish lại contract** (hoặc dùng upgradeable package nếu đã setup).

---

## Bước 5: Deploy Frontend

### 5.1. Build production

```bash
cd frontend
npm run build
```

### 5.2. Deploy lên hosting

**Vercel:**

```bash
npm install -g vercel
vercel --prod
```

**Netlify:**

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**GitHub Pages:**

```bash
# Push dist folder to gh-pages branch
```

### 5.3. Cấu hình custom domain (tùy chọn)

---

## Bước 6: Kiểm tra cuối

- [ ] Contract đã publish thành công
- [ ] Package ID đã cập nhật trong frontend
- [ ] Wallet connect hoạt động
- [ ] Create profile transaction thành công
- [ ] Game session record thành công
- [ ] Faucet claim thành công
- [ ] Mint NFT thành công
- [ ] Achievement claim thành công
- [ ] NFT hiển thị đúng trong Sui Wallet
- [ ] Frontend deployed và accessible

---

## Troubleshooting

### Lỗi "Insufficient gas"

→ Xin thêm SUI từ faucet

### Lỗi "Package not found"

→ Kiểm tra PACKAGE_ID đã đúng chưa

### Transaction failed

→ Xem chi tiết lỗi trong Sui Explorer: `https://testnet.suivision.xyz/`

### Frontend không connect wallet

→ Kiểm tra @mysten/dapp-kit version và setup

### NFT không hiển thị ảnh

→ Kiểm tra image URLs trong contract và CORS

---

## Mainnet Deploy (Production)

Khi sẵn sàng lên mainnet:

1. Switch environment: `sui client switch --env mainnet`
2. Chuẩn bị đủ SUI cho gas (ước tính ~1-2 SUI)
3. Test kỹ trên testnet trước
4. Update `sui.config.ts` → `NETWORK = 'mainnet'`
5. Publish contract lên mainnet
6. Deploy frontend với mainnet config

---

**Liên hệ hỗ trợ:** Mở issue trong repo nếu gặp vấn đề.
