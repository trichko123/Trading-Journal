import { useCallback, useMemo, useState } from "react";

export default function useTradesFilters({
    trades,
    matchesDatePreset,
    initialSymbol = "all",
    initialDirection = "all",
    initialStatus = "all",
    initialDatePreset = "all",
    initialFromDate = "",
    initialToDate = "",
    initialShowFilters = false,
} = {}) {
    const [symbolFilter, setSymbolFilter] = useState(initialSymbol);
    const [directionFilter, setDirectionFilter] = useState(initialDirection);
    const [statusFilter, setStatusFilter] = useState(initialStatus);
    const [datePreset, setDatePreset] = useState(initialDatePreset);
    const [fromDate, setFromDate] = useState(initialFromDate);
    const [toDate, setToDate] = useState(initialToDate);
    const [showFilters, setShowFilters] = useState(initialShowFilters);

    const clearFilters = useCallback(() => {
        setSymbolFilter("all");
        setDirectionFilter("all");
        setStatusFilter("all");
        setDatePreset("all");
        setFromDate("");
        setToDate("");
    }, []);

    const filteredTrades = useMemo(() => {
        if (!Array.isArray(trades)) return [];
        return trades.filter((trade) => {
            if (symbolFilter !== "all" && trade.symbol !== symbolFilter) {
                return false;
            }
            if (directionFilter !== "all" && trade.direction !== directionFilter) {
                return false;
            }
            if (statusFilter !== "all") {
                const isClosed = Boolean(trade.closedAt);
                if (statusFilter === "open" && isClosed) return false;
                if (statusFilter === "closed" && !isClosed) return false;
            }
            if (datePreset !== "all" && !trade.closedAt) {
                return false;
            }
            if (!matchesDatePreset(trade.closedAt, datePreset, fromDate, toDate)) {
                return false;
            }
            return true;
        });
    }, [
        trades,
        symbolFilter,
        directionFilter,
        statusFilter,
        datePreset,
        fromDate,
        toDate,
        matchesDatePreset,
    ]);

    return {
        filteredTrades,
        symbolFilter,
        setSymbolFilter,
        directionFilter,
        setDirectionFilter,
        statusFilter,
        setStatusFilter,
        datePreset,
        setDatePreset,
        fromDate,
        setFromDate,
        toDate,
        setToDate,
        showFilters,
        setShowFilters,
        clearFilters,
    };
}
