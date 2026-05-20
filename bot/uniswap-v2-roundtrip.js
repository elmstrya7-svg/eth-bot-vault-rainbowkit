#!/usr/bin/env node
import {
  encodeFunctionData,
  formatEther,
  isAddress,
  maxUint256,
  parseAbi,
  parseEther
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createBotPublicClient, createBotWalletClient, providerMode } from "./provider.js";

const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const executorAbi = parseAbi([
  "function approvedSelectors(address target,bytes4 selector) view returns (bool)",
  "function approvedTargets(address target) view returns (bool)",
  "function approvedTokens(address token) view returns (bool)",
  "function approveToken(address token,address spender,uint256 amount)",
  "function botWallet() view returns (address)",
  "function executeBatch(address[] targets,uint256[] values,bytes[] payloads,uint256 minBalanceAfter) payable returns (bytes[])",
  "function paused() view returns (bool)"
]);

const SWAP_EXACT_ETH_FOR_TOKENS_SELECTOR = "0x7ff36ab5";
const SWAP_EXACT_TOKENS_FOR_ETH_SELECTOR = "0x18cbafe5";

const erc20Abi = parseAbi([
  "function allowance(address owner,address spender) view returns (uint256)"
]);

const routerAbi = parseAbi([
  "function getAmountsOut(uint amountIn,address[] calldata path) view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin,address[] calldata path,address to,uint deadline) payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) returns (uint[] memory amounts)"
]);

function requiredAddress(name) {
  const value = process.env[name];
  if (!value || !isAddress(value)) throw new Error(`${name} must be a valid Ethereum address.`);
  return value;
}

function optionalAddress(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!isAddress(value)) throw new Error(`${name} must be a valid Ethereum address.`);
  return value;
}

function ethEnv(name, fallback) {
  const value = process.env[name];
  return value ? parseEther(value) : fallback;
}

function intEnv(name, fallback) {
  const value = process.env[name];
  return value ? Number.parseInt(value, 10) : fallback;
}

function applySlippage(value, slippageBps) {
  return (value * BigInt(10_000 - slippageBps)) / 10_000n;
}

const rpcUrl = process.env.BOT_RPC_URL;
const executorAddress = requiredAddress("EXECUTOR_ADDRESS");
const tokenAddress = requiredAddress("TRADE_TOKEN");
const routerAddress = optionalAddress("ROUTER_ADDRESS", UNISWAP_V2_ROUTER);
const wethAddress = optionalAddress("WETH_ADDRESS", WETH);
const tradeValue = ethEnv("TRADE_VALUE_ETH", parseEther("0.01"));
const minProfit = ethEnv("MIN_PROFIT_ETH", 0n);
const slippageBps = intEnv("SLIPPAGE_BPS", 50);
const deadlineSeconds = intEnv("DEADLINE_SECONDS", 180);
const shouldExecute = process.env.BOT_EXECUTE === "true";
const privateKey = process.env.BOT_PRIVATE_KEY;
const dryRunAccount = process.env.BOT_ACCOUNT_ADDRESS;

if (slippageBps < 0 || slippageBps > 1_000) {
  throw new Error("SLIPPAGE_BPS must be between 0 and 1000.");
}

const publicClient = createBotPublicClient(rpcUrl);

