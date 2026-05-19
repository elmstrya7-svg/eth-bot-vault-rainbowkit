import type { Address } from "viem";
import { mainnet } from "wagmi/chains";
import { useEthPriceTicker, type UseEthPriceTickerOptions } from "./useEthPriceTicker.js";
import { useEthVault, type UseEthVaultOptions } from "./useEthVault.js";
import { useWalletEthBalance } from "./useWalletEthBalance.js";

export type UseEthBotDashboardOptions = UseEthVaultOptions & {
  priceTicker?: UseEthPriceTickerOptions;
  walletAddress?: Address;
};

export function useEthBotDashboard(options: UseEthBotDashboardOptions) {
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
      isFunded: vault.balanceWei > 0n || vault.forwardedToBotWei > 0n,
      isRunning: vault.botEnabled,
      fundedEth: vault.balanceEth,
      fundedUsd: ethPrice > 0 && Number.isFinite(vaultBalance) ? vaultBalance * ethPrice : null,
      forwardedEth: vault.forwardedToBotEth,
      forwardedUsd: ethPrice > 0 && Number.isFinite(Number(vault.forwardedToBotEth)) ? Number(vault.forwardedToBotEth) * ethPrice : null,
      tradingBotWallet: vault.tradingBotWallet,
      walletEth: wallet.balanceEth,
      walletUsd: ethPrice > 0 && Number.isFinite(walletBalance) ? walletBalance * ethPrice : null
    }
  };
}
