export default function AttachmentLightbox({
    isOpen,
    src,
    alt,
    onClose,
    lightboxScale,
    lightboxOffset,
    lightboxDragging,
    lightboxDragStart,
    setLightboxOffset,
    setLightboxDragging,
    setLightboxDragStart,
    setLightboxScale,
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onClose} />
            <div
                className="lightbox"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                onMouseMove={(e) => {
                    if (!lightboxDragging || lightboxScale <= 1) return;
                    const nextX = e.clientX - lightboxDragStart.x;
                    const nextY = e.clientY - lightboxDragStart.y;
                    setLightboxOffset({ x: nextX, y: nextY });
                }}
                onMouseUp={() => setLightboxDragging(false)}
                onMouseLeave={() => setLightboxDragging(false)}
            >
                <button
                    type="button"
                    className="btn btn-ghost btn-sm lightbox-close"
                    aria-label="Close preview"
                    onClick={onClose}
                >
                    {"\u00d7"}
                </button>
                <img
                    src={src}
                    alt={alt}
                    className={`lightbox-image${lightboxScale > 1 ? " is-zoomed" : ""}${
                        lightboxDragging ? " is-dragging" : ""
                    }`}
                    style={{
                        transform: `translate(${lightboxOffset.x}px, ${lightboxOffset.y}px) scale(${lightboxScale})`,
                        transformOrigin: "center center",
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (lightboxScale > 1) {
                            setLightboxScale(1);
                            setLightboxOffset({ x: 0, y: 0 });
                            setLightboxDragging(false);
                            return;
                        }
                        setLightboxScale(2);
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        if (lightboxScale <= 1) return;
                        setLightboxDragging(true);
                        setLightboxDragStart({
                            x: e.clientX - lightboxOffset.x,
                            y: e.clientY - lightboxOffset.y,
                        });
                    }}
                />
                <p className="lightbox-hint">Click to zoom • Drag to move</p>
            </div>
        </>
    );
}
