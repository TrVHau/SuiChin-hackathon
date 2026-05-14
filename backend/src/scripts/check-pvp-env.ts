import fs from "node:fs";
import path from "node:path";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64, normalizeSuiAddress } from "@mysten/sui/utils";
import { env } from "../config/env.js";
import { suiClient } from "../infra/chain/sui-client.js";

type ObjectContent = {
  type?: string;
  fields?: Record<string, unknown>;
};

function parseEd25519Keypair(secretKeyValue: string): Ed25519Keypair {
  if (!secretKeyValue) {
    throw new Error("Missing signer secret key");
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

function tryNormalizeAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return normalizeSuiAddress(value);
  } catch {
    return null;
  }
}

function collectByteVectors(value: unknown): number[][] {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((item) => typeof item === "number")) {
      return [value as number[]];
    }
    return value.flatMap((item) => collectByteVectors(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("fields" in record) return collectByteVectors(record.fields);
    if ("value" in record) return collectByteVectors(record.value);
    if ("vec" in record) return collectByteVectors(record.vec);
    return Object.values(record).flatMap((item) => collectByteVectors(item));
  }

  return [];
}

function readFrontendEnv(): Record<string, string> {
  const filePath = path.resolve(process.cwd(), "..", "frontend", ".env");
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return acc;
      const equalsAt = trimmed.indexOf("=");
      if (equalsAt <= 0) return acc;
      acc[trimmed.slice(0, equalsAt)] = trimmed.slice(equalsAt + 1);
      return acc;
    }, {});
}

function sameBytes(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

async function getObjectContent(objectId: string): Promise<ObjectContent> {
  const object = await suiClient.getObject({
    id: objectId,
    options: { showContent: true, showType: true },
  });

  const content = object.data?.content as ObjectContent | undefined;
  if (!content?.fields) {
    throw new Error(`Object not found or has no fields: ${objectId}`);
  }
  return content;
}

function printCheck(label: string, ok: boolean, details?: string): void {
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${details ? `: ${details}` : ""}`);
}

async function main() {
  const packageId = tryNormalizeAddress(env.LOBBY_PACKAGE_ID || env.SUI_PACKAGE_ID);
  const configId = tryNormalizeAddress(env.LOBBY_CONFIG_OBJECT_ID);
  const signerSecret = env.LOBBY_SIGNER_SECRET_KEY || env.ADMIN_SECRET_KEY;

  if (!packageId) throw new Error("Missing LOBBY_PACKAGE_ID/SUI_PACKAGE_ID");
  if (!configId) throw new Error("Missing LOBBY_CONFIG_OBJECT_ID");
  if (!signerSecret) throw new Error("Missing LOBBY_SIGNER_SECRET_KEY/ADMIN_SECRET_KEY");

  const frontendEnv = readFrontendEnv();
  const signerKeypair = parseEd25519Keypair(signerSecret);
  const signerPubkey = Array.from(signerKeypair.getPublicKey().toRawBytes());
  const signerPubkeyB64 = Buffer.from(signerPubkey).toString("base64");
  const signerAddress = signerKeypair.toSuiAddress();

  const configContent = await getObjectContent(configId);
  const configPackageId = tryNormalizeAddress(configContent.type?.split("::")?.[0]);
  const configFields = configContent.fields ?? {};
  const activeSigners = collectByteVectors(configFields.active_signer_pubkeys);
  const signerIsActive = activeSigners.some((activeSigner) => sameBytes(activeSigner, signerPubkey));

  const frontendPackageId = tryNormalizeAddress(frontendEnv.VITE_LOBBY_PACKAGE_ID);
  const frontendConfigId = tryNormalizeAddress(frontendEnv.VITE_LOBBY_CONFIG_OBJECT_ID);
  const frontendSignerPubkey = frontendEnv.VITE_LOBBY_SIGNER_PUBKEY;

  console.log("PvP env/contract check");
  console.log(`Network: ${env.SUI_NETWORK}`);
  console.log(`Backend signer address: ${signerAddress}`);
  console.log(`Backend signer pubkey base64: ${signerPubkeyB64}`);
  console.log(`LobbyConfig type: ${configContent.type}`);
  console.log(`LobbyConfig chain_id: ${String(configFields.chain_id ?? "unknown")}`);
  console.log(`Active signer count: ${activeSigners.length}`);

  printCheck("Backend LOBBY_PACKAGE_ID matches LobbyConfig package", packageId === configPackageId);
  printCheck("Backend signer pubkey is active on LobbyConfig", signerIsActive);
  printCheck(
    "Frontend VITE_LOBBY_PACKAGE_ID matches backend",
    !frontendPackageId || frontendPackageId === packageId,
    frontendPackageId ? undefined : "frontend .env not found or key missing",
  );
  printCheck(
    "Frontend VITE_LOBBY_CONFIG_OBJECT_ID matches backend",
    !frontendConfigId || frontendConfigId === configId,
    frontendConfigId ? undefined : "frontend .env not found or key missing",
  );
  printCheck(
    "Frontend VITE_LOBBY_SIGNER_PUBKEY matches backend signer",
    !frontendSignerPubkey || frontendSignerPubkey === signerPubkeyB64,
    frontendSignerPubkey ? undefined : "frontend .env key missing",
  );

  if (env.ADMIN_SECRET_KEY) {
    const adminKeypair = parseEd25519Keypair(env.ADMIN_SECRET_KEY);
    const adminCapType = `${packageId}::nft_valuation_lobby_config::LobbyAdminCap`;
    const caps = await suiClient.getOwnedObjects({
      owner: adminKeypair.toSuiAddress(),
      filter: { StructType: adminCapType },
      options: { showType: true },
    });
    printCheck(
      "ADMIN_SECRET_KEY wallet holds LobbyAdminCap for this package",
      Boolean(caps.data?.[0]?.data?.objectId),
      `admin=${adminKeypair.toSuiAddress()}`,
    );
  }

  const roomId = tryNormalizeAddress(process.argv[2]);
  if (roomId) {
    const roomContent = await getObjectContent(roomId);
    const roomFields = roomContent.fields ?? {};
    const roomPackageId = tryNormalizeAddress(roomContent.type?.split("::")?.[0]);
    const roomSigner = collectByteVectors(roomFields.signer_pubkey)[0] ?? [];
    const status = Number(roomFields.status ?? -1);
    console.log("");
    console.log(`Room check: ${roomId}`);
    console.log(`Room type: ${roomContent.type}`);
    console.log(`Room status: ${status} (0 WAITING, 1 ACTIVE, 2 SETTLED, 3 CANCELLED, 4 REFUNDED)`);
    console.log(`Room nonce: ${String(roomFields.nonce ?? "unknown")}`);
    printCheck("Room package matches backend", roomPackageId === packageId);
    printCheck("Room signer matches backend signer", sameBytes(roomSigner, signerPubkey));
    printCheck("Room is ACTIVE and settle-able", status === 1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
