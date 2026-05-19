import { useCallback, useEffect, useMemo } from "react";
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

export type EthVaultAction = "deposit" | "withdraw" | "withdrawAll" | "startBot" | "stopBot";

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
  botEnabled: boolean;
  totalDepositsWei: bigint;
  totalDepositsEth: string;
  depositsPaused: boolean;
  pendingHash?: Hash;
  isWritePending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error?: Error;
  depositEth: (amountEth: string) => Promise<Hash>;
  startBot: () => Promise<Hash>;
  stopBot: () => Promise<Hash>;
  withdrawEth: (amountEth: string) => Promise<Hash>;
  withdrawAll: () => Promise<Hash>;
  refetch: () => void;
};

function toError(error: unknown): Error | undefined {
  if (!error) return undefined;
  if (error instanceof Error) return error;
  return new Error(String(error));
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
  const {
    data: pendingHash,
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

  const botEnabledRead = useReadContract({
    ...contractConfig,
    functionName: "botEnabled",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(options.vaultAddress && address)
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
    hash: pendingHash,
    chainId: requiredChainId,
    confirmations,
    query: {
      enabled: Boolean(pendingHash)
    }
  });

  const refetch = useCallback(() => {
    void balanceRead.refetch();
    void botEnabledRead.refetch();
    void totalDepositsRead.refetch();
    void pausedRead.refetch();
  }, [balanceRead, botEnabledRead, pausedRead, totalDepositsRead]);

  useEffect(() => {
    if (wait.isSuccess) refetch();
  }, [refetch, wait.isSuccess]);

  const ensureReady = useCallback(async () => {
    if (!options.vaultAddress) throw new Error("Missing vault contract address.");
    if (!isConnected) throw new Error("Connect a wallet before using the vault.");
    if (chainId !== requiredChainId) await switchChainAsync({ chainId: requiredChainId });
  }, [chainId, isConnected, options.vaultAddress, requiredChainId, switchChainAsync]);

  const depositEth = useCallback(
    async (amountEth: string) => {
      await ensureReady();
      const value = validateAmount(amountEth);

      return writeContractAsync({
        address: options.vaultAddress!,
        abi: ETH_BOT_VAULT_ABI,
        functionName: "deposit",
        value,
        chainId: requiredChainId
      });
    },
    [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync]
  );

  const withdrawEth = useCallback(
    async (amountEth: string) => {
      await ensureReady();
      const amount = validateAmount(amountEth);

      return writeContractAsync({
        address: options.vaultAddress!,
        abi: ETH_BOT_VAULT_ABI,
        functionName: "withdraw",
        args: [amount],
        chainId: requiredChainId
      });
    },
    [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync]
  );

  const startBot = useCallback(async () => {
    await ensureReady();

    return writeContractAsync({
      address: options.vaultAddress!,
      abi: ETH_BOT_VAULT_ABI,
      functionName: "startBot",
      chainId: requiredChainId
    });
  }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync]);

  const stopBot = useCallback(async () => {
    await ensureReady();

    return writeContractAsync({
      address: options.vaultAddress!,
      abi: ETH_BOT_VAULT_ABI,
      functionName: "stopBot",
      chainId: requiredChainId
    });
  }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync]);

  const withdrawAll = useCallback(async () => {
    await ensureReady();

    return writeContractAsync({
      address: options.vaultAddress!,
      abi: ETH_BOT_VAULT_ABI,
      functionName: "withdrawAll",
      chainId: requiredChainId
    });
  }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync]);

  const balanceWei = balanceRead.data ?? 0n;
  const totalDepositsWei = totalDepositsRead.data ?? 0n;
  const error =
    toError(writeError) ??
    toError(wait.error) ??
    toError(balanceRead.error) ??
    toError(botEnabledRead.error) ??
    toError(totalDepositsRead.error) ??
    toError(pausedRead.error);

  return {
    accountAddress: address,
    chainId,
    requiredChainId,
    isConnected,
    isCorrectChain: chainId === requiredChainId,
    balanceWei,
    balanceEth: formatEther(balanceWei),
    botEnabled: botEnabledRead.data ?? false,
    totalDepositsWei,
    totalDepositsEth: formatEther(totalDepositsWei),
    depositsPaused: pausedRead.data ?? false,
    pendingHash,
    isWritePending,
    isConfirming: wait.isLoading,
    isConfirmed: wait.isSuccess,
    error,
    depositEth,
    startBot,
    stopBot,
    withdrawEth,
    withdrawAll,
    refetch
  };
}
