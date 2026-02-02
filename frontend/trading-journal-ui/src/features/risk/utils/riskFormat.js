import { getPriceDecimals } from "../../../shared/lib/price";

const EM_DASH = "\u2014";

export function formatCalcNumber(value, decimals = 2) {
    if (!Number.isFinite(value)) return EM_DASH;
    return Number(value).toFixed(decimals);
}

export function formatCalcInteger(value) {
    if (!Number.isFinite(value)) return EM_DASH;
    return Math.round(value).toLocaleString();
}

export function formatCalcPrice(value, symbolValue) {
    if (!Number.isFinite(value)) return EM_DASH;
    return Number(value).toFixed(getPriceDecimals(symbolValue));
}
