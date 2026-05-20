# Lovable Master Prompt: EtherTrade Engine Dashboard

Use this prompt in Lovable to create or upgrade a React + TypeScript Ethereum strategy dashboard. Build the real app UI, not a landing page.

```text
Build a production-style React + TypeScript Ethereum dashboard called EtherTrade Engine.

Use the existing Vite/React app structure if one already exists. Preserve the existing visual direction where possible, but replace demo/static data with live wallet, live ETH ticker, and smart-contract controls.

Install and use this GitHub package:

npm install github:elmstrya7-svg/eth-bot-vault-rainbowkit

Install wallet dependencies if missing:

npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query

Import RainbowKit styles once:

import "@rainbow-me/rainbowkit/styles.css";

Use RainbowKit and wagmi for wallet connection. Configure RainbowKit with the package helper so it exposes the browser-injected Chrome wallet connector only. The app must support Ethereum mainnet. Do not ask users for seed phrases, private keys, exchange API keys, or custody credentials.

Lovable must not implement contract logic, ABI calls, bytecode, deployment code, wallet balance reads, or execution internals itself. The GitHub package owns all smart-contract behavior. Lovable should only build the React dashboard and call the exported package hooks/actions listed below.

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
  appName: "EtherTrade Engine"
});

Wrap the app:

<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <RainbowKitProvider>
      <App />
    </RainbowKitProvider>
  </QueryClientProvider>
</WagmiProvider>

Do not use environment variables or custom RPC URLs for this Lovable build. When mainnetRpcUrl is omitted, the package uses the connected Chrome wallet provider for Ethereum mainnet reads. Wallet ETH balance must come only from the package hook, which reads window.ethereum directly with eth_getBalance.

The vault contract address must be created live inside the dashboard by calling the package deployment action. The package stores the deployed vault address in browser localStorage.

Use this hook:

const { engine, deployment, price, vault, wallet } = useEthBotDashboard({});

Data mappings:

ETH live price:
price.priceText

24h change:
price.changePercent24hText

Ticker status:
price.status

Wallet ETH balance:
`${wallet.formatted} ETH`

Available contract ETH:
`${engine.availableEth} ETH`

Strategy wallet:
engine.strategyWallet

ETH allocated to the strategy engine:
`${engine.allocatedEth} ETH`

Estimated USD value allocated:
engine.allocatedUsd

Engine active:
engine.isActive

Engine funded:
engine.isFunded

Deployed vault contract:
deployment.vaultAddress

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

Activate Engine:
vault.activateStrategyEngine()

Pause Engine:
vault.deactivateStrategyEngine()

Withdraw Available ETH:
vault.withdrawAll()

Refresh contract reads:
vault.refetch()

Build the UI as an app dashboard, not a marketing page. The first screen must be simple enough for a non-technical user to understand in one pass: connect wallet, check ETH/wallet status, fund the contract, activate or pause the engine, and view the latest transaction. Use short labels, compact helper text, and avoid exposing implementation-heavy terms in visible UI copy.

Recommended first-screen layout:

- A single top bar.
- A compact two-column desktop grid, collapsing to one column on mobile.
- Left column: ETH market, wallet, and contract status.
- Right column: Fund Contract, Strategy Engine, and transaction status.
- Keep the safety notice as a thin inline banner under the top bar, not a large card.
- Put advanced diagnostics, long addresses, and Etherscan links behind compact rows or small external-link buttons.
- Do not use large hero text, oversized illustrations, fake charts, or decorative panels.

Use a dense, polished dark-mode strategy-control layout with these sections:

1. Top bar
   - App name: EtherTrade Engine
   - Network indicator: Ethereum Mainnet
   - RainbowKit ConnectButton
   - Connected address if available, shortened like 0x1234...abcd

2. Safety notice
   - Short visible notice:
     "Educational/testing tool. On-chain ETH transfers involve risk. Every transaction is confirmed in your wallet. Fund Contract deposits ETH into the smart contract. Activate Engine commits available contract ETH to the configured strategy wallet. Withdraw Available ETH only applies to ETH still held in the contract."
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
   - Link to Etherscan: https://etherscan.io/address/${deployment.vaultAddress}
   - Strategy wallet from engine.strategyWallet, shortened and linked to Etherscan
   - Available contract balance for connected user: engine.availableEth ETH
   - Allocated total for connected user: engine.allocatedEth ETH

6. Fund contract card
   - Button: Deploy Vault Contract
     Calls deployment.deployVault()
   - Amount input in ETH
   - Default amount: 0.0001 ETH
   - Quick amount buttons: 0.0001, 0.0005, 0.001, 0.002 ETH
   - Button: Fund Contract
     Calls vault.depositEth(amountEth)
   - Keep this card visually calm: amount input, quick amounts, one primary action, and one inline validation message area.
   - Disable Fund Contract if no vault has been deployed, no wallet is connected, wrong network, amount is empty, amount is zero, deposits are paused, selected amount is greater than or equal to wallet ETH balance, or a transaction is pending.
   - If the amount is greater than or equal to wallet.balanceEth, show "Amount must be lower than wallet ETH balance so gas can also be paid."

7. Strategy engine controls card
   - This must be visually separate from the Fund Contract card.
   - Button: Activate Engine
     Calls vault.activateStrategyEngine()
   - Button: Pause Engine
     Calls vault.deactivateStrategyEngine()
   - Button: Withdraw Available ETH
     Calls vault.withdrawAll()
   - Keep this card simple: show engine state, available ETH, allocated ETH, and three buttons. Do not add strategy configuration controls.
   - Disable all transaction buttons while vault.isWritePending or vault.isConfirming.
   - Disable Activate Engine if no vault has been deployed, no wallet is connected, wrong network, available contract balance is zero, engine is already active, or a transaction is pending.
   - Disable Pause Engine if engine is not active or a transaction is pending.
   - Disable Withdraw Available ETH if available contract balance is zero or a transaction is pending.
   - Do not add destination or routing inputs.
   - Show engine.strategyWallet with an Etherscan link before users confirm activation.
   - Do not claim this UI performs guaranteed profitable trades, guaranteed arbitrage, audited execution, or risk-free automation.
   - Status text examples:
     - "Connect wallet"
     - "Switch to Ethereum Mainnet"
     - "Deploy vault"
     - "Deploying vault"
     - "Ready"
     - "Confirm in wallet"
     - "Waiting for confirmation"
     - "Engine active"
     - "Engine paused"

8. Transaction status card/feed
   - Use vault.transactionStatusText for the current vault transaction state.
   - If vault.transactionStatus is "cancelled" or "failed", stop showing confirming/loading states immediately and show a readable error message if vault.error exists.
   - If vault.transactionStatus is "confirmed", show a success state and call vault.refetch().
   - If vault.pendingHash exists, show short hash and link to https://etherscan.io/tx/${vault.pendingHash}
   - If deployment.deployHash exists and deployment.vaultAddress is empty, show short deploy hash and deployment.deployStatusText.
   - If deployment.contractStatus is "missing", tell the user no contract was found at the stored address and keep Fund Contract and Activate Engine disabled.
   - Show readable deployment error message if deployment.error exists.
   - Keep it compact: show only the current state, short hash, Etherscan link, and latest readable error.

9. Optional preview card
   - Keep it clearly labeled as a preview.
   - Use the live ETH price to estimate USD value of the selected ETH amount.
   - Do not imply guaranteed profit.

Styling requirements:

- Professional dark-mode dashboard style by default.
- Near-black page background, dark slate cards, light text, muted secondary text, and blue/green/red accents for actions and states.
- No white page background or white cards.
- No marketing hero sections.
- No fake charts unless data is real.
- Compact cards with 8px or smaller border radius.
- First viewport shows dashboard controls immediately.
- Buttons are clear and action-oriented.
- Distinct colors for live/active/paused/error states.
- Responsive on mobile and desktop.
- Text must not overflow buttons or cards.

Implementation details:

- Use React state for the funding amount.
- Wrap async calls in try/catch and display error messages.
- Do not keep a custom local "confirming" state after an action promise rejects. Use package status fields as the source of truth.
- After successful transactions, call vault.refetch().
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
- Do not add destination or routing inputs.
- Do not hide the configured strategy wallet address.
- Do not claim guaranteed profit.
- Do not claim Withdraw Available ETH can recover ETH that is no longer held by the contract.

Final deliverable:

- A working EtherTrade Engine dashboard using RainbowKit.
- Live ETH market ticker via the package.
- Connected wallet ETH balance.
- Live wallet-deployed contract address display.
- Deploy Vault Contract button wired to deployment.deployVault().
- Fund Contract wired to vault.depositEth(amountEth).
- Activate Engine wired to vault.activateStrategyEngine().
- Pause Engine wired to vault.deactivateStrategyEngine().
- Withdraw Available ETH wired to vault.withdrawAll().
- Transaction hash and Etherscan links.
- Clear risk and allocation disclaimer.
```

## Short Follow-Up Prompt For Lovable Fixes

```text
Remove all remaining demo ETH price, demo source labels, provider labels, and fake wallet balances. Use only useEthBotDashboard from eth-bot-vault-rainbowkit. Map deployment.deployVault, deployment.vaultAddress, price.priceText, price.changePercent24hText, wallet.formatted, engine.strategyWallet, engine.availableEth, engine.allocatedEth, vault.depositEth, vault.activateStrategyEngine, vault.deactivateStrategyEngine, and vault.withdrawAll into the existing UI. Do not display price.source or any market data provider name. Keep Fund Contract separate from Strategy Engine controls. Do not add destination or routing inputs. Show engine.strategyWallet with an Etherscan link before users confirm activation. Keep RainbowKit wallet confirmation for every transaction.
```
