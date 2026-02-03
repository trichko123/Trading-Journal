import { GoogleLogin } from "@react-oauth/google";

export default function AuthCard({
    authMode,
    setAuthMode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    setError,
    onLogin,
    onRegister,
    googleClientId,
    onGoogleSuccess,
    onGoogleError,
}) {
    return (
        <div className="card auth-card">
            {error && (
                <div className="banner error">
                    {error}
                </div>
            )}
            <div className="auth-toggle">
                <button
                    type="button"
                    className={`btn btn-sm ${authMode === "login" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                        setAuthMode("login");
                        setConfirmPassword("");
                        setError("");
                    }}
                >
                    Login
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${authMode === "register" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                        setAuthMode("register");
                        setConfirmPassword("");
                        setError("");
                    }}
                >
                    Register
                </button>
            </div>
            <form onSubmit={authMode === "register" ? onRegister : onLogin} className="auth-form">
                <h3>{authMode === "register" ? "Register" : "Login"}</h3>
                <label className="field">
                    <span>Email</span>
                    <input
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        autoComplete="email"
                    />
                </label>
                <label className="field">
                    <span>Password</span>
                    <input
                        className="input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        type="password"
                        autoComplete={authMode === "register" ? "new-password" : "current-password"}
                    />
                </label>
                {authMode === "register" && (
                    <label className="field">
                        <span>Confirm password</span>
                        <input
                            className="input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm password"
                            type="password"
                            autoComplete="new-password"
                        />
                    </label>
                )}
                <button className="btn btn-primary" type="submit">
                    {authMode === "register" ? "Create account" : "Login"}
                </button>
                <>
                    <div className="auth-divider">
                        <span>or</span>
                    </div>
                    <div className="google-signin">
                        {googleClientId ? (
                            <GoogleLogin
                                onSuccess={onGoogleSuccess}
                                onError={onGoogleError}
                                text="continue_with"
                                shape="rectangular"
                                width="360"
                            />
                        ) : (
                            <span className="auth-warning">
                                Google login not configured (missing VITE_GOOGLE_CLIENT_ID)
                            </span>
                        )}
                    </div>
                </>
            </form>
        </div>
    );
}
