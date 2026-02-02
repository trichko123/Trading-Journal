export default function TradesTable({
    trades,
    totalCount,
    tableColSpan,
    statsMode,
    selectedTradeId,
    isDetailsOpen,
    onOpenDetails,
    formatSymbol,
    formatPriceValue,
    formatOutcome,
    getOutcomeClass,
    isNetPnlPresent,
    formatMoneyNullable,
    moneyCurrency,
    formatDate,
    filtersHeader,
}) {
    return (
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
                    {statsMode === "realized" && <th className="num">Net P/L (Broker)</th>}
                    <th>Created</th>
                    <th>Closed date</th>
                </tr>
                {filtersHeader}
                </thead>

                <tbody>
                {totalCount === 0 ? (
                    <tr>
                    <td className="empty" colSpan={tableColSpan}>No trades yet.</td>
                </tr>
                ) : (
                    trades.map((t) => (
                        <tr
                            key={t.id}
                            className={`trade-row${selectedTradeId === t.id && isDetailsOpen ? " trade-row--selected" : ""}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => onOpenDetails(t)}
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
                                <td className="num">{formatPriceValue(t.entryPrice, t.symbol) ?? "-"}</td>
                                <td className="num">
                                    {t.closedAt ? (formatPriceValue(t.exitPrice, t.symbol) ?? "\u2014") : "\u2014"}
                                </td>
                                <td className="num">
                                    <span className={getOutcomeClass(t)}>{formatOutcome(t)}</span>
                                </td>
                                {statsMode === "realized" && (
                                    <td className="num">
                                        {(() => {
                                            const hasNet = isNetPnlPresent(t);
                                            const netValue = hasNet ? Number(t.netPnlMoney) : null;
                                            const display = formatMoneyNullable(netValue, moneyCurrency);
                                            const toneClass = hasNet
                                                ? netValue > 0
                                                    ? " is-positive"
                                                    : netValue < 0
                                                        ? " is-negative"
                                                        : ""
                                                : " is-muted";
                                            return (
                                                <span className={`summary-value${toneClass}`}>
                                                    {display}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                )}
                                <td>{formatDate(t.createdAt)}</td>
                                <td>{formatDate(t.closedAt)}</td>
                            </>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </div>
    );
}
