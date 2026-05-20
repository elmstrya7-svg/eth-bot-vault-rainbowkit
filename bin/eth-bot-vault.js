#!/usr/bin/env node

const command = process.argv[2] ?? "help";

if (command === "help" || command === "--help" || command === "-h") {
  console.log(`
eth-bot-vault

Commands:
  help       Show this message
  init       Print the minimal Lovable integration checklist

Mainnet deploy:
  npm install
  cp .env.example .env
  npm run compile:contracts
  npx hardhat run scripts/deploy.ts --network mainnet

Lovable install:
  npm install eth-bot-vault-rainbowkit wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
`);
  process.exit(0);
}

if (command === "init") {
  console.log(`
1. Deploy contracts/EthBotVault.sol and copy the deployed address.
2. Add VITE_ETH_BOT_VAULT_ADDRESS=<deployed_mainnet_address> to Lovable.
3. Wrap your app in WagmiProvider, QueryClientProvider, and RainbowKitProvider.
4. Render <EthBotPanel vaultAddress={import.meta.env.VITE_ETH_BOT_VAULT_ADDRESS} /> for Fund/Start/Stop/Withdraw.
5. For off-chain execution, deploy BotTradeExecutor and run npm run bot:simulate before npm run bot:execute.
`);
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
process.exit(1);
