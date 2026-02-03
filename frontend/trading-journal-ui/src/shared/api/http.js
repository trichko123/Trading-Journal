export class ApiError extends Error {
    constructor({ status, code, error, userMessage, details }) {
        super(userMessage);
        this.name = "ApiError";
        this.status = status;
        this.code = code || null;
        this.error = error || null;
        this.userMessage = userMessage;
        this.details = details;
    }
}

// TEMP DEBUG: remove after fix
const DEBUG_HTTP_LOOP = import.meta.env.VITE_DEBUG_HTTP_LOOP === "1";
const HTTP_LOOP_WINDOW_MS = 2000;
const HTTP_LOOP_MAX = 20;
const HTTP_LOOP_STACK_LIMIT = 3;
const HTTP_LOOP_LOG_EVERY = 50;
const httpLoopState = new Map();

function getPathKey(url) {
    try {
        const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
        return new URL(url, base).pathname;
    } catch {
        return String(url);
    }
}

function guardHttpLoop(url) {
    if (!DEBUG_HTTP_LOOP || typeof window === "undefined") return true;
    const path = getPathKey(url);
    const now = Date.now();
    const state = httpLoopState.get(path) || {
        windowStart: now,
        count: 0,
        stacks: [],
        tripped: false,
        warned: false,
    };
    if (now - state.windowStart > HTTP_LOOP_WINDOW_MS) {
        state.windowStart = now;
        state.count = 0;
        state.tripped = false;
    }
    state.count += 1;
    if (state.count <= HTTP_LOOP_STACK_LIMIT) {
        state.stacks.push({
            at: now,
            stack: new Error(`HTTP loop stack: ${path}`).stack,
        });
        window.__httpLoopStacks = window.__httpLoopStacks || {};
        window.__httpLoopStacks[path] = state.stacks;
    } else if (state.count % HTTP_LOOP_LOG_EVERY === 0) {
        console.info(`[http-loop] ${path} count=${state.count}`);
    }
    if (!state.tripped && state.count > HTTP_LOOP_MAX) {
        state.tripped = true;
        if (!state.warned) {
            state.warned = true;
            console.error(`HTTP LOOP FUSE TRIPPED for ${path}. Run window.__httpLoopStacks`);
        }
        httpLoopState.set(path, state);
        return false;
    }
    httpLoopState.set(path, state);
    return true;
}

function isShortMessage(message) {
    if (!message) return false;
    const trimmed = String(message).trim();
    return trimmed.length > 0 && trimmed.length <= 120 && !/\r|\n/.test(trimmed);
}

function extractMessage(details) {
    if (!details) return "";
    if (typeof details === "string") return details.trim();
    if (typeof details === "object") {
        return (
            details.message
            || details.error
            || details.detail
            || details.title
            || ""
        );
    }
    return "";
}

function mapStatusToUserMessage(status, details) {
    if (status >= 500) return "Server error. Try again later.";
    if (status === 400) {
        const message = extractMessage(details);
        return isShortMessage(message) ? message : "Invalid request.";
    }
    if (status === 401) return "Wrong email or password.";
    if (status === 403) return "You don’t have permission. Please sign in again.";
    if (status === 404) return "Not found.";
    if (status === 409) return "This email is already registered.";
    if (status === 413) return "File too large. Max 10MB.";
    if (status === 415) return "Unsupported file type.";
    if (status === 429) return "Too many requests. Try again soon.";
    return "Something went wrong. Please try again.";
}

async function parseJsonSafe(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    try {
        return await response.json();
    } catch {
        return null;
    }
}

async function parseErrorBody(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }
    try {
        const text = await response.text();
        return text ? text : null;
    } catch {
        return null;
    }
}

export async function buildApiError(response) {
    const details = await parseErrorBody(response);
    const message = extractMessage(details);
    const code = typeof details === "object" ? (details.code || details.errorCode || null) : null;
    const error = typeof details === "object" ? (details.error || details.code || null) : null;
    const userMessage = mapStatusToUserMessage(response.status, details);
    return new ApiError({
        status: response.status,
        code,
        error,
        userMessage,
        details: details || (message ? { message } : null),
    });
}

export function getUserMessage(err) {
    if (err instanceof ApiError) return err.userMessage;
    if (err instanceof TypeError && /Failed to fetch|NetworkError/i.test(err.message)) {
        return "Can’t reach the server. Is the backend running and CORS configured?";
    }
    return "Something went wrong. Please try again.";
}

async function apiRequest(method, url, token, body) {
    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const options = { method, headers };
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    if (!guardHttpLoop(url)) {
        throw new Error("HTTP loop guard tripped");
    }
    const res = await fetch(url, options);
    if (!res.ok) {
        throw await buildApiError(res);
    }
    return parseJsonSafe(res);
}

export async function apiGet(url, token) {
    return apiRequest("GET", url, token);
}

export async function apiPost(url, token, body) {
    return apiRequest("POST", url, token, body);
}

export async function apiPut(url, token, body) {
    return apiRequest("PUT", url, token, body);
}

export async function apiPatch(url, token, body) {
    return apiRequest("PATCH", url, token, body);
}

export async function apiDelete(url, token) {
    return apiRequest("DELETE", url, token);
}

export async function apiPostForm(url, token, formData) {
    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (!guardHttpLoop(url)) {
        throw new Error("HTTP loop guard tripped");
    }
    const res = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
    });
    if (!res.ok) {
        throw await buildApiError(res);
    }
    return parseJsonSafe(res);
}
