import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { http, unstable_connector, type Transport } from "wagmi";
import { mainnet } from "wagmi/chains";

export type CreateEthBotRainbowKitConfigOptions = {
  appName: string;
  walletConnectProjectId: string;
  mainnetRpcUrl?: string;
};

function createMainnetTransport(mainnetRpcUrl?: string): Transport {
  if (mainnetRpcUrl) return http(mainnetRpcUrl);

  return unstable_connector(
    { type: "injected" },
    {
      key: "injected-wallet",
      name: "Injected Wallet"
    }
  );
}

export function createEthBotRainbowKitConfig({
  appName,
  walletConnectProjectId,
  mainnetRpcUrl
}: CreateEthBotRainbowKitConfigOptions) {
  return getDefaultConfig({
    appName,
    projectId: walletConnectProjectId,
    chains: [mainnet],
    wallets: [
      {
        groupName: "Chrome",
        wallets: [injectedWallet]
      }
    ],
    transports: {
      [mainnet.id]: createMainnetTransport(mainnetRpcUrl)
    },
    batch: {
      multicall: false
    },
    ssr: true
  });
}
