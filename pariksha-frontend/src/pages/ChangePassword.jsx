import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import Toast from "../components/shared/Toast";
import Spinner from "../components/shared/Spinner";
import "./ChangePassword.css";

// Password strength rules
const RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p) => p.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter (A–Z)",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lower",
    label: "One lowercase letter (a–z)",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "number",
    label: "One number (0–9)",
    test: (p) => /[0-9]/.test(p),
  },
];

// Calculate strength 0-4
function getStrength(password) {
  return RULES.filter((r) => r.test(password)).length;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["", "#E53E3E", "#D69E2E", "#38A169", "#1D9E75"];

export default function ChangePassword() {
  const navigate = useNavigate();
  const { role, completeFirstLogin, logout } = useAuth();

  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  const strength = getStrength(newPass);
  const matchOk = newPass && confirm && newPass === confirm;
  const allRulesMet = strength === RULES.length;

  // ────────────────────────────────────────
  //   SUBMIT
  // ────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();

    if (!current.trim()) {
      setToast({
        type: "warning",
        message: "Please enter your current password.",
      });
      return;
    }
    if (!allRulesMet) {
      setToast({
        type: "warning",
        message: "New password does not meet all requirements.",
      });
      return;
    }
    if (newPass !== confirm) {
      setToast({
        type: "error",
        message: "Passwords do not match. Please try again.",
      });
      return;
    }
    if (current === newPass) {
      setToast({
        type: "warning",
        message: "New password must be different from current password.",
      });
      return;
    }

    setLoading(true);

    try {
      await authService.changePassword({
        currentPassword: current,
        newPassword: newPass,
        confirmPassword: confirm,
      });

      setToast({
        type: "success",
        message: "Password changed successfully! Redirecting...",
      });

      // Mark first login complete
      completeFirstLogin();

      setTimeout(() => {
        if (role === "ROLE_ADMIN") navigate("/admin/dashboard");
        else if (role === "ROLE_TEACHER") navigate("/teacher/dashboard");
        else if (role === "ROLE_STUDENT") navigate("/student/dashboard");
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message;
      setToast({
        type: "error",
        message: msg || "Failed to change password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  // ────────────────────────────────────────
  //   RENDER
  // ────────────────────────────────────────

  return (
    <div className={`cp-root${mounted ? " cp-mounted" : ""}`}>
      {/* Global Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Left panel ── */}
      <div className="cp-left">
        <div className="cp-left-blob cp-left-blob-1" />
        <div className="cp-left-blob cp-left-blob-2" />

        {/* Brand */}
        <div className="cp-brand">
          <div className="cp-brand-logo">
            <BookOpen size={30} color="#fff" strokeWidth={1.8} />
          </div>
          <span className="cp-brand-name">Pariksha.io</span>
        </div>

        {/* Center content */}
        <div className="cp-left-center">
          <div className="cp-left-icon">
            <ShieldCheck size={52} color="#9FE1CB" strokeWidth={1.5} />
          </div>
          <h2 className="cp-left-title">
            Secure Your
            <br />
            Account
          </h2>
          <p className="cp-left-sub">
            You're required to set a new password before accessing your
            dashboard. Choose a strong password to keep your account safe.
          </p>

          {/* Tips */}
          <div className="cp-tips">
            <p className="cp-tips-label">Password Tips</p>
            {RULES.map((r) => (
              <div key={r.id} className="cp-tip">
                <CheckCircle size={14} strokeWidth={2.2} />
                <span>{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="cp-left-footer">
          © {new Date().getFullYear()} Pariksha.io
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="cp-right">
        <div className="cp-right-circle cp-right-circle-1" />
        <div className="cp-right-circle cp-right-circle-2" />

        <div className="cp-card">
          {/* Card top accent */}
          <div className="cp-card-accent" />

          {/* Header */}
          <div className="cp-card-header">
            <div className="cp-card-header-icon">
              <KeyRound size={22} color="#1D9E75" strokeWidth={2} />
            </div>
            <div>
              <h2 className="cp-card-title">Change Password</h2>
              <p className="cp-card-sub">
                Set a new secure password for your account
              </p>
            </div>
          </div>

          {/* First login notice */}
          <div className="cp-notice">
            <AlertCircle size={16} strokeWidth={2} className="cp-notice-icon" />
            <p>
              This is your <strong>first login</strong>. You must change your
              default password to continue.
            </p>
          </div>

          {/* Form */}
          <form className="cp-form" onSubmit={handleSubmit} noValidate>
            {/* Current password */}
            <div className="cp-field">
              <label className="cp-label">
                <Lock size={13} strokeWidth={2} />
                Current Password
              </label>
              <div className="cp-input-wrap">
                <Lock size={16} className="cp-input-icon" strokeWidth={1.8} />
                <input
                  type={showCurrent ? "text" : "password"}
                  className="cp-input"
                  placeholder="Enter current password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="cp-eye"
                  onClick={() => setShowCurrent((p) => !p)}
                  tabIndex={-1}>
                  {showCurrent ? (
                    <EyeOff size={16} strokeWidth={1.8} />
                  ) : (
                    <Eye size={16} strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="cp-field">
              <label className="cp-label">
                <Lock size={13} strokeWidth={2} />
                New Password
              </label>
              <div
                className={`cp-input-wrap${newPass ? " cp-input-active" : ""}`}>
                <Lock size={16} className="cp-input-icon" strokeWidth={1.8} />
                <input
                  type={showNew ? "text" : "password"}
                  className="cp-input"
                  placeholder="Enter new password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="cp-eye"
                  onClick={() => setShowNew((p) => !p)}
                  tabIndex={-1}>
                  {showNew ? (
                    <EyeOff size={16} strokeWidth={1.8} />
                  ) : (
                    <Eye size={16} strokeWidth={1.8} />
                  )}
                </button>
              </div>

              {/* Strength bar */}
              {newPass && (
                <div className="cp-strength">
                  <div className="cp-strength-bar">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="cp-strength-seg"
                        style={{
                          background:
                            level <= strength
                              ? STRENGTH_COLORS[strength]
                              : "#E5E7EB",
                          transition: "background 0.3s",
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="cp-strength-label"
                    style={{ color: STRENGTH_COLORS[strength] }}>
                    {STRENGTH_LABELS[strength]}
                  </span>
                </div>
              )}

              {/* Rules checklist */}
              {newPass && (
                <div className="cp-rules">
                  {RULES.map((r) => {
                    const ok = r.test(newPass);
                    return (
                      <div
                        key={r.id}
                        className={`cp-rule${ok ? " cp-rule-ok" : ""}`}>
                        <CheckCircle size={13} strokeWidth={2.5} />
                        <span>{r.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="cp-field">
              <label className="cp-label">
                <Lock size={13} strokeWidth={2} />
                Confirm New Password
              </label>
              <div
                className={`cp-input-wrap
                ${confirm && matchOk ? " cp-input-match" : ""}
                ${confirm && !matchOk ? " cp-input-nomatch" : ""}
              `}>
                <Lock size={16} className="cp-input-icon" strokeWidth={1.8} />
                <input
                  type={showConfirm ? "text" : "password"}
                  className="cp-input"
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="cp-eye"
                  onClick={() => setShowConfirm((p) => !p)}
                  tabIndex={-1}>
                  {showConfirm ? (
                    <EyeOff size={16} strokeWidth={1.8} />
                  ) : (
                    <Eye size={16} strokeWidth={1.8} />
                  )}
                </button>
                {/* Match indicator */}
                {confirm && (
                  <span className="cp-match-icon">
                    {matchOk ? (
                      <CheckCircle
                        size={16}
                        color="#1D9E75"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <AlertCircle
                        size={16}
                        color="#E53E3E"
                        strokeWidth={2.5}
                      />
                    )}
                  </span>
                )}
              </div>
              {confirm && !matchOk && (
                <p className="cp-nomatch-msg">Passwords do not match</p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" className="cp-btn" disabled={loading}>
              {loading ? (
                <Spinner size="small" color="#ffffff" />
              ) : (
                <>
                  <ShieldCheck size={18} strokeWidth={2} />
                  <span>Change Password</span>
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          {/* Logout link */}
          <button
            className="cp-logout"
            onClick={() => {
              logout();
              navigate("/login");
            }}>
            Sign out and go back to login
          </button>
        </div>
      </div>
    </div>
  );
}
