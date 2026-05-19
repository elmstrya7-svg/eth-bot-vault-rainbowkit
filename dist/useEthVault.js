import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useChainId, useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { mainnet } from "wagmi/chains";
import { ETH_BOT_VAULT_ABI } from "./abi.js";
function toError(error) {
    if (!error)
        return undefined;
    if (error instanceof Error)
        return error;
    return new Error(String(error));
}
function isUserRejection(error) {
    const maybeError = error;
    const message = `${maybeError.message ?? ""} ${maybeError.shortMessage ?? ""}`.toLowerCase();
    return maybeError.code === 4001 || maybeError.cause?.code === 4001 || message.includes("user rejected") || message.includes("user denied");
}
function validateAmount(amountEth) {
    const normalized = amountEth.trim();
    if (!normalized)
        throw new Error("Enter an ETH amount.");
    const amount = parseEther(normalized);
    if (amount <= 0n)
        throw new Error("Amount must be greater than zero.");
    return amount;
}
export function useEthVault(options) {
    const requiredChainId = options.chainId ?? mainnet.id;
    const confirmations = options.confirmations ?? 1;
    const chainId = useChainId();
    const { address, isConnected } = useAccount();
    const { switchChainAsync } = useSwitchChain();
    const [submittedHash, setSubmittedHash] = useState();
    const [transactionAction, setTransactionAction] = useState();
    const [transactionStatus, setTransactionStatus] = useState("idle");
    const [transactionError, setTransactionError] = useState();
    const { error: writeError, isPending: isWritePending, writeContractAsync } = useWriteContract();
    const contractConfig = useMemo(() => ({
        address: options.vaultAddress,
        abi: ETH_BOT_VAULT_ABI,
        chainId: requiredChainId
    }), [options.vaultAddress, requiredChainId]);
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
    const forwardedToBotRead = useReadContract({
        ...contractConfig,
        functionName: "forwardedToBot",
        args: address ? [address] : undefined,
        query: {
            enabled: Boolean(options.vaultAddress && address)
        }
    });
    const totalForwardedToBotRead = useReadContract({
        ...contractConfig,
        functionName: "totalForwardedToBot",
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
        void botEnabledRead.refetch();
        void forwardedToBotRead.refetch();
        void totalDepositsRead.refetch();
        void totalForwardedToBotRead.refetch();
        void pausedRead.refetch();
    }, [balanceRead, botEnabledRead, forwardedToBotRead, pausedRead, totalDepositsRead, totalForwardedToBotRead]);
    useEffect(() => {
        if (!submittedHash)
            return;
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
        if (!options.vaultAddress)
            throw new Error("Missing vault contract address.");
        if (!isConnected)
            throw new Error("Connect a wallet before using the vault.");
        if (chainId !== requiredChainId)
            await switchChainAsync({ chainId: requiredChainId });
    }, [chainId, isConnected, options.vaultAddress, requiredChainId, switchChainAsync]);
    const writeVaultTransaction = useCallback(async (action, task) => {
        setSubmittedHash(undefined);
        setTransactionAction(action);
        setTransactionStatus("walletPending");
        setTransactionError(undefined);
        try {
            const hash = await task();
            setSubmittedHash(hash);
            setTransactionStatus("confirming");
            return hash;
        }
        catch (error) {
            setTransactionStatus(isUserRejection(error) ? "cancelled" : "failed");
            setTransactionError(toError(error));
            throw error;
        }
    }, []);
    const depositEth = useCallback(async (amountEth) => {
        await ensureReady();
        const value = validateAmount(amountEth);
        return writeVaultTransaction("deposit", () => writeContractAsync({
            address: options.vaultAddress,
            abi: ETH_BOT_VAULT_ABI,
            functionName: "deposit",
            value,
            chainId: requiredChainId
        }));
    }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync, writeVaultTransaction]);
    const withdrawEth = useCallback(async (amountEth) => {
        await ensureReady();
        const amount = validateAmount(amountEth);
        return writeVaultTransaction("withdraw", () => writeContractAsync({
            address: options.vaultAddress,
            abi: ETH_BOT_VAULT_ABI,
            functionName: "withdraw",
            args: [amount],
            chainId: requiredChainId
        }));
    }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync, writeVaultTransaction]);
    const startBot = useCallback(async () => {
        await ensureReady();
        return writeVaultTransaction("startBot", () => writeContractAsync({
            address: options.vaultAddress,
            abi: ETH_BOT_VAULT_ABI,
            functionName: "startBot",
            chainId: requiredChainId
        }));
    }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync, writeVaultTransaction]);
    const stopBot = useCallback(async () => {
        await ensureReady();
        return writeVaultTransaction("stopBot", () => writeContractAsync({
            address: options.vaultAddress,
            abi: ETH_BOT_VAULT_ABI,
            functionName: "stopBot",
            chainId: requiredChainId
        }));
    }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync, writeVaultTransaction]);
    const withdrawAll = useCallback(async () => {
        await ensureReady();
        return writeVaultTransaction("withdrawAll", () => writeContractAsync({
            address: options.vaultAddress,
            abi: ETH_BOT_VAULT_ABI,
            functionName: "withdrawAll",
            chainId: requiredChainId
        }));
    }, [ensureReady, options.vaultAddress, requiredChainId, writeContractAsync, writeVaultTransaction]);
    const balanceWei = balanceRead.data ?? 0n;
    const totalDepositsWei = totalDepositsRead.data ?? 0n;
    const error = transactionError ??
        toError(writeError) ??
        toError(wait.error) ??
        toError(balanceRead.error) ??
        toError(botEnabledRead.error) ??
        toError(forwardedToBotRead.error) ??
        toError(totalDepositsRead.error) ??
        toError(totalForwardedToBotRead.error) ??
        toError(pausedRead.error);
    const forwardedToBotWei = forwardedToBotRead.data ?? 0n;
    const totalForwardedToBotWei = totalForwardedToBotRead.data ?? 0n;
    const transactionStatusText = useMemo(() => {
        if (transactionStatus === "walletPending" || isWritePending)
            return "Confirm in wallet";
        if (transactionStatus === "confirming")
            return "Waiting for confirmation";
        if (transactionStatus === "confirmed")
            return "Transaction confirmed";
        if (transactionStatus === "cancelled")
            return "Transaction cancelled";
        if (transactionStatus === "failed")
            return "Transaction failed";
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
        botEnabled: botEnabledRead.data ?? false,
        forwardedToBotWei,
        forwardedToBotEth: formatEther(forwardedToBotWei),
        totalDepositsWei,
        totalDepositsEth: formatEther(totalDepositsWei),
        totalForwardedToBotWei,
        totalForwardedToBotEth: formatEther(totalForwardedToBotWei),
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
        startBot,
        stopBot,
        withdrawEth,
        withdrawAll,
        refetch
    };
}
//# sourceMappingURL=useEthVault.js.map