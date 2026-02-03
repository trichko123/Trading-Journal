import { useCallback, useState } from "react";

export default function useTradesFilters({
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

    return {
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
