import {
  SuiClientProvider,
  WalletProvider,
  useSuiClientContext,
} from "@mysten/dapp-kit";
import { registerEnokiWallets } from "@mysten/enoki";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  ENOKI_FACEBOOK_CLIENT_ID,
  ENOKI_GOOGLE_CLIENT_ID,
  ENOKI_PUBLIC_API_KEY,
  ENOKI_TWITCH_CLIENT_ID,
  NETWORK,
} from "@/config/sui.config";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient();

function getFullnodeUrl(network: string): string {
  const urls: Record<string, string> = {
    testnet: "https://fullnode.testnet.sui.io:443",
    mainnet: "https://fullnode.mainnet.sui.io:443",
    devnet: "https://fullnode.devnet.sui.io:443",
    localnet: "http://127.0.0.1:9000",
  };
  return urls[network] || urls.testnet;
}

const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
  devnet: { url: getFullnodeUrl("devnet") },
  localnet: { url: getFullnodeUrl("localnet") },
};

function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();

  useEffect(() => {
    if (!ENOKI_PUBLIC_API_KEY) return;

    const providers: Record<string, { clientId: string }> = {};
    if (ENOKI_GOOGLE_CLIENT_ID) {
      providers.google = { clientId: ENOKI_GOOGLE_CLIENT_ID };
    }
    if (ENOKI_FACEBOOK_CLIENT_ID) {
      providers.facebook = { clientId: ENOKI_FACEBOOK_CLIENT_ID };
    }
    if (ENOKI_TWITCH_CLIENT_ID) {
      providers.twitch = { clientId: ENOKI_TWITCH_CLIENT_ID };
    }

    if (Object.keys(providers).length === 0) return;

    const { unregister } = registerEnokiWallets({
      apiKey: ENOKI_PUBLIC_API_KEY,
      providers: providers as any,
      network: network as any,
      client: client as any,
    });

    return () => {
      unregister();
    };
  }, [client, network]);

  return null;
}

export function SuiProvider({ children }: { children: React.ReactNode }) {
  console.log(" SuiProvider rendering with NETWORK:", NETWORK);

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks as any} defaultNetwork={NETWORK}>
        <RegisterEnokiWallets />
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
