import { Transaction } from "@mysten/sui/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";
import { env } from "../config/env.js";
import { suiClient } from "../infra/chain/sui-client.js";

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

  if (!env.ADMIN_SECRET_KEY) {
    throw new Error("ADMIN_SECRET_KEY is required because the admin wallet must hold LobbyAdminCap");
  }
  if (!env.LOBBY_SIGNER_SECRET_KEY) {
    throw new Error("LOBBY_SIGNER_SECRET_KEY is required because its public key is registered on LobbyConfig");
  }

  const adminKeypair = parseEd25519Keypair(env.ADMIN_SECRET_KEY);
  const settlementKeypair = parseEd25519Keypair(env.LOBBY_SIGNER_SECRET_KEY);
  const signerPubkey = Array.from(settlementKeypair.getPublicKey().toRawBytes());

  const ownedCaps = await suiClient.getOwnedObjects({
    owner: adminKeypair.toSuiAddress(),
    filter: { StructType: LOBBY_ADMIN_CAP_TYPE },
    options: { showType: true },
  });

  const adminCapId = ownedCaps.data?.[0]?.data?.objectId;
  if (!adminCapId) {
    throw new Error(
      `No LobbyAdminCap found for ${adminKeypair.toSuiAddress()}. Make sure the admin wallet holds the cap.`,
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

  const response = await adminKeypair.signAndExecuteTransaction({
    transaction: tx,
    client: suiClient,
  });
  const txDigest =
    response.$kind === "Transaction"
      ? response.Transaction.digest
      : response.FailedTransaction?.digest ?? null;

  console.log(
    JSON.stringify(
      {
        ok: true,
        txDigest,
        adminCapId,
        adminAddress: adminKeypair.toSuiAddress(),
        signerAddress: settlementKeypair.toSuiAddress(),
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
