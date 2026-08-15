import { X } from "lucide-react";
import "./Modal.css";

export default function Modal({ title, children, onClose, size = "medium" }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-box modal-${size}`}
        onClick={(e) => e.stopPropagation()}>
        {/* ── Header — stays pinned ── */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Body — scrolls independently ── */}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
