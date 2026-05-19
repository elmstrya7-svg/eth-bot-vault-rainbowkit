# Lovable Master Prompt: EtherTrade Lite Trading Bot Dashboard

Use this prompt in Lovable to create or upgrade the EtherTrade Lite dashboard using the GitHub package below. Build the real app UI, not a landing page.

```text
Build a production-style React + TypeScript Ethereum trading bot dashboard called EtherTrade Lite.

Use the existing Vite/React app structure if one already exists. Do not rebuild from scratch if there is already a working dashboard. Preserve the existing visual direction where possible, but replace demo/static trading data with live wallet, live ETH ticker, and smart-contract bot controls.

Install and use this GitHub package:

npm install github:elmstrya7-svg/eth-bot-vault-rainbowkit

Install the required wallet dependencies if they are not already installed:

npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query

Import RainbowKit styles once:

import "@rainbow-me/rainbowkit/styles.css";

Use RainbowKit and wagmi for wallet connection. The app must support Ethereum mainnet. Do not ask users for seed phrases, private keys, exchange API keys, or custody credentials.

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

const WALLETCONNECT_PROJECT_ID = "PASTE_WALLETCONNECT_PROJECT_ID_HERE";
const MAINNET_RPC_URL = "PASTE_MAINNET_RPC_URL_HERE";

const config = createEthBotRainbowKitConfig({
  appName: "EtherTrade Lite",
  walletConnectProjectId: WALLETCONNECT_PROJECT_ID,
  mainnetRpcUrl: MAINNET_RPC_URL
});

Wrap the app:

<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <RainbowKitProvider>
      <App />
    </RainbowKitProvider>
  </QueryClientProvider>
</WagmiProvider>

Do not use environment variables for this build. Use source-code constants instead.

Create a constants file if one does not exist, for example `src/eth-bot-config.ts`:

export const ETH_BOT_VAULT_ADDRESS = "PASTE_DEPLOYED_ETH_BOT_VAULT_CONTRACT_ADDRESS_HERE" as const;

If the app already has RainbowKit/wagmi configured, do not add `WALLETCONNECT_PROJECT_ID` or `MAINNET_RPC_URL` constants. Reuse the existing wallet provider setup and only add `ETH_BOT_VAULT_ADDRESS`.

The bot wallet is already hardcoded inside the package smart contract:

0xe9e41C03D5b0b6fb543F4cd1Cd8Ad81ece4C830f

Do not create a separate input for this bot wallet. Read the trading bot wallet from the contract/package using the package hook.

Important contract behavior:

- User clicks Start Bot & Fund ETH.
- User confirms a wallet transaction.
- ETH is sent into the deployed smart contract.
- The smart contract forwards that ETH to the hardcoded trading bot wallet.
- The package records forwarded amount and bot enabled state.
- Stop Bot updates bot status.
- Withdraw ETH only withdraws ETH still held in the contract. ETH already forwarded to the trading bot wallet is not withdrawable from the contract.
- Make this clear in the UI with a short disclaimer near the Start Bot button.

Use this hook in the dashboard:

const { bot, price, vault, wallet } = useEthBotDashboard({
  vaultAddress: ETH_BOT_VAULT_ADDRESS
});

Data mappings:

ETH live price:
price.priceText

24h change:
price.changePercent24hText

Ticker source:
`${price.source} live`

Ticker status:
price.status

Wallet ETH balance:
`${wallet.formatted} ETH`

Contract-held ETH balance:
`${bot.fundedEth} ETH`

ETH already sent to bot wallet:
`${bot.forwardedEth} ETH`

Estimated USD value sent to bot:
bot.forwardedUsd

Trading bot wallet:
bot.tradingBotWallet

Bot running state:
bot.isRunning

Bot funded state:
bot.isFunded

Pending transaction hash:
vault.pendingHash

Write pending:
vault.isWritePending

Confirming:
vault.isConfirming

Errors:
vault.error
price.error
wallet.error

Actions:

Start Bot & Fund ETH:
vault.fundBotAndStart(amountEth)

Stop Bot:
vault.stopBot()

Withdraw contract-held ETH:
vault.withdrawAll()

Refresh contract reads:
vault.refetch()

Build the UI as an app dashboard, not a marketing page. Use a dense, polished trading dashboard layout with these sections:

1. Top bar
   - App name: EtherTrade Lite
   - Network indicator: Ethereum Mainnet
   - RainbowKit ConnectButton
   - Connected address if available, shortened like 0x1234...abcd

2. Safety notice
   - Short visible notice:
     "Educational/testing tool. Crypto trading involves risk. Every transaction is confirmed in your wallet. Starting the bot forwards the selected ETH amount through the smart contract to the trading bot wallet."
   - Keep it compact, not a hero section.

3. ETH market card
   - Pair: ETH / USDT
   - Live price from Binance via package: price.priceText
   - 24h change: price.changePercent24hText
   - Source: Binance live
   - Status: price.status
   - Updated timestamp if price.updatedAt exists
   - Do not use demo price data.

4. Wallet card
   - Wallet connection status
   - Connected address
   - Wallet ETH balance from wallet.formatted
   - Mainnet status. If wrong network, tell user to switch to Ethereum.

5. Smart contract card
   - Deployed contract address from ETH_BOT_VAULT_ADDRESS
   - Link to Etherscan:
     https://etherscan.io/address/${ETH_BOT_VAULT_ADDRESS}
   - Trading bot wallet from bot.tradingBotWallet
   - Link to Etherscan for bot wallet:
     https://etherscan.io/address/${bot.tradingBotWallet}
   - Contract-held balance for connected user: bot.fundedEth ETH
   - Sent-to-bot total for connected user: bot.forwardedEth ETH

6. Bot controls card
   - Amount input in ETH
   - Quick amount buttons:
     0.005 ETH
     0.01 ETH
     0.025 ETH
     0.05 ETH
   - Button: Start Bot & Fund ETH
     Calls vault.fundBotAndStart(amountEth)
   - Button: Stop Bot
     Calls vault.stopBot()
   - Button: Withdraw Contract ETH
     Calls vault.withdrawAll()
   - Disable all transaction buttons while vault.isWritePending or vault.isConfirming.
   - Disable Start Bot if no wallet is connected, wrong network, amount is empty, amount is zero, or a transaction is pending.
   - Disable Stop Bot if the bot is not running or a transaction is pending.
   - Disable Withdraw if contract-held user balance is zero or a transaction is pending.
   - Show status text:
     - "Connect wallet"
     - "Switch to Ethereum Mainnet"
     - "Ready"
     - "Confirm in wallet"
     - "Waiting for confirmation"
     - "Bot running"
     - "Bot stopped"

7. Transaction status card/feed
   - If vault.pendingHash exists, show:
     - Short hash
     - Link to https://etherscan.io/tx/${vault.pendingHash}
   - Show success state when vault.isConfirmed is true.
   - Show readable error message if vault.error exists.

8. Optional trading preview card
   - Keep it clearly labeled as a preview.
   - Use the live ETH price to estimate USD value of the selected ETH amount.
   - Example fields:
     - Amount ETH
     - Estimated USD value
     - Source: Binance live
   - Do not imply guaranteed profit.

Styling requirements:

- Use a professional dark or neutral dashboard style.
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

const [amountEth, setAmountEth] = useState("0.01");

async function startBot() {
  await vault.fundBotAndStart(amountEth);
}

async function stopBot() {
  await vault.stopBot();
}

async function withdrawContractEth() {
  await vault.withdrawAll();
}

- Wrap async calls in try/catch and display the error message.
- After successful transactions, call vault.refetch().
- Keep all real ETH transfers behind wallet confirmation.

Do not:

- Do not ask for seed phrases.
- Do not ask for private keys.
- Do not create fake wallet balances.
- Do not use demo ETH price after package integration.
- Do not silently send ETH.
- Do not hide the smart contract address.
- Do not hide the trading bot wallet address in the UI.
- Do not claim the Withdraw button can withdraw ETH that has already been forwarded to the bot wallet.

If importing from the GitHub package fails because the repo is private or Lovable cannot access it, stop and tell me exactly what access token or package visibility change is needed. Do not replace it with mock data.

Final deliverable:

- A working EtherTrade Lite dashboard using RainbowKit.
- Live Binance ETH/USDT 1-second ticker via the package.
- Connected wallet ETH balance.
- Contract address and bot wallet address display.
- Start Bot & Fund ETH wired to vault.fundBotAndStart(amountEth).
- Stop Bot wired to vault.stopBot().
- Withdraw Contract ETH wired to vault.withdrawAll().
- Transaction hash and Etherscan links.
- Clear risk and forwarding disclaimer.
```

## Short Follow-Up Prompt For Lovable Fixes

Use this if Lovable partially integrates it but leaves demo data behind:

```text
Remove all remaining demo ETH price, demo source, and fake wallet balances. Use only useEthBotDashboard from eth-bot-vault-rainbowkit. Map price.priceText, price.changePercent24hText, wallet.formatted, bot.fundedEth, bot.forwardedEth, bot.tradingBotWallet, vault.fundBotAndStart, vault.stopBot, and vault.withdrawAll into the existing UI. Keep RainbowKit wallet confirmation for every transaction.
```
