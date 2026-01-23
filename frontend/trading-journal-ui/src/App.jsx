import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://localhost:8080/api";

// Available currency pairs
const CURRENCY_PAIRS = [
    { value: "EURUSD", label: "EUR/USD" },
    { value: "GBPJPY", label: "GBP/JPY" },
    { value: "USDJPY", label: "USD/JPY" },
    { value: "USDCHF", label: "USD/CHF" },
    // ... add the rest of the pairs SLEDNO
];

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
    const [editStopLossPrice, setEditStopLossPrice] = useState("");
    const [editTakeProfitPrice, setEditTakeProfitPrice] = useState("");
    const [editCreatedAt, setEditCreatedAt] = useState("");
    const [editClosedAt, setEditClosedAt] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const BASE_SESSION_OFFSET = 1; // GMT+1
    const [filters, setFilters] = useState({
        symbol: "all",
        direction: "all",
        session: "all",
    });
    const [datePreset, setDatePreset] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [closedDatePreset, setClosedDatePreset] = useState("all");
    const [closedFromDate, setClosedFromDate] = useState("");
    const [closedToDate, setClosedToDate] = useState("");

    const SESSION_FILTER_OPTIONS = [
        "London",
        "New York",
        "Asian",
        "New York / London",
        "Asian / London",
        "New York / Asian",
    ];

    function normalizeEmail(value) {
        return value.trim().toLowerCase();
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
        if (diffMs <= 0) return "-";
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

    async function loadTrades() {
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
        setEditStopLossPrice("");
        setEditTakeProfitPrice("");
        setEditCreatedAt("");
        setEditClosedAt("");
        setError("");
    }

    async function updateTrade(id, e) {
        e.preventDefault();
        setError("");

        const entryPriceNumber = Number(editEntryPrice);
        const stopLossNumber = editStopLossPrice === "" ? null : Number(editStopLossPrice);
        const takeProfitNumber = editTakeProfitPrice === "" ? null : Number(editTakeProfitPrice);
        const createdAtIso = toIsoFromLocal(editCreatedAt);
        const closedAtIso = toIsoFromLocal(editClosedAt);
        if (!Number.isFinite(entryPriceNumber) || entryPriceNumber <= 0) {
            setError("Entry must be a positive number.");
            return;
        }
        if (!createdAtIso) {
            setError("Created time is required.");
            return;
        }
        if ((stopLossNumber === null) !== (takeProfitNumber === null)) {
            setError("Provide both Stop Loss and Take Profit, or leave both empty.");
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
            const res = await fetch(`${API}/trades/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    symbol: editSymbol,
                    direction: editDirection,
                    entryPrice: entryPriceNumber,
                    stopLossPrice: stopLossNumber,
                    takeProfitPrice: takeProfitNumber,
                    createdAt: createdAtIso,
                    closedAt: closedAtIso,
                }),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Update trade failed (${res.status}): ${txt}`);
            }

            setEditingId(null);
            await loadTrades();
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

            await loadTrades();
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
        if ((stopLossNumber === null) !== (takeProfitNumber === null)) {
            setError("Provide both Stop Loss and Take Profit, or leave both empty.");
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
            await loadTrades();
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

    function clearFilters() {
        setFilters({ symbol: "all", direction: "all", session: "all" });
        setDatePreset("all");
        setFromDate("");
        setToDate("");
        setClosedDatePreset("all");
        setClosedFromDate("");
        setClosedToDate("");
    }

    useEffect(() => {
        if (token) loadTrades();
    }, [token]);
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
                                <button className="btn" onClick={loadTrades}>Refresh</button>
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
                                if (stopLossPrice === "" && takeProfitPrice === "") {
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
                                    {isLoading && <span className="loading">Loading trades...</span>}
                                   
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
                                        <th className="num">Entry</th>
                                        <th className="num">SL</th>
                                        <th className="num">TP</th>
                                        <th className="num">SL pips</th>
                                        <th className="num">TP pips</th>
                                        <th className="num">RR</th>
                                        <th>Created</th>
                                        <th>Closed</th>
                                        <th>Duration</th>
                                        <th>Session</th>
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
                                            <th />
                                            <th />
                                            <th />
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
                                            <th />
                                            <th>
                                                <select
                                                    className="input filter-input"
                                                    value={filters.session}
                                                    onChange={(e) => setFilters((prev) => ({ ...prev, session: e.target.value }))}
                                                    aria-label="Filter by session"
                                                >
                                                    <option value="all">All</option>
                                                    {SESSION_FILTER_OPTIONS.map((option) => (
                                                        <option key={option} value={option}>
                                                            {option}
                                                        </option>
                                                    ))}
                                                </select>
                                            </th>
                                            <th className="actions"></th>
                                        </tr>
                                    )}
                                    </thead>

                                    <tbody>
                                    {filteredTrades.length === 0 ? (
                                        <tr>
                                            <td className="empty" colSpan={13}>No trades yet.</td>
                                        </tr>
                                    ) : (
                                        filteredTrades.map((t) => (
                                            <tr key={t.id}>
                                                {editingId === t.id ? (
                                                    <>
                                                        <td>
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
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="input"
                                                                value={editDirection}
                                                                onChange={(e) => setEditDirection(e.target.value)}
                                                            >
                                                                <option value="LONG">LONG</option>
                                                                <option value="SHORT">SHORT</option>
                                                            </select>
                                                        </td>
                                                        <td className="num">
                                                            <input
                                                                className="input"
                                                                value={editEntryPrice}
                                                                onChange={(e) => setEditEntryPrice(e.target.value)}
                                                                placeholder="Entry price"
                                                                type="number"
                                                                step="0.00001"
                                                                min="0"
                                                            />
                                                        </td>
                                                        <td className="num">
                                                            <input
                                                                className="input"
                                                                value={editStopLossPrice}
                                                                onChange={(e) => setEditStopLossPrice(e.target.value)}
                                                                placeholder="Stop loss"
                                                                type="number"
                                                                step="0.00001"
                                                                min="0"
                                                            />
                                                        </td>
                                                        <td className="num">
                                                            <input
                                                                className="input"
                                                                value={editTakeProfitPrice}
                                                                onChange={(e) => setEditTakeProfitPrice(e.target.value)}
                                                                placeholder="Take profit"
                                                                type="number"
                                                                step="0.00001"
                                                                min="0"
                                                            />
                                                        </td>
                                                        <td className="num">{t.slPips ?? "-"}</td>
                                                        <td className="num">{t.tpPips ?? "-"}</td>
                                                        <td className="num">{t.rrRatio ?? "-"}</td>
                                                        <td>
                                                            <input
                                                                className="input"
                                                                value={editCreatedAt}
                                                                onChange={(e) => setEditCreatedAt(e.target.value)}
                                                                type="datetime-local"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                className="input"
                                                                value={editClosedAt}
                                                                onChange={(e) => setEditClosedAt(e.target.value)}
                                                                type="datetime-local"
                                                            />
                                                        </td>
                                                        <td>{formatDuration(editCreatedAt, editClosedAt)}</td>
                                                        <td>{getSessionLabel(editCreatedAt)}</td>
                                                        <td className="actions">
                                                            <div className="actions">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary"
                                                                    onClick={(e) => updateTrade(t.id, e)}
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn"
                                                                    onClick={cancelEdit}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td>{formatSymbol(t.symbol)}</td>
                                                        <td>{t.direction}</td>
                                                        <td className="num">{t.entryPrice ?? "-"}</td>
                                                        <td className="num">{t.stopLossPrice ?? "-"}</td>
                                                        <td className="num">{t.takeProfitPrice ?? "-"}</td>
                                                        <td className="num">{t.slPips ?? "-"}</td>
                                                        <td className="num">{t.tpPips ?? "-"}</td>
                                                        <td className="num">{t.rrRatio ?? "-"}</td>
                                                        <td>{formatDate(t.createdAt)}</td>
                                                        <td>{formatDate(t.closedAt)}</td>
                                                        <td>{formatDuration(t.createdAt, t.closedAt)}</td>
                                                        <td>{getSessionLabel(t.createdAt)}</td>
                                                        <td className="actions">
                                                            <div className="actions">
                                                                <button
                                                                    className="btn"
                                                                    onClick={() => startEdit(t)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="btn btn-danger"
                                                                    onClick={() => deleteTrade(t.id)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
