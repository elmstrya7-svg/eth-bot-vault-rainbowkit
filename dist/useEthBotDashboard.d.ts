import type { Address } from "viem";
import { type UseEthBotVaultDeploymentOptions } from "./useEthBotVaultDeployment.js";
import { type UseEthPriceTickerOptions } from "./useEthPriceTicker.js";
import { type UseEthVaultOptions } from "./useEthVault.js";
export type UseEthBotDashboardOptions = UseEthVaultOptions & {
    deployment?: UseEthBotVaultDeploymentOptions;
    priceTicker?: UseEthPriceTickerOptions;
    walletAddress?: Address;
};
export declare function useEthBotDashboard(options: UseEthBotDashboardOptions): {
    deployment: import("./useEthBotVaultDeployment.js").UseEthBotVaultDeploymentResult;
    price: import("./useEthPriceTicker.js").UseEthPriceTickerResult;
    wallet: import("./useWalletEthBalance.js").UseWalletEthBalanceResult;
    vault: import("./useEthVault.js").UseEthVaultResult;
    engine: {
        isFunded: boolean;
        isActive: boolean;
        availableEth: string;
        availableUsd: number | null;
        allocatedEth: string;
        allocatedUsd: number | null;
        strategyWallet: `0x${string}` | undefined;
        walletEth: string;
        walletUsd: number | null;
    };
    bot: {
        isFunded: boolean;
        isRunning: boolean;
        fundedEth: string;
        fundedUsd: number | null;
        allocatedEth: string;
        allocatedUsd: number | null;
        strategyWallet: `0x${string}` | undefined;
        walletEth: string;
        walletUsd: number | null;
    };
};
//# sourceMappingURL=useEthBotDashboard.d.ts.map