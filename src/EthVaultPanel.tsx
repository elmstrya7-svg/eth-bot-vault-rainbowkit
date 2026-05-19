import { useMemo, useState, type FormEvent } from "react";
import type { Address } from "viem";
import { mainnet } from "wagmi/chains";
import { useEthVault, type EthVaultAction } from "./useEthVault.js";

export type EthVaultPanelProps = {
  vaultAddress?: Address;
  chainId?: number;
  title?: string;
  className?: string;
  onSubmitted?: (hash: string, action: EthVaultAction) => void;
};

const buttonStyle = {
  border: "1px solid #3b82f6",
  borderRadius: 6,
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
  minHeight: 42,
  padding: "0 14px"
} satisfies React.CSSProperties;

const secondaryButtonStyle = {
  ...buttonStyle,
  background: "#111827",
  border: "1px solid #334155",
  color: "#e5e7eb"
} satisfies React.CSSProperties;

export function EthVaultPanel({
  vaultAddress,
  chainId = mainnet.id,
  title = "ETH Bot Vault",
  className,
  onSubmitted
}: EthVaultPanelProps) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [localError, setLocalError] = useState<string>();
  const vault = useEthVault({ vaultAddress, chainId });

  const status = useMemo(() => {
    if (!vaultAddress) return "Vault address missing";
    if (!vault.isConnected) return "Connect wallet";
    if (!vault.isCorrectChain) return "Switch to Ethereum mainnet";
    if (vault.depositsPaused && mode === "deposit") return "Deposits paused";
    if (vault.transactionStatus !== "idle") return vault.transactionStatusText;
    return "Ready";
  }, [
    mode,
    vault.depositsPaused,
    vault.isConnected,
    vault.isCorrectChain,
    vault.transactionStatus,
    vault.transactionStatusText,
    vaultAddress
  ]);

  const isBusy = vault.isWritePending || vault.isConfirming;
  const canSubmit =
    Boolean(vaultAddress) &&
    vault.isConnected &&
    !isBusy &&
    (mode === "withdraw" || !vault.depositsPaused);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(undefined);

    try {
      const hash = mode === "deposit" ? await vault.depositEth(amount) : await vault.withdrawEth(amount);
      setAmount("");
      onSubmitted?.(hash, mode);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    }
  }

  async function withdrawAll() {
    setLocalError(undefined);

    try {
      const hash = await vault.withdrawAll();
      setAmount("");
      onSubmitted?.(hash, "withdrawAll");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    }
  }

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
        maxWidth: 460,
        padding: 18
      }}
    >
      <header style={{ display: "grid", gap: 6 }}>
        <h2 style={{ fontSize: 18, lineHeight: 1.2, margin: 0 }}>{title}</h2>
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Status: {status}</div>
      </header>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>Your vault balance</span>
          <strong>{vault.balanceEth} ETH</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>Total vault deposits</span>
          <strong>{vault.totalDepositsEth} ETH</strong>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          type="button"
          onClick={() => setMode("deposit")}
          style={mode === "deposit" ? buttonStyle : secondaryButtonStyle}
        >
          Deposit
        </button>
        <button
          type="button"
          onClick={() => setMode("withdraw")}
          style={mode === "withdraw" ? buttonStyle : secondaryButtonStyle}
        >
          Withdraw
        </button>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 700 }}>
          Amount ETH
          <input
            inputMode="decimal"
            min="0"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.01"
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
            value={amount}
          />
        </label>

        <button disabled={!canSubmit} style={{ ...buttonStyle, opacity: canSubmit ? 1 : 0.5 }} type="submit">
          {mode === "deposit" ? "Deposit ETH" : "Withdraw ETH"}
        </button>

        {mode === "withdraw" ? (
          <button disabled={!canSubmit || vault.balanceWei === 0n} onClick={withdrawAll} style={secondaryButtonStyle} type="button">
            Withdraw All
          </button>
        ) : null}
      </form>

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

      {localError || vault.error ? (
        <div style={{ color: "#fca5a5", fontSize: 14 }}>{localError ?? vault.error?.message}</div>
      ) : null}
    </section>
  );
}
