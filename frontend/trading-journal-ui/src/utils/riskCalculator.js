export function calculateRiskPosition({
    accountBalance,
    riskPercent,
    symbol,
    entryPrice,
    stopLossPrice,
    accountCurrency,
}) {
    const balance = Number(accountBalance);
    const riskPct = Number(riskPercent);
    const entry = Number(entryPrice);
    const stopLoss = Number(stopLossPrice);

    if (!Number.isFinite(balance) || balance <= 0) return { isValid: false };
    if (!Number.isFinite(riskPct) || riskPct <= 0) return { isValid: false };
    if (!Number.isFinite(entry) || entry <= 0) return { isValid: false };
    if (!Number.isFinite(stopLoss) || stopLoss <= 0) return { isValid: false };
    if (entry === stopLoss) return { isValid: false };

    const symbolValue = symbol?.toUpperCase() || "";
    const quoteCurrency = symbolValue.length >= 6 ? symbolValue.slice(3) : "";
    const pipSize = symbolValue.endsWith("JPY") ? 0.01 : 0.0001;
    const slPipsRaw = Math.abs(entry - stopLoss) / pipSize;
    const slDistance = Math.abs(entry - stopLoss);
    const direction = entry > stopLoss ? "LONG" : "SHORT";

    if (!Number.isFinite(slPipsRaw) || slPipsRaw <= 0) return { isValid: false };

    const riskAmount = balance * (riskPct / 100);
    const pipValuePerUnit = pipSize;
    const units = riskAmount / (slPipsRaw * pipValuePerUnit);
    const lots = units / 100000;
    const microLots = units / 1000;
    const target2R = direction === "LONG"
        ? entry + 2 * slDistance
        : entry - 2 * slDistance;
    const target3R = direction === "LONG"
        ? entry + 3 * slDistance
        : entry - 3 * slDistance;
    const isCrossCurrency = Boolean(
        accountCurrency && quoteCurrency && accountCurrency.toUpperCase() !== quoteCurrency
    );

    return {
        isValid: true,
        quoteCurrency,
        pipSize,
        slDistance,
        direction,
        slPips: slPipsRaw,
        riskAmount,
        units,
        lots,
        microLots,
        target2R,
        target3R,
        isCrossCurrency,
    };
}
