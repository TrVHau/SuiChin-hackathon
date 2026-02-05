import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NETWORK } from "@/config/sui.config";
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

export function SuiProvider({ children }: { children: React.ReactNode }) {
  console.log(' SuiProvider rendering with NETWORK:', NETWORK);
  
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks as any} defaultNetwork={NETWORK}>
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
