const EM_DASH = "\u2014";

export function formatMoneyValue(value, currencyCode, fallbackSymbol = "$") {
    if (!Number.isFinite(value)) return EM_DASH;
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    const absValue = Math.abs(value);
    if (currencyCode) {
        try {
            const formatted = new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(absValue);
            return `${sign}${formatted}`;
        } catch {
            // Fall through to simple formatting
        }
    }
    return `${sign}${fallbackSymbol}${absValue.toFixed(2)}`;
}

export function formatMoneyNullable(value, currencyCode, { forceNegative = false } = {}) {
    if (value === null || value === undefined) return EM_DASH;
    const num = Number(value);
    if (!Number.isFinite(num)) return EM_DASH;
    const adjusted = forceNegative ? -Math.abs(num) : num;
    return formatMoneyValue(adjusted, currencyCode);
}

export function formatPercentValue(value, decimals = 2) {
    if (!Number.isFinite(value)) return EM_DASH;
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

export function formatRValue(value) {
    if (!Number.isFinite(value)) return EM_DASH;
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}R`;
}

export function formatWinPct(value) {
    if (!Number.isFinite(value)) return EM_DASH;
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 0.05) {
        return `${rounded}%`;
    }
    return `${value.toFixed(1)}%`;
}
