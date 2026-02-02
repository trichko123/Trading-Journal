export default function HeaderBar({
    title,
    subtitle,
    isAuthenticated,
    userEmail,
    balanceLabel,
    balanceValue,
    onRefresh,
    refreshDisabled,
    refreshTitle,
    accountMenuRef,
    accountMenuButtonRef,
    isAccountMenuOpen,
    onToggleAccountMenu,
    onOpenAccountSettings,
    onOpenCashflows,
    onLogout,
}) {
    return (
        <div className="card header-card">
            <div>
                <h1 className="title">{title}</h1>
                <p className="subtitle">{subtitle}</p>
            </div>
            {isAuthenticated ? (
                <div className="header-actions">
                    <div className="user-chip">
                        <span className="user-label">Signed in</span>
                        <span className="user-email">{userEmail}</span>
                    </div>
                    <div
                        className="user-chip"
                        title="Based on closed trades only (no floating P/L)."
                    >
                        <span className="user-label">
                            {balanceLabel}
                        </span>
                        <span className="user-email">
                            {balanceValue}
                        </span>
                    </div>
                    <div className="actions">
                        <button
                            className="btn"
                            onClick={onRefresh}
                            disabled={refreshDisabled}
                            title={refreshTitle}
                        >
                            Refresh
                        </button>
                        <div className="account-menu" ref={accountMenuRef}>
                            <button
                                className="btn btn-ghost"
                                type="button"
                                ref={accountMenuButtonRef}
                                aria-haspopup="menu"
                                aria-expanded={isAccountMenuOpen}
                                onClick={onToggleAccountMenu}
                            >
                                Account v
                            </button>
                            {isAccountMenuOpen && (
                                <div className="account-dropdown" role="menu">
                                    <button
                                        className="account-item"
                                        type="button"
                                        onClick={onOpenAccountSettings}
                                    >
                                        Account Settings
                                    </button>
                                    <button
                                        className="account-item"
                                        type="button"
                                        onClick={onOpenCashflows}
                                    >
                                        Cashflows
                                    </button>
                                    <div className="account-divider" />
                                    <button
                                        className="account-item"
                                        type="button"
                                        onClick={onLogout}
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
