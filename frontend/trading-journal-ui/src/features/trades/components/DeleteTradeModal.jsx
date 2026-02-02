export default function DeleteTradeModal({
    isOpen,
    onCancel,
    onConfirm,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onCancel} />
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
                        onClick={onCancel}
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
