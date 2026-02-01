const EM_DASH = "\u2014";

export function computeStrategyOutcomeR(trade) {
    if (!trade?.closedAt) return null;
    if (trade.exitPrice == null) return null;
    const entry = Number(trade.entryPrice);
    const exit = Number(trade.exitPrice);
    if (!Number.isFinite(entry) || !Number.isFinite(exit)) return null;
    if (Math.abs(entry - exit) < 1e-9) return 0;
    if (trade.stopLossPrice == null) return null;
    const stopLoss = Number(trade.stopLossPrice);
    if (!Number.isFinite(stopLoss)) return null;

    const direction = trade.direction?.toUpperCase();
    const risk = direction === "SHORT" ? (stopLoss - entry) : (entry - stopLoss);
    if (!Number.isFinite(risk) || risk <= 0) return null;

    const reward = direction === "SHORT" ? (entry - exit) : (exit - entry);
    const rValue = reward / risk;
    if (!Number.isFinite(rValue)) return null;
    return rValue;
}

export function isNetPnlPresent(trade) {
    if (!trade) return false;
    if (trade.netPnlMoney === null || trade.netPnlMoney === undefined) return false;
    return Number.isFinite(Number(trade.netPnlMoney));
}

export function getRealizedRIfPresent(trade, realizedLedgerByTrade) {
    if (!isNetPnlPresent(trade)) return null;
    const entry = realizedLedgerByTrade?.get?.(trade.id);
    if (!entry || !Number.isFinite(entry.riskAmount) || entry.riskAmount === 0) return null;
    return Number(trade.netPnlMoney) / entry.riskAmount;
}

export function getOutcomeRForMode(trade, { statsMode, realizedLedgerByTrade }) {
    const strategyR = computeStrategyOutcomeR(trade);
    if (!Number.isFinite(strategyR)) return null;
    if (statsMode !== "realized") return strategyR;
    const realizedEntry = realizedLedgerByTrade?.get?.(trade.id);
    if (!realizedEntry || !Number.isFinite(realizedEntry.riskAmount) || realizedEntry.riskAmount === 0) {
        return strategyR;
    }
    if (isNetPnlPresent(trade)) {
        const netPnl = Number(trade.netPnlMoney);
        return netPnl / realizedEntry.riskAmount;
    }
    return strategyR;
}

export function formatOutcome(trade, { statsMode, realizedLedgerByTrade }) {
    const rValue = getOutcomeRForMode(trade, { statsMode, realizedLedgerByTrade });
    if (!Number.isFinite(rValue)) return EM_DASH;
    const sign = rValue > 0 ? "+" : "";
    return `${sign}${rValue.toFixed(2)}R`;
}

export function getOutcomeClass(trade, { statsMode, realizedLedgerByTrade }) {
    const rValue = getOutcomeRForMode(trade, { statsMode, realizedLedgerByTrade });
    if (!Number.isFinite(rValue)) return "outcome outcome--na";
    if (Math.abs(rValue) < 1e-9) return "outcome outcome--flat";
    return rValue > 0 ? "outcome outcome--win" : "outcome outcome--loss";
}
