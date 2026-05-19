# eth-bot-vault-rainbowkit

Minimal ETH deposit and withdrawal package for a RainbowKit/wagmi app. It includes:

- `contracts/EthBotVault.sol`: a simple mainnet-compatible ETH vault.
- `useEthVault`: a React hook for deposit, withdraw, balance, and transaction state.
- `EthVaultPanel`: a basic UI you can drop into a Lovable React app.
- `createEthBotRainbowKitConfig`: a helper for Ethereum mainnet RainbowKit config.

This first version is intentionally simple: users can withdraw only the ETH they deposited from their own wallet. There is no owner function that can withdraw user funds.

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
import { createEthBotRainbowKitConfig, EthVaultPanel } from "eth-bot-vault-rainbowkit";

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
          <EthVaultPanel vaultAddress={import.meta.env.VITE_ETH_BOT_VAULT_ADDRESS} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

## Hook usage

```tsx
import { useEthVault } from "eth-bot-vault-rainbowkit";

export function DepositButton() {
  const vault = useEthVault({
    vaultAddress: import.meta.env.VITE_ETH_BOT_VAULT_ADDRESS
  });

  return (
    <button onClick={() => vault.depositEth("0.01")} disabled={!vault.isConnected}>
      Deposit 0.01 ETH
    </button>
  );
}
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
