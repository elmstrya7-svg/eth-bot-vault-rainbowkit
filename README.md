# eth-bot-vault-rainbowkit

Minimal ETH deposit and withdrawal package for a RainbowKit/wagmi app. It includes:

- `contracts/EthBotVault.sol`: a simple mainnet-compatible ETH vault.
- `useEthVault`: a React hook for deposit, withdraw, balance, and transaction state.
- `useEthPriceTicker`: a live Binance `ETHUSDT` ticker over WebSocket.
- `useWalletEthBalance`: the connected wallet ETH balance read directly from the Chrome wallet provider.
- `useEthBotVaultDeployment`: deploys the vault from the connected wallet and stores the address in browser storage.
- `useEthBotDashboard`: a single hook for Lovable dashboards.
- `EthBotPanel`: a Fund Contract, Start Bot, Stop Bot, Withdraw ETH panel.
- `EthVaultPanel`: a basic UI you can drop into a Lovable React app.
- `createEthBotRainbowKitConfig`: a helper for Ethereum mainnet RainbowKit config using the browser-injected wallet by default.

The default flow separates funding from starting the bot. Fund Contract deposits ETH into the deployed contract. Start Bot then forwards the connected wallet's full contract-held balance to the configured bot destination and updates the user's bot status. ETH already forwarded by Start Bot is no longer withdrawable from the contract; backend withdrawal handling should be added before presenting this as a complete live trading product.

## Install in Lovable

After you upload this repo to GitHub, install it from the GitHub repo or from npm.

```bash
npm install github:YOUR_GITHUB_USERNAME/eth-bot-vault-rainbowkit
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

Copy the deployed address and add it to Lovable if you want to use a pre-deployed vault:

```bash
VITE_ETH_BOT_VAULT_ADDRESS=0xYourDeployedVault
```

For the no-env Lovable flow, skip this step and let the dashboard deploy the vault from the connected Chrome wallet. The package stores the deployed address in `localStorage`. If `mainnetRpcUrl` is omitted, the RainbowKit helper routes mainnet contract reads through the connected injected wallet provider instead of a public HTTP RPC fallback. Wallet ETH balance is read directly from `window.ethereum` with `eth_getBalance`.

The deployment hook polls the connected Chrome wallet provider for the deployment receipt and checks that contract code exists at the deployed address. It exposes `deployment.deployStatusText`, `deployment.contractStatusText`, and `deployment.error` so the UI can stop showing "Confirming" when a wallet deployment is cancelled, fails, times out, or points at an address with no contract code.

## Basic Lovable usage

Wrap your app once:

```tsx
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createEthBotRainbowKitConfig, EthBotPanel } from "eth-bot-vault-rainbowkit";

const queryClient = new QueryClient();

const WALLETCONNECT_PROJECT_ID = "PASTE_WALLETCONNECT_PROJECT_ID_HERE";

