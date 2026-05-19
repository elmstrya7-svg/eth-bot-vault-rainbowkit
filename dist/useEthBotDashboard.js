import { mainnet } from "wagmi/chains";
import { useEthPriceTicker } from "./useEthPriceTicker.js";
import { useEthVault } from "./useEthVault.js";
import { useWalletEthBalance } from "./useWalletEthBalance.js";
export function useEthBotDashboard(options) {
    const chainId = options.chainId ?? mainnet.id;
    const price = useEthPriceTicker(options.priceTicker);
    const wallet = useWalletEthBalance({ address: options.walletAddress, chainId });
    const vault = useEthVault(options);
    const ethPrice = price.price ?? 0;
    const vaultBalance = Number(vault.balanceEth);
    const walletBalance = Number(wallet.balanceEth);
    return {
        price,
        wallet,
        vault,
        bot: {
            isFunded: vault.balanceWei > 0n,
            isRunning: vault.botEnabled,
            fundedEth: vault.balanceEth,
            fundedUsd: ethPrice > 0 && Number.isFinite(vaultBalance) ? vaultBalance * ethPrice : null,
            walletEth: wallet.balanceEth,
            walletUsd: ethPrice > 0 && Number.isFinite(walletBalance) ? walletBalance * ethPrice : null
        }
    };
}
//# sourceMappingURL=useEthBotDashboard.js.map