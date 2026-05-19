import { useMemo, useState, type CSSProperties } from "react";
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
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency"
});

const buttonStyle: CSSProperties = {
  border: "1px solid #111827",
  borderRadius: 6,
  background: "#111827",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
  minHeight: 42,
  padding: "0 14px"
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#ffffff",
  color: "#111827"
};

function formatUsd(value: number | null) {
  return value === null || !Number.isFinite(value) ? "--" : usdFormatter.format(value);
}

export function EthBotPanel({
  vaultAddress,
  chainId = mainnet.id,
  className,
  title = "EtherTrade Bot",
  onSubmitted
}: EthBotPanelProps) {
  const [fundAmountEth, setFundAmountEth] = useState("0.01");
  const [localError, setLocalError] = useState<string>();
  const dashboard = useEthBotDashboard({ vaultAddress, chainId });
  const { bot, price, vault, wallet } = dashboard;
  const isBusy = vault.isWritePending || vault.isConfirming;

  const status = useMemo(() => {
    if (!vaultAddress) return "Vault address missing";
    if (!vault.isConnected) return "Connect wallet";
    if (!vault.isCorrectChain) return "Switch to Ethereum mainnet";
    if (isBusy) return vault.isWritePending ? "Confirm in wallet" : "Waiting for confirmation";
    if (bot.isRunning) return "Bot running";
    if (bot.isFunded) return "Funded, ready to start";
    return "Ready to fund";
  }, [bot.isFunded, bot.isRunning, isBusy, vault.isConnected, vault.isCorrectChain, vault.isWritePending, vaultAddress]);

  const canUseVault = Boolean(vaultAddress) && vault.isConnected && vault.isCorrectChain && !isBusy;

  async function runAction(action: EthVaultAction, task: () => Promise<string>) {
    setLocalError(undefined);

    try {
      const hash = await task();
      onSubmitted?.(hash, action);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section
      className={className}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        color: "#111827",
        display: "grid",
        gap: 16,
        maxWidth: 520,
        padding: 18
      }}
    >
      <header style={{ display: "grid", gap: 6 }}>
        <h2 style={{ fontSize: 18, lineHeight: 1.2, margin: 0 }}>{title}</h2>
        <div style={{ color: "#4b5563", fontSize: 14 }}>Status: {status}</div>
      </header>

      <div style={{ display: "grid", gap: 8 }}>
        <Row label="ETH / USDT" value={price.priceText} />
        <Row label="24h change" value={price.changePercent24hText} />
        <Row label="Ticker" value={`${price.source} ${price.status}`} />
        <Row label="Wallet ETH" value={`${Number(wallet.balanceEth).toFixed(6)} ETH`} />
        <Row label="Funded ETH" value={`${Number(vault.balanceEth).toFixed(6)} ETH`} />
        <Row label="Funded value" value={formatUsd(bot.fundedUsd)} />
      </div>

      <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 700 }}>
        Fund amount ETH
        <input
          inputMode="decimal"
          min="0"
          onChange={(event) => setFundAmountEth(event.target.value)}
          placeholder="0.01"
          step="any"
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 6,
            font: "inherit",
            minHeight: 42,
            padding: "0 12px"
          }}
          type="number"
          value={fundAmountEth}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          disabled={!canUseVault || vault.depositsPaused}
          onClick={() => void runAction("deposit", () => vault.depositEth(fundAmountEth))}
          style={{ ...buttonStyle, opacity: canUseVault && !vault.depositsPaused ? 1 : 0.5 }}
          type="button"
        >
          Fund ETH
        </button>
        <button
          disabled={!canUseVault || !bot.isFunded}
          onClick={() => void runAction(bot.isRunning ? "stopBot" : "startBot", bot.isRunning ? vault.stopBot : vault.startBot)}
          style={{ ...buttonStyle, opacity: canUseVault && bot.isFunded ? 1 : 0.5 }}
          type="button"
        >
          {bot.isRunning ? "Stop Bot" : "Start Bot"}
        </button>
      </div>

      <button
        disabled={!canUseVault || vault.balanceWei === 0n}
        onClick={() => void runAction("withdrawAll", vault.withdrawAll)}
        style={{ ...secondaryButtonStyle, opacity: canUseVault && vault.balanceWei > 0n ? 1 : 0.5 }}
        type="button"
      >
        Withdraw ETH
      </button>

      {vault.pendingHash ? (
        <a
          href={`https://etherscan.io/tx/${vault.pendingHash}`}
          rel="noreferrer"
          style={{ color: "#2563eb", fontSize: 14, overflowWrap: "anywhere" }}
          target="_blank"
        >
          View transaction
        </a>
      ) : null}

      {localError || vault.error || price.error || wallet.error ? (
        <div style={{ color: "#b91c1c", fontSize: 14 }}>
          {localError ?? vault.error?.message ?? price.error ?? wallet.error?.message}
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
