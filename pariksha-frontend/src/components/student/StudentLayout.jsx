import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  Award,
  FileText,
  PencilLine,
  User,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Mail,
  AlertTriangle,
  LogIn,
  Home,
  CheckCheck,
  KeyRound,
  Clock,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import studentService from "../../services/studentService";
import Modal from "../shared/Modal";
import Toast from "../shared/Toast";
import Spinner from "../shared/Spinner";
import "../../styles/student.css";
import "./StudentLayout.css";

// ─────────────────────────────────────────────────────
//  NAV CONFIG
// ─────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/student/dashboard" },
    ],
  },
  {
    group: "Academics",
    items: [
      { label: "Timetable", icon: CalendarDays, path: "/student/timetable" },
      {
        label: "Attendance",
        icon: ClipboardCheck,
        path: "/student/attendance",
      },
      { label: "Marks", icon: Award, path: "/student/marks" },
    ],
  },
  {
    group: "Exams",
    items: [
      { label: "Papers", icon: FileText, path: "/student/papers" },
      { label: "Exams", icon: PencilLine, path: "/student/exams" },
    ],
  },
  {
    group: "Account",
    items: [{ label: "Profile", icon: User, path: "/student/profile" }],
  },
];

const BOTTOM_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/student/dashboard" },
  { label: "Attend.", icon: ClipboardCheck, path: "/student/attendance" },
  { label: "Marks", icon: Award, path: "/student/marks" },
  { label: "Exams", icon: PencilLine, path: "/student/exams" },
  { label: "Profile", icon: User, path: "/student/profile" },
];

const QUICK_ACTIONS = [
  {
    label: "Attempt Exam",
    desc: "Start a pending exam",
    icon: PencilLine,
    colorClass: "sd-dropdown-item-icon-green",
    path: "/student/exams",
  },
  {
    label: "Download Paper",
    desc: "Get your question paper PDF",
    icon: FileText,
    colorClass: "sd-dropdown-item-icon-blue",
    path: "/student/papers",
  },
];

const NOTIF_ICONS = {
  attendance: ClipboardCheck,
  marks: Award,
  exam: PencilLine,
  timetable: CalendarDays,
  system: Bell,
};

// ─────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────

// Corrected against StudentResponse: firstName, lastName, phone,
// permanentAddress, fatherName, fatherContact, photoPath.
// (No "fullname" or generic "parentName"/"parentContact" fields exist.)
function getProfileCompletion(profile) {
  const fields = [
    { key: "firstName", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "permanentAddress", label: "Address" },
    { key: "fatherName", label: "Father's Name" },
    { key: "fatherContact", label: "Father's Contact" },
    { key: "photoPath", label: "Photo" },
  ];
  const filled = fields.map((f) => ({
    label: f.label,
    done: Boolean(profile?.[f.key]),
  }));
  const pct = Math.round(
    (filled.filter((f) => f.done).length / fields.length) * 100,
  );
  return { pct, checklist: filled };
}

// Build a display name from firstName + lastName since the DTO
// has no combined "fullname" field.
function getFullName(profile) {
  if (!profile) return null;
  return (
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null
  );
}

// ─────────────────────────────────────────────────────
//  SUB-COMPONENTS
// ─────────────────────────────────────────────────────

function StudentAvatar({ profile, size = "sm", showStatus = false }) {
  const sizes = {
    xs: { box: 28, text: 10, radius: 7, status: 8 },
    sm: { box: 32, text: 12, radius: 8, status: 9 },
    md: { box: 40, text: 14, radius: 10, status: 10 },
    lg: { box: 52, text: 17, radius: 13, status: 12 },
  };
  const s = sizes[size] || sizes.sm;
  const fullName = getFullName(profile);
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  return (
    <span
      className="sd-avatar-wrap"
      style={{ width: s.box, height: s.box, borderRadius: s.radius }}>
      {profile?.photoPath ? (
        <img
          src={`http://localhost:8080/${profile.photoPath}`}
          alt=""
          className="sd-avatar-img"
        />
      ) : (
        <span className="sd-avatar-initials" style={{ fontSize: s.text }}>
          {initials}
        </span>
      )}
      {showStatus && (
        <span
          className="sd-avatar-status"
          style={{ width: s.status, height: s.status }}
        />
      )}
    </span>
  );
}

