import { useEffect, useMemo, useRef, useState } from "react";
import { getPriceStep, formatPriceValue } from "../../../shared/lib/price";
import { formatMoneyValue, formatMoneyNullable } from "../../../shared/lib/format";
import DetailRow from "../../../shared/components/DetailRow";
import { INSTRUMENTS, getDisplayUnit } from "../../../constants/instruments";

export default function TradeDetailsPanelLeft({
    trade,
    open,
    onClose,
    formatDate,
    formatDuration,
    formatSymbol,
    getSessionLabel,
    formatOutcome,
    formatRValue,
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
    editNetPnlMoney,
    setEditNetPnlMoney,
    editCommissionMoney,
    setEditCommissionMoney,
    editSwapMoney,
    setEditSwapMoney,
    errorMessage,
    moneySummary,
    strategyMoney,
    realizedMoney,
    statsMode,
    moneyCurrency,
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
    const [closeNetPnl, setCloseNetPnl] = useState("");
    const [closeCommission, setCloseCommission] = useState("");
    const [closeSwap, setCloseSwap] = useState("");
    const [closeNetPnlMode, setCloseNetPnlMode] = useState("net");
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
    const deriveCloseReasonForPrices = ({ symbol, exitPrice, takeProfitPrice, stopLossPrice, entryPrice }) => {
        const exit = Number(exitPrice);
        if (!Number.isFinite(exit)) return "";
        const priceTolerance = Number(getPriceStep(symbol));
        const tp = takeProfitPrice == null ? null : Number(takeProfitPrice);
        const sl = stopLossPrice == null ? null : Number(stopLossPrice);
        const entry = entryPrice == null ? null : Number(entryPrice);

        if (tp != null && Number.isFinite(tp) && Math.abs(exit - tp) <= priceTolerance) return "TP";
        if (sl != null && Number.isFinite(sl) && Math.abs(exit - sl) <= priceTolerance) return "SL";
        if (entry != null && Number.isFinite(entry) && Math.abs(exit - entry) <= priceTolerance) return "BreakEven";
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
        setCloseNetPnl(trade.netPnlMoney != null ? String(trade.netPnlMoney) : "");
        setCloseCommission(trade.commissionMoney != null ? String(trade.commissionMoney) : "");
        setCloseSwap(trade.swapMoney != null ? String(trade.swapMoney) : "");
        setCloseNetPnlMode("net");
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
    const formatMoneyRow = (value) => {
        const displayValue = formatMoneyNullable(value, moneyCurrency);
        return { displayValue, isMuted: displayValue === emDash };
    };
    const formatCommissionRow = (value) => {
        const displayValue = formatMoneyNullable(value, moneyCurrency, { forceNegative: true });
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
    const pnlValue = moneySummary?.pnlMoney;
    const balanceAfterValue = moneySummary?.balanceAfter;
    const hasMoneyValues = Number.isFinite(pnlValue) && Number.isFinite(balanceAfterValue);
    const pnlDisplay = hasMoneyValues ? formatMoneyValue(pnlValue, moneyCurrency) : emDash;
    const balanceDisplay = hasMoneyValues ? formatMoneyValue(balanceAfterValue, moneyCurrency) : emDash;
    const isBrokerMode = statsMode === "realized";
    const isEstimated = isBrokerMode && realizedMoney && realizedMoney.isRealizedCovered === false;
    const strategyPnl = strategyMoney?.pnlMoney;
    const brokerPnl = realizedMoney?.pnlMoney;
    const hasStrategyPnl = Number.isFinite(strategyPnl);
    const hasBrokerPnl = Number.isFinite(brokerPnl);
    const deltaPnl = hasBrokerPnl && hasStrategyPnl ? brokerPnl - strategyPnl : null;
    const deltaToneClass = Number.isFinite(deltaPnl)
        ? deltaPnl > 0
            ? " is-positive"
            : deltaPnl < 0
                ? " is-negative"
                : ""
        : " is-muted";
    const planRiskAmount = strategyMoney?.riskAmount;
    const brokerRiskAmount = realizedMoney?.riskAmount;
    const planR = hasStrategyPnl && Number.isFinite(planRiskAmount) && planRiskAmount !== 0
        ? strategyPnl / planRiskAmount
        : null;
    const brokerR = hasBrokerPnl && Number.isFinite(brokerRiskAmount) && brokerRiskAmount !== 0
        ? brokerPnl / brokerRiskAmount
        : null;
    const deltaR = Number.isFinite(planR) && Number.isFinite(brokerR) ? brokerR - planR : null;
    const deltaRToneClass = Number.isFinite(deltaR)
        ? deltaR > 0
            ? " is-positive"
            : deltaR < 0
                ? " is-negative"
                : ""
        : " is-muted";
    const hasBrokerNet = activeTrade?.netPnlMoney !== null && activeTrade?.netPnlMoney !== undefined;

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
                            <h4 className="drawer-section-title">
                                {isBrokerMode ? (
                                    <span className="inline-tag-wrap">
                                        <span>Performance (Broker)</span>
                                        {isEstimated && <span className="inline-tag">Estimated</span>}
                                    </span>
                                ) : "Performance"}
                            </h4>
                            <div className="drawer-section-body">
                                <DetailRow
                                    label={isBrokerMode ? "P/L (Broker)" : "P/L (Plan)"}
                                    value={pnlDisplay}
                                    isMuted={!hasMoneyValues}
                                />
                                <DetailRow
                                    label={isBrokerMode ? "Balance after (Broker)" : "Balance after (Plan)"}
                                    value={balanceDisplay}
                                    isMuted={!hasMoneyValues}
                                />
                            </div>
                        </div>
                        {isBrokerMode && (
                            <div className="drawer-section">
                                <h4 className="drawer-section-title">Broker</h4>
                                <div className="drawer-section-body">
                                    {isEditing ? (
                                        isClosed ? (
                                            <>
                                                <DetailRow
                                                    label="Net P/L (after commission & swap)"
                                                    isEditing
                                                    value={
                                                        <div className="input-stack">
                                                            <input
                                                                className="input"
                                                                type="number"
                                                                step="0.01"
                                                                value={editNetPnlMoney}
                                                                onChange={(e) => setEditNetPnlMoney(e.target.value)}
                                                                placeholder="Optional"
                                                            />
                                                            <span className="input-helper">
                                                                Used in Broker mode. Leave blank to keep using the Plan estimate.
                                                            </span>
                                                        </div>
                                                    }
                                                />
                                                <DetailRow
                                                    label="Commission (cost)"
                                                    isEditing
                                                    value={
                                                        <input
                                                            className="input"
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={editCommissionMoney}
                                                            onChange={(e) => setEditCommissionMoney(e.target.value)}
                                                            placeholder="Optional"
                                                        />
                                                    }
                                                />
                                                <DetailRow
                                                    label="Swap"
                                                    isEditing
                                                    value={
                                                        <input
                                                            className="input"
                                                            type="number"
                                                            step="0.01"
                                                            value={editSwapMoney}
                                                            onChange={(e) => setEditSwapMoney(e.target.value)}
                                                            placeholder="Optional"
                                                        />
                                                    }
                                                />
                                            </>
                                        ) : (
                                            <div className="drawer-note">
                                                Broker P/L can be added after the trade is closed.
                                            </div>
                                        )
                                    ) : (
                                        (() => {
                                            const netRow = formatMoneyRow(activeTrade.netPnlMoney);
                                            const commissionRow = formatCommissionRow(activeTrade.commissionMoney);
                                            const swapRow = formatMoneyRow(activeTrade.swapMoney);
                                            return (
                                                <>
                                                    <DetailRow label="Net P/L (Broker)" value={netRow.displayValue} isMuted={netRow.isMuted} />
                                                    <DetailRow label="Commission (cost)" value={commissionRow.displayValue} isMuted={commissionRow.isMuted} />
                                                    <DetailRow label="Swap" value={swapRow.displayValue} isMuted={swapRow.isMuted} />
                                                </>
                                            );
                                        })()
                                    )}
                                </div>
                            </div>
                        )}
                        {!isBrokerMode && hasBrokerNet && (
                            <div className="drawer-section">
                                <h4 className="drawer-section-title">Broker vs Plan (comparison)</h4>
                                <div className="drawer-section-body">
                                    <DetailRow
                                        label="Broker P/L (Net)"
                                        value={formatMoneyNullable(brokerPnl, moneyCurrency)}
                                        isMuted={!hasBrokerPnl}
                                    />
                                    <DetailRow
                                        label="Δ $ (Broker − Plan)"
                                        value={
                                            <span className={`summary-value${deltaToneClass}`}>
                                                {formatMoneyNullable(deltaPnl, moneyCurrency)}
                                            </span>
                                        }
                                        isMuted={!Number.isFinite(deltaPnl)}
                                    />
                                    <DetailRow
                                        label="Δ R (Broker − Plan)"
                                        value={
                                            <span className={`summary-value${deltaRToneClass}`}>
                                                {Number.isFinite(deltaR) ? formatRValue(deltaR) : emDash}
                                            </span>
                                        }
                                        isMuted={!Number.isFinite(deltaR)}
                                    />
                                    <div className="drawer-note">Broker data entered.</div>
                                </div>
                            </div>
                        )}
                        {isBrokerMode && (
                            <div className="drawer-section">
                                <h4 className="drawer-section-title">Plan (comparison)</h4>
                                <div className="drawer-section-body">
                                    <DetailRow
                                        label="Plan P/L"
                                        value={formatMoneyNullable(strategyPnl, moneyCurrency)}
                                        isMuted={!hasStrategyPnl}
                                    />
                                    <DetailRow
                                        label="Δ $ (Broker − Plan)"
                                        value={
                                            <span className={`summary-value${deltaToneClass}`}>
                                                {formatMoneyNullable(deltaPnl, moneyCurrency)}
                                            </span>
                                        }
                                        isMuted={!Number.isFinite(deltaPnl)}
                                    />
                                    <DetailRow
                                        label="Δ R (Broker − Plan)"
                                        value={
                                            <span className={`summary-value${deltaRToneClass}`}>
                                                {Number.isFinite(deltaR) ? formatRValue(deltaR) : emDash}
                                            </span>
                                        }
                                        isMuted={!Number.isFinite(deltaR)}
                                    />
                                </div>
                            </div>
                        )}
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
                                                    step={getPriceStep(editSymbol)}
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
                                                        step={getPriceStep(editSymbol)}
                                                        min="0"
                                                    />
                                                }
                                            />
                                        ) : (
                                            (() => {
                                                const exitRow = formatRowValue(
                                                    isClosed ? formatPriceValue(activeTrade.exitPrice, activeTrade.symbol) : null
                                                );
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
                                                    step={getPriceStep(editSymbol)}
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
                                                    step={getPriceStep(editSymbol)}
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
                                            const entryRow = formatRowValue(formatPriceValue(activeTrade.entryPrice, activeTrade.symbol));
                                            const exitRow = formatRowValue(
                                                isClosed ? formatPriceValue(activeTrade.exitPrice, activeTrade.symbol) : null
                                            );
                                            const slRow = formatRowValue(formatPriceValue(activeTrade.stopLossPrice, activeTrade.symbol));
                                            const tpRow = formatRowValue(formatPriceValue(activeTrade.takeProfitPrice, activeTrade.symbol));
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
                                                                    step={getPriceStep(activeTrade.symbol)}
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
                                                            <DetailRow
                                                                label="Net P/L (after commission & swap)"
                                                                isEditing
                                                                value={
                                                                    <div className="input-stack">
                                                                        <div className="input-inline">
                                                                            <input
                                                                                className="input"
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={closeNetPnl}
                                                                                onChange={(e) => setCloseNetPnl(e.target.value)}
                                                                                placeholder="Optional"
                                                                            />
                                                                            <select
                                                                                className="input input-compact input-inline-select"
                                                                                value={closeNetPnlMode}
                                                                                onChange={(e) => setCloseNetPnlMode(e.target.value)}
                                                                                aria-label="Net P/L input meaning"
                                                                            >
                                                                                <option value="net">Final Net (recommended)</option>
                                                                                <option value="gross">Gross Profit (auto-net)</option>
                                                                            </select>
                                                                        </div>
                                                                        <span className="input-helper">
                                                                            Used in Broker mode. Leave blank to use estimated Plan results.
                                                                        </span>
                                                                    </div>
                                                                }
                                                            />
                                                            <DetailRow
                                                                label="Commission (cost)"
                                                                isEditing
                                                                value={
                                                                    <input
                                                                        className="input"
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        value={closeCommission}
                                                                        onChange={(e) => setCloseCommission(e.target.value)}
                                                                        placeholder="Optional"
                                                                    />
                                                                }
                                                            />
                                                            <DetailRow
                                                                label="Swap"
                                                                isEditing
                                                                value={
                                                                    <input
                                                                        className="input"
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={closeSwap}
                                                                        onChange={(e) => setCloseSwap(e.target.value)}
                                                                        placeholder="Optional"
                                                                    />
                                                                }
                                                            />
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
                                    setCloseNetPnl(activeTrade.netPnlMoney != null ? String(activeTrade.netPnlMoney) : "");
                                    setCloseCommission(activeTrade.commissionMoney != null ? String(activeTrade.commissionMoney) : "");
                                    setCloseSwap(activeTrade.swapMoney != null ? String(activeTrade.swapMoney) : "");
                                    setCloseNetPnlMode("net");
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
                                    const netPnlNumber = closeNetPnl === "" ? null : Number(closeNetPnl);
                                    if (closeNetPnl !== "" && !Number.isFinite(netPnlNumber)) {
                                        setCloseError("Net P/L must be a valid number.");
                                        return;
                                    }
                                    const commissionNumber = closeCommission === "" ? null : Number(closeCommission);
                                    if (closeCommission !== "" && (!Number.isFinite(commissionNumber) || commissionNumber < 0)) {
                                        setCloseError("Commission must be a valid non-negative number.");
                                        return;
                                    }
                                    const swapNumber = closeSwap === "" ? null : Number(closeSwap);
                                    if (closeSwap !== "" && !Number.isFinite(swapNumber)) {
                                        setCloseError("Swap must be a valid number.");
                                        return;
                                    }
                                    let effectiveNetPnl = netPnlNumber;
                                    if (closeNetPnlMode === "gross" && netPnlNumber != null) {
                                        const commissionValue = commissionNumber ?? 0;
                                        const swapValue = swapNumber ?? 0;
                                        effectiveNetPnl = netPnlNumber + swapValue - commissionValue;
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
                                            netPnlMoney: effectiveNetPnl,
                                            commissionMoney: commissionNumber,
                                            swapMoney: swapNumber,
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
                                            setCloseNetPnl("");
                                            setCloseCommission("");
                                            setCloseSwap("");
                                            setCloseNetPnlMode("net");
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

