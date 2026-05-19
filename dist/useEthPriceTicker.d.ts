export type EthPriceTickerStatus = "connecting" | "live" | "stale" | "error";
export type BinanceMiniTickerMessage = {
    e: string;
    E: number;
    s: string;
    c: string;
    o: string;
    h: string;
    l: string;
    v: string;
    q: string;
};
export type UseEthPriceTickerOptions = {
    enabled?: boolean;
    reconnectDelayMs?: number;
    streamUrl?: string;
};
export type UseEthPriceTickerResult = {
    price: number | null;
    priceText: string;
    changePercent24h: number | null;
    changePercent24hText: string;
    high24h: number | null;
    low24h: number | null;
    source: "Binance";
    symbol: "ETHUSDT";
    status: EthPriceTickerStatus;
    updatedAt?: Date;
    error?: string;
};
export declare function useEthPriceTicker(options?: UseEthPriceTickerOptions): UseEthPriceTickerResult;
//# sourceMappingURL=useEthPriceTicker.d.ts.map