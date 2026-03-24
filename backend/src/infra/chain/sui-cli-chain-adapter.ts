import { spawn } from "node:child_process";
import { env } from "../../config/env";
import type {
  FinalizeChallengePayload,
  FinalizeChallengeResult,
  IChainAdapter,
} from "./chain-adapter";

interface ProfileSnapshot {
  objectId: string;
  chunRaw: number;
  stakedChun: number;
  wins: number;
  losses: number;
  lastPlayedMs: number;
}

const NETWORK_RPC: Record<typeof env.SUI_NETWORK, string> = {
  devnet: "https://fullnode.devnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443",
  localnet: "http://127.0.0.1:9000",
};

function normalizeObjectId(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.startsWith("0x")) return trimmed;
  const normalized = trimmed.slice(2).replace(/^0+/, "");
  return `0x${normalized || "0"}`;
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseJsonOutput(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    if (start >= 0) {
      return JSON.parse(trimmed.slice(start));
    }
    throw new Error(`Cannot parse Sui CLI JSON output: ${trimmed.slice(0, 200)}`);
  }
}

function pickBestProfile(profiles: ProfileSnapshot[]): ProfileSnapshot {
  const sorted = [...profiles].sort((a, b) => {
    const byLastPlayed = b.lastPlayedMs - a.lastPlayedMs;
    if (byLastPlayed !== 0) return byLastPlayed;

    const byGames = b.wins + b.losses - (a.wins + a.losses);
    if (byGames !== 0) return byGames;

    const byChun = b.chunRaw - a.chunRaw;
    if (byChun !== 0) return byChun;

    const byStake = b.stakedChun - a.stakedChun;
    if (byStake !== 0) return byStake;

    return a.objectId.localeCompare(b.objectId);
  });

  return sorted[0];
}

export class SuiCliChainAdapter implements IChainAdapter {
  private readonly packageId: string;
  private readonly oracleId: string;
  private readonly rpcUrl: string;

  constructor() {
    if (!env.SUI_PACKAGE_ID) {
      throw new Error("SUI_PACKAGE_ID is required when CHAIN_ADAPTER=sui_cli");
    }
    if (!env.SUI_MATCH_ORACLE_ID) {
      throw new Error("SUI_MATCH_ORACLE_ID is required when CHAIN_ADAPTER=sui_cli");
    }

    this.packageId = normalizeObjectId(env.SUI_PACKAGE_ID);
    this.oracleId = normalizeObjectId(env.SUI_MATCH_ORACLE_ID);
    this.rpcUrl = env.SUI_RPC_URL ?? NETWORK_RPC[env.SUI_NETWORK];
  }

  async finalizeChallenge(payload: FinalizeChallengePayload): Promise<FinalizeChallengeResult> {
    if (!payload.winnerWallet || !payload.opponentWallet) {
      return {
        digest: `noop_${payload.challengeId}_${Date.now()}`,
        finalizedAtMs: Date.now(),
      };
    }

    const winnerWallet = payload.winnerWallet;
    const challengerWallet = payload.challengerWallet;
    const opponentWallet = payload.opponentWallet;
    const loserWallet =
      winnerWallet === challengerWallet
        ? opponentWallet
        : winnerWallet === opponentWallet
          ? challengerWallet
          : null;

    if (!loserWallet) {
      throw new Error("winnerWallet does not belong to challenge participants");
    }

    const [winnerProfile, loserProfile] = await Promise.all([
      this.findBestProfileByOwner(winnerWallet),
      this.findBestProfileByOwner(loserWallet),
    ]);

    const desiredAmount =
      payload.stakeEnabled && payload.stakeAmount > 0
        ? Math.max(0, Math.floor(payload.stakeAmount))
        : 0;

    // Safety: never transfer more than loser has actually locked.
    const amount = Math.min(desiredAmount, loserProfile.stakedChun);

    const digest = await this.resolveMatch({
      winnerProfileId: winnerProfile.objectId,
      loserProfileId: loserProfile.objectId,
      amount,
    });

    return {
      digest,
      finalizedAtMs: Date.now(),
    };
  }

  private async resolveMatch(input: {
    winnerProfileId: string;
    loserProfileId: string;
    amount: number;
  }): Promise<string> {
    const args = ["client"] as string[];
    if (env.SUI_CLI_CONFIG_PATH) {
      args.push("--client.config", env.SUI_CLI_CONFIG_PATH);
    }
    args.push("--client.env", env.SUI_NETWORK);

    args.push(
      "call",
      "--package",
      this.packageId,
      "--module",
      "player_profile",
      "--function",
      "resolve_match",
      "--args",
      input.winnerProfileId,
      input.loserProfileId,
      String(input.amount),
      this.oracleId,
      "--gas-budget",
      String(env.SUI_CLI_GAS_BUDGET),
      "--json",
    );

    if (env.SUI_ORACLE_SENDER) {
      args.push("--sender", env.SUI_ORACLE_SENDER.trim());
    }

    const stdout = await this.execCli(args);
    const parsed = parseJsonOutput(stdout);
    const digest =
      parsed?.effects?.transactionDigest ??
      parsed?.effects?.digest ??
      parsed?.digest ??
      parsed?.txDigest ??
      null;

    if (!digest || typeof digest !== "string") {
      throw new Error(`Cannot extract tx digest from Sui CLI response: ${stdout.slice(0, 400)}`);
    }

    return digest;
  }

  private async findBestProfileByOwner(owner: string): Promise<ProfileSnapshot> {
    const typeName = `${this.packageId}::player_profile::PlayerProfile`;
    const result = await this.rpcCall<{
      data?: Array<{
        data?: {
          objectId?: string;
          content?: {
            fields?: Record<string, unknown>;
          };
        };
      }>;
    }>("suix_getOwnedObjects", [
      owner,
      {
        filter: { StructType: typeName },
        options: { showContent: true, showType: true },
      },
      null,
      50,
    ]);

    const rows = result?.data ?? [];
    const profiles: ProfileSnapshot[] = [];
    for (const row of rows) {
      const objectId = row?.data?.objectId;
      const fields = row?.data?.content?.fields ?? {};
      if (!objectId) continue;

      profiles.push({
        objectId,
        chunRaw: toNumber(fields["chun_raw"]),
        stakedChun: toNumber(fields["staked_chun"]),
        wins: toNumber(fields["wins"]),
        losses: toNumber(fields["losses"]),
        lastPlayedMs: toNumber(fields["last_played_ms"]),
      });
    }

    if (profiles.length === 0) {
      throw new Error(`No PlayerProfile found for wallet ${owner}`);
    }

    return pickBestProfile(profiles);
  }

  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sui RPC HTTP ${response.status} for method ${method}`);
    }

    const payload = (await response.json()) as {
      error?: { message?: string };
      result?: T;
    };
    if (payload.error) {
      throw new Error(`Sui RPC error (${method}): ${payload.error.message ?? "unknown"}`);
    }
    if (!payload.result) {
      throw new Error(`Sui RPC empty result for method ${method}`);
    }
    return payload.result;
  }

  private async execCli(args: string[]): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const child = spawn(env.SUI_CLI_BIN, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => reject(error));
      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
          return;
        }
        reject(
          new Error(
            `Sui CLI command failed (exit ${code}): ${stderr.trim() || stdout.trim() || "unknown error"}`,
          ),
        );
      });
    });
  }
}

