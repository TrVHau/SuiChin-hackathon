import { Transaction } from "@mysten/sui/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";
import { env } from "../config/env";
import { suiClient } from "../infra/chain/sui-client";

const packageId = env.LOBBY_PACKAGE_ID ?? env.SUI_PACKAGE_ID;
const LOBBY_ADMIN_CAP_TYPE = packageId
  ? `${packageId}::nft_valuation_lobby_config::LobbyAdminCap`
  : "";

function parseEd25519Keypair(secretKeyValue: string): Ed25519Keypair {
  if (!secretKeyValue) {
    throw new Error("Missing admin secret key");
  }

  if (secretKeyValue.startsWith("suiprivkey")) {
    const decoded = decodeSuiPrivateKey(secretKeyValue);
    if (decoded.scheme !== "ED25519") {
      throw new Error(`Expected ED25519 key, got ${decoded.scheme}`);
    }
    return Ed25519Keypair.fromSecretKey(decoded.secretKey);
  }

  const raw = fromBase64(secretKeyValue);
  const normalized = raw.length === 33 && raw[0] === 0x00 ? raw.slice(1) : raw;
  return Ed25519Keypair.fromSecretKey(normalized);
}

async function main() {
  if (!packageId) {
    throw new Error("LOBBY_PACKAGE_ID or SUI_PACKAGE_ID is required");
  }
  if (!env.LOBBY_CONFIG_OBJECT_ID) {
    throw new Error("LOBBY_CONFIG_OBJECT_ID is required");
  }

  if (!LOBBY_ADMIN_CAP_TYPE) {
    throw new Error("Unable to resolve LobbyAdminCap type");
  }

  const secretKey = env.LOBBY_SIGNER_SECRET_KEY ?? env.ADMIN_SECRET_KEY;
  const keypair = parseEd25519Keypair(secretKey);
  const signerPubkey = Array.from(keypair.getPublicKey().toRawBytes());

  const ownedCaps = await suiClient.getOwnedObjects({
    owner: keypair.toSuiAddress(),
    filter: { StructType: LOBBY_ADMIN_CAP_TYPE },
    options: { showType: true },
  });

  const adminCapId = ownedCaps.data?.[0]?.data?.objectId;
  if (!adminCapId) {
    throw new Error(
      `No LobbyAdminCap found for ${keypair.toSuiAddress()}. Make sure the admin wallet holds the cap.`,
    );
  }

  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::nft_valuation_lobby_config::add_signer_pubkey`,
    arguments: [
      tx.object(env.LOBBY_CONFIG_OBJECT_ID),
      tx.object(adminCapId),
      tx.pure.vector("u8", signerPubkey),
    ],
  });

  const txDigest = tx.getDigest();

  await keypair.signAndExecuteTransaction({
    transaction: tx,
    client: suiClient,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        txDigest,
        adminCapId,
        signerPubkey,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
