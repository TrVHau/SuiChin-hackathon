import { bcs } from "@mysten/sui/bcs";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64, normalizeSuiAddress } from "@mysten/sui/utils";
import { env } from "../../config/env.js";
import { logger } from "../../shared/logger.js";
import { suiClient } from "../../infra/chain/sui-client.js";

const SETTLEMENT_INTENT_SCOPE = 1;

const ObjectIdBcs = bcs.struct("ID", {
  bytes: bcs.Address,
});

const SettlementMessageBcs = bcs.struct("SettlementMessage", {
  intent_scope: bcs.u8(),
  chain_id: bcs.u8(),
  package_id: bcs.Address,
  room_id: ObjectIdBcs,
  winner: bcs.Address,
  loser: bcs.Address,
  match_digest: bcs.vector(bcs.u8()),
  nonce: bcs.u64(),
  deadline_ms: bcs.u64(),
});

export interface SettlementPayload {
  roomId: string;
  winner: string;
  loser: string;
  matchDigest: number[];
  nonce: string;
  deadlineMs: string;
  signature: number[];
  signerPubkey: number[];
  packageId: string;
  debugMessageB64?: string;
  debugSignatureB64?: string;
  debugMessage?: {
    intent_scope: number;
    chain_id: number;
    package_id: string;
    room_id: string;
    winner: string;
    loser: string;
    match_digest_hex: string;
    nonce: string;
    deadline_ms: string;
  };
  fallbackPayloads?: SettlementPayload[];
}

interface ParsedRoomData {
  nonce: string;
  signerPubkey: number[];
  packageId: string;
}

interface ParsedLobbyConfig {
  chainId: number;
  packageId: string | null;
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

function parseEd25519Keypair(secretKeyValue: string): Ed25519Keypair {
  if (!secretKeyValue) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "LOBBY_SIGNER_SECRET_KEY/ADMIN_SECRET_KEY is required in production but missing or empty",
      );
    }
    logger.warn(
      "Missing LOBBY_SIGNER_SECRET_KEY/ADMIN_SECRET_KEY in development. Using ephemeral settlement keypair.",
    );
    return new Ed25519Keypair();
  }

  try {
    if (secretKeyValue.startsWith("suiprivkey")) {
      const decoded = decodeSuiPrivateKey(secretKeyValue);
      if (decoded.scheme !== "ED25519") {
        throw new Error(`Expected ED25519 key, got ${decoded.scheme}`);
      }
      return Ed25519Keypair.fromSecretKey(decoded.secretKey);
    }

    const raw = fromBase64(secretKeyValue);
    const normalized =
      raw.length === 33 && raw[0] === 0x00 ? raw.slice(1) : raw;
    return Ed25519Keypair.fromSecretKey(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (env.NODE_ENV === "production") {
      throw new Error(
        `Failed to initialize settlement keypair from configured secret. Reason: ${message}`,
      );
    }
    logger.warn(
      `Failed to initialize settlement keypair from configured secret in development. Using ephemeral keypair instead. Reason: ${message}`,
    );
    return new Ed25519Keypair();
  }
}

async function getRoomData(roomId: string): Promise<ParsedRoomData> {
  const roomObject = await suiClient.getObject({
    id: roomId,
    options: { showContent: true },
  });

  const content = roomObject.data?.content as
    | { type?: string; fields?: Record<string, unknown> }
    | undefined;
  const fields = content?.fields;
  if (!fields) {
    throw new Error("Room fields not found");
  }

  const nonceValue = fields.nonce;
  const nonce = String(nonceValue ?? "0");
  if (!/^\d+$/.test(nonce)) {
    throw new Error("Invalid room nonce: must be numeric string");
  }

  const signerPubkey = collectByteVectors(fields.signer_pubkey)[0] ?? [];
  const roomPackageFromType = tryNormalizeAddress(
    content?.type?.split("::")?.[0] ?? null,
  );
  const envPackageId = tryNormalizeAddress(env.LOBBY_PACKAGE_ID);
  const packageId = roomPackageFromType ?? envPackageId;
  if (signerPubkey.length === 0) {
    throw new Error("Room signer pubkey not found");
  }
  if (!packageId) {
    throw new Error("Room package id not found");
  }
  if (envPackageId && packageId !== envPackageId) {
    logger.warn(
      {
        roomId,
        envPackageId,
        roomPackageId: packageId,
      },
      "Room package differs from env package; signing with room package id",
    );
  }

  return { nonce, signerPubkey, packageId };
}

async function getLobbyConfig(): Promise<ParsedLobbyConfig> {
  if (!env.LOBBY_CONFIG_OBJECT_ID) {
    throw new Error("Missing LOBBY_CONFIG_OBJECT_ID");
  }

  const configObject = await suiClient.getObject({
    id: env.LOBBY_CONFIG_OBJECT_ID,
    options: { showContent: true },
  });

  const content = configObject.data?.content as
    | { type?: string; fields?: Record<string, unknown> }
    | undefined;
  const fields = content?.fields;
  if (!fields) {
    throw new Error("LobbyConfig fields not found");
  }

  const chainId = Number(fields.chain_id ?? 0);

  if (!Number.isFinite(chainId)) {
    throw new Error("Invalid LobbyConfig chain_id");
  }

  return {
    chainId,
    packageId: tryNormalizeAddress(content?.type?.split("::")?.[0] ?? null),
  };
}

function uniquePackageIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter(Boolean) as string[])];
}

export class SettlementPayloadService {
  private keypair: Ed25519Keypair;

  constructor() {
    const signerSecret = env.LOBBY_SIGNER_SECRET_KEY ?? env.ADMIN_SECRET_KEY;
    this.keypair = parseEd25519Keypair(signerSecret);
  }

  async buildPayload(input: {
    roomId: string;
    winner: string;
    loser: string;
    matchDigest: number[];
  }): Promise<SettlementPayload> {
    const [room, config] = await Promise.all([
      getRoomData(input.roomId),
      getLobbyConfig(),
    ]);

    const nowMs = Date.now();
    const deadlineMs = String(nowMs + env.LOBBY_SETTLEMENT_TTL_MS);
    const signerPubkey = Array.from(this.keypair.getPublicKey().toRawBytes());
    const roomSignerMatches =
      signerPubkey.length === room.signerPubkey.length &&
      signerPubkey.every((byte, index) => byte === room.signerPubkey[index]);
    if (!roomSignerMatches) {
      const signerPubkeyHex = Buffer.from(signerPubkey).toString("hex");
      const roomSignerHex = Buffer.from(room.signerPubkey).toString("hex");
      logger.error(
        {
          roomId: input.roomId,
          signerPubkeyHex,
          roomSignerHex,
        },
        "Backend signer public key does not match signer_pubkey configured for this room",
      );
      throw new Error(
        "Backend signer public key does not match signer_pubkey configured for this room",
      );
    }

    const roomId = normalizeSuiAddress(input.roomId);
    const winner = normalizeSuiAddress(input.winner);
    const loser = normalizeSuiAddress(input.loser);
    
    // Use the package ID that Move contract uses for verification (@suichin)
    // This MUST match the hardcoded @suichin in build_settlement_message()
    const movePackageId = normalizeSuiAddress(
      "0xb40ef16e8d1dd5a885ac25436bcf14b19a956fb05c575863b5cc21bfa2230525",
    );

    const buildForPackage = async (packageId: string): Promise<SettlementPayload> => {
      const messageBytes = SettlementMessageBcs.serialize({
        intent_scope: SETTLEMENT_INTENT_SCOPE,
        chain_id: config.chainId,
        package_id: packageId,
        room_id: { bytes: roomId },
        winner,
        loser,
        match_digest: input.matchDigest,
        nonce: room.nonce,
        deadline_ms: deadlineMs,
      }).toBytes();
      const signatureBytes = await this.keypair.sign(messageBytes);

      const debugMessage = {
        intent_scope: SETTLEMENT_INTENT_SCOPE,
        chain_id: config.chainId,
        package_id: packageId,
        room_id: roomId,
        winner,
        loser,
        match_digest_hex: Buffer.from(input.matchDigest).toString("hex"),
        nonce: room.nonce,
        deadline_ms: deadlineMs,
      };

      logger.info(
        {
          roomId: input.roomId,
          winner,
          loser,
          packageId,
          chainId: config.chainId,
          nonce: room.nonce,
          deadlineMs,
          matchDigestHex: Buffer.from(input.matchDigest).toString("hex"),
          signerPubkeyHex: Buffer.from(signerPubkey).toString("hex"),
          messageHex: Buffer.from(messageBytes).toString("hex"),
          signatureHex: Buffer.from(signatureBytes).toString("hex"),
        },
        "Settlement payload signing complete",
      );

      return {
        roomId,
        winner,
        loser,
        matchDigest: input.matchDigest,
        nonce: room.nonce,
        deadlineMs,
        signature: Array.from(signatureBytes),
        signerPubkey,
        packageId,
        debugMessageB64: Buffer.from(messageBytes).toString("base64"),
        debugSignatureB64: Buffer.from(signatureBytes).toString("base64"),
        debugMessage,
      };
    };

    // Always use the Move contract's hardcoded package ID for signing
    const primaryPayload = await buildForPackage(movePackageId);
    
    // Create fallback payloads with other package IDs only if they differ from primary
    const fallbackPackageIds = uniquePackageIds([
      room.packageId,
      config.packageId,
    ]).filter(pid => pid !== movePackageId);
    
    const fallbackPayloads = await Promise.all(
      fallbackPackageIds.map((packageId) => buildForPackage(packageId)),
    );

    logger.info(
      {
        primaryPackageId: movePackageId,
        fallbackCount: fallbackPackageIds.length,
      },
      "Settlement payload with fallbacks built",
    );

    return {
      ...primaryPayload,
      fallbackPayloads: fallbackPayloads.length > 0 ? fallbackPayloads : undefined,
    };
  }
}

let settlementPayloadServiceInstance: SettlementPayloadService | null = null;

export function getSettlementPayloadService(): SettlementPayloadService {
  if (!settlementPayloadServiceInstance) {
    settlementPayloadServiceInstance = new SettlementPayloadService();
  }
  return settlementPayloadServiceInstance;
}
