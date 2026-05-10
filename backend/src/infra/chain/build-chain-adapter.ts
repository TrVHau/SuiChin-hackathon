import { env } from "../../config/env.js";
import type { IChainAdapter } from "./chain-adapter.js";
import { MockChainAdapter } from "./mock-chain-adapter.js";
import { SuiCliChainAdapter } from "./sui-cli-chain-adapter.js";

export function buildChainAdapter(): IChainAdapter {
  if (env.CHAIN_ADAPTER === "sui_cli") {
    return new SuiCliChainAdapter();
  }

  return new MockChainAdapter();
}