const account = privateKey
  ? privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`)
  : dryRunAccount && isAddress(dryRunAccount)
    ? dryRunAccount
    : undefined;

if (!account) throw new Error("Set BOT_PRIVATE_KEY for execution or BOT_ACCOUNT_ADDRESS for dry-run simulation.");

const [paused, botWallet, routerApproved, buySelectorApproved, sellSelectorApproved, tokenApproved, executorBalance] = await Promise.all([
  publicClient.readContract({ address: executorAddress, abi: executorAbi, functionName: "paused" }),
  publicClient.readContract({ address: executorAddress, abi: executorAbi, functionName: "botWallet" }),
  publicClient.readContract({ address: executorAddress, abi: executorAbi, functionName: "approvedTargets", args: [routerAddress] }),
  publicClient.readContract({ address: executorAddress, abi: executorAbi, functionName: "approvedSelectors", args: [routerAddress, SWAP_EXACT_ETH_FOR_TOKENS_SELECTOR] }),
  publicClient.readContract({ address: executorAddress, abi: executorAbi, functionName: "approvedSelectors", args: [routerAddress, SWAP_EXACT_TOKENS_FOR_ETH_SELECTOR] }),
  publicClient.readContract({ address: executorAddress, abi: executorAbi, functionName: "approvedTokens", args: [tokenAddress] }),
  publicClient.getBalance({ address: executorAddress })
]);

if (paused) throw new Error("Executor is paused.");
if (!routerApproved) throw new Error("Router is not approved in BotTradeExecutor.");
if (!buySelectorApproved) throw new Error("Router buy selector is not approved in BotTradeExecutor.");
if (!sellSelectorApproved) throw new Error("Router sell selector is not approved in BotTradeExecutor.");
if (!tokenApproved) throw new Error("Trade token is not approved in BotTradeExecutor.");
if (executorBalance < tradeValue) throw new Error("Executor balance is lower than TRADE_VALUE_ETH.");

const buyPath = [wethAddress, tokenAddress];
const sellPath = [tokenAddress, wethAddress];
const [buyQuote, sellQuote] = await Promise.all([
  publicClient.readContract({ address: routerAddress, abi: routerAbi, functionName: "getAmountsOut", args: [tradeValue, buyPath] }),
  publicClient.readContract({
    address: routerAddress,
    abi: routerAbi,
    functionName: "getAmountsOut",
    args: [
      (await publicClient.readContract({
        address: routerAddress,
        abi: routerAbi,
        functionName: "getAmountsOut",
        args: [tradeValue, buyPath]
      }))[1],
      sellPath
    ]
  })
]);

const expectedTokenOut = buyQuote[1];
const expectedEthOut = sellQuote[1];
const expectedProfit = expectedEthOut - tradeValue;

console.log(`Executor: ${executorAddress}`);
console.log(`Provider mode: ${providerMode(rpcUrl)}`);
console.log(`Bot wallet: ${botWallet}`);
console.log(`Router: ${routerAddress}`);
console.log(`Token: ${tokenAddress}`);
console.log(`Executor balance: ${formatEther(executorBalance)} ETH`);
console.log(`Trade value: ${formatEther(tradeValue)} ETH`);
console.log(`Expected token out: ${expectedTokenOut.toString()}`);
console.log(`Expected ETH after round trip: ${formatEther(expectedEthOut)} ETH`);
console.log(`Expected profit before gas: ${formatEther(expectedProfit)} ETH`);

if (expectedProfit < minProfit) {
  throw new Error(`Expected profit ${formatEther(expectedProfit)} ETH is below MIN_PROFIT_ETH ${formatEther(minProfit)} ETH.`);
}

const allowance = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: "allowance",
  args: [executorAddress, routerAddress]
});

const walletClient = privateKey
  ? createBotWalletClient({ account, rpcUrl })
  : undefined;

if (allowance < expectedTokenOut) {
  console.log("Executor token allowance is lower than expected token output.");

  if (!shouldExecute || !walletClient) {
    console.log("Dry run stopped before batch simulation. Run once with BOT_EXECUTE=true and BOT_PRIVATE_KEY to approve the router.");
    process.exit(0);
  }

  const approvalHash = await walletClient.writeContract({
    address: executorAddress,
    abi: executorAbi,
    functionName: "approveToken",
    args: [tokenAddress, routerAddress, maxUint256]
  });

  console.log(`Submitted executor token approval: ${approvalHash}`);
  await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  console.log("Executor token approval confirmed.");
}

const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
const buyCalldata = encodeFunctionData({
  abi: routerAbi,
  functionName: "swapExactETHForTokens",
  args: [applySlippage(expectedTokenOut, slippageBps), buyPath, executorAddress, deadline]
});
const sellCalldata = encodeFunctionData({
  abi: routerAbi,
  functionName: "swapExactTokensForETH",
  args: [expectedTokenOut, applySlippage(expectedEthOut, slippageBps), sellPath, executorAddress, deadline]
});
const minBalanceAfter = executorBalance + minProfit;

const simulation = await publicClient.simulateContract({
  account,
  address: executorAddress,
  abi: executorAbi,
  functionName: "executeBatch",
  args: [
    [routerAddress, routerAddress],
    [tradeValue, 0n],
    [buyCalldata, sellCalldata],
    minBalanceAfter
  ]
});

console.log(`Batch simulation passed. Minimum executor balance after: ${formatEther(minBalanceAfter)} ETH`);

if (!shouldExecute) {
  console.log("Dry run only. Set BOT_EXECUTE=true and BOT_PRIVATE_KEY to execute.");
  process.exit(0);
}

if (!walletClient) throw new Error("BOT_PRIVATE_KEY is required when BOT_EXECUTE=true.");

const hash = await walletClient.writeContract(simulation.request);
console.log(`Submitted round-trip transaction: ${hash}`);
