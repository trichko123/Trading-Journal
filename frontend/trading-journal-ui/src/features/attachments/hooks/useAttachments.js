import { useCallback, useEffect, useState } from "react";

const EMPTY_SECTIONS = { PREPARATION: [], ENTRY: [], EXIT: [] };

export default function useAttachments({
    token,
    apiBase,
    apiRoot,
    selectedTradeId,
    isDetailsOpen,
    onError,
}) {
    const [attachments, setAttachments] = useState([]);
    const [attachmentsBySection, setAttachmentsBySection] = useState(EMPTY_SECTIONS);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [attachmentsError, setAttachmentsError] = useState("");

    const resetAttachments = useCallback(() => {
        setAttachments([]);
        setAttachmentsBySection(EMPTY_SECTIONS);
    }, []);

    const loadAttachments = useCallback(async (tradeId) => {
        if (!tradeId) return;
        setAttachmentsLoading(true);
        setAttachmentsError("");
        try {
            const res = await fetch(`${apiBase}/trades/${tradeId}/attachments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Load attachments failed (${res.status}): ${txt}`);
            }
            const data = await res.json();
            const next = { PREPARATION: [], ENTRY: [], EXIT: [] };
            data.forEach((item) => {
                if (!item?.section) return;
                const imageUrl = item.imageUrl?.startsWith("/")
                    ? `${apiRoot}${item.imageUrl}`
                    : item.imageUrl;
                if (!next[item.section]) next[item.section] = [];
                next[item.section].push({ ...item, imageUrl });
            });
            setAttachments(Array.isArray(data) ? data : []);
            setAttachmentsBySection(next);
        } catch (err) {
            const message = String(err);
            setAttachmentsError(message);
            if (onError) onError(message);
            resetAttachments();
        } finally {
            setAttachmentsLoading(false);
        }
    }, [apiBase, apiRoot, onError, resetAttachments, token]);

    const reloadAttachments = useCallback(() => {
        if (!selectedTradeId) return;
        loadAttachments(selectedTradeId);
    }, [loadAttachments, selectedTradeId]);

    useEffect(() => {
        if (!isDetailsOpen || !selectedTradeId) {
            resetAttachments();
            return;
        }
        loadAttachments(selectedTradeId);
    }, [isDetailsOpen, selectedTradeId, loadAttachments, resetAttachments]);

    return {
        attachments,
        setAttachments,
        attachmentsBySection,
        setAttachmentsBySection,
        attachmentsLoading,
        attachmentsError,
        resetAttachments,
        reloadAttachments,
    };
}
