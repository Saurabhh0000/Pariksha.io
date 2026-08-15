import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  BookOpen,
  Sparkles,
  BarChart2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import Toast from "../components/shared/Toast";
import "./Login.css";

// ── Trust indicators shown on left panel ──
const TRUST = [
  {
    icon: ShieldCheck,
    color: "#9FE1CB",
    bg: "rgba(159,225,203,0.18)",
    title: "Role-Based Access",
    desc: "Admin, Teacher & Student portals with scoped permissions",
  },
  {
    icon: Sparkles,
    color: "#93C5FD",
    bg: "rgba(147,197,253,0.18)",
    title: "Gemini AI Engine",
    desc: "Auto-generate question papers tailored to curriculum",
  },
  {
    icon: BarChart2,
    color: "#FCD34D",
    bg: "rgba(252,211,77,0.18)",
    title: "Live Analytics",
    desc: "Real-time dashboards for every stakeholder",
  },
  {
    icon: Lock,
    color: "#FCA5A5",
    bg: "rgba(252,165,165,0.18)",
    title: "Secure & Private",
    desc: "Institution data protected with audit-ready logs",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Page mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // ────────────────────────────────────────
  //   SUBMIT
  // ────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email.trim()) {
      setToast({ type: "warning", msg: "Please enter your email address." });
      return;
    }
    if (!password.trim()) {
      setToast({ type: "warning", msg: "Please enter your password." });
      return;
    }

    setLoading(true);

    try {
      const res = await authService.login({ email, password });
      const data = res.data.data;

      login(data);

      if (data.role === "ROLE_STUDENT" && data.status === "PENDING") {
        setToast({
          type: "warning",
          msg: "Your account is waiting for admin approval.",
        });

        setTimeout(() => {
          navigate("/pending-approval");
        }, 1200);

        return;
      }

      setToast({ type: "success", msg: "Login successful! Redirecting..." });

      setTimeout(() => {
        if (data.firstLogin) {
          navigate("/change-password");
          return;
        }
        if (data.role === "ROLE_ADMIN") navigate("/admin/dashboard");
        else if (data.role === "ROLE_TEACHER") navigate("/teacher/dashboard");
        else if (data.role === "ROLE_STUDENT") navigate("/student/dashboard");
      }, 900);
    } catch (err) {
      const msg = err.response?.data?.message;
      setToast({
        type: "error",
        msg: msg || "Invalid email or password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  // ────────────────────────────────────────
  //   RENDER
  // ────────────────────────────────────────

  return (
    <div className={`lp-root${mounted ? " lp-mounted" : ""}`}>
      {/* ── Global Toast ── */}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ════════════════════════════════════
          LEFT PANEL
      ════════════════════════════════════ */}
      <div className="lp-left">
        {/* Decorative blobs */}
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />

        {/* Brand */}
        <div className="lp-brand">
          <div className="lp-brand-logo">
            <BookOpen size={30} color="#fff" strokeWidth={1.8} />
            <div className="lp-brand-logo-ring" />
          </div>
          <div className="lp-brand-text">
            <h1 className="lp-brand-name">Pariksha.io</h1>
            <span className="lp-brand-badge">
              <Sparkles size={10} strokeWidth={2} />
              AI Powered
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="lp-headline">
          <h2 className="lp-headline-title">
            The Smarter Way to
            <br />
            <span className="lp-headline-accent">Run Your School</span>
          </h2>
          <p className="lp-headline-sub">
            Examinations, attendance, assessments, and academic operations —
            unified in one intelligent platform built for modern institutions.
          </p>
        </div>

        {/* Trust section */}
        <div className="lp-trust">
          <p className="lp-trust-label">Trusted by institutions</p>
          <div className="lp-trust-grid">
            {TRUST.map((t, i) => (
              <div
                className="lp-trust-item"
                key={t.title}
                style={{ animationDelay: `${0.1 + i * 0.07}s` }}>
                <div
                  className="lp-trust-icon"
                  style={{ background: t.bg, color: t.color }}>
                  <t.icon size={16} strokeWidth={2} />
                </div>
                <div>
                  <p className="lp-trust-title">{t.title}</p>
                  <p className="lp-trust-desc">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="lp-left-footer">
          © {new Date().getFullYear()} Pariksha.io — All rights reserved
        </p>
      </div>

      {/* ════════════════════════════════════
          RIGHT PANEL
      ════════════════════════════════════ */}
      <div className="lp-right">
        {/* Decorative circles */}
        <div className="lp-right-circle lp-right-circle-1" />
        <div className="lp-right-circle lp-right-circle-2" />

        <div className="lp-card">
          {/* Mobile brand */}
          <div className="lp-mobile-brand">
            <div className="lp-mobile-logo">
              <BookOpen size={24} color="#1D9E75" strokeWidth={2} />
            </div>
            <span className="lp-mobile-name">Pariksha.io</span>
          </div>

          {/* Header */}
          <div className="lp-card-header">
            <h2 className="lp-card-title">Welcome Back 👋</h2>
            <p className="lp-card-sub">Sign in to continue to your dashboard</p>
          </div>

          {/* Form */}
          <form className="lp-form" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="lp-field">
              <label className="lp-label">
                <Mail size={13} strokeWidth={2} />
                Email Address
              </label>
              <div
                className={`lp-input-wrap${email ? " lp-input-filled" : ""}`}>
                <Mail size={16} className="lp-input-prefix" strokeWidth={1.8} />
                <input
                  type="email"
                  className="lp-input"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
                {email && (
                  <span className="lp-input-check">
                    <ShieldCheck size={15} strokeWidth={2} color="#1D9E75" />
                  </span>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="lp-field">
              <label className="lp-label">
                <Lock size={13} strokeWidth={2} />
                Password
              </label>
              <div
                className={`lp-input-wrap${password ? " lp-input-filled" : ""}`}>
                <Lock size={16} className="lp-input-prefix" strokeWidth={1.8} />
                <input
                  type={showPass ? "text" : "password"}
                  className="lp-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lp-eye"
                  onClick={() => setShowPass((p) => !p)}
                  tabIndex={-1}
                  aria-label={showPass ? "Hide password" : "Show password"}>
                  {showPass ? (
                    <EyeOff size={16} strokeWidth={1.8} />
                  ) : (
                    <Eye size={16} strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`lp-btn${loading ? " lp-btn-loading" : ""}`}
              disabled={loading}>
              {loading ? (
                <>
                  <span className="lp-btn-spinner" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={17} strokeWidth={2} />
                  <span>Sign In to Pariksha.io</span>
                </>
              )}
            </button>
          </form>

          {/* Password hint */}
          <div className="lp-hint">
            <div className="lp-hint-icon">
              <Lock size={12} strokeWidth={2.2} />
            </div>
            <p>
              Default password:&nbsp;
              <code className="lp-hint-code">Pariksha@YOUR-CODE</code>
              &nbsp;(e.g.&nbsp;
              <code className="lp-hint-code">Pariksha@TCH-2024-001</code>)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
