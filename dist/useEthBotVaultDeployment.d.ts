import type { Address, Hash } from "viem";
export declare const DEFAULT_ETH_BOT_VAULT_STORAGE_KEY = "eth-bot-vault-rainbowkit:vault-address";
export type UseEthBotVaultDeploymentOptions = {
    chainId?: number;
    confirmations?: number;
    storageKey?: string;
};
export type UseEthBotVaultDeploymentResult = {
    vaultAddress?: Address;
    deployHash?: Hash;
    isConnected: boolean;
    isCorrectChain: boolean;
    isDeployPending: boolean;
    isDeploying: boolean;
    isDeployed: boolean;
    error?: Error;
    deployVault: () => Promise<Hash>;
    setVaultAddress: (address: Address) => void;
    clearVaultAddress: () => void;
};
export declare function useEthBotVaultDeployment(options?: UseEthBotVaultDeploymentOptions): UseEthBotVaultDeploymentResult;
//# sourceMappingURL=useEthBotVaultDeployment.d.ts.map