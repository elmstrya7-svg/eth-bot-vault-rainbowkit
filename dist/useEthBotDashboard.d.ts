import type { Address } from "viem";
import { type UseEthPriceTickerOptions } from "./useEthPriceTicker.js";
import { type UseEthVaultOptions } from "./useEthVault.js";
export type UseEthBotDashboardOptions = UseEthVaultOptions & {
    priceTicker?: UseEthPriceTickerOptions;
    walletAddress?: Address;
};
export declare function useEthBotDashboard(options: UseEthBotDashboardOptions): {
    price: import("./useEthPriceTicker.js").UseEthPriceTickerResult;
    wallet: import("./useWalletEthBalance.js").UseWalletEthBalanceResult;
    vault: import("./useEthVault.js").UseEthVaultResult;
    bot: {
        isFunded: boolean;
        isRunning: boolean;
        fundedEth: string;
        fundedUsd: number | null;
        walletEth: string;
        walletUsd: number | null;
    };
};
//# sourceMappingURL=useEthBotDashboard.d.ts.map