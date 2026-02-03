async function parseJsonSafe(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    try {
        return await response.json();
    } catch {
        return null;
    }
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

    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text();
        const error = new Error(`Request failed (${res.status}): ${text}`);
        error.status = res.status;
        error.bodyText = text;
        throw error;
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
