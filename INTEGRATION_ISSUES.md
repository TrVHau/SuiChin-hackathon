# 🔍 INTEGRATION ISSUES — Frontend ↔ Smart Contract

**Ngày phân tích:** 4 tháng 2, 2026

---

## ❌ VẤN ĐỀ CHÍNH

Frontend hiện tại **HOÀN TOÀN MOCK**, chưa tích hợp với Sui blockchain.

### Chi tiết:

1. **Không có Sui SDK setup**
   - `@mysten/dapp-kit` chưa được cài đặt
   - `@mysten/sui` chưa được cài đặt
   - Không có SuiClientProvider wrapper trong `main.tsx`

2. **Không có config**
   - Thiếu file config cho PACKAGE_ID
   - Thiếu network configuration
   - Thiếu RPC endpoints

3. **Profile lưu local thay vì on-chain**
   - `useProfile` hook dùng localStorage
   - Không fetch data từ blockchain
   - Không sync với PlayerProfile object

4. **Tất cả transactions đều mock**
   - `LoginScreen`: mock connect
   - `GameSession`: không gọi `record_session()`
   - `FaucetScreen`: không gọi `claim_faucet()`
   - `MintScreen`: không gọi `craft_roll()`
   - `AchievementScreen`: không gọi `claim_achievement()`

---

## ✅ SMART CONTRACT STATUS

**Contracts sẵn sàng deploy:**

### Module: player

- ✅ `PlayerProfile` struct đầy đủ
- ✅ `create_profile()` entry function
- ✅ View functions đầy đủ
- ✅ Events đã có

### Module: game

- ✅ `record_session()` với anti-cheat
- ✅ `claim_faucet()` với cooldown logic
- ✅ `craft_roll()` với random tier
- ✅ Validation đầy đủ

### Module: chun_roll

- ✅ `ChunRoll` NFT struct (has key, store)
- ✅ Display Protocol setup
- ✅ `mint()` và `burn()` functions

### Module: achievement

- ✅ `Achievement` soulbound NFT (has key only)
- ✅ Display Protocol setup
- ✅ `claim_achievement()` với milestone validation

**Kết luận:** Smart contracts HOÀN HẢO, sẵn sàng publish.

---

## 🛠️ CẦN LÀM ĐỂ TÍCH HỢP

### 1. Install Dependencies

```bash
cd frontend
npm install @mysten/dapp-kit @mysten/sui @tanstack/react-query
```

### 2. Files đã tạo (sẵn sàng sử dụng)

- ✅ `frontend/src/config/sui.config.ts` — network config, PACKAGE_ID
- ✅ `frontend/src/lib/sui-client.ts` — transaction builders
- ✅ `frontend/src/providers/SuiProvider.tsx` — Sui context provider
- ✅ `DEPLOYMENT_GUIDE.md` — hướng dẫn deploy chi tiết
- ✅ `CHECKLIST.md` — deployment checklist
- ✅ `frontend/.env.example` — env template

### 3. Files cần update

#### `frontend/src/main.tsx`

Thay:

```tsx
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Bằng:

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

#### `frontend/src/components/LoginScreen.tsx`

- Import `useWallet, useCurrentAccount` from `@mysten/dapp-kit`
- Import `getPlayerProfile, buildCreateProfileTx` from `@/lib/sui-client`
- Replace mock login logic:

  ```tsx
  import {
    useWallet,
    useCurrentAccount,
    useSignAndExecuteTransaction,
  } from "@mysten/dapp-kit";
  import { getPlayerProfile, buildCreateProfileTx } from "@/lib/sui-client";

  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const wallet = useWallet();
  const account = useCurrentAccount();

  const handleLogin = async () => {
    // 1. Connect wallet
    await wallet.connect();

    // 2. Check if profile exists
    const profile = await getPlayerProfile(account.address);

    // 3. If not exists, create profile
    if (!profile) {
      const tx = buildCreateProfileTx();
      signAndExecute({ transaction: tx });
    }
  };
  ```

#### `frontend/src/components/GameSession.tsx`

- Import hooks và builders
- Replace `onSaveSession` logic:

  ```tsx
  import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
  import { buildRecordSessionTx } from "@/lib/sui-client";

  const handleSaveAndExit = async () => {
    const tx = buildRecordSessionTx(
      profileId,
      sessionData.deltaTier1,
      sessionData.deltaTier2,
      sessionData.deltaTier3,
      sessionData.isTier1Positive,
      sessionData.isTier2Positive,
      sessionData.isTier3Positive,
      sessionData.newMaxStreak,
      sessionData.newCurrentStreak,
    );

    signAndExecute({
      transaction: tx,
      onSuccess: () => {
        toast.success("Session saved on blockchain!");
        onBack();
      },
    });
  };
  ```

#### `frontend/src/components/FaucetScreen.tsx`

```tsx
import { buildClaimFaucetTx } from "@/lib/sui-client";

