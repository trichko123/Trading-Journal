import { computeStrategyOutcomeR, isNetPnlPresent } from "../utils/outcomes";

export function buildSummaryStats({ trades, statsMode, realizedLedgerByTrade, getOutcomeRForMode }) {
    const outcomes = [];
    let excluded = 0;
    const confidences = [];
    let winCount = 0;
    let lossCount = 0;
    let breakevenCount = 0;
    const epsilon = 1e-9;
    (trades || []).forEach((trade) => {
        const rValue = getOutcomeRForMode(trade, { statsMode, realizedLedgerByTrade });
        if (Number.isFinite(rValue)) {
            outcomes.push(rValue);
            if (trade?.closedAt) {
                if (Math.abs(rValue) < epsilon) {
                    breakevenCount += 1;
                } else if (rValue > 0) {
                    winCount += 1;
                } else {
                    lossCount += 1;
                }
            }
        } else {
            excluded += 1;
        }
        if (trade?.closedAt && Number.isFinite(trade.confidence)) {
            confidences.push(trade.confidence);
        }
    });
    const numericCount = outcomes.length;
    const sum = outcomes.reduce((acc, value) => acc + value, 0);
    const average = numericCount ? sum / numericCount : null;
    const winPct = numericCount ? (winCount / numericCount) * 100 : null;
    const confCount = confidences.length;
    const confAverage = confCount
        ? confidences.reduce((acc, value) => acc + value, 0) / confCount
        : null;
    return {
        tradeCount: trades?.length ?? 0,
        excluded,
        numericCount,
        sum,
        average,
        winPct,
        confCount,
        confAverage,
        winCount,
        lossCount,
        breakevenCount,
    };
}

export function buildRealizedCoverage({ trades }) {
    let total = 0;
    let covered = 0;
    (trades || []).forEach((trade) => {
        if (!trade?.closedAt) return;
        const strategyR = computeStrategyOutcomeR(trade);
        if (!Number.isFinite(strategyR)) return;
        total += 1;
        if (isNetPnlPresent(trade)) {
            covered += 1;
        }
    });
    return { total, covered };
}
