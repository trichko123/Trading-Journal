import { apiGet, apiPut } from "../../../shared/api/http";

export async function getAccountSettings(apiBase, token) {
    try {
        return await apiGet(`${apiBase}/account-settings`, token);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            const error = new Error(`Load account settings failed (${err.status}): ${text}`);
            error.status = err.status;
            error.bodyText = text;
            throw error;
        }
        throw err;
    }
}

export async function updateAccountSettings(apiBase, token, payload) {
    try {
        return await apiPut(`${apiBase}/account-settings`, token, payload);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            const error = new Error(`Save account settings failed (${err.status}): ${text}`);
            error.status = err.status;
            error.bodyText = text;
            throw error;
        }
        throw err;
    }
}
