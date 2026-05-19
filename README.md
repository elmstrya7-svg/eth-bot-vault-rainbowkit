# eth-bot-vault-rainbowkit

Minimal ETH deposit and withdrawal package for a RainbowKit/wagmi app. It includes:

- `contracts/EthBotVault.sol`: a simple mainnet-compatible ETH vault.
- `useEthVault`: a React hook for deposit, withdraw, balance, and transaction state.
- `useEthPriceTicker`: a live Binance `ETHUSDT` ticker over WebSocket.
- `useWalletEthBalance`: the connected wallet ETH balance from wagmi.
- `useEthBotDashboard`: a single hook for Lovable dashboards.
- `EthBotPanel`: a Fund ETH, Start Bot, Stop Bot, Withdraw ETH panel.
- `EthVaultPanel`: a basic UI you can drop into a Lovable React app.
- `createEthBotRainbowKitConfig`: a helper for Ethereum mainnet RainbowKit config.

Users can withdraw only the ETH they deposited from their own wallet. There is no owner function that can withdraw user funds. `startBot()` only records that a funded user has enabled automation; your Lovable/backend bot should read that state before running any strategy.

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

Copy the deployed address and add it to Lovable:

```bash
VITE_ETH_BOT_VAULT_ADDRESS=0xYourDeployedVault
```

## Basic Lovable usage

Wrap your app once:

```tsx
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createEthBotRainbowKitConfig, EthBotPanel } from "eth-bot-vault-rainbowkit";

const queryClient = new QueryClient();

const config = createEthBotRainbowKitConfig({
  appName: "ETH Trading Bot",
  walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  mainnetRpcUrl: import.meta.env.VITE_MAINNET_RPC_URL
});

export function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ConnectButton />
          <EthBotPanel vaultAddress={import.meta.env.VITE_ETH_BOT_VAULT_ADDRESS} />
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
  const { bot, price, vault, wallet } = useEthBotDashboard({
    vaultAddress: import.meta.env.VITE_ETH_BOT_VAULT_ADDRESS
  });

  return (
    <div>
      <div>ETH price: {price.priceText}</div>
      <div>24h change: {price.changePercent24hText}</div>
      <div>Source: {price.source}</div>
      <div>Wallet balance: {wallet.formatted} ETH</div>
      <div>Funded balance: {bot.fundedEth} ETH</div>
      <div>Bot running: {bot.isRunning ? "yes" : "no"}</div>
      <button onClick={() => vault.depositEth("0.01")}>Fund ETH</button>
      <button onClick={bot.isRunning ? vault.stopBot : vault.startBot}>
        {bot.isRunning ? "Stop Bot" : "Start Bot"}
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
const { bot, price, vault, wallet } = useEthBotDashboard({
  vaultAddress: import.meta.env.VITE_ETH_BOT_VAULT_ADDRESS
});

const etherTradeLiteFields = {
  ethUsd: price.priceText,
  change24h: price.changePercent24hText,
  source: `${price.source} live`,
  walletEthBalance: `${wallet.formatted} ETH`,
  fundedEthBalance: `${bot.fundedEth} ETH`,
  fundedUsdValue: bot.fundedUsd,
  botStatus: bot.isRunning ? "Running" : bot.isFunded ? "Funded" : "Not funded",
  fundEth: vault.depositEth,
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
  vaultAddress: import.meta.env.VITE_ETH_BOT_VAULT_ADDRESS,
  priceTicker: {
    streamUrl: "wss://stream.binance.com:9443/ws/ethusdt@miniTicker"
  }
});
```

## Lovable master prompt snippet

```text
Use the existing RainbowKit/wagmi providers. Install github:elmstrya7-svg/eth-bot-vault-rainbowkit. Import useEthBotDashboard from eth-bot-vault-rainbowkit. Replace all demo ETH price, source, wallet balance, funded bot balance, and bot status fields with useEthBotDashboard. Use Binance live ticker from the package. Wire Fund ETH to vault.depositEth(amount), Start Bot to vault.startBot, Stop Bot to vault.stopBot, and Withdraw ETH to vault.withdrawAll. Keep every real wallet action behind the user's RainbowKit wallet confirmation.
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
5. Deposit a very small amount first, for example `0.0001 ETH`.
6. Withdraw it back to the same wallet.

This package is not a complete trading strategy or financial product. It only provides the deposit and withdrawal rail.
