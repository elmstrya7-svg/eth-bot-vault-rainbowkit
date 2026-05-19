import { formatEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { mainnet } from "wagmi/chains";
export function useWalletEthBalance(options = {}) {
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
//# sourceMappingURL=useWalletEthBalance.js.map