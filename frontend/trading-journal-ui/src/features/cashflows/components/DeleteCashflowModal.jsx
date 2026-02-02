export default function DeleteCashflowModal({
    isOpen,
    onClose,
    onConfirm,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div
                className="modal-backdrop"
                onClick={onClose}
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
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={onConfirm}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </>
    );
}
