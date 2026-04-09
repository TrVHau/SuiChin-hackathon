import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { env } from '../../config/env';

/**
 * Initializes a reusable singleton SuiClient connection for RPC and WebSocket operations.
 */
export const suiClient = new SuiClient({
  url: env.SUI_RPC_URL || getFullnodeUrl(env.SUI_NETWORK as any || 'devnet'),
});
