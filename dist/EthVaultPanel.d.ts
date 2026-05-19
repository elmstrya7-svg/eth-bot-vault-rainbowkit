import type { Address } from "viem";
import { type EthVaultAction } from "./useEthVault.js";
export type EthVaultPanelProps = {
    vaultAddress?: Address;
    chainId?: number;
    title?: string;
    className?: string;
    onSubmitted?: (hash: string, action: EthVaultAction) => void;
};
export declare function EthVaultPanel({ vaultAddress, chainId, title, className, onSubmitted }: EthVaultPanelProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=EthVaultPanel.d.ts.map