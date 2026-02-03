import { useEffect, useRef, useState } from "react";

export default function TradeDetailsPanelRight({
    trade,
    open,
    onClose,
    formatSymbol,
    onAttach,
    attachmentsBySection,
    onPreview,
    onUpdateTimeframe,
    onRemoveAttachment,
    timeframeOptions,
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
        if (!trade) return undefined;
        const rafId = requestAnimationFrame(() => setRenderTrade(trade));
        return () => cancelAnimationFrame(rafId);
    }, [trade]);

    useEffect(() => {
        if (open) return undefined;
        const rafId = requestAnimationFrame(() => setIsExpanded(false));
        return () => cancelAnimationFrame(rafId);
    }, [open]);

    useEffect(() => {
        let rafId;
        if (open) {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
            rafId = requestAnimationFrame(() => {
                setShouldRender(true);
                requestAnimationFrame(() => setIsVisible(true));
            });
            return () => {
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }
            };
        }
        if (shouldRender) {
            rafId = requestAnimationFrame(() => setIsVisible(false));
            closeTimeoutRef.current = setTimeout(() => {
                setShouldRender(false);
            }, ANIMATION_MS + 20);
        }
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
            if (rafId) {
                cancelAnimationFrame(rafId);
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
    }, [isVisible, isMobile, onClose, isAttachModalOpen, isReviewModalOpen, otherPanelRef, panelRef]);

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
                                                            {timeframeOptions.map((option) => (
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

