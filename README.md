# eth-bot-vault-rainbowkit

Ethereum strategy vault package for RainbowKit/wagmi apps. It includes:

- `contracts/EthBotVault.sol`: a mainnet-compatible ETH strategy vault.
- `useEthVault`: a React hook for funding, withdrawal, allocation, engine state, and transaction state.
- `useEthPriceTicker`: a live Binance `ETHUSDT` ticker over WebSocket.
- `useWalletEthBalance`: the connected wallet ETH balance read directly from the Chrome wallet provider.
- `useEthBotVaultDeployment`: deploys the vault from the connected wallet and stores the address in browser storage.
- `useEthBotDashboard`: a single hook for Lovable dashboards.
- `EthBotPanel`: a Fund Contract, Activate Engine, Pause Engine, Withdraw Available ETH panel.
- `EthVaultPanel`: a basic UI you can drop into a Lovable React app.
- `createEthBotRainbowKitConfig`: a helper for Ethereum mainnet RainbowKit config using the browser-injected wallet by default.
- `contracts/BotTradeExecutor.sol`: a restricted executor contract for off-chain simulated trade calls.
- `bot/executor-searcher.js`: a no-API-key viem runner that simulates an executor call before optionally sending it.

The default flow separates funding from engine activation. Fund Contract deposits ETH into the deployed contract. Activate Engine commits the connected wallet's available contract balance to the configured strategy wallet and updates the user's engine status. ETH no longer held by the contract is not withdrawable from the contract; backend accounting and withdrawal handling should be added before presenting this as a complete live trading product.

## Install in Lovable

```bash
npm install github:elmstrya7-svg/eth-bot-vault-rainbowkit
```

If you publish it to npm:

```bash
npm install eth-bot-vault-rainbowkit wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
```

## Deploy the ETH vault on mainnet

Use a deployer wallet that only holds the ETH needed for gas.

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```bash
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0xyour_private_key
```

Compile and test:

```bash
npm run compile:contracts
npm test
```

Deploy to Ethereum mainnet:

```bash
npx hardhat run scripts/deploy.ts --network mainnet
```

For the no-env Lovable flow, let the dashboard deploy the vault from the connected Chrome wallet. The package stores the deployed address in `localStorage`. If `mainnetRpcUrl` is omitted, the RainbowKit helper routes mainnet contract reads through the connected injected wallet provider. Wallet ETH balance is read directly from `window.ethereum` with `eth_getBalance`.

## Basic Lovable Usage

```tsx
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createEthBotRainbowKitConfig, EthBotPanel } from "eth-bot-vault-rainbowkit";

const queryClient = new QueryClient();

const config = createEthBotRainbowKitConfig({
  appName: "EtherTrade Engine"
});

export function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ConnectButton />
          <EthBotPanel />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

## Hook Usage

```tsx
import { useEthBotDashboard } from "eth-bot-vault-rainbowkit";

export function EtherTradeEngineData() {
  const { engine, deployment, price, vault, wallet } = useEthBotDashboard({});

  return (
    <div>
      {!deployment.vaultAddress ? (
        <button onClick={deployment.deployVault}>Deploy Vault Contract</button>
      ) : null}
      <div>ETH price: {price.priceText}</div>
      <div>24h change: {price.changePercent24hText}</div>
      <div>Wallet balance: {wallet.formatted} ETH</div>
      <div>Available contract balance: {engine.availableEth} ETH</div>
      <div>Engine active: {engine.isActive ? "yes" : "no"}</div>
      <button onClick={() => vault.depositEth("0.01")}>Fund Contract 0.01 ETH</button>
      <button onClick={vault.activateStrategyEngine}>Activate Engine</button>
      <button onClick={vault.deactivateStrategyEngine}>Pause Engine</button>
      <button onClick={vault.withdrawAll}>Withdraw Available ETH</button>
    </div>
  );
}
```

## Filling An Existing Lovable UI

Replace demo data with `useEthBotDashboard`.

```tsx
const { engine, deployment, price, vault, wallet } = useEthBotDashboard({});

