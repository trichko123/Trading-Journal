const FX_PAIRS = [
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

const FX_INSTRUMENTS = FX_PAIRS.map((pair) => {
    const value = pair.value;
    const base = value.slice(0, 3);
    const quote = value.slice(3, 6);
    const tickSize = value.endsWith("JPY") ? 0.01 : 0.0001;
    return {
        value,
        label: pair.label,
        type: "FX",
        base,
        quote,
        tickSize,
        unitsPerLot: 100000,
        displayUnit: "pips",
    };
});

const METAL_INSTRUMENTS = [
    {
        value: "XAUUSD",
        label: "XAU/USD",
        type: "METAL",
        base: "XAU",
        quote: "USD",
        tickSize: 0.01,
        unitsPerLot: 100,
        displayUnit: "ticks",
    },
];

export const INSTRUMENTS = [...FX_INSTRUMENTS, ...METAL_INSTRUMENTS];

export const INSTRUMENT_VALUES = new Set(INSTRUMENTS.map((instrument) => instrument.value));

export function getInstrument(value) {
    if (!value) return null;
    const normalized = String(value).toUpperCase();
    return INSTRUMENTS.find((instrument) => instrument.value === normalized) || null;
}

export function getDisplayUnit(value) {
    const instrument = getInstrument(value);
    return instrument?.displayUnit || "pips";
}

export function getTickSize(value) {
    const instrument = getInstrument(value);
    if (instrument?.tickSize) return instrument.tickSize;
    const normalized = String(value || "").toUpperCase();
    return normalized.endsWith("JPY") ? 0.01 : 0.0001;
}

export function getUnitsPerLot(value) {
    const instrument = getInstrument(value);
    return instrument?.unitsPerLot || 100000;
}
