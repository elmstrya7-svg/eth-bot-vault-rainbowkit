const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EthBotVault", function () {
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
});
