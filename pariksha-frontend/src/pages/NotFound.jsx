import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, ArrowLeft, BookOpen, SearchX } from "lucide-react";
import "./NotFound.css";

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const goHome = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    switch (role) {
      case "ROLE_ADMIN":
        navigate("/admin/dashboard");
        break;
      case "ROLE_TEACHER":
        navigate("/teacher/dashboard");
        break;
      case "ROLE_STUDENT":
        navigate("/student/dashboard");
        break;
      default:
        navigate("/login");
    }
  };

  return (
    <div className="nf-root">
      {/* Floating Background */}
      <div className="nf-blob nf-blob-1" />
      <div className="nf-blob nf-blob-2" />
      <div className="nf-blob nf-blob-3" />

      {/* Huge Watermark */}
      <div className="nf-watermark">404</div>

      <div className="nf-card">
        {/* Brand */}
        <div className="nf-brand">
          <div className="nf-brand-logo">
            <BookOpen size={22} color="#1D9E75" />
          </div>
          <span className="nf-brand-name">Pariksha.io</span>
        </div>

        {/* Illustration */}
        <div className="nf-illustration">
          <div className="nf-circle nf-circle-outer" />
          <div className="nf-circle nf-circle-inner" />

          <div className="nf-icon-wrap">
            <SearchX size={52} color="#1D9E75" strokeWidth={1.5} />
          </div>
        </div>

        {/* Error Code */}
        <div className="nf-code">
          <span className="nf-code-4">4</span>
          <span className="nf-code-0">0</span>
          <span className="nf-code-4">4</span>
        </div>

        {/* Content */}
        <h1 className="nf-title">Page Not Found</h1>

        <p className="nf-sub">
          The page you're looking for doesn't exist, may have been moved, or the
          URL might be incorrect.
        </p>

        {/* Actions */}
        <div className="nf-actions">
          <button type="button" className="nf-btn-primary" onClick={goHome}>
            <Home size={18} />
            Go to Dashboard
          </button>

          <button
            type="button"
            className="nf-btn-secondary"
            onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>

        <p className="nf-tag">
          Error 404 • Requested resource could not be found
        </p>
      </div>
    </div>
  );
}
