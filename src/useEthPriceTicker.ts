import { useEffect, useMemo, useState } from "react";

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

const DEFAULT_BINANCE_ETH_TICKER_STREAM = "wss://stream.binance.com:9443/ws/ethusdt@miniTicker";

const usdFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency"
});

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function useEthPriceTicker(options: UseEthPriceTickerOptions = {}): UseEthPriceTickerResult {
  const enabled = options.enabled ?? true;
  const reconnectDelayMs = options.reconnectDelayMs ?? 3000;
  const streamUrl = options.streamUrl ?? DEFAULT_BINANCE_ETH_TICKER_STREAM;

  const [message, setMessage] = useState<BinanceMiniTickerMessage>();
  const [status, setStatus] = useState<EthPriceTickerStatus>("connecting");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!enabled) {
      setStatus("stale");
      return;
    }

    if (typeof WebSocket === "undefined") {
      setStatus("error");
      setError("WebSocket is not available in this runtime.");
      return;
    }

    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let closedByHook = false;
    let socket: WebSocket | undefined;

    function connect() {
      setStatus("connecting");
      socket = new WebSocket(streamUrl);

      socket.onopen = () => {
        setStatus("live");
        setError(undefined);
      };

      socket.onmessage = (event) => {
        try {
          const nextMessage = JSON.parse(String(event.data)) as BinanceMiniTickerMessage;
          if (nextMessage.s === "ETHUSDT") {
            setMessage(nextMessage);
            setStatus("live");
          }
        } catch {
          setStatus("error");
          setError("Could not parse Binance ticker message.");
        }
      };

      socket.onerror = () => {
        setStatus("error");
        setError("Binance ticker connection failed.");
      };

      socket.onclose = () => {
        if (closedByHook) return;
        setStatus("stale");
        reconnectTimer = setTimeout(connect, reconnectDelayMs);
      };
    }

    connect();

    return () => {
      closedByHook = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enabled, reconnectDelayMs, streamUrl]);

  return useMemo(() => {
    const price = message ? Number(message.c) : null;
    const open = message ? Number(message.o) : null;
    const high24h = message ? Number(message.h) : null;
    const low24h = message ? Number(message.l) : null;
    const changePercent24h =
      price !== null && open !== null && Number.isFinite(open) && open > 0 ? ((price - open) / open) * 100 : null;

    return {
      price: price !== null && Number.isFinite(price) ? price : null,
      priceText: price !== null && Number.isFinite(price) ? usdFormatter.format(price) : "--",
      changePercent24h: changePercent24h !== null && Number.isFinite(changePercent24h) ? changePercent24h : null,
      changePercent24hText: formatPercent(changePercent24h),
      high24h: high24h !== null && Number.isFinite(high24h) ? high24h : null,
      low24h: low24h !== null && Number.isFinite(low24h) ? low24h : null,
      source: "Binance",
      symbol: "ETHUSDT",
      status,
      updatedAt: message ? new Date(message.E) : undefined,
      error
    };
  }, [error, message, status]);
}
