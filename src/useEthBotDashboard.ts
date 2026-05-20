import type { Address } from "viem";
import { mainnet } from "wagmi/chains";
import { useEthBotVaultDeployment, type UseEthBotVaultDeploymentOptions } from "./useEthBotVaultDeployment.js";
import { useEthPriceTicker, type UseEthPriceTickerOptions } from "./useEthPriceTicker.js";
import { useEthVault, type UseEthVaultOptions } from "./useEthVault.js";
import { useWalletEthBalance } from "./useWalletEthBalance.js";

export type UseEthBotDashboardOptions = UseEthVaultOptions & {
  deployment?: UseEthBotVaultDeploymentOptions;
  priceTicker?: UseEthPriceTickerOptions;
  walletAddress?: Address;
};

export function useEthBotDashboard(options: UseEthBotDashboardOptions) {
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
