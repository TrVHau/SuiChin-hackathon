import { bcs } from "@mysten/sui/bcs";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64, normalizeSuiAddress } from "@mysten/sui/utils";
import { env } from "../../config/env";
import { logger } from "../../shared/logger";
import { suiClient } from "../../infra/chain/sui-client";

const SETTLEMENT_INTENT_SCOPE = 1;

const SettlementMessageBcs = bcs.struct("SettlementMessage", {
  intent_scope: bcs.u8(),
  chain_id: bcs.u8(),
  package_id: bcs.Address,
  room_id: bcs.Address,
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
  nonce: number;
  deadlineMs: number;
  signature: number[];
  signerPubkey: number[];
}

interface ParsedRoomData {
  nonce: number;
  signerPubkey: number[];
}

interface ParsedLobbyConfig {
  chainId: number;
  packageId: string;
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
    logger.warn(
      "Missing LOBBY_SIGNER_SECRET_KEY/ADMIN_SECRET_KEY. Using ephemeral settlement keypair.",
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
    logger.warn(
      `Failed to initialize settlement keypair from configured secret. Using ephemeral keypair instead. Reason: ${message}`,
    );
    return new Ed25519Keypair();
  }
}

async function getRoomData(roomId: string): Promise<ParsedRoomData> {
  const roomObject = await suiClient.getObject({
    id: roomId,
    options: { showContent: true },
  });

  const fields = (
    roomObject.data?.content as { fields?: Record<string, unknown> } | undefined
  )?.fields;
  if (!fields) {
    throw new Error("Room fields not found");
  }

  const nonce = Number(fields.nonce ?? 0);
  const signerPubkey = collectByteVectors(fields.signer_pubkey)[0] ?? [];
  if (!Number.isFinite(nonce)) {
    throw new Error("Invalid room nonce");
  }
  if (signerPubkey.length === 0) {
    throw new Error("Room signer pubkey not found");
  }

  return { nonce, signerPubkey };
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
  const packageFromType = content?.type?.split("::")?.[0] ?? "";
  const packageId = normalizeSuiAddress(
    packageFromType || env.LOBBY_PACKAGE_ID || "",
  );

  if (!Number.isFinite(chainId)) {
    throw new Error("Invalid LobbyConfig chain_id");
  }
  if (!packageId) {
    throw new Error("Missing package id for settlement message");
  }

  if (
    env.LOBBY_PACKAGE_ID &&
    packageFromType &&
    normalizeSuiAddress(env.LOBBY_PACKAGE_ID) !== packageId
  ) {
    logger.warn(
      {
        configObjectId: env.LOBBY_CONFIG_OBJECT_ID,
        envPackageId: env.LOBBY_PACKAGE_ID,
        onChainPackageId: packageId,
      },
      "Lobby package ID drift detected; using on-chain config package ID for settlement signing",
    );
  }

  return { chainId, packageId };
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
    const deadlineMs = nowMs + env.LOBBY_SETTLEMENT_TTL_MS;
    const messageBytes = SettlementMessageBcs.serialize({
      intent_scope: SETTLEMENT_INTENT_SCOPE,
      chain_id: config.chainId,
      package_id: config.packageId,
      room_id: normalizeSuiAddress(input.roomId),
      winner: normalizeSuiAddress(input.winner),
      loser: normalizeSuiAddress(input.loser),
      match_digest: input.matchDigest,
      nonce: String(room.nonce),
      deadline_ms: String(deadlineMs),
    }).toBytes();

    const signatureBytes = await this.keypair.sign(messageBytes);
    const signerPubkey = Array.from(this.keypair.getPublicKey().toRawBytes());

    const roomSignerMatches =
      signerPubkey.length === room.signerPubkey.length &&
      signerPubkey.every((byte, index) => byte === room.signerPubkey[index]);
    if (!roomSignerMatches) {
      throw new Error(
        "Backend signer public key does not match signer_pubkey configured for this room",
      );
    }

    return {
      roomId: normalizeSuiAddress(input.roomId),
      winner: normalizeSuiAddress(input.winner),
      loser: normalizeSuiAddress(input.loser),
      matchDigest: input.matchDigest,
      nonce: room.nonce,
      deadlineMs,
      signature: Array.from(signatureBytes),
      signerPubkey,
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
