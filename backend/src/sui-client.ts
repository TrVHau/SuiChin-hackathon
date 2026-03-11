import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import * as dotenv from 'dotenv';

dotenv.config();

const network = (process.env.SUI_NETWORK ?? 'devnet') as 'devnet' | 'testnet' | 'mainnet';
const rpcUrl = process.env.SUI_RPC_URL ?? getFullnodeUrl(network);

export const suiClient = new SuiClient({ url: rpcUrl });

// Oracle keypair — holds MatchOracle object
function loadKeypair(): Ed25519Keypair {
  const hex = process.env.ORACLE_PRIVATE_KEY;
  if (!hex) throw new Error('ORACLE_PRIVATE_KEY env var not set');
  return Ed25519Keypair.fromSecretKey(Buffer.from(hex, 'hex'));
}

export const oracleKeypair = loadKeypair();

const PACKAGE_ID = process.env.PACKAGE_ID ?? '';
const MATCH_ORACLE_ID = process.env.MATCH_ORACLE_ID ?? '';

/**
 * Submit a resolve_match transaction on-chain.
 * Transfers `amount` staked chun from loser to winner.
 */
export async function resolveMatchOnChain(
  winnerProfileId: string,
  loserProfileId: string,
  amount: number,
): Promise<string> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::player_profile::resolve_match`,
    arguments: [
      tx.object(winnerProfileId),
      tx.object(loserProfileId),
      tx.pure.u64(amount),
      tx.object(MATCH_ORACLE_ID),
    ],
  });

  const result = await suiClient.signAndExecuteTransaction({
    signer: oracleKeypair,
    transaction: tx,
    options: { showEffects: true },
  });

  if (result.effects?.status.status !== 'success') {
    throw new Error(`resolve_match failed: ${JSON.stringify(result.effects?.status)}`);
  }

  return result.digest;
}

/**
 * Fetch the PlayerProfile object ID owned by a given address.
 * Returns null if no profile found.
 */
export async function getProfileId(ownerAddress: string): Promise<string | null> {
  const objects = await suiClient.getOwnedObjects({
    owner: ownerAddress,
    filter: { StructType: `${PACKAGE_ID}::player_profile::PlayerProfile` },
    options: { showType: true },
  });

  const obj = objects.data[0];
  return obj?.data?.objectId ?? null;
}
