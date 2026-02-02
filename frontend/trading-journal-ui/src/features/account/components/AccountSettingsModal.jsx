export default function AccountSettingsModal({
    isOpen,
    onClose,
    onSave,
    accountSettingsError,
    accountSettingsBalance,
    setAccountSettingsBalance,
    accountSettingsRiskPercent,
    setAccountSettingsRiskPercent,
    accountSettingsCurrency,
    setAccountSettingsCurrency,
    accountCurrencies,
    isAccountSettingsSaving,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onClose} />
            <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-settings-title"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title" id="account-settings-title">Account Settings</h3>
                        <p className="modal-text">Set your starting balance and default risk per trade.</p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm modal-close"
                        aria-label="Close account settings"
                        onClick={onClose}
                    >
                        {"\u00d7"}
                    </button>
                </div>
                {accountSettingsError && (
                    <div className="banner error">
                        {accountSettingsError}
                    </div>
                )}
                <div className="risk-calc-grid">
                    <label className="field">
                        <span>Starting balance</span>
                        <input
                            className="input"
                            value={accountSettingsBalance}
                            onChange={(e) => setAccountSettingsBalance(e.target.value)}
                            placeholder="0.00"
                            type="number"
                            min="0"
                            step="0.01"
                        />
                    </label>
                    <label className="field">
                        <span>Risk % per trade</span>
                        <input
                            className="input"
                            value={accountSettingsRiskPercent}
                            onChange={(e) => setAccountSettingsRiskPercent(e.target.value)}
                            placeholder="1.0"
                            type="number"
                            min="0"
                            step="0.01"
                        />
                    </label>
                    <label className="field">
                        <span>Currency (optional)</span>
                        <select
                            className="input"
                            value={accountSettingsCurrency}
                            onChange={(e) => setAccountSettingsCurrency(e.target.value)}
                        >
                            <option value="">\u2014</option>
                            {accountCurrencies.map((currency) => (
                                <option key={currency} value={currency}>
                                    {currency}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onClose}
                        disabled={isAccountSettingsSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onSave}
                        disabled={isAccountSettingsSaving}
                    >
                        {isAccountSettingsSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </>
    );
}
