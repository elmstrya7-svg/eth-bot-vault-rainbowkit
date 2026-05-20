import type { Address, Hash } from "viem";
export declare const DEFAULT_ETH_BOT_VAULT_STORAGE_KEY = "eth-bot-vault-rainbowkit:vault-address";
export type UseEthBotVaultDeploymentOptions = {
    chainId?: number;
    confirmations?: number;
    strategyWalletAddress?: Address;
    storageKey?: string;
    deploymentTimeoutMs?: number;
};
export type DeploymentTransactionStatus = "idle" | "walletPending" | "confirming" | "deployed" | "failed" | "cancelled" | "timeout";
export type DeploymentContractStatus = "unknown" | "checking" | "deployed" | "missing";
export type UseEthBotVaultDeploymentResult = {
    vaultAddress?: Address;
    deployHash?: Hash;
    deployStatus: DeploymentTransactionStatus;
    deployStatusText: string;
    contractStatus: DeploymentContractStatus;
    contractStatusText: string;
    isConnected: boolean;
    isCorrectChain: boolean;
    isDeployPending: boolean;
    isDeploying: boolean;
    isDeployed: boolean;
    error?: Error;
    deployVault: () => Promise<Hash>;
    refetchDeploymentStatus: () => Promise<void>;
    setVaultAddress: (address: Address) => void;
    clearVaultAddress: () => void;
};
export declare function useEthBotVaultDeployment(options?: UseEthBotVaultDeploymentOptions): UseEthBotVaultDeploymentResult;
//# sourceMappingURL=useEthBotVaultDeployment.d.ts.map