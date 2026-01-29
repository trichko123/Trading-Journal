import { getInstrument, getTickSize, getUnitsPerLot } from "../constants/instruments";

export function calculateRiskPosition({
    accountBalance,
    riskPercent,
    symbol,
    entryPrice,
    stopLossPrice,
    accountCurrency,
    conversionRate,
    contractSizeOverride,
}) {
    const balance = Number(accountBalance);
    const riskPct = Number(riskPercent);
    const entry = Number(entryPrice);
    const stopLoss = Number(stopLossPrice);

    const symbolValue = symbol?.toUpperCase() || "";
    const instrument = getInstrument(symbolValue);
    const baseCurrency = instrument?.base || (symbolValue.length >= 6 ? symbolValue.slice(0, 3) : "");
    const quoteCurrency = instrument?.quote || (symbolValue.length >= 6 ? symbolValue.slice(3) : "");
    const pipSize = getTickSize(symbolValue);
    const isXau = symbolValue === "XAUUSD";
    const overrideNum = Number(contractSizeOverride);
    const unitsPerLot = isXau
        ? (Number.isFinite(overrideNum) && overrideNum > 0 ? overrideNum : 100)
        : getUnitsPerLot(symbolValue);
    const slDistance = Math.abs(entry - stopLoss);
    const slPipsRaw = slDistance / pipSize;
    const direction = entry > stopLoss ? "LONG" : "SHORT";
    const acc = accountCurrency?.toUpperCase() || "";
    const needsConversion = Boolean(
        acc && quoteCurrency && baseCurrency
        && acc !== quoteCurrency
        && acc !== baseCurrency
    );
    const conversionRateNum = Number(conversionRate);
    const priceForConversion = Number.isFinite(entry) ? entry : null;
    const conversionRateValid = !needsConversion
        || (Number.isFinite(conversionRateNum) && conversionRateNum > 0);
    const baseValid = Number.isFinite(balance) && balance > 0
        && Number.isFinite(riskPct) && riskPct > 0
        && Number.isFinite(entry) && entry > 0
        && Number.isFinite(stopLoss) && stopLoss > 0
        && entry !== stopLoss
        && Number.isFinite(slPipsRaw) && slPipsRaw > 0;

    const riskAmount = baseValid ? balance * (riskPct / 100) : null;
    const pipValuePerUnitQuote = pipSize;
    let pipValuePerUnitAcc = null;
    if (baseValid && conversionRateValid) {
        if (acc === quoteCurrency) {
            pipValuePerUnitAcc = pipValuePerUnitQuote;
        } else if (acc === baseCurrency) {
            if (Number.isFinite(priceForConversion) && priceForConversion > 0) {
                pipValuePerUnitAcc = pipValuePerUnitQuote / priceForConversion;
            }
        } else if (needsConversion) {
            pipValuePerUnitAcc = pipValuePerUnitQuote / conversionRateNum;
        }
    }
    const units = baseValid && conversionRateValid && pipValuePerUnitAcc
        ? riskAmount / (slPipsRaw * pipValuePerUnitAcc)
        : null;
    const lots = units != null ? units / unitsPerLot : null;
    const target2R = Number.isFinite(entry) && Number.isFinite(slDistance)
        ? (direction === "LONG" ? entry + 2 * slDistance : entry - 2 * slDistance)
        : null;
    const target3R = Number.isFinite(entry) && Number.isFinite(slDistance)
        ? (direction === "LONG" ? entry + 3 * slDistance : entry - 3 * slDistance)
        : null;

    return {
        isValid: baseValid && conversionRateValid,
        baseValid,
        conversionRateValid,
        needsConversion,
        baseCurrency,
        quoteCurrency,
        pipSize,
        slDistance,
        direction,
        slPips: slPipsRaw,
        riskAmount,
        units,
        lots,
        target2R,
        target3R,
    };
}
