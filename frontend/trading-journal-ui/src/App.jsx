import { useEffect, useMemo, useRef, useState } from "react";
import { exportToCsv } from "./utils/exportCsv";
import { INSTRUMENTS, getDisplayUnit, getInstrument, getTickSize } from "./constants/instruments";
import { calculateRiskPosition } from "./utils/riskCalculator";
import { getPriceStep, formatPriceValue } from "./shared/lib/price";
import { formatMoneyValue, formatMoneyNullable, formatPercentValue, formatRValue, formatWinPct } from "./shared/lib/format";
import {
    parseCreatedAt,
    formatDate,
    toIsoString,
    toDateTimeLocalValue,
    toIsoFromLocal,
    matchesDatePreset,
    formatDuration,
} from "./shared/lib/datetime";
import { normalizeEmail, tryExtractEmailFromIdToken } from "./shared/lib/authToken";
import { formatCalcNumber, formatCalcInteger, formatCalcPrice } from "./features/risk/utils/riskFormat";
import {
    computeStrategyOutcomeR,
    isNetPnlPresent,
    getRealizedRIfPresent,
    getOutcomeRForMode,
    formatOutcome as formatOutcomeUtil,
    getOutcomeClass as getOutcomeClassUtil,
} from "./features/stats/utils/outcomes";
import TradeDetailsPanelLeft from "./features/trades/components/TradeDetailsPanelLeft";
import TradeDetailsPanelRight from "./features/attachments/components/TradeDetailsPanelRight";
import HeaderBar from "./app/layout/HeaderBar";
import AuthCard from "./features/auth/components/AuthCard";
import AddTradeForm from "./features/trades/components/AddTradeForm";
import FiltersPanel from "./features/trades/components/FiltersPanel";
import TradesTable from "./features/trades/components/TradesTable";
import Pagination from "./shared/components/Pagination";
import DeleteTradeModal from "./features/trades/components/DeleteTradeModal";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const API = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;
const API_ROOT = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
const REFRESH_COOLDOWN_MS = 2000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const TIMEFRAME_OPTIONS = [
    { value: "", label: "\u2014" },
    { value: "1m", label: "1m" },
    { value: "3m", label: "3m" },
    { value: "5m", label: "5m" },
    { value: "15m", label: "15m" },
    { value: "30m", label: "30m" },
    { value: "1H", label: "1H" },
    { value: "2H", label: "2H" },
    { value: "4H", label: "4H" },
    { value: "8H", label: "8H" },
    { value: "12H", label: "12H" },
    { value: "1D", label: "1D" },
    { value: "1W", label: "1W" },
    { value: "1M", label: "1M" },
];
const ACCOUNT_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY"];
const CASHFLOW_TYPES = [
    { value: "DEPOSIT", label: "Deposit" },
    { value: "WITHDRAWAL", label: "Withdrawal" },
];
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
    const [email, setEmail] = useState("test@example.com");
    const [password, setPassword] = useState("pass1234");
    const [token, setToken] = useState(localStorage.getItem("token") || "");
    const [authMode, setAuthMode] = useState("login");
    const [accountSettings, setAccountSettings] = useState(null);
    const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
    const [accountSettingsBalance, setAccountSettingsBalance] = useState("");
    const [accountSettingsRiskPercent, setAccountSettingsRiskPercent] = useState("");
    const [accountSettingsCurrency, setAccountSettingsCurrency] = useState("");
    const [accountSettingsError, setAccountSettingsError] = useState("");
    const [isAccountSettingsSaving, setIsAccountSettingsSaving] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [cashflows, setCashflows] = useState([]);
    const [isCashflowsOpen, setIsCashflowsOpen] = useState(false);
    const [cashflowType, setCashflowType] = useState("DEPOSIT");
    const [cashflowAmount, setCashflowAmount] = useState("");
    const [cashflowOccurredAt, setCashflowOccurredAt] = useState("");
    const [cashflowNote, setCashflowNote] = useState("");
    const [cashflowError, setCashflowError] = useState("");
    const [isCashflowSaving, setIsCashflowSaving] = useState(false);
    const [cashflowEditId, setCashflowEditId] = useState(null);
    const [cashflowEditType, setCashflowEditType] = useState("DEPOSIT");
    const [cashflowEditAmount, setCashflowEditAmount] = useState("");
    const [cashflowEditOccurredAt, setCashflowEditOccurredAt] = useState("");
    const [cashflowEditNote, setCashflowEditNote] = useState("");
    const [cashflowEditError, setCashflowEditError] = useState("");
    const [isCashflowEditOpen, setIsCashflowEditOpen] = useState(false);
    const [cashflowDeleteTarget, setCashflowDeleteTarget] = useState(null);
    const [isCashflowDeleteOpen, setIsCashflowDeleteOpen] = useState(false);

    const [trades, setTrades] = useState([]);
    const [statsMode, setStatsMode] = useState("strategy");
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
    const [editCloseReasonOverride, setEditCloseReasonOverride] = useState("");
    const [editManualReason, setEditManualReason] = useState("");
    const [editManualDescription, setEditManualDescription] = useState("");
    const [editNetPnlMoney, setEditNetPnlMoney] = useState("");
    const [editCommissionMoney, setEditCommissionMoney] = useState("");
    const [editSwapMoney, setEditSwapMoney] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isDetailsEditing, setIsDetailsEditing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAttachmentDeleteModalOpen, setIsAttachmentDeleteModalOpen] = useState(false);
    const [attachmentToDelete, setAttachmentToDelete] = useState(null);
    const [selectedTradeForDetails, setSelectedTradeForDetails] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [attachmentsBySection, setAttachmentsBySection] = useState({
        PREPARATION: [],
        ENTRY: [],
        EXIT: [],
    });
    const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
    const [attachSection, setAttachSection] = useState(null);
    const [attachTradeId, setAttachTradeId] = useState(null);
    const [attachFile, setAttachFile] = useState(null);
    const [attachPreviewUrl, setAttachPreviewUrl] = useState("");
    const [attachError, setAttachError] = useState("");
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const [isAttachmentDragOver, setIsAttachmentDragOver] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState("");
    const [lightboxScale, setLightboxScale] = useState(1);
    const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 });
    const [lightboxDragging, setLightboxDragging] = useState(false);
    const [lightboxDragStart, setLightboxDragStart] = useState({ x: 0, y: 0 });
    const attachmentInputRef = useRef(null);
    const leftPanelRef = useRef(null);
    const rightPanelRef = useRef(null);
    const accountMenuRef = useRef(null);
    const accountMenuButtonRef = useRef(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewTradeId, setReviewTradeId] = useState(null);
    const [reviewFollowedPlan, setReviewFollowedPlan] = useState("");
    const [reviewMistakesMode, setReviewMistakesMode] = useState("none");
    const [reviewMistakesText, setReviewMistakesText] = useState("");
    const [reviewImprovementMode, setReviewImprovementMode] = useState("none");
    const [reviewImprovementText, setReviewImprovementText] = useState("");
    const [reviewConfidence, setReviewConfidence] = useState(5);
    const [reviewError, setReviewError] = useState("");
    const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
    const [isRiskCalcOpen, setIsRiskCalcOpen] = useState(false);
    const [riskCalcAccountCurrency, setRiskCalcAccountCurrency] = useState("USD");
    const [riskCalcBalance, setRiskCalcBalance] = useState("");
    const [riskCalcRiskPercent, setRiskCalcRiskPercent] = useState("1.0");
    const [riskCalcSymbol, setRiskCalcSymbol] = useState(symbol);
    const [riskCalcEntryPrice, setRiskCalcEntryPrice] = useState("");
    const [riskCalcStopLossPrice, setRiskCalcStopLossPrice] = useState("");
    const [riskCalcConversionRate, setRiskCalcConversionRate] = useState("");
    const [riskCalcContractSize, setRiskCalcContractSize] = useState("100");

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [refreshBlockedUntil, setRefreshBlockedUntil] = useState(0);
    const BASE_SESSION_OFFSET = 1; // GMT+1
    const [filters, setFilters] = useState({
        symbol: "all",
        direction: "all",
        status: "all",
    });
    const [datePreset, setDatePreset] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const refreshBlocked = refreshBlockedUntil && Date.now() < refreshBlockedUntil;
    const refreshCooldownSeconds = refreshBlocked ? Math.ceil((refreshBlockedUntil - Date.now()) / 1000) : 0;

    function formatCashflowTypeLabel(value) {
        if (!value) return "Deposit";
        const normalized = String(value).toUpperCase();
        return normalized === "WITHDRAWAL" ? "Withdrawal" : "Deposit";
    }

    function formatCashflowAmount(cashflow) {
        if (!cashflow) return "\u2014";
        const amountNumber = Number(cashflow.amountMoney);
        if (!Number.isFinite(amountNumber)) return "\u2014";
        const isWithdrawal = String(cashflow.type || "").toUpperCase() === "WITHDRAWAL";
        const signedAmount = isWithdrawal ? -Math.abs(amountNumber) : Math.abs(amountNumber);
        return formatMoneyValue(signedAmount, accountSettings?.currency);
    }

    const formatOutcome = (trade) => formatOutcomeUtil(trade, {
        statsMode,
        realizedLedgerByTrade: realizedLedger?.byTrade,
    });

    const getOutcomeClass = (trade) => getOutcomeClassUtil(trade, {
        statsMode,
        realizedLedgerByTrade: realizedLedger?.byTrade,
    });

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

    function formatSymbol(symbol) {
        // Convert "EURUSD" to "EUR/USD" for display
        if (!symbol) return "-";
        const instrument = getInstrument(symbol);
        return instrument?.label || symbol;
    }

    function computeDerived(symbol, direction, entry, stopLoss, takeProfit) {
        const entryNum = Number(entry);
        const slNum = Number(stopLoss);
        const tpNum = Number(takeProfit);
        if (!Number.isFinite(entryNum) || !Number.isFinite(slNum) || !Number.isFinite(tpNum)) return null;
        if (entryNum <= 0 || slNum <= 0 || tpNum <= 0) return null;

        const isLong = direction?.toUpperCase() === "LONG";
        const pipSize = getTickSize(symbol);

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

    function logout() {
        setToken("");
        localStorage.removeItem("token");
        setTrades([]);
        setAccountSettings(null);
        setCashflows([]);
        setIsCashflowsOpen(false);
        setIsCashflowEditOpen(false);
        setIsCashflowDeleteOpen(false);
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

    useEffect(() => {
        if (!attachFile) {
            setAttachPreviewUrl("");
            return undefined;
        }
        const url = URL.createObjectURL(attachFile);
        setAttachPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [attachFile]);

    useEffect(() => {
        if (!isAttachModalOpen) return undefined;
        const handlePaste = (event) => {
            const items = event.clipboardData?.items || [];
            for (const item of items) {
                if (item.type && item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) {
                        handleAttachmentFile(file);
                        event.preventDefault();
                        return;
                    }
                }
            }
        };
        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [isAttachModalOpen]);

    useEffect(() => {
        if (!isAttachModalOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                closeAttachModal();
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isAttachModalOpen]);

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

    async function loadAccountSettings() {
        if (!token) return;
        setAccountSettingsError("");
        try {
            const res = await fetch(`${API}/account-settings`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 404) {
                setAccountSettings(null);
                return;
            }
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Load account settings failed (${res.status}): ${txt}`);
            }
            const data = await res.json();
            setAccountSettings(data);
        } catch (err) {
            setAccountSettingsError(String(err));
        }
    }

    async function loadCashflows() {
        if (!token) return;
        setCashflowError("");
        try {
            const res = await fetch(`${API}/cashflows`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Load cashflows failed (${res.status}): ${txt}`);
            }
            const data = await res.json();
            setCashflows(Array.isArray(data) ? data : []);
        } catch (err) {
            setCashflowError(String(err).replace(/^Error:\s*/, ""));
        }
    }

    async function loadAttachments(tradeId) {
        if (!tradeId) return;
        try {
            const res = await fetch(`${API}/trades/${tradeId}/attachments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Load attachments failed (${res.status}): ${txt}`);
            }
            const data = await res.json();
            const next = { PREPARATION: [], ENTRY: [], EXIT: [] };
            data.forEach((item) => {
                if (!item?.section) return;
                const imageUrl = item.imageUrl?.startsWith("/")
                    ? `${API_ROOT}${item.imageUrl}`
                    : item.imageUrl;
                if (!next[item.section]) next[item.section] = [];
                next[item.section].push({ ...item, imageUrl });
            });
            setAttachmentsBySection(next);
        } catch (err) {
            setError(String(err));
            resetAttachments();
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
        setEditCloseReasonOverride(trade.closeReasonOverride ?? "");
        setEditManualReason(trade.manualReason ?? "");
        setEditManualDescription(trade.manualDescription ?? "");
        if (statsMode === "realized") {
            setEditNetPnlMoney(trade.netPnlMoney != null ? trade.netPnlMoney.toString() : "");
            setEditCommissionMoney(trade.commissionMoney != null ? trade.commissionMoney.toString() : "");
            setEditSwapMoney(trade.swapMoney != null ? trade.swapMoney.toString() : "");
        } else {
            setEditNetPnlMoney("");
            setEditCommissionMoney("");
            setEditSwapMoney("");
        }
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
        setEditCloseReasonOverride("");
        setEditManualReason("");
        setEditManualDescription("");
        setEditNetPnlMoney("");
        setEditCommissionMoney("");
        setEditSwapMoney("");
        setError("");
    }

    function resetAttachments() {
        setAttachmentsBySection({
            PREPARATION: [],
            ENTRY: [],
            EXIT: [],
        });
    }

    function openAttachModal(section) {
        setAttachSection(section);
        setAttachTradeId(selectedTradeForDetails?.id || null);
        setAttachFile(null);
        setAttachError("");
        setIsAttachmentDragOver(false);
        setIsUploadingAttachment(false);
        setIsAttachModalOpen(true);
    }

    function closeAttachModal() {
        setIsAttachModalOpen(false);
        setAttachSection(null);
        setAttachTradeId(null);
        resetAttachmentPreview();
        setIsAttachmentDragOver(false);
        setIsUploadingAttachment(false);
    }

    function openAccountSettingsModal() {
        setAccountSettingsError("");
        setAccountSettingsBalance(accountSettings?.startingBalance?.toString() || "");
        setAccountSettingsRiskPercent(accountSettings?.riskPercent?.toString() || "");
        setAccountSettingsCurrency(accountSettings?.currency ?? "");
        setIsAccountSettingsOpen(true);
    }

    function closeAccountSettingsModal() {
        setIsAccountSettingsOpen(false);
        setAccountSettingsError("");
    }

    async function saveAccountSettings() {
        if (isAccountSettingsSaving) return;
        setAccountSettingsError("");
        const startingBalance = Number(accountSettingsBalance);
        const riskPercent = Number(accountSettingsRiskPercent);
        if (!Number.isFinite(startingBalance) || startingBalance <= 0) {
            setAccountSettingsError("Starting balance must be positive.");
            return;
        }
        if (!Number.isFinite(riskPercent) || riskPercent <= 0 || riskPercent > 100) {
            setAccountSettingsError("Risk % must be between 0 and 100.");
            return;
        }
        setIsAccountSettingsSaving(true);
        try {
            const res = await fetch(`${API}/account-settings`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    startingBalance,
                    riskPercent,
                    currency: accountSettingsCurrency || null,
                }),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Save account settings failed (${res.status}): ${txt}`);
            }
            const data = await res.json();
            setAccountSettings(data);
            setIsAccountSettingsOpen(false);
        } catch (err) {
            setAccountSettingsError(String(err).replace(/^Error:\s*/, ""));
        } finally {
            setIsAccountSettingsSaving(false);
        }
    }

    function openCashflowsModal() {
        setCashflowError("");
        setCashflowType("DEPOSIT");
        setCashflowAmount("");
        setCashflowOccurredAt(toDateTimeLocalValue(new Date()));
        setCashflowNote("");
        setIsCashflowsOpen(true);
        loadCashflows();
    }

    function closeCashflowsModal() {
        setIsCashflowsOpen(false);
        setCashflowError("");
    }

    function openCashflowEditModal(cashflow) {
        if (!cashflow) return;
        setCashflowEditId(cashflow.id);
        setCashflowEditType(cashflow.type ?? "DEPOSIT");
        setCashflowEditAmount(cashflow.amountMoney != null ? String(cashflow.amountMoney) : "");
        setCashflowEditOccurredAt(toDateTimeLocalValue(cashflow.occurredAt));
        setCashflowEditNote(cashflow.note ?? "");
        setCashflowEditError("");
        setIsCashflowEditOpen(true);
    }

    function closeCashflowEditModal() {
        setIsCashflowEditOpen(false);
        setCashflowEditId(null);
        setCashflowEditError("");
    }

    async function createCashflow() {
        if (isCashflowSaving) return;
        setCashflowError("");
        const amountNumber = Number(cashflowAmount);
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            setCashflowError("Amount must be a positive number.");
            return;
        }
        if (!cashflowType) {
            setCashflowError("Type is required.");
            return;
        }
        const occurredAtIso = toIsoFromLocal(cashflowOccurredAt);
        if (!occurredAtIso) {
            setCashflowError("Date/time is required.");
            return;
        }
        setIsCashflowSaving(true);
        try {
            const res = await fetch(`${API}/cashflows`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    type: cashflowType,
                    amountMoney: amountNumber,
                    occurredAt: occurredAtIso,
                    note: cashflowNote?.trim() ? cashflowNote.trim() : null,
                }),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Create cashflow failed (${res.status}): ${txt}`);
            }
            setCashflowAmount("");
            setCashflowNote("");
            setCashflowOccurredAt(toDateTimeLocalValue(new Date()));
            await loadCashflows();
        } catch (err) {
            setCashflowError(String(err).replace(/^Error:\s*/, ""));
        } finally {
            setIsCashflowSaving(false);
        }
    }

    async function saveCashflowEdit() {
        if (!cashflowEditId) return;
        setCashflowEditError("");
        const amountNumber = Number(cashflowEditAmount);
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            setCashflowEditError("Amount must be a positive number.");
            return;
        }
        if (!cashflowEditType) {
            setCashflowEditError("Type is required.");
            return;
        }
        const occurredAtIso = toIsoFromLocal(cashflowEditOccurredAt);
        if (!occurredAtIso) {
            setCashflowEditError("Date/time is required.");
            return;
        }
        try {
            const res = await fetch(`${API}/cashflows/${cashflowEditId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    type: cashflowEditType,
                    amountMoney: amountNumber,
                    occurredAt: occurredAtIso,
                    note: cashflowEditNote?.trim() ? cashflowEditNote.trim() : null,
                }),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Update cashflow failed (${res.status}): ${txt}`);
            }
            closeCashflowEditModal();
            await loadCashflows();
        } catch (err) {
            setCashflowEditError(String(err).replace(/^Error:\s*/, ""));
        }
    }

    async function deleteCashflow(id) {
        if (!id) return;
        try {
            const res = await fetch(`${API}/cashflows/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Delete cashflow failed (${res.status}): ${txt}`);
            }
            await loadCashflows();
        } catch (err) {
            setCashflowError(String(err).replace(/^Error:\s*/, ""));
        }
    }

    function requestDeleteCashflow(cashflow) {
        if (!cashflow) return;
        setCashflowDeleteTarget(cashflow);
        setIsCashflowDeleteOpen(true);
    }

    async function confirmDeleteCashflow() {
        if (!cashflowDeleteTarget) return;
        await deleteCashflow(cashflowDeleteTarget.id);
        setIsCashflowDeleteOpen(false);
        setCashflowDeleteTarget(null);
    }

    function handleAttachmentFile(file) {
        if (!file) return;
        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
            setAttachError("Unsupported file type. Use PNG, JPG, or WEBP.");
            return;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
            setAttachError("File too large. Max size is 10MB.");
            return;
        }
        setAttachError("");
        setAttachFile(file);
    }

    function resetAttachmentPreview() {
        setAttachFile(null);
        setAttachError("");
        if (attachmentInputRef.current) {
            attachmentInputRef.current.value = "";
        }
    }

    function handleAttachmentDrop(event) {
        event.preventDefault();
        setIsAttachmentDragOver(false);
        const file = event.dataTransfer?.files?.[0];
        if (file) {
            handleAttachmentFile(file);
        }
    }

    function handleAttachmentDragOver(event) {
        event.preventDefault();
        setIsAttachmentDragOver(true);
    }

    function handleAttachmentDragLeave(event) {
        event.preventDefault();
        setIsAttachmentDragOver(false);
    }

    async function confirmAttachmentUpload() {
        if (!attachTradeId) {
            setAttachError("Select a trade before attaching.");
            return;
        }
        if (!attachSection) {
            setAttachError("Select a section before attaching.");
            return;
        }
        if (!attachFile) {
            setAttachError("Please choose an image before confirming.");
            return;
        }
        setAttachError("");
        setIsUploadingAttachment(true);
        try {
            const form = new FormData();
            form.append("section", attachSection);
            form.append("file", attachFile);
            const res = await fetch(`${API}/trades/${attachTradeId}/attachments`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Upload failed (${res.status}): ${txt}`);
            }
            const createdRaw = await res.json();
            const created = {
                ...createdRaw,
                imageUrl: createdRaw.imageUrl?.startsWith("/")
                    ? `${API_ROOT}${createdRaw.imageUrl}`
                    : createdRaw.imageUrl,
            };
            setAttachmentsBySection((prev) => {
                const next = {
                    PREPARATION: [...(prev.PREPARATION || [])],
                    ENTRY: [...(prev.ENTRY || [])],
                    EXIT: [...(prev.EXIT || [])],
                };
                if (!next[created.section]) next[created.section] = [];
                next[created.section] = [created, ...next[created.section]];
                return next;
            });
            closeAttachModal();
        } catch (err) {
            setAttachError(String(err).replace(/^Error:\s*/, ""));
        } finally {
            setIsUploadingAttachment(false);
        }
    }

    async function updateAttachmentTimeframe(attachmentId, timeframe) {
        if (!attachmentId) return;
        try {
            const res = await fetch(`${API}/attachments/${attachmentId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ timeframe }),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Update attachment failed (${res.status}): ${txt}`);
            }
            const updatedRaw = await res.json();
            const updated = {
                ...updatedRaw,
                imageUrl: updatedRaw.imageUrl?.startsWith("/")
                    ? `${API_ROOT}${updatedRaw.imageUrl}`
                    : updatedRaw.imageUrl,
            };
            setAttachmentsBySection((prev) => {
                const next = {
                    PREPARATION: [...(prev.PREPARATION || [])],
                    ENTRY: [...(prev.ENTRY || [])],
                    EXIT: [...(prev.EXIT || [])],
                };
                Object.keys(next).forEach((section) => {
                    next[section] = next[section].map((item) => (item.id === updated.id ? updated : item));
                });
                return next;
            });
        } catch (err) {
            setError(String(err));
        }
    }

    async function removeAttachment(attachment) {
        if (!attachment?.id) return;
        try {
            const res = await fetch(`${API}/attachments/${attachment.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Delete attachment failed (${res.status}): ${txt}`);
            }
            setAttachmentsBySection((prev) => {
                const next = {
                    PREPARATION: [...(prev.PREPARATION || [])],
                    ENTRY: [...(prev.ENTRY || [])],
                    EXIT: [...(prev.EXIT || [])],
                };
                Object.keys(next).forEach((section) => {
                    next[section] = next[section].filter((item) => item.id !== attachment.id);
                });
                return next;
            });
        } catch (err) {
            setError(String(err));
        }
    }

    async function confirmDeleteAttachment() {
        if (!attachmentToDelete) return;
        await removeAttachment(attachmentToDelete);
        setIsAttachmentDeleteModalOpen(false);
        setAttachmentToDelete(null);
    }

    function openTradeDetails(trade) {
        setIsDetailsEditing(false);
        cancelEdit();
        setIsDeleteModalOpen(false);
        setIsAttachmentDeleteModalOpen(false);
        setAttachmentToDelete(null);
        closeAttachModal();
        setLightboxUrl("");
        setSelectedTradeForDetails(trade);
        setIsDetailsOpen(true);
    }

    function closeTradeDetails() {
        setIsDetailsOpen(false);
        setSelectedTradeForDetails(null);
        setIsDetailsEditing(false);
        setIsDeleteModalOpen(false);
        setIsAttachmentDeleteModalOpen(false);
        setAttachmentToDelete(null);
        setLightboxUrl("");
        closeAttachModal();
        resetAttachments();
        cancelEdit();
    }

    useEffect(() => {
        if (!isDetailsOpen || !selectedTradeForDetails?.id) {
            resetAttachments();
            return;
        }
        loadAttachments(selectedTradeForDetails.id);
    }, [isDetailsOpen, selectedTradeForDetails?.id]);

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

    async function closeTradeInline(trade, {
        exitPrice,
        closedAtLocal,
        closeReasonOverride,
        manualReason,
        manualDescription,
        netPnlMoney,
        commissionMoney,
        swapMoney,
    }) {
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
        if (netPnlMoney != null && !Number.isFinite(netPnlMoney)) {
            throw new Error("Net P/L must be a valid number.");
        }
        if (commissionMoney != null && (!Number.isFinite(commissionMoney) || commissionMoney < 0)) {
            throw new Error("Commission must be a valid non-negative number.");
        }
        if (swapMoney != null && !Number.isFinite(swapMoney)) {
            throw new Error("Swap must be a valid number.");
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
            commissionMoney: commissionMoney ?? null,
            swapMoney: swapMoney ?? null,
            netPnlMoney: netPnlMoney ?? null,
            createdAt: createdAtIso,
            closedAt: closedAtIso,
        };

        const updated = await updateTradeRequest(trade.id, payload);
        setSelectedTradeForDetails(updated);
        await loadTrades({ force: true });
        openReviewModal(updated);
        return updated;
    }

    function openReviewModal(trade) {
        if (!trade?.id) return;
        setReviewTradeId(trade.id);
        setReviewFollowedPlan(trade.followedPlan ?? "");
        const existingMistakes = trade.mistakesText ?? "";
        setReviewMistakesText(existingMistakes);
        setReviewMistakesMode(existingMistakes ? "write" : "none");
        const existingImprovement = trade.improvementText ?? "";
        setReviewImprovementText(existingImprovement);
        setReviewImprovementMode(existingImprovement ? "write" : "none");
        setReviewConfidence(Number.isFinite(trade.confidence) ? trade.confidence : 5);
        setReviewError("");
        setIsReviewSubmitting(false);
        setIsReviewModalOpen(true);
    }

    function closeReviewModal() {
        setIsReviewModalOpen(false);
        setReviewTradeId(null);
        setReviewError("");
    }

    function openRiskCalc() {
        setRiskCalcSymbol(symbol);
        if (entryPrice !== "") setRiskCalcEntryPrice(entryPrice);
        if (stopLossPrice !== "") setRiskCalcStopLossPrice(stopLossPrice);
        setIsRiskCalcOpen(true);
    }

    function closeRiskCalc() {
        setIsRiskCalcOpen(false);
    }

    async function updateTradeReviewRequest(id, payload) {
        const res = await fetch(`${API}/trades/${id}/review`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Update review failed (${res.status}): ${txt}`);
        }

        return res.json();
    }

    async function submitReview() {
        if (!reviewTradeId) return;
        if (!reviewFollowedPlan) {
            setReviewError("Please select whether you followed the plan.");
            return;
        }
        if (!Number.isFinite(reviewConfidence) || reviewConfidence < 1 || reviewConfidence > 10) {
            setReviewError("Confidence must be between 1 and 10.");
            return;
        }
        setReviewError("");
        setIsReviewSubmitting(true);
        try {
            const payload = {
                followedPlan: reviewFollowedPlan,
                mistakesText: reviewMistakesMode === "write" ? reviewMistakesText : "",
                improvementText: reviewImprovementMode === "write" ? reviewImprovementText : "",
                confidence: reviewConfidence,
            };
            const updated = await updateTradeReviewRequest(reviewTradeId, payload);
            setSelectedTradeForDetails((prev) => (prev?.id === updated.id ? updated : prev));
            setTrades((prev) => prev.map((trade) => (trade.id === updated.id ? updated : trade)));
            closeReviewModal();
        } catch (err) {
            setReviewError(String(err).replace(/^Error:\s*/, ""));
        } finally {
            setIsReviewSubmitting(false);
        }
    }

    async function updateTrade(id, e) {
        e?.preventDefault();
        setError("");

        if (!id) {
            setError("No trade selected.");
            return false;
        }

        const entryPriceNumber = Number(editEntryPrice);
        const exitPriceNumber = editExitPrice === "" ? null : Number(editExitPrice);
        const stopLossNumber = editStopLossPrice === "" ? null : Number(editStopLossPrice);
        const takeProfitNumber = editTakeProfitPrice === "" ? null : Number(editTakeProfitPrice);
        const createdAtIso = toIsoFromLocal(editCreatedAt);
        const closedAtIso = toIsoFromLocal(editClosedAt);
        if (!Number.isFinite(entryPriceNumber) || entryPriceNumber <= 0) {
            setError("Entry must be a positive number.");
            return false;
        }
        if (editExitPrice !== "" && (!Number.isFinite(exitPriceNumber) || exitPriceNumber <= 0)) {
            setError("Exit must be a positive number.");
            return false;
        }
        if (closedAtIso && (exitPriceNumber == null || exitPriceNumber <= 0)) {
            setError("Exit must be provided when closing a trade.");
            return false;
        }
        if (!createdAtIso) {
            setError("Created time is required.");
            return false;
        }
        if (closedAtIso) {
            if (editCloseReasonOverride === "Manual") {
                if (!editManualReason) {
                    setError("Manual Reason is required when Close Reason is Manual.");
                    return false;
                }
                if (editManualReason === "Other" && !editManualDescription.trim()) {
                    setError("Description is required when Manual Reason is Other.");
                    return false;
                }
            }
        }
        if (stopLossNumber !== null && takeProfitNumber !== null) {
            const derived = computeDerived(editSymbol, editDirection, entryPriceNumber, stopLossNumber, takeProfitNumber);
            if (!derived) {
                setError("Entry, Stop Loss, and Take Profit must be valid and ordered correctly for the direction.");
                return false;
            }
        }

        try {
            const isClosingEdit = Boolean(closedAtIso);
            const existingTrade = trades.find((trade) => trade.id === id) || selectedTradeForDetails;
            const existingNetPnl = existingTrade?.netPnlMoney ?? null;
            const existingCommission = existingTrade?.commissionMoney ?? null;
            const existingSwap = existingTrade?.swapMoney ?? null;
            let nextNetPnl = existingNetPnl;
            let nextCommission = existingCommission;
            let nextSwap = existingSwap;
            if (statsMode === "realized" && isClosingEdit) {
                const netInput = editNetPnlMoney.trim();
                const commissionInput = editCommissionMoney.trim();
                const swapInput = editSwapMoney.trim();
                const parsedNet = netInput === "" ? null : Number(netInput);
                if (netInput !== "" && !Number.isFinite(parsedNet)) {
                    setError("Net P/L must be a valid number.");
                    return false;
                }
                const parsedCommission = commissionInput === "" ? null : Number(commissionInput);
                if (commissionInput !== "" && (!Number.isFinite(parsedCommission) || parsedCommission < 0)) {
                    setError("Commission must be a valid non-negative number.");
                    return false;
                }
                const parsedSwap = swapInput === "" ? null : Number(swapInput);
                if (swapInput !== "" && !Number.isFinite(parsedSwap)) {
                    setError("Swap must be a valid number.");
                    return false;
                }
                nextNetPnl = parsedNet;
                nextCommission = parsedCommission;
                nextSwap = parsedSwap;
            }
            const manualReasonToSend = isClosingEdit && editCloseReasonOverride === "Manual" ? editManualReason : null;
            const manualDescriptionToSend =
                isClosingEdit && editCloseReasonOverride === "Manual" && editManualReason === "Other"
                    ? editManualDescription.trim()
                    : null;
            const updated = await updateTradeRequest(id, {
                symbol: editSymbol,
                direction: editDirection,
                entryPrice: entryPriceNumber,
                exitPrice: exitPriceNumber,
                stopLossPrice: stopLossNumber,
                takeProfitPrice: takeProfitNumber,
                closeReasonOverride: isClosingEdit ? (editCloseReasonOverride || null) : null,
                manualReason: manualReasonToSend,
                manualDescription: manualDescriptionToSend,
                commissionMoney: nextCommission,
                swapMoney: nextSwap,
                netPnlMoney: nextNetPnl,
                createdAt: createdAtIso,
                closedAt: closedAtIso,
            });
            setSelectedTradeForDetails(updated);
            setIsDetailsEditing(false);
            setEditingId(null);
            await loadTrades({ force: true });
            return true;
        } catch (err) {
            setError(String(err));
            return false;
        }
    }

    function beginDetailsEdit() {
        if (!selectedTradeForDetails) return;
        startEdit(selectedTradeForDetails);
        setIsDetailsEditing(true);
    }

    function cancelDetailsEdit() {
        setIsDetailsEditing(false);
        cancelEdit();
    }

    async function saveDetailsEdit() {
        const ok = await updateTrade(editingId);
        if (ok) {
            closeTradeDetails();
        }
    }

    async function deleteTradeFromDetails() {
        if (!selectedTradeForDetails) return;
        setIsDeleteModalOpen(true);
    }

    async function confirmDeleteTrade() {
        if (!selectedTradeForDetails) return;
        const ok = await deleteTrade(selectedTradeForDetails.id);
        if (ok) {
            setIsDeleteModalOpen(false);
            closeTradeDetails();
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
            return true;
        } catch (e) {
            setError(String(e));
            return false;
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

    const ledgerEvents = useMemo(() => {
        const events = [];
        cashflows.forEach((cashflow) => {
            if (!cashflow?.occurredAt) return;
            const ts = parseCreatedAt(cashflow.occurredAt);
            if (!ts) return;
            const amount = Number(cashflow.amountMoney);
            if (!Number.isFinite(amount)) return;
            events.push({
                kind: "cashflow",
                ts: ts.getTime(),
                id: cashflow.id ?? 0,
                type: cashflow.type,
                amount,
            });
        });
        trades.forEach((trade) => {
            if (!trade?.closedAt) return;
            const rValue = computeStrategyOutcomeR(trade);
            if (!Number.isFinite(rValue)) return;
            const ts = parseCreatedAt(trade.closedAt);
            if (!ts) return;
            events.push({
                kind: "trade",
                ts: ts.getTime(),
                id: trade.id ?? 0,
                trade,
                rValue,
            });
        });
        return events.sort((a, b) => {
            if (a.ts !== b.ts) return a.ts - b.ts;
            if (a.kind !== b.kind) return a.kind === "cashflow" ? -1 : 1;
            return (a.id ?? 0) - (b.id ?? 0);
        });
    }, [cashflows, trades]);

    const strategyLedger = useMemo(() => {
        if (!accountSettings) return null;
        const startingBalance = Number(accountSettings.startingBalance);
        const riskPercent = Number(accountSettings.riskPercent);
        if (!Number.isFinite(startingBalance) || startingBalance <= 0) return null;
        if (!Number.isFinite(riskPercent) || riskPercent <= 0) return null;
        const riskFraction = riskPercent / 100;
        const byTrade = new Map();
        const orderedTrades = [];
        let balance = startingBalance;
        let lastBalanceAfter = null;
        ledgerEvents.forEach((event) => {
            if (event.kind === "cashflow") {
                const normalized = String(event.type || "").toUpperCase();
                const amount = Math.abs(event.amount);
                if (!Number.isFinite(amount)) return;
                balance = normalized === "WITHDRAWAL" ? balance - amount : balance + amount;
                return;
            }
            const trade = event.trade;
            const rValue = event.rValue;
            const balanceBefore = balance;
            const riskAmount = balanceBefore > 0 ? balanceBefore * riskFraction : 0;
            const pnlMoney = rValue * riskAmount;
            const balanceAfter = balanceBefore + pnlMoney;
            byTrade.set(trade.id, {
                balanceBefore,
                riskAmount,
                pnlMoney,
                balanceAfter,
            });
            balance = balanceAfter;
            lastBalanceAfter = balanceAfter;
            orderedTrades.push(trade);
        });
        return {
            startingBalance,
            endingBalance: balance,
            lastBalanceAfter,
            hasClosedTrades: orderedTrades.length > 0,
            byTrade,
            orderedTrades,
            riskFraction,
        };
    }, [accountSettings, ledgerEvents]);

    const realizedLedger = useMemo(() => {
        if (!accountSettings) return null;
        const startingBalance = Number(accountSettings.startingBalance);
        const riskPercent = Number(accountSettings.riskPercent);
        if (!Number.isFinite(startingBalance) || startingBalance <= 0) return null;
        if (!Number.isFinite(riskPercent) || riskPercent <= 0) return null;
        const riskFraction = riskPercent / 100;
        const byTrade = new Map();
        const orderedTrades = [];
        let balance = startingBalance;
        let lastBalanceAfter = null;
        ledgerEvents.forEach((event) => {
            if (event.kind === "cashflow") {
                const normalized = String(event.type || "").toUpperCase();
                const amount = Math.abs(event.amount);
                if (!Number.isFinite(amount)) return;
                balance = normalized === "WITHDRAWAL" ? balance - amount : balance + amount;
                return;
            }
            const trade = event.trade;
            const rValue = event.rValue;
            const balanceBefore = balance;
            const riskAmount = balanceBefore > 0 ? balanceBefore * riskFraction : 0;
            const hasNetPnl = isNetPnlPresent(trade);
            const pnlMoney = hasNetPnl ? Number(trade.netPnlMoney) : rValue * riskAmount;
            const balanceAfter = balanceBefore + pnlMoney;
            byTrade.set(trade.id, {
                balanceBefore,
                riskAmount,
                pnlMoney,
                balanceAfter,
                isRealizedCovered: hasNetPnl,
            });
            balance = balanceAfter;
            lastBalanceAfter = balanceAfter;
            orderedTrades.push(trade);
        });
        return {
            startingBalance,
            endingBalance: balance,
            lastBalanceAfter,
            hasClosedTrades: orderedTrades.length > 0,
            byTrade,
            orderedTrades,
            riskFraction,
        };
    }, [accountSettings, ledgerEvents]);

    const activeLedger = statsMode === "realized" ? realizedLedger : strategyLedger;

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
            if (datePreset !== "all" && !trade.closedAt) {
                return false;
            }
            if (!matchesDatePreset(trade.closedAt, datePreset, fromDate, toDate)) {
                return false;
            }
            return true;
        });
    }, [trades, filters, datePreset, fromDate, toDate]);

    const summaryStats = useMemo(() => {
        const outcomes = [];
        let excluded = 0;
        const confidences = [];
        let winCount = 0;
        let lossCount = 0;
        let breakevenCount = 0;
        const epsilon = 1e-9;
        filteredTrades.forEach((trade) => {
            const rValue = getOutcomeRForMode(trade, { statsMode, realizedLedgerByTrade: realizedLedger?.byTrade });
            if (Number.isFinite(rValue)) {
                outcomes.push(rValue);
                if (trade?.closedAt) {
                    if (Math.abs(rValue) < epsilon) {
                        breakevenCount += 1;
                    } else if (rValue > 0) {
                        winCount += 1;
                    } else {
                        lossCount += 1;
                    }
                }
            } else {
                excluded += 1;
            }
            if (trade?.closedAt && Number.isFinite(trade.confidence)) {
                confidences.push(trade.confidence);
            }
        });
        const numericCount = outcomes.length;
        const sum = outcomes.reduce((acc, value) => acc + value, 0);
        const average = numericCount ? sum / numericCount : null;
        const winPct = numericCount ? (winCount / numericCount) * 100 : null;
        const confCount = confidences.length;
        const confAverage = confCount
            ? confidences.reduce((acc, value) => acc + value, 0) / confCount
            : null;
        return {
            tradeCount: filteredTrades.length,
            excluded,
            numericCount,
            sum,
            average,
            winPct,
            confCount,
            confAverage,
            winCount,
            lossCount,
            breakevenCount,
        };
    }, [filteredTrades, statsMode, realizedLedger]);

    const realizedCoverage = useMemo(() => {
        let total = 0;
        let covered = 0;
        filteredTrades.forEach((trade) => {
            if (!trade?.closedAt) return;
            const strategyR = computeStrategyOutcomeR(trade);
            if (!Number.isFinite(strategyR)) return;
            total += 1;
            if (isNetPnlPresent(trade)) {
                covered += 1;
            }
        });
        return { total, covered };
    }, [filteredTrades]);

    const moneyMetrics = useMemo(() => {
        if (!activeLedger?.byTrade) return null;
        const periodTrades = filteredTrades
            .filter((trade) => activeLedger.byTrade.has(trade.id))
            .slice()
            .sort((a, b) => {
                const aTime = new Date(a.closedAt).getTime();
                const bTime = new Date(b.closedAt).getTime();
                if (aTime !== bTime) return aTime - bTime;
                return (a.id ?? 0) - (b.id ?? 0);
            });
        if (periodTrades.length === 0) {
            return {
                tradeCount: 0,
                totalPnl: null,
                returnPct: null,
                maxDrawdownPct: null,
                lossStreakR: null,
            };
        }
        const firstEntry = activeLedger.byTrade.get(periodTrades[0].id);
        if (!firstEntry || !Number.isFinite(firstEntry.balanceBefore) || firstEntry.balanceBefore <= 0) {
            return {
                tradeCount: 0,
                totalPnl: null,
                returnPct: null,
                maxDrawdownPct: null,
                lossStreakR: null,
            };
        }
        const startEquity = firstEntry.balanceBefore;
        let equity = startEquity;
        let peakEquity = startEquity;
        let maxDrawdownPct = 0;
        let totalPnl = 0;
        let currentLossRunR = 0;
        let worstLossRunR = 0;
        periodTrades.forEach((trade) => {
            const entry = activeLedger.byTrade.get(trade.id);
            if (!entry || !Number.isFinite(entry.pnlMoney)) return;
            const rValue = getOutcomeRForMode(trade, { statsMode, realizedLedgerByTrade: realizedLedger?.byTrade });
            if (Number.isFinite(rValue)) {
                if (rValue < 0) {
                    currentLossRunR += rValue;
                    worstLossRunR = Math.min(worstLossRunR, currentLossRunR);
                } else {
                    currentLossRunR = 0;
                }
            }
            totalPnl += entry.pnlMoney;
            equity += entry.pnlMoney;
            peakEquity = Math.max(peakEquity, equity);
            const drawdownPct = peakEquity > 0 ? ((equity - peakEquity) / peakEquity) * 100 : 0;
            if (drawdownPct < maxDrawdownPct) {
                maxDrawdownPct = drawdownPct;
            }
        });
        const returnPct = startEquity > 0 ? (totalPnl / startEquity) * 100 : null;
        return {
            tradeCount: periodTrades.length,
            totalPnl,
            returnPct,
            maxDrawdownPct,
            lossStreakR: worstLossRunR,
        };
    }, [filteredTrades, activeLedger, statsMode, realizedLedger]);

    const cashflowNet = useMemo(() => {
        if (!cashflows.length) return 0;
        const isAllTime = datePreset === "all" && !fromDate && !toDate;
        return cashflows.reduce((sum, cashflow) => {
            if (!cashflow) return sum;
            if (!isAllTime && !matchesDatePreset(cashflow.occurredAt, datePreset, fromDate, toDate)) {
                return sum;
            }
            const amount = Number(cashflow.amountMoney);
            if (!Number.isFinite(amount)) return sum;
            const normalizedType = String(cashflow.type || "").toUpperCase();
            return normalizedType === "WITHDRAWAL" ? sum - amount : sum + amount;
        }, 0);
    }, [cashflows, datePreset, fromDate, toDate]);

    const periodBalanceRange = useMemo(() => {
        if (!activeLedger?.byTrade) return null;
        const isAllTime = datePreset === "all" && !fromDate && !toDate;
        if (isAllTime) {
            return {
                start: activeLedger.startingBalance,
                end: activeLedger.endingBalance,
            };
        }
        const periodTrades = filteredTrades
            .filter((trade) => activeLedger.byTrade.has(trade.id))
            .slice()
            .sort((a, b) => {
                const aTime = new Date(a.closedAt).getTime();
                const bTime = new Date(b.closedAt).getTime();
                if (aTime !== bTime) return aTime - bTime;
                return (a.id ?? 0) - (b.id ?? 0);
            });
        if (periodTrades.length === 0) return { start: null, end: null };
        const first = activeLedger.byTrade.get(periodTrades[0].id);
        const last = activeLedger.byTrade.get(periodTrades[periodTrades.length - 1].id);
        if (!first || !last) return { start: null, end: null };
        return {
            start: first.balanceBefore,
            end: last.balanceAfter,
        };
    }, [activeLedger, filteredTrades, datePreset, fromDate, toDate]);

    const selectedTradeMoney = useMemo(() => {
        if (!activeLedger?.byTrade || !selectedTradeForDetails?.id) return null;
        return activeLedger.byTrade.get(selectedTradeForDetails.id) || null;
    }, [activeLedger, selectedTradeForDetails]);
    const selectedStrategyMoney = useMemo(() => {
        if (!strategyLedger?.byTrade || !selectedTradeForDetails?.id) return null;
        return strategyLedger.byTrade.get(selectedTradeForDetails.id) || null;
    }, [strategyLedger, selectedTradeForDetails]);
    const selectedRealizedMoney = useMemo(() => {
        if (!realizedLedger?.byTrade || !selectedTradeForDetails?.id) return null;
        return realizedLedger.byTrade.get(selectedTradeForDetails.id) || null;
    }, [realizedLedger, selectedTradeForDetails]);

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
    const tableColSpan = statsMode === "realized" ? 9 : 8;

    const tradeCsvColumns = [
        { header: "Symbol", accessorFn: (trade) => formatSymbol(trade.symbol) },
        { header: "Direction", accessorKey: "direction" },
        { header: "Entry", accessorKey: "entryPrice" },
        { header: "SL", accessorKey: "stopLossPrice" },
        { header: "TP", accessorKey: "takeProfitPrice" },
        { header: "SL dist", accessorKey: "slPips" },
        { header: "TP dist", accessorKey: "tpPips" },
        { header: "RR", accessorKey: "rrRatio" },
        { header: "Net P/L", accessorFn: (trade) => (trade.netPnlMoney ?? null) },
        { header: "Commission", accessorFn: (trade) => (trade.commissionMoney ?? null) },
        { header: "Swap", accessorFn: (trade) => (trade.swapMoney ?? null) },
        {
            header: "Realized R",
            accessorFn: (trade) => {
                const realizedR = getRealizedRIfPresent(trade, realizedLedger?.byTrade);
                return Number.isFinite(realizedR) ? realizedR.toFixed(4) : null;
            },
        },
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
        setFilters({ symbol: "all", direction: "all", status: "all" });
        setDatePreset("all");
        setFromDate("");
        setToDate("");
    }

    useEffect(() => {
        if (token) {
            loadTrades({ force: true });
            loadAccountSettings();
            loadCashflows();
        }
    }, [token]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, datePreset, fromDate, toDate]);

    useEffect(() => {
        if (totalPages === 0) {
            if (currentPage !== 1) setCurrentPage(1);
            return;
        }
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);
    useEffect(() => {
        if (!isDeleteModalOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                setIsDeleteModalOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isDeleteModalOpen]);

    useEffect(() => {
        if (!isAttachmentDeleteModalOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                setIsAttachmentDeleteModalOpen(false);
                setAttachmentToDelete(null);
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isAttachmentDeleteModalOpen]);

    useEffect(() => {
        if (!isRiskCalcOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                setIsRiskCalcOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isRiskCalcOpen]);

    useEffect(() => {
        if (!isAccountSettingsOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                closeAccountSettingsModal();
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isAccountSettingsOpen]);

    useEffect(() => {
        if (!isCashflowsOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                closeCashflowsModal();
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isCashflowsOpen]);

    useEffect(() => {
        if (!isCashflowEditOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                closeCashflowEditModal();
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isCashflowEditOpen]);

    useEffect(() => {
        if (!isCashflowDeleteOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                setIsCashflowDeleteOpen(false);
                setCashflowDeleteTarget(null);
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isCashflowDeleteOpen]);

    useEffect(() => {
        if (!isAccountMenuOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                setIsAccountMenuOpen(false);
            }
        };
        const handlePointerDown = (event) => {
            const target = event.target;
            if (
                accountMenuRef.current?.contains(target)
                || accountMenuButtonRef.current?.contains(target)
            ) {
                return;
            }
            setIsAccountMenuOpen(false);
        };
        window.addEventListener("keydown", handleKeydown);
        window.addEventListener("mousedown", handlePointerDown);
        return () => {
            window.removeEventListener("keydown", handleKeydown);
            window.removeEventListener("mousedown", handlePointerDown);
        };
    }, [isAccountMenuOpen]);

    useEffect(() => {
        if (!lightboxUrl) return;
        setLightboxScale(1);
        setLightboxOffset({ x: 0, y: 0 });
        setLightboxDragging(false);
        setLightboxDragStart({ x: 0, y: 0 });
    }, [lightboxUrl]);

    const isRiskCalcXau = riskCalcSymbol === "XAUUSD";
    const riskCalcContractSizeNum = Number(riskCalcContractSize);
    const riskCalcContractSizeValid = Number.isFinite(riskCalcContractSizeNum) && riskCalcContractSizeNum > 0;
    const riskCalcResult = useMemo(() => calculateRiskPosition({
        accountBalance: riskCalcBalance,
        riskPercent: riskCalcRiskPercent,
        symbol: riskCalcSymbol,
        entryPrice: riskCalcEntryPrice,
        stopLossPrice: riskCalcStopLossPrice,
        accountCurrency: riskCalcAccountCurrency,
        conversionRate: riskCalcConversionRate,
        contractSizeOverride: isRiskCalcXau && riskCalcContractSizeValid ? riskCalcContractSizeNum : null,
    }), [
        riskCalcAccountCurrency,
        riskCalcBalance,
        riskCalcConversionRate,
        riskCalcEntryPrice,
        riskCalcRiskPercent,
        riskCalcStopLossPrice,
        riskCalcSymbol,
        riskCalcContractSize,
        isRiskCalcXau,
        riskCalcContractSizeValid,
        riskCalcContractSizeNum,
    ]);

    useEffect(() => {
        const stored = localStorage.getItem("xau_contract_size");
        if (stored) {
            setRiskCalcContractSize(stored);
        }
    }, []);

    useEffect(() => {
        if (isRiskCalcXau) {
            localStorage.setItem("xau_contract_size", riskCalcContractSize);
        }
    }, [isRiskCalcXau, riskCalcContractSize]);

    const emDash = "\u2014";
    const [copiedKey, setCopiedKey] = useState("");
    const copyTimeoutRef = useRef(null);
    const copyToClipboard = (value) => {
        if (!navigator?.clipboard?.writeText) return;
        navigator.clipboard.writeText(String(value));
    };
    const handleCopy = (key, value) => {
        copyToClipboard(value);
        setCopiedKey(key);
        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => {
            setCopiedKey("");
        }, 1200);
    };
    useEffect(() => () => {
        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }
    }, []);
    const conversionPairLabel = riskCalcResult.needsConversion && riskCalcResult.quoteCurrency && riskCalcAccountCurrency
        ? `${riskCalcAccountCurrency}${riskCalcResult.quoteCurrency}`
        : "";
    const conversionHelper = riskCalcResult.needsConversion && riskCalcResult.quoteCurrency && riskCalcAccountCurrency
        ? `Needed to convert ${riskCalcResult.quoteCurrency} \u2192 ${riskCalcAccountCurrency} for accurate pip value. `
            + `Enter ${conversionPairLabel} (${riskCalcResult.quoteCurrency} per 1 ${riskCalcAccountCurrency}).`
        : "";
    return (
        <div className="app">
            <div className="stack">
                <HeaderBar
                    title="Trading Journal"
                    subtitle="Track entries, stops, targets, and session context in one place."
                    isAuthenticated={Boolean(token)}
                    userEmail={email}
                    balanceLabel={statsMode === "realized" ? "Balance (Broker)" : "Balance (Plan)"}
                    balanceValue={activeLedger
                        ? formatMoneyValue(activeLedger.endingBalance, accountSettings?.currency)
                        : "\u2014"}
                    onRefresh={loadTrades}
                    refreshDisabled={isLoading || refreshBlocked}
                    refreshTitle={refreshBlocked ? `Please wait ${refreshCooldownSeconds}s` : "Refresh trades"}
                    accountMenuRef={accountMenuRef}
                    accountMenuButtonRef={accountMenuButtonRef}
                    isAccountMenuOpen={isAccountMenuOpen}
                    onToggleAccountMenu={() => setIsAccountMenuOpen((open) => !open)}
                    onOpenAccountSettings={() => {
                        setIsAccountMenuOpen(false);
                        openAccountSettingsModal();
                    }}
                    onOpenCashflows={() => {
                        setIsAccountMenuOpen(false);
                        openCashflowsModal();
                    }}
                    onLogout={() => {
                        setIsAccountMenuOpen(false);
                        logout();
                    }}
                />

                {!token ? (
                    <AuthCard
                        authMode={authMode}
                        setAuthMode={setAuthMode}
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        confirmPassword={confirmPassword}
                        setConfirmPassword={setConfirmPassword}
                        error={error}
                        setError={setError}
                        onLogin={login}
                        onRegister={register}
                        googleClientId={googleClientId}
                        onGoogleSuccess={handleGoogleSuccess}
                        onGoogleError={() => setError("Google sign-in failed.")}
                    />
                ) : (
                    <>
                        {error && (
                            <div className="banner error">
                                {error}
                            </div>
                        )}

                        <AddTradeForm
                            instruments={INSTRUMENTS}
                            symbol={symbol}
                            setSymbol={setSymbol}
                            direction={direction}
                            setDirection={setDirection}
                            entryPrice={entryPrice}
                            setEntryPrice={setEntryPrice}
                            stopLossPrice={stopLossPrice}
                            setStopLossPrice={setStopLossPrice}
                            takeProfitPrice={takeProfitPrice}
                            setTakeProfitPrice={setTakeProfitPrice}
                            onSubmit={createTrade}
                            onOpenRiskCalc={openRiskCalc}
                            computeDerived={computeDerived}
                        />

                        <div className="card">
                                <div className="card-header">
                                    <div className="trades-header">
                                        <h2>Trades</h2>
                                        <p className="subtitle">
                                            {trades.length} total | {filteredTrades.length} shown
                                        </p>
                                        <div className="trades-header-row">
                                            <div className="balance-pill">
                                                {statsMode === "realized" ? "Balance (Broker): " : "Balance (Plan): "}
                                                {periodBalanceRange?.start != null && periodBalanceRange?.end != null
                                                    ? `${formatMoneyValue(periodBalanceRange.start, accountSettings?.currency)} \u2192 ${formatMoneyValue(periodBalanceRange.end, accountSettings?.currency)}`
                                                    : "\u2014"}
                                            </div>
                                            {cashflows.length > 0 && Math.abs(cashflowNet) > 1e-9 && (
                                                <div
                                                    className={`cashflow-pill${cashflowNet >= 0 ? " is-positive" : " is-negative"}`}
                                                    title="Balance includes deposits/withdrawals. P/L shows trading results only."
                                                >
                                                    Cashflow: {formatMoneyValue(cashflowNet, accountSettings?.currency)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="trades-header-row trades-header-row--mode">
                                            <div className="summary-toggle" role="group" aria-label="Stats mode">
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm summary-toggle-btn${statsMode === "strategy" ? " is-active" : ""}`}
                                                    onClick={() => setStatsMode("strategy")}
                                                    title="Modeled performance based on R and your risk%. Assumes ideal fills and ignores broker costs."
                                                >
                                                    Strategy Plan
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm summary-toggle-btn${statsMode === "realized" ? " is-active" : ""}`}
                                                    onClick={() => setStatsMode("realized")}
                                                    title="Uses your entered Net P/L as truth where available. Coverage shows how many trades include broker data."
                                                >
                                                    Broker
                                                </button>
                                            </div>
                                            <div
                                                className={`summary-coverage${statsMode === "realized" ? " is-visible" : ""}`}
                                                title="Trades with broker Net P/L entered. Others use strategy estimate."
                                            >
                                                Coverage: {realizedCoverage.covered}/{realizedCoverage.total}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="table-header-actions">
                                        <div className="table-header-top">
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
                                        <FiltersPanel
                                            variant="headerButtons"
                                            showFilters={showFilters}
                                            onToggleFilters={() => setShowFilters((v) => !v)}
                                            onClearFilters={clearFilters}
                                        />
                                    </div>
                                </div>
                                <FiltersPanel
                                    variant="filterBar"
                                    showFilters={showFilters}
                                    datePreset={datePreset}
                                    fromDate={fromDate}
                                    toDate={toDate}
                                    onChangeFromDate={(e) => setFromDate(e.target.value)}
                                    onChangeToDate={(e) => setToDate(e.target.value)}
                                />
                                <div className="summary-bar">
                                    <div className="summary-stat">
                                        <span className="summary-label">Result (R)</span>
                                        <span
                                            className={`summary-value${
                                                summaryStats.numericCount
                                                    ? summaryStats.sum > 0
                                                        ? " is-positive"
                                                        : summaryStats.sum < 0
                                                            ? " is-negative"
                                                            : ""
                                                    : " is-muted"
                                            }`}
                                        >
                                            {summaryStats.numericCount ? formatRValue(summaryStats.sum) : emDash}
                                        </span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="summary-label">P/L</span>
                                        <span
                                            className={`summary-value${
                                                moneyMetrics?.tradeCount
                                                    ? moneyMetrics.totalPnl > 0
                                                        ? " is-positive"
                                                        : moneyMetrics.totalPnl < 0
                                                            ? " is-negative"
                                                            : ""
                                                    : " is-muted"
                                            }`}
                                        >
                                            {moneyMetrics?.tradeCount
                                                ? formatMoneyValue(moneyMetrics.totalPnl, accountSettings?.currency)
                                                : emDash}
                                        </span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="summary-label">Return %</span>
                                        <span className={`summary-value${moneyMetrics?.tradeCount ? "" : " is-muted"}`}>
                                            {moneyMetrics?.tradeCount
                                                ? formatPercentValue(moneyMetrics.returnPct)
                                                : emDash}
                                        </span>
                                    </div>
                                    <div className="summary-stat" title="Largest peak-to-trough decline in realized equity (closed trades).">
                                        <span className="summary-label">Max DD %</span>
                                        <span className={`summary-value${moneyMetrics?.tradeCount ? " is-negative" : " is-muted"}`}>
                                            {moneyMetrics?.tradeCount
                                                ? formatPercentValue(moneyMetrics.maxDrawdownPct)
                                                : emDash}
                                        </span>
                                    </div>
                                    <div className="summary-stat" title="Worst cumulative run of consecutive losing trades (in R).">
                                        <span className="summary-label">L-STREAK (R)</span>
                                        <span className={`summary-value${moneyMetrics?.tradeCount ? " is-negative" : " is-muted"}`}>
                                            {moneyMetrics?.tradeCount
                                                ? formatRValue(moneyMetrics.lossStreakR)
                                                : emDash}
                                        </span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="summary-label">Win %</span>
                                        <span className={`summary-value${summaryStats.numericCount ? "" : " is-muted"}`}>
                                            {summaryStats.numericCount ? formatWinPct(summaryStats.winPct) : emDash}
                                        </span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="summary-label">Avg R</span>
                                        <span
                                            className={`summary-value${
                                                summaryStats.numericCount
                                                    ? summaryStats.average > 0
                                                        ? " is-positive"
                                                        : summaryStats.average < 0
                                                            ? " is-negative"
                                                            : ""
                                                    : " is-muted"
                                            }`}
                                        >
                                            {summaryStats.numericCount ? formatRValue(summaryStats.average) : emDash}
                                        </span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="summary-label">Avg Conf</span>
                                        <span className={`summary-value${summaryStats.confCount ? "" : " is-muted"}`}>
                                            {summaryStats.confCount
                                                ? `${summaryStats.confAverage.toFixed(1)}/10`
                                                : emDash}
                                        </span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="summary-label">W/L/B</span>
                                        {summaryStats.winCount + summaryStats.lossCount + summaryStats.breakevenCount ? (
                                            <span className="summary-value">
                                                <span className="summary-value is-positive">{summaryStats.winCount}</span>
                                                <span className="summary-sep">/</span>
                                                <span className="summary-value is-negative">{summaryStats.lossCount}</span>
                                                <span className="summary-sep">/</span>
                                                <span className="summary-value is-muted">{summaryStats.breakevenCount}</span>
                                            </span>
                                        ) : (
                                            <span className="summary-value is-muted">{emDash}</span>
                                        )}
                                    </div>
                                    {summaryStats.excluded > 0 && (
                                        <div className="summary-note">
                                            ({summaryStats.excluded} excluded)
                                        </div>
                                    )}
                                </div>
                            <TradesTable
                                trades={pagedTrades}
                                totalCount={sortedTrades.length}
                                tableColSpan={tableColSpan}
                                statsMode={statsMode}
                                selectedTradeId={selectedTradeForDetails?.id ?? null}
                                isDetailsOpen={isDetailsOpen}
                                onOpenDetails={openTradeDetails}
                                formatSymbol={formatSymbol}
                                formatPriceValue={formatPriceValue}
                                formatOutcome={formatOutcome}
                                getOutcomeClass={getOutcomeClass}
                                isNetPnlPresent={isNetPnlPresent}
                                formatMoneyNullable={formatMoneyNullable}
                                moneyCurrency={accountSettings?.currency}
                                formatDate={formatDate}
                                filtersHeader={(
                                    <FiltersPanel
                                        variant="tableRows"
                                        showFilters={showFilters}
                                        datePreset={datePreset}
                                        symbolFilter={filters.symbol}
                                        directionFilter={filters.direction}
                                        statusFilter={filters.status}
                                        onChangeSymbol={(e) => setFilters((prev) => ({ ...prev, symbol: e.target.value }))}
                                        onChangeDirection={(e) => setFilters((prev) => ({ ...prev, direction: e.target.value }))}
                                        onChangeStatus={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                                        onChangeDatePreset={(e) => setDatePreset(e.target.value)}
                                        symbolOptions={symbolOptions}
                                        formatSymbol={formatSymbol}
                                        showBrokerColumns={statsMode === "realized"}
                                    />
                                )}
                            />
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                paginationItems={paginationItems}
                                onPrev={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                onNext={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                onGoToPage={(page) => setCurrentPage(page)}
                            />
                            <TradeDetailsPanelLeft
                                trade={selectedTradeForDetails}
                                open={isDetailsOpen}
                                onClose={closeTradeDetails}
                                formatDate={formatDate}
                                formatDuration={formatDuration}
                                formatSymbol={formatSymbol}
                                getSessionLabel={getSessionLabel}
                                formatOutcome={formatOutcome}
                                formatRValue={formatRValue}
                                onCloseTrade={closeTradeInline}
                                onOpenReview={(trade) => openReviewModal(trade)}
                                toDateTimeLocalValue={toDateTimeLocalValue}
                                isEditing={isDetailsEditing}
                                onStartEdit={beginDetailsEdit}
                                onCancelEdit={cancelDetailsEdit}
                                onSaveEdit={saveDetailsEdit}
                                onDeleteTrade={deleteTradeFromDetails}
                                editSymbol={editSymbol}
                                setEditSymbol={setEditSymbol}
                                editDirection={editDirection}
                                setEditDirection={setEditDirection}
                                editEntryPrice={editEntryPrice}
                                setEditEntryPrice={setEditEntryPrice}
                                editExitPrice={editExitPrice}
                                setEditExitPrice={setEditExitPrice}
                                editStopLossPrice={editStopLossPrice}
                                setEditStopLossPrice={setEditStopLossPrice}
                                editTakeProfitPrice={editTakeProfitPrice}
                                setEditTakeProfitPrice={setEditTakeProfitPrice}
                                editCreatedAt={editCreatedAt}
                                setEditCreatedAt={setEditCreatedAt}
                                editClosedAt={editClosedAt}
                                setEditClosedAt={setEditClosedAt}
                                editCloseReasonOverride={editCloseReasonOverride}
                                setEditCloseReasonOverride={setEditCloseReasonOverride}
                                editManualReason={editManualReason}
                                setEditManualReason={setEditManualReason}
                                editManualDescription={editManualDescription}
                                setEditManualDescription={setEditManualDescription}
                                editNetPnlMoney={editNetPnlMoney}
                                setEditNetPnlMoney={setEditNetPnlMoney}
                                editCommissionMoney={editCommissionMoney}
                                setEditCommissionMoney={setEditCommissionMoney}
                                editSwapMoney={editSwapMoney}
                                setEditSwapMoney={setEditSwapMoney}
                                errorMessage={error}
                                moneySummary={selectedTradeMoney}
                                strategyMoney={selectedStrategyMoney}
                                realizedMoney={selectedRealizedMoney}
                                statsMode={statsMode}
                                moneyCurrency={accountSettings?.currency}
                                panelRef={leftPanelRef}
                                otherPanelRef={rightPanelRef}
                                isAttachModalOpen={isAttachModalOpen}
                                isReviewModalOpen={isReviewModalOpen}
                            />
                            <TradeDetailsPanelRight
                                trade={selectedTradeForDetails}
                                open={isDetailsOpen}
                                onClose={closeTradeDetails}
                                formatSymbol={formatSymbol}
                                onAttach={openAttachModal}
                                attachmentsBySection={attachmentsBySection}
                                onPreview={(url) => setLightboxUrl(url)}
                                onUpdateTimeframe={updateAttachmentTimeframe}
                                onRemoveAttachment={(attachment) => {
                                    setAttachmentToDelete(attachment);
                                    setIsAttachmentDeleteModalOpen(true);
                                }}
                                timeframeOptions={TIMEFRAME_OPTIONS}
                                panelRef={rightPanelRef}
                                otherPanelRef={leftPanelRef}
                                isAttachModalOpen={isAttachModalOpen}
                                isReviewModalOpen={isReviewModalOpen}
                            />
                            {isRiskCalcOpen && (
                                <>
                                    <div className="modal-backdrop" onClick={closeRiskCalc} />
                                    <div
                                        className="modal risk-calc-modal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="risk-calc-title"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="modal-header">
                                            <div>
                                                <h3 className="modal-title" id="risk-calc-title">Position Size Calculator</h3>
                                                <p className="modal-text">Estimate units and lots from your risk settings.</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm modal-close"
                                                aria-label="Close risk calculator"
                                                onClick={closeRiskCalc}
                                            >
                                                {"\u00d7"}
                                            </button>
                                        </div>
                                        <div className="risk-calc-grid">
                                            <label className="field">
                                                <span>Account currency</span>
                                                <select
                                                    className="input"
                                                    value={riskCalcAccountCurrency}
                                                    onChange={(e) => setRiskCalcAccountCurrency(e.target.value)}
                                                >
                                                    {ACCOUNT_CURRENCIES.map((currency) => (
                                                        <option key={currency} value={currency}>
                                                            {currency}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="field">
                                                <span>Account balance</span>
                                                <input
                                                    className="input"
                                                    value={riskCalcBalance}
                                                    onChange={(e) => setRiskCalcBalance(e.target.value)}
                                                    placeholder="0.00"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </label>
                                            <label className="field">
                                                <span>Risk %</span>
                                                <input
                                                    className="input"
                                                    value={riskCalcRiskPercent}
                                                    onChange={(e) => setRiskCalcRiskPercent(e.target.value)}
                                                    placeholder="1.0"
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                />
                                            </label>
                                            <label className="field">
                                                <span>Symbol</span>
                                                <select
                                                    className="input select-scroll"
                                                    value={riskCalcSymbol}
                                                    onChange={(e) => setRiskCalcSymbol(e.target.value)}
                                                >
                                                    {INSTRUMENTS.map((pair) => (
                                                        <option key={pair.value} value={pair.value}>
                                                            {pair.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="field">
                                                <span>Entry price</span>
                                                <input
                                                    className="input"
                                                    value={riskCalcEntryPrice}
                                                    onChange={(e) => setRiskCalcEntryPrice(e.target.value)}
                                                    placeholder="Entry"
                                                    type="number"
                                                    min="0"
                                                    step={getPriceStep(riskCalcSymbol)}
                                                />
                                            </label>
                                            <label className="field">
                                                <span>Stop loss price</span>
                                                <input
                                                    className="input"
                                                    value={riskCalcStopLossPrice}
                                                    onChange={(e) => setRiskCalcStopLossPrice(e.target.value)}
                                                    placeholder="Stop loss"
                                                    type="number"
                                                    min="0"
                                                    step={getPriceStep(riskCalcSymbol)}
                                                />
                                            </label>
                                            {isRiskCalcXau && (
                                                <label className="field risk-calc-full">
                                                    <span>Contract size (Units per lot)</span>
                                                    <input
                                                        className="input"
                                                        value={riskCalcContractSize}
                                                        onChange={(e) => setRiskCalcContractSize(e.target.value)}
                                                        placeholder="100"
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    <span className="risk-calc-helper">Usually 100 - check with your broker</span>
                                                    {!riskCalcContractSizeValid && (
                                                        <span className="risk-calc-error">Enter a valid contract size.</span>
                                                    )}
                                                </label>
                                            )}
                                            {riskCalcResult.needsConversion && (
                                                <label className="field risk-calc-full">
                                                    <span>Conversion rate</span>
                                                    <input
                                                        className="input"
                                                        value={riskCalcConversionRate}
                                                        onChange={(e) => setRiskCalcConversionRate(e.target.value)}
                                                        placeholder={conversionPairLabel || "Conversion rate"}
                                                        type="number"
                                                        min="0"
                                                        step="0.00001"
                                                    />
                                                    {conversionHelper && (
                                                        <span className="risk-calc-helper">{conversionHelper}</span>
                                                    )}
                                                    {riskCalcResult.baseValid && !riskCalcResult.conversionRateValid && (
                                                        <span className="risk-calc-error">
                                                            Enter a valid {conversionPairLabel || "conversion rate"}.
                                                        </span>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                        <div className="risk-calc-outputs">
                                            <div className="risk-calc-output-row">
                                                <span>Amount at risk</span>
                                                <span className={`risk-calc-output-value${riskCalcResult.baseValid ? "" : " is-muted"}`}>
                                                    {riskCalcResult.baseValid
                                                        ? `${riskCalcAccountCurrency} ${formatCalcNumber(riskCalcResult.riskAmount, 2)}`
                                                        : emDash}
                                                </span>
                                            </div>
                                            <div className="risk-calc-output-row">
                                                <span>Stop loss distance</span>
                                                <span className={`risk-calc-output-value${riskCalcResult.baseValid ? "" : " is-muted"}`}>
                                                    {riskCalcResult.baseValid
                                                        ? `${formatCalcNumber(riskCalcResult.slPips, 1)} ${getDisplayUnit(riskCalcSymbol)}`
                                                        : emDash}
                                                </span>
                                            </div>
                                            <div className="risk-calc-output-row">
                                                <span>Position size (units)</span>
                                                <span className="risk-calc-output-value-wrap">
                                                    {copiedKey === "units" && <span className="copy-confirm">Copied</span>}
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm copy-btn"
                                                        aria-label="Copy position size"
                                                        onClick={() => handleCopy("units", formatCalcInteger(riskCalcResult.units))}
                                                        disabled={riskCalcResult.units == null}
                                                    >
                                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                                            <rect x="9" y="9" width="10" height="10" rx="2" />
                                                            <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                                                        </svg>
                                                    </button>
                                                    <span className={`risk-calc-output-value${riskCalcResult.units != null ? "" : " is-muted"}`}>
                                                        {riskCalcResult.units != null ? formatCalcInteger(riskCalcResult.units) : emDash}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="risk-calc-output-row">
                                                <span>Standard lots</span>
                                                <span className="risk-calc-output-value-wrap">
                                                    {copiedKey === "lots" && <span className="copy-confirm">Copied</span>}
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm copy-btn"
                                                        aria-label="Copy standard lots"
                                                        onClick={() => handleCopy("lots", formatCalcNumber(riskCalcResult.lots, 2))}
                                                        disabled={riskCalcResult.lots == null}
                                                    >
                                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                                            <rect x="9" y="9" width="10" height="10" rx="2" />
                                                            <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                                                        </svg>
                                                    </button>
                                                    <span className={`risk-calc-output-value${riskCalcResult.lots != null ? "" : " is-muted"}`}>
                                                        {riskCalcResult.lots != null ? formatCalcNumber(riskCalcResult.lots, 2) : emDash}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="risk-calc-output-row">
                                                <span>2R target</span>
                                                <span className="risk-calc-output-value-wrap">
                                                    {copiedKey === "target2R" && <span className="copy-confirm">Copied</span>}
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm copy-btn"
                                                        aria-label="Copy 2R target"
                                                        onClick={() => handleCopy("target2R", formatCalcPrice(riskCalcResult.target2R, riskCalcSymbol))}
                                                        disabled={!riskCalcResult.baseValid}
                                                    >
                                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                                            <rect x="9" y="9" width="10" height="10" rx="2" />
                                                            <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                                                        </svg>
                                                    </button>
                                                    <span className={`risk-calc-output-value${riskCalcResult.baseValid ? "" : " is-muted"}`}>
                                                        {riskCalcResult.baseValid
                                                            ? formatCalcPrice(riskCalcResult.target2R, riskCalcSymbol)
                                                            : emDash}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="risk-calc-output-row">
                                                <span>3R target</span>
                                                <span className="risk-calc-output-value-wrap">
                                                    {copiedKey === "target3R" && <span className="copy-confirm">Copied</span>}
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm copy-btn"
                                                        aria-label="Copy 3R target"
                                                        onClick={() => handleCopy("target3R", formatCalcPrice(riskCalcResult.target3R, riskCalcSymbol))}
                                                        disabled={!riskCalcResult.baseValid}
                                                    >
                                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                                            <rect x="9" y="9" width="10" height="10" rx="2" />
                                                            <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                                                        </svg>
                                                    </button>
                                                    <span className={`risk-calc-output-value${riskCalcResult.baseValid ? "" : " is-muted"}`}>
                                                        {riskCalcResult.baseValid
                                                            ? formatCalcPrice(riskCalcResult.target3R, riskCalcSymbol)
                                                            : emDash}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            {isCashflowsOpen && (
                                <>
                                    <div className="modal-backdrop" onClick={closeCashflowsModal} />
                                    <div
                                        className="modal cashflow-modal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="cashflows-title"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="modal-header">
                                            <div>
                                                <h3 className="modal-title" id="cashflows-title">Cashflows</h3>
                                                <p className="modal-text">Track deposits and withdrawals on your account.</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm modal-close"
                                                aria-label="Close cashflows"
                                                onClick={closeCashflowsModal}
                                            >
                                                {"\u00d7"}
                                            </button>
                                        </div>
                                        {cashflowError && (
                                            <div className="banner error">
                                                {cashflowError}
                                            </div>
                                        )}
                                        <div className="cashflow-form">
                                            <div className="cashflow-grid">
                                                <label className="field">
                                                    <span>Type</span>
                                                    <select
                                                        className="input"
                                                        value={cashflowType}
                                                        onChange={(e) => setCashflowType(e.target.value)}
                                                    >
                                                        {CASHFLOW_TYPES.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label className="field">
                                                    <span>Amount</span>
                                                    <input
                                                        className="input"
                                                        value={cashflowAmount}
                                                        onChange={(e) => setCashflowAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </label>
                                                <label className="field">
                                                    <span>Date/time</span>
                                                    <input
                                                        className="input"
                                                        value={cashflowOccurredAt}
                                                        onChange={(e) => setCashflowOccurredAt(e.target.value)}
                                                        type="datetime-local"
                                                    />
                                                </label>
                                                <label className="field cashflow-span-2">
                                                    <span>Note (optional)</span>
                                                    <input
                                                        className="input"
                                                        value={cashflowNote}
                                                        onChange={(e) => setCashflowNote(e.target.value)}
                                                        placeholder="e.g. Top-up, payout"
                                                        maxLength={500}
                                                    />
                                                </label>
                                            </div>
                                            <div className="modal-actions">
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    onClick={closeCashflowsModal}
                                                    disabled={isCashflowSaving}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary"
                                                    onClick={createCashflow}
                                                    disabled={isCashflowSaving}
                                                >
                                                    {isCashflowSaving ? "Saving..." : "Add"}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="cashflow-section">
                                            <div className="cashflow-list">
                                                <div className="cashflow-row cashflow-row--header">
                                                    <span>Date</span>
                                                    <span>Type</span>
                                                    <span>Amount</span>
                                                    <span>Note</span>
                                                    <span>Actions</span>
                                                </div>
                                                {cashflows.length ? (
                                                    cashflows.map((cashflow) => {
                                                        const typeLabel = formatCashflowTypeLabel(cashflow.type);
                                                        const isWithdrawal = String(cashflow.type || "").toUpperCase() === "WITHDRAWAL";
                                                        const amountClass = isWithdrawal ? " is-negative" : " is-positive";
                                                        return (
                                                            <div className="cashflow-row" key={cashflow.id}>
                                                                <span>{formatDate(cashflow.occurredAt)}</span>
                                                                <span>{typeLabel}</span>
                                                                <span className={`cashflow-amount${amountClass}`}>
                                                                    {formatCashflowAmount(cashflow)}
                                                                </span>
                                                                <span className={`cashflow-note${cashflow.note ? "" : " is-muted"}`}>
                                                                    {cashflow.note || "\u2014"}
                                                                </span>
                                                                <span className="cashflow-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-ghost btn-sm"
                                                                        onClick={() => openCashflowEditModal(cashflow)}
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-ghost btn-sm"
                                                                        onClick={() => requestDeleteCashflow(cashflow)}
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="cashflow-empty">No cashflows yet.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            {isCashflowEditOpen && (
                                <>
                                    <div className="modal-backdrop" onClick={closeCashflowEditModal} />
                                    <div
                                        className="modal cashflow-modal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="cashflow-edit-title"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="modal-header">
                                            <div>
                                                <h3 className="modal-title" id="cashflow-edit-title">Edit cashflow</h3>
                                                <p className="modal-text">Update the details for this cashflow.</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm modal-close"
                                                aria-label="Close edit cashflow"
                                                onClick={closeCashflowEditModal}
                                            >
                                                {"\u00d7"}
                                            </button>
                                        </div>
                                        {cashflowEditError && (
                                            <div className="banner error">
                                                {cashflowEditError}
                                            </div>
                                        )}
                                        <div className="cashflow-form">
                                            <div className="cashflow-grid">
                                                <label className="field">
                                                    <span>Type</span>
                                                    <select
                                                        className="input"
                                                        value={cashflowEditType}
                                                        onChange={(e) => setCashflowEditType(e.target.value)}
                                                    >
                                                        {CASHFLOW_TYPES.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label className="field">
                                                    <span>Amount</span>
                                                    <input
                                                        className="input"
                                                        value={cashflowEditAmount}
                                                        onChange={(e) => setCashflowEditAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </label>
                                                <label className="field">
                                                    <span>Date/time</span>
                                                    <input
                                                        className="input"
                                                        value={cashflowEditOccurredAt}
                                                        onChange={(e) => setCashflowEditOccurredAt(e.target.value)}
                                                        type="datetime-local"
                                                    />
                                                </label>
                                                <label className="field cashflow-span-2">
                                                    <span>Note (optional)</span>
                                                    <input
                                                        className="input"
                                                        value={cashflowEditNote}
                                                        onChange={(e) => setCashflowEditNote(e.target.value)}
                                                        placeholder="e.g. Top-up, payout"
                                                        maxLength={500}
                                                    />
                                                </label>
                                            </div>
                                            <div className="modal-actions">
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    onClick={closeCashflowEditModal}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary"
                                                    onClick={saveCashflowEdit}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            {isCashflowDeleteOpen && (
                                <>
                                    <div
                                        className="modal-backdrop"
                                        onClick={() => {
                                            setIsCashflowDeleteOpen(false);
                                            setCashflowDeleteTarget(null);
                                        }}
                                    />
                                    <div
                                        className="modal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="cashflow-delete-title"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <h3 className="modal-title" id="cashflow-delete-title">Delete cashflow?</h3>
                                        <p className="modal-text">This action cannot be undone.</p>
                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => {
                                                    setIsCashflowDeleteOpen(false);
                                                    setCashflowDeleteTarget(null);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-danger"
                                                onClick={confirmDeleteCashflow}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            {isAccountSettingsOpen && (
                                <>
                                    <div className="modal-backdrop" onClick={closeAccountSettingsModal} />
                                    <div
                                        className="modal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="account-settings-title"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="modal-header">
                                            <div>
                                                <h3 className="modal-title" id="account-settings-title">Account Settings</h3>
                                                <p className="modal-text">Set your starting balance and default risk per trade.</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm modal-close"
                                                aria-label="Close account settings"
                                                onClick={closeAccountSettingsModal}
                                            >
                                                {"\u00d7"}
                                            </button>
                                        </div>
                                        {accountSettingsError && (
                                            <div className="banner error">
                                                {accountSettingsError}
                                            </div>
                                        )}
                                        <div className="risk-calc-grid">
                                            <label className="field">
                                                <span>Starting balance</span>
                                                <input
                                                    className="input"
                                                    value={accountSettingsBalance}
                                                    onChange={(e) => setAccountSettingsBalance(e.target.value)}
                                                    placeholder="0.00"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </label>
                                            <label className="field">
                                                <span>Risk % per trade</span>
                                                <input
                                                    className="input"
                                                    value={accountSettingsRiskPercent}
                                                    onChange={(e) => setAccountSettingsRiskPercent(e.target.value)}
                                                    placeholder="1.0"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </label>
                                            <label className="field">
                                                <span>Currency (optional)</span>
                                                <select
                                                    className="input"
                                                    value={accountSettingsCurrency}
                                                    onChange={(e) => setAccountSettingsCurrency(e.target.value)}
                                                >
                                                    <option value="">—</option>
                                                    {ACCOUNT_CURRENCIES.map((currency) => (
                                                        <option key={currency} value={currency}>
                                                            {currency}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        </div>
                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={closeAccountSettingsModal}
                                                disabled={isAccountSettingsSaving}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={saveAccountSettings}
                                                disabled={isAccountSettingsSaving}
                                            >
                                                {isAccountSettingsSaving ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            {isAttachModalOpen && (
                                <>
                                    <div className="modal-backdrop" onClick={closeAttachModal} />
                                    <div
                                        className="modal attach-modal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="attach-modal-title"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <h3 className="modal-title" id="attach-modal-title">
                                            Attach screenshot{attachSection ? ` (${attachSection.toLowerCase()})` : ""}
                                        </h3>
                                        <div
                                            className={`attach-dropzone${isAttachmentDragOver ? " is-dragover" : ""}`}
                                            onDrop={handleAttachmentDrop}
                                            onDragOver={handleAttachmentDragOver}
                                            onDragLeave={handleAttachmentDragLeave}
                                        >
                                            {attachPreviewUrl ? (
                                                <img src={attachPreviewUrl} alt="Attachment preview" />
                                            ) : (
                                                <div className="attach-dropzone-content">
                                                    <p>Drop an image here</p>
                                                    <p>Paste from clipboard (Ctrl+V)</p>
                                                    <p>or choose from PC</p>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => attachmentInputRef.current?.click()}
                                                    >
                                                        Attach from PC
                                                    </button>
                                                </div>
                                            )}
                                            <input
                                                ref={attachmentInputRef}
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                className="attach-file-input"
                                                onChange={(e) => handleAttachmentFile(e.target.files?.[0])}
                                            />
                                        </div>
                                        {attachError && <p className="attach-error">{attachError}</p>}
                                        {attachPreviewUrl && (
                                            <div className="modal-actions attach-actions">
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    onClick={resetAttachmentPreview}
                                                    disabled={isUploadingAttachment}
                                                >
                                                    Replace
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    onClick={closeAttachModal}
                                                    disabled={isUploadingAttachment}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        confirmAttachmentUpload();
                                                    }}
                                                    disabled={isUploadingAttachment}
                                                >
                                                    {isUploadingAttachment ? "Uploading\u2026" : "Confirm"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                            {lightboxUrl && (
                                <>
                                    <div className="modal-backdrop" onClick={() => setLightboxUrl("")} />
                                    <div
                                        className="lightbox"
                                        role="dialog"
                                        aria-modal="true"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseMove={(e) => {
                                            if (!lightboxDragging || lightboxScale <= 1) return;
                                            const nextX = e.clientX - lightboxDragStart.x;
                                            const nextY = e.clientY - lightboxDragStart.y;
                                            setLightboxOffset({ x: nextX, y: nextY });
                                        }}
                                        onMouseUp={() => setLightboxDragging(false)}
                                        onMouseLeave={() => setLightboxDragging(false)}
                                    >
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm lightbox-close"
                                            aria-label="Close preview"
                                            onClick={() => setLightboxUrl("")}
                                        >
                                            {"\u00d7"}
                                        </button>
                                        <img
                                            src={lightboxUrl}
                                            alt="Screenshot preview"
                                            className={`lightbox-image${lightboxScale > 1 ? " is-zoomed" : ""}${
                                                lightboxDragging ? " is-dragging" : ""
                                            }`}
                                            style={{
                                                transform: `translate(${lightboxOffset.x}px, ${lightboxOffset.y}px) scale(${lightboxScale})`,
                                                transformOrigin: "center center",
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (lightboxScale > 1) {
                                                    setLightboxScale(1);
                                                    setLightboxOffset({ x: 0, y: 0 });
                                                    setLightboxDragging(false);
                                                    return;
                                                }
                                                setLightboxScale(2);
                                            }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                if (lightboxScale <= 1) return;
                                                setLightboxDragging(true);
                                                setLightboxDragStart({
                                                    x: e.clientX - lightboxOffset.x,
                                                    y: e.clientY - lightboxOffset.y,
                                                });
                                            }}
                                        />
                                        <p className="lightbox-hint">Click to zoom • Drag to move</p>
                                    </div>
                                </>
                            )}
                            <DeleteTradeModal
                                isOpen={isDeleteModalOpen}
                                onCancel={() => setIsDeleteModalOpen(false)}
                                onConfirm={confirmDeleteTrade}
                            />
                            {isAttachmentDeleteModalOpen && (
                                <>
                                    <div
                                        className="modal-backdrop"
                                        onClick={() => {
                                            setIsAttachmentDeleteModalOpen(false);
                                            setAttachmentToDelete(null);
                                        }}
                                    />
                                    <div
                                        className="modal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="delete-attachment-title"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <h3 className="modal-title" id="delete-attachment-title">Delete attachment?</h3>
                                        <p className="modal-text">This action cannot be undone.</p>
                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => {
                                                    setIsAttachmentDeleteModalOpen(false);
                                                    setAttachmentToDelete(null);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-danger"
                                                onClick={confirmDeleteAttachment}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            {isReviewModalOpen && (
                                <>
                                    <div className="modal-backdrop" onClick={closeReviewModal} />
                                    <div
                                        className="modal review-modal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="review-modal-title"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <h3 className="modal-title" id="review-modal-title">Final Note</h3>
                                        <p className="modal-text">Capture your post-trade thoughts while they’re fresh.</p>
                                        {reviewError && <div className="banner error">{reviewError}</div>}
                                        <div className="review-field">
                                            <span className="review-label">Followed plan?</span>
                                            <div className="review-toggle-group">
                                                {["YES", "NO", "MAYBE"].map((value) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        className={`btn btn-ghost btn-sm review-toggle-btn${
                                                            reviewFollowedPlan === value ? " is-active" : ""
                                                        }`}
                                                        onClick={() => setReviewFollowedPlan(value)}
                                                    >
                                                        {value === "MAYBE" ? "Maybe" : value.charAt(0) + value.slice(1).toLowerCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="review-field">
                                            <span className="review-label">Mistakes?</span>
                                            <div className="review-toggle-group">
                                                <button
                                                    type="button"
                                                    className={`btn btn-ghost btn-sm review-toggle-btn${
                                                        reviewMistakesMode === "none" ? " is-active" : ""
                                                    }`}
                                                    onClick={() => {
                                                        setReviewMistakesMode("none");
                                                        setReviewMistakesText("");
                                                    }}
                                                >
                                                    None
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn btn-ghost btn-sm review-toggle-btn${
                                                        reviewMistakesMode === "write" ? " is-active" : ""
                                                    }`}
                                                    onClick={() => setReviewMistakesMode("write")}
                                                >
                                                    Write
                                                </button>
                                            </div>
                                            {reviewMistakesMode === "write" && (
                                                <textarea
                                                    className="input review-textarea"
                                                    rows={3}
                                                    value={reviewMistakesText}
                                                    onChange={(e) => setReviewMistakesText(e.target.value)}
                                                    placeholder="What went wrong?"
                                                />
                                            )}
                                        </div>
                                        <div className="review-field">
                                            <span className="review-label">What would I do differently?</span>
                                            <div className="review-toggle-group">
                                                <button
                                                    type="button"
                                                    className={`btn btn-ghost btn-sm review-toggle-btn${
                                                        reviewImprovementMode === "none" ? " is-active" : ""
                                                    }`}
                                                    onClick={() => {
                                                        setReviewImprovementMode("none");
                                                        setReviewImprovementText("");
                                                    }}
                                                >
                                                    Nothing
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn btn-ghost btn-sm review-toggle-btn${
                                                        reviewImprovementMode === "write" ? " is-active" : ""
                                                    }`}
                                                    onClick={() => setReviewImprovementMode("write")}
                                                >
                                                    Write
                                                </button>
                                            </div>
                                            {reviewImprovementMode === "write" && (
                                                <textarea
                                                    className="input review-textarea"
                                                    rows={3}
                                                    value={reviewImprovementText}
                                                    onChange={(e) => setReviewImprovementText(e.target.value)}
                                                    placeholder="Next time I will..."
                                                />
                                            )}
                                        </div>
                                        <div className="review-field">
                                            <div className="review-range-header">
                                                <span className="review-label">Confidence (1–10)</span>
                                                <span className="review-range-value">{reviewConfidence}</span>
                                            </div>
                                            <input
                                                className="review-range"
                                                type="range"
                                                min="1"
                                                max="10"
                                                step="1"
                                                value={reviewConfidence}
                                                onChange={(e) => setReviewConfidence(Number(e.target.value))}
                                            />
                                        </div>
                                        <p className="review-hint">
                                            You can come back later and edit this note as you review the trade.
                                        </p>
                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={closeReviewModal}
                                                disabled={isReviewSubmitting}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={submitReview}
                                                disabled={isReviewSubmitting}
                                            >
                                                {isReviewSubmitting ? "Saving\u2026" : "Submit"}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

