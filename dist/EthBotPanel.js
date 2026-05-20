import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { mainnet } from "wagmi/chains";
import { useEthBotDashboard } from "./useEthBotDashboard.js";
const usdFormatter = new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
});
const buttonStyle = {
    border: "1px solid #3b82f6",
    borderRadius: 6,
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 42,
    padding: "0 14px"
};
const secondaryButtonStyle = {
    ...buttonStyle,
    background: "#111827",
    border: "1px solid #334155",
    color: "#e5e7eb"
};
function formatUsd(value) {
    return value === null || !Number.isFinite(value) ? "--" : usdFormatter.format(value);
}
export function EthBotPanel({ vaultAddress, chainId = mainnet.id, className, title = "EtherTrade Bot", onSubmitted, onVaultDeployed }) {
    const [fundAmountEth, setFundAmountEth] = useState("0.0001");
    const [localError, setLocalError] = useState();
    const dashboard = useEthBotDashboard({ vaultAddress, chainId });
    const { bot, deployment, price, vault, wallet } = dashboard;
    const effectiveVaultAddress = vaultAddress ?? deployment.vaultAddress;
    const isBusy = vault.isWritePending || vault.isConfirming || deployment.isDeployPending || deployment.isDeploying;
    const requestedFundAmountEth = Number(fundAmountEth);
    const walletBalanceEth = Number(wallet.balanceEth);
    const hasValidFundAmount = Number.isFinite(requestedFundAmountEth) && requestedFundAmountEth > 0;
    const hasEnoughWalletEth = hasValidFundAmount && Number.isFinite(walletBalanceEth) && requestedFundAmountEth < walletBalanceEth;
    const status = useMemo(() => {
        if (!effectiveVaultAddress) {
            if (deployment.deployStatus === "cancelled" || deployment.deployStatus === "failed" || deployment.deployStatus === "timeout") {
                return deployment.deployStatusText;
            }
            return deployment.isDeploying ? deployment.deployStatusText : "Deploy vault";
        }
        if (deployment.contractStatus === "checking" || deployment.contractStatus === "missing" || deployment.contractStatus === "unknown") {
            return deployment.contractStatusText;
        }
        if (!vault.isConnected)
            return "Connect wallet";
        if (!vault.isCorrectChain)
            return "Switch to Ethereum mainnet";
        if (vault.transactionStatus === "cancelled" || vault.transactionStatus === "failed" || vault.transactionStatus === "confirmed") {
            return vault.transactionStatusText;
        }
        if (isBusy)
            return vault.isWritePending ? "Confirm in wallet" : "Waiting for confirmation";
        if (hasValidFundAmount && !hasEnoughWalletEth)
            return "Amount exceeds wallet ETH balance";
        if (bot.isRunning)
            return "Bot running";
        if (bot.isFunded)
            return "Funded, ready to start";
        return "Ready to fund";
    }, [
        bot.isFunded,
        bot.isRunning,
        deployment.contractStatus,
        deployment.contractStatusText,
        deployment.deployStatus,
        deployment.deployStatusText,
        hasEnoughWalletEth,
        hasValidFundAmount,
        deployment.isDeploying,
        effectiveVaultAddress,
        isBusy,
        vault.transactionStatus,
        vault.transactionStatusText,
        vault.isConnected,
        vault.isCorrectChain,
        vault.isWritePending
    ]);
    const canDeploy = !effectiveVaultAddress && deployment.isConnected && !isBusy;
    const canUseVault = Boolean(effectiveVaultAddress) && vault.isConnected && vault.isCorrectChain && !isBusy;
    const canFund = canUseVault && !vault.depositsPaused && hasValidFundAmount && hasEnoughWalletEth;
    async function runAction(action, task) {
        setLocalError(undefined);
        try {
            const hash = await task();
            onSubmitted?.(hash, action);
        }
        catch (error) {
            setLocalError(error instanceof Error ? error.message : String(error));
        }
    }
    async function deployVault() {
        setLocalError(undefined);
        try {
            await deployment.deployVault();
        }
        catch (error) {
            setLocalError(error instanceof Error ? error.message : String(error));
        }
    }
    useEffect(() => {
        if (deployment.vaultAddress && !vaultAddress) {
            onVaultDeployed?.(deployment.vaultAddress);
        }
    }, [deployment.vaultAddress, onVaultDeployed, vaultAddress]);
    return (_jsxs("section", { className: className, style: {
            background: "#020617",
            border: "1px solid #1e293b",
            borderRadius: 8,
            boxShadow: "0 18px 60px rgba(2, 6, 23, 0.35)",
            color: "#e5e7eb",
            display: "grid",
            gap: 16,
            maxWidth: 520,
            padding: 18
        }, children: [_jsxs("header", { style: { display: "grid", gap: 6 }, children: [_jsx("h2", { style: { fontSize: 18, lineHeight: 1.2, margin: 0 }, children: title }), _jsxs("div", { style: { color: "#94a3b8", fontSize: 14 }, children: ["Status: ", status] })] }), _jsxs("div", { style: { display: "grid", gap: 8 }, children: [_jsx(Row, { label: "Vault contract", value: effectiveVaultAddress ? `${effectiveVaultAddress.slice(0, 6)}...${effectiveVaultAddress.slice(-4)}` : "Not deployed" }), _jsx(Row, { label: "Bot wallet", value: vault.tradingBotWallet ? `${vault.tradingBotWallet.slice(0, 6)}...${vault.tradingBotWallet.slice(-4)}` : "Not loaded" }), _jsx(Row, { label: "ETH / USDT", value: price.priceText }), _jsx(Row, { label: "24h change", value: price.changePercent24hText }), _jsx(Row, { label: "Market status", value: price.status }), _jsx(Row, { label: "Wallet ETH", value: `${Number(wallet.balanceEth).toFixed(6)} ETH` }), _jsx(Row, { label: "Contract ETH", value: `${Number(vault.balanceEth).toFixed(6)} ETH` }), _jsx(Row, { label: "Forwarded total", value: `${Number(bot.forwardedEth).toFixed(6)} ETH` }), _jsx(Row, { label: "Forwarded value", value: formatUsd(bot.forwardedUsd) })] }), !effectiveVaultAddress ? (_jsx("button", { disabled: !canDeploy, onClick: () => void deployVault(), style: { ...buttonStyle, opacity: canDeploy ? 1 : 0.5 }, type: "button", children: "Deploy Vault Contract" })) : null, deployment.deployHash && !effectiveVaultAddress ? (_jsx("a", { href: `https://etherscan.io/tx/${deployment.deployHash}`, rel: "noreferrer", style: { color: "#60a5fa", fontSize: 14, overflowWrap: "anywhere" }, target: "_blank", children: "View deployment transaction" })) : null, _jsxs("div", { style: { borderTop: "1px solid #1e293b", display: "grid", gap: 10, paddingTop: 14 }, children: [_jsx("h3", { style: { fontSize: 15, lineHeight: 1.2, margin: 0 }, children: "Fund Contract" }), _jsxs("label", { style: { display: "grid", gap: 6, fontSize: 14, fontWeight: 700 }, children: ["Amount ETH", _jsx("input", { inputMode: "decimal", min: "0", onChange: (event) => setFundAmountEth(event.target.value), placeholder: "0.0001", step: "any", style: {
                                    background: "#0f172a",
                                    border: "1px solid #334155",
                                    borderRadius: 6,
                                    color: "#e5e7eb",
                                    font: "inherit",
                                    minHeight: 42,
                                    padding: "0 12px"
                                }, type: "number", value: fundAmountEth })] }), _jsx("button", { disabled: !canFund, onClick: () => void runAction("deposit", () => vault.depositEth(fundAmountEth)), style: { ...buttonStyle, opacity: canFund ? 1 : 0.5 }, type: "button", children: "Fund Contract" }), hasValidFundAmount && !hasEnoughWalletEth ? (_jsx("div", { style: { color: "#fca5a5", fontSize: 13 }, children: "Amount must be lower than wallet ETH balance so gas can also be paid." })) : null] }), _jsxs("div", { style: { borderTop: "1px solid #1e293b", display: "grid", gap: 10, paddingTop: 14 }, children: [_jsx("h3", { style: { fontSize: 15, lineHeight: 1.2, margin: 0 }, children: "Bot Controls" }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [_jsx("button", { disabled: !canUseVault || bot.isRunning || vault.balanceWei === 0n, onClick: () => void runAction("startBot", vault.startBot), style: { ...buttonStyle, opacity: canUseVault && !bot.isRunning && vault.balanceWei > 0n ? 1 : 0.5 }, type: "button", children: "Start Bot" }), _jsx("button", { disabled: !canUseVault || !bot.isRunning, onClick: () => void runAction("stopBot", vault.stopBot), style: { ...buttonStyle, opacity: canUseVault && bot.isRunning ? 1 : 0.5 }, type: "button", children: "Stop Bot" })] }), _jsx("button", { disabled: !canUseVault || vault.balanceWei === 0n, onClick: () => void runAction("withdrawAll", vault.withdrawAll), style: { ...secondaryButtonStyle, opacity: canUseVault && vault.balanceWei > 0n ? 1 : 0.5 }, type: "button", children: "Withdraw Contract ETH" })] }), _jsx("div", { style: { color: "#94a3b8", fontSize: 13, lineHeight: 1.4 }, children: "Fund Contract holds ETH in the vault. Start Bot calls the package contract action for contract-held ETH. Withdraw applies only to ETH still held in the contract. Inspect the deployed contract and wallet transaction before confirming." }), vault.pendingHash ? (_jsx("a", { href: `https://etherscan.io/tx/${vault.pendingHash}`, rel: "noreferrer", style: { color: "#60a5fa", fontSize: 14, overflowWrap: "anywhere" }, target: "_blank", children: "View transaction" })) : null, localError || deployment.error || vault.error || price.error || wallet.error ? (_jsx("div", { style: { color: "#fca5a5", fontSize: 14 }, children: localError ?? deployment.error?.message ?? vault.error?.message ?? price.error ?? wallet.error?.message })) : null] }));
}
function Row({ label, value }) {
    return (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12 }, children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }));
}
//# sourceMappingURL=EthBotPanel.js.map