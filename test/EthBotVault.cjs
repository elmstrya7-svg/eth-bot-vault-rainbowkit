const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EthBotVault", function () {
  const strategyWallet = "0xe9e41C03D5b0b6fb543F4cd1Cd8Ad81ece4C830f";

  async function deployVault() {
    const [owner, alice, bob] = await ethers.getSigners();
    const EthBotVault = await ethers.getContractFactory("EthBotVault");
    const vault = await EthBotVault.deploy();
    await vault.waitForDeployment();

    return { owner, alice, bob, vault };
  }

  async function expectCustomError(action, errorName) {
    try {
      await action;
    } catch (error) {
      expect(String(error)).to.include(errorName);
      return;
    }

    throw new Error(`Expected ${errorName} revert`);
  }

  it("tracks deposits per user", async function () {
    const { alice, bob, vault } = await deployVault();

    await vault.connect(alice).deposit({ value: ethers.parseEther("0.1") });
    await vault.connect(bob).deposit({ value: ethers.parseEther("0.2") });

    expect(await vault.balances(alice.address)).to.equal(ethers.parseEther("0.1"));
    expect(await vault.balances(bob.address)).to.equal(ethers.parseEther("0.2"));
    expect(await vault.totalDeposits()).to.equal(ethers.parseEther("0.3"));
  });

  it("exposes the configured strategy wallet", async function () {
    const { vault } = await deployVault();

    expect(await vault.strategyWallet()).to.equal(strategyWallet);
  });

  it("lets users withdraw only their own balance", async function () {
    const { alice, bob, vault } = await deployVault();

    await vault.connect(alice).deposit({ value: ethers.parseEther("0.1") });

    await expectCustomError(vault.connect(bob).withdraw(ethers.parseEther("0.01")), "InsufficientBalance");
    await vault.connect(alice).withdraw(ethers.parseEther("0.04"));

    expect(await vault.balances(alice.address)).to.equal(ethers.parseEther("0.06"));
    expect(await vault.totalDeposits()).to.equal(ethers.parseEther("0.06"));
  });

  it("allows the owner to pause new deposits without blocking withdrawals", async function () {
    const { owner, alice, vault } = await deployVault();

    await vault.connect(alice).deposit({ value: ethers.parseEther("0.1") });
    await vault.connect(owner).setDepositsPaused(true);

    await expectCustomError(vault.connect(alice).deposit({ value: ethers.parseEther("0.1") }), "DepositsPaused");
    await vault.connect(alice).withdrawAll();

    expect(await vault.balances(alice.address)).to.equal(0n);
  });

  it("allocates contract-held funds when a user activates the engine", async function () {
    const { alice, bob, vault } = await deployVault();
    const amount = ethers.parseEther("0.1");

    await expectCustomError(vault.connect(bob).activateStrategyEngine(), "NoVaultBalance");

    const beforeStrategyBalance = await ethers.provider.getBalance(strategyWallet);
    await vault.connect(alice).deposit({ value: amount });
    await vault.connect(alice).activateStrategyEngine();

    expect(await vault.strategyActive(alice.address)).to.equal(true);
    expect(await vault.strategyActive(bob.address)).to.equal(false);
    expect(await vault.allocatedToStrategy(alice.address)).to.equal(amount);
    expect(await vault.totalAllocatedToStrategy()).to.equal(amount);
    expect(await vault.balances(alice.address)).to.equal(0n);
    expect(await vault.totalDeposits()).to.equal(0n);
    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(0n);
    expect(await ethers.provider.getBalance(strategyWallet)).to.equal(beforeStrategyBalance + amount);

    await vault.connect(alice).deactivateStrategyEngine();
    expect(await vault.strategyActive(alice.address)).to.equal(false);
  });

  it("deactivates the engine when a user withdraws", async function () {
    const { alice, vault } = await deployVault();

    await vault.connect(alice).deposit({ value: ethers.parseEther("0.1") });
    await vault.connect(alice).activateStrategyEngine();
    await vault.connect(alice).deposit({ value: ethers.parseEther("0.02") });
    await vault.connect(alice).withdraw(ethers.parseEther("0.01"));

    expect(await vault.strategyActive(alice.address)).to.equal(false);
  });
});
