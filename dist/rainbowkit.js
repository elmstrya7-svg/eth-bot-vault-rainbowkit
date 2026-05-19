import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { http, unstable_connector } from "wagmi";
import { mainnet } from "wagmi/chains";
function createMainnetTransport(mainnetRpcUrl) {
    if (mainnetRpcUrl)
        return http(mainnetRpcUrl);
    return unstable_connector({ type: "injected" }, {
        key: "injected-wallet",
        name: "Injected Wallet"
    });
}
export function createEthBotRainbowKitConfig({ appName, walletConnectProjectId, mainnetRpcUrl }) {
    return getDefaultConfig({
        appName,
        projectId: walletConnectProjectId ?? "eth-bot-vault-injected-only",
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
//# sourceMappingURL=rainbowkit.js.map