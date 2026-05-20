import { createPublicClient, createWalletClient, custom, http } from "viem";
import { mainnet } from "viem/chains";

function getBrowserEthereumProvider() {
  if (typeof window === "undefined" || !window.ethereum) return undefined;
  return window.ethereum;
}

export function createBotPublicClient(rpcUrl) {
  const browserProvider = getBrowserEthereumProvider();

  return createPublicClient({
    chain: mainnet,
    transport: rpcUrl ? http(rpcUrl) : browserProvider ? custom(browserProvider) : http("https://ethereum.publicnode.com")
  });
}

export function createBotWalletClient({ account, rpcUrl }) {
  const browserProvider = getBrowserEthereumProvider();

  return createWalletClient({
    account,
    chain: mainnet,
    transport: rpcUrl ? http(rpcUrl) : browserProvider ? custom(browserProvider) : http("https://ethereum.publicnode.com")
  });
}

export function providerMode(rpcUrl) {
  if (rpcUrl) return "http-rpc";
  if (getBrowserEthereumProvider()) return "browser-wallet";
  return "public-rpc-fallback";
}
