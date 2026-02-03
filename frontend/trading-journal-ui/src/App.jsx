import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exportToCsv } from "./utils/exportCsv";
import { buildApiError, getUserMessage } from "./shared/api/http";
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
    isNetPnlPresent,
    getRealizedRIfPresent,
    formatOutcome as formatOutcomeUtil,
    getOutcomeClass as getOutcomeClassUtil,
} from "./features/stats/utils/outcomes";
import useStatsEngine from "./features/stats/hooks/useStatsEngine";
import TradeDetailsPanelLeft from "./features/trades/components/TradeDetailsPanelLeft";
import TradeDetailsPanelRight from "./features/attachments/components/TradeDetailsPanelRight";
import HeaderBar from "./app/layout/HeaderBar";
import AuthCard from "./features/auth/components/AuthCard";
import AddTradeForm from "./features/trades/components/AddTradeForm";
import FiltersPanel from "./features/trades/components/FiltersPanel";
import TradesTable from "./features/trades/components/TradesTable";
import Pagination from "./shared/components/Pagination";
import usePagination from "./shared/hooks/usePagination";
import useTradesFilters from "./features/trades/hooks/useTradesFilters";
import useUIState from "./app/hooks/useUIState";
import useAttachments from "./features/attachments/hooks/useAttachments";
import useRiskCalculatorState from "./features/risk/hooks/useRiskCalculatorState";
import {
    getTrades,
    createTrade as createTradeApi,
    updateTrade as updateTradeApi,
    deleteTrade as deleteTradeApi,
    submitTradeReview as submitTradeReviewApi,
} from "./features/trades/api/tradesApi";
import {
    getAccountSettings as getAccountSettingsApi,
    updateAccountSettings as updateAccountSettingsApi,
} from "./features/account/api/accountApi";
import {
    getCashflows as getCashflowsApi,
    createCashflow as createCashflowApi,
    updateCashflow as updateCashflowApi,
    deleteCashflow as deleteCashflowApi,
} from "./features/cashflows/api/cashflowsApi";
import {
    uploadTradeAttachment,
    updateAttachment as updateAttachmentApi,
    deleteAttachment as deleteAttachmentApi,
} from "./features/attachments/api/attachmentsApi";
import DeleteTradeModal from "./features/trades/components/DeleteTradeModal";
import ReviewModal from "./features/trades/components/ReviewModal";
import AttachmentLightbox from "./features/attachments/components/AttachmentLightbox";
import AttachmentUploadModal from "./features/attachments/components/AttachmentUploadModal";
import AccountSettingsModal from "./features/account/components/AccountSettingsModal";
import CashflowsModal from "./features/cashflows/components/CashflowsModal";
import CashflowEditModal from "./features/cashflows/components/CashflowEditModal";
import DeleteCashflowModal from "./features/cashflows/components/DeleteCashflowModal";
import RiskCalculatorModal from "./features/risk/components/RiskCalculatorModal";
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
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [token, setToken] = useState(localStorage.getItem("token") || "");
    const [authMode, setAuthMode] = useState("login");
    const [accountSettings, setAccountSettings] = useState(null);
    const [accountSettingsBalance, setAccountSettingsBalance] = useState("");
    const [accountSettingsRiskPercent, setAccountSettingsRiskPercent] = useState("");
    const [accountSettingsCurrency, setAccountSettingsCurrency] = useState("");
    const [accountSettingsError, setAccountSettingsError] = useState("");
    const [isAccountSettingsSaving, setIsAccountSettingsSaving] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [cashflows, setCashflows] = useState([]);
    const [cashflowType, setCashflowType] = useState("DEPOSIT");
    const [cashflowAmount, setCashflowAmount] = useState("");
    const [cashflowOccurredAt, setCashflowOccurredAt] = useState("");
    const [cashflowNote, setCashflowNote] = useState("");
    const [cashflowError, setCashflowError] = useState("");
    const [isCashflowSaving, setIsCashflowSaving] = useState(false);
    const [cashflowEditType, setCashflowEditType] = useState("DEPOSIT");
    const [cashflowEditAmount, setCashflowEditAmount] = useState("");
    const [cashflowEditOccurredAt, setCashflowEditOccurredAt] = useState("");
    const [cashflowEditNote, setCashflowEditNote] = useState("");
    const [cashflowEditError, setCashflowEditError] = useState("");

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
    const [attachSection, setAttachSection] = useState(null);
    const [attachFile, setAttachFile] = useState(null);
    const [attachPreviewUrl, setAttachPreviewUrl] = useState("");
    const [attachError, setAttachError] = useState("");
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const [isAttachmentDragOver, setIsAttachmentDragOver] = useState(false);
    const [lightboxScale, setLightboxScale] = useState(1);
    const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 });
    const [lightboxDragging, setLightboxDragging] = useState(false);
    const [lightboxDragStart, setLightboxDragStart] = useState({ x: 0, y: 0 });
    const attachmentInputRef = useRef(null);
    const leftPanelRef = useRef(null);
    const rightPanelRef = useRef(null);
    const accountMenuRef = useRef(null);
    const accountMenuButtonRef = useRef(null);
    const [reviewFollowedPlan, setReviewFollowedPlan] = useState("");
    const [reviewMistakesMode, setReviewMistakesMode] = useState("none");
    const [reviewMistakesText, setReviewMistakesText] = useState("");
    const [reviewImprovementMode, setReviewImprovementMode] = useState("none");
    const [reviewImprovementText, setReviewImprovementText] = useState("");
    const [reviewConfidence, setReviewConfidence] = useState(5);
    const [reviewError, setReviewError] = useState("");
    const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [refreshBlockedUntil, setRefreshBlockedUntil] = useState(0);
    const isLoadingRef = useRef(false);
    const refreshBlockedUntilRef = useRef(0);
    const lastLoadedTokenRef = useRef("");
    const initialLoadInFlightRef = useRef("");
    const BASE_SESSION_OFFSET = 1; // GMT+1
    const {
        selectedTradeForDetails,
        setSelectedTradeForDetails,
        isDetailsOpen,
        setIsDetailsOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isReviewModalOpen,
        setIsReviewModalOpen,
        reviewTradeId,
        setReviewTradeId,
        isAccountSettingsOpen,
        setIsAccountSettingsOpen,
        isCashflowsOpen,
        setIsCashflowsOpen,
        isCashflowEditOpen,
        setIsCashflowEditOpen,
        cashflowEditId,
        setCashflowEditId,
        isCashflowDeleteOpen,
        setIsCashflowDeleteOpen,
        cashflowDeleteTarget,
        setCashflowDeleteTarget,
        isAttachModalOpen,
        setIsAttachModalOpen,
        attachTradeId,
        setAttachTradeId,
        isAttachmentDeleteModalOpen,
        setIsAttachmentDeleteModalOpen,
        attachmentToDelete,
        setAttachmentToDelete,
        lightboxUrl,
        setLightboxUrl,
        isRiskCalcOpen,
        setIsRiskCalcOpen,
    } = useUIState();
    const {
        attachmentsBySection,
        setAttachmentsBySection,
        resetAttachments,
    } = useAttachments({
        token,
        apiBase: API,
        apiRoot: API_ROOT,
        selectedTradeId: selectedTradeForDetails?.id ?? null,
        isDetailsOpen,
        onError: setError,
    });
    const {
        riskCalcAccountCurrency,
        setRiskCalcAccountCurrency,
        riskCalcBalance,
        setRiskCalcBalance,
        riskCalcRiskPercent,
        setRiskCalcRiskPercent,
        riskCalcSymbol,
        setRiskCalcSymbol,
        riskCalcEntryPrice,
        setRiskCalcEntryPrice,
        riskCalcStopLossPrice,
        setRiskCalcStopLossPrice,
        riskCalcConversionRate,
        setRiskCalcConversionRate,
        riskCalcContractSize,
        setRiskCalcContractSize,
    } = useRiskCalculatorState({
        initialAccountCurrency: "USD",
        initialBalance: "",
        initialRiskPercent: "1.0",
        initialSymbol: symbol,
        initialEntryPrice: "",
        initialStopLossPrice: "",
        initialConversionRate: "",
        initialContractSize: "100",
        contractSizeStorageKey: "xau_contract_size",
    });
    const {
        filteredTrades,
        symbolFilter,
        setSymbolFilter,
        directionFilter,
        setDirectionFilter,
        statusFilter,
        setStatusFilter,
        datePreset,
        setDatePreset,
        fromDate,
        setFromDate,
        toDate,
        setToDate,
        showFilters,
        setShowFilters,
        clearFilters,
    } = useTradesFilters({
        trades,
        matchesDatePreset,
        initialSymbol: "all",
        initialDirection: "all",
        initialStatus: "all",
        initialDatePreset: "all",
        initialFromDate: "",
        initialToDate: "",
        initialShowFilters: false,
    });
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
                throw await buildApiError(res);
            }

            const data = await res.json();
            setToken(data.token);
            localStorage.setItem("token", data.token);

            const emailFromToken = tryExtractEmailFromIdToken(idToken);
            if (emailFromToken) {
                setEmail(emailFromToken);
            }
        } catch (err) {
            setError(getUserMessage(err));
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
                throw await buildApiError(res);
            }

            const data = await res.json();
            setToken(data.token);
            localStorage.setItem("token", data.token);
        } catch (err) {
            setError(getUserMessage(err));
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
                throw await buildApiError(res);
            }

            setEmail(normalizedEmail);
            await login();
        } catch (err) {
            setError(getUserMessage(err));
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
        isLoadingRef.current = isLoading;
    }, [isLoading]);
    useEffect(() => {
        refreshBlockedUntilRef.current = refreshBlockedUntil;
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

    const resetAttachmentPreview = useCallback(() => {
        setAttachFile(null);
        setAttachError("");
        if (attachmentInputRef.current) {
            attachmentInputRef.current.value = "";
        }
    }, [attachmentInputRef, setAttachError, setAttachFile]);

    const closeAttachModal = useCallback(() => {
        setIsAttachModalOpen(false);
        setAttachSection(null);
        setAttachTradeId(null);
        resetAttachmentPreview();
        setIsAttachmentDragOver(false);
        setIsUploadingAttachment(false);
    }, [
        resetAttachmentPreview,
        setAttachSection,
        setAttachTradeId,
        setIsAttachModalOpen,
        setIsAttachmentDragOver,
        setIsUploadingAttachment,
    ]);

    useEffect(() => {
        if (!isAttachModalOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                closeAttachModal();
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isAttachModalOpen, closeAttachModal]);

    const loadTrades = useCallback(async ({ force = false } = {}) => {
        if (isLoadingRef.current) return;
        const now = Date.now();
        const blockedUntil = refreshBlockedUntilRef.current;
        if (!force && blockedUntil && now < blockedUntil) {
            const seconds = Math.ceil((blockedUntil - now) / 1000);
            setError(`Please wait ${seconds}s before refreshing again.`);
            return;
        }
        if (!force) {
            const nextBlockedUntil = now + REFRESH_COOLDOWN_MS;
            refreshBlockedUntilRef.current = nextBlockedUntil;
            setRefreshBlockedUntil(nextBlockedUntil);
        }
        setError("");
        isLoadingRef.current = true;
        setIsLoading(true);
        try {
            const data = await getTrades(API, token);
            setTrades(data);
        } catch (err) {
            setError(getUserMessage(err));
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, [token]);

    const loadAccountSettings = useCallback(async () => {
        if (!token) return;
        setAccountSettingsError("");
        try {
            const data = await getAccountSettingsApi(API, token);
            setAccountSettings(data);
        } catch (err) {
            if (err?.status === 404) {
                setAccountSettings(null);
                return;
            }
            setAccountSettingsError(getUserMessage(err));
        }
    }, [token]);

    const loadCashflows = useCallback(async () => {
        if (!token) return;
        setCashflowError("");
        try {
            const data = await getCashflowsApi(API, token);
            setCashflows(Array.isArray(data) ? data : []);
        } catch (err) {
            setCashflowError(getUserMessage(err));
        }
    }, [token]);

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

    function openAttachModal(section) {
        setAttachSection(section);
        setAttachTradeId(selectedTradeForDetails?.id || null);
        setAttachFile(null);
        setAttachError("");
        setIsAttachmentDragOver(false);
        setIsUploadingAttachment(false);
        setIsAttachModalOpen(true);
    }

    function openAccountSettingsModal() {
        setAccountSettingsError("");
        setAccountSettingsBalance(accountSettings?.startingBalance?.toString() || "");
        setAccountSettingsRiskPercent(accountSettings?.riskPercent?.toString() || "");
        setAccountSettingsCurrency(accountSettings?.currency ?? "");
        setIsAccountSettingsOpen(true);
    }

    const closeAccountSettingsModal = useCallback(() => {
        setIsAccountSettingsOpen(false);
        setAccountSettingsError("");
    }, [setAccountSettingsError, setIsAccountSettingsOpen]);

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
            const data = await updateAccountSettingsApi(API, token, {
                startingBalance,
                riskPercent,
                currency: accountSettingsCurrency || null,
            });
            setAccountSettings(data);
            setIsAccountSettingsOpen(false);
        } catch (err) {
            setAccountSettingsError(getUserMessage(err));
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

    const closeCashflowsModal = useCallback(() => {
        setIsCashflowsOpen(false);
        setCashflowError("");
    }, [setCashflowError, setIsCashflowsOpen]);

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

    const closeCashflowEditModal = useCallback(() => {
        setIsCashflowEditOpen(false);
        setCashflowEditId(null);
        setCashflowEditError("");
    }, [setCashflowEditError, setCashflowEditId, setIsCashflowEditOpen]);

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
            await createCashflowApi(API, token, {
                type: cashflowType,
                amountMoney: amountNumber,
                occurredAt: occurredAtIso,
                note: cashflowNote?.trim() ? cashflowNote.trim() : null,
            });
            setCashflowAmount("");
            setCashflowNote("");
            setCashflowOccurredAt(toDateTimeLocalValue(new Date()));
            await loadCashflows();
        } catch (err) {
            setCashflowError(getUserMessage(err));
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
            await updateCashflowApi(API, token, cashflowEditId, {
                type: cashflowEditType,
                amountMoney: amountNumber,
                occurredAt: occurredAtIso,
                note: cashflowEditNote?.trim() ? cashflowEditNote.trim() : null,
            });
            closeCashflowEditModal();
            await loadCashflows();
        } catch (err) {
            setCashflowEditError(getUserMessage(err));
        }
    }

    async function deleteCashflow(id) {
        if (!id) return;
        try {
            await deleteCashflowApi(API, token, id);
            await loadCashflows();
        } catch (err) {
            setCashflowError(getUserMessage(err));
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
            const createdRaw = await uploadTradeAttachment(API, token, attachTradeId, form);
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
            setAttachError(getUserMessage(err));
        } finally {
            setIsUploadingAttachment(false);
        }
    }

    async function updateAttachmentTimeframe(attachmentId, timeframe) {
        if (!attachmentId) return;
        try {
            const updatedRaw = await updateAttachmentApi(API, token, attachmentId, { timeframe });
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
            setError(getUserMessage(err));
        }
    }

    async function removeAttachment(attachment) {
        if (!attachment?.id) return;
        try {
            await deleteAttachmentApi(API, token, attachment.id);
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
            setError(getUserMessage(err));
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

    async function updateTradeRequest(id, payload) {
        return updateTradeApi(API, token, id, payload);
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
        return submitTradeReviewApi(API, token, id, payload);
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
            setReviewError(getUserMessage(err));
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
            setError(getUserMessage(err));
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
            await deleteTradeApi(API, token, id);
            await loadTrades({ force: true });
            return true;
        } catch (e) {
            setError(getUserMessage(e));
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
            await createTradeApi(API, token, {
                symbol,
                direction,
                entryPrice: entryPriceNumber,
                stopLossPrice: stopLossNumber,
                takeProfitPrice: takeProfitNumber,
            });
            setEntryPrice("");
            setStopLossPrice("");
            setTakeProfitPrice("");
            await loadTrades({ force: true });
        } catch (err) {
            setError(getUserMessage(err));
        }
    }

    const symbolOptions = useMemo(() => {
        const unique = new Set();
        trades.forEach((trade) => {
            if (trade.symbol) unique.add(trade.symbol);
        });
        return Array.from(unique).sort();
    }, [trades]);

    const {
        strategyLedger,
        realizedLedger,
        activeLedger,
        summaryStats,
        realizedCoverage,
        cashflowNet,
        periodBalanceRange,
        moneyMetrics,
    } = useStatsEngine({
        trades,
        filteredTrades,
        cashflows,
        accountSettings,
        statsMode,
        datePreset,
        fromDate,
        toDate,
        matchesDatePreset,
    });

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
    const {
        currentPage,
        setCurrentPage,
        totalPages,
        paginationItems,
        goToPage,
        nextPage,
        prevPage,
    } = usePagination({ totalItems: sortedTrades.length, pageSize, initialPage: 1 });
    const pagedTrades = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedTrades.slice(start, start + pageSize);
    }, [sortedTrades, currentPage, pageSize]);
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
            setError(getUserMessage(err));
        } finally {
            setIsExporting(false);
        }
    }

    useEffect(() => {
        if (!token) {
            lastLoadedTokenRef.current = "";
            initialLoadInFlightRef.current = "";
            return;
        }
        if (lastLoadedTokenRef.current === token || initialLoadInFlightRef.current === token) return;
        lastLoadedTokenRef.current = token;
        initialLoadInFlightRef.current = token;
        const runInitialLoad = async () => {
            await Promise.allSettled([
                loadTrades({ force: true }),
                loadAccountSettings(),
                loadCashflows(),
            ]);
            if (initialLoadInFlightRef.current === token) {
                initialLoadInFlightRef.current = "";
            }
        };
        runInitialLoad();
    }, [token, loadAccountSettings, loadCashflows, loadTrades]);

    useEffect(() => {
        setCurrentPage(1);
    }, [symbolFilter, directionFilter, statusFilter, datePreset, fromDate, toDate, setCurrentPage]);

    useEffect(() => {
        if (!isDeleteModalOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                setIsDeleteModalOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isDeleteModalOpen, setIsDeleteModalOpen]);

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
    }, [isAttachmentDeleteModalOpen, setAttachmentToDelete, setIsAttachmentDeleteModalOpen]);

    useEffect(() => {
        if (!isRiskCalcOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                setIsRiskCalcOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isRiskCalcOpen, setIsRiskCalcOpen]);

    useEffect(() => {
        if (!isAccountSettingsOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                closeAccountSettingsModal();
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isAccountSettingsOpen, closeAccountSettingsModal]);

    useEffect(() => {
        if (!isCashflowsOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                closeCashflowsModal();
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isCashflowsOpen, closeCashflowsModal]);

    useEffect(() => {
        if (!isCashflowEditOpen) return undefined;
        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                closeCashflowEditModal();
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isCashflowEditOpen, closeCashflowEditModal]);

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
    }, [isCashflowDeleteOpen, setCashflowDeleteTarget, setIsCashflowDeleteOpen]);

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
        isRiskCalcXau,
        riskCalcContractSizeValid,
        riskCalcContractSizeNum,
    ]);

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
                                        symbolFilter={symbolFilter}
                                        directionFilter={directionFilter}
                                        statusFilter={statusFilter}
                                        onChangeSymbol={(e) => setSymbolFilter(e.target.value)}
                                        onChangeDirection={(e) => setDirectionFilter(e.target.value)}
                                        onChangeStatus={(e) => setStatusFilter(e.target.value)}
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
                                onPrev={prevPage}
                                onNext={nextPage}
                                onGoToPage={goToPage}
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
                            <RiskCalculatorModal
                                isOpen={isRiskCalcOpen}
                                onClose={closeRiskCalc}
                                riskCalcAccountCurrency={riskCalcAccountCurrency}
                                setRiskCalcAccountCurrency={setRiskCalcAccountCurrency}
                                riskCalcBalance={riskCalcBalance}
                                setRiskCalcBalance={setRiskCalcBalance}
                                riskCalcRiskPercent={riskCalcRiskPercent}
                                setRiskCalcRiskPercent={setRiskCalcRiskPercent}
                                riskCalcSymbol={riskCalcSymbol}
                                setRiskCalcSymbol={setRiskCalcSymbol}
                                riskCalcEntryPrice={riskCalcEntryPrice}
                                setRiskCalcEntryPrice={setRiskCalcEntryPrice}
                                riskCalcStopLossPrice={riskCalcStopLossPrice}
                                setRiskCalcStopLossPrice={setRiskCalcStopLossPrice}
                                riskCalcContractSize={riskCalcContractSize}
                                setRiskCalcContractSize={setRiskCalcContractSize}
                                riskCalcConversionRate={riskCalcConversionRate}
                                setRiskCalcConversionRate={setRiskCalcConversionRate}
                                isRiskCalcXau={isRiskCalcXau}
                                riskCalcContractSizeValid={riskCalcContractSizeValid}
                                riskCalcResult={riskCalcResult}
                                conversionPairLabel={conversionPairLabel}
                                conversionHelper={conversionHelper}
                                accountCurrencies={ACCOUNT_CURRENCIES}
                                instruments={INSTRUMENTS}
                                getPriceStep={getPriceStep}
                                getDisplayUnit={getDisplayUnit}
                                formatCalcNumber={formatCalcNumber}
                                formatCalcInteger={formatCalcInteger}
                                formatCalcPrice={formatCalcPrice}
                                copiedKey={copiedKey}
                                handleCopy={handleCopy}
                                emDash={emDash}
                            />
                            <CashflowsModal
                                isOpen={isCashflowsOpen}
                                onClose={closeCashflowsModal}
                                cashflows={cashflows}
                                cashflowError={cashflowError}
                                cashflowType={cashflowType}
                                setCashflowType={setCashflowType}
                                cashflowAmount={cashflowAmount}
                                setCashflowAmount={setCashflowAmount}
                                cashflowOccurredAt={cashflowOccurredAt}
                                setCashflowOccurredAt={setCashflowOccurredAt}
                                cashflowNote={cashflowNote}
                                setCashflowNote={setCashflowNote}
                                onCreateCashflow={createCashflow}
                                isCashflowSaving={isCashflowSaving}
                                cashflowTypes={CASHFLOW_TYPES}
                                formatCashflowTypeLabel={formatCashflowTypeLabel}
                                formatCashflowAmount={formatCashflowAmount}
                                formatDate={formatDate}
                                onOpenEdit={openCashflowEditModal}
                                onOpenDelete={requestDeleteCashflow}
                            />
                            <CashflowEditModal
                                isOpen={isCashflowEditOpen}
                                onClose={closeCashflowEditModal}
                                onSave={saveCashflowEdit}
                                cashflowEditError={cashflowEditError}
                                cashflowEditType={cashflowEditType}
                                setCashflowEditType={setCashflowEditType}
                                cashflowEditAmount={cashflowEditAmount}
                                setCashflowEditAmount={setCashflowEditAmount}
                                cashflowEditOccurredAt={cashflowEditOccurredAt}
                                setCashflowEditOccurredAt={setCashflowEditOccurredAt}
                                cashflowEditNote={cashflowEditNote}
                                setCashflowEditNote={setCashflowEditNote}
                                cashflowTypes={CASHFLOW_TYPES}
                            />
                            <DeleteCashflowModal
                                isOpen={isCashflowDeleteOpen}
                                onClose={() => {
                                    setIsCashflowDeleteOpen(false);
                                    setCashflowDeleteTarget(null);
                                }}
                                onConfirm={confirmDeleteCashflow}
                            />
                            <AccountSettingsModal
                                isOpen={isAccountSettingsOpen}
                                onClose={closeAccountSettingsModal}
                                onSave={saveAccountSettings}
                                accountSettingsError={accountSettingsError}
                                accountSettingsBalance={accountSettingsBalance}
                                setAccountSettingsBalance={setAccountSettingsBalance}
                                accountSettingsRiskPercent={accountSettingsRiskPercent}
                                setAccountSettingsRiskPercent={setAccountSettingsRiskPercent}
                                accountSettingsCurrency={accountSettingsCurrency}
                                setAccountSettingsCurrency={setAccountSettingsCurrency}
                                accountCurrencies={ACCOUNT_CURRENCIES}
                                isAccountSettingsSaving={isAccountSettingsSaving}
                            />
                            <AttachmentUploadModal
                                isOpen={isAttachModalOpen}
                                onClose={closeAttachModal}
                                attachSection={attachSection}
                                isAttachmentDragOver={isAttachmentDragOver}
                                onDrop={handleAttachmentDrop}
                                onDragOver={handleAttachmentDragOver}
                                onDragLeave={handleAttachmentDragLeave}
                                attachPreviewUrl={attachPreviewUrl}
                                attachmentInputRef={attachmentInputRef}
                                onPickFile={() => attachmentInputRef.current?.click()}
                                onFileChange={(e) => handleAttachmentFile(e.target.files?.[0])}
                                attachError={attachError}
                                onReplace={resetAttachmentPreview}
                                onConfirm={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    confirmAttachmentUpload();
                                }}
                                isUploadingAttachment={isUploadingAttachment}
                            />
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
                            <ReviewModal
                                isOpen={isReviewModalOpen}
                                onClose={closeReviewModal}
                                onSubmit={submitReview}
                                reviewError={reviewError}
                                reviewFollowedPlan={reviewFollowedPlan}
                                setReviewFollowedPlan={setReviewFollowedPlan}
                                reviewMistakesMode={reviewMistakesMode}
                                setReviewMistakesMode={setReviewMistakesMode}
                                reviewMistakesText={reviewMistakesText}
                                setReviewMistakesText={setReviewMistakesText}
                                reviewImprovementMode={reviewImprovementMode}
                                setReviewImprovementMode={setReviewImprovementMode}
                                reviewImprovementText={reviewImprovementText}
                                setReviewImprovementText={setReviewImprovementText}
                                reviewConfidence={reviewConfidence}
                                setReviewConfidence={setReviewConfidence}
                                isReviewSubmitting={isReviewSubmitting}
                            />
                            <AttachmentLightbox
                                isOpen={Boolean(lightboxUrl)}
                                src={lightboxUrl}
                                alt="Attachment preview"
                                onClose={() => setLightboxUrl("")}
                                lightboxScale={lightboxScale}
                                lightboxOffset={lightboxOffset}
                                lightboxDragging={lightboxDragging}
                                lightboxDragStart={lightboxDragStart}
                                setLightboxOffset={setLightboxOffset}
                                setLightboxDragging={setLightboxDragging}
                                setLightboxDragStart={setLightboxDragStart}
                                setLightboxScale={setLightboxScale}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}