const handleClaim = () => {
  const tx = buildClaimFaucetTx(profileId);
  signAndExecute({ transaction: tx });
};
```

#### `frontend/src/components/MintScreen.tsx`

```tsx
import { buildCraftRollTx } from "@/lib/sui-client";

const handleMint = () => {
  const tx = buildCraftRollTx(profileId, useTier1, useTier2, useTier3);
  signAndExecute({ transaction: tx });
};
```

#### `frontend/src/components/AchievementScreen.tsx`

```tsx
import { buildClaimAchievementTx } from "@/lib/sui-client";

const handleClaim = (milestone: number) => {
  const tx = buildClaimAchievementTx(profileId, milestone);
  signAndExecute({ transaction: tx });
};
```

#### `frontend/src/hooks/useProfile.ts`

Thay localStorage logic bằng blockchain fetch:

```tsx
import { useCurrentAccount } from "@mysten/dapp-kit";
import { getPlayerProfile } from "@/lib/sui-client";
import { useEffect, useState } from "react";

export const useProfile = () => {
  const account = useCurrentAccount();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (account?.address) {
      getPlayerProfile(account.address).then(setProfile);
    }
  }, [account]);

  return { profile };
};
```

---

## 📋 DEPLOYMENT WORKFLOW

### Step 1: Deploy Contract

1. `cd contract && sui move build`
2. `sui move test`
3. `sui client publish --gas-budget 100000000`
4. **Lưu Package ID**

### Step 2: Update Frontend Config

1. Paste Package ID vào `frontend/src/config/sui.config.ts`
2. `cd frontend && npm install @mysten/dapp-kit @mysten/sui @tanstack/react-query`

### Step 3: Update Components

1. Update `main.tsx` với SuiProvider
2. Update LoginScreen
3. Update GameSession
4. Update FaucetScreen
5. Update MintScreen
6. Update AchievementScreen
7. Update useProfile hook

### Step 4: Test Local

1. `npm run dev`
2. Test wallet connect
3. Test create profile
4. Test all transactions

### Step 5: Deploy Frontend

1. `npm run build`
2. Deploy to Vercel/Netlify/GitHub Pages

---

## 🎯 ƯỚC LƯỢNG THỜI GIAN

- **Contract deployment:** 15-30 phút (nếu không có lỗi)
- **Frontend integration:** 2-4 giờ (update tất cả components)
- **Testing:** 1-2 giờ
- **Deploy frontend:** 30 phút
- **Total:** ~4-7 giờ

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **PACKAGE_ID phải update SAU KHI deploy contract** → không được để `0x0`
2. **Network phải match:** testnet contract → testnet frontend
3. **Wallet phải có SUI:** testnet faucet hoặc mainnet buy
4. **Image URLs:** nếu muốn NFT có ảnh, phải upload images trước
5. **Transaction gas:** mỗi tx tốn ~0.001-0.01 SUI

---

## ✅ CHECKLIST NHANH

- [ ] Contract deployed → có Package ID
- [ ] Package ID updated trong `sui.config.ts`
- [ ] Dependencies installed
- [ ] `main.tsx` wrapped với SuiProvider
- [ ] All components updated để call blockchain
- [ ] `npm run dev` hoạt động
- [ ] Wallet connect thành công
- [ ] Transactions execute được
- [ ] `npm run build` thành công
- [ ] Deployed frontend

---

**Xem thêm:**

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) — hướng dẫn chi tiết
- [CHECKLIST.md](./CHECKLIST.md) — deployment checklist đầy đủ
