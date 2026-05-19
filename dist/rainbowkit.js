import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet } from "wagmi/chains";
export function createEthBotRainbowKitConfig({ appName, walletConnectProjectId, mainnetRpcUrl }) {
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
//# sourceMappingURL=rainbowkit.js.map