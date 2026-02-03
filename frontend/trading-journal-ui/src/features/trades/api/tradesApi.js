import { apiGet } from "../../../shared/api/http";

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
