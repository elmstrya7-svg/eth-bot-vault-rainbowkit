import type { Address } from "viem";
import type { EthVaultAction } from "./useEthVault.js";
export type EthBotPanelProps = {
    vaultAddress?: Address;
    chainId?: number;
    className?: string;
    title?: string;
    onSubmitted?: (hash: string, action: EthVaultAction) => void;
};
export declare function EthBotPanel({ vaultAddress, chainId, className, title, onSubmitted }: EthBotPanelProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=EthBotPanel.d.ts.map