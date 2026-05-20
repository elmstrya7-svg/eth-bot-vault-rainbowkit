import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther, type Address, type Hash } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { ETH_BOT_VAULT_ABI } from "./abi.js";

export type EthVaultAction =
  | "deposit"
  | "withdraw"
  | "withdrawAll"
  | "activateStrategyEngine"
  | "deactivateStrategyEngine";
export type EthVaultTransactionStatus = "idle" | "walletPending" | "confirming" | "confirmed" | "failed" | "cancelled";

export type UseEthVaultOptions = {
  vaultAddress?: Address;
  chainId?: number;
  confirmations?: number;
};

export type UseEthVaultResult = {
  accountAddress?: Address;
  chainId: number;
  requiredChainId: number;
  isConnected: boolean;
  isCorrectChain: boolean;
  balanceWei: bigint;
  balanceEth: string;
  strategyActive: boolean;
  allocatedToStrategyWei: bigint;
  allocatedToStrategyEth: string;
  totalDepositsWei: bigint;
  totalDepositsEth: string;
  totalAllocatedToStrategyWei: bigint;
  totalAllocatedToStrategyEth: string;
  strategyWallet?: Address;
  depositsPaused: boolean;
  pendingHash?: Hash;
  transactionAction?: EthVaultAction;
  transactionStatus: EthVaultTransactionStatus;
  transactionStatusText: string;
  isWritePending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error?: Error;
  depositEth: (amountEth: string) => Promise<Hash>;
  activateStrategyEngine: () => Promise<Hash>;
  deactivateStrategyEngine: () => Promise<Hash>;
  withdrawEth: (amountEth: string) => Promise<Hash>;
  withdrawAll: () => Promise<Hash>;
  refetch: () => void;
};

function toError(error: unknown): Error | undefined {
  if (!error) return undefined;
  if (error instanceof Error) return error;
  return new Error(String(error));
}

function isUserRejection(error: unknown) {
  const maybeError = error as { code?: number; cause?: { code?: number }; message?: string; shortMessage?: string };
  const message = `${maybeError.message ?? ""} ${maybeError.shortMessage ?? ""}`.toLowerCase();

  return maybeError.code === 4001 || maybeError.cause?.code === 4001 || message.includes("user rejected") || message.includes("user denied");
}

function validateAmount(amountEth: string): bigint {
  const normalized = amountEth.trim();
  if (!normalized) throw new Error("Enter an ETH amount.");

  const amount = parseEther(normalized);
  if (amount <= 0n) throw new Error("Amount must be greater than zero.");

  return amount;
}

