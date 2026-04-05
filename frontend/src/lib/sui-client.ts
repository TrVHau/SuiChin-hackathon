import { Transaction } from "@mysten/sui/transactions";
import {
  PACKAGE_ID,
  MODULES,
  CLOCK_OBJECT_ID,
  CRAFT_POOL_CONTRIBUTION_MIST,
} from "@/config/sui.config";

export function buildInitProfileTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.PLAYER_PROFILE}::init_profile`,
  });
  return tx;
}


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

export function buildLockForMatchTx(profileId: string, amount: number): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.PLAYER_PROFILE}::lock_for_match`,
    arguments: [tx.object(profileId), tx.pure.u64(amount)],
  });
  return tx;
}


export function buildCraftChunTx(
  profileId: string,
  treasuryId: string,
): Transaction {
  const tx = new Transaction();
  const [paymentCoin] = tx.splitCoins(tx.gas, [CRAFT_POOL_CONTRIBUTION_MIST]);
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

export function buildRedeemChunTx(
  treasuryId: string,
  nftId: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.CRAFT}::redeem_chun`,
    arguments: [tx.object(treasuryId), tx.object(nftId)],
  });
  return tx;
}


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

