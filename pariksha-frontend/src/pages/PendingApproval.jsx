import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import {
  BookOpen,
  ShieldCheck,
  Clock,
  RefreshCw,
  LogOut,
  CheckCircle2,
  CircleDot,
  Lock,
  Mail,
  BrainCircuit,
  BarChart3,
  ShieldCheck as ShieldIcon,
  FileCheck2,
  BookText,
  ClipboardList,
  LayoutGrid,
  User,
  Rocket,
} from "lucide-react";
import Toast from "../components/shared/Toast";
import Modal from "../components/shared/Modal";
import "./PendingApproval.css";

const FEATURES = [
  { icon: BrainCircuit, label: "AI Powered Exams" },
  { icon: BarChart3, label: "Smart Learning Analytics" },
  { icon: ShieldIcon, label: "Secure Student Portal" },
  { icon: FileCheck2, label: "Digital Assessment System" },
];

const TIMELINE = [
  {
    key: "created",
    icon: CheckCircle2,
    label: "Account Created",
    desc: "Your teacher created your account.",
    status: "done",
  },
  {
    key: "verification",
    icon: Clock,
    label: "Admin Verification",
    desc: "Administration team is reviewing your account.",
    status: "active",
  },
  {
    key: "access",
    icon: LayoutGrid,
    label: "Dashboard Access",
    desc: "Your complete student dashboard will unlock after approval.",
    status: "upcoming",
  },
];

const DASHBOARD_TILES = [
  { icon: BookText, label: "Exams" },
  { icon: ClipboardList, label: "Results" },
  { icon: LayoutGrid, label: "Classes" },
];

