import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../../../shared/api/http";

export async function getTrades(apiBase, token) {
    try {
        const data = await apiGet(`${apiBase}/trades`, token);
        return data;
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            throw new Error(`Load trades failed (${err.status}): ${text}`);
        }
        throw err;
    }
}

export async function createTrade(apiBase, token, payload) {
    try {
        return await apiPost(`${apiBase}/trades`, token, payload);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            throw new Error(`Create trade failed (${err.status}): ${text}`);
        }
        throw err;
    }
}

export async function updateTrade(apiBase, token, tradeId, payload) {
    try {
        return await apiPut(`${apiBase}/trades/${tradeId}`, token, payload);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            throw new Error(`Update trade failed (${err.status}): ${text}`);
        }
        throw err;
    }
}

export async function deleteTrade(apiBase, token, tradeId) {
    try {
        return await apiDelete(`${apiBase}/trades/${tradeId}`, token);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            throw new Error(`Delete trade failed (${err.status}): ${text}`);
        }
        throw err;
    }
}

export async function submitTradeReview(apiBase, token, tradeId, payload) {
    try {
        return await apiPatch(`${apiBase}/trades/${tradeId}/review`, token, payload);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            throw new Error(`Update review failed (${err.status}): ${text}`);
        }
        throw err;
    }
}
