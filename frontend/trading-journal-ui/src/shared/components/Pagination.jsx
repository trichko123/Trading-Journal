export default function Pagination({
    currentPage,
    totalPages,
    paginationItems,
    onPrev,
    onNext,
    onGoToPage,
}) {
    if (totalPages <= 1) return null;

    return (
        <div className="pagination">
            <button
                className="btn btn-sm pagination-btn"
                onClick={onPrev}
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
                            onClick={() => onGoToPage(item)}
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
                onClick={onNext}
                disabled={currentPage === totalPages || totalPages === 0}
                type="button"
            >
                Next
            </button>
        </div>
    );
}
