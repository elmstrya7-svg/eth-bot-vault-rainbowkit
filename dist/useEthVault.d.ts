import { type Address, type Hash } from "viem";
export type EthVaultAction = "deposit" | "withdraw" | "withdrawAll" | "startBot" | "fundBotAndStart" | "stopBot";
export type UseEthVaultOptions = {
    vaultAddress?: Address;
    chainId?: number;
    confirmations?: number;
};
export type UseEthVaultResult = {
    accountAddress?: Address;
    chainId: number;
    requiredChainId: number;
    isConnected: boolean;
    isCorrectChain: boolean;
    balanceWei: bigint;
    balanceEth: string;
    botEnabled: boolean;
    forwardedToBotWei: bigint;
    forwardedToBotEth: string;
    totalDepositsWei: bigint;
    totalDepositsEth: string;
    totalForwardedToBotWei: bigint;
    totalForwardedToBotEth: string;
    tradingBotWallet?: Address;
    depositsPaused: boolean;
    pendingHash?: Hash;
    isWritePending: boolean;
    isConfirming: boolean;
    isConfirmed: boolean;
    error?: Error;
    depositEth: (amountEth: string) => Promise<Hash>;
    fundBotAndStart: (amountEth: string) => Promise<Hash>;
    startBot: () => Promise<Hash>;
    stopBot: () => Promise<Hash>;
    withdrawEth: (amountEth: string) => Promise<Hash>;
    withdrawAll: () => Promise<Hash>;
    refetch: () => void;
};
export declare function useEthVault(options: UseEthVaultOptions): UseEthVaultResult;
//# sourceMappingURL=useEthVault.d.ts.map