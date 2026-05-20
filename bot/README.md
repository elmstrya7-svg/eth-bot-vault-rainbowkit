# Off-chain executor searcher

This folder contains the Node.js off-chain side of the trading flow. It does not need API keys. If `BOT_RPC_URL` is omitted, the scripts use a public RPC fallback. Browser/Lovable integrations can avoid custom RPC endpoints entirely by importing the package helpers that use `window.ethereum`.

## Dry run

```bash
EXECUTOR_ADDRESS=0xExecutor \
TRADE_TARGET=0xApprovedTarget \
TRADE_CALLDATA=0x \
TRADE_VALUE_ETH=0 \
MIN_EXECUTOR_BALANCE_AFTER_ETH=0 \
BOT_ACCOUNT_ADDRESS=0xBotWallet \
npm run bot:simulate
```

## Execute

```bash
EXECUTOR_ADDRESS=0xExecutor \
TRADE_TARGET=0xApprovedTarget \
TRADE_CALLDATA=0x... \
TRADE_VALUE_ETH=0.01 \
MIN_EXECUTOR_BALANCE_AFTER_ETH=0.0101 \
BOT_PRIVATE_KEY=0x... \
BOT_EXECUTE=true \
npm run bot:execute
```

`TRADE_TARGET` must be approved in `BotTradeExecutor` first. For production use, add a strategy module that builds calldata for a specific router/protocol, simulates it, and sets a conservative `MIN_EXECUTOR_BALANCE_AFTER_ETH`.

## Uniswap V2-style round trip

This strategy uses on-chain Uniswap V2 router reads. It quotes an ETH -> token -> ETH round trip, checks expected profit before gas, simulates the executor batch, and only executes with `BOT_EXECUTE=true`.

Required setup:

- Approve the router as an executor target with `setApprovedTarget(router, true)`.
- Approve the token with `setApprovedToken(token, true)`.
- Fund the executor with ETH from the bot wallet.

Dry run:

```bash
EXECUTOR_ADDRESS=0xExecutor \
TRADE_TOKEN=0xToken \
TRADE_VALUE_ETH=0.01 \
MIN_PROFIT_ETH=0 \
BOT_ACCOUNT_ADDRESS=0xBotWallet \
npm run bot:uniswap-v2
```

Execute:

```bash
EXECUTOR_ADDRESS=0xExecutor \
TRADE_TOKEN=0xToken \
TRADE_VALUE_ETH=0.01 \
MIN_PROFIT_ETH=0.0001 \
SLIPPAGE_BPS=50 \
BOT_PRIVATE_KEY=0x... \
BOT_EXECUTE=true \
npm run bot:uniswap-v2
```

Normal round trips are usually unprofitable after fees and gas. This script is a real execution adapter, not a profitable strategy by itself.

## Browser provider mode

For no custom RPC endpoint in a browser app, import:

```ts
import {
  approveUniswapV2RoundTripToken,
  previewUniswapV2RoundTrip
} from "eth-bot-vault-rainbowkit";
```

These helpers use the connected browser wallet provider (`window.ethereum`) through `viem` custom transport. Node scripts cannot use a browser wallet provider, so they need either `BOT_RPC_URL` or the public RPC fallback.
