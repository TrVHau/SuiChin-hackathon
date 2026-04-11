import { bcs } from "@mysten/sui/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";
import { env } from "../../config/env";
import { logger } from "../../shared/logger";

// BCS struct strictly matching the Move SettleEvent
const SettleMatchPayloadBcs = bcs.struct("SettleMatchPayload", {
  room_id: bcs.Address,
  winner: bcs.Address,
  loser: bcs.Address,
  nonce: bcs.u64(),
});

export class CryptoService {
  private keypair: Ed25519Keypair;

  constructor() {
    this.keypair = this.initializeKeypair();
  }

  private initializeKeypair(): Ed25519Keypair {
    const secretKey = env.ADMIN_SECRET_KEY; // Managed by config/env.ts with Zod
    if (!secretKey) {
      logger.warn(
        "ADMIN_SECRET_KEY is missing. Falling back to ephemeral keypair for this process.",
      );
      return new Ed25519Keypair();
    }

    try {
      // Assuming the key is provided in raw bech32/base64 string based on Sui CLI export
      // Many times Sui's CLI gives keys starting with `suiprivkey...` or raw base64.
      // If it's pure Base64 for the 32 byte secret:
      const raw = fromBase64(secretKey);

      // Usually Sui exported keys are 33 bytes (flag + 32 bytes secret)
      let secretBytes = raw;
      if (raw.length === 33 && raw[0] === 0x00) {
        secretBytes = raw.slice(1);
      }

      return Ed25519Keypair.fromSecretKey(secretBytes);
    } catch (e: any) {
      logger.warn(
        `Failed to initialize Ed25519Keypair from ADMIN_SECRET_KEY. Using ephemeral keypair instead. Reason: ${e.message}`,
      );
      return new Ed25519Keypair();
    }
  }

  /**
   * Generates a backend signature over the match settlement data using BCS
   */
  public async generateMatchSignature(
    roomId: string,
    winner: string,
    loser: string,
    nonce: number,
  ) {
    logger.info(
      `Generating signature for room ${roomId}, winner: ${winner}, loser: ${loser}`,
    );

    // 1. Serialize data using BCS
    const payloadBytes = SettleMatchPayloadBcs.serialize({
      room_id: roomId,
      winner: winner,
      loser: loser,
      nonce: nonce.toString(), // bcs.u64 expects string or bigint natively
    }).toBytes();

    // 2. Sign the serialized bytes
    const signatureResponse =
      await this.keypair.signPersonalMessage(payloadBytes);

    return {
      signature: signatureResponse.signature,
      signatureBytes: signatureResponse.bytes, // base64 encoded
    };
  }

  public getPublicKeyAddress(): string {
    return this.keypair.toSuiAddress();
  }
}

export const cryptoService = new CryptoService();
