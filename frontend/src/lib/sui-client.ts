import { Transaction } from "@mysten/sui/transactions";
import {
  PACKAGE_ID,
  MODULES,
  CLOCK_OBJECT_ID,
  CRAFT_POOL_CONTRIBUTION_MIST,
  CRAFT_CONFIG_OBJECT_ID,
  LOBBY_CONFIG_OBJECT_ID,
  LOBBY_PACKAGE_ID,
  LOBBY_SIGNER_PUBKEY,
  RANDOM_OBJECT_ID,
} from "@/config/sui.config";

function textToBytes(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

function base64ToBytes(value: string): number[] {
  if (!value) return [];
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return Array.from(bytes);
}

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

export function buildLockForMatchTx(
  profileId: string,
  amount: number,
): Transaction {
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

export function buildCraftChunWithRandomnessTx(
  profileId: string,
  treasuryId: string,
): Transaction {
  const tx = new Transaction();
  const [paymentCoin] = tx.splitCoins(tx.gas, [CRAFT_POOL_CONTRIBUTION_MIST]);
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.CRAFT}::craft_chun_with_randomness`,
    arguments: [
      tx.object(profileId),
      tx.object(treasuryId),
      tx.object(CRAFT_CONFIG_OBJECT_ID),
      paymentCoin,
      tx.object(RANDOM_OBJECT_ID),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

export function buildBurnNftForChunTx(
  profileId: string,
  nftId: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.CRAFT}::burn_nft_for_chun`,
    arguments: [
      tx.object(profileId),
      tx.object(CRAFT_CONFIG_OBJECT_ID),
      tx.object(nftId),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

export function buildRecycleScrapForChunTx(
  profileId: string,
  scrapId: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.CRAFT}::recycle_scrap_for_chun`,
    arguments: [
      tx.object(profileId),
      tx.object(CRAFT_CONFIG_OBJECT_ID),
      tx.object(scrapId),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

export function buildFuseScrapsForBronzeTx(scrapIds: string[]): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.CRAFT}::fuse_scraps_for_bronze`,
    arguments: [
      tx.object(CRAFT_CONFIG_OBJECT_ID),
      tx.makeMoveVec({ elements: scrapIds.map((id) => tx.object(id)) }),
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

export function buildCreateValuationLobbyRoomTx(input: {
  nftIds: string[];
  targetPoints: number;
  coinMist: bigint;
  deadlineMs: bigint;
  signerPubkey?: string | number[];
}): Transaction {
  const tx = new Transaction();
  const [coinInput] = tx.splitCoins(tx.gas, [input.coinMist]);
  const signerPubkeyBytes = Array.isArray(input.signerPubkey)
    ? input.signerPubkey
    : textToBytes(input.signerPubkey ?? LOBBY_SIGNER_PUBKEY);

  tx.moveCall({
    target: `${LOBBY_PACKAGE_ID}::nft_valuation_lobby::create_room_with_deposit`,
    arguments: [
      tx.object(LOBBY_CONFIG_OBJECT_ID),
      tx.pure.u64(input.targetPoints),
      tx.makeMoveVec({ elements: input.nftIds.map((id) => tx.object(id)) }),
      coinInput,
      tx.pure.vector("u8", signerPubkeyBytes),
      tx.pure.u64(input.deadlineMs),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildJoinValuationLobbyRoomTx(input: {
  roomId: string;
  nftIds: string[];
  coinMist: bigint;
}): Transaction {
  const tx = new Transaction();
  const [coinInput] = tx.splitCoins(tx.gas, [input.coinMist]);

  tx.moveCall({
    target: `${LOBBY_PACKAGE_ID}::nft_valuation_lobby::join_room_with_deposit`,
    arguments: [
      tx.object(LOBBY_CONFIG_OBJECT_ID),
      tx.object(input.roomId),
      tx.makeMoveVec({ elements: input.nftIds.map((id) => tx.object(id)) }),
      coinInput,
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildCancelValuationLobbyRoomTx(roomId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${LOBBY_PACKAGE_ID}::nft_valuation_lobby::cancel_waiting_room`,
    arguments: [
      tx.object(LOBBY_CONFIG_OBJECT_ID),
      tx.object(roomId),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

export function buildAddValuationLobbySignerTx(input: {
  adminCapId: string;
  signerPubkey: string | number[];
}): Transaction {
  const tx = new Transaction();
  const signerPubkeyBytes = Array.isArray(input.signerPubkey)
    ? input.signerPubkey
    : textToBytes(input.signerPubkey);

  tx.moveCall({
    target: `${LOBBY_PACKAGE_ID}::nft_valuation_lobby::add_signer_pubkey`,
    arguments: [
      tx.object(LOBBY_CONFIG_OBJECT_ID),
      tx.object(input.adminCapId),
      tx.pure.vector("u8", signerPubkeyBytes),
    ],
  });

  return tx;
}

export function base64SignatureToBytes(signatureBytes: string): number[] {
  return base64ToBytes(signatureBytes);
}
