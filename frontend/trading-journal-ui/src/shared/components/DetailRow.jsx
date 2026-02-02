export default function DetailRow({ label, value, isMuted = false, isEditing = false }) {
    return (
        <div className="drawer-detail-row">
            <span className="drawer-detail-label">{label}</span>
            <span className={`drawer-detail-value${isMuted ? " is-muted" : ""}${isEditing ? " is-editing" : ""}`}>
                {value}
            </span>
        </div>
    );
}
