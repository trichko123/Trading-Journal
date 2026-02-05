import { useEffect, useState } from "react";

export default function useRiskCalculatorState({
    initialAccountCurrency = "USD",
    initialBalance = "",
    initialRiskPercent = "1.0",
    initialSymbol = "",
    initialEntryPrice = "",
    initialStopLossPrice = "",
    initialConversionRate = "",
    initialContractSize = "100",
    contractSizeStorageKey = "xau_contract_size",
} = {}) {
    const [riskCalcAccountCurrency, setRiskCalcAccountCurrency] = useState(initialAccountCurrency);
    const [riskCalcBalance, setRiskCalcBalance] = useState(initialBalance);
    const [riskCalcRiskPercent, setRiskCalcRiskPercent] = useState(initialRiskPercent);
    const [riskCalcSymbol, setRiskCalcSymbol] = useState(initialSymbol);
    const [riskCalcEntryPrice, setRiskCalcEntryPrice] = useState(initialEntryPrice);
    const [riskCalcStopLossPrice, setRiskCalcStopLossPrice] = useState(initialStopLossPrice);
    const [riskCalcConversionRate, setRiskCalcConversionRate] = useState(initialConversionRate);
    const [riskCalcContractSize, setRiskCalcContractSize] = useState(initialContractSize);

    useEffect(() => {
        const stored = localStorage.getItem(contractSizeStorageKey);
        if (!stored) return undefined;
        const timeoutId = setTimeout(() => setRiskCalcContractSize(stored), 0);
        return () => clearTimeout(timeoutId);
    }, [contractSizeStorageKey]);

    useEffect(() => {
        if (riskCalcSymbol === "XAUUSD") {
            localStorage.setItem(contractSizeStorageKey, riskCalcContractSize);
        }
    }, [contractSizeStorageKey, riskCalcContractSize, riskCalcSymbol]);

    return {
        riskCalcAccountCurrency,
        setRiskCalcAccountCurrency,
        riskCalcBalance,
        setRiskCalcBalance,
        riskCalcRiskPercent,
        setRiskCalcRiskPercent,
        riskCalcSymbol,
        setRiskCalcSymbol,
        riskCalcEntryPrice,
        setRiskCalcEntryPrice,
        riskCalcStopLossPrice,
        setRiskCalcStopLossPrice,
        riskCalcConversionRate,
        setRiskCalcConversionRate,
        riskCalcContractSize,
        setRiskCalcContractSize,
    };
}
