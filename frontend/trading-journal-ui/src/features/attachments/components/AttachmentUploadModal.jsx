export default function AttachmentUploadModal({
    isOpen,
    onClose,
    attachSection,
    isAttachmentDragOver,
    onDrop,
    onDragOver,
    onDragLeave,
    attachPreviewUrl,
    attachmentInputRef,
    onPickFile,
    onFileChange,
    attachError,
    onReplace,
    onConfirm,
    isUploadingAttachment,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onClose} />
            <div
                className="modal attach-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="attach-modal-title"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <h3 className="modal-title" id="attach-modal-title">
                    Attach screenshot{attachSection ? ` (${attachSection.toLowerCase()})` : ""}
                </h3>
                <div
                    className={`attach-dropzone${isAttachmentDragOver ? " is-dragover" : ""}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                >
                    {attachPreviewUrl ? (
                        <img src={attachPreviewUrl} alt="Attachment preview" />
                    ) : (
                        <div className="attach-dropzone-content">
                            <p>Drop an image here</p>
                            <p>Paste from clipboard (Ctrl+V)</p>
                            <p>or choose from PC</p>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={onPickFile}
                            >
                                Attach from PC
                            </button>
                        </div>
                    )}
                    <input
                        ref={attachmentInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="attach-file-input"
                        onChange={onFileChange}
                    />
                </div>
                {attachError && <p className="attach-error">{attachError}</p>}
                {attachPreviewUrl && (
                    <div className="modal-actions attach-actions">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={onReplace}
                            disabled={isUploadingAttachment}
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={onClose}
                            disabled={isUploadingAttachment}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={onConfirm}
                            disabled={isUploadingAttachment}
                        >
                            {isUploadingAttachment ? "Uploading\u2026" : "Confirm"}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
