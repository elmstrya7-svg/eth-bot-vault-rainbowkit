const hre = require("hardhat");

const { ethers, network } = hre;

async function main() {
  if (network.name === "mainnet") {
    console.log("Deploying EthBotVault to Ethereum mainnet.");
  }

  const [deployer] = await ethers.getSigners();
  const BotTradeExecutor = await ethers.getContractFactory("BotTradeExecutor");
  const executor = await BotTradeExecutor.deploy(deployer.address);
  await executor.waitForDeployment();

  const executorAddress = await executor.getAddress();
  const EthBotVault = await ethers.getContractFactory("EthBotVault");
  const vault = await EthBotVault.deploy(executorAddress);
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log(`Bot wallet/operator: ${deployer.address}`);
  console.log(`BotTradeExecutor deployed to: ${executorAddress}`);
  console.log(`EthBotVault deployed to: ${vaultAddress}`);
  console.log(`Vault strategy destination: ${await vault.strategyWallet()}`);
  console.log("Use the vault address as VITE_ETH_BOT_VAULT_ADDRESS in your Lovable app.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
