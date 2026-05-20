import type { Address } from "viem";
import type { EthVaultAction } from "./useEthVault.js";
export type EthBotPanelProps = {
    vaultAddress?: Address;
    strategyWalletAddress?: Address;
    chainId?: number;
    className?: string;
    title?: string;
    onSubmitted?: (hash: string, action: EthVaultAction) => void;
    onVaultDeployed?: (address: Address) => void;
};
export declare function EthBotPanel({ vaultAddress, strategyWalletAddress, chainId, className, title, onSubmitted, onVaultDeployed }: EthBotPanelProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=EthBotPanel.d.ts.map