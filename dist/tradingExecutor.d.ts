import { type Address, type Hex } from "viem";
export type EthereumRequestProvider = {
    request: (args: {
        method: string;
        params?: unknown[];
    }) => Promise<unknown>;
};
export type UniswapV2RoundTripPreview = {
    approvedRouter: boolean;
    approvedBuySelector: boolean;
    approvedSellSelector: boolean;
    approvedToken: boolean;
    botWallet: Address;
    expectedEthOut: bigint;
    expectedProfit: bigint;
    expectedProfitEth: string;
    expectedTokenOut: bigint;
    executorBalance: bigint;
    minBalanceAfter: bigint;
    routerAddress: Address;
    tokenAddress: Address;
    tradeValue: bigint;
};
export type UniswapV2RoundTripOptions = {
    account: Address;
    deadlineSeconds?: number;
    executorAddress: Address;
    minProfit?: bigint;
    provider?: EthereumRequestProvider;
    routerAddress?: Address;
    slippageBps?: number;
    tokenAddress: Address;
    tradeValue: bigint;
    wethAddress?: Address;
};
export declare function previewUniswapV2RoundTrip(options: UniswapV2RoundTripOptions): Promise<UniswapV2RoundTripPreview>;
export declare function approveUniswapV2RoundTripToken(options: UniswapV2RoundTripOptions): Promise<Hex | undefined>;
//# sourceMappingURL=tradingExecutor.d.ts.map