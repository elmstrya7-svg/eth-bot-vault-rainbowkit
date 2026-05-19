import { mainnet } from "wagmi/chains";
import { useEthBotVaultDeployment } from "./useEthBotVaultDeployment.js";
import { useEthPriceTicker } from "./useEthPriceTicker.js";
import { useEthVault } from "./useEthVault.js";
import { useWalletEthBalance } from "./useWalletEthBalance.js";
export function useEthBotDashboard(options) {
    const chainId = options.chainId ?? mainnet.id;
    const deployment = useEthBotVaultDeployment({ chainId, ...options.deployment });
    const vaultAddress = options.vaultAddress ?? deployment.vaultAddress;
    const price = useEthPriceTicker(options.priceTicker);
    const wallet = useWalletEthBalance({ address: options.walletAddress, chainId });
    const vault = useEthVault({ ...options, vaultAddress, chainId });
    const ethPrice = price.price ?? 0;
    const vaultBalance = Number(vault.balanceEth);
    const walletBalance = Number(wallet.balanceEth);
    return {
        deployment,
        price,
        wallet,
        vault,
        bot: {
            isFunded: vault.balanceWei > 0n || vault.forwardedToBotWei > 0n,
            isRunning: vault.botEnabled,
            fundedEth: vault.balanceEth,
            fundedUsd: ethPrice > 0 && Number.isFinite(vaultBalance) ? vaultBalance * ethPrice : null,
            forwardedEth: vault.forwardedToBotEth,
            forwardedUsd: ethPrice > 0 && Number.isFinite(Number(vault.forwardedToBotEth)) ? Number(vault.forwardedToBotEth) * ethPrice : null,
            walletEth: wallet.balanceEth,
            walletUsd: ethPrice > 0 && Number.isFinite(walletBalance) ? walletBalance * ethPrice : null
        }
    };
}
//# sourceMappingURL=useEthBotDashboard.js.map