export default function CashflowEditModal({
    isOpen,
    onClose,
    onSave,
    cashflowEditError,
    cashflowEditType,
    setCashflowEditType,
    cashflowEditAmount,
    setCashflowEditAmount,
    cashflowEditOccurredAt,
    setCashflowEditOccurredAt,
    cashflowEditNote,
    setCashflowEditNote,
    cashflowTypes,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onClose} />
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
                        onClick={onClose}
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
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={onSave}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
