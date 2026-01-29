export const CURRENCY_PAIRS = [
    { value: "GBPJPY", label: "GBP/JPY" },
    { value: "EURAUD", label: "EUR/AUD" },
    { value: "AUDCAD", label: "AUD/CAD" },
    { value: "EURUSD", label: "EUR/USD" },
    { value: "GBPCAD", label: "GBP/CAD" },
    { value: "USDJPY", label: "USD/JPY" },
    { value: "NZDCAD", label: "NZD/CAD" },
    { value: "NZDJPY", label: "NZD/JPY" },
    { value: "EURJPY", label: "EUR/JPY" },
    { value: "EURGBP", label: "EUR/GBP" },
    { value: "USDCHF", label: "USD/CHF" },
    { value: "CADJPY", label: "CAD/JPY" },
    { value: "AUDUSD", label: "AUD/USD" },
    { value: "GBPUSD", label: "GBP/USD" },
    { value: "EURCHF", label: "EUR/CHF" },
    { value: "EURCAD", label: "EUR/CAD" },
    { value: "NZDUSD", label: "NZD/USD" },
    { value: "AUDCHF", label: "AUD/CHF" },
    { value: "GBPNZD", label: "GBP/NZD" },
    { value: "AUDJPY", label: "AUD/JPY" },
    { value: "EURNZD", label: "EUR/NZD" },
];

export const CURRENCY_PAIR_VALUES = new Set(CURRENCY_PAIRS.map((pair) => pair.value));

export function getPairLabel(value) {
    if (!value) return value;
    const normalized = String(value).toUpperCase();
    const pair = CURRENCY_PAIRS.find((item) => item.value === normalized);
    return pair ? pair.label : value;
}
