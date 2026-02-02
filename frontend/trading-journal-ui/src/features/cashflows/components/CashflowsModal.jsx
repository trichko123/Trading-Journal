export default function CashflowsModal({
    isOpen,
    onClose,
    cashflows,
    cashflowError,
    cashflowType,
    setCashflowType,
    cashflowAmount,
    setCashflowAmount,
    cashflowOccurredAt,
    setCashflowOccurredAt,
    cashflowNote,
    setCashflowNote,
    onCreateCashflow,
    isCashflowSaving,
    cashflowTypes,
    formatCashflowTypeLabel,
    formatCashflowAmount,
    formatDate,
    onOpenEdit,
    onOpenDelete,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onClose} />
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
                        onClick={onClose}
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
                                {cashflowTypes.map((option) => (
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
                            onClick={onClose}
                            disabled={isCashflowSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={onCreateCashflow}
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
                                                onClick={() => onOpenEdit(cashflow)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => onOpenDelete(cashflow)}
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
    );
}
