import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Address } from "viem";
import { mainnet } from "wagmi/chains";
import { useEthBotDashboard } from "./useEthBotDashboard.js";
import type { EthVaultAction } from "./useEthVault.js";

export type EthBotPanelProps = {
  vaultAddress?: Address;
  chainId?: number;
  className?: string;
  title?: string;
  onSubmitted?: (hash: string, action: EthVaultAction) => void;
  onVaultDeployed?: (address: Address) => void;
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency"
});

const buttonStyle: CSSProperties = {
  border: "1px solid #3b82f6",
  borderRadius: 6,
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
  minHeight: 42,
  padding: "0 14px"
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#111827",
  border: "1px solid #334155",
  color: "#e5e7eb"
};

const quickAmounts = ["0.0001", "0.0005", "0.001", "0.002"];

function formatUsd(value: number | null) {
  return value === null || !Number.isFinite(value) ? "--" : usdFormatter.format(value);
}

export function EthBotPanel({
  vaultAddress,
  chainId = mainnet.id,
  className,
  title = "EtherTrade Engine",
  onSubmitted,
  onVaultDeployed
}: EthBotPanelProps) {
  const [fundAmountEth, setFundAmountEth] = useState("0.0001");
  const [localError, setLocalError] = useState<string>();
  const dashboard = useEthBotDashboard({ vaultAddress, chainId });
  const { engine, deployment, price, vault, wallet } = dashboard;
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
    if (!vault.isConnected) return "Connect wallet";
    if (!vault.isCorrectChain) return "Switch to Ethereum mainnet";
    if (vault.transactionStatus === "cancelled" || vault.transactionStatus === "failed" || vault.transactionStatus === "confirmed") {
      return vault.transactionStatusText;
    }
    if (isBusy) return vault.isWritePending ? "Confirm in wallet" : "Waiting for confirmation";
    if (hasValidFundAmount && !hasEnoughWalletEth) return "Amount exceeds wallet ETH balance";
    if (engine.isActive) return "Engine active";
    if (engine.isFunded) return "Funded, ready to activate";
    return "Ready to fund";
  }, [
    engine.isFunded,
    engine.isActive,
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

  async function runAction(action: EthVaultAction, task: () => Promise<string>) {
    setLocalError(undefined);

    try {
      const hash = await task();
      onSubmitted?.(hash, action);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    }
  }

  async function deployVault() {
    setLocalError(undefined);

    try {
      await deployment.deployVault();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    if (deployment.vaultAddress && !vaultAddress) {
      onVaultDeployed?.(deployment.vaultAddress);
    }
  }, [deployment.vaultAddress, onVaultDeployed, vaultAddress]);

  return (
    <section
      className={className}
      style={{
        background: "#020617",
        border: "1px solid #1e293b",
        borderRadius: 8,
        boxShadow: "0 18px 60px rgba(2, 6, 23, 0.35)",
        color: "#e5e7eb",
        display: "grid",
        gap: 16,
        maxWidth: 520,
        padding: 18
      }}
    >
      <header style={{ display: "grid", gap: 6 }}>
        <h2 style={{ fontSize: 18, lineHeight: 1.2, margin: 0 }}>{title}</h2>
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Status: {status}</div>
      </header>

      <div style={{ display: "grid", gap: 8 }}>
        <Row label="Vault contract" value={effectiveVaultAddress ? `${effectiveVaultAddress.slice(0, 6)}...${effectiveVaultAddress.slice(-4)}` : "Not deployed"} />
        <Row label="Strategy wallet" value={vault.strategyWallet ? `${vault.strategyWallet.slice(0, 6)}...${vault.strategyWallet.slice(-4)}` : "Not loaded"} />
        <Row label="ETH / USDT" value={price.priceText} />
        <Row label="24h change" value={price.changePercent24hText} />
        <Row label="Market status" value={price.status} />
        <Row label="Wallet ETH" value={`${Number(wallet.balanceEth).toFixed(6)} ETH`} />
        <Row label="Contract ETH" value={`${Number(vault.balanceEth).toFixed(6)} ETH`} />
        <Row label="Allocated total" value={`${Number(engine.allocatedEth).toFixed(6)} ETH`} />
        <Row label="Allocated value" value={formatUsd(engine.allocatedUsd)} />
      </div>

      {!effectiveVaultAddress ? (
        <button
          disabled={!canDeploy}
          onClick={() => void deployVault()}
          style={{ ...buttonStyle, opacity: canDeploy ? 1 : 0.5 }}
          type="button"
        >
          Deploy Vault Contract
        </button>
      ) : null}

      {deployment.deployHash && !effectiveVaultAddress ? (
        <a
          href={`https://etherscan.io/tx/${deployment.deployHash}`}
          rel="noreferrer"
          style={{ color: "#60a5fa", fontSize: 14, overflowWrap: "anywhere" }}
          target="_blank"
        >
          View deployment transaction
        </a>
      ) : null}

      <div style={{ borderTop: "1px solid #1e293b", display: "grid", gap: 10, paddingTop: 14 }}>
        <h3 style={{ fontSize: 15, lineHeight: 1.2, margin: 0 }}>Fund Contract</h3>
        <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 700 }}>
          Amount ETH
          <input
            inputMode="decimal"
            min="0"
            onChange={(event) => setFundAmountEth(event.target.value)}
            placeholder="0.0001"
            step="any"
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 6,
              color: "#e5e7eb",
              font: "inherit",
              minHeight: 42,
              padding: "0 12px"
            }}
            type="number"
            value={fundAmountEth}
          />
        </label>
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => setFundAmountEth(amount)}
              style={{
                ...secondaryButtonStyle,
                fontSize: 12,
                minHeight: 34,
                opacity: fundAmountEth === amount ? 1 : 0.75,
                padding: "0 8px"
              }}
              type="button"
            >
              {amount}
            </button>
          ))}
        </div>
        <button
          disabled={!canFund}
          onClick={() => void runAction("deposit", () => vault.depositEth(fundAmountEth))}
          style={{ ...buttonStyle, opacity: canFund ? 1 : 0.5 }}
          type="button"
        >
          Fund Contract
        </button>
        {hasValidFundAmount && !hasEnoughWalletEth ? (
          <div style={{ color: "#fca5a5", fontSize: 13 }}>
            Amount must be lower than wallet ETH balance so gas can also be paid.
          </div>
        ) : null}
      </div>

      <div style={{ borderTop: "1px solid #1e293b", display: "grid", gap: 10, paddingTop: 14 }}>
        <h3 style={{ fontSize: 15, lineHeight: 1.2, margin: 0 }}>Strategy Engine</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            disabled={!canUseVault || engine.isActive || vault.balanceWei === 0n}
            onClick={() => void runAction("activateStrategyEngine", vault.activateStrategyEngine)}
            style={{ ...buttonStyle, opacity: canUseVault && !engine.isActive && vault.balanceWei > 0n ? 1 : 0.5 }}
            type="button"
          >
            Activate Engine
          </button>
          <button
            disabled={!canUseVault || !engine.isActive}
            onClick={() => void runAction("deactivateStrategyEngine", vault.deactivateStrategyEngine)}
            style={{ ...buttonStyle, opacity: canUseVault && engine.isActive ? 1 : 0.5 }}
            type="button"
          >
            Pause Engine
          </button>
        </div>
        <button
          disabled={!canUseVault || vault.balanceWei === 0n}
          onClick={() => void runAction("withdrawAll", vault.withdrawAll)}
          style={{ ...secondaryButtonStyle, opacity: canUseVault && vault.balanceWei > 0n ? 1 : 0.5 }}
          type="button"
        >
          Withdraw Available ETH
        </button>
      </div>

      <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.4 }}>
        Fund Contract holds ETH in the vault. Activate Engine commits available contract ETH to the configured strategy wallet.
        Withdraw applies only to ETH still held in the contract. Inspect the deployed contract and wallet transaction before confirming.
      </div>

      {vault.pendingHash ? (
        <a
          href={`https://etherscan.io/tx/${vault.pendingHash}`}
          rel="noreferrer"
          style={{ color: "#60a5fa", fontSize: 14, overflowWrap: "anywhere" }}
          target="_blank"
        >
          View transaction
        </a>
      ) : null}

      {localError || deployment.error || vault.error || price.error || wallet.error ? (
        <div style={{ color: "#fca5a5", fontSize: 14 }}>
          {localError ?? deployment.error?.message ?? vault.error?.message ?? price.error ?? wallet.error?.message}
        </div>
      ) : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
