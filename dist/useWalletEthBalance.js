import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { mainnet } from "wagmi/chains";
function getChromeWalletProvider() {
    if (typeof window === "undefined")
        return undefined;
    return window.ethereum;
}
function chainIdToHex(chainId) {
    return `0x${chainId.toString(16)}`;
}
function parseHexWei(value) {
    return typeof value === "string" && value.startsWith("0x") ? BigInt(value) : 0n;
}
export function useWalletEthBalance(options = {}) {
    const account = useAccount();
    const address = options.address ?? account.address;
    const chainId = options.chainId ?? mainnet.id;
    const [balanceWei, setBalanceWei] = useState(0n);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState();
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
        }
        catch (caught) {
            setBalanceWei(0n);
            setError(caught instanceof Error ? caught : new Error(String(caught)));
        }
        finally {
            setIsLoading(false);
        }
    }, [address, chainId]);
    useEffect(() => {
        void refetch();
    }, [refetch]);
    useEffect(() => {
        if (!address)
            return;
        const intervalId = window.setInterval(() => {
            void refetch();
        }, 12_000);
        return () => {
            window.clearInterval(intervalId);
        };
    }, [address, refetch]);
    useEffect(() => {
        const provider = getChromeWalletProvider();
        if (!provider?.on || !provider.removeListener)
            return;
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
//# sourceMappingURL=useWalletEthBalance.js.map