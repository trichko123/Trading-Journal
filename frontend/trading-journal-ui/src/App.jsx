import { useEffect, useMemo, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { exportToCsv } from "./utils/exportCsv";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const API = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;
const REFRESH_COOLDOWN_MS = 2000;

// Available currency pairs
const CURRENCY_PAIRS = [
    { value: "EURUSD", label: "EUR/USD" },
    { value: "GBPJPY", label: "GBP/JPY" },
    { value: "USDJPY", label: "USD/JPY" },
    { value: "USDCHF", label: "USD/CHF" },
    // ... add the rest of the pairs SLEDNO
];

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function TradeDetailsPanelLeft({
    trade,
    open,
    onClose,
    formatDate,
    formatDuration,
    formatSymbol,
    getSessionLabel,
    onCloseTrade,
    toDateTimeLocalValue,
}) {
    const [isClosing, setIsClosing] = useState(false);
    const [closeExitPrice, setCloseExitPrice] = useState("");
    const [closeClosedAt, setCloseClosedAt] = useState("");
    const [closeReasonOverride, setCloseReasonOverride] = useState("");
    const [closeManualReason, setCloseManualReason] = useState("");
    const [closeManualDescription, setCloseManualDescription] = useState("");
    const [closeError, setCloseError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const safeToDateTimeLocalValue = useMemo(() => {
        if (typeof toDateTimeLocalValue === "function") {
            return toDateTimeLocalValue;
        }
        return () => "";
    }, [toDateTimeLocalValue]);
    useEffect(() => {
        if (!open) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [open, onClose]);

    const emDash = "\u2014";
    const getPipSizeForSymbol = (symbol) => (
        symbol?.toUpperCase().includes("JPY") ? 0.01 : 0.0001
    );
    const deriveCloseReasonForPrices = ({ symbol, exitPrice, takeProfitPrice, stopLossPrice, entryPrice }) => {
        const exit = Number(exitPrice);
        if (!Number.isFinite(exit)) return "";
        const pipSize = getPipSizeForSymbol(symbol);
        const tpTolerance = 2 * pipSize;
        const breakevenTolerance = 3 * pipSize;
        const tp = takeProfitPrice == null ? null : Number(takeProfitPrice);
        const sl = stopLossPrice == null ? null : Number(stopLossPrice);
        const entry = entryPrice == null ? null : Number(entryPrice);

        if (tp != null && Number.isFinite(tp) && Math.abs(exit - tp) <= tpTolerance) return "TP";
        if (sl != null && Number.isFinite(sl) && Math.abs(exit - sl) <= tpTolerance) return "SL";
        if (entry != null && Number.isFinite(entry) && Math.abs(exit - entry) <= breakevenTolerance) return "BreakEven";
        return "Manual";
    };
    const getCloseReason = (t) => {
        if (!t?.closedAt || t.exitPrice == null) return emDash;
        const exitPrice = Number(t.exitPrice);
        if (!Number.isFinite(exitPrice)) return emDash;
        const derived = deriveCloseReasonForPrices({
            symbol: t.symbol,
            exitPrice,
            takeProfitPrice: t.takeProfitPrice,
            stopLossPrice: t.stopLossPrice,
            entryPrice: t.entryPrice,
        });
        if (t.closeReasonOverride) return t.closeReasonOverride;
        return derived || emDash;
    };
    const deriveCloseReasonFromExit = (exitPriceValue) => {
        const exitPrice = Number(exitPriceValue);
        if (!Number.isFinite(exitPrice)) return "";
        return deriveCloseReasonForPrices({
            symbol: trade?.symbol,
            exitPrice,
            takeProfitPrice: trade?.takeProfitPrice,
            stopLossPrice: trade?.stopLossPrice,
            entryPrice: trade?.entryPrice,
        });
    };
    useEffect(() => {
        if (!open || !trade) return;
        setIsClosing(false);
        setCloseError("");
        setCloseExitPrice("");
        setCloseReasonOverride(trade.closeReasonOverride ?? "");
        setCloseManualReason(trade.manualReason ?? "");
        setCloseManualDescription(trade.manualDescription ?? "");
        setCloseClosedAt(safeToDateTimeLocalValue(new Date()));
    }, [open, trade?.id, safeToDateTimeLocalValue]);

    if (!open || !trade) return null;

    const closeReasonValue = getCloseReason(trade);
    const detailRows = [
        { label: "Status", value: trade.closedAt ? "CLOSED" : "OPEN" },
        { label: "Entry", value: trade.entryPrice ?? "-" },
        { label: "Exit", value: trade.exitPrice ?? emDash },
        { label: "SL", value: trade.stopLossPrice ?? "-" },
        { label: "TP", value: trade.takeProfitPrice ?? emDash },
        { label: "SL pips", value: trade.slPips ?? "-" },
        { label: "TP pips", value: trade.tpPips ?? "-" },
        { label: "R/R", value: trade.rrRatio ?? "-" },
        { label: "Session", value: getSessionLabel(trade.createdAt) ?? emDash },
        { label: "Close Reason", value: closeReasonValue },
        { label: "Created", value: formatDate(trade.createdAt) },
        {
            label: "Duration",
            value: trade.duration ?? formatDuration(trade.createdAt, trade.closedAt) ?? emDash,
        },
    ];
    if (closeReasonValue === "Manual") {
        const insertIndex = Math.max(
            0,
            detailRows.findIndex((row) => row.label === "Close Reason") + 1
        );
        detailRows.splice(insertIndex, 0, {
            label: "Manual Reason",
            value: trade.manualReason ?? emDash,
        });
        if (trade.manualReason === "Other" && trade.manualDescription) {
            detailRows.splice(insertIndex + 1, 0, {
                label: "Description",
                value: trade.manualDescription,
            });
        }
    }

    return (
        <>
            <div className="drawer-backdrop" onClick={onClose} />
            <div className="drawer drawer-left" onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header">
                    <h3 className="drawer-title">
                        {formatSymbol(trade.symbol)} {"\u2022"} {trade.direction}
                    </h3>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm drawer-close"
                        aria-label="Close details panel"
                        onClick={onClose}
                    >x</button>
                </div>
                <div className="drawer-details">
                    {detailRows.map((row) => (
                        <div key={row.label} className="drawer-detail-row">
                            <span className="drawer-detail-label">{row.label}</span>
                            <span className="drawer-detail-value">{row.value}</span>
                        </div>
                    ))}
                </div>
                {!trade.closedAt && !isClosing && (
                    <div className="drawer-actions">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                setCloseClosedAt(safeToDateTimeLocalValue(new Date()));
                                setCloseExitPrice("");
                                setCloseReasonOverride("");
                                setCloseError("");
                                setIsClosing(true);
                            }}
                        >
                            Close trade
                        </button>
                    </div>
                )}
                {!trade.closedAt && isClosing && (
                    <div>
                        {closeError && <div className="banner error">{closeError}</div>}
                        <div className="drawer-grid">
                            <label className="field">
                                Exit Price
                                <input
                                    className="input"
                                    value={closeExitPrice}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setCloseExitPrice(nextValue);
                                        const nextReason = deriveCloseReasonFromExit(nextValue);
                                        if (nextReason) {
                                            setCloseReasonOverride(nextReason);
                                            if (nextReason !== "Manual") {
                                                setCloseManualReason("");
                                                setCloseManualDescription("");
                                            }
                                        }
                                    }}
                                    placeholder="Exit price"
                                    type="number"
                                    step="0.00001"
                                    min="0"
                                />
                            </label>
                            <label className="field">
                                Closed Time
                                <input
                                    className="input"
                                    value={closeClosedAt}
                                    onChange={(e) => setCloseClosedAt(e.target.value)}
                                    type="datetime-local"
                                />
                            </label>
                            <label className="field">
                                Close Reason
                                <select
                                    className="input"
                                    value={closeReasonOverride}
                                    onChange={(e) => {
                                        const nextReason = e.target.value;
                                        setCloseReasonOverride(nextReason);
                                        if (nextReason !== "Manual") {
                                            setCloseManualReason("");
                                            setCloseManualDescription("");
                                        }
                                    }}
                                >
                                    <option value="">None</option>
                                    <option value="TP">TP</option>
                                    <option value="SL">SL</option>
                                    <option value="BreakEven">BreakEven</option>
                                    <option value="Manual">Manual</option>
                                </select>
                            </label>
                            {closeReasonOverride === "Manual" && (
                                <label className="field">
                                    Manual Reason
                                    <select
                                        className="input"
                                        value={closeManualReason}
                                        onChange={(e) => {
                                            const nextReason = e.target.value;
                                            setCloseManualReason(nextReason);
                                            if (nextReason !== "Other") {
                                                setCloseManualDescription("");
                                            }
                                        }}
                                    >
                                        <option value="">Select reason</option>
                                        <option value="News release">News release</option>
                                        <option value="Market Friday closing">Market Friday closing</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </label>
                            )}
                            {closeReasonOverride === "Manual" && closeManualReason === "Other" && (
                                <label className="field">
                                    Description
                                    <textarea
                                        className="input"
                                        value={closeManualDescription}
                                        onChange={(e) => setCloseManualDescription(e.target.value)}
                                        placeholder="Describe the reason"
                                        rows={3}
                                    />
                                </label>
                            )}
                        </div>
                        <div className="drawer-actions">
                            <button
                                type="button"
                                className="btn"
                                onClick={() => {
                                    setIsClosing(false);
                                    setCloseError("");
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                                onClick={async () => {
                                    const exitPriceNumber = Number(closeExitPrice);
                                    if (!Number.isFinite(exitPriceNumber) || exitPriceNumber <= 0) {
                                        setCloseError("Exit Price must be a positive number.");
                                        return;
                                    }
                                    if (closeReasonOverride === "Manual") {
                                        if (!closeManualReason) {
                                            setCloseError("Manual Reason is required when Close Reason is Manual.");
                                            return;
                                        }
                                        if (closeManualReason === "Other" && !closeManualDescription.trim()) {
                                            setCloseError("Description is required when Manual Reason is Other.");
                                            return;
                                        }
                                    }
                                    setCloseError("");
                                    setIsSubmitting(true);
                                    try {
                                        if (typeof onCloseTrade !== "function") {
                                            throw new Error("Close trade handler is not available.");
                                        }
                                        await onCloseTrade(trade, {
                                            exitPrice: exitPriceNumber,
                                            closedAtLocal: closeClosedAt,
                                            closeReasonOverride: closeReasonOverride || null,
                                            manualReason: closeReasonOverride === "Manual" ? closeManualReason : null,
                                            manualDescription:
                                                closeReasonOverride === "Manual" && closeManualReason === "Other"
                                                    ? closeManualDescription.trim()
                                                    : null,
                                        });
                                        setIsClosing(false);
                                    } catch (err) {
                                        setCloseError(String(err).replace(/^Error:\s*/, ""));
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default function App() {
    const [email, setEmail] = useState("test@example.com");
    const [password, setPassword] = useState("pass1234");
    const [token, setToken] = useState(localStorage.getItem("token") || "");
    const [authMode, setAuthMode] = useState("login");

    const [trades, setTrades] = useState([]);
    const [symbol, setSymbol] = useState("GBPJPY");
    const [direction, setDirection] = useState("LONG");
    const [entryPrice, setEntryPrice] = useState("187.25");
    const [stopLossPrice, setStopLossPrice] = useState("");
    const [takeProfitPrice, setTakeProfitPrice] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [editSymbol, setEditSymbol] = useState("");
    const [editDirection, setEditDirection] = useState("LONG");
    const [editEntryPrice, setEditEntryPrice] = useState("");
    const [editExitPrice, setEditExitPrice] = useState("");
    const [editStopLossPrice, setEditStopLossPrice] = useState("");
    const [editTakeProfitPrice, setEditTakeProfitPrice] = useState("");
    const [editCreatedAt, setEditCreatedAt] = useState("");
    const [editClosedAt, setEditClosedAt] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedTradeForDetails, setSelectedTradeForDetails] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [refreshBlockedUntil, setRefreshBlockedUntil] = useState(0);
    const BASE_SESSION_OFFSET = 1; // GMT+1
    const [filters, setFilters] = useState({
        symbol: "all",
        direction: "all",
        status: "all",
        session: "all",
    });
    const [datePreset, setDatePreset] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [closedDatePreset, setClosedDatePreset] = useState("all");
    const [closedFromDate, setClosedFromDate] = useState("");
    const [closedToDate, setClosedToDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const refreshBlocked = refreshBlockedUntil && Date.now() < refreshBlockedUntil;
    const refreshCooldownSeconds = refreshBlocked ? Math.ceil((refreshBlockedUntil - Date.now()) / 1000) : 0;

    const SESSION_FILTER_OPTIONS = [
        "London",
        "New York",
        "Asian",
        "New York / London",
        "Asian / London",
        "New York / Asian",
    ];

    function formatOutcome(trade) {
        const emDash = "\u2014";
        if (!trade?.closedAt) return emDash;
        if (trade.exitPrice == null) return emDash;
        if (trade.stopLossPrice == null) return emDash;
        const entry = Number(trade.entryPrice);
        const exit = Number(trade.exitPrice);
        const stopLoss = Number(trade.stopLossPrice);
        if (!Number.isFinite(entry) || !Number.isFinite(exit) || !Number.isFinite(stopLoss)) return emDash;

        const direction = trade.direction?.toUpperCase();
        const risk = direction === "SHORT" ? (stopLoss - entry) : (entry - stopLoss);
        if (!Number.isFinite(risk) || risk <= 0) return emDash;

        const reward = direction === "SHORT" ? (entry - exit) : (exit - entry);
        const rValue = reward / risk;
        if (!Number.isFinite(rValue)) return emDash;

        const sign = rValue > 0 ? "+" : "";
        return `${sign}${rValue.toFixed(2)}R`;
    }

    function normalizeEmail(value) {
        return value.trim().toLowerCase();
    }

    function base64UrlDecode(value) {
        const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + (4 - (value.length % 4)) % 4, "=");
        return atob(padded);
    }

    function tryExtractEmailFromIdToken(idToken) {
        try {
            const payload = idToken.split(".")[1];
            if (!payload) return null;
            const json = base64UrlDecode(payload);
            const data = JSON.parse(json);
            return typeof data.email === "string" ? data.email : null;
        } catch {
            return null;
        }
    }

    async function handleGoogleSuccess(credentialResponse) {
        setError("");
        const idToken = credentialResponse?.credential;
        if (!idToken) {
            setError("Google sign-in failed.");
            return;
        }

        try {
            const res = await fetch(`${API}/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
            });

            if (!res.ok) {
                const txt = (await res.text()).trim();
                const message = txt && !txt.startsWith("<")
                    ? txt
                    : `Google login failed (${res.status}).`;
                throw new Error(message);
            }

            const data = await res.json();
            setToken(data.token);
            localStorage.setItem("token", data.token);

            const emailFromToken = tryExtractEmailFromIdToken(idToken);
            if (emailFromToken) {
                setEmail(emailFromToken);
            }
        } catch (err) {
            const message = String(err).replace(/^Error:\s*/, "");
            setError(message);
        }
    }

    async function login(e) {
        e?.preventDefault();
        setError("");

        try {
            const res = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizeEmail(email), password }),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Login failed (${res.status}): ${txt}`);
            }

            const data = await res.json();
            setToken(data.token);
            localStorage.setItem("token", data.token);
        } catch (err) {
            setError(String(err));
        }
    }

    async function register(e) {
        e?.preventDefault();
        setError("");

        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
            setError("Email is required.");
            return;
        }
        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (confirmPassword !== password) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const res = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail, password }),
            });

            if (!res.ok) {
                const txt = (await res.text()).trim();
                const message = txt && !txt.startsWith("<")
                    ? txt
                    : `Register failed (${res.status}).`;
                throw new Error(message);
            }

            setEmail(normalizedEmail);
            await login();
        } catch (err) {
            const message = String(err).replace(/^Error:\s*/, "");
            setError(message);
        }
    }

    function parseCreatedAt(value) {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value === "string") {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        return null;
    }

    function formatDate(value) {
        const d = parseCreatedAt(value);
        if (!d) return "-";
        return d.toLocaleString();
    }

    function toIsoString(value) {
        const d = parseCreatedAt(value);
        return d ? d.toISOString() : "";
    }

    function toDateTimeLocalValue(value) {
        const d = parseCreatedAt(value);
        if (!d) return "";
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function toIsoFromLocal(value) {
        if (!value) return null;
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }

    function formatSymbol(symbol) {
        // Convert "EURUSD" to "EUR/USD" for display
        if (!symbol) return "-";
        const pair = CURRENCY_PAIRS.find(p => p.value === symbol);
        return pair ? pair.label : symbol; // Return formatted label if found, otherwise return as-is
    }

    function computeDerived(symbol, direction, entry, stopLoss, takeProfit) {
        const entryNum = Number(entry);
        const slNum = Number(stopLoss);
        const tpNum = Number(takeProfit);
        if (!Number.isFinite(entryNum) || !Number.isFinite(slNum) || !Number.isFinite(tpNum)) return null;
        if (entryNum <= 0 || slNum <= 0 || tpNum <= 0) return null;

        const isLong = direction?.toUpperCase() === "LONG";
        const pipSize = symbol?.toUpperCase()?.endsWith("JPY") ? 0.01 : 0.0001;

        if (isLong) {
            if (slNum >= entryNum || tpNum <= entryNum) return null;
        } else {
            if (slNum <= entryNum || tpNum >= entryNum) return null;
        }

        const risk = isLong ? (entryNum - slNum) : (slNum - entryNum);
        const reward = isLong ? (tpNum - entryNum) : (entryNum - tpNum);
        if (risk <= 0 || reward <= 0) return null;

        const slPips = Number((Math.abs(entryNum - slNum) / pipSize).toFixed(1));
        const tpPips = Number((Math.abs(tpNum - entryNum) / pipSize).toFixed(1));
        const rrRatio = Number((reward / risk).toFixed(2));

        return { slPips, tpPips, rrRatio };
    }
    function getSessionMatches(value) {
        const d = parseCreatedAt(value);
        if (!d) return [];

        const utcMs = d.getTime();
        const baseMs = utcMs + BASE_SESSION_OFFSET * 60 * 60000;
        const baseDate = new Date(baseMs);
        const minutesOfDay = baseDate.getUTCHours() * 60 + baseDate.getUTCMinutes();

        const sessions = [
            { name: "Asian", label: "Asian (Tokyo)", start: 60, end: 600 }, // 01:00-10:00
            { name: "London", label: "London", start: 480, end: 1020 }, // 08:00-17:00
            { name: "New York", label: "New York", start: 780, end: 1320 }, // 13:00-22:00
        ];

        const matches = sessions.filter((session) => {
            const start = session.start;
            const end = session.end;

            if (start === end) return true;
            if (start < end) {
                return minutesOfDay >= start && minutesOfDay <= end;
            }
            return minutesOfDay >= start || minutesOfDay <= end;
        });

        const order = ["New York", "London", "Asian"];
        return [...matches].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    }

    function getSessionLabel(value) {
        const matches = getSessionMatches(value);
        if (matches.length === 0) return "-";
        const names = matches.map((s) => s.name);
        if (names.length === 1) return names[0];
        if (names.length === 2) {
            if (names.includes("New York") && names.includes("London")) return "New York / London";
            if (names.includes("Asian") && names.includes("London")) return "Asian / London";
            if (names.includes("New York") && names.includes("Asian")) return "New York / Asian";
        }
        return "-";
    }

    function formatDuration(startValue, endValue) {
        const start = parseCreatedAt(startValue);
        const end = parseCreatedAt(endValue);
        if (!start || !end) return "-";
        const diffMs = end.getTime() - start.getTime();
        if (diffMs < 0) return "-";
        const totalMinutes = Math.floor(diffMs / 60000);
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        const parts = [];
        if (days) parts.push(`${days}d`);
        if (hours || days) parts.push(`${hours}h`);
        parts.push(`${minutes}m`);
        return parts.join(" ");
    }

    function logout() {
        setToken("");
        localStorage.removeItem("token");
        setTrades([]);
    }

    useEffect(() => {
        if (!refreshBlockedUntil) return;
        const remainingMs = refreshBlockedUntil - Date.now();
        if (remainingMs <= 0) {
            setRefreshBlockedUntil(0);
            return;
        }
        const timeoutId = setTimeout(() => {
            setRefreshBlockedUntil(0);
        }, remainingMs);
        return () => clearTimeout(timeoutId);
    }, [refreshBlockedUntil]);

    async function loadTrades({ force = false } = {}) {
        if (isLoading) return;
        const now = Date.now();
        if (!force && refreshBlockedUntil && now < refreshBlockedUntil) {
            const seconds = Math.ceil((refreshBlockedUntil - now) / 1000);
            setError(`Please wait ${seconds}s before refreshing again.`);
            return;
        }
        if (!force) {
            setRefreshBlockedUntil(now + REFRESH_COOLDOWN_MS);
        }
        setError("");
        setIsLoading(true);
        try {
            const res = await fetch(`${API}/trades`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Load trades failed (${res.status}): ${txt}`);
            }

            const data = await res.json();
            setTrades(data);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    }

    function startEdit(trade) {
        setEditingId(trade.id);
        setEditSymbol(trade.symbol);
        setEditDirection(trade.direction);
        setEditEntryPrice(trade.entryPrice?.toString() || "");
        setEditExitPrice(trade.exitPrice?.toString() || "");
        setEditStopLossPrice(trade.stopLossPrice?.toString() || "");
        setEditTakeProfitPrice(trade.takeProfitPrice?.toString() || "");
        setEditCreatedAt(toDateTimeLocalValue(trade.createdAt));
        setEditClosedAt(toDateTimeLocalValue(trade.closedAt));
        setError("");
    }

    function cancelEdit() {
        setEditingId(null);
        setEditSymbol("");
        setEditDirection("LONG");
        setEditEntryPrice("");
        setEditExitPrice("");
        setEditStopLossPrice("");
        setEditTakeProfitPrice("");
        setEditCreatedAt("");
        setEditClosedAt("");
        setError("");
    }

    function cancelEditDrawer() {
        setIsEditOpen(false);
        setEditingId(null);
        setError("");
    }

    function openTradeDetails(trade) {
        setSelectedTradeForDetails(trade);
        setIsDetailsOpen(true);
    }

    function closeTradeDetails() {
        setIsDetailsOpen(false);
        setSelectedTradeForDetails(null);
    }

    async function updateTradeRequest(id, payload) {
        const res = await fetch(`${API}/trades/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Update trade failed (${res.status}): ${txt}`);
        }

        return res.json();
    }

    async function closeTradeInline(trade, { exitPrice, closedAtLocal, closeReasonOverride, manualReason, manualDescription }) {
        const closedAtIso = toIsoFromLocal(closedAtLocal);
        if (!closedAtIso) {
            throw new Error("Closed time is required.");
        }
        if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
            throw new Error("Exit Price must be a positive number.");
        }

        const entryPriceNumber = Number(trade.entryPrice);
        if (!Number.isFinite(entryPriceNumber) || entryPriceNumber <= 0) {
            throw new Error("Entry Price is required to close a trade.");
        }

        if (closeReasonOverride === "Manual") {
            if (!manualReason) {
                throw new Error("Manual Reason is required when Close Reason is Manual.");
            }
            if (manualReason === "Other" && !manualDescription) {
                throw new Error("Description is required when Manual Reason is Other.");
            }
        }

        const createdAtIso = toIsoString(trade.createdAt);
        if (!createdAtIso) {
            throw new Error("Created time is required to close a trade.");
        }

        const manualReasonToSend = closeReasonOverride === "Manual" ? manualReason : null;
        const manualDescriptionToSend =
            closeReasonOverride === "Manual" && manualReason === "Other" ? manualDescription : null;

        const payload = {
            symbol: trade.symbol,
            direction: trade.direction,
            entryPrice: entryPriceNumber,
            exitPrice,
            closeReasonOverride,
            manualReason: manualReasonToSend,
            manualDescription: manualDescriptionToSend,
            stopLossPrice: trade.stopLossPrice ?? null,
            takeProfitPrice: trade.takeProfitPrice ?? null,
            createdAt: createdAtIso,
            closedAt: closedAtIso,
        };

        const updated = await updateTradeRequest(trade.id, payload);
        setSelectedTradeForDetails(updated);
        await loadTrades({ force: true });
        return updated;
    }

    async function updateTrade(id, e) {
        e.preventDefault();
        setError("");

        if (!id) {
            setError("No trade selected.");
            return;
        }

        const entryPriceNumber = Number(editEntryPrice);
        const exitPriceNumber = editExitPrice === "" ? null : Number(editExitPrice);
        const stopLossNumber = editStopLossPrice === "" ? null : Number(editStopLossPrice);
        const takeProfitNumber = editTakeProfitPrice === "" ? null : Number(editTakeProfitPrice);
        const createdAtIso = toIsoFromLocal(editCreatedAt);
        const closedAtIso = toIsoFromLocal(editClosedAt);
        if (!Number.isFinite(entryPriceNumber) || entryPriceNumber <= 0) {
            setError("Entry must be a positive number.");
            return;
        }
        if (editExitPrice !== "" && (!Number.isFinite(exitPriceNumber) || exitPriceNumber <= 0)) {
            setError("Exit must be a positive number.");
            return;
        }
        if (closedAtIso && (exitPriceNumber == null || exitPriceNumber <= 0)) {
            setError("Exit must be provided when closing a trade.");
            return;
        }
        if (!createdAtIso) {
            setError("Created time is required.");
            return;
        }
        if (stopLossNumber !== null && takeProfitNumber !== null) {
            const derived = computeDerived(editSymbol, editDirection, entryPriceNumber, stopLossNumber, takeProfitNumber);
            if (!derived) {
                setError("Entry, Stop Loss, and Take Profit must be valid and ordered correctly for the direction.");
                return;
            }
        }

        try {
            await updateTradeRequest(id, {
                symbol: editSymbol,
                direction: editDirection,
                entryPrice: entryPriceNumber,
                exitPrice: exitPriceNumber,
                stopLossPrice: stopLossNumber,
                takeProfitPrice: takeProfitNumber,
                createdAt: createdAtIso,
                closedAt: closedAtIso,
            });
            setIsEditOpen(false);
            setEditingId(null);
            await loadTrades({ force: true });
        } catch (err) {
            setError(String(err));
        }
    }

    async function deleteTrade(id) {
        setError("");
        try {
            const res = await fetch(`${API}/trades/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Delete trade failed (${res.status}): ${txt}`);
            }

            await loadTrades({ force: true });
        } catch (e) {
            setError(String(e));
        }
    }


    async function createTrade(e) {
        e.preventDefault();
        setError("");

        const entryPriceNumber = Number(entryPrice);
        const stopLossNumber = stopLossPrice === "" ? null : Number(stopLossPrice);
        const takeProfitNumber = takeProfitPrice === "" ? null : Number(takeProfitPrice);
        if (!Number.isFinite(entryPriceNumber) || entryPriceNumber <= 0) {
            setError("Entry must be a positive number.");
            return;
        }
        if (stopLossNumber !== null && takeProfitNumber !== null) {
            const derived = computeDerived(symbol, direction, entryPriceNumber, stopLossNumber, takeProfitNumber);
            if (!derived) {
                setError("Entry, Stop Loss, and Take Profit must be valid and ordered correctly for the direction.");
                return;
            }
        }

        try {
            const res = await fetch(`${API}/trades`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    symbol,
                    direction,
                    entryPrice: entryPriceNumber,
                    stopLossPrice: stopLossNumber,
                    takeProfitPrice: takeProfitNumber,
                }),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Create trade failed (${res.status}): ${txt}`);
            }

            setEntryPrice("");
            setStopLossPrice("");
            setTakeProfitPrice("");
            await loadTrades({ force: true });
        } catch (err) {
            setError(String(err));
        }
    }

    const symbolOptions = useMemo(() => {
        const unique = new Set();
        trades.forEach((trade) => {
            if (trade.symbol) unique.add(trade.symbol);
        });
        return Array.from(unique).sort();
    }, [trades]);

    function getDateRangeFromPreset(preset) {
        const now = new Date();
        if (preset === "today") {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return { start, end };
        }
        if (preset === "week") {
            const day = now.getDay();
            const diffToMonday = (day + 6) % 7;
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
            const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
            return { start, end };
        }
        if (preset === "month") {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return { start, end };
        }
        if (preset === "year") {
            const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            return { start, end };
        }
        return { start: null, end: null };
    }

    function matchesDatePreset(dateValue, preset, customFrom, customTo) {
        if (preset === "all") return true;
        const createdAt = parseCreatedAt(dateValue);
        if (!createdAt) return false;
        if (preset === "custom") {
            if (customFrom) {
                const from = new Date(customFrom);
                from.setHours(0, 0, 0, 0);
                if (createdAt < from) return false;
            }
            if (customTo) {
                const to = new Date(customTo);
                to.setHours(23, 59, 59, 999);
                if (createdAt > to) return false;
            }
            return true;
        }
        const range = getDateRangeFromPreset(preset);
        if (range.start && createdAt < range.start) return false;
        if (range.end && createdAt > range.end) return false;
        return true;
    }

    const filteredTrades = useMemo(() => {
        return trades.filter((trade) => {
            if (filters.symbol !== "all" && trade.symbol !== filters.symbol) {
                return false;
            }
            if (filters.direction !== "all" && trade.direction !== filters.direction) {
                return false;
            }
            if (filters.status !== "all") {
                const isClosed = Boolean(trade.closedAt);
                if (filters.status === "open" && isClosed) return false;
                if (filters.status === "closed" && !isClosed) return false;
            }
            if (filters.session !== "all") {
                const label = getSessionLabel(trade.createdAt);
                if (label !== filters.session) return false;
            }
            if (!matchesDatePreset(trade.createdAt, datePreset, fromDate, toDate)) {
                return false;
            }
            if (closedDatePreset !== "all" && !trade.closedAt) {
                return false;
            }
            if (!matchesDatePreset(trade.closedAt, closedDatePreset, closedFromDate, closedToDate)) {
                return false;
            }
            return true;
        });
    }, [trades, filters, datePreset, fromDate, toDate, closedDatePreset, closedFromDate, closedToDate]);

    const sortedTrades = useMemo(() => filteredTrades, [filteredTrades]);
    const totalPages = Math.ceil(sortedTrades.length / pageSize);
    const pagedTrades = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedTrades.slice(start, start + pageSize);
    }, [sortedTrades, currentPage]);
    const paginationItems = useMemo(() => {
        if (totalPages <= 1) return [];
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const items = [1];
        const start = Math.max(2, currentPage - 2);
        const end = Math.min(totalPages - 1, currentPage + 2);
        if (start > 2) items.push("ellipsis-start");
        for (let i = start; i <= end; i += 1) {
            items.push(i);
        }
        if (end < totalPages - 1) items.push("ellipsis-end");
        items.push(totalPages);
        return items;
    }, [currentPage, totalPages]);

    const tradeCsvColumns = [
        { header: "Symbol", accessorFn: (trade) => formatSymbol(trade.symbol) },
        { header: "Direction", accessorKey: "direction" },
        { header: "Entry", accessorKey: "entryPrice" },
        { header: "SL", accessorKey: "stopLossPrice" },
        { header: "TP", accessorKey: "takeProfitPrice" },
        { header: "SL pips", accessorKey: "slPips" },
        { header: "TP pips", accessorKey: "tpPips" },
        { header: "RR", accessorKey: "rrRatio" },
        { header: "Created", accessorFn: (trade) => toIsoString(trade.createdAt) },
        { header: "Closed", accessorFn: (trade) => toIsoString(trade.closedAt) },
        { header: "Duration", accessorFn: (trade) => formatDuration(trade.createdAt, trade.closedAt) },
        { header: "Session", accessorFn: (trade) => getSessionLabel(trade.createdAt) },
        { header: "Actions", accessorFn: () => "" },
    ];

    function handleExportCsv() {
        if (isExporting) return;
        setError("");
        setIsExporting(true);
        try {
            const today = new Date().toISOString().slice(0, 10);
            exportToCsv(`trades_${today}.csv`, sortedTrades, tradeCsvColumns);
        } catch (err) {
            const message = String(err).replace(/^Error:\s*/, "");
            setError(message);
        } finally {
            setIsExporting(false);
        }
    }

    function clearFilters() {
        setFilters({ symbol: "all", direction: "all", status: "all", session: "all" });
        setDatePreset("all");
        setFromDate("");
        setToDate("");
        setClosedDatePreset("all");
        setClosedFromDate("");
        setClosedToDate("");
    }

    useEffect(() => {
        if (token) loadTrades({ force: true });
    }, [token]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, datePreset, fromDate, toDate, closedDatePreset, closedFromDate, closedToDate]);

    useEffect(() => {
        if (totalPages === 0) {
            if (currentPage !== 1) setCurrentPage(1);
            return;
        }
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);
    return (
        <div className="app">
            <div className="stack">
                <div className="card header-card">
                    <div>
                        <p className="eyebrow">Trading Journal</p>
                        <h1 className="title">Trading Journal</h1>
                        <p className="subtitle">Track entries, stops, targets, and session context in one place.</p>
                    </div>
                    {token ? (
                        <div className="header-actions">
                            <div className="user-chip">
                                <span className="user-label">Signed in</span>
                                <span className="user-email">{email}</span>
                            </div>
                            <div className="actions">
                                <button
                                    className="btn"
                                    onClick={loadTrades}
                                    disabled={isLoading || refreshBlocked}
                                    title={refreshBlocked ? `Please wait ${refreshCooldownSeconds}s` : "Refresh trades"}
                                >
                                    Refresh
                                </button>
                                <button className="btn btn-ghost" onClick={logout}>Logout</button>
                            </div>
                        </div>
                    ) : null}
                </div>

                {!token ? (
                    <div className="card auth-card">
                        {error && (
                            <div className="banner error">
                                {error}
                            </div>
                        )}
                        <div className="auth-toggle">
                            <button
                                type="button"
                                className={`btn btn-sm ${authMode === "login" ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => {
                                    setAuthMode("login");
                                    setConfirmPassword("");
                                    setError("");
                                }}
                            >
                                Login
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${authMode === "register" ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => {
                                    setAuthMode("register");
                                    setConfirmPassword("");
                                    setError("");
                                }}
                            >
                                Register
                            </button>
                        </div>
                        <form onSubmit={authMode === "register" ? register : login} className="auth-form">
                            <h3>{authMode === "register" ? "Register" : "Login"}</h3>
                            <label className="field">
                                <span>Email</span>
                                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                            </label>
                            <label className="field">
                                <span>Password</span>
                                <input
                                    className="input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    type="password"
                                />
                            </label>
                            {authMode === "register" && (
                                <label className="field">
                                    <span>Confirm password</span>
                                    <input
                                        className="input"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm password"
                                        type="password"
                                    />
                                </label>
                            )}
                            <button className="btn btn-primary" type="submit">
                                {authMode === "register" ? "Create account" : "Login"}
                            </button>
                            <>
                                <div className="auth-divider">
                                    <span>or</span>
                                </div>
                                <div className="google-signin">
                                    {googleClientId ? (
                                        <GoogleLogin
                                            onSuccess={handleGoogleSuccess}
                                            onError={() => setError("Google sign-in failed.")}
                                            text="continue_with"
                                            shape="rectangular"
                                            width="360"
                                        />
                                    ) : (
                                        <span className="auth-warning">
                                            Google login not configured (missing VITE_GOOGLE_CLIENT_ID)
                                        </span>
                                    )}
                                </div>
                            </>
                        </form>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="banner error">
                                {error}
                            </div>
                        )}

                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <h2>Add Trade</h2>
                                    <p className="subtitle">Fill in entry details. SL/TP are optional until you close the trade.</p>
                                </div>
                            </div>
                            <form onSubmit={createTrade} className="trade-form">
                                <label className="field">
                                    <span>Symbol</span>
                                    <select className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                                        {CURRENCY_PAIRS.map((pair) => (
                                            <option key={pair.value} value={pair.value}>
                                                {pair.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="field">
                                    <span>Direction</span>
                                    <select className="input" value={direction} onChange={(e) => setDirection(e.target.value)}>
                                        <option value="LONG">LONG</option>
                                        <option value="SHORT">SHORT</option>
                                    </select>
                                </label>
                                <label className="field">
                                    <span>Entry</span>
                                    <input
                                        className="input"
                                        value={entryPrice}
                                        onChange={(e) => setEntryPrice(e.target.value)}
                                        placeholder="Entry price"
                                        type="number"
                                        step="0.00001"
                                        min="0"
                                    />
                                </label>
                                <label className="field">
                                    <span>Stop Loss</span>
                                    <input
                                        className="input"
                                        value={stopLossPrice}
                                        onChange={(e) => setStopLossPrice(e.target.value)}
                                        placeholder="Stop loss"
                                        type="number"
                                        step="0.00001"
                                        min="0"
                                    />
                                </label>
                                <label className="field">
                                    <span>Take Profit</span>
                                    <input
                                        className="input"
                                        value={takeProfitPrice}
                                        onChange={(e) => setTakeProfitPrice(e.target.value)}
                                        placeholder="Take profit"
                                        type="number"
                                        step="0.00001"
                                        min="0"
                                    />
                                </label>
                                <div className="field">
                                    <span>&nbsp;</span>
                                    <button className="btn btn-primary" type="submit">Add trade</button>
                                </div>
                            </form>

                                {(() => {
                                    if (stopLossPrice === "" || takeProfitPrice === "") {
                                        return (
                                            <div className="helper-text">
                                                SL/TP optional. Enter both to see pips and RR.
                                            </div>
                                        );
                                    }
                                    const derived = computeDerived(symbol, direction, entryPrice, stopLossPrice, takeProfitPrice);
                                    return (
                                        <div className="helper-text">
                                            {derived
                                                ? `SL pips: ${derived.slPips} | TP pips: ${derived.tpPips} | RR: ${derived.rrRatio}`
                                                : "Entry, Stop Loss, and Take Profit must be valid and ordered correctly."}
                                        </div>
                                    );
                                })()}
                            </div>

                        <div className="card">
                                <div className="card-header">
                                    <div>
                                        <h2>Trades</h2>
                                        <p className="subtitle">
                                            {trades.length} total | {filteredTrades.length} shown
                                        </p>
                                    </div>
                                    <div className="table-header-actions">
                                        {isLoading && <span className="loading">Loading trades...</span>}
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            type="button"
                                            onClick={handleExportCsv}
                                            disabled={isExporting}
                                        >
                                            {isExporting ? "Exporting..." : "Export CSV"}
                                        </button>
                                    </div>
                                </div>
                                <div className="filter-bar">
                                    <span className="filter-title">Filter</span>
                                    <div className="filter-actions">
                                        {showFilters && datePreset === "custom" && (
                                            <div className="filter-range">
                                                <label className="filter-field">
                                                    <span>Created: From</span>
                                                    <input
                                                        className="input filter-input"
                                                        type="date"
                                                        value={fromDate}
                                                        onChange={(e) => setFromDate(e.target.value)}
                                                    />
                                                </label>
                                                <label className="filter-field">
                                                    <span>Created: To</span>
                                                    <input
                                                        className="input filter-input"
                                                        type="date"
                                                        value={toDate}
                                                        onChange={(e) => setToDate(e.target.value)}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                        {showFilters && closedDatePreset === "custom" && (
                                            <div className="filter-range">
                                                <label className="filter-field">
                                                    <span>Closed: From</span>
                                                    <input
                                                        className="input filter-input"
                                                        type="date"
                                                        value={closedFromDate}
                                                        onChange={(e) => setClosedFromDate(e.target.value)}
                                                    />
                                                </label>
                                                <label className="filter-field">
                                                    <span>Closed: To</span>
                                                    <input
                                                        className="input filter-input"
                                                        type="date"
                                                        value={closedToDate}
                                                        onChange={(e) => setClosedToDate(e.target.value)}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            type="button"
                                            onClick={() => setShowFilters((v) => !v)}
                                        >
                                            {showFilters ? "Hide filters" : "Show filters"}
                                        </button>
                                        {showFilters && (
                                            <button className="btn btn-ghost btn-sm" type="button" onClick={clearFilters}>
                                                Clear filters
                                            </button>
                                        )}
                                    </div>
                                </div>
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Direction</th>
                                        <th>Status</th>
                                        <th className="num">Entry</th>
                                        <th className="num">Exit</th>
                                        <th className="num">Outcome</th>
                                        <th>Created</th>
                                        <th>Closed</th>
                                        <th className="actions">Actions</th>
                                    </tr>
                                    {showFilters && (
                                        <tr className="filter-row">
                                            <th>
                                                <select
                                                    className="input filter-input"
                                                    value={filters.symbol}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, symbol: e.target.value }))}
                                                    aria-label="Filter by symbol"
                                                >
                                                    <option value="all">All</option>
                                                    {symbolOptions.map((option) => (
                                                        <option key={option} value={option}>
                                                            {formatSymbol(option)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </th>
                                            <th>
                                                <select
                                                    className="input filter-input"
                                                    value={filters.direction}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, direction: e.target.value }))}
                                                    aria-label="Filter by direction"
                                                >
                                                    <option value="all">All</option>
                                                    <option value="LONG">LONG</option>
                                                    <option value="SHORT">SHORT</option>
                                                </select>
                                            </th>
                                            <th>
                                                <select
                                                    className="input filter-input"
                                                    value={filters.status}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                                                    aria-label="Filter by status"
                                                >
                                                    <option value="all">All</option>
                                                    <option value="open">Open</option>
                                                    <option value="closed">Closed</option>
                                                </select>
                                            </th>
                                            <th />
                                            <th />
                                            <th />
                                            <th>
                                                <select
                                                    className="input filter-input"
                                                    value={datePreset}
                                                    onChange={(e) => setDatePreset(e.target.value)}
                                                    aria-label="Filter by created date"
                                                >
                                                    <option value="all">All</option>
                                                    <option value="today">Today</option>
                                                    <option value="week">This week</option>
                                                    <option value="month">This month</option>
                                                    <option value="year">This year</option>
                                                    <option value="custom">Custom range</option>
                                                </select>
                                            </th>
                                            <th>
                                                <select
                                                    className="input filter-input"
                                                    value={closedDatePreset}
                                                    onChange={(e) => setClosedDatePreset(e.target.value)}
                                                    aria-label="Filter by closed date"
                                                >
                                                    <option value="all">All</option>
                                                    <option value="today">Today</option>
                                                    <option value="week">This week</option>
                                                    <option value="month">This month</option>
                                                    <option value="year">This year</option>
                                                    <option value="custom">Custom range</option>
                                                </select>
                                            </th>
                                            <th className="actions"></th>
                                        </tr>
                                    )}
                                    </thead>

                                    <tbody>
                                    {sortedTrades.length === 0 ? (
                                        <tr>
                                        <td className="empty" colSpan={9}>No trades yet.</td>
                                    </tr>
                                    ) : (
                                        pagedTrades.map((t) => (
                                            <tr key={t.id} onClick={() => openTradeDetails(t)}>
                                                <>
                                                    <td>{formatSymbol(t.symbol)}</td>
                                                    <td>{t.direction}</td>
                                                    <td>{t.closedAt ? "CLOSED" : "OPEN"}</td>
                                                    <td className="num">{t.entryPrice ?? "-"}</td>
                                                    <td className="num">{t.exitPrice ?? "\u2014"}</td>
                                                    <td className="num">{formatOutcome(t)}</td>
                                                    <td>{formatDate(t.createdAt)}</td>
                                                    <td>{formatDate(t.closedAt)}</td>
                                                    <td className="actions">
                                                        <div className="actions">
                                                            <button
                                                                className="btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    startEdit(t);
                                                                    setIsEditOpen(true);
                                                                }}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="btn btn-danger"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const confirmed = window.confirm("Delete this trade? This action cannot be undone.");
                                                                    if (confirmed) {
                                                                        deleteTrade(t.id);
                                                                    }
                                                                }}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        className="btn btn-sm pagination-btn"
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        type="button"
                                    >
                                        Prev
                                    </button>
                                    <div className="pagination-pages">
                                        {paginationItems.map((item) => {
                                            if (typeof item !== "number") {
                                                return (
                                                    <span key={item} className="pagination-ellipsis">
                                                        ...
                                                    </span>
                                                );
                                            }
                                            const isActive = item === currentPage;
                                            return (
                                                <button
                                                    key={item}
                                                    className={`btn btn-sm pagination-btn${isActive ? " is-active" : ""}`}
                                                    onClick={() => setCurrentPage(item)}
                                                    type="button"
                                                    aria-current={isActive ? "page" : undefined}
                                                >
                                                    {item}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        className="btn btn-sm pagination-btn"
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        type="button"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                            {isEditOpen && (
                                <>
                                    <div className="drawer-backdrop" onClick={cancelEditDrawer} />
                                    <div className="drawer" onClick={(e) => e.stopPropagation()}>
                                        <div className="drawer-header">
                                            <h3 className="drawer-title">Edit trade</h3>
                                        </div>
                                        {error && <div className="banner error">{error}</div>}
                                        <form onSubmit={(e) => updateTrade(editingId, e)}>
                                            <div className="drawer-grid">
                                                <label className="field">
                                                    Symbol
                                                    <select
                                                        className="input"
                                                        value={editSymbol}
                                                        onChange={(e) => setEditSymbol(e.target.value)}
                                                    >
                                                        {CURRENCY_PAIRS.map((pair) => (
                                                            <option key={pair.value} value={pair.value}>
                                                                {pair.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label className="field">
                                                    Direction
                                                    <select
                                                        className="input"
                                                        value={editDirection}
                                                        onChange={(e) => setEditDirection(e.target.value)}
                                                    >
                                                        <option value="LONG">LONG</option>
                                                        <option value="SHORT">SHORT</option>
                                                    </select>
                                                </label>
                                                <label className="field">
                                                    Entry
                                                    <input
                                                        className="input"
                                                        value={editEntryPrice}
                                                        onChange={(e) => setEditEntryPrice(e.target.value)}
                                                        placeholder="Entry price"
                                                        type="number"
                                                        step="0.00001"
                                                        min="0"
                                                    />
                                                </label>
                                                <label className="field">
                                                    Exit
                                                    <input
                                                        className="input"
                                                        value={editExitPrice}
                                                        onChange={(e) => setEditExitPrice(e.target.value)}
                                                        placeholder="Exit price"
                                                        type="number"
                                                        step="0.00001"
                                                        min="0"
                                                    />
                                                </label>
                                                <label className="field">
                                                    Stop Loss
                                                    <input
                                                        className="input"
                                                        value={editStopLossPrice}
                                                        onChange={(e) => setEditStopLossPrice(e.target.value)}
                                                        placeholder="Stop loss"
                                                        type="number"
                                                        step="0.00001"
                                                        min="0"
                                                    />
                                                </label>
                                                <label className="field">
                                                    Take Profit
                                                    <input
                                                        className="input"
                                                        value={editTakeProfitPrice}
                                                        onChange={(e) => setEditTakeProfitPrice(e.target.value)}
                                                        placeholder="Take profit"
                                                        type="number"
                                                        step="0.00001"
                                                        min="0"
                                                    />
                                                </label>
                                                <label className="field">
                                                    Created time
                                                    <input
                                                        className="input"
                                                        value={editCreatedAt}
                                                        onChange={(e) => setEditCreatedAt(e.target.value)}
                                                        type="datetime-local"
                                                    />
                                                </label>
                                                <label className="field">
                                                    Closed time
                                                    <input
                                                        className="input"
                                                        value={editClosedAt}
                                                        onChange={(e) => setEditClosedAt(e.target.value)}
                                                        type="datetime-local"
                                                    />
                                                </label>
                                            </div>
                                            <div className="drawer-actions">
                                                <button type="button" className="btn" onClick={cancelEditDrawer}>
                                                    Cancel
                                                </button>
                                                <button className="btn btn-primary" type="submit">
                                                    Save
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </>
                            )}
                            <TradeDetailsPanelLeft
                                trade={selectedTradeForDetails}
                                open={isDetailsOpen}
                                onClose={closeTradeDetails}
                                formatDate={formatDate}
                                formatDuration={formatDuration}
                                formatSymbol={formatSymbol}
                                getSessionLabel={getSessionLabel}
                                onCloseTrade={closeTradeInline}
                                toDateTimeLocalValue={toDateTimeLocalValue}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

