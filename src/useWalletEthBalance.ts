import { formatEther, type Address } from "viem";
import { useAccount, useBalance } from "wagmi";
import { mainnet } from "wagmi/chains";

export type UseWalletEthBalanceOptions = {
  address?: Address;
  chainId?: number;
};

export type UseWalletEthBalanceResult = {
  address?: Address;
  balanceWei: bigint;
  balanceEth: string;
  formatted: string;
  symbol: string;
  isLoading: boolean;
  error?: Error;
  refetch: () => void;
};

export function useWalletEthBalance(options: UseWalletEthBalanceOptions = {}): UseWalletEthBalanceResult {
  const account = useAccount();
  const address = options.address ?? account.address;
  const chainId = options.chainId ?? mainnet.id;
  const balance = useBalance({
    address,
    chainId,
    query: {
      enabled: Boolean(address)
    }
  });

  const balanceWei = balance.data?.value ?? 0n;

  return {
    address,
    balanceWei,
    balanceEth: formatEther(balanceWei),
    formatted: balance.data?.formatted ?? formatEther(balanceWei),
    symbol: balance.data?.symbol ?? "ETH",
    isLoading: balance.isLoading,
    error: balance.error ?? undefined,
    refetch: () => {
      void balance.refetch();
    }
  };
}
