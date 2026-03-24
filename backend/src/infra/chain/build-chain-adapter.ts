import { env } from "../../config/env";
import type { IChainAdapter } from "./chain-adapter";
import { MockChainAdapter } from "./mock-chain-adapter";
import { SuiCliChainAdapter } from "./sui-cli-chain-adapter";

export function buildChainAdapter(): IChainAdapter {
  if (env.CHAIN_ADAPTER === "sui_cli") {
    return new SuiCliChainAdapter();
  }

  return new MockChainAdapter();
}

