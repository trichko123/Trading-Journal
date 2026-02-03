import { apiDelete, apiGet, apiPatch, apiPostForm } from "../../../shared/api/http";

export async function getAttachmentsForTrade(apiBase, token, tradeId) {
    try {
        return await apiGet(`${apiBase}/trades/${tradeId}/attachments`, token);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            const error = new Error(`Load attachments failed (${err.status}): ${text}`);
            error.status = err.status;
            error.bodyText = text;
            throw error;
        }
        throw err;
    }
}

export async function uploadTradeAttachment(apiBase, token, tradeId, formData) {
    try {
        return await apiPostForm(`${apiBase}/trades/${tradeId}/attachments`, token, formData);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            const error = new Error(`Upload failed (${err.status}): ${text}`);
            error.status = err.status;
            error.bodyText = text;
            throw error;
        }
        throw err;
    }
}

export async function updateAttachment(apiBase, token, attachmentId, payload) {
    try {
        return await apiPatch(`${apiBase}/attachments/${attachmentId}`, token, payload);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            const error = new Error(`Update attachment failed (${err.status}): ${text}`);
            error.status = err.status;
            error.bodyText = text;
            throw error;
        }
        throw err;
    }
}

export async function deleteAttachment(apiBase, token, attachmentId) {
    try {
        return await apiDelete(`${apiBase}/attachments/${attachmentId}`, token);
    } catch (err) {
        if (err?.status) {
            const text = err.bodyText ?? "";
            const error = new Error(`Delete attachment failed (${err.status}): ${text}`);
            error.status = err.status;
            error.bodyText = text;
            throw error;
        }
        throw err;
    }
}
