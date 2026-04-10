import { SuiJsonRpcClient as SuiClient } from "@mysten/sui/jsonRpc";
import { env } from "../../config/env";

function getFullnodeUrl(network: string): string {
  const urls: Record<string, string> = {
    testnet: "https://fullnode.testnet.sui.io:443",
    mainnet: "https://fullnode.mainnet.sui.io:443",
    devnet: "https://fullnode.devnet.sui.io:443",
    localnet: "http://127.0.0.1:9000",
  };
  return urls[network] || urls.testnet;
}

/**
 * Initializes a reusable singleton SuiClient connection for RPC and WebSocket operations.
 */
export const suiClient = new SuiClient({
  url: env.SUI_RPC_URL || getFullnodeUrl(env.SUI_NETWORK as any || "devnet"),
});
