const DEFAULT_PRICE_DECIMALS = 5;

export function getPriceDecimals(symbol) {
    if (!symbol) return DEFAULT_PRICE_DECIMALS;
    const normalized = String(symbol).trim().toUpperCase();
    if (normalized === "XAUUSD") return 2;
    if (normalized.endsWith("JPY")) return 3;
    return DEFAULT_PRICE_DECIMALS;
}

export function getPriceStep(symbol) {
    const decimals = getPriceDecimals(symbol);
    return (1 / 10 ** decimals).toFixed(decimals);
}

export function formatPriceValue(value, symbol) {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return num.toFixed(getPriceDecimals(symbol));
}
