import { useState } from "react";

export default function useUIState() {
    const [selectedTradeForDetails, setSelectedTradeForDetails] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewTradeId, setReviewTradeId] = useState(null);
    const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
    const [isCashflowsOpen, setIsCashflowsOpen] = useState(false);
    const [isCashflowEditOpen, setIsCashflowEditOpen] = useState(false);
    const [cashflowEditId, setCashflowEditId] = useState(null);
    const [isCashflowDeleteOpen, setIsCashflowDeleteOpen] = useState(false);
    const [cashflowDeleteTarget, setCashflowDeleteTarget] = useState(null);
    const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
    const [attachTradeId, setAttachTradeId] = useState(null);
    const [isAttachmentDeleteModalOpen, setIsAttachmentDeleteModalOpen] = useState(false);
    const [attachmentToDelete, setAttachmentToDelete] = useState(null);
    const [lightboxUrl, setLightboxUrl] = useState("");
    const [isRiskCalcOpen, setIsRiskCalcOpen] = useState(false);

    return {
        selectedTradeForDetails,
        setSelectedTradeForDetails,
        isDetailsOpen,
        setIsDetailsOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isReviewModalOpen,
        setIsReviewModalOpen,
        reviewTradeId,
        setReviewTradeId,
        isAccountSettingsOpen,
        setIsAccountSettingsOpen,
        isCashflowsOpen,
        setIsCashflowsOpen,
        isCashflowEditOpen,
        setIsCashflowEditOpen,
        cashflowEditId,
        setCashflowEditId,
        isCashflowDeleteOpen,
        setIsCashflowDeleteOpen,
        cashflowDeleteTarget,
        setCashflowDeleteTarget,
        isAttachModalOpen,
        setIsAttachModalOpen,
        attachTradeId,
        setAttachTradeId,
        isAttachmentDeleteModalOpen,
        setIsAttachmentDeleteModalOpen,
        attachmentToDelete,
        setAttachmentToDelete,
        lightboxUrl,
        setLightboxUrl,
        isRiskCalcOpen,
        setIsRiskCalcOpen,
    };
}
