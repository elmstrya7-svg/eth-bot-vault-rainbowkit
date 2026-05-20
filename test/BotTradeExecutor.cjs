const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BotTradeExecutor", function () {
  async function deployExecutor() {
    const [owner, botWallet, outsider] = await ethers.getSigners();
    const BotTradeExecutor = await ethers.getContractFactory("BotTradeExecutor");
    const MockDexTarget = await ethers.getContractFactory("MockDexTarget");
    const MockErc20 = await ethers.getContractFactory("MockErc20");

    const executor = await BotTradeExecutor.deploy(botWallet.address);
    await executor.waitForDeployment();

    const target = await MockDexTarget.deploy();
    await target.waitForDeployment();

    const token = await MockErc20.deploy();
    await token.waitForDeployment();

    return { botWallet, executor, outsider, owner, target, token };
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

  it("only lets the owner approve trade targets and pause execution", async function () {
    const { executor, outsider, target } = await deployExecutor();
    const targetAddress = await target.getAddress();

    await expectCustomError(executor.connect(outsider).setApprovedTarget(targetAddress, true), "NotOwner");
    await executor.setApprovedTarget(targetAddress, true);
    expect(await executor.approvedTargets(targetAddress)).to.equal(true);

    await expectCustomError(executor.connect(outsider).setPaused(true), "NotOwner");
    await executor.setPaused(true);
    expect(await executor.paused()).to.equal(true);
  });

  it("rejects unapproved targets and unauthorized operators", async function () {
    const { executor, outsider, target } = await deployExecutor();
    const data = target.interface.encodeFunctionData("swapWithProfit", [0]);

    await expectCustomError(executor.executeTrade(await target.getAddress(), 0, data, 0), "TargetNotApproved");

    await executor.setApprovedTarget(await target.getAddress(), true);
    await expectCustomError(executor.connect(outsider).executeTrade(await target.getAddress(), 0, data, 0), "NotBotOperator");
  });

  it("executes an approved simulated trade and enforces minimum balance", async function () {
    const { botWallet, executor, owner, target } = await deployExecutor();
    const executorAddress = await executor.getAddress();
    const targetAddress = await target.getAddress();

    await owner.sendTransaction({ to: targetAddress, value: ethers.parseEther("0.02") });
    await botWallet.sendTransaction({ to: executorAddress, value: ethers.parseEther("0.1") });
    await executor.setApprovedTarget(targetAddress, true);

    const data = target.interface.encodeFunctionData("swapWithProfit", [ethers.parseEther("0.01")]);

    await expectCustomError(
      executor.connect(botWallet).executeTrade(targetAddress, ethers.parseEther("0.02"), data, ethers.parseEther("0.2")),
      "MinBalanceNotMet"
    );

    await executor.connect(botWallet).executeTrade(targetAddress, ethers.parseEther("0.02"), data, ethers.parseEther("0.09"));

    expect(await ethers.provider.getBalance(executorAddress)).to.equal(ethers.parseEther("0.11"));
  });

  it("executes approved batches and rejects mismatched arrays", async function () {
    const { botWallet, executor, owner, target } = await deployExecutor();
    const executorAddress = await executor.getAddress();
    const targetAddress = await target.getAddress();

    await owner.sendTransaction({ to: targetAddress, value: ethers.parseEther("0.04") });
    await botWallet.sendTransaction({ to: executorAddress, value: ethers.parseEther("0.1") });
    await executor.setApprovedTarget(targetAddress, true);

    const payload = target.interface.encodeFunctionData("swapWithProfit", [ethers.parseEther("0.01")]);

    await expectCustomError(
      executor.connect(botWallet).executeBatch([targetAddress], [], [payload], 0),
      "InvalidArrayLength"
    );

    await executor
      .connect(botWallet)
      .executeBatch(
        [targetAddress, targetAddress],
        [ethers.parseEther("0.01"), ethers.parseEther("0.01")],
        [payload, payload],
        ethers.parseEther("0.11")
      );

    expect(await ethers.provider.getBalance(executorAddress)).to.equal(ethers.parseEther("0.12"));
  });

  it("approves only whitelisted tokens for approved spenders", async function () {
    const { botWallet, executor, target, token } = await deployExecutor();
    const executorAddress = await executor.getAddress();
    const targetAddress = await target.getAddress();
    const tokenAddress = await token.getAddress();
    const amount = ethers.parseEther("3");

    await token.mint(executorAddress, amount);

    await expectCustomError(executor.connect(botWallet).approveToken(tokenAddress, targetAddress, amount), "TokenNotApproved");
    await executor.setApprovedToken(tokenAddress, true);
    await expectCustomError(executor.connect(botWallet).approveToken(tokenAddress, targetAddress, amount), "TargetNotApproved");

    await executor.setApprovedTarget(targetAddress, true);
    await executor.connect(botWallet).approveToken(tokenAddress, targetAddress, amount);

    expect(await token.allowance(executorAddress, targetAddress)).to.equal(amount);

    const data = target.interface.encodeFunctionData("pullToken", [tokenAddress, ethers.parseEther("1")]);
    await executor.connect(botWallet).executeTrade(targetAddress, 0, data, 0);

    expect(await token.balanceOf(targetAddress)).to.equal(ethers.parseEther("1"));
  });

  it("can withdraw executor funds back to the bot wallet", async function () {
    const { botWallet, executor, owner } = await deployExecutor();
    const executorAddress = await executor.getAddress();

    await owner.sendTransaction({ to: executorAddress, value: ethers.parseEther("0.1") });

    await executor.connect(botWallet).withdrawToBot(ethers.parseEther("0.04"));

    expect(await ethers.provider.getBalance(executorAddress)).to.equal(ethers.parseEther("0.06"));
  });
});
