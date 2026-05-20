# Lovable Master Prompt: EtherTrade Engine Owned Strategy Bot

Use this prompt in Lovable to build a React + TypeScript Ethereum swing-trade bot dashboard where Lovable owns the app code, contract source, strategy code, and safety checks. Treat this repo as reference scaffolding, not as a black-box package that controls user funds.

```text
Build a production-style React + TypeScript dashboard called EtherTrade Engine.

Goal:
Create an Ethereum swing-trade strategy dashboard and bot-control interface where the app owns the code path end to end. Use the provided repository as core reference material for UI patterns, executor concepts, bot scripts, ABI shape, and tests, but do not depend on a black-box GitHub package for fund custody, deployment bytecode, or hidden execution behavior.

Use these repo components as references to adapt into the Lovable project:

- contracts/BotTradeExecutor.sol
- contracts/EthBotVault.sol, but only as a starting point to design a safer user-withdrawable vault
- bot/uniswap-v2-roundtrip.js
- bot/executor-searcher.js
- src/tradingExecutor.ts
- src/useEthPriceTicker.ts
- src/useWalletEthBalance.ts
- test/BotTradeExecutor.cjs
- test/EthBotVault.cjs

Architecture requirements:

1. Lovable must create and own the app code.
2. Lovable must include readable contract source in the project if it adds contracts.
3. Lovable must inspect any adapted contract logic instead of treating package bytecode as trusted.
4. Default network must be Sepolia/testnet.
5. Ethereum mainnet write actions must be disabled by default and gated behind explicit code-level constants.
6. The UI must never ask for seed phrases, private keys, exchange API keys, or custody credentials.
7. The browser UI must never collect, store, log, or transmit private keys.

Do not install or rely on this repo as an opaque dependency. If code from the repo is useful, copy/adapt the specific source files into the Lovable project so the app owns and displays the logic.

Install normal wallet/frontend dependencies if missing:

npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query

Use RainbowKit and wagmi for wallet connection:

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

Configure Sepolia by default. Do not require mainnet RPC keys for the first implementation.

Smart-contract design:

Create an app-owned SafeSwingVault contract or equivalent. It must satisfy these constraints:

- deposits are credited to msg.sender
- withdrawals always return available funds to msg.sender
- no hard-coded third-party destination address
- no package-author wallet
- no function that makes user funds irrecoverable by transferring the full user balance to an externally owned strategy wallet
- no owner-only sweep of user deposits
- no upgradeable proxy
- no delegatecall
- no arbitrary external target call from the vault
- include receive() only if it credits msg.sender or reverts
- include events for deposit, withdraw, strategy status change, and executor funding if executor funding is implemented
- include tests proving users can withdraw their own available balance

If adapting existing repo names, do not wire UI buttons to vault.activateStrategyEngine() unless the adapted implementation keeps user funds withdrawable or clearly funds an app-owned executor contract with recoverable accounting. Prefer new names that describe the safer behavior, such as:

- deposit()
- withdraw(uint256 amount)
- withdrawAll()
- setStrategyEnabled(bool enabled)
- fundExecutor(uint256 amount)
- recallExecutorFunds(uint256 amount)

Executor design:

Create or adapt a restricted BotTradeExecutor contract from the repo. It should:

- have an owner/operator
- allow only approved targets
- pin approved target code hashes
- allow only approved selectors
- allow only approved tokens
- support pause/unpause
- enforce minBalanceAfter on execution
- emit TradeExecuted events with target, value, calldata hash, and balanceAfter
- reject arbitrary calldata from the UI
- include tests for unauthorized operator rejection, unapproved target rejection, selector rejection, and minBalanceAfter enforcement

Trading strategy:

Build an Ethereum swing-trade strategy layer around Uniswap V2-style routes on Sepolia/testnet first.

The strategy must:

- quote ETH -> token -> ETH route output before execution
- simulate before execution
- calculate expectedProfitEth before gas
- enforce minProfitEth
- enforce slippageBps
- enforce minBalanceAfter
- never display fake PnL
- never invent completed trades
- show only real quote, simulation, transaction, and event data

Use bot/uniswap-v2-roundtrip.js and src/tradingExecutor.ts as reference implementations. Adapt them into project-owned code instead of calling hidden package internals.

Browser UI behavior:

Build a dense operational dashboard, not a landing page.

First viewport must show:

- top bar with app name, Sepolia network indicator, and RainbowKit ConnectButton
- wallet address and testnet ETH balance
- live ETH / USDT ticker if available, clearly labeled market reference
- SafeSwingVault address and Etherscan/Sepolia Etherscan link
- BotTradeExecutor address and explorer link
- vault available balance for connected user
- executor balance
- strategy enabled/paused state
- swing strategy preview
- latest transaction status

Dashboard cards:

1. Wallet
   - connection status
   - connected address
   - Sepolia ETH balance
   - wrong-network warning

2. Contracts
   - SafeSwingVault address
   - BotTradeExecutor address
   - contract source status: "source included in this project"
   - explorer links

3. Vault
   - amount input
   - Deposit button
   - Withdraw Available button
   - Withdraw All button
   - Strategy Enabled toggle
   - disable all writes while a transaction is pending

4. Executor
   - executor balance
   - approved target status
   - approved selector status
   - approved token status
   - paused status
   - no raw calldata input

5. Swing Strategy
   - token address input
   - tradeValueEth input, default 0.001
   - minProfitEth input, default 0
   - slippageBps input, default 50
   - Preview Route button
   - Approve Strategy Token button if needed
   - Execute Simulated Trade button disabled by default until preview passes
   - show expectedEthOut, expectedProfitEth, minBalanceAfter, and route path
   - show "before gas" wherever expected profit is displayed

6. Bot Runner
   - generate local command snippets for the off-chain bot
   - include EXECUTOR_ADDRESS, TRADE_TOKEN, TRADE_VALUE_ETH, MIN_PROFIT_ETH, BOT_ACCOUNT_ADDRESS, BOT_EXECUTE=false
   - do not request BOT_PRIVATE_KEY in the browser
   - state that private-key execution belongs only in a local server/CLI environment controlled by the developer

Allowed UI wording:

- "Testnet swing-trade bot dashboard"
- "Connected to wallet state, contract source in this project, and restricted executor controls"
- "Preview uses route quotes and simulation before execution"
- "Expected profit is before gas and not guaranteed"
- "Every write transaction requires wallet confirmation"

Disallowed UI wording:

- "guaranteed profit"
- "risk-free"
- "audited"
- "official"
- "guaranteed arbitrage"
- "guaranteed recovery"
- "set and forget"
- broad claims that the bot is safe, proven, or production-ready without visible code-owned contracts, testnet execution, route preview, and real transaction/event history

Security requirements:

- Never use dangerouslySetInnerHTML.
- Never eval user input.
- Never create hidden wallet requests.
- Never auto-click transaction buttons.
- Never hide destination addresses.
- Never hide contract addresses.
- Validate addresses with viem isAddress.
- Validate ETH values with parseEther inside try/catch.
- Use readable error messages, not stack traces.
- Keep all writes behind visible user clicks and wallet confirmation.
- Disable mainnet writes unless the code has an explicit MAINNET_WRITES_ENABLED constant set to true by the developer.

Implementation deliverables:

- React + TypeScript dashboard
- RainbowKit Sepolia wallet connection
- project-owned SafeSwingVault source
- project-owned BotTradeExecutor source or clearly adapted source
- tests for vault withdrawal and executor restrictions
- route preview logic based on Uniswap V2-style quoting
- strategy simulation before execution
- no raw arbitrary calldata UI
- Sepolia-first write workflow
- explorer links for contracts and transactions
- clear transaction status and errors

Do not build a polished mainnet ETH funnel. Build a transparent, testnet-first trading bot dashboard whose contracts and strategy logic are readable in the app repository.
```

## Short Follow-Up Prompt

```text
Revise the app so Lovable owns the contract source, deployment flow, and strategy code directly. Do not install or call an opaque GitHub package for bytecode or fund movement. Default to Sepolia. Keep deposits withdrawable by msg.sender. Use BotTradeExecutor only as a restricted, app-owned executor with approved targets/selectors/tokens and minBalanceAfter. Build a Swing Strategy preview using route quotes and simulation before execution. Do not show fake profit, fake trades, hidden destination addresses, raw calldata controls, or mainnet write actions enabled by default.
```
