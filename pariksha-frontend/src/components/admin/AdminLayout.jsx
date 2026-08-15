import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Clock,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Bell,
  User,
  BookMarked,
  Mail,
  AlertTriangle,
  LogIn,
  GraduationCap as GradCapIcon,
  CheckCircle,
  Home,
  FileText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import adminService from "../../services/adminService";
import Modal from "../shared/Modal";
import Toast from "../shared/Toast";
import Spinner from "../shared/Spinner";
import "../../styles/admin.css";
import "./AdminLayout.css";

const NAV_ITEMS = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    ],
  },
  {
    group: "People",
    items: [
      { label: "Teachers", icon: Users, path: "/admin/teachers" },
      { label: "Students", icon: GraduationCap, path: "/admin/students" },
      { label: "Pending", icon: Clock, path: "/admin/pending" },
    ],
  },
  {
    group: "Academics",
    items: [
      { label: "Classes", icon: BookOpen, path: "/admin/classes" },
      { label: "Question Bank", icon: BookMarked, path: "/admin/questions" },
      { label: "Papers", icon: FileText, path: "/admin/papers" },
    ],
  },
];

const BOTTOM_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Teachers", icon: Users, path: "/admin/teachers" },
  { label: "Students", icon: GraduationCap, path: "/admin/students" },
  { label: "Classes", icon: BookOpen, path: "/admin/classes" },
  { label: "Pending", icon: Clock, path: "/admin/pending" },
];