const etherTradeEngineFields = {
  vaultAddress: deployment.vaultAddress,
  deployVault: deployment.deployVault,
  ethUsd: price.priceText,
  change24h: price.changePercent24hText,
  walletEthBalance: `${wallet.formatted} ETH`,
  contractEthBalance: `${engine.availableEth} ETH`,
  allocatedEth: `${engine.allocatedEth} ETH`,
  fundedUsdValue: engine.availableUsd,
  engineStatus: engine.isActive ? "Active" : engine.isFunded ? "Funded" : "Not funded",
  fundContractEth: vault.depositEth,
  activateEngine: vault.activateStrategyEngine,
  pauseEngine: vault.deactivateStrategyEngine,
  withdrawAvailableEth: vault.withdrawAll
};
```

The Binance ticker uses:

```text
wss://stream.binance.com:9443/ws/ethusdt@miniTicker
```

If a region or hosting provider blocks the global Binance endpoint, pass a custom endpoint through `priceTicker.streamUrl`.

## Lovable Master Prompt Snippet

```text
Use the existing RainbowKit/wagmi providers. Install github:elmstrya7-svg/eth-bot-vault-rainbowkit. Import useEthBotDashboard from eth-bot-vault-rainbowkit. Do not use environment variables or custom RPC URLs. Let the connected Chrome wallet provide mainnet reads and deploy the vault by calling deployment.deployVault, then use deployment.vaultAddress from local browser storage. Wallet ETH balance must come from the package hook. Replace all demo ETH price, source, wallet balance, contract balance, allocation, and engine status fields with useEthBotDashboard. Wire Deploy Vault Contract to deployment.deployVault, Fund Contract to vault.depositEth(amount), Activate Engine to vault.activateStrategyEngine, Pause Engine to vault.deactivateStrategyEngine, and Withdraw Available ETH to vault.withdrawAll. Keep engine controls in a separate section from contract funding. Keep every real wallet action behind the user's RainbowKit wallet confirmation.
```

## Off-Chain Trading Automation

Ethereum contracts are passive. Off-chain software must decide when to trade. This repo includes a starter execution path:

```text
EthBotVault -> strategy wallet -> bot/executor-searcher.js -> BotTradeExecutor -> approved DEX/router target
```

The executor only calls owner-approved targets. Target approvals now require deployed contract code and pin the approved target code hash. If a target's code hash changes, execution reverts. The bot runner uses `viem`, checks executor state, simulates `executeTrade`, and only broadcasts when `BOT_EXECUTE=true`.

Dry run:

```bash
EXECUTOR_ADDRESS=0xExecutor \
TRADE_TARGET=0xApprovedTarget \
TRADE_CALLDATA=0x \
BOT_ACCOUNT_ADDRESS=0xStrategyWallet \
npm run bot:simulate
```

Execution:

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

For real trading, add a strategy module that builds calldata for a specific protocol and sets a conservative minimum balance after execution.

The included Uniswap V2-style adapter can quote and simulate an ETH -> token -> ETH route without an API key:

```bash
EXECUTOR_ADDRESS=0xExecutor \
TRADE_TOKEN=0xToken \
TRADE_VALUE_ETH=0.01 \
MIN_PROFIT_ETH=0 \
BOT_ACCOUNT_ADDRESS=0xStrategyWallet \
npm run bot:uniswap-v2
```

The route only executes when the router and token are approved in `BotTradeExecutor`, the round trip passes simulation, and `BOT_EXECUTE=true` is set.

For a browser/Lovable app with no custom RPC endpoint, use the exported helpers `previewUniswapV2RoundTrip` and `approveUniswapV2RoundTripToken`. They read through the connected browser wallet provider.

## Mainnet Testing Checklist

1. Deploy the vault.
2. Verify contract source on Etherscan before asking anyone else to use it.
3. Connect with RainbowKit.
4. Use `Fund Contract` with a very small amount first, for example `0.0001 ETH`.
5. Use `Activate Engine` and inspect the wallet confirmation before signing.
6. Test `Pause Engine`.
7. Test `Withdraw Available ETH` using funds still held by the contract.

This package is not a complete trading strategy or financial product. It provides live ETH data, wallet state, contract funding, engine activation state, and a restricted execution scaffold. Strategy design, risk controls, monitoring, and user withdrawal operations outside contract-held ETH still need to be built.
