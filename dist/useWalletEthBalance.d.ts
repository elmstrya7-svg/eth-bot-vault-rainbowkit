import { type Address } from "viem";
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
export declare function useWalletEthBalance(options?: UseWalletEthBalanceOptions): UseWalletEthBalanceResult;
//# sourceMappingURL=useWalletEthBalance.d.ts.map