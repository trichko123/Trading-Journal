export default function ReviewModal({
    isOpen,
    onClose,
    onSubmit,
    reviewError,
    reviewFollowedPlan,
    setReviewFollowedPlan,
    reviewMistakesMode,
    setReviewMistakesMode,
    reviewMistakesText,
    setReviewMistakesText,
    reviewImprovementMode,
    setReviewImprovementMode,
    reviewImprovementText,
    setReviewImprovementText,
    reviewConfidence,
    setReviewConfidence,
    isReviewSubmitting,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onClose} />
            <div
                className="modal review-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="review-modal-title"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <h3 className="modal-title" id="review-modal-title">Final Note</h3>
                <p className="modal-text">Capture your post-trade thoughts while they're fresh.</p>
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
                        <span className="review-label">Confidence (1-10)</span>
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
                        onClick={onClose}
                        disabled={isReviewSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onSubmit}
                        disabled={isReviewSubmitting}
                    >
                        {isReviewSubmitting ? "Saving..." : "Submit"}
                    </button>
                </div>
            </div>
        </>
    );
}