const config = createEthBotRainbowKitConfig({
  appName: "ETH Trading Bot",
  walletConnectProjectId: WALLETCONNECT_PROJECT_ID
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

## Hook usage

```tsx
import { useEthBotDashboard } from "eth-bot-vault-rainbowkit";

export function EtherTradeLiteData() {
  const { bot, deployment, price, vault, wallet } = useEthBotDashboard({});

  return (
    <div>
      {!deployment.vaultAddress ? (
        <button onClick={deployment.deployVault}>Deploy Vault Contract</button>
      ) : null}
      <div>ETH price: {price.priceText}</div>
      <div>24h change: {price.changePercent24hText}</div>
      <div>Source: {price.source}</div>
      <div>Wallet balance: {wallet.formatted} ETH</div>
      <div>Funded balance: {bot.fundedEth} ETH</div>
      <div>Bot running: {bot.isRunning ? "yes" : "no"}</div>
      <button onClick={() => vault.depositEth("0.01")}>
        Fund Contract 0.01 ETH
      </button>
      <button onClick={vault.startBot}>
        Start Bot
      </button>
      <button onClick={vault.stopBot}>
        Stop Bot
      </button>
      <button onClick={vault.withdrawAll}>Withdraw ETH</button>
    </div>
  );
}
```

## Filling your existing Lovable UI

You do not need to rebuild the Lovable project from scratch if RainbowKit is already installed. Replace the demo data source with `useEthBotDashboard`.

Map the fields like this:

```tsx
const { bot, deployment, price, vault, wallet } = useEthBotDashboard({});

const etherTradeLiteFields = {
  vaultAddress: deployment.vaultAddress,
  deployVault: deployment.deployVault,
  ethUsd: price.priceText,
  change24h: price.changePercent24hText,
  source: `${price.source} live`,
  walletEthBalance: `${wallet.formatted} ETH`,
  contractEthBalance: `${bot.fundedEth} ETH`,
  sentToBotEth: `${bot.forwardedEth} ETH`,
  fundedUsdValue: bot.fundedUsd,
  botStatus: bot.isRunning ? "Running" : bot.isFunded ? "Funded" : "Not funded",
  fundContractEth: vault.depositEth,
  startBot: vault.startBot,
  stopBot: vault.stopBot,
  withdrawEth: vault.withdrawAll
};
```

The Binance ticker uses:

```text
wss://stream.binance.com:9443/ws/ethusdt@miniTicker
```

Binance documents the individual mini ticker stream with `1000ms` update speed. If a region or hosting provider blocks the global Binance endpoint, pass a custom endpoint:

```tsx
useEthBotDashboard({
  priceTicker: {
    streamUrl: "wss://stream.binance.com:9443/ws/ethusdt@miniTicker"
  }
});
```

## Lovable master prompt snippet

```text
Use the existing RainbowKit/wagmi providers. Install github:elmstrya7-svg/eth-bot-vault-rainbowkit. Import useEthBotDashboard from eth-bot-vault-rainbowkit. Do not use environment variables or custom RPC URLs. Let the connected Chrome wallet provide mainnet reads and deploy the vault by calling deployment.deployVault, then use deployment.vaultAddress from local browser storage. Wallet ETH balance must come from the package hook, which reads the Chrome wallet provider directly. Replace all demo ETH price, source, wallet balance, contract balance, sent-to-bot balance, and bot status fields with useEthBotDashboard. Use Binance live ticker from the package. Wire Deploy Vault Contract to deployment.deployVault, Fund Contract to vault.depositEth(amount), Start Bot to vault.startBot, Stop Bot to vault.stopBot, and Withdraw ETH to vault.withdrawAll. Keep the bot controls in a separate section from contract funding. Do not show the bot destination address in the trading interface. Keep every real wallet action behind the user's RainbowKit wallet confirmation.
```

## Publish this package to GitHub and npm

Create a new GitHub repo, then run:

```bash
git init -b main
git add .
git commit -m "Initial ETH bot vault package"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/eth-bot-vault-rainbowkit.git
git push -u origin main
```

To publish to npm so Lovable can install it by package name:

```bash
npm login
npm run build
npm publish --access public
```

Then anyone can install it with:

```bash
npm install eth-bot-vault-rainbowkit
```

The included `npx` command works after npm publish:

```bash
npx eth-bot-vault-rainbowkit init
```

## Mainnet testing checklist

1. Deploy the vault.
2. Verify the contract source on Etherscan before asking anyone else to use it.
3. Add the vault address to Lovable.
4. Connect with RainbowKit.
5. Use `Fund Contract` with a very small amount first, for example `0.0001 ETH`.
6. Use `Start Bot` and confirm the contract-held ETH was forwarded.
7. Test `Stop Bot`.

This package is not a complete trading strategy or financial product. It provides live ETH data, wallet state, contract funding, and bot start/stop state. Backend trading and backend withdrawal handling still need to be built.
