export default function RiskCalculatorModal({
    isOpen,
    onClose,
    riskCalcAccountCurrency,
    setRiskCalcAccountCurrency,
    riskCalcBalance,
    setRiskCalcBalance,
    riskCalcRiskPercent,
    setRiskCalcRiskPercent,
    riskCalcSymbol,
    setRiskCalcSymbol,
    riskCalcEntryPrice,
    setRiskCalcEntryPrice,
    riskCalcStopLossPrice,
    setRiskCalcStopLossPrice,
    riskCalcContractSize,
    setRiskCalcContractSize,
    riskCalcConversionRate,
    setRiskCalcConversionRate,
    isRiskCalcXau,
    riskCalcContractSizeValid,
    riskCalcResult,
    conversionPairLabel,
    conversionHelper,
    accountCurrencies,
    instruments,
    getPriceStep,
    getDisplayUnit,
    formatCalcNumber,
    formatCalcInteger,
    formatCalcPrice,
    copiedKey,
    handleCopy,
    emDash,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onClose} />
            <div
                className="modal risk-calc-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="risk-calc-title"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title" id="risk-calc-title">Position Size Calculator</h3>
                        <p className="modal-text">Estimate units and lots from your risk settings.</p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm modal-close"
                        aria-label="Close risk calculator"
                        onClick={onClose}
                    >
                        {"\u00d7"}
                    </button>
                </div>
                <div className="risk-calc-grid">
                    <label className="field">
                        <span>Account currency</span>
                        <select
                            className="input"
                            value={riskCalcAccountCurrency}
                            onChange={(e) => setRiskCalcAccountCurrency(e.target.value)}
                        >
                            {accountCurrencies.map((currency) => (
                                <option key={currency} value={currency}>
                                    {currency}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="field">
                        <span>Account balance</span>
                        <input
                            className="input"
                            value={riskCalcBalance}
                            onChange={(e) => setRiskCalcBalance(e.target.value)}
                            placeholder="0.00"
                            type="number"
                            min="0"
                            step="0.01"
                        />
                    </label>
                    <label className="field">
                        <span>Risk %</span>
                        <input
                            className="input"
                            value={riskCalcRiskPercent}
                            onChange={(e) => setRiskCalcRiskPercent(e.target.value)}
                            placeholder="1.0"
                            type="number"
                            min="0"
                            step="0.1"
                        />
                    </label>
                    <label className="field">
                        <span>Symbol</span>
                        <select
                            className="input select-scroll"
                            value={riskCalcSymbol}
                            onChange={(e) => setRiskCalcSymbol(e.target.value)}
                        >
                            {instruments.map((pair) => (
                                <option key={pair.value} value={pair.value}>
                                    {pair.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="field">
                        <span>Entry price</span>
                        <input
                            className="input"
                            value={riskCalcEntryPrice}
                            onChange={(e) => setRiskCalcEntryPrice(e.target.value)}
                            placeholder="Entry"
                            type="number"
                            min="0"
                            step={getPriceStep(riskCalcSymbol)}
                        />
                    </label>
                    <label className="field">
                        <span>Stop loss price</span>
                        <input
                            className="input"
                            value={riskCalcStopLossPrice}
                            onChange={(e) => setRiskCalcStopLossPrice(e.target.value)}
                            placeholder="Stop loss"
                            type="number"
                            min="0"
                            step={getPriceStep(riskCalcSymbol)}
                        />
                    </label>
                    {isRiskCalcXau && (
                        <label className="field risk-calc-full">
                            <span>Contract size (Units per lot)</span>
                            <input
                                className="input"
                                value={riskCalcContractSize}
                                onChange={(e) => setRiskCalcContractSize(e.target.value)}
                                placeholder="100"
                                type="number"
                                min="0"
                                step="0.01"
                            />
                            <span className="risk-calc-helper">Usually 100 - check with your broker</span>
                            {!riskCalcContractSizeValid && (
                                <span className="risk-calc-error">Enter a valid contract size.</span>
                            )}
                        </label>
                    )}
                    {riskCalcResult.needsConversion && (
                        <label className="field risk-calc-full">
                            <span>Conversion rate</span>
                            <input
                                className="input"
                                value={riskCalcConversionRate}
                                onChange={(e) => setRiskCalcConversionRate(e.target.value)}
                                placeholder={conversionPairLabel || "Conversion rate"}
                                type="number"
                                min="0"
                                step="0.00001"
                            />
                            {conversionHelper && (
                                <span className="risk-calc-helper">{conversionHelper}</span>
                            )}
                            {riskCalcResult.baseValid && !riskCalcResult.conversionRateValid && (
                                <span className="risk-calc-error">
                                    Enter a valid {conversionPairLabel || "conversion rate"}.
                                </span>
                            )}
                        </label>
                    )}
                </div>
                <div className="risk-calc-outputs">
                    <div className="risk-calc-output-row">
                        <span>Amount at risk</span>
                        <span className={`risk-calc-output-value${riskCalcResult.baseValid ? "" : " is-muted"}`}>
                            {riskCalcResult.baseValid
                                ? `${riskCalcAccountCurrency} ${formatCalcNumber(riskCalcResult.riskAmount, 2)}`
                                : emDash}
                        </span>
                    </div>
                    <div className="risk-calc-output-row">
                        <span>Stop loss distance</span>
                        <span className={`risk-calc-output-value${riskCalcResult.baseValid ? "" : " is-muted"}`}>
                            {riskCalcResult.baseValid
                                ? `${formatCalcNumber(riskCalcResult.slPips, 1)} ${getDisplayUnit(riskCalcSymbol)}`
                                : emDash}
                        </span>
                    </div>
                    <div className="risk-calc-output-row">
                        <span>Position size (units)</span>
                        <span className="risk-calc-output-value-wrap">
                            {copiedKey === "units" && <span className="copy-confirm">Copied</span>}
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm copy-btn"
                                aria-label="Copy position size"
                                onClick={() => handleCopy("units", formatCalcInteger(riskCalcResult.units))}
                                disabled={riskCalcResult.units == null}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <rect x="9" y="9" width="10" height="10" rx="2" />
                                    <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                                </svg>
                            </button>
                            <span className={`risk-calc-output-value${riskCalcResult.units != null ? "" : " is-muted"}`}>
                                {riskCalcResult.units != null ? formatCalcInteger(riskCalcResult.units) : emDash}
                            </span>
                        </span>
                    </div>
                    <div className="risk-calc-output-row">
                        <span>Standard lots</span>
                        <span className="risk-calc-output-value-wrap">
                            {copiedKey === "lots" && <span className="copy-confirm">Copied</span>}
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm copy-btn"
                                aria-label="Copy standard lots"
                                onClick={() => handleCopy("lots", formatCalcNumber(riskCalcResult.lots, 2))}
                                disabled={riskCalcResult.lots == null}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <rect x="9" y="9" width="10" height="10" rx="2" />
                                    <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                                </svg>
                            </button>
                            <span className={`risk-calc-output-value${riskCalcResult.lots != null ? "" : " is-muted"}`}>
                                {riskCalcResult.lots != null ? formatCalcNumber(riskCalcResult.lots, 2) : emDash}
                            </span>
                        </span>
                    </div>
                    <div className="risk-calc-output-row">
                        <span>2R target</span>
                        <span className="risk-calc-output-value-wrap">
                            {copiedKey === "target2R" && <span className="copy-confirm">Copied</span>}
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm copy-btn"
                                aria-label="Copy 2R target"
                                onClick={() => handleCopy("target2R", formatCalcPrice(riskCalcResult.target2R, riskCalcSymbol))}
                                disabled={!riskCalcResult.baseValid}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <rect x="9" y="9" width="10" height="10" rx="2" />
                                    <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                                </svg>
                            </button>
                            <span className={`risk-calc-output-value${riskCalcResult.baseValid ? "" : " is-muted"}`}>
                                {riskCalcResult.baseValid
                                    ? formatCalcPrice(riskCalcResult.target2R, riskCalcSymbol)
                                    : emDash}
                            </span>
                        </span>
                    </div>
                    <div className="risk-calc-output-row">
                        <span>3R target</span>
                        <span className="risk-calc-output-value-wrap">
                            {copiedKey === "target3R" && <span className="copy-confirm">Copied</span>}
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm copy-btn"
                                aria-label="Copy 3R target"
                                onClick={() => handleCopy("target3R", formatCalcPrice(riskCalcResult.target3R, riskCalcSymbol))}
                                disabled={!riskCalcResult.baseValid}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <rect x="9" y="9" width="10" height="10" rx="2" />
                                    <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                                </svg>
                            </button>
                            <span className={`risk-calc-output-value${riskCalcResult.baseValid ? "" : " is-muted"}`}>
                                {riskCalcResult.baseValid
                                    ? formatCalcPrice(riskCalcResult.target3R, riskCalcSymbol)
                                    : emDash}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}
