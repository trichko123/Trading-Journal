import { getDisplayUnit } from "../../../constants/instruments";
import { getPriceStep } from "../../../shared/lib/price";

export default function AddTradeForm({
    instruments,
    symbol,
    setSymbol,
    direction,
    setDirection,
    entryPrice,
    setEntryPrice,
    stopLossPrice,
    setStopLossPrice,
    takeProfitPrice,
    setTakeProfitPrice,
    onSubmit,
    onOpenRiskCalc,
    computeDerived,
}) {
    return (
        <div className="card">
            <div className="card-header">
                <div>
                    <h2>Add Trade</h2>
                    <p className="subtitle">Fill in entry details. SL/TP are optional until you close the trade.</p>
                </div>
                <div className="card-header-actions">
                    <button
                        className="btn btn-sm risk-calc-btn"
                        type="button"
                        onClick={onOpenRiskCalc}
                    >
                        Risk Calculator
                    </button>
                </div>
            </div>
            <form onSubmit={onSubmit} className="trade-form">
                <label className="field">
                    <span>Symbol</span>
                    <select className="input select-scroll" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                        {instruments.map((pair) => (
                            <option key={pair.value} value={pair.value}>
                                {pair.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span>Direction</span>
                    <select className="input" value={direction} onChange={(e) => setDirection(e.target.value)}>
                        <option value="LONG">LONG</option>
                        <option value="SHORT">SHORT</option>
                    </select>
                </label>
                <label className="field">
                    <span>Entry</span>
                    <input
                        className="input"
                        value={entryPrice}
                        onChange={(e) => setEntryPrice(e.target.value)}
                        placeholder="Entry price"
                        type="number"
                        step={getPriceStep(symbol)}
                        min="0"
                    />
                </label>
                <label className="field">
                    <span>Stop Loss</span>
                    <input
                        className="input"
                        value={stopLossPrice}
                        onChange={(e) => setStopLossPrice(e.target.value)}
                        placeholder="Stop loss"
                        type="number"
                        step={getPriceStep(symbol)}
                        min="0"
                    />
                </label>
                <label className="field">
                    <span>Take Profit</span>
                    <input
                        className="input"
                        value={takeProfitPrice}
                        onChange={(e) => setTakeProfitPrice(e.target.value)}
                        placeholder="Take profit"
                        type="number"
                        step={getPriceStep(symbol)}
                        min="0"
                    />
                </label>
                <div className="field">
                    <span>&nbsp;</span>
                    <button className="btn btn-primary" type="submit">Add trade</button>
                </div>
            </form>

            {(() => {
                if (stopLossPrice === "" || takeProfitPrice === "") {
                    return (
                        <div className="helper-text">
                            SL/TP optional. Enter both to see distances and RR.
                        </div>
                    );
                }
                const derived = computeDerived(symbol, direction, entryPrice, stopLossPrice, takeProfitPrice);
                return (
                    <div className="helper-text">
                        {derived
                            ? `SL ${getDisplayUnit(symbol)}: ${derived.slPips} | TP ${getDisplayUnit(symbol)}: ${derived.tpPips} | RR: ${derived.rrRatio}`
                            : "Entry, Stop Loss, and Take Profit must be valid and ordered correctly."}
                    </div>
                );
            })()}
        </div>
    );
}
