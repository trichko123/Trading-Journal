import { parseCreatedAt } from "../../../shared/lib/datetime";
import { computeStrategyOutcomeR, isNetPnlPresent } from "../utils/outcomes";

export function buildLedgerEvents({ trades, cashflows }) {
    const events = [];
    (cashflows || []).forEach((cashflow) => {
        if (!cashflow?.occurredAt) return;
        const ts = parseCreatedAt(cashflow.occurredAt);
        if (!ts) return;
        const amount = Number(cashflow.amountMoney);
        if (!Number.isFinite(amount)) return;
        events.push({
            kind: "cashflow",
            ts: ts.getTime(),
            id: cashflow.id ?? 0,
            type: cashflow.type,
            amount,
        });
    });
    (trades || []).forEach((trade) => {
        if (!trade?.closedAt) return;
        const rValue = computeStrategyOutcomeR(trade);
        if (!Number.isFinite(rValue)) return;
        const ts = parseCreatedAt(trade.closedAt);
        if (!ts) return;
        events.push({
            kind: "trade",
            ts: ts.getTime(),
            id: trade.id ?? 0,
            trade,
            rValue,
        });
    });
    return events.sort((a, b) => {
        if (a.ts !== b.ts) return a.ts - b.ts;
        if (a.kind !== b.kind) return a.kind === "cashflow" ? -1 : 1;
        return (a.id ?? 0) - (b.id ?? 0);
    });
}

export function buildStrategyLedger({ accountSettings, ledgerEvents }) {
    if (!accountSettings) return null;
    const startingBalance = Number(accountSettings.startingBalance);
    const riskPercent = Number(accountSettings.riskPercent);
    if (!Number.isFinite(startingBalance) || startingBalance <= 0) return null;
    if (!Number.isFinite(riskPercent) || riskPercent <= 0) return null;
    const riskFraction = riskPercent / 100;
    const byTrade = new Map();
    const orderedTrades = [];
    let balance = startingBalance;
    let lastBalanceAfter = null;
    (ledgerEvents || []).forEach((event) => {
        if (event.kind === "cashflow") {
            const normalized = String(event.type || "").toUpperCase();
            const amount = Math.abs(event.amount);
            if (!Number.isFinite(amount)) return;
            balance = normalized === "WITHDRAWAL" ? balance - amount : balance + amount;
            return;
        }
        const trade = event.trade;
        const rValue = event.rValue;
        const balanceBefore = balance;
        const riskAmount = balanceBefore > 0 ? balanceBefore * riskFraction : 0;
        const pnlMoney = rValue * riskAmount;
        const balanceAfter = balanceBefore + pnlMoney;
        byTrade.set(trade.id, {
            balanceBefore,
            riskAmount,
            pnlMoney,
            balanceAfter,
        });
        balance = balanceAfter;
        lastBalanceAfter = balanceAfter;
        orderedTrades.push(trade);
    });
    return {
        startingBalance,
        endingBalance: balance,
        lastBalanceAfter,
        hasClosedTrades: orderedTrades.length > 0,
        byTrade,
        orderedTrades,
        riskFraction,
    };
}

export function buildRealizedLedger({ accountSettings, ledgerEvents }) {
    if (!accountSettings) return null;
    const startingBalance = Number(accountSettings.startingBalance);
    const riskPercent = Number(accountSettings.riskPercent);
    if (!Number.isFinite(startingBalance) || startingBalance <= 0) return null;
    if (!Number.isFinite(riskPercent) || riskPercent <= 0) return null;
    const riskFraction = riskPercent / 100;
    const byTrade = new Map();
    const orderedTrades = [];
    let balance = startingBalance;
    let lastBalanceAfter = null;
    (ledgerEvents || []).forEach((event) => {
        if (event.kind === "cashflow") {
            const normalized = String(event.type || "").toUpperCase();
            const amount = Math.abs(event.amount);
            if (!Number.isFinite(amount)) return;
            balance = normalized === "WITHDRAWAL" ? balance - amount : balance + amount;
            return;
        }
        const trade = event.trade;
        const rValue = event.rValue;
        const balanceBefore = balance;
        const riskAmount = balanceBefore > 0 ? balanceBefore * riskFraction : 0;
        const hasNetPnl = isNetPnlPresent(trade);
        const pnlMoney = hasNetPnl ? Number(trade.netPnlMoney) : rValue * riskAmount;
        const balanceAfter = balanceBefore + pnlMoney;
        byTrade.set(trade.id, {
            balanceBefore,
            riskAmount,
            pnlMoney,
            balanceAfter,
            isRealizedCovered: hasNetPnl,
        });
        balance = balanceAfter;
        lastBalanceAfter = balanceAfter;
        orderedTrades.push(trade);
    });
    return {
        startingBalance,
        endingBalance: balance,
        lastBalanceAfter,
        hasClosedTrades: orderedTrades.length > 0,
        byTrade,
        orderedTrades,
        riskFraction,
    };
}
