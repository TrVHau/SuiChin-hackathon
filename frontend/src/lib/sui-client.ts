import { Transaction } from "@mysten/sui/transactions";
import {
  PACKAGE_ID,
  MODULES,
  CLOCK_OBJECT_ID,
  CRAFT_FEE_MIST,
} from "@/config/sui.config";

// â”€â”€â”€ player_profile module â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Táº¡o PlayerProfile cho sender. Gá»i 1 láº§n khi connect vÃ­ láº§n Ä‘áº§u. */
export function buildInitProfileTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.PLAYER_PROFILE}::init_profile`,
  });
  return tx;
}

/**
 * Cáº­p nháº­t chun_raw + stats sau má»—i vÃ¡n.
 * - Tháº¯ng: delta = min(1 + streak, 20), isWin = true
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

/** Claim faucet chun_raw. Cáº§n Clock object. */
export function buildClaimFaucetTx(
  profileId: string,
  functionName: string = "claim_faucet",
  moduleName: string = MODULES.PLAYER_PROFILE,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${moduleName}::${functionName}`,
    arguments: [tx.object(profileId), tx.object(CLOCK_OBJECT_ID)],
  });
  return tx;
}

/** Lock `amount` chun_raw vÃ o staked_chun trÆ°á»›c PvP match. */
export function buildLockForMatchTx(profileId: string, amount: number): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.PLAYER_PROFILE}::lock_for_match`,
    arguments: [tx.object(profileId), tx.pure.u64(amount)],
  });
  return tx;
}

// â”€â”€â”€ craft module â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Craft má»™t CuonChunNFT.
 * YÃªu cáº§u: profile.chun_raw >= 10 vÃ  vÃ­ cÃ³ Ä‘á»§ SUI.
 * Tá»± split 0.1 SUI (100_000_000 MIST) tá»« gas coin Ä‘á»ƒ tráº£ phÃ­.
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

// â”€â”€â”€ trade_up module â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Trade-up 8 Bronze NFT â†’ Silver (70%) hoáº·c Scrap (30%).
 * Táº¥t cáº£ input NFT bá»‹ burn báº¥t ká»ƒ káº¿t quáº£.
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
 * Trade-up 6 Silver NFT â†’ Gold (55%) hoáº·c Scrap (45%).
 * Táº¥t cáº£ input NFT bá»‹ burn báº¥t ká»ƒ káº¿t quáº£.
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

// â”€â”€â”€ marketplace module â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * List má»™t CuonChunNFT lÃªn Market.
 * NFT sáº½ bá»‹ lock vÃ o Market object cho Ä‘áº¿n khi buy hoáº·c cancel.
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
 * Mua má»™t NFT Ä‘ang Ä‘Æ°á»£c list.
 * Tá»± split Ä‘Ãºng sá»‘ SUI theo giÃ¡ listing tá»« gas coin.
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
 * Há»§y listing â€” chá»‰ seller má»›i gá»i Ä‘Æ°á»£c.
 * NFT sáº½ Ä‘Æ°á»£c tráº£ vá» seller.
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

// â”€â”€â”€ achievement module â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Claim Achievement Badge khi streak Ä‘áº¡t milestone {1, 5, 18, 36, 67}.
 * Badge lÃ  Soulbound â€” khÃ´ng thá»ƒ chuyá»ƒn nhÆ°á»£ng sau khi claim.
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

