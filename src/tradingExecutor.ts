import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  formatEther,
  maxUint256,
  parseAbi,
  type Address,
  type Hex
} from "viem";
import { mainnet } from "viem/chains";
import { BOT_TRADE_EXECUTOR_ABI } from "./executorAbi.js";

const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" as const;
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as const;

const erc20Abi = parseAbi(["function allowance(address owner,address spender) view returns (uint256)"]);
const routerAbi = parseAbi([
  "function getAmountsOut(uint amountIn,address[] calldata path) view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin,address[] calldata path,address to,uint deadline) payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) returns (uint[] memory amounts)"
]);

export type EthereumRequestProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type BrowserWindowWithEthereum = Window & {
  ethereum?: EthereumRequestProvider;
};

export type UniswapV2RoundTripPreview = {
  approvedRouter: boolean;
  approvedToken: boolean;
  botWallet: Address;
  expectedEthOut: bigint;
  expectedProfit: bigint;
  expectedProfitEth: string;
  expectedTokenOut: bigint;
  executorBalance: bigint;
  minBalanceAfter: bigint;
  routerAddress: Address;
  tokenAddress: Address;
  tradeValue: bigint;
};

export type UniswapV2RoundTripOptions = {
  account: Address;
  deadlineSeconds?: number;
  executorAddress: Address;
  minProfit?: bigint;
  provider?: EthereumRequestProvider;
  routerAddress?: Address;
  slippageBps?: number;
  tokenAddress: Address;
  tradeValue: bigint;
  wethAddress?: Address;
};

function getProvider(provider?: EthereumRequestProvider) {
  if (provider) return provider;
  const browserWindow = typeof window !== "undefined" ? (window as BrowserWindowWithEthereum) : undefined;
  if (browserWindow?.ethereum) {
    return browserWindow.ethereum;
  }

  throw new Error("No browser wallet provider available.");
}

function applySlippage(value: bigint, slippageBps: number) {
  return (value * BigInt(10_000 - slippageBps)) / 10_000n;
}

function createClients(provider?: EthereumRequestProvider, account?: Address) {
  const transport = custom(getProvider(provider));
  const publicClient = createPublicClient({ chain: mainnet, transport });
  const walletClient = account ? createWalletClient({ account, chain: mainnet, transport }) : undefined;

  return { publicClient, walletClient };
}

export async function previewUniswapV2RoundTrip(options: UniswapV2RoundTripOptions): Promise<UniswapV2RoundTripPreview> {
  const routerAddress = options.routerAddress ?? UNISWAP_V2_ROUTER;
  const wethAddress = options.wethAddress ?? WETH;
  const slippageBps = options.slippageBps ?? 50;
  const minProfit = options.minProfit ?? 0n;
  const { publicClient } = createClients(options.provider);

  if (slippageBps < 0 || slippageBps > 1_000) throw new Error("slippageBps must be between 0 and 1000.");

  const buyPath = [wethAddress, options.tokenAddress];
  const sellPath = [options.tokenAddress, wethAddress];

  const [paused, botWallet, approvedRouter, approvedToken, executorBalance, buyQuote] = await Promise.all([
    publicClient.readContract({ address: options.executorAddress, abi: BOT_TRADE_EXECUTOR_ABI, functionName: "paused" }),
    publicClient.readContract({ address: options.executorAddress, abi: BOT_TRADE_EXECUTOR_ABI, functionName: "botWallet" }),
    publicClient.readContract({ address: options.executorAddress, abi: BOT_TRADE_EXECUTOR_ABI, functionName: "approvedTargets", args: [routerAddress] }),
    publicClient.readContract({ address: options.executorAddress, abi: BOT_TRADE_EXECUTOR_ABI, functionName: "approvedTokens", args: [options.tokenAddress] }),
    publicClient.getBalance({ address: options.executorAddress }),
    publicClient.readContract({ address: routerAddress, abi: routerAbi, functionName: "getAmountsOut", args: [options.tradeValue, buyPath] })
  ]);

  if (paused) throw new Error("Executor is paused.");

  const expectedTokenOut = buyQuote[1];
  const sellQuote = await publicClient.readContract({
    address: routerAddress,
    abi: routerAbi,
    functionName: "getAmountsOut",
    args: [expectedTokenOut, sellPath]
  });
  const expectedEthOut = sellQuote[1];
  const expectedProfit = expectedEthOut - options.tradeValue;
  const minBalanceAfter = executorBalance + minProfit;

  if (executorBalance < options.tradeValue) throw new Error("Executor balance is lower than tradeValue.");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + (options.deadlineSeconds ?? 180));
  const buyCalldata = encodeFunctionData({
    abi: routerAbi,
    functionName: "swapExactETHForTokens",
    args: [applySlippage(expectedTokenOut, slippageBps), buyPath, options.executorAddress, deadline]
  });
  const sellCalldata = encodeFunctionData({
    abi: routerAbi,
    functionName: "swapExactTokensForETH",
    args: [expectedTokenOut, applySlippage(expectedEthOut, slippageBps), sellPath, options.executorAddress, deadline]
  });

  await publicClient.simulateContract({
    account: options.account,
    address: options.executorAddress,
    abi: BOT_TRADE_EXECUTOR_ABI,
    functionName: "executeBatch",
    args: [[routerAddress, routerAddress], [options.tradeValue, 0n], [buyCalldata, sellCalldata], minBalanceAfter]
  });

  return {
    approvedRouter,
    approvedToken,
    botWallet,
    expectedEthOut,
    expectedProfit,
    expectedProfitEth: formatEther(expectedProfit),
    expectedTokenOut,
    executorBalance,
    minBalanceAfter,
    routerAddress,
    tokenAddress: options.tokenAddress,
    tradeValue: options.tradeValue
  };
}

export async function approveUniswapV2RoundTripToken(options: UniswapV2RoundTripOptions): Promise<Hex | undefined> {
  const routerAddress = options.routerAddress ?? UNISWAP_V2_ROUTER;
  const { publicClient, walletClient } = createClients(options.provider, options.account);
  if (!walletClient) throw new Error("Wallet client is required.");

  const allowance = await publicClient.readContract({
    address: options.tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [options.executorAddress, routerAddress]
  });

  if (allowance >= options.tradeValue) return undefined;

  return walletClient.writeContract({
    address: options.executorAddress,
    abi: BOT_TRADE_EXECUTOR_ABI,
    functionName: "approveToken",
    args: [options.tokenAddress, routerAddress, maxUint256]
  });
}
