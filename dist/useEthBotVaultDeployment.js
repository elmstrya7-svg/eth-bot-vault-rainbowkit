import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useDeployContract, useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { mainnet } from "wagmi/chains";
import { ETH_BOT_VAULT_ABI } from "./abi.js";
import { ETH_BOT_VAULT_BYTECODE } from "./bytecode.js";
export const DEFAULT_ETH_BOT_VAULT_STORAGE_KEY = "eth-bot-vault-rainbowkit:vault-address";
function isAddress(value) {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
}
function getStoredAddress(storageKey) {
    if (typeof window === "undefined")
        return undefined;
    const value = window.localStorage.getItem(storageKey);
    return value && isAddress(value) ? value : undefined;
}
function toError(error) {
    if (!error)
        return undefined;
    if (error instanceof Error)
        return error;
    return new Error(String(error));
}
export function useEthBotVaultDeployment(options = {}) {
    const requiredChainId = options.chainId ?? mainnet.id;
    const confirmations = options.confirmations ?? 1;
    const storageKey = options.storageKey ?? DEFAULT_ETH_BOT_VAULT_STORAGE_KEY;
    const chainId = useChainId();
    const account = useAccount();
    const { switchChainAsync } = useSwitchChain();
    const [vaultAddress, setVaultAddressState] = useState();
    const { data: deployHash, deployContractAsync, error: deployError, isPending: isDeployPending } = useDeployContract();
    const wait = useWaitForTransactionReceipt({
        hash: deployHash,
        chainId: requiredChainId,
        confirmations,
        query: {
            enabled: Boolean(deployHash)
        }
    });
    useEffect(() => {
        setVaultAddressState(getStoredAddress(storageKey));
    }, [storageKey]);
    const setVaultAddress = useCallback((address) => {
        setVaultAddressState(address);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, address);
        }
    }, [storageKey]);
    const clearVaultAddress = useCallback(() => {
        setVaultAddressState(undefined);
        if (typeof window !== "undefined") {
            window.localStorage.removeItem(storageKey);
        }
    }, [storageKey]);
    useEffect(() => {
        const deployedAddress = wait.data?.contractAddress;
        if (deployedAddress)
            setVaultAddress(deployedAddress);
    }, [setVaultAddress, wait.data?.contractAddress]);
    const deployVault = useCallback(async () => {
        if (!account.isConnected)
            throw new Error("Connect a wallet before deploying the vault.");
        if (chainId !== requiredChainId)
            await switchChainAsync({ chainId: requiredChainId });
        return deployContractAsync({
            abi: ETH_BOT_VAULT_ABI,
            bytecode: ETH_BOT_VAULT_BYTECODE,
            chainId: requiredChainId
        });
    }, [account.isConnected, chainId, deployContractAsync, requiredChainId, switchChainAsync]);
    const error = useMemo(() => toError(deployError) ?? toError(wait.error), [deployError, wait.error]);
    return {
        vaultAddress,
        deployHash,
        isConnected: account.isConnected,
        isCorrectChain: chainId === requiredChainId,
        isDeployPending,
        isDeploying: wait.isLoading,
        isDeployed: wait.isSuccess && Boolean(vaultAddress),
        error,
        deployVault,
        setVaultAddress,
        clearVaultAddress
    };
}
//# sourceMappingURL=useEthBotVaultDeployment.js.map