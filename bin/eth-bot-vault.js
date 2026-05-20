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
  npx hardhat run scripts/deploy.cjs --network mainnet

Lovable install:
  npm install eth-bot-vault-rainbowkit wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
`);
  process.exit(0);
}

if (command === "init") {
  console.log(`
1. Deploy BotTradeExecutor with your bot/operator wallet.
2. Deploy contracts/EthBotVault.sol with the BotTradeExecutor address as the strategy destination.
3. Add VITE_ETH_BOT_VAULT_ADDRESS=<deployed_mainnet_address> to Lovable.
4. Wrap your app in WagmiProvider, QueryClientProvider, and RainbowKitProvider.
5. Render <EthBotPanel vaultAddress={import.meta.env.VITE_ETH_BOT_VAULT_ADDRESS} /> for Fund/Activate/Pause/Withdraw.
6. Run npm run bot:simulate before npm run bot:execute.
`);
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
process.exit(1);
