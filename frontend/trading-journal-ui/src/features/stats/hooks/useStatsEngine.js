import { useMemo } from "react";
import { buildLedgerEvents, buildRealizedLedger, buildStrategyLedger } from "../engine/ledger";
import { buildRealizedCoverage, buildSummaryStats } from "../engine/summaryStats";
import { buildCashflowNet, buildMoneyMetrics, buildPeriodBalanceRange } from "../engine/moneyMetrics";
import { getOutcomeRForMode } from "../utils/outcomes";

export default function useStatsEngine({
    trades,
    filteredTrades,
    cashflows,
    accountSettings,
    statsMode,
    datePreset,
    fromDate,
    toDate,
    matchesDatePreset,
}) {
    const ledgerEvents = useMemo(
        () => buildLedgerEvents({ trades, cashflows }),
        [trades, cashflows],
    );

    const strategyLedger = useMemo(
        () => buildStrategyLedger({ accountSettings, ledgerEvents }),
        [accountSettings, ledgerEvents],
    );

    const realizedLedger = useMemo(
        () => buildRealizedLedger({ accountSettings, ledgerEvents }),
        [accountSettings, ledgerEvents],
    );

    const activeLedger = statsMode === "realized" ? realizedLedger : strategyLedger;

    const summaryStats = useMemo(
        () => buildSummaryStats({
            trades: filteredTrades,
            statsMode,
            realizedLedgerByTrade: realizedLedger?.byTrade,
            getOutcomeRForMode,
        }),
        [filteredTrades, statsMode, realizedLedger],
    );

    const realizedCoverage = useMemo(
        () => buildRealizedCoverage({ trades: filteredTrades }),
        [filteredTrades],
    );

    const moneyMetrics = useMemo(
        () => buildMoneyMetrics({
            trades: filteredTrades,
            activeLedger,
            statsMode,
            realizedLedgerByTrade: realizedLedger?.byTrade,
            getOutcomeRForMode,
        }),
        [filteredTrades, activeLedger, statsMode, realizedLedger],
    );

    const cashflowNet = useMemo(
        () => buildCashflowNet({
            cashflows,
            datePreset,
            fromDate,
            toDate,
            matchesDatePreset,
        }),
        [cashflows, datePreset, fromDate, toDate, matchesDatePreset],
    );

    const periodBalanceRange = useMemo(
        () => buildPeriodBalanceRange({
            trades: filteredTrades,
            activeLedger,
            datePreset,
            fromDate,
            toDate,
        }),
        [filteredTrades, activeLedger, datePreset, fromDate, toDate],
    );

    return {
        ledgerEvents,
        strategyLedger,
        realizedLedger,
        activeLedger,
        summaryStats,
        realizedCoverage,
        cashflowNet,
        periodBalanceRange,
        moneyMetrics,
    };
}
