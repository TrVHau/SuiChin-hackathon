import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, MODULES, CLOCK_ID } from "@/config/sui.config";

export function buildCreateProfileTx(): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.PLAYER}::create_profile`,
    arguments: [tx.object(CLOCK_ID)],
  });

  return tx;
}

export function buildRecordSessionTx(
  profileId: string,
  deltaTier1: number,
  deltaTier2: number,
  deltaTier3: number,
  isTier1Positive: boolean,
  isTier2Positive: boolean,
  isTier3Positive: boolean,
  newMaxStreak: number,
  newCurrentStreak: number,
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.GAME}::record_session`,
    arguments: [
      tx.object(profileId),
      tx.object(CLOCK_ID),
      tx.pure.u64(deltaTier1),
      tx.pure.u64(deltaTier2),
      tx.pure.u64(deltaTier3),
      tx.pure.bool(isTier1Positive),
      tx.pure.bool(isTier2Positive),
      tx.pure.bool(isTier3Positive),
      tx.pure.u64(newMaxStreak),
      tx.pure.u64(newCurrentStreak),
    ],
  });

  return tx;
}

export function buildClaimFaucetTx(profileId: string): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.GAME}::claim_faucet`,
    arguments: [tx.object(profileId), tx.object(CLOCK_ID)],
  });

  return tx;
}

export function buildCraftRollTx(
  profileId: string,
  useTier1: number,
  useTier2: number,
  useTier3: number,
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.GAME}::craft_roll`,
    arguments: [
      tx.object(profileId),
      tx.object(CLOCK_ID),
      tx.pure.u64(useTier1),
      tx.pure.u64(useTier2),
      tx.pure.u64(useTier3),
    ],
  });

  return tx;
}

export function buildClaimAchievementTx(
  profileId: string,
  milestone: number,
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.ACHIEVEMENT}::claim_achievement`,
    arguments: [tx.object(profileId), tx.pure.u64(milestone)],
  });

  return tx;
}
