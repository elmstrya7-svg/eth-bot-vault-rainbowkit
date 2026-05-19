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
    border: "1px solid #111827",
    borderRadius: 6,
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 42,
    padding: "0 14px"
};
const secondaryButtonStyle = {
    ...buttonStyle,
    background: "#ffffff",
    color: "#111827"
};
function formatUsd(value) {
    return value === null || !Number.isFinite(value) ? "--" : usdFormatter.format(value);
}
export function EthBotPanel({ vaultAddress, chainId = mainnet.id, className, title = "EtherTrade Bot", onSubmitted, onVaultDeployed }) {
    const [fundAmountEth, setFundAmountEth] = useState("0.01");
    const [localError, setLocalError] = useState();
    const dashboard = useEthBotDashboard({ vaultAddress, chainId });
    const { bot, deployment, price, vault, wallet } = dashboard;
    const effectiveVaultAddress = vaultAddress ?? deployment.vaultAddress;
    const isBusy = vault.isWritePending || vault.isConfirming || deployment.isDeployPending || deployment.isDeploying;
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
        if (isBusy)
            return vault.isWritePending ? "Confirm in wallet" : "Waiting for confirmation";
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
        deployment.isDeploying,
        effectiveVaultAddress,
        isBusy,
        vault.isConnected,
        vault.isCorrectChain,
        vault.isWritePending
    ]);
    const canDeploy = !effectiveVaultAddress && deployment.isConnected && !isBusy;
    const canUseVault = Boolean(effectiveVaultAddress) && vault.isConnected && vault.isCorrectChain && !isBusy;
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
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            color: "#111827",
            display: "grid",
            gap: 16,
            maxWidth: 520,
            padding: 18
        }, children: [_jsxs("header", { style: { display: "grid", gap: 6 }, children: [_jsx("h2", { style: { fontSize: 18, lineHeight: 1.2, margin: 0 }, children: title }), _jsxs("div", { style: { color: "#4b5563", fontSize: 14 }, children: ["Status: ", status] })] }), _jsxs("div", { style: { display: "grid", gap: 8 }, children: [_jsx(Row, { label: "Vault contract", value: effectiveVaultAddress ? `${effectiveVaultAddress.slice(0, 6)}...${effectiveVaultAddress.slice(-4)}` : "Not deployed" }), _jsx(Row, { label: "ETH / USDT", value: price.priceText }), _jsx(Row, { label: "24h change", value: price.changePercent24hText }), _jsx(Row, { label: "Ticker", value: `${price.source} ${price.status}` }), _jsx(Row, { label: "Wallet ETH", value: `${Number(wallet.balanceEth).toFixed(6)} ETH` }), _jsx(Row, { label: "Contract ETH", value: `${Number(vault.balanceEth).toFixed(6)} ETH` }), _jsx(Row, { label: "Sent to bot", value: `${Number(bot.forwardedEth).toFixed(6)} ETH` }), _jsx(Row, { label: "Sent value", value: formatUsd(bot.forwardedUsd) })] }), !effectiveVaultAddress ? (_jsx("button", { disabled: !canDeploy, onClick: () => void deployVault(), style: { ...buttonStyle, opacity: canDeploy ? 1 : 0.5 }, type: "button", children: "Deploy Vault Contract" })) : null, deployment.deployHash && !effectiveVaultAddress ? (_jsx("a", { href: `https://etherscan.io/tx/${deployment.deployHash}`, rel: "noreferrer", style: { color: "#2563eb", fontSize: 14, overflowWrap: "anywhere" }, target: "_blank", children: "View deployment transaction" })) : null, _jsxs("div", { style: { borderTop: "1px solid #e5e7eb", display: "grid", gap: 10, paddingTop: 14 }, children: [_jsx("h3", { style: { fontSize: 15, lineHeight: 1.2, margin: 0 }, children: "Fund Contract" }), _jsxs("label", { style: { display: "grid", gap: 6, fontSize: 14, fontWeight: 700 }, children: ["Amount ETH", _jsx("input", { inputMode: "decimal", min: "0", onChange: (event) => setFundAmountEth(event.target.value), placeholder: "0.01", step: "any", style: {
                                    border: "1px solid #d1d5db",
                                    borderRadius: 6,
                                    font: "inherit",
                                    minHeight: 42,
                                    padding: "0 12px"
                                }, type: "number", value: fundAmountEth })] }), _jsx("button", { disabled: !canUseVault || vault.depositsPaused, onClick: () => void runAction("deposit", () => vault.depositEth(fundAmountEth)), style: { ...buttonStyle, opacity: canUseVault && !vault.depositsPaused ? 1 : 0.5 }, type: "button", children: "Fund Contract" })] }), _jsxs("div", { style: { borderTop: "1px solid #e5e7eb", display: "grid", gap: 10, paddingTop: 14 }, children: [_jsx("h3", { style: { fontSize: 15, lineHeight: 1.2, margin: 0 }, children: "Bot Controls" }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [_jsx("button", { disabled: !canUseVault || bot.isRunning || vault.balanceWei === 0n, onClick: () => void runAction("startBot", vault.startBot), style: { ...buttonStyle, opacity: canUseVault && !bot.isRunning && vault.balanceWei > 0n ? 1 : 0.5 }, type: "button", children: "Start Bot" }), _jsx("button", { disabled: !canUseVault || !bot.isRunning, onClick: () => void runAction("stopBot", vault.stopBot), style: { ...buttonStyle, opacity: canUseVault && bot.isRunning ? 1 : 0.5 }, type: "button", children: "Stop Bot" })] }), _jsx("button", { disabled: !canUseVault || vault.balanceWei === 0n, onClick: () => void runAction("withdrawAll", vault.withdrawAll), style: { ...secondaryButtonStyle, opacity: canUseVault && vault.balanceWei > 0n ? 1 : 0.5 }, type: "button", children: "Withdraw Contract ETH" })] }), _jsx("div", { style: { color: "#6b7280", fontSize: 13, lineHeight: 1.4 }, children: "Fund Contract holds ETH in the vault. Start Bot forwards the contract-held ETH for the connected wallet. Withdraw applies only to ETH still held in the contract." }), vault.pendingHash ? (_jsx("a", { href: `https://etherscan.io/tx/${vault.pendingHash}`, rel: "noreferrer", style: { color: "#2563eb", fontSize: 14, overflowWrap: "anywhere" }, target: "_blank", children: "View transaction" })) : null, localError || deployment.error || vault.error || price.error || wallet.error ? (_jsx("div", { style: { color: "#b91c1c", fontSize: 14 }, children: localError ?? deployment.error?.message ?? vault.error?.message ?? price.error ?? wallet.error?.message })) : null] }));
}
function Row({ label, value }) {
    return (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12 }, children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }));
}
//# sourceMappingURL=EthBotPanel.js.map