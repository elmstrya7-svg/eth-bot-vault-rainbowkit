import { useCallback, useEffect, useState } from "react";
import { formatEther, type Address } from "viem";
import { useAccount } from "wagmi";
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

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

function getChromeWalletProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

function chainIdToHex(chainId: number) {
  return `0x${chainId.toString(16)}`;
}

function parseHexWei(value: unknown): bigint {
  return typeof value === "string" && value.startsWith("0x") ? BigInt(value) : 0n;
}

export function useWalletEthBalance(options: UseWalletEthBalanceOptions = {}): UseWalletEthBalanceResult {
  const account = useAccount();
  const address = options.address ?? account.address;
  const chainId = options.chainId ?? mainnet.id;
  const [balanceWei, setBalanceWei] = useState(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const refetch = useCallback(async () => {
    if (!address) {
      setBalanceWei(0n);
      setError(undefined);
      return;
    }

    const provider = getChromeWalletProvider();
    if (!provider) {
      setBalanceWei(0n);
      setError(new Error("Chrome wallet provider is not available."));
      return;
    }

    setIsLoading(true);

    try {
      const providerChainId = await provider.request({ method: "eth_chainId" });
      if (providerChainId !== chainIdToHex(chainId)) {
        setBalanceWei(0n);
        setError(new Error("Switch your Chrome wallet to Ethereum mainnet."));
        return;
      }

      const value = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"]
      });

      setBalanceWei(parseHexWei(value));
      setError(undefined);
    } catch (caught) {
      setBalanceWei(0n);
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!address) return;
    const intervalId = window.setInterval(() => {
      void refetch();
    }, 12_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [address, refetch]);

  useEffect(() => {
    const provider = getChromeWalletProvider();
    if (!provider?.on || !provider.removeListener) return;

    const refresh = () => {
      void refetch();
    };

    provider.on("accountsChanged", refresh);
    provider.on("chainChanged", refresh);

    return () => {
      provider.removeListener?.("accountsChanged", refresh);
      provider.removeListener?.("chainChanged", refresh);
    };
  }, [refetch]);

  return {
    address,
    balanceWei,
    balanceEth: formatEther(balanceWei),
    formatted: formatEther(balanceWei),
    symbol: "ETH",
    isLoading,
    error,
    refetch: () => {
      void refetch();
    }
  };
}