export default function AdminLayout({ children, title = "Dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // ── Mobile detection ──
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false,
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Collapsed only applies on desktop
  const effectiveCollapsed = collapsed && !isMobile;

  // Profile dropdown
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingList, setPendingList] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const notifRef = useRef(null);

  // Logout confirm modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // ── Close mobile sidebar on route change ──
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Fetch pending students ──
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await adminService.getPending();
      const list = res.data.data || [];
      setPendingList(list);
      setPendingCount(list.length);
    } catch {
      setPendingList([]);
      setPendingCount(0);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  function handleLogout() {
    setShowLogoutConfirm(false);
    setToast({
      type: "success",
      message: "You have been signed out successfully.",
    });
    setTimeout(() => {
      logout();
      navigate("/login");
    }, 700);
  }

  const isActive = (path) => location.pathname === path;

  // Initials from email
  const initials = email ? email.split("@")[0].slice(0, 2).toUpperCase() : "AD";

  function goToNotification() {
    setNotifOpen(false);
    navigate("/admin/pending");
  }

  // ── Build breadcrumb segments from current path ──
  function getBreadcrumb() {
    const segments = location.pathname
      .replace(/^\//, "") // strip leading /
      .split("/")
      .filter(Boolean);

    return segments.map((seg, i) => {
      const path = "/" + segments.slice(0, i + 1).join("/");
      const label = seg.charAt(0).toUpperCase() + seg.slice(1);
      return { label, path };
    });
  }

  const breadcrumbs = getBreadcrumb();

  return (
    <div className={`al-root${effectiveCollapsed ? " al-collapsed" : ""}`}>
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className="al-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ════════════════════════════
          SIDEBAR
      ════════════════════════════ */}
      <aside className={`al-sidebar${sidebarOpen ? " al-sidebar-open" : ""}`}>
        {/* Brand */}
        <div className="al-brand">
          <div className="al-brand-logo">
            <BookOpen size={18} color="#fff" strokeWidth={2} />
          </div>
          {!effectiveCollapsed && (
            <div className="al-brand-text">
              <span className="al-brand-name">Pariksha.io</span>
              <span className="al-brand-role">Admin Panel</span>
            </div>
          )}

          {/* Collapse toggle — expanded state (desktop) */}
          {!effectiveCollapsed && !isMobile && (
            <button
              className="al-collapse-toggle"
              onClick={() => setCollapsed((p) => !p)}
              title="Collapse sidebar">
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
          )}

          {/* Expand toggle — collapsed state (desktop) */}
          {effectiveCollapsed && (
            <button
              className="al-expand-toggle"
              onClick={() => setCollapsed((p) => !p)}
              title="Expand sidebar">
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="al-nav">
          {NAV_ITEMS.map((group) => (
            <div key={group.group} className="al-nav-group">
              {!effectiveCollapsed && (
                <p className="al-nav-group-label">{group.group}</p>
              )}
              {group.items.map((item) => (
                <button
                  key={item.path}
                  className={`al-nav-item${isActive(item.path) ? " al-nav-active" : ""}`}
                  onClick={() => navigate(item.path)}
                  title={effectiveCollapsed ? item.label : ""}>
                  <item.icon
                    size={19}
                    strokeWidth={isActive(item.path) ? 2.2 : 1.8}
                    className="al-nav-icon"
                  />
                  {!effectiveCollapsed && (
                    <>
                      <span className="al-nav-label">{item.label}</span>
                      {item.path === "/admin/pending" && pendingCount > 0 && (
                        <span className="al-nav-badge">{pendingCount}</span>
                      )}
                      {isActive(item.path) && (
                        <ChevronRight
                          size={14}
                          strokeWidth={2.5}
                          className="al-nav-chevron"
                        />
                      )}
                    </>
                  )}
                  {effectiveCollapsed &&
                    item.path === "/admin/pending" &&
                    pendingCount > 0 && <span className="al-nav-badge-dot" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="al-sidebar-footer">
          {!effectiveCollapsed && (
            <div className="al-user">
              <div className="al-user-avatar">{initials}</div>
              <div className="al-user-info">
                <span className="al-user-name">Administrator</span>
                <span className="al-user-email">{email}</span>
              </div>
            </div>
          )}
          <button
            className="al-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            title="Logout">
            <LogOut size={17} strokeWidth={2} />
            {!effectiveCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ════════════════════════════
          MAIN AREA
      ════════════════════════════ */}
      <div className="al-main">
        {/* ── Topbar ── */}
        <header className="al-topbar">
          {/* LEFT: hamburger + title/breadcrumb stack */}
          <div className="al-topbar-left">
            <button
              className="al-hamburger"
              onClick={() => setSidebarOpen((p) => !p)}>
              {sidebarOpen ? (
                <X size={20} strokeWidth={2} />
              ) : (
                <Menu size={20} strokeWidth={2} />
              )}
            </button>

            <div className="al-title-wrap">
              {/* Row 1: Page title */}
              <h1 className="al-page-title">{title}</h1>

              {/* Row 2: Breadcrumb trail — sits just below the title */}
              <nav className="al-breadcrumb" aria-label="Breadcrumb">
                <button
                  className="al-breadcrumb-item al-breadcrumb-home"
                  onClick={() => navigate("/admin/dashboard")}
                  title="Home">
                  <Home size={12} strokeWidth={2} />
                </button>

                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.path} className="al-breadcrumb-segment">
                    <ChevronRight
                      size={11}
                      strokeWidth={2.5}
                      className="al-breadcrumb-sep"
                    />
                    {i === breadcrumbs.length - 1 ? (
                      <span className="al-breadcrumb-current">
                        {crumb.label}
                      </span>
                    ) : (
                      <button
                        className="al-breadcrumb-item"
                        onClick={() => navigate("/admin/dashboard")}>
                        {crumb.label}
                      </button>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          </div>

          {/* RIGHT: notifications + profile — always vertically centered */}
          <div className="al-topbar-right">
            {/* Notifications */}
            <div className="al-dropdown-wrap" ref={notifRef}>
              <button
                className="al-icon-btn"
                title="Notifications"
                onClick={() => {
                  setNotifOpen((p) => !p);
                  setProfileOpen(false);
                }}>
                <Bell size={18} strokeWidth={1.8} />
                {pendingCount > 0 && (
                  <span className="al-notif-dot">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="al-dropdown al-notif-dropdown">
                  <div className="al-dropdown-header">
                    <span>Notifications</span>
                    {pendingCount > 0 && (
                      <span className="al-dropdown-header-badge">
                        {pendingCount} new
                      </span>
                    )}
                  </div>

                  <div className="al-notif-list">
                    {notifLoading ? (
                      <div className="al-notif-loading">
                        <Spinner size="small" color="var(--admin-primary)" />
                      </div>
                    ) : pendingList.length === 0 ? (
                      <div className="al-notif-empty">
                        <CheckCircle
                          size={28}
                          strokeWidth={1.5}
                          color="#38A169"
                        />
                        <p>All caught up!</p>
                        <span>No pending approvals.</span>
                      </div>
                    ) : (
                      pendingList.slice(0, 6).map((s) => (
                        <button
                          key={s.id}
                          className="al-notif-item"
                          onClick={goToNotification}>
                          <div className="al-notif-icon">
                            <GradCapIcon size={15} strokeWidth={2} />
                          </div>
                          <div className="al-notif-body">
                            <p className="al-notif-title">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="al-notif-sub">
                              Registration pending · Class {s.className}-
                              {s.section}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {pendingCount > 0 && (
                    <button
                      className="al-dropdown-footer"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate("/admin/pending");
                      }}>
                      View all pending approvals
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="al-dropdown-wrap" ref={profileRef}>
              <button
                className="al-profile-btn"
                onClick={() => {
                  setProfileOpen((p) => !p);
                  setNotifOpen(false);
                }}
                title="Account">
                <div className="al-profile-avatar">{initials}</div>
              </button>

              {profileOpen && (
                <div className="al-dropdown al-profile-dropdown">
                  <div className="al-profile-dropdown-header">
                    <div className="al-profile-avatar al-profile-avatar-lg">
                      {initials}
                    </div>
                    <div className="al-profile-dropdown-info">
                      <p className="al-profile-dropdown-role">Administrator</p>
                      <p className="al-profile-dropdown-email">
                        <Mail size={12} strokeWidth={2} />
                        {email}
                      </p>
                    </div>
                  </div>

                  <div className="al-dropdown-divider" />

                  <button
                    className="al-dropdown-item"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/admin/profile");
                    }}>
                    <User size={16} strokeWidth={2} />
                    <span>Profile Settings</span>
                  </button>

                  <div className="al-dropdown-divider" />

                  <button
                    className="al-dropdown-item al-dropdown-item-danger"
                    onClick={() => {
                      setProfileOpen(false);
                      setShowLogoutConfirm(true);
                    }}>
                    <LogOut size={16} strokeWidth={2} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="al-content">{children}</main>
      </div>

      {/* ════════════════════════════
          BOTTOM NAV (mobile)
      ════════════════════════════ */}
      <nav className="al-bottom-nav">
        {BOTTOM_NAV.map((item) => (
          <button
            key={item.path}
            className={`al-bottom-item${isActive(item.path) ? " al-bottom-active" : ""}`}
            onClick={() => navigate(item.path)}>
            <span className="al-bottom-icon-wrap">
              <item.icon
                size={20}
                strokeWidth={isActive(item.path) ? 2.2 : 1.8}
              />
              {item.path === "/admin/pending" && pendingCount > 0 && (
                <span className="al-bottom-badge">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ════════════════════════════
          LOGOUT CONFIRM MODAL
      ════════════════════════════ */}
      {showLogoutConfirm && (
        <Modal
          title="Sign Out"
          onClose={() => setShowLogoutConfirm(false)}
          size="small">
          <div className="al-logout-confirm">
            <div className="al-logout-confirm-icon">
              <AlertTriangle size={32} strokeWidth={1.5} color="#D69E2E" />
            </div>
            <p className="al-logout-confirm-title">Sign out of Pariksha.io?</p>
            <p className="al-logout-confirm-sub">
              You'll need to sign in again to access the admin dashboard.
            </p>
            <div className="al-logout-confirm-actions">
              <button
                className="al-logout-cancel"
                onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="al-logout-confirm-btn" onClick={handleLogout}>
                <LogIn
                  size={15}
                  strokeWidth={2}
                  style={{ transform: "rotate(180deg)" }}
                />
                Yes, Sign Out
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
