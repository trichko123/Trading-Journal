export default function FiltersPanel({
    variant,
    showFilters,
    onToggleFilters,
    onClearFilters,
    datePreset,
    fromDate,
    toDate,
    onChangeFromDate,
    onChangeToDate,
    symbolFilter,
    directionFilter,
    statusFilter,
    onChangeSymbol,
    onChangeDirection,
    onChangeStatus,
    onChangeDatePreset,
    symbolOptions,
    formatSymbol,
    showBrokerColumns,
}) {
    if (variant === "headerButtons") {
        return (
            <div className="table-header-filters">
                <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={onToggleFilters}
                >
                    {showFilters ? "Hide filters" : "Show filters"}
                </button>
                {showFilters && (
                    <button className="btn btn-ghost btn-sm" type="button" onClick={onClearFilters}>
                        Clear filters
                    </button>
                )}
            </div>
        );
    }

    if (variant === "filterBar") {
        return (
            <div className="filter-bar">
                <div className="filter-actions">
                    {showFilters && datePreset === "custom" && (
                        <div className="filter-range">
                            <label className="filter-field">
                                <span>Closed: From</span>
                                <input
                                    className="input filter-input"
                                    type="date"
                                    value={fromDate}
                                    onChange={onChangeFromDate}
                                />
                            </label>
                            <label className="filter-field">
                                <span>Closed: To</span>
                                <input
                                    className="input filter-input"
                                    type="date"
                                    value={toDate}
                                    onChange={onChangeToDate}
                                />
                            </label>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (variant === "tableRows") {
        return (
            <>
                {showFilters && (
                    <tr className="filter-row">
                        <th>
                            <select
                                className="input filter-input"
                                value={symbolFilter}
                                onChange={onChangeSymbol}
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
                                value={directionFilter}
                                onChange={onChangeDirection}
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
                                value={statusFilter}
                                onChange={onChangeStatus}
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
                        {showBrokerColumns && <th />}
                        <th />
                        <th>
                            <select
                                className="input filter-input"
                                value={datePreset}
                                onChange={onChangeDatePreset}
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
                {showFilters && (
                    <tr className="filter-row">
                        <th />
                        <th />
                        <th />
                        <th />
                        <th />
                        <th />
                        {showBrokerColumns && <th />}
                        <th />
                    </tr>
                )}
            </>
        );
    }

    return null;
}
