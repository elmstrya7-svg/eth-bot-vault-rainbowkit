import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address, Hash } from "viem";
import { useAccount, useChainId, useDeployContract, useSwitchChain } from "wagmi";
import { mainnet } from "wagmi/chains";
import { ETH_BOT_VAULT_ABI } from "./abi.js";
import { ETH_BOT_VAULT_BYTECODE } from "./bytecode.js";

export const DEFAULT_ETH_BOT_VAULT_STORAGE_KEY = "eth-bot-vault-rainbowkit:vault-address";

export type UseEthBotVaultDeploymentOptions = {
  chainId?: number;
  confirmations?: number;
  strategyWalletAddress?: Address;
  storageKey?: string;
  deploymentTimeoutMs?: number;
};

export type DeploymentTransactionStatus = "idle" | "walletPending" | "confirming" | "deployed" | "failed" | "cancelled" | "timeout";
export type DeploymentContractStatus = "unknown" | "checking" | "deployed" | "missing";

export type UseEthBotVaultDeploymentResult = {
  vaultAddress?: Address;
  deployHash?: Hash;
  deployStatus: DeploymentTransactionStatus;
  deployStatusText: string;
  contractStatus: DeploymentContractStatus;
  contractStatusText: string;
  isConnected: boolean;
  isCorrectChain: boolean;
  isDeployPending: boolean;
  isDeploying: boolean;
  isDeployed: boolean;
  error?: Error;
  deployVault: () => Promise<Hash>;
  refetchDeploymentStatus: () => Promise<void>;
  setVaultAddress: (address: Address) => void;
  clearVaultAddress: () => void;
};

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type TransactionReceipt = {
  contractAddress?: string | null;
  status?: string;
};

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function getStoredAddress(storageKey: string): Address | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem(storageKey);
  return value && isAddress(value) ? value : undefined;
}

function getChromeWalletProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

function isUserRejection(error: unknown) {
  const maybeError = error as { code?: number; cause?: { code?: number }; message?: string };
  const message = maybeError.message?.toLowerCase() ?? "";

  return maybeError.code === 4001 || maybeError.cause?.code === 4001 || message.includes("user rejected") || message.includes("user denied");
}

function toError(error: unknown): Error | undefined {
  if (!error) return undefined;
  if (error instanceof Error) return error;
  return new Error(String(error));
}