export function useEthVault(options: UseEthVaultOptions): UseEthVaultResult {
  const requiredChainId = options.chainId ?? mainnet.id;
  const confirmations = options.confirmations ?? 1;
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [submittedHash, setSubmittedHash] = useState<Hash>();
  const [transactionAction, setTransactionAction] = useState<EthVaultAction>();
  const [transactionStatus, setTransactionStatus] = useState<EthVaultTransactionStatus>("idle");
  const [transactionError, setTransactionError] = useState<Error>();
  const {
    error: writeError,
    isPending: isWritePending,
    writeContractAsync
  } = useWriteContract();

  const contractConfig = useMemo(
    () => ({
      address: options.vaultAddress,
      abi: ETH_BOT_VAULT_ABI,
      chainId: requiredChainId
    }),
    [options.vaultAddress, requiredChainId]
  );

  const balanceRead = useReadContract({
    ...contractConfig,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(options.vaultAddress && address)
    }
  });

  const totalDepositsRead = useReadContract({
    ...contractConfig,
    functionName: "totalDeposits",
    query: {
      enabled: Boolean(options.vaultAddress)
    }
  });

  const strategyActiveRead = useReadContract({
    ...contractConfig,
    functionName: "strategyActive",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(options.vaultAddress && address)
    }
  });

  const allocatedToStrategyRead = useReadContract({
    ...contractConfig,
    functionName: "allocatedToStrategy",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(options.vaultAddress && address)
    }
  });

  const totalAllocatedToStrategyRead = useReadContract({
    ...contractConfig,
    functionName: "totalAllocatedToStrategy",
    query: {
      enabled: Boolean(options.vaultAddress)
    }
  });

  const strategyWalletRead = useReadContract({
    ...contractConfig,
    functionName: "strategyWallet",
    query: {
      enabled: Boolean(options.vaultAddress)
    }
  });

  const pausedRead = useReadContract({
    ...contractConfig,
    functionName: "depositsPaused",
    query: {
      enabled: Boolean(options.vaultAddress)
    }
  });

  const wait = useWaitForTransactionReceipt({
    hash: submittedHash,
    chainId: requiredChainId,
    confirmations,
    query: {
      enabled: Boolean(submittedHash)
    }
  });

  const refetch = useCallback(() => {
    void balanceRead.refetch();
    void strategyActiveRead.refetch();
    void allocatedToStrategyRead.refetch();
    void totalDepositsRead.refetch();
    void totalAllocatedToStrategyRead.refetch();
    void strategyWalletRead.refetch();
    void pausedRead.refetch();
  }, [allocatedToStrategyRead, balanceRead, pausedRead, strategyActiveRead, strategyWalletRead, totalAllocatedToStrategyRead, totalDepositsRead]);

  useEffect(() => {
    if (!submittedHash) return;

    if (wait.isSuccess) {
      setTransactionStatus("confirmed");
      setTransactionError(undefined);
      refetch();
    }

    if (wait.isError) {
      setTransactionStatus("failed");
      setTransactionError(toError(wait.error));
    }
  }, [refetch, submittedHash, wait.error, wait.isError, wait.isSuccess]);

  const ensureReady = useCallback(async () => {
    if (!options.vaultAddress) throw new Error("Missing vault contract address.");
    if (!isConnected) throw new Error("Connect a wallet before using the vault.");
    if (chainId !== requiredChainId) await switchChainAsync({ chainId: requiredChainId });
  }, [chainId, isConnected, options.vaultAddress, requiredChainId, switchChainAsync]);

  const writeVaultTransaction = useCallback(
    async (action: EthVaultAction, task: () => Promise<Hash>) => {
      setSubmittedHash(undefined);
      setTransactionAction(action);
      setTransactionStatus("walletPending");
      setTransactionError(undefined);

      try {
        const hash = await task();
        setSubmittedHash(hash);
        setTransactionStatus("confirming");
        return hash;
      } catch (error) {
        setTransactionStatus(isUserRejection(error) ? "cancelled" : "failed");
        setTransactionError(toError(error));
        throw error;
      }
    },
    []
  );

  const depositEth = useCallback(
    async (amountEth: string) => {
      await ensureReady();
      const value = validateAmount(amountEth);

      return writeVaultTransaction("deposit", () =>
        writeContractAsync({
          address: options.vaultAddress!,
          abi: ETH_BOT_VAULT_ABI,
          functionName: "deposit",
          value,
          chainId: requiredChainId
        })
      );
    },
    [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync, writeVaultTransaction]
  );

  const withdrawEth = useCallback(
    async (amountEth: string) => {
      await ensureReady();
      const amount = validateAmount(amountEth);

      return writeVaultTransaction("withdraw", () =>
        writeContractAsync({
          address: options.vaultAddress!,
          abi: ETH_BOT_VAULT_ABI,
          functionName: "withdraw",
          args: [amount],
          chainId: requiredChainId
        })
      );
    },
    [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync, writeVaultTransaction]
  );

  const activateStrategyEngine = useCallback(async () => {
    await ensureReady();

    return writeVaultTransaction("activateStrategyEngine", () =>
      writeContractAsync({
        address: options.vaultAddress!,
        abi: ETH_BOT_VAULT_ABI,
        functionName: "activateStrategyEngine",
        chainId: requiredChainId
      })
    );
  }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync, writeVaultTransaction]);

  const deactivateStrategyEngine = useCallback(async () => {
    await ensureReady();

    return writeVaultTransaction("deactivateStrategyEngine", () =>
      writeContractAsync({
        address: options.vaultAddress!,
        abi: ETH_BOT_VAULT_ABI,
        functionName: "deactivateStrategyEngine",
        chainId: requiredChainId
      })
    );
  }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync, writeVaultTransaction]);

  const withdrawAll = useCallback(async () => {
    await ensureReady();

    return writeVaultTransaction("withdrawAll", () =>
      writeContractAsync({
        address: options.vaultAddress!,
        abi: ETH_BOT_VAULT_ABI,
        functionName: "withdrawAll",
        chainId: requiredChainId
      })
    );
  }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync, writeVaultTransaction]);

  const balanceWei = balanceRead.data ?? 0n;
  const totalDepositsWei = totalDepositsRead.data ?? 0n;
  const error =
    transactionError ??
    toError(writeError) ??
    toError(wait.error) ??
    toError(balanceRead.error) ??
    toError(strategyActiveRead.error) ??
    toError(allocatedToStrategyRead.error) ??
    toError(totalDepositsRead.error) ??
    toError(totalAllocatedToStrategyRead.error) ??
    toError(pausedRead.error);

  const allocatedToStrategyWei = allocatedToStrategyRead.data ?? 0n;
  const totalAllocatedToStrategyWei = totalAllocatedToStrategyRead.data ?? 0n;
  const transactionStatusText = useMemo(() => {
    if (transactionStatus === "walletPending" || isWritePending) return "Confirm in wallet";
    if (transactionStatus === "confirming") return "Waiting for confirmation";
    if (transactionStatus === "confirmed") return "Transaction confirmed";
    if (transactionStatus === "cancelled") return "Transaction cancelled";
    if (transactionStatus === "failed") return "Transaction failed";
    return "Ready";
  }, [isWritePending, transactionStatus]);

  return {
    accountAddress: address,
    chainId,
    requiredChainId,
    isConnected,
    isCorrectChain: chainId === requiredChainId,
    balanceWei,
    balanceEth: formatEther(balanceWei),
    strategyActive: strategyActiveRead.data ?? false,
    allocatedToStrategyWei,
    allocatedToStrategyEth: formatEther(allocatedToStrategyWei),
    totalDepositsWei,
    totalDepositsEth: formatEther(totalDepositsWei),
    totalAllocatedToStrategyWei,
    totalAllocatedToStrategyEth: formatEther(totalAllocatedToStrategyWei),
    strategyWallet: strategyWalletRead.data,
    depositsPaused: pausedRead.data ?? false,
    pendingHash: submittedHash,
    transactionAction,
    transactionStatus,
    transactionStatusText,
    isWritePending: isWritePending || transactionStatus === "walletPending",
    isConfirming: transactionStatus === "confirming",
    isConfirmed: transactionStatus === "confirmed",
    error,
    depositEth,
    activateStrategyEngine,
    deactivateStrategyEngine,
    withdrawEth,
    withdrawAll,
    refetch
  };
}