function RoleBadge({ label }) {
  return <span className="sd-role-badge">{label}</span>;
}

function ProfileCompletion({ profile }) {
  const { pct, checklist } = getProfileCompletion(profile);
  return (
    <div className="sd-profile-completion">
      <div className="sd-profile-completion-header">
        <span className="sd-profile-completion-label">Profile Completion</span>
        <span className="sd-profile-completion-pct">{pct}%</span>
      </div>
      <div className="sd-profile-progress-track">
        <div className="sd-profile-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="sd-profile-checklist">
        {checklist.map((item) => (
          <span
            key={item.label}
            className={`sd-profile-check-item${item.done ? " sd-profile-check-done" : ""}`}>
            <CheckCircle2 size={11} strokeWidth={2.5} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StudentMetrics({ attendancePct, examsAttempted, loading }) {
  return (
    <div className="sd-student-metrics">
      <div className="sd-metric-card">
        {loading ? (
          <span className="sd-metric-skeleton" />
        ) : (
          <span className="sd-metric-value">
            {attendancePct != null ? `${attendancePct}%` : "–"}
          </span>
        )}
        <span className="sd-metric-label">Attendance</span>
      </div>
      <div className="sd-metric-divider" />
      <div className="sd-metric-card">
        {loading ? (
          <span className="sd-metric-skeleton" />
        ) : (
          <span className="sd-metric-value">{examsAttempted ?? "–"}</span>
        )}
        <span className="sd-metric-label">Exams Done</span>
      </div>
    </div>
  );
}

const studentNotificationService = {
  async getNotifications() {
    return { data: { data: [] } };
  },
  async markRead() {
    return { data: { success: true } };
  },
  async markAllRead() {
    return { data: { success: true } };
  },
};

// ─────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────

export default function StudentLayout({ children, title = "Dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [attendancePct, setAttendancePct] = useState(null);
  const [examsAttempted, setExamsAttempted] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const effectiveCollapsed = collapsed && !isMobile;

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const quickActRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickActOpen, setQuickActOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
      if (quickActRef.current && !quickActRef.current.contains(e.target))
        setQuickActOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close dropdowns on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setNotifOpen(false);
        setQuickActOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Fetch profile — mark loaded regardless of success so nav always renders
  useEffect(() => {
    studentService
      .getProfile()
      .then((res) => setProfile(res.data.data))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoaded(true));
  }, []);

  // Fetch metrics — attendance summary + exam history count
  useEffect(() => {
    async function fetchMetrics() {
      setMetricsLoading(true);
      try {
        const [summaryRes, historyRes] = await Promise.allSettled([
          studentService.getSummary(),
          studentService.getHistory(),
        ]);
        if (summaryRes.status === "fulfilled") {
          const s = summaryRes.value.data.data;
          // AttendanceSummaryResponse only has "attendancePercentage"
          setAttendancePct(s?.attendancePercentage ?? null);
        }
        if (historyRes.status === "fulfilled") {
          setExamsAttempted((historyRes.value.data.data || []).length);
        }
      } catch {
        setAttendancePct(null);
        setExamsAttempted(null);
      } finally {
        setMetricsLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  // Notifications
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await studentNotificationService.getNotifications();
      setNotifications(res.data.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function handleMarkRead(id) {
    try {
      await studentNotificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {}
  }

  async function handleMarkAllRead() {
    try {
      await studentNotificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

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

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // Corrected: DTO has firstName/lastName, not fullname
  const displayName = getFullName(profile) ?? user?.email ?? "Student";

  // Corrected: DTO field is "className", not "classLevel"/"class"
  const classLine = profile?.className
    ? `Class ${profile.className}${profile.section ? " Section " + profile.section : ""}`
    : "Student";

  function getBreadcrumb() {
    const segments = location.pathname
      .replace(/^\//, "")
      .split("/")
      .filter(Boolean);
    return segments.map((seg, i) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1),
      path: "/" + segments.slice(0, i + 1).join("/"),
    }));
  }
  const breadcrumbs = getBreadcrumb();

  return (
    <div className={`sd-root${effectiveCollapsed ? " sd-collapsed" : ""}`}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {sidebarOpen && (
        <div
          className="sd-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside
        className={`sd-sidebar${sidebarOpen ? " sd-sidebar-open" : ""}`}
        aria-label="Main navigation">
        {/* Brand */}
        <div className="sd-brand">
          <div className="sd-brand-logo" aria-hidden="true">
            <GraduationCap size={18} color="#fff" strokeWidth={2} />
          </div>
          {!effectiveCollapsed && (
            <div className="sd-brand-text">
              <span className="sd-brand-name">Pariksha.io</span>
              <span className="sd-brand-role">Student Portal</span>
            </div>
          )}
          {!effectiveCollapsed && !isMobile && (
            <button
              className="sd-collapse-toggle"
              onClick={() => setCollapsed((p) => !p)}
              aria-label="Collapse sidebar">
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>
          )}
          {effectiveCollapsed && (
            <button
              className="sd-expand-toggle"
              onClick={() => setCollapsed((p) => !p)}
              aria-label="Expand sidebar">
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          )}
          {isMobile && sidebarOpen && (
            <button
              className="sd-sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu">
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Nav — skeleton while profile loads */}
        <nav className="sd-nav" aria-label="Sidebar navigation">
          {!profileLoaded ? (
            <div className="sd-nav-skeleton">
              {[...Array(6)].map((_, i) => (
                <span key={i} className="sd-nav-skeleton-item" />
              ))}
            </div>
          ) : (
            NAV_GROUPS.map((group) => (
              <div
                key={group.group}
                className="sd-nav-group"
                role="group"
                aria-label={group.group}>
                {!effectiveCollapsed && (
                  <p className="sd-nav-group-label">{group.group}</p>
                )}
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      className={`sd-nav-item${active ? " sd-nav-active" : ""}`}
                      onClick={() => navigate(item.path)}
                      aria-current={active ? "page" : undefined}
                      title={effectiveCollapsed ? item.label : undefined}>
                      <item.icon
                        size={18}
                        strokeWidth={active ? 2.2 : 1.8}
                        className="sd-nav-icon"
                        aria-hidden="true"
                      />
                      {!effectiveCollapsed && (
                        <>
                          <span className="sd-nav-label">{item.label}</span>
                          {active && (
                            <ChevronRight
                              size={13}
                              strokeWidth={2.5}
                              className="sd-nav-chevron"
                              aria-hidden="true"
                            />
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="sd-sidebar-footer">
          {!effectiveCollapsed ? (
            <div className="sd-student-card">
              <div className="sd-student-card-top">
                <StudentAvatar profile={profile} size="md" showStatus={true} />
                <div className="sd-student-card-info">
                  <span className="sd-student-card-name">{displayName}</span>
                  <RoleBadge label={classLine} />
                  {profile?.studentRollCode && (
                    <span className="sd-student-card-code">
                      {profile.studentRollCode}
                    </span>
                  )}
                </div>
              </div>
              <StudentMetrics
                attendancePct={attendancePct}
                examsAttempted={examsAttempted}
                loading={metricsLoading}
              />
            </div>
          ) : (
            <div className="sd-student-card-collapsed">
              <StudentAvatar profile={profile} size="sm" showStatus={true} />
            </div>
          )}

          <button
            className="sd-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="Logout"
            title="Logout">
            <LogOut size={16} strokeWidth={2} />
            {!effectiveCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <div className="sd-main">
        <header className="sd-topbar" role="banner">
          {/* LEFT */}
          <div className="sd-topbar-left">
            <button
              className="sd-hamburger"
              onClick={() => setSidebarOpen((p) => !p)}
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              aria-expanded={sidebarOpen}>
              {sidebarOpen ? (
                <X size={20} strokeWidth={2} />
              ) : (
                <Menu size={20} strokeWidth={2} />
              )}
            </button>

            <div className="sd-title-wrap">
              <h1 className="sd-page-title">{title}</h1>
              {/* Breadcrumb — lives ONLY here, directly under the page title */}
              <nav className="sd-breadcrumb" aria-label="Breadcrumb">
                <button
                  className="sd-breadcrumb-item sd-breadcrumb-home"
                  onClick={() => navigate("/student/dashboard")}
                  aria-label="Home">
                  <Home size={11} strokeWidth={2} aria-hidden="true" />
                </button>
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.path} className="sd-breadcrumb-segment">
                    <ChevronRight
                      size={10}
                      strokeWidth={2.5}
                      className="sd-breadcrumb-sep"
                      aria-hidden="true"
                    />
                    {i === breadcrumbs.length - 1 ? (
                      <span
                        className="sd-breadcrumb-current"
                        aria-current="page">
                        {crumb.label}
                      </span>
                    ) : (
                      <button
                        className="sd-breadcrumb-item"
                        onClick={() => navigate("/student/dashboard")}>
                        {crumb.label}
                      </button>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          </div>

          {/* RIGHT */}
          <div className="sd-topbar-right">
            {/* Quick Actions */}
            <div className="sd-dropdown-wrap" ref={quickActRef}>
              <button
                className="sd-quick-act-btn"
                onClick={() => {
                  setQuickActOpen((p) => !p);
                  setNotifOpen(false);
                  setProfileOpen(false);
                }}
                aria-haspopup="menu"
                aria-expanded={quickActOpen}
                aria-label="Quick actions">
                <span style={{ display: "flex", alignItems: "center" }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                <span className="sd-quick-act-label">Actions</span>
                <ChevronRight
                  size={12}
                  strokeWidth={2.5}
                  className={`sd-quick-act-chevron${quickActOpen ? " sd-quick-act-chevron-open" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {quickActOpen && (
                <div className="sd-dropdown sd-quick-act-dropdown" role="menu">
                  <p className="sd-dropdown-group-label">Quick actions</p>
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.path}
                      className="sd-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setQuickActOpen(false);
                        navigate(action.path);
                      }}>
                      <div
                        className={`sd-dropdown-item-icon ${action.colorClass}`}>
                        <action.icon
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <span className="sd-dropdown-item-label">
                          {action.label}
                        </span>
                        <span className="sd-dropdown-item-desc">
                          {action.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="sd-dropdown-wrap" ref={notifRef}>
              <button
                className="sd-icon-btn"
                onClick={() => {
                  setNotifOpen((p) => !p);
                  setProfileOpen(false);
                  setQuickActOpen(false);
                  if (!notifOpen) fetchNotifications();
                }}
                aria-haspopup="dialog"
                aria-expanded={notifOpen}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                title="Notifications">
                <Bell size={17} strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span className="sd-notif-badge" aria-hidden="true">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="sd-dropdown sd-notif-dropdown"
                  role="dialog"
                  aria-label="Notifications">
                  <div className="sd-notif-header">
                    <span className="sd-notif-header-title">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="sd-notif-header-badge">
                          {unreadCount} new
                        </span>
                      )}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        className="sd-notif-mark-all"
                        onClick={handleMarkAllRead}>
                        <CheckCheck size={13} strokeWidth={2} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="sd-notif-list">
                    {notifLoading ? (
                      <div className="sd-notif-state">
                        <Spinner size="small" color="var(--student-primary)" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="sd-notif-state sd-notif-empty">
                        <div className="sd-notif-empty-icon">
                          <Bell size={22} strokeWidth={1.5} />
                        </div>
                        <p>You're all caught up</p>
                        <span>No new notifications</span>
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((n) => {
                        const IconComp = NOTIF_ICONS[n.type] || Bell;
                        return (
                          <button
                            key={n.id}
                            className={`sd-notif-item${!n.read ? " sd-notif-item-unread" : ""}`}
                            onClick={() => handleMarkRead(n.id)}>
                            <div className="sd-notif-item-icon">
                              <IconComp size={14} strokeWidth={2} />
                            </div>
                            <div className="sd-notif-item-body">
                              <p className="sd-notif-item-title">{n.title}</p>
                              <p className="sd-notif-item-msg">{n.message}</p>
                              {n.createdAt && (
                                <p className="sd-notif-item-time">
                                  <Clock size={10} strokeWidth={2} />
                                  {new Date(n.createdAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            {!n.read && <span className="sd-notif-item-dot" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      className="sd-notif-footer"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate("/student/notifications");
                      }}>
                      View all notifications
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="sd-dropdown-wrap" ref={profileRef}>
              <button
                className="sd-profile-btn"
                onClick={() => {
                  setProfileOpen((p) => !p);
                  setNotifOpen(false);
                  setQuickActOpen(false);
                }}
                aria-haspopup="dialog"
                aria-expanded={profileOpen}
                aria-label="Account menu">
                <StudentAvatar profile={profile} size="xs" />
              </button>

              {profileOpen && (
                <div
                  className="sd-dropdown sd-profile-dropdown"
                  role="dialog"
                  aria-label="Account menu">
                  <div className="sd-profile-dropdown-header">
                    <StudentAvatar
                      profile={profile}
                      size="lg"
                      showStatus={true}
                    />
                    <div className="sd-profile-dropdown-info">
                      <p className="sd-profile-dropdown-name">{displayName}</p>
                      <RoleBadge label={classLine} />
                      {profile?.studentRollCode && (
                        <p className="sd-profile-dropdown-code">
                          {profile.studentRollCode}
                        </p>
                      )}
                      <p className="sd-profile-dropdown-email">
                        <Mail size={11} strokeWidth={2} aria-hidden="true" />
                        {profile?.email ?? user?.email}
                      </p>
                    </div>
                  </div>

                  <ProfileCompletion profile={profile} />
                  <div className="sd-dropdown-divider" />
                  <div className="sd-dropdown-group-label">Account</div>

                  <button
                    className="sd-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/student/profile");
                    }}>
                    <div className="sd-dropdown-item-icon sd-dropdown-item-icon-blue">
                      <User size={13} strokeWidth={2} />
                    </div>
                    <div>
                      <span className="sd-dropdown-item-label">My Profile</span>
                      <span className="sd-dropdown-item-desc">
                        View and edit your details
                      </span>
                    </div>
                  </button>

                  <button
                    className="sd-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/change-password");
                    }}>
                    <div className="sd-dropdown-item-icon sd-dropdown-item-icon-purple">
                      <KeyRound size={13} strokeWidth={2} />
                    </div>
                    <div>
                      <span className="sd-dropdown-item-label">
                        Change Password
                      </span>
                      <span className="sd-dropdown-item-desc">
                        Update your credentials
                      </span>
                    </div>
                  </button>

                  <div className="sd-dropdown-divider" />

                  <button
                    className="sd-dropdown-item sd-dropdown-item-danger"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      setShowLogoutConfirm(true);
                    }}>
                    <div className="sd-dropdown-item-icon sd-dropdown-item-icon-red">
                      <LogOut size={13} strokeWidth={2} />
                    </div>
                    <div>
                      <span className="sd-dropdown-item-label">Sign Out</span>
                      <span className="sd-dropdown-item-desc">
                        End your session
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="sd-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* ═══ BOTTOM NAV ═══ */}
      <nav className="sd-bottom-nav" aria-label="Mobile navigation">
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              className={`sd-bottom-item${active ? " sd-bottom-active" : ""}`}
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}>
              <span className="sd-bottom-icon-wrap">
                <item.icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                  aria-hidden="true"
                />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ═══ LOGOUT MODAL ═══ */}
      {showLogoutConfirm && (
        <Modal
          title="Sign Out"
          onClose={() => setShowLogoutConfirm(false)}
          size="small">
          <div className="sd-logout-confirm">
            <div className="sd-logout-confirm-icon">
              <AlertTriangle size={32} strokeWidth={1.5} color="#D69E2E" />
            </div>
            <p className="sd-logout-confirm-title">Sign out of Pariksha.io?</p>
            <p className="sd-logout-confirm-sub">
              You'll need to sign in again to access the student portal.
            </p>
            <div className="sd-logout-confirm-actions">
              <button
                className="sd-logout-cancel"
                onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="sd-logout-confirm-btn" onClick={handleLogout}>
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
