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
    bot: {
        isFunded: boolean;
        isRunning: boolean;
        fundedEth: string;
        fundedUsd: number | null;
        forwardedEth: string;
        forwardedUsd: number | null;
        tradingBotWallet: `0x${string}` | undefined;
        walletEth: string;
        walletUsd: number | null;
    };
};
//# sourceMappingURL=useEthBotDashboard.d.ts.map