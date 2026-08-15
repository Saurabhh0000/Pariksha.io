import { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import "./Toast.css";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle size={22} strokeWidth={2.2} />,
    error: <XCircle size={22} strokeWidth={2.2} />,
    warning: <AlertTriangle size={22} strokeWidth={2.2} />,
    info: <Info size={22} strokeWidth={2.2} />,
  };

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{icons[type]}</span>

      <span className="toast-message">{message}</span>

      <button className="toast-close" onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
}
