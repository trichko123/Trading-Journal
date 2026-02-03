export function buildMoneyMetrics({
    trades,
    activeLedger,
    statsMode,
    realizedLedgerByTrade,
    getOutcomeRForMode,
}) {
    if (!activeLedger?.byTrade) return null;
    const periodTrades = (trades || [])
        .filter((trade) => activeLedger.byTrade.has(trade.id))
        .slice()
        .sort((a, b) => {
            const aTime = new Date(a.closedAt).getTime();
            const bTime = new Date(b.closedAt).getTime();
            if (aTime !== bTime) return aTime - bTime;
            return (a.id ?? 0) - (b.id ?? 0);
        });
    if (periodTrades.length === 0) {
        return {
            tradeCount: 0,
            totalPnl: null,
            returnPct: null,
            maxDrawdownPct: null,
            lossStreakR: null,
        };
    }
    const firstEntry = activeLedger.byTrade.get(periodTrades[0].id);
    if (!firstEntry || !Number.isFinite(firstEntry.balanceBefore) || firstEntry.balanceBefore <= 0) {
        return {
            tradeCount: 0,
            totalPnl: null,
            returnPct: null,
            maxDrawdownPct: null,
            lossStreakR: null,
        };
    }
    const startEquity = firstEntry.balanceBefore;
    let equity = startEquity;
    let peakEquity = startEquity;
    let maxDrawdownPct = 0;
    let totalPnl = 0;
    let currentLossRunR = 0;
    let worstLossRunR = 0;
    periodTrades.forEach((trade) => {
        const entry = activeLedger.byTrade.get(trade.id);
        if (!entry || !Number.isFinite(entry.pnlMoney)) return;
        const rValue = getOutcomeRForMode(trade, { statsMode, realizedLedgerByTrade });
        if (Number.isFinite(rValue)) {
            if (rValue < 0) {
                currentLossRunR += rValue;
                worstLossRunR = Math.min(worstLossRunR, currentLossRunR);
            } else {
                currentLossRunR = 0;
            }
        }
        totalPnl += entry.pnlMoney;
        equity += entry.pnlMoney;
        peakEquity = Math.max(peakEquity, equity);
        const drawdownPct = peakEquity > 0 ? ((equity - peakEquity) / peakEquity) * 100 : 0;
        if (drawdownPct < maxDrawdownPct) {
            maxDrawdownPct = drawdownPct;
        }
    });
    const returnPct = startEquity > 0 ? (totalPnl / startEquity) * 100 : null;
    return {
        tradeCount: periodTrades.length,
        totalPnl,
        returnPct,
        maxDrawdownPct,
        lossStreakR: worstLossRunR,
    };
}

export function buildCashflowNet({
    cashflows,
    datePreset,
    fromDate,
    toDate,
    matchesDatePreset,
}) {
    if (!cashflows?.length) return 0;
    const isAllTime = datePreset === "all" && !fromDate && !toDate;
    return cashflows.reduce((sum, cashflow) => {
        if (!cashflow) return sum;
        if (!isAllTime && !matchesDatePreset(cashflow.occurredAt, datePreset, fromDate, toDate)) {
            return sum;
        }
        const amount = Number(cashflow.amountMoney);
        if (!Number.isFinite(amount)) return sum;
        const normalizedType = String(cashflow.type || "").toUpperCase();
        return normalizedType === "WITHDRAWAL" ? sum - amount : sum + amount;
    }, 0);
}

export function buildPeriodBalanceRange({
    trades,
    activeLedger,
    datePreset,
    fromDate,
    toDate,
}) {
    if (!activeLedger?.byTrade) return null;
    const isAllTime = datePreset === "all" && !fromDate && !toDate;
    if (isAllTime) {
        return {
            start: activeLedger.startingBalance,
            end: activeLedger.endingBalance,
        };
    }
    const periodTrades = (trades || [])
        .filter((trade) => activeLedger.byTrade.has(trade.id))
        .slice()
        .sort((a, b) => {
            const aTime = new Date(a.closedAt).getTime();
            const bTime = new Date(b.closedAt).getTime();
            if (aTime !== bTime) return aTime - bTime;
            return (a.id ?? 0) - (b.id ?? 0);
        });
    if (periodTrades.length === 0) return { start: null, end: null };
    const first = activeLedger.byTrade.get(periodTrades[0].id);
    const last = activeLedger.byTrade.get(periodTrades[periodTrades.length - 1].id);
    if (!first || !last) return { start: null, end: null };
    return {
        start: first.balanceBefore,
        end: last.balanceAfter,
    };
}
