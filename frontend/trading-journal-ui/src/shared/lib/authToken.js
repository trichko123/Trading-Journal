export function normalizeEmail(value) {
    return value.trim().toLowerCase();
}

export function base64UrlDecode(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + (4 - (value.length % 4)) % 4, "=");
    return atob(padded);
}

export function tryExtractEmailFromIdToken(idToken) {
    try {
        const payload = idToken.split(".")[1];
        if (!payload) return null;
        const json = base64UrlDecode(payload);
        const data = JSON.parse(json);
        return typeof data.email === "string" ? data.email : null;
    } catch {
        return null;
    }
}
