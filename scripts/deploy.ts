import hre from "hardhat";

const { ethers, network } = hre as typeof hre & {
  ethers: {
    getContractFactory: (name: string) => Promise<any>;
  };
};

async function main() {
  if (network.name === "mainnet") {
    console.log("Deploying EthBotVault to Ethereum mainnet.");
  }

  const EthBotVault = await ethers.getContractFactory("EthBotVault");
  const vault = await EthBotVault.deploy();
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log(`EthBotVault deployed to: ${address}`);
  console.log("Use this address as VITE_ETH_BOT_VAULT_ADDRESS in your Lovable app.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
