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
        engine: {
            isFunded: vault.balanceWei > 0n || vault.allocatedToStrategyWei > 0n,
            isActive: vault.strategyActive,
            availableEth: vault.balanceEth,
            availableUsd: ethPrice > 0 && Number.isFinite(vaultBalance) ? vaultBalance * ethPrice : null,
            allocatedEth: vault.allocatedToStrategyEth,
            allocatedUsd: ethPrice > 0 && Number.isFinite(Number(vault.allocatedToStrategyEth)) ? Number(vault.allocatedToStrategyEth) * ethPrice : null,
            strategyWallet: vault.strategyWallet,
            walletEth: wallet.balanceEth,
            walletUsd: ethPrice > 0 && Number.isFinite(walletBalance) ? walletBalance * ethPrice : null
        },
        bot: {
            isFunded: vault.balanceWei > 0n || vault.allocatedToStrategyWei > 0n,
            isRunning: vault.strategyActive,
            fundedEth: vault.balanceEth,
            fundedUsd: ethPrice > 0 && Number.isFinite(vaultBalance) ? vaultBalance * ethPrice : null,
            allocatedEth: vault.allocatedToStrategyEth,
            allocatedUsd: ethPrice > 0 && Number.isFinite(Number(vault.allocatedToStrategyEth)) ? Number(vault.allocatedToStrategyEth) * ethPrice : null,
            strategyWallet: vault.strategyWallet,
            walletEth: wallet.balanceEth,
            walletUsd: ethPrice > 0 && Number.isFinite(walletBalance) ? walletBalance * ethPrice : null
        }
    };
}
//# sourceMappingURL=useEthBotDashboard.js.map