export function useEthBotVaultDeployment(
  options: UseEthBotVaultDeploymentOptions = {}
): UseEthBotVaultDeploymentResult {
  const requiredChainId = options.chainId ?? mainnet.id;
  const deploymentTimeoutMs = options.deploymentTimeoutMs ?? 240_000;
  const storageKey = options.storageKey ?? DEFAULT_ETH_BOT_VAULT_STORAGE_KEY;
  const chainId = useChainId();
  const account = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [vaultAddress, setVaultAddressState] = useState<Address>();
  const [submittedDeployHash, setSubmittedDeployHash] = useState<Hash>();
  const [deployStatus, setDeployStatus] = useState<DeploymentTransactionStatus>("idle");
  const [deployStatusError, setDeployStatusError] = useState<Error>();
  const [contractStatus, setContractStatus] = useState<DeploymentContractStatus>("unknown");
  const {
    deployContractAsync,
    error: deployError,
    isPending: isDeployPending
  } = useDeployContract();

  useEffect(() => {
    setVaultAddressState(getStoredAddress(storageKey));
  }, [storageKey]);

  const setVaultAddress = useCallback(
    (address: Address) => {
      setVaultAddressState(address);
      setContractStatus("deployed");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, address);
      }
    },
    [storageKey]
  );

  const clearVaultAddress = useCallback(() => {
    setVaultAddressState(undefined);
    setContractStatus("unknown");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const refetchDeploymentStatus = useCallback(async () => {
    const provider = getChromeWalletProvider();
    if (!provider || !vaultAddress) {
      setContractStatus(vaultAddress ? "unknown" : "missing");
      return;
    }

    setContractStatus("checking");

    try {
      const code = await provider.request({
        method: "eth_getCode",
        params: [vaultAddress, "latest"]
      });

      setContractStatus(typeof code === "string" && code !== "0x" ? "deployed" : "missing");
    } catch (error) {
      setContractStatus("unknown");
      setDeployStatusError(toError(error));
    }
  }, [vaultAddress]);

  useEffect(() => {
    void refetchDeploymentStatus();
  }, [refetchDeploymentStatus]);

  useEffect(() => {
    if (!vaultAddress) return;
    const intervalId = window.setInterval(() => {
      void refetchDeploymentStatus();
    }, 15_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refetchDeploymentStatus, vaultAddress]);

  useEffect(() => {
    if (!submittedDeployHash) return;

    const provider = getChromeWalletProvider();
    if (!provider) {
      setDeployStatus("failed");
      setDeployStatusError(new Error("Chrome wallet provider is not available."));
      return;
    }

    const activeProvider = provider;
    let cancelled = false;
    const startedAt = Date.now();

    async function pollReceipt() {
      if (cancelled) return;

      try {
        const receipt = (await activeProvider.request({
          method: "eth_getTransactionReceipt",
          params: [submittedDeployHash]
        })) as TransactionReceipt | null;

        if (!receipt) {
          if (Date.now() - startedAt >= deploymentTimeoutMs) {
            setDeployStatus("timeout");
            setDeployStatusError(new Error("Deployment transaction was not confirmed. It may have been cancelled or replaced in the wallet."));
            return;
          }

          window.setTimeout(() => {
            void pollReceipt();
          }, 4_000);
          return;
        }

        if (receipt.status === "0x0") {
          setDeployStatus("failed");
          setDeployStatusError(new Error("Deployment transaction failed on-chain."));
          return;
        }

        if (receipt.contractAddress && isAddress(receipt.contractAddress)) {
          const code = await activeProvider.request({
            method: "eth_getCode",
            params: [receipt.contractAddress, "latest"]
          });

          if (typeof code === "string" && code !== "0x") {
            setVaultAddress(receipt.contractAddress);
            setDeployStatus("deployed");
            setDeployStatusError(undefined);
            return;
          }
        }

        setDeployStatus("failed");
        setDeployStatusError(new Error("Deployment transaction confirmed, but no contract code was found."));
      } catch (error) {
        setDeployStatus("failed");
        setDeployStatusError(toError(error));
      }
    }

    setDeployStatus("confirming");
    void pollReceipt();

    return () => {
      cancelled = true;
    };
  }, [deploymentTimeoutMs, setVaultAddress, submittedDeployHash]);

  const deployVault = useCallback(async () => {
    if (!account.isConnected) throw new Error("Connect a wallet before deploying the vault.");
    if (chainId !== requiredChainId) await switchChainAsync({ chainId: requiredChainId });

    setDeployStatus("walletPending");
    setDeployStatusError(undefined);

    try {
      const hash = await deployContractAsync({
        abi: ETH_BOT_VAULT_ABI,
        bytecode: ETH_BOT_VAULT_BYTECODE,
        args: [options.strategyWalletAddress ?? account.address!],
        chainId: requiredChainId
      });

      setSubmittedDeployHash(hash);
      setDeployStatus("confirming");
      return hash;
    } catch (error) {
      setDeployStatus(isUserRejection(error) ? "cancelled" : "failed");
      setDeployStatusError(toError(error));
      throw error;
    }
  }, [account.address, account.isConnected, chainId, deployContractAsync, options.strategyWalletAddress, requiredChainId, switchChainAsync]);

  const error = useMemo(() => deployStatusError ?? toError(deployError), [deployError, deployStatusError]);
  const deployStatusText = useMemo(() => {
    if (isDeployPending) return "Confirm in wallet";
    if (deployStatus === "walletPending") return "Confirm in wallet";
    if (deployStatus === "confirming") return "Confirming deployment";
    if (deployStatus === "deployed") return "Vault deployed";
    if (deployStatus === "cancelled") return "Deployment cancelled";
    if (deployStatus === "failed") return "Deployment failed";
    if (deployStatus === "timeout") return "Deployment not confirmed";
    return vaultAddress ? "Vault address loaded" : "Not deployed";
  }, [deployStatus, isDeployPending, vaultAddress]);
  const contractStatusText = useMemo(() => {
    if (!vaultAddress) return "No vault address";
    if (contractStatus === "checking") return "Checking contract";
    if (contractStatus === "deployed") return "Contract live";
    if (contractStatus === "missing") return "No contract found at stored address";
    return "Contract status unknown";
  }, [contractStatus, vaultAddress]);

  return {
    vaultAddress,
    deployHash: submittedDeployHash,
    deployStatus,
    deployStatusText,
    contractStatus,
    contractStatusText,
    isConnected: account.isConnected,
    isCorrectChain: chainId === requiredChainId,
    isDeployPending,
    isDeploying: deployStatus === "walletPending" || deployStatus === "confirming",
    isDeployed: contractStatus === "deployed" && Boolean(vaultAddress),
    error,
    deployVault,
    refetchDeploymentStatus,
    setVaultAddress,
    clearVaultAddress
  };
}
