# 🎯 SuiChin - Deployment Checklist

## ✅ Pre-Deployment

### 1. Prepare NFT Images

**ChunRoll NFT (3 images):**

- [ ] `chunroll_tier1.png` - Bronze/Đồng (512x512px)
- [ ] `chunroll_tier2.png` - Silver/Bạc (512x512px)
- [ ] `chunroll_tier3.png` - Gold/Vàng (512x512px)

**Achievement NFT (5 images):**

- [ ] `beginner.png` - Streak 1
- [ ] `skilled.png` - Streak 5
- [ ] `expert.png` - Streak 18
- [ ] `master.png` - Streak 36
- [ ] `legend.png` - Streak 67

### 2. Upload Images

**Option A: GitHub (Recommended for hackathon)**

```bash
mkdir -p public/nft public/achievements
# Copy images to folders
git add public/
git commit -m "Add NFT images"
git push
```

**Image URLs will be:**

```
https://raw.githubusercontent.com/USERNAME/suichin/main/public/nft/chunroll_tier1.png
https://raw.githubusercontent.com/USERNAME/suichin/main/public/achievements/beginner.png
```

**Option B: IPFS**

- Upload to Pinata.cloud
- Get IPFS URLs

### 3. Update Image URLs in Contracts

**File: `contract/sources/chun_roll.move`**

```move
fun get_tier_image_url(tier: u8): Url {
    let url_bytes = if (tier == 1) {
        b"YOUR_ACTUAL_URL_HERE"  // ← Update this
    } ...
}
```

**File: `contract/sources/achievement.move`**

```move
fun get_milestone_image_url(milestone: u64): Url {
    let url_bytes = if (milestone == MILESTONE_BEGINNER) {
        b"YOUR_ACTUAL_URL_HERE"  // ← Update this
    } ...
}
```

---

## 🚀 Deployment Steps

### Step 1: Build Contract

```bash
cd contract
sui move build
```

**Expected output:**

```
BUILDING suichin
...
Build successful
```

### Step 2: Test Contract

```bash
sui move test
```

**All tests should pass!**

### Step 3: Deploy to Testnet

```bash
# Make sure connected to testnet
sui client active-env

# Should show: testnet

# Publish
sui client publish --gas-budget 100000000
```

**Save these values:**

- ✅ Package ID: `0x...`
- ✅ Publisher ID: `0x...`
- ✅ Display Object IDs (ChunRoll & Achievement)

### Step 4: Verify Display Protocol

**Check ChunRoll Display:**

```bash
sui client object CHUNROLL_DISPLAY_OBJECT_ID
```

**Should see:**

```json
{
  "name": "{name}",
  "image_url": "{image_url}",
  "tier": "Tier {tier}",
  ...
}
```

### Step 5: Test Mint

**Create profile:**

```bash
sui client call \
  --package PACKAGE_ID \
  --module player \
  --function create_profile \
  --args 0x6 \
  --gas-budget 10000000
```

**Claim faucet (need to wait or modify faucet_last_claim first):**

```bash
sui client call \
  --package PACKAGE_ID \
  --module game \
  --function claim_faucet \
  --args PROFILE_OBJECT_ID 0x6 \
  --gas-budget 10000000
```

**Mint NFT:**

```bash
sui client call \
  --package PACKAGE_ID \
  --module game \
  --function craft_roll \
  --args PROFILE_OBJECT_ID 0x6 10 0 0 \
  --gas-budget 10000000
```

### Step 6: Verify NFT in Wallet

1. Open Sui Wallet
2. Go to NFTs tab
3. Should see "Cuộn Chun Đồng" with image!

✅ If you see image + metadata → **Display Protocol works!**
❌ If you see only Object ID → Check Display setup

---

## 📝 Post-Deployment

### Update Frontend Config

**File: `frontend/src/config/constants.ts`**

```typescript
export const PACKAGE_ID = "0xYOUR_PACKAGE_ID_HERE";
export const CLOCK_ID = "0x6"; // Sui Clock object

export const MODULES = {
  PLAYER: "player",
  GAME: "game",
  CHUN_ROLL: "chun_roll",
  ACHIEVEMENT: "achievement",
};
```

### Document Deployed Contract

Create `contract/deployed.json`:

```json
{
  "network": "testnet",
  "packageId": "0x...",
  "modules": {
    "player": "player",
    "game": "game",
    "chun_roll": "chun_roll",
    "achievement": "achievement"
  },
  "displayObjects": {
    "chunRoll": "0x...",
    "achievement": "0x..."
  },
  "deployedAt": "2026-02-02T10:30:00Z",
  "deployer": "0x..."
}
```

---

## 🧪 Testing Checklist

### Manual Tests

- [ ] Create profile → Success
- [ ] Create profile again → Should fail (already exists)
- [ ] Claim faucet → Receive random chuns
- [ ] Claim faucet immediately → Should fail (cooldown)
- [ ] Record session with valid delta → Success
- [ ] Record session with too large delta → Should fail
- [ ] Craft roll with 10+ points → Receive NFT
- [ ] Craft roll with < 10 points → Should fail
- [ ] Craft roll without enough chun → Should fail
- [ ] Claim achievement with enough streak → Success
- [ ] Claim achievement without streak → Should fail
- [ ] Claim same achievement twice → Should fail

### NFT Display Tests

- [ ] ChunRoll NFT shows image in wallet
- [ ] ChunRoll NFT shows correct tier
- [ ] Achievement NFT shows image in wallet
- [ ] Achievement NFT shows correct title
- [ ] Achievement NFT cannot be transferred

---

## 🐛 Common Issues & Solutions

### Issue: "Module not found"

**Solution:** Check package ID is correct, rebuild and republish

### Issue: "Insufficient gas"

**Solution:** Increase gas budget to 100000000

### Issue: NFT doesn't show image

**Solution:**

1. Check Display Protocol is deployed
2. Verify image URLs are accessible
3. Test URL in browser

### Issue: "Object does not exist"

**Solution:**

1. Check object ID is correct
2. Make sure object wasn't deleted
3. Refresh wallet

### Issue: Random always same value

**Solution:** This is expected in testnet. Use epoch + object ID for better randomness

---

## 📊 Mainnet Deployment (After Hackathon)

### Additional Steps:

1. Security audit
2. Optimize gas usage
3. Implement backend validator
4. Setup monitoring
5. Prepare upgrade mechanism
6. Test thoroughly on testnet

### Mainnet Checklist:

- [ ] Audit completed
- [ ] All tests passing
- [ ] Gas optimized
- [ ] Images on IPFS/Arweave
- [ ] Documentation complete
- [ ] Frontend tested
- [ ] Monitoring setup
- [ ] Emergency pause mechanism

---

## 🎉 Success Criteria

✅ Contract deployed successfully
✅ Display Protocol working
✅ NFTs show images in wallet
✅ All game mechanics working
✅ No critical bugs
✅ Gas costs reasonable
✅ Ready for hackathon demo!

---

## 📞 Support

If stuck, check:

1. Sui Discord: https://discord.gg/sui
2. Sui Docs: https://docs.sui.io
3. Examples: https://github.com/MystenLabs/sui/tree/main/examples

Good luck! 🚀
