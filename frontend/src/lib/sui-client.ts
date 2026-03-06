import { Transaction } from "@mysten/sui/transactions";
import {
  PACKAGE_ID,
  MODULES,
  CLOCK_OBJECT_ID,
  CRAFT_FEE_MIST,
} from "@/config/sui.config";

// ─── player_profile module ────────────────────────────────────────────────────

/** Tạo PlayerProfile cho sender. Gọi 1 lần khi connect ví lần đầu. */
export function buildInitProfileTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.PLAYER_PROFILE}::init_profile`,
  });
  return tx;
}

/**
 * Cập nhật chun_raw + stats sau mỗi ván.
 * - Thắng: delta = min(1 + streak, 20), isWin = true
 * - Thua:  delta = 1, isWin = false
 */
export function buildReportResultTx(
  profileId: string,
  delta: number,
  isWin: boolean,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.PLAYER_PROFILE}::report_result`,
    arguments: [
      tx.object(profileId),
      tx.pure.u64(delta),
      tx.pure.bool(isWin),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

// ─── craft module ──────────────────────────────────────────────────────────────

/**
 * Craft một CuonChunNFT.
 * Yêu cầu: profile.chun_raw >= 10 và ví có đủ SUI.
 * Tự split 0.1 SUI (100_000_000 MIST) từ gas coin để trả phí.
 */
export function buildCraftChunTx(
  profileId: string,
  treasuryId: string,
): Transaction {
  const tx = new Transaction();
  const [paymentCoin] = tx.splitCoins(tx.gas, [CRAFT_FEE_MIST]);
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.CRAFT}::craft_chun`,
    arguments: [
      tx.object(profileId),
      tx.object(treasuryId),
      paymentCoin,
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

// ─── trade_up module ───────────────────────────────────────────────────────────

/**
 * Trade-up 8 Bronze NFT → Silver (70%) hoặc Scrap (30%).
 * Tất cả input NFT bị burn bất kể kết quả.
 */
export function buildTradeUpBronzeToSilverTx(nftIds: string[]): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.TRADE_UP}::trade_up_bronze_to_silver`,
    arguments: [
      tx.makeMoveVec({ elements: nftIds.map((id) => tx.object(id)) }),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/**
 * Trade-up 6 Silver NFT → Gold (55%) hoặc Scrap (45%).
 * Tất cả input NFT bị burn bất kể kết quả.
 */
export function buildTradeUpSilverToGoldTx(nftIds: string[]): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.TRADE_UP}::trade_up_silver_to_gold`,
    arguments: [
      tx.makeMoveVec({ elements: nftIds.map((id) => tx.object(id)) }),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

// ─── marketplace module ────────────────────────────────────────────────────────

/**
 * List một CuonChunNFT lên Market.
 * NFT sẽ bị lock vào Market object cho đến khi buy hoặc cancel.
 */
export function buildListNFTTx(
  marketId: string,
  nftId: string,
  price: bigint,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::list`,
    arguments: [
      tx.object(marketId),
      tx.object(nftId),
      tx.pure.u64(price),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/**
 * Mua một NFT đang được list.
 * Tự split đúng số SUI theo giá listing từ gas coin.
 */
export function buildBuyNFTTx(
  marketId: string,
  listingId: string,
  price: bigint,
): Transaction {
  const tx = new Transaction();
  const [paymentCoin] = tx.splitCoins(tx.gas, [price]);
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::buy`,
    arguments: [tx.object(marketId), tx.pure.id(listingId), paymentCoin],
  });
  return tx;
}

/**
 * Hủy listing — chỉ seller mới gọi được.
 * NFT sẽ được trả về seller.
 */
export function buildCancelListingTx(
  marketId: string,
  listingId: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::cancel`,
    arguments: [tx.object(marketId), tx.pure.id(listingId)],
  });
  return tx;
}

// ─── achievement module ────────────────────────────────────────────────────────

/**
 * Claim Achievement Badge khi streak đạt milestone {1, 5, 18, 36, 67}.
 * Badge là Soulbound — không thể chuyển nhượng sau khi claim.
 */
export function buildClaimBadgeTx(
  profileId: string,
  badgeType: number,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.ACHIEVEMENT}::claim_badge`,
    arguments: [
      tx.object(profileId),
      tx.pure.u64(badgeType),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}