export default function PendingApproval() {
  const navigate = useNavigate();
  const { logout, email } = useAuth();
  const [toast, setToast] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [checking, setChecking] = useState(false);

  function handleLogout() {
    setToast({
      type: "success",
      msg: "You have been signed out safely. See you again soon!",
    });

    logout();

    setTimeout(() => {
      navigate("/login");
    }, 1000);
  }

  async function checkStatus() {
    if (checking) return;
    setChecking(true);
    setToast({
      type: "info",
      msg: "Checking your approval status...",
    });

    // Placeholder — API integration to be wired up later
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setChecking(false);
  }

  return (
    <div className="pa-page">
      {/* Ambient background */}
      <div className="pa-bg" aria-hidden="true">
        <div className="pa-blob pa-blob-1" />
        <div className="pa-blob pa-blob-2" />
        <div className="pa-blob pa-blob-3" />
      </div>

      <div className="pa-shell">
        {/* ══ BRAND ══ */}
        <header className="pa-block pa-block-brand">
          <div className="pa-brand">
            <div className="pa-brand-mark">
              <BookOpen size={20} strokeWidth={2.2} />
            </div>
            <div className="pa-brand-text">
              <span className="pa-brand-name">Pariksha.io</span>
              <span className="pa-brand-badge">
                AI Powered Education Platform
              </span>
            </div>
          </div>
        </header>

        {/* ══ LEFT PANEL ══ */}
        <div className="pa-left">
          <div className="pa-block pa-block-heading">
            <h1 className="pa-heading">
              Your Learning Journey
              <br />
              is Almost Ready{" "}
              <Rocket className="pa-heading-rocket" size={30} strokeWidth={2} />
            </h1>
            <p className="pa-subheading">
              Your account has been created successfully. We are verifying your
              access to ensure a safe and personalized learning experience.
            </p>
          </div>

          <div className="pa-block pa-block-features">
            <div className="pa-feature-grid">
              {FEATURES.map((f) => (
                <div className="pa-feature-card" key={f.label}>
                  <span className="pa-feature-icon">
                    <f.icon size={16} strokeWidth={2} />
                  </span>
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          <div className="pa-block pa-block-illustration">
            <div className="pa-illustration">
              <div className="pa-illust-ring pa-illust-ring-1" />
              <div className="pa-illust-ring pa-illust-ring-2" />
              <div className="pa-illust-glow" />

              <div className="pa-illust-badge pa-illust-shield">
                <ShieldCheck size={20} strokeWidth={1.8} />
              </div>

              <div className="pa-illust-core">
                <Clock size={30} strokeWidth={1.6} />
              </div>

              <span className="pa-illust-caption">Account Verification</span>
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div className="pa-right">
          <div className="pa-block pa-block-status">
            <section className="pa-preview-card">
              <div className="pa-preview-head">
                <h2 className="pa-preview-title">Account Verification</h2>
                <span className="pa-status-pill">
                  <span className="pa-status-dot" />
                  Pending Approval
                </span>
              </div>
              <p className="pa-preview-text">
                Your account is currently being reviewed by the administration
                team.
              </p>

              {/* Profile */}
              <div className="pa-block pa-block-profile">
                <div className="pa-profile-row">
                  <div className="pa-profile-identity">
                    <div className="pa-profile-avatar">
                      <User size={18} strokeWidth={2} />
                    </div>
                    <div className="pa-profile-info">
                      <span className="pa-profile-name">Student</span>
                      {email && (
                        <span className="pa-profile-email">
                          <Mail size={11} strokeWidth={2} />
                          <span className="pa-profile-email-text">{email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="pa-profile-status">
                    Pending Verification
                  </span>
                </div>
                <div className="pa-secure-badge">
                  <Lock size={12} strokeWidth={2.4} />
                  Secure Account
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="pa-block pa-block-dashboard">
                <div className="pa-dash-preview">
                  <div className="pa-dash-preview-head">Student Dashboard</div>
                  <div className="pa-dash-grid">
                    {DASHBOARD_TILES.map((tile) => (
                      <div className="pa-dash-tile" key={tile.label}>
                        <tile.icon size={20} strokeWidth={1.8} />
                        <span>{tile.label}</span>
                        <Lock
                          size={13}
                          strokeWidth={2.2}
                          className="pa-dash-lock"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="pa-dash-overlay">
                    <Lock size={13} strokeWidth={2.2} />
                    Available after approval
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="pa-block pa-block-timeline">
                <div className="pa-timeline">
                  {/* ── Desktop: horizontal, node centered above its own label ── */}
                  <div className="pa-tl-desktop">
                    <div className="pa-tl-track">
                      <span className="pa-tl-line pa-tl-line-1" />
                      <span className="pa-tl-line pa-tl-line-2" />
                      {TIMELINE.map((step) => (
                        <div className="pa-tl-node-wrap" key={step.key}>
                          <span
                            className={`pa-tl-node pa-tl-node-${step.status}`}>
                            {step.status === "active" && (
                              <span className="pa-tl-pulse" />
                            )}
                            <step.icon size={14} strokeWidth={2.2} />
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pa-tl-labels-row">
                      {TIMELINE.map((step) => (
                        <div
                          className={`pa-tl-label-col pa-tl-${step.status}`}
                          key={step.key}>
                          <p className="pa-tl-label">{step.label}</p>
                          <p className="pa-tl-desc">{step.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Mobile: vertical stepper ── */}
                  <div className="pa-tl-mobile">
                    {TIMELINE.map((step, i) => (
                      <div
                        className={`pa-tl-step pa-tl-${step.status}`}
                        key={step.key}>
                        <div className="pa-tl-node-col">
                          <span
                            className={`pa-tl-node pa-tl-node-${step.status}`}>
                            {step.status === "active" && (
                              <span className="pa-tl-pulse" />
                            )}
                            <step.icon size={14} strokeWidth={2.2} />
                          </span>
                          {i < TIMELINE.length - 1 && (
                            <span
                              className={`pa-tl-connector ${
                                step.status === "done"
                                  ? "pa-tl-connector-done"
                                  : ""
                              }`}
                            />
                          )}
                        </div>
                        <div className="pa-tl-content">
                          <p className="pa-tl-label">{step.label}</p>
                          <p className="pa-tl-desc">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Actions */}
          <div className="pa-block pa-block-actions">
            <div className="pa-actions">
              <button
                className="pa-btn pa-btn-primary"
                onClick={checkStatus}
                disabled={checking}>
                <RefreshCw
                  size={16}
                  strokeWidth={2.2}
                  className={checking ? "pa-spin" : ""}
                />
                {checking ? "Checking..." : "Check Approval Status"}
              </button>

              <button
                className="pa-btn pa-btn-secondary"
                onClick={() => setShowLogoutModal(true)}>
                <LogOut size={16} strokeWidth={2.2} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showLogoutModal && (
        <Modal
          title="Sign Out from Pariksha.io?"
          onClose={() => setShowLogoutModal(false)}
          size="small">
          <div className="pa-logout-confirm">
            <div className="pa-logout-icon">
              <LogOut size={24} strokeWidth={2} />
            </div>

            <p>
              Are you sure you want to leave? You can return anytime after
              signing in again.
            </p>

            <div className="pa-logout-actions">
              <button
                className="pa-btn-cancel"
                onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>

              <button
                className="pa-btn-confirm-logout"
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}>
                <LogOut size={15} strokeWidth={2.2} />
                Sign Out
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
