#!/usr/bin/env node
import {
  formatEther,
  isAddress,
  parseAbi,
  parseEther
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createBotPublicClient, createBotWalletClient, providerMode } from "./provider.js";

const executorAbi = parseAbi([
  "function approvedSelectors(address target,bytes4 selector) view returns (bool)",
  "function approvedTargets(address target) view returns (bool)",
  "function botWallet() view returns (address)",
  "function executeTrade(address target,uint256 value,bytes data,uint256 minBalanceAfter) payable returns (bytes)",
  "function paused() view returns (bool)"
]);

function requiredAddress(name) {
  const value = process.env[name];
  if (!value || !isAddress(value)) {
    throw new Error(`${name} must be a valid Ethereum address.`);
  }
  return value;
}

function bigintEnv(name, fallback = 0n) {
  const value = process.env[name];
  if (!value) return fallback;
  return BigInt(value);
}

function ethEnv(name, fallback = 0n) {
  const value = process.env[name];
  if (!value) return fallback;
  return parseEther(value);
}

function hexEnv(name, fallback = "0x") {
  const value = process.env[name] ?? fallback;
  if (!/^0x([a-fA-F0-9]{2})*$/.test(value)) {
    throw new Error(`${name} must be 0x-prefixed hex calldata.`);
  }
  return value;
}

const rpcUrl = process.env.BOT_RPC_URL;
const executorAddress = requiredAddress("EXECUTOR_ADDRESS");
const targetAddress = requiredAddress("TRADE_TARGET");
const calldata = hexEnv("TRADE_CALLDATA");
const calldataSelector = calldata.length >= 10 ? calldata.slice(0, 10) : undefined;
const tradeValue = ethEnv("TRADE_VALUE_ETH", bigintEnv("TRADE_VALUE_WEI"));
const minBalanceAfter = ethEnv("MIN_EXECUTOR_BALANCE_AFTER_ETH", bigintEnv("MIN_EXECUTOR_BALANCE_AFTER_WEI"));
const shouldExecute = process.env.BOT_EXECUTE === "true";
const dryRunAccount = process.env.BOT_ACCOUNT_ADDRESS;
const privateKey = process.env.BOT_PRIVATE_KEY;

const publicClient = createBotPublicClient(rpcUrl);

const account = privateKey
  ? privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`)
  : dryRunAccount && isAddress(dryRunAccount)
    ? dryRunAccount
    : undefined;

if (!account) {
  throw new Error("Set BOT_PRIVATE_KEY for execution or BOT_ACCOUNT_ADDRESS for dry-run simulation.");
}
if (!calldataSelector) {
  throw new Error("TRADE_CALLDATA must include a 4-byte function selector.");
}

const [paused, botWallet, targetApproved, selectorApproved, executorBalance] = await Promise.all([
  publicClient.readContract({
    address: executorAddress,
    abi: executorAbi,
    functionName: "paused"
  }),
  publicClient.readContract({
    address: executorAddress,
    abi: executorAbi,
    functionName: "botWallet"
  }),
  publicClient.readContract({
    address: executorAddress,
    abi: executorAbi,
    functionName: "approvedTargets",
    args: [targetAddress]
  }),
  publicClient.readContract({
    address: executorAddress,
    abi: executorAbi,
    functionName: "approvedSelectors",
    args: [targetAddress, calldataSelector]
  }),
  publicClient.getBalance({ address: executorAddress })
]);

console.log(`Executor: ${executorAddress}`);
console.log(`Provider mode: ${providerMode(rpcUrl)}`);
console.log(`Bot wallet: ${botWallet}`);
console.log(`Target: ${targetAddress}`);
console.log(`Selector: ${calldataSelector}`);
console.log(`Executor balance: ${formatEther(executorBalance)} ETH`);
console.log(`Trade value: ${formatEther(tradeValue)} ETH`);
console.log(`Minimum balance after: ${formatEther(minBalanceAfter)} ETH`);

if (paused) throw new Error("Executor is paused.");
if (!targetApproved) throw new Error("Trade target is not approved by the executor owner.");
if (!selectorApproved) throw new Error("Trade selector is not approved for this target.");

const simulation = await publicClient.simulateContract({
  account,
  address: executorAddress,
  abi: executorAbi,
  functionName: "executeTrade",
  args: [targetAddress, tradeValue, calldata, minBalanceAfter],
  value: tradeValue
});

console.log("Simulation passed.");

if (!shouldExecute) {
  console.log("Dry run only. Set BOT_EXECUTE=true and BOT_PRIVATE_KEY to send the transaction.");
  process.exit(0);
}

if (!privateKey) {
  throw new Error("BOT_PRIVATE_KEY is required when BOT_EXECUTE=true.");
}

const walletClient = createBotWalletClient({
  account,
  rpcUrl
});

const hash = await walletClient.writeContract(simulation.request);
console.log(`Submitted trade transaction: ${hash}`);
