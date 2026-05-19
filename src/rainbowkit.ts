import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet } from "wagmi/chains";

export type CreateEthBotRainbowKitConfigOptions = {
  appName: string;
  walletConnectProjectId: string;
  mainnetRpcUrl?: string;
};

export function createEthBotRainbowKitConfig({
  appName,
  walletConnectProjectId,
  mainnetRpcUrl
}: CreateEthBotRainbowKitConfigOptions) {
  return getDefaultConfig({
    appName,
    projectId: walletConnectProjectId,
    chains: [mainnet],
    transports: {
      [mainnet.id]: http(mainnetRpcUrl)
    },
    ssr: true
  });
}
