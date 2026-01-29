import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { exportToCsv } from "./utils/exportCsv";
import { INSTRUMENTS, getDisplayUnit, getInstrument, getTickSize } from "./constants/instruments";
import { calculateRiskPosition } from "./utils/riskCalculator";
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

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function DetailRow({ label, value, isMuted = false, isEditing = false }) {
    return (
        <div className="drawer-detail-row">
            <span className="drawer-detail-label">{label}</span>
            <span className={`drawer-detail-value${isMuted ? " is-muted" : ""}${isEditing ? " is-editing" : ""}`}>
                {value}
            </span>
        </div>
    );
}

function TradeDetailsPanelLeft({
    trade,
    open,
    onClose,
    formatDate,
    formatDuration,
    formatSymbol,
    getSessionLabel,
    formatOutcome,
    onCloseTrade,
    onOpenReview,
    toDateTimeLocalValue,
    isEditing,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDeleteTrade,
    editSymbol,
    setEditSymbol,
    editDirection,
    setEditDirection,
    editEntryPrice,
    setEditEntryPrice,
    editExitPrice,
    setEditExitPrice,
    editStopLossPrice,
    setEditStopLossPrice,
    editTakeProfitPrice,
    setEditTakeProfitPrice,
    editCreatedAt,
    setEditCreatedAt,
    editClosedAt,
    setEditClosedAt,
    editCloseReasonOverride,
    setEditCloseReasonOverride,
    editManualReason,
    setEditManualReason,
    editManualDescription,
    setEditManualDescription,
    errorMessage,
    panelRef: externalPanelRef,
    otherPanelRef,
    isAttachModalOpen,
    isReviewModalOpen,
}) {
    const ANIMATION_MS = 200;
    const [isMobile, setIsMobile] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [renderTrade, setRenderTrade] = useState(trade);
    const [closeExitPrice, setCloseExitPrice] = useState("");
    const [closeClosedAt, setCloseClosedAt] = useState("");
    const [closeReasonOverride, setCloseReasonOverride] = useState("");
    const [closeManualReason, setCloseManualReason] = useState("");
    const [closeManualDescription, setCloseManualDescription] = useState("");
    const [closeError, setCloseError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const internalPanelRef = useRef(null);
    const panelRef = externalPanelRef || internalPanelRef;
    const closeTimeoutRef = useRef(null);
    const lastFocusedElementRef = useRef(null);
    const bodyOverflowRef = useRef("");
    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
        const media = window.matchMedia("(max-width: 900px)");
        const update = () => setIsMobile(media.matches);
        update();
        if (typeof media.addEventListener === "function") {
            media.addEventListener("change", update);
            return () => media.removeEventListener("change", update);
        }
        media.addListener(update);
        return () => media.removeListener(update);
    }, []);
    const safeToDateTimeLocalValue = useMemo(() => {
        if (typeof toDateTimeLocalValue === "function") {
            return toDateTimeLocalValue;
        }
        return () => "";
    }, [toDateTimeLocalValue]);
    useEffect(() => {
        if (trade) {
            setRenderTrade(trade);
        }
    }, [trade]);
    useEffect(() => {
        if (open) {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
            setShouldRender(true);
            requestAnimationFrame(() => setIsVisible(true));
            return undefined;
        }
        if (shouldRender) {
            setIsVisible(false);
            closeTimeoutRef.current = setTimeout(() => {
                setShouldRender(false);
            }, ANIMATION_MS + 20);
        }
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, [open, shouldRender]);
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
    const getPipSizeForSymbol = (symbol) => getTickSize(symbol);
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
            symbol: renderTrade?.symbol,
            exitPrice,
            takeProfitPrice: renderTrade?.takeProfitPrice,
            stopLossPrice: renderTrade?.stopLossPrice,
            entryPrice: renderTrade?.entryPrice,
        });
    };
    const deriveCloseReasonFromEditValues = ({ exitValue, entryValue, stopLossValue, takeProfitValue, symbolValue }) => {
        const exitPrice = Number(exitValue);
        if (!Number.isFinite(exitPrice)) return "";
        return deriveCloseReasonForPrices({
            symbol: symbolValue,
            exitPrice,
            takeProfitPrice: takeProfitValue === "" ? null : takeProfitValue,
            stopLossPrice: stopLossValue === "" ? null : stopLossValue,
            entryPrice: entryValue === "" ? null : entryValue,
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
    useEffect(() => {
        if (isEditing) {
            setIsClosing(false);
        }
    }, [isEditing]);

    useEffect(() => {
        if (!isVisible) return undefined;
        const panel = panelRef.current;
        if (!panel) return undefined;
        lastFocusedElementRef.current = document.activeElement;
        const focusable = panel.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusTarget = focusable[0] || panel;
        if (typeof focusTarget?.focus === "function") {
            focusTarget.focus();
        }
        const handleKeydown = (event) => {
            if (event.key !== "Tab") return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first || !last) {
                event.preventDefault();
                panel.focus();
                return;
            }
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        panel.addEventListener("keydown", handleKeydown);
        return () => {
            panel.removeEventListener("keydown", handleKeydown);
            const lastFocused = lastFocusedElementRef.current;
            if (lastFocused && typeof lastFocused.focus === "function") {
                lastFocused.focus();
            }
        };
    }, [isVisible]);
    useEffect(() => {
        if (!isVisible || !isMobile) return undefined;
        bodyOverflowRef.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = bodyOverflowRef.current;
        };
    }, [isVisible, isMobile]);

    useEffect(() => {
        if (!isVisible || isMobile) return undefined;
        const handlePointerDown = (event) => {
            if (isAttachModalOpen || isReviewModalOpen) return;
            const panel = panelRef.current;
            if (!panel) return;
            const target = event.target;
            if (panel.contains(target)) return;
            if (target instanceof Element) {
                const withinTable = target.closest(".trade-row, .table, .table-wrap");
                if (withinTable) return;
                if (target.closest(".modal, .lightbox")) return;
            }
            if (otherPanelRef?.current && otherPanelRef.current.contains(target)) return;
            const path = typeof event.composedPath === "function" ? event.composedPath() : [];
            const clickedTable = path.some(
                (node) => node?.classList?.contains?.("table") || node?.classList?.contains?.("table-wrap")
            );
            const clickedRow = path.some((node) => node?.classList?.contains?.("trade-row"));
            if (clickedTable || clickedRow) return;
            onClose();
        };
        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [isVisible, isMobile, onClose, isAttachModalOpen, isReviewModalOpen, otherPanelRef]);

    if (!shouldRender || !renderTrade) return null;

    const activeTrade = renderTrade;
    const isClosed = Boolean(activeTrade.closedAt);
    const closeReasonValue = getCloseReason(activeTrade);
    const outcomeValue = typeof formatOutcome === "function" ? formatOutcome(activeTrade) : emDash;
    const titleValue = `${formatSymbol(activeTrade.symbol)} \u2022 ${activeTrade.direction}`;
    const outcomeTone = outcomeValue && outcomeValue !== emDash
        ? (String(outcomeValue).startsWith("-") ? "is-negative" : "is-positive")
        : "is-neutral";
    const formatRowValue = (value) => {
        const isEmpty = value == null || value === "" || value === "-";
        const displayValue = isEmpty ? emDash : value;
        return { displayValue, isMuted: displayValue === emDash };
    };
    const formatFollowedPlan = (value) => {
        if (!value) return emDash;
        const upper = String(value).toUpperCase();
        if (upper === "YES") return "Yes";
        if (upper === "NO") return "No";
        if (upper === "MAYBE") return "Maybe";
        return value;
    };

    return (
        <>
            <div
                className={`drawer-backdrop drawer-backdrop-animated${isVisible ? " is-open" : ""}${
                    isMobile ? "" : " drawer-backdrop--passive"
                }`}
                onClick={isMobile ? onClose : undefined}
            />
            <div
                ref={panelRef}
                className={`drawer drawer-left drawer-panel drawer-animated${isVisible ? " is-open" : ""}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal={isMobile ? "true" : undefined}
                aria-labelledby="trade-details-title"
                tabIndex={-1}
            >
                <div className="drawer-scroll">
                    <div className="drawer-header">
                        <div className="drawer-title-wrap">
                            <h3 className="drawer-title" id="trade-details-title">
                                {titleValue}
                            </h3>
                            <div className="drawer-badges">
                                <span className={`badge status-badge ${isClosed ? "is-closed" : "is-open"}`}>
                                    {isClosed ? "CLOSED" : "OPEN"}
                                </span>
                                <span className={`badge outcome-badge ${outcomeTone}`}>
                                    {outcomeValue}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm drawer-close"
                            aria-label="Close details panel"
                            onClick={onClose}
                        >
                            {"\u00d7"}
                        </button>
                    </div>

                    <div className="drawer-sections">
                        <div className="drawer-section">
                            <h4 className="drawer-section-title">Levels</h4>
                            <div className="drawer-section-body">
                                {isEditing ? (
                                    <>
                                        <DetailRow
                                            label="Symbol"
                                            isEditing
                                            value={
                                                <select
                                                    className="input"
                                                    value={editSymbol}
                                                    onChange={(e) => {
                                                        const nextValue = e.target.value;
                                                        setEditSymbol(nextValue);
                                                        const nextReason = deriveCloseReasonFromEditValues({
                                                            exitValue: editExitPrice,
                                                            entryValue: editEntryPrice,
                                                            stopLossValue: editStopLossPrice,
                                                            takeProfitValue: editTakeProfitPrice,
                                                            symbolValue: nextValue,
                                                        });
                                                        if (nextReason) {
                                                            setEditCloseReasonOverride(nextReason);
                                                            if (nextReason !== "Manual") {
                                                                setEditManualReason("");
                                                                setEditManualDescription("");
                                                            }
                                                        }
                                                    }}
                                                >
                                                    {INSTRUMENTS.map((pair) => (
                                                        <option key={pair.value} value={pair.value}>
                                                            {pair.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            }
                                        />
                                        <DetailRow
                                            label="Direction"
                                            isEditing
                                            value={
                                                <select
                                                    className="input"
                                                    value={editDirection}
                                                    onChange={(e) => setEditDirection(e.target.value)}
                                                >
                                                    <option value="LONG">LONG</option>
                                                    <option value="SHORT">SHORT</option>
                                                </select>
                                            }
                                        />
                                        <DetailRow
                                            label="Entry"
                                            isEditing
                                            value={
                                                <input
                                                    className="input"
                                                    value={editEntryPrice}
                                                    onChange={(e) => {
                                                        const nextValue = e.target.value;
                                                        setEditEntryPrice(nextValue);
                                                        const nextReason = deriveCloseReasonFromEditValues({
                                                            exitValue: editExitPrice,
                                                            entryValue: nextValue,
                                                            stopLossValue: editStopLossPrice,
                                                            takeProfitValue: editTakeProfitPrice,
                                                            symbolValue: editSymbol,
                                                        });
                                                        if (nextReason) {
                                                            setEditCloseReasonOverride(nextReason);
                                                            if (nextReason !== "Manual") {
                                                                setEditManualReason("");
                                                                setEditManualDescription("");
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Entry price"
                                                    type="number"
                                                    step="0.00001"
                                                    min="0"
                                                />
                                            }
                                        />
                                        {isClosed ? (
                                            <DetailRow
                                                label="Exit"
                                                isEditing
                                                value={
                                                    <input
                                                        className="input"
                                                        value={editExitPrice}
                                                        onChange={(e) => {
                                                            const nextValue = e.target.value;
                                                            setEditExitPrice(nextValue);
                                                            const nextReason = deriveCloseReasonFromEditValues({
                                                                exitValue: nextValue,
                                                                entryValue: editEntryPrice,
                                                                stopLossValue: editStopLossPrice,
                                                                takeProfitValue: editTakeProfitPrice,
                                                                symbolValue: editSymbol,
                                                            });
                                                            if (nextReason) {
                                                                setEditCloseReasonOverride(nextReason);
                                                                if (nextReason !== "Manual") {
                                                                    setEditManualReason("");
                                                                    setEditManualDescription("");
                                                                }
                                                            }
                                                        }}
                                                        placeholder="Exit price"
                                                        type="number"
                                                        step="0.00001"
                                                        min="0"
                                                    />
                                                }
                                            />
                                        ) : (
                                            (() => {
                                                const exitRow = formatRowValue(activeTrade.exitPrice);
                                                return <DetailRow label="Exit" value={exitRow.displayValue} isMuted={exitRow.isMuted} />;
                                            })()
                                        )}
                                        <DetailRow
                                            label="SL"
                                            isEditing
                                            value={
                                                <input
                                                    className="input"
                                                    value={editStopLossPrice}
                                                    onChange={(e) => {
                                                        const nextValue = e.target.value;
                                                        setEditStopLossPrice(nextValue);
                                                        const nextReason = deriveCloseReasonFromEditValues({
                                                            exitValue: editExitPrice,
                                                            entryValue: editEntryPrice,
                                                            stopLossValue: nextValue,
                                                            takeProfitValue: editTakeProfitPrice,
                                                            symbolValue: editSymbol,
                                                        });
                                                        if (nextReason) {
                                                            setEditCloseReasonOverride(nextReason);
                                                            if (nextReason !== "Manual") {
                                                                setEditManualReason("");
                                                                setEditManualDescription("");
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Stop loss"
                                                    type="number"
                                                    step="0.00001"
                                                    min="0"
                                                />
                                            }
                                        />
                                        <DetailRow
                                            label="TP"
                                            isEditing
                                            value={
                                                <input
                                                    className="input"
                                                    value={editTakeProfitPrice}
                                                    onChange={(e) => {
                                                        const nextValue = e.target.value;
                                                        setEditTakeProfitPrice(nextValue);
                                                        const nextReason = deriveCloseReasonFromEditValues({
                                                            exitValue: editExitPrice,
                                                            entryValue: editEntryPrice,
                                                            stopLossValue: editStopLossPrice,
                                                            takeProfitValue: nextValue,
                                                            symbolValue: editSymbol,
                                                        });
                                                        if (nextReason) {
                                                            setEditCloseReasonOverride(nextReason);
                                                            if (nextReason !== "Manual") {
                                                                setEditManualReason("");
                                                                setEditManualDescription("");
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Take profit"
                                                    type="number"
                                                    step="0.00001"
                                                    min="0"
                                                />
                                            }
                                        />
                                    </>
                                ) : (
                                    <>
                                        {(() => {
                                            const symbolRow = formatRowValue(formatSymbol(activeTrade.symbol));
                                            const directionRow = formatRowValue(activeTrade.direction);
                                            const entryRow = formatRowValue(activeTrade.entryPrice);
                                            const exitRow = formatRowValue(activeTrade.exitPrice);
                                            const slRow = formatRowValue(activeTrade.stopLossPrice);
                                            const tpRow = formatRowValue(activeTrade.takeProfitPrice);
                                            return (
                                                <>
                                                    <DetailRow label="Symbol" value={symbolRow.displayValue} isMuted={symbolRow.isMuted} />
                                                    <DetailRow label="Direction" value={directionRow.displayValue} isMuted={directionRow.isMuted} />
                                                    <DetailRow label="Entry" value={entryRow.displayValue} isMuted={entryRow.isMuted} />
                                                    <DetailRow
                                                        label="Exit"
                                                        isEditing={isClosing && !isClosed}
                                                        value={
                                                            isClosing && !isClosed ? (
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
                                                                                setCloseManualDescription("");
                                                                            }
                                                                        }
                                                                    }}
                                                                    placeholder="Exit price"
                                                                    type="number"
                                                                    step="0.00001"
                                                                    min="0"
                                                                />
                                                            ) : (
                                                                exitRow.displayValue
                                                            )
                                                        }
                                                        isMuted={!isClosing && exitRow.isMuted}
                                                    />
                                                    <DetailRow label="SL" value={slRow.displayValue} isMuted={slRow.isMuted} />
                                                    <DetailRow label="TP" value={tpRow.displayValue} isMuted={tpRow.isMuted} />
                                                </>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="drawer-section">
                            <h4 className="drawer-section-title">Risk/Targets</h4>
                            <div className="drawer-section-body">
                                {(() => {
                                    const slPipsRow = formatRowValue(activeTrade.slPips);
                                    const tpPipsRow = formatRowValue(activeTrade.tpPips);
                                    const rrRow = formatRowValue(activeTrade.rrRatio);
                                    const unitLabel = getDisplayUnit(activeTrade.symbol);
                                    return (
                                        <>
                                            <DetailRow label={`SL ${unitLabel}`} value={slPipsRow.displayValue} isMuted={slPipsRow.isMuted} />
                                            <DetailRow label={`TP ${unitLabel}`} value={tpPipsRow.displayValue} isMuted={tpPipsRow.isMuted} />
                                            <DetailRow label="R/R" value={rrRow.displayValue} isMuted={rrRow.isMuted} />
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="drawer-section">
                            <h4 className="drawer-section-title">Context</h4>
                            <div className="drawer-section-body">
                                {(() => {
                                    const sessionRow = formatRowValue(getSessionLabel(activeTrade.createdAt));
                                    return <DetailRow label="Session" value={sessionRow.displayValue} isMuted={sessionRow.isMuted} />;
                                })()}
                            </div>
                        </div>
                        <div className="drawer-section">
                            <h4 className="drawer-section-title">Close</h4>
                            <div className="drawer-section-body">
                                {isEditing ? (
                                    <>
                                        {isClosed ? (
                                            <>
                                                <DetailRow
                                                    label="Close Reason"
                                                    isEditing
                                                    value={
                                                        <select
                                                            className="input"
                                                            value={editCloseReasonOverride}
                                                            onChange={(e) => {
                                                                const nextReason = e.target.value;
                                                                setEditCloseReasonOverride(nextReason);
                                                                if (nextReason !== "Manual") {
                                                                    setEditManualReason("");
                                                                    setEditManualDescription("");
                                                                }
                                                            }}
                                                        >
                                                            <option value="">None</option>
                                                            <option value="TP">TP</option>
                                                            <option value="SL">SL</option>
                                                            <option value="BreakEven">BreakEven</option>
                                                            <option value="Manual">Manual</option>
                                                        </select>
                                                    }
                                                />
                                                {editCloseReasonOverride === "Manual" && (
                                                    <DetailRow
                                                        label="Manual Reason"
                                                        isEditing
                                                        value={
                                                            <select
                                                                className="input"
                                                                value={editManualReason}
                                                                onChange={(e) => {
                                                                    const nextReason = e.target.value;
                                                                    setEditManualReason(nextReason);
                                                                    if (nextReason !== "Other") {
                                                                        setEditManualDescription("");
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">Select reason</option>
                                                                <option value="News release">News release</option>
                                                                <option value="Market Friday closing">Market Friday closing</option>
                                                                <option value="Other">Other</option>
                                                            </select>
                                                        }
                                                    />
                                                )}
                                                {editCloseReasonOverride === "Manual" && editManualReason === "Other" && (
                                                    <DetailRow
                                                        label="Description"
                                                        isEditing
                                                        value={
                                                            <textarea
                                                                className="input"
                                                                value={editManualDescription}
                                                                onChange={(e) => setEditManualDescription(e.target.value)}
                                                                placeholder="Describe the reason"
                                                                rows={3}
                                                            />
                                                        }
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {(() => {
                                                    const closeRow = formatRowValue(closeReasonValue);
                                                    const descriptionValue = closeReasonValue === "Manual"
                                                        ? (activeTrade.manualDescription || "")
                                                        : "";
                                                    const descriptionRow = formatRowValue(descriptionValue);
                                                    return (
                                                        <>
                                                            <DetailRow label="Close Reason" value={closeRow.displayValue} isMuted={closeRow.isMuted} />
                                                            {closeReasonValue === "Manual" && (
                                                                <DetailRow
                                                                    label="Close Description"
                                                                    value={descriptionRow.displayValue}
                                                                    isMuted={descriptionRow.isMuted}
                                                                />
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {(() => {
                                            const closeRow = formatRowValue(closeReasonValue);
                                            const descriptionValue = closeReasonValue === "Manual"
                                                ? (activeTrade.manualDescription || "")
                                                : "";
                                            const descriptionRow = formatRowValue(descriptionValue);
                                            return (
                                                <>
                                                    {isClosing && !isClosed ? (
                                                        <>
                                                            <DetailRow
                                                                label="Close Reason"
                                                                isEditing
                                                                value={
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
                                                                }
                                                            />
                                                            {closeReasonOverride === "Manual" && (
                                                                <DetailRow
                                                                    label="Manual Reason"
                                                                    isEditing
                                                                    value={
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
                                                                    }
                                                                />
                                                            )}
                                                            {closeReasonOverride === "Manual" && closeManualReason === "Other" && (
                                                                <DetailRow
                                                                    label="Close Description"
                                                                    isEditing
                                                                    value={
                                                                        <textarea
                                                                            className="input"
                                                                            value={closeManualDescription}
                                                                            onChange={(e) => setCloseManualDescription(e.target.value)}
                                                                            placeholder="Describe the close"
                                                                            rows={3}
                                                                        />
                                                                    }
                                                                />
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <DetailRow label="Close Reason" value={closeRow.displayValue} isMuted={closeRow.isMuted} />
                                                            {closeReasonValue === "Manual" && (
                                                                <DetailRow
                                                                    label="Close Description"
                                                                    value={descriptionRow.displayValue}
                                                                    isMuted={descriptionRow.isMuted}
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="drawer-section">
                            <h4 className="drawer-section-title">Time</h4>
                            <div className="drawer-section-body">
                                {isEditing ? (
                                    <>
                                        <DetailRow
                                            label="Created"
                                            isEditing
                                            value={
                                                <input
                                                    className="input"
                                                    value={editCreatedAt}
                                                    onChange={(e) => setEditCreatedAt(e.target.value)}
                                                    type="datetime-local"
                                                />
                                            }
                                        />
                                        {isClosed ? (
                                            <DetailRow
                                                label="Closed"
                                                isEditing
                                                value={
                                                    <input
                                                        className="input"
                                                        value={editClosedAt}
                                                        onChange={(e) => setEditClosedAt(e.target.value)}
                                                        type="datetime-local"
                                                    />
                                                }
                                            />
                                        ) : (
                                            (() => {
                                                const closedRow = formatRowValue(formatDate(activeTrade.closedAt));
                                                return <DetailRow label="Closed" value={closedRow.displayValue} isMuted={closedRow.isMuted} />;
                                            })()
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {(() => {
                                            const createdRow = formatRowValue(formatDate(activeTrade.createdAt));
                                            const closedRow = formatRowValue(formatDate(activeTrade.closedAt));
                                            return (
                                                <>
                                                    <DetailRow label="Created" value={createdRow.displayValue} isMuted={createdRow.isMuted} />
                                                    <DetailRow
                                                        label="Closed"
                                                        isEditing={isClosing && !isClosed}
                                                        value={
                                                            isClosing && !isClosed ? (
                                                                <input
                                                                    className="input"
                                                                    value={closeClosedAt}
                                                                    onChange={(e) => setCloseClosedAt(e.target.value)}
                                                                    type="datetime-local"
                                                                />
                                                            ) : (
                                                                closedRow.displayValue
                                                            )
                                                        }
                                                        isMuted={!isClosing && closedRow.isMuted}
                                                    />
                                                </>
                                            );
                                        })()}
                                    </>
                                )}
                                {(() => {
                                    const durationRow = formatRowValue(
                                        activeTrade.duration ?? formatDuration(activeTrade.createdAt, activeTrade.closedAt)
                                    );
                                    return <DetailRow label="Duration" value={durationRow.displayValue} isMuted={durationRow.isMuted} />;
                                })()}
                            </div>
                        </div>
                        {isClosed && (
                            <div className="drawer-section">
                                <div className="drawer-section-head">
                                    <h4 className="drawer-section-title">Final Note</h4>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm final-note-edit"
                                            onClick={() => onOpenReview?.(activeTrade)}
                                        >
                                            Edit final note
                                        </button>
                                    )}
                                </div>
                                <div className="drawer-section-body">
                                    {(() => {
                                        const followedRow = formatRowValue(formatFollowedPlan(activeTrade.followedPlan));
                                        const mistakesRow = formatRowValue(activeTrade.mistakesText);
                                        const improvementRow = formatRowValue(activeTrade.improvementText);
                                        const confidenceRow = formatRowValue(
                                            Number.isFinite(activeTrade.confidence) ? `${activeTrade.confidence}` : null
                                        );
                                        return (
                                            <>
                                                <DetailRow
                                                    label="Followed plan"
                                                    value={followedRow.displayValue}
                                                    isMuted={followedRow.isMuted}
                                                />
                                                <DetailRow
                                                    label="Mistakes"
                                                    value={mistakesRow.displayValue}
                                                    isMuted={mistakesRow.isMuted}
                                                />
                                                <DetailRow
                                                    label="Do differently"
                                                    value={improvementRow.displayValue}
                                                    isMuted={improvementRow.isMuted}
                                                />
                                                <DetailRow
                                                    label="Confidence"
                                                    value={confidenceRow.displayValue}
                                                    isMuted={confidenceRow.isMuted}
                                                />
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {isEditing && errorMessage && <div className="banner error">{errorMessage}</div>}
                    {isClosing && !isEditing && closeError && <div className="banner error">{closeError}</div>}
                </div>

                <div className="drawer-panel-footer">
                    {!isEditing && !isClosed && isClosing ? (
                        <div className="drawer-panel-actions">
                            <button
                                type="button"
                                className="btn"
                                onClick={() => {
                                    setIsClosing(false);
                                    setCloseError("");
                                    setCloseExitPrice("");
                                    setCloseReasonOverride(activeTrade.closeReasonOverride ?? "");
                                    setCloseManualReason(activeTrade.manualReason ?? "");
                                    setCloseManualDescription(activeTrade.manualDescription ?? "");
                                    setCloseClosedAt(safeToDateTimeLocalValue(new Date()));
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
                                    const closedAtDate = new Date(closeClosedAt);
                                    if (!closeClosedAt || Number.isNaN(closedAtDate.getTime())) {
                                        setCloseError("Closed time is required.");
                                        return;
                                    }
                                    const createdAtDate = new Date(activeTrade.createdAt);
                                    if (Number.isNaN(createdAtDate.getTime())) {
                                        setCloseError("Created time is required.");
                                        return;
                                    }
                                    if (closedAtDate.getTime() < createdAtDate.getTime()) {
                                        setCloseError("Closed time cannot be earlier than Created time.");
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
                                        await onCloseTrade(activeTrade, {
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
                                        onClose();
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
                    ) : (
                        <>
                            <div className="drawer-panel-actions drawer-panel-actions-split">
                                {!isEditing ? (
                                    <>
                                        <button type="button" className="btn" onClick={onStartEdit}>
                                            Edit
                                        </button>
                                        <button type="button" className="btn btn-danger" onClick={onDeleteTrade}>
                                            Delete
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" className="btn" onClick={onCancelEdit}>
                                            Cancel
                                        </button>
                                        <button type="button" className="btn btn-primary" onClick={onSaveEdit}>
                                            Save
                                        </button>
                                    </>
                                )}
                            </div>

                            {!isEditing && !isClosed && (
                                <div className="drawer-panel-actions">
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => {
                                            setCloseClosedAt(safeToDateTimeLocalValue(new Date()));
                                            setCloseExitPrice("");
                                            setCloseReasonOverride("");
                                            setCloseManualReason("");
                                            setCloseManualDescription("");
                                            setCloseError("");
                                            setIsClosing(true);
                                        }}
                                    >
                                        Close trade
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

function TradeDetailsPanelRight({
    trade,
    open,
    onClose,
    formatSymbol,
    onAttach,
    attachmentsBySection,
    onPreview,
    onUpdateTimeframe,
    onRemoveAttachment,
    panelRef: externalPanelRef,
    otherPanelRef,
    isAttachModalOpen,
    isReviewModalOpen,
}) {
    const ANIMATION_MS = 200;
    const [isMobile, setIsMobile] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [renderTrade, setRenderTrade] = useState(trade);
    const [isExpanded, setIsExpanded] = useState(false);
    const internalPanelRef = useRef(null);
    const panelRef = externalPanelRef || internalPanelRef;
    const closeTimeoutRef = useRef(null);

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
        const media = window.matchMedia("(max-width: 900px)");
        const update = () => setIsMobile(media.matches);
        update();
        if (typeof media.addEventListener === "function") {
            media.addEventListener("change", update);
            return () => media.removeEventListener("change", update);
        }
        media.addListener(update);
        return () => media.removeListener(update);
    }, []);

    useEffect(() => {
        if (trade) {
            setRenderTrade(trade);
        }
    }, [trade]);

    useEffect(() => {
        if (!open) {
            setIsExpanded(false);
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
            setShouldRender(true);
            requestAnimationFrame(() => setIsVisible(true));
            return undefined;
        }
        if (shouldRender) {
            setIsVisible(false);
            closeTimeoutRef.current = setTimeout(() => {
                setShouldRender(false);
            }, ANIMATION_MS + 20);
        }
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, [open, shouldRender]);

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

    useEffect(() => {
        if (!isVisible || isMobile) return undefined;
        const handlePointerDown = (event) => {
            if (isAttachModalOpen || isReviewModalOpen) return;
            const panel = panelRef.current;
            if (!panel) return;
            const target = event.target;
            if (panel.contains(target)) return;
            if (target instanceof Element) {
                const withinTable = target.closest(".trade-row, .table, .table-wrap");
                if (withinTable) return;
                if (target.closest(".modal, .lightbox")) return;
            }
            if (otherPanelRef?.current && otherPanelRef.current.contains(target)) return;
            const path = typeof event.composedPath === "function" ? event.composedPath() : [];
            const clickedTable = path.some(
                (node) => node?.classList?.contains?.("table") || node?.classList?.contains?.("table-wrap")
            );
            const clickedRow = path.some((node) => node?.classList?.contains?.("trade-row"));
            if (clickedTable || clickedRow) return;
            onClose();
        };
        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [isVisible, isMobile, onClose, isAttachModalOpen, isReviewModalOpen, otherPanelRef]);

    if (!shouldRender || !renderTrade) return null;

    const formatSymbolSafe = typeof formatSymbol === "function" ? formatSymbol : (value) => value || "-";
    const titleValue = `${formatSymbolSafe(renderTrade.symbol)} \u2022 Screenshots`;
    const sections = [
        { key: "PREPARATION", title: "Preparation" },
        { key: "ENTRY", title: "Entry" },
        { key: "EXIT", title: "Exit" },
    ];

    return (
        <>
            <div
                className={`drawer-backdrop drawer-backdrop-animated${isVisible ? " is-open" : ""}${
                    isMobile ? "" : " drawer-backdrop--passive"
                }`}
                onClick={isMobile ? onClose : undefined}
            />
            <div
                ref={panelRef}
                className={`drawer drawer-right drawer-panel drawer-panel--media drawer-animated${
                    isVisible ? " is-open" : ""
                }${isExpanded ? " is-expanded" : ""}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal={isMobile ? "true" : undefined}
                aria-labelledby="trade-media-title"
                tabIndex={-1}
            >
                <div className="drawer-scroll">
                    <div className="drawer-header">
                        <div className="drawer-title-wrap">
                            <h3 className="drawer-title" id="trade-media-title">
                                {titleValue}
                            </h3>
                        </div>
                        <div className="drawer-header-actions">
                            {!isMobile && (
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    aria-label={isExpanded ? "Collapse media panel" : "Expand media panel"}
                                    onClick={() => setIsExpanded((prev) => !prev)}
                                >
                                    {isExpanded ? "Collapse" : "Expand"}
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm drawer-close"
                                aria-label="Close media panel"
                                onClick={onClose}
                            >
                                {"\u00d7"}
                            </button>
                        </div>
                    </div>
                    <div className="drawer-sections">
                        {sections.map((section) => {
                            const images = attachmentsBySection?.[section.key] || [];
                            return (
                            <div className="drawer-section" key={section.key}>
                                <div className="drawer-section-head">
                                    <h4 className="drawer-section-title">{section.title}</h4>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAttach?.(section.key);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        Attach
                                    </button>
                                </div>
                                <div className="drawer-section-body">
                                    {images.length ? (
                                        <div className="screenshot-stack">
                                            {images.map((image, index) => (
                                                <div className="screenshot-card" key={image.id ?? `${section.key}-${index}`}>
                                                    <button
                                                        type="button"
                                                        className="screenshot-featured"
                                                        aria-label={`${section.title} screenshot ${index + 1}`}
                                                        onClick={() => {
                                                            if (image.imageUrl) {
                                                                onPreview?.(image.imageUrl);
                                                            }
                                                        }}
                                                    >
                                                        {image.timeframe && (
                                                            <span className="screenshot-timeframe">
                                                                {image.timeframe}
                                                            </span>
                                                        )}
                                                        <img src={image.imageUrl} alt={image.originalFilename || ""} />
                                                    </button>
                                                    <div className="screenshot-controls">
                                                        <label className="screenshot-label" htmlFor={`tf-${image.id}`}>
                                                            Timeframe
                                                        </label>
                                                        <select
                                                            id={`tf-${image.id}`}
                                                            className="input input-compact"
                                                            value={image.timeframe ?? ""}
                                                            onChange={(e) => {
                                                                onUpdateTimeframe?.(
                                                                    image.id,
                                                                    e.target.value ? e.target.value : null
                                                                );
                                                            }}
                                                        >
                                                            {TIMEFRAME_OPTIONS.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm screenshot-remove"
                                                            onClick={() => {
                                                                onRemoveAttachment?.(image);
                                                            }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="screenshot-placeholder">
                                            <span>No images yet</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        })}
                    </div>
                </div>
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
    const [editCloseReasonOverride, setEditCloseReasonOverride] = useState("");
    const [editManualReason, setEditManualReason] = useState("");
    const [editManualDescription, setEditManualDescription] = useState("");
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

    function computeOutcomeR(trade) {
        if (!trade?.closedAt) return null;
        if (trade.exitPrice == null) return null;
        const entry = Number(trade.entryPrice);
        const exit = Number(trade.exitPrice);
        if (!Number.isFinite(entry) || !Number.isFinite(exit)) return null;
        if (Math.abs(entry - exit) < 1e-9) return 0;
        if (trade.stopLossPrice == null) return null;
        const stopLoss = Number(trade.stopLossPrice);
        if (!Number.isFinite(stopLoss)) return null;

        const direction = trade.direction?.toUpperCase();
        const risk = direction === "SHORT" ? (stopLoss - entry) : (entry - stopLoss);
        if (!Number.isFinite(risk) || risk <= 0) return null;

        const reward = direction === "SHORT" ? (entry - exit) : (exit - entry);
        const rValue = reward / risk;
        if (!Number.isFinite(rValue)) return null;
        return rValue;
    }

    function formatOutcome(trade) {
        const emDash = "\u2014";
        const rValue = computeOutcomeR(trade);
        if (!Number.isFinite(rValue)) return emDash;
        const sign = rValue > 0 ? "+" : "";
        return `${sign}${rValue.toFixed(2)}R`;
    }

    function getOutcomeClass(trade) {
        const rValue = computeOutcomeR(trade);
        if (!Number.isFinite(rValue)) return "outcome outcome--na";
        if (Math.abs(rValue) < 1e-9) return "outcome outcome--flat";
        return rValue > 0 ? "outcome outcome--win" : "outcome outcome--loss";
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

    const summaryStats = useMemo(() => {
        const outcomes = [];
        let excluded = 0;
        const confidences = [];
        let winCount = 0;
        let lossCount = 0;
        let breakevenCount = 0;
        const epsilon = 1e-9;
        filteredTrades.forEach((trade) => {
            const rValue = computeOutcomeR(trade);
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
    }, [filteredTrades]);

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
        { header: "SL dist", accessorKey: "slPips" },
        { header: "TP dist", accessorKey: "tpPips" },
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
    const formatRValue = (value) => {
        if (!Number.isFinite(value)) return emDash;
        const sign = value > 0 ? "+" : "";
        return `${sign}${value.toFixed(2)}R`;
    };
    const formatWinPct = (value) => {
        if (!Number.isFinite(value)) return emDash;
        const rounded = Math.round(value);
        if (Math.abs(value - rounded) < 0.05) {
            return `${rounded}%`;
        }
        return `${value.toFixed(1)}%`;
    };
    const formatCalcNumber = (value, decimals = 2) => {
        if (!Number.isFinite(value)) return emDash;
        return Number(value).toFixed(decimals);
    };
    const formatCalcInteger = (value) => {
        if (!Number.isFinite(value)) return emDash;
        return Math.round(value).toLocaleString();
    };
    const formatCalcPrice = (value, symbolValue) => {
        if (!Number.isFinite(value)) return emDash;
        const instrument = getInstrument(symbolValue);
        const decimals = instrument?.value === "XAUUSD" ? 2 : (getTickSize(symbolValue) === 0.01 ? 3 : 5);
        return Number(value).toFixed(decimals);
    };
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
                                <div className="card-header-actions">
                                    <button
                                        className="btn btn-sm risk-calc-btn"
                                        type="button"
                                        onClick={openRiskCalc}
                                    >
                                        Risk Calculator
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={createTrade} className="trade-form">
                                <label className="field">
                                    <span>Symbol</span>
                                    <select className="input select-scroll" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                                        {INSTRUMENTS.map((pair) => (
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
                                                SL/TP optional. Enter both to see distances and RR.
                                            </div>
                                        );
                                    }
                                    const derived = computeDerived(symbol, direction, entryPrice, stopLossPrice, takeProfitPrice);
                                    return (
                                        <div className="helper-text">
                                            {derived
                                                ? `SL ${getDisplayUnit(symbol)}: ${derived.slPips} | TP ${getDisplayUnit(symbol)}: ${derived.tpPips} | RR: ${derived.rrRatio}`
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
                                        <span className="summary-label">Trades</span>
                                        <span className="summary-value">{summaryStats.tradeCount}</span>
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
                                        <span className={`summary-value${summaryStats.winCount + summaryStats.lossCount + summaryStats.breakevenCount ? "" : " is-muted"}`}>
                                            {summaryStats.winCount + summaryStats.lossCount + summaryStats.breakevenCount ? (
                                                <>
                                                    <span className="summary-label">Wins</span>{" "}
                                                    <span className="summary-value is-positive">{summaryStats.winCount}</span>
                                                </>
                                            ) : (
                                                emDash
                                            )}
                                        </span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="summary-label">Losses</span>
                                        <span className={`summary-value${summaryStats.lossCount ? " is-negative" : " is-muted"}`}>
                                            {summaryStats.winCount + summaryStats.lossCount + summaryStats.breakevenCount
                                                ? summaryStats.lossCount
                                                : emDash}
                                        </span>
                                    </div>
                                    <div className="summary-stat">
                                        <span className="summary-label">BreakEvens</span>
                                        <span className={`summary-value${summaryStats.breakevenCount ? "" : " is-muted"}`}>
                                            {summaryStats.winCount + summaryStats.lossCount + summaryStats.breakevenCount
                                                ? summaryStats.breakevenCount
                                                : emDash}
                                        </span>
                                    </div>
                                    {summaryStats.excluded > 0 && (
                                        <div className="summary-note">
                                            ({summaryStats.excluded} excluded)
                                        </div>
                                    )}
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
                                        </tr>
                                    )}
                                    </thead>

                                    <tbody>
                                    {sortedTrades.length === 0 ? (
                                        <tr>
                                        <td className="empty" colSpan={8}>No trades yet.</td>
                                    </tr>
                                    ) : (
                                        pagedTrades.map((t) => (
                                            <tr
                                                key={t.id}
                                                className={`trade-row${selectedTradeForDetails?.id === t.id && isDetailsOpen ? " trade-row--selected" : ""}`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={() => openTradeDetails(t)}
                                            >
                                                <>
                                                    <td>{formatSymbol(t.symbol)}</td>
                                                    <td>{t.direction}</td>
                                                    <td>
                                                        {t.closedAt ? (
                                                            <span className="status-pill status-pill--closed">CLOSED</span>
                                                        ) : (
                                                            <span className="status-pill status-pill--open">OPEN</span>
                                                        )}
                                                    </td>
                                                    <td className="num">{t.entryPrice ?? "-"}</td>
                                                    <td className="num">{t.exitPrice ?? "\u2014"}</td>
                                                    <td className="num">
                                                        <span className={getOutcomeClass(t)}>{formatOutcome(t)}</span>
                                                    </td>
                                                    <td>{formatDate(t.createdAt)}</td>
                                                    <td>{formatDate(t.closedAt)}</td>
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
                            <TradeDetailsPanelLeft
                                trade={selectedTradeForDetails}
                                open={isDetailsOpen}
                                onClose={closeTradeDetails}
                                formatDate={formatDate}
                                formatDuration={formatDuration}
                                formatSymbol={formatSymbol}
                                getSessionLabel={getSessionLabel}
                                formatOutcome={formatOutcome}
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
                                errorMessage={error}
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
                                                    step="0.00001"
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
                                                    step="0.00001"
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
                            {isDeleteModalOpen && (
                                <>
                                    <div className="modal-backdrop" onClick={() => setIsDeleteModalOpen(false)} />
                                    <div
                                        className="modal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="delete-trade-title"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <h3 className="modal-title" id="delete-trade-title">Delete trade?</h3>
                                        <p className="modal-text">This action cannot be undone.</p>
                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => setIsDeleteModalOpen(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-danger"
                                                onClick={confirmDeleteTrade}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
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

