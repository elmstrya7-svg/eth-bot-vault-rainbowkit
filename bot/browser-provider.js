import { createPublicClient, createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";

export function getBrowserEthereumProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No browser wallet provider found. Open this from a wallet-enabled browser or provide BOT_RPC_URL.");
  }

  return window.ethereum;
}

export function createBrowserPublicClient() {
  return createPublicClient({
    chain: mainnet,
    transport: custom(getBrowserEthereumProvider())
  });
}

export function createBrowserWalletClient(account) {
  return createWalletClient({
    account,
    chain: mainnet,
    transport: custom(getBrowserEthereumProvider())
  });
}
