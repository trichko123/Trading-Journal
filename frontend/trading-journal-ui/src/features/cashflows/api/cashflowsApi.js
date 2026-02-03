import { apiDelete, apiGet, apiPost, apiPut } from "../../../shared/api/http";

export async function getCashflows(apiBase, token) {
    try {
        return await apiGet(`${apiBase}/cashflows`, token);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            const error = new Error(`Load cashflows failed (${err.status}): ${text}`);
            error.status = err.status;
            error.bodyText = text;
            throw error;
        }
        throw err;
    }
}

export async function createCashflow(apiBase, token, payload) {
    try {
        return await apiPost(`${apiBase}/cashflows`, token, payload);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            const error = new Error(`Create cashflow failed (${err.status}): ${text}`);
            error.status = err.status;
            error.bodyText = text;
            throw error;
        }
        throw err;
    }
}

export async function updateCashflow(apiBase, token, cashflowId, payload) {
    try {
        return await apiPut(`${apiBase}/cashflows/${cashflowId}`, token, payload);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            const error = new Error(`Update cashflow failed (${err.status}): ${text}`);
            error.status = err.status;
            error.bodyText = text;
            throw error;
        }
        throw err;
    }
}

export async function deleteCashflow(apiBase, token, cashflowId) {
    try {
        return await apiDelete(`${apiBase}/cashflows/${cashflowId}`, token);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            const error = new Error(`Delete cashflow failed (${err.status}): ${text}`);
            error.status = err.status;
            error.bodyText = text;
            throw error;
        }
        throw err;
    }
}
