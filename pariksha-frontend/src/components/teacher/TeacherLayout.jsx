import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Layers,
  CalendarCheck,
  ClipboardList,
  FileText,
  User,
  BookOpen,
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
  BookMarked,
  FilePlus,
  KeyRound,
  GraduationCap,
  Clock,
  CalendarDays,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import teacherService from "../../services/teacherService";
import Modal from "../shared/Modal";
import Toast from "../shared/Toast";
import Spinner from "../shared/Spinner";
import "../../styles/teacher.css";
import "./TeacherLayout.css";

// ─────────────────────────────────────────────────────
//  NAV CONFIG
// ─────────────────────────────────────────────────────

const MENTOR_NAV = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/teacher/dashboard" },
    ],
  },
  {
    group: "Classroom",
    items: [
      { label: "My Class", icon: Layers, path: "/teacher/classes" },
      { label: "My Students", icon: Users, path: "/teacher/students" },
      { label: "Attendance", icon: CalendarCheck, path: "/teacher/attendance" },
      {
        label: "Class Timetable",
        icon: CalendarDays,
        path: "/teacher/timetable",
      },
    ],
  },
  {
    group: "Teaching",
    items: [
      { label: "My Schedule", icon: Clock, path: "/teacher/my-schedule" },
      { label: "Marks", icon: ClipboardList, path: "/teacher/marks" },
    ],
  },
  {
    group: "Academics",
    items: [
      { label: "Results", icon: GraduationCap, path: "/teacher/results" },
      { label: "Papers", icon: FileText, path: "/teacher/papers" },
      { label: "Questions", icon: BookOpen, path: "/teacher/questions" },
    ],
  },
  {
    group: "Account",
    items: [{ label: "Profile", icon: User, path: "/teacher/profile" }],
  },
];

const SUBJECT_TEACHER_NAV = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/teacher/dashboard" },
    ],
  },
  {
    group: "Classroom",
    items: [{ label: "My Class", icon: Layers, path: "/teacher/classes" }],
  },
  {
    group: "Teaching",
    items: [
      { label: "My Schedule", icon: Clock, path: "/teacher/my-schedule" },
      { label: "My Students", icon: Users, path: "/teacher/students" },
      { label: "Marks", icon: ClipboardList, path: "/teacher/marks" },
    ],
  },
  {
    group: "Academics",
    items: [
      { label: "Results", icon: GraduationCap, path: "/teacher/results" },
      { label: "Papers", icon: FileText, path: "/teacher/papers" },
      { label: "Questions", icon: BookOpen, path: "/teacher/questions" },
    ],
  },
  {
    group: "Account",
    items: [{ label: "Profile", icon: User, path: "/teacher/profile" }],
  },
];

// FIX #2 — Bottom nav is now derived from profile, not static.
// Two separate constants; we pick the right one with useMemo.
const MENTOR_BOTTOM_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/teacher/dashboard" },
  { label: "Students", icon: Users, path: "/teacher/students" },
  { label: "Attend.", icon: CalendarCheck, path: "/teacher/attendance" },
  { label: "Marks", icon: ClipboardList, path: "/teacher/marks" },
  { label: "Timetable", icon: CalendarDays, path: "/teacher/timetable" },
];

const SUBJECT_BOTTOM_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/teacher/dashboard" },
  { label: "Students", icon: Users, path: "/teacher/students" },
  { label: "Schedule", icon: Clock, path: "/teacher/my-schedule" },
  { label: "Marks", icon: ClipboardList, path: "/teacher/marks" },
  { label: "Profile", icon: User, path: "/teacher/profile" },
];

const MENTOR_QUICK_ACTIONS = [
  {
    label: "Add Student",
    desc: "Enrol a new student",
    icon: UserPlus,
    colorClass: "tl-dropdown-item-icon-purple",
    path: "/teacher/students?action=create",
  },
  {
    label: "Timetable Entry",
    desc: "Create a timetable slot",
    icon: CalendarDays,
    colorClass: "tl-dropdown-item-icon-green",
    path: "/teacher/timetable?action=create",
  },
  {
    label: "Question",
    desc: "Add to question bank",
    icon: BookMarked,
    colorClass: "tl-dropdown-item-icon-blue",
    path: "/teacher/questions?action=create",
  },
  {
    label: "Paper",
    desc: "Generate or build a paper",
    icon: FilePlus,
    colorClass: "tl-dropdown-item-icon-blue",
    path: "/teacher/papers?action=create",
  },
];

const SUBJECT_QUICK_ACTIONS = [
  {
    label: "Question",
    desc: "Add to question bank",
    icon: BookMarked,
    colorClass: "tl-dropdown-item-icon-blue",
    path: "/teacher/questions?action=create",
  },
  {
    label: "Paper",
    desc: "Generate or build a paper",
    icon: FilePlus,
    colorClass: "tl-dropdown-item-icon-blue",
    path: "/teacher/papers?action=create",
  },
];

const NOTIF_ICONS = {
  attendance: CalendarCheck,
  marks: ClipboardList,
  questionBank: BookMarked,
  paperReview: FilePlus,
  studentUpdate: GraduationCap,
  system: Bell,
};

// ─────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────

function getProfileCompletion(profile) {
  const fields = [
    { key: "firstName", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "qualifications", label: "Qualification" },
    { key: "photoPath", label: "Photo" },
    { key: "currentAddress", label: "Address" },
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

function getRoleBadge(profile) {
  return profile?.isMentor ? "Mentor Teacher" : "Subject Teacher";
}

// ─────────────────────────────────────────────────────
//  SUB-COMPONENTS
// ─────────────────────────────────────────────────────

// FIX #3 — Avatar size map is correct; no change needed here.
function TeacherAvatar({ profile, size = "sm", showStatus = false }) {
  const sizes = {
    xs: { box: 28, text: 10, radius: 7, status: 8 },
    sm: { box: 32, text: 12, radius: 8, status: 9 },
    md: { box: 40, text: 14, radius: 10, status: 10 },
    lg: { box: 52, text: 17, radius: 13, status: 12 },
    xl: { box: 64, text: 20, radius: 16, status: 14 },
  };
  const s = sizes[size] || sizes.sm;
  const initials = profile?.firstName
    ? (profile.firstName[0] + (profile.lastName?.[0] ?? "")).toUpperCase()
    : "TC";

  return (
    <span
      className="tl-avatar-wrap"
      style={{ width: s.box, height: s.box, borderRadius: s.radius }}>
      {profile?.photoPath ? (
        <img
          src={`http://localhost:8080/${profile.photoPath}`}
          alt=""
          className="tl-avatar-img"
          style={{ borderRadius: s.radius }}
        />
      ) : (
        <span
          className="tl-avatar-initials"
          style={{ fontSize: s.text, borderRadius: s.radius }}>
          {initials}
        </span>
      )}
      {showStatus && (
        <span
          className="tl-avatar-status"
          style={{ width: s.status, height: s.status }}
        />
      )}
    </span>
  );
}

function RoleBadge({ label }) {
  return <span className="tl-role-badge">{label}</span>;
}

function ProfileCompletion({ profile }) {
  const { pct, checklist } = getProfileCompletion(profile);
  return (
    <div className="tl-profile-completion">
      <div className="tl-profile-completion-header">
        <span className="tl-profile-completion-label">Profile Completion</span>
        <span className="tl-profile-completion-pct">{pct}%</span>
      </div>
      <div className="tl-profile-progress-track">
        <div className="tl-profile-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="tl-profile-checklist">
        {checklist.map((item) => (
          <span
            key={item.label}
            className={`tl-profile-check-item${item.done ? " tl-profile-check-done" : ""}`}>
            <CheckCircle2 size={11} strokeWidth={2.5} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TeacherMetrics({ classCount, studentCount, loading }) {
  return (
    <div className="tl-teacher-metrics">
      <div className="tl-metric-card">
        {loading ? (
          <span className="tl-metric-skeleton" />
        ) : (
          <span className="tl-metric-value">{classCount ?? "–"}</span>
        )}
        <span className="tl-metric-label">Classes</span>
      </div>
      <div className="tl-metric-divider" />
      <div className="tl-metric-card">
        {loading ? (
          <span className="tl-metric-skeleton" />
        ) : (
          <span className="tl-metric-value">{studentCount ?? "–"}</span>
        )}
        <span className="tl-metric-label">Students</span>
      </div>
    </div>
  );
}

const teacherNotificationService = {
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

export default function TeacherLayout({ children, title = "Dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // FIX #1 — Profile now has THREE states:
  //   null     = not yet loaded (show skeleton nav)
  //   object   = loaded successfully
  // profileLoaded flag prevents flicker while isMentor resolves.
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Metrics
  const [classes, setClasses] = useState([]);
  const [studentCount, setStudentCount] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // FIX #3 — collapsed only applies on desktop
  const effectiveCollapsed = collapsed && !isMobile;

  // Dropdown refs & state
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const quickActRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickActOpen, setQuickActOpen] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Modals + toast
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Close sidebar on route change ──
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ── Close dropdowns on outside click ──
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

  // ── Close dropdowns on Escape ──
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

  // ── FIX #1 — Fetch profile and mark loaded AFTER isMentor is known ──
  useEffect(() => {
    teacherService
      .getProfile()
      .then((res) => {
        setProfile(res.data.data);
      })
      .catch(() => {
        setProfile(null);
      })
      .finally(() => {
        // Always mark loaded so the nav renders (even if profile failed)
        setProfileLoaded(true);
      });
  }, []);

  // ── Metrics ──
  useEffect(() => {
    async function fetchMetrics() {
      setMetricsLoading(true);
      try {
        const res = await teacherService.getClasses();
        const list = res.data.data || [];
        setClasses(list);
        let total = 0;
        await Promise.all(
          list.map(async (cls) => {
            try {
              const s = await teacherService.getStudentsIn(cls.id);
              total += (s.data.data || []).length;
            } catch {
              /* skip */
            }
          }),
        );
        setStudentCount(total);
      } catch {
        setClasses([]);
        setStudentCount(null);
      } finally {
        setMetricsLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  // ── Notifications ──
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await teacherNotificationService.getNotifications();
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
      await teacherNotificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {}
  }

  async function handleMarkAllRead() {
    try {
      await teacherNotificationService.markAllRead();
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

  // Display helpers
  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName ?? ""}`.trim()
    : (user?.email ?? "Teacher");

  const subjectLine = profile?.qualifications
    ? `${profile.qualifications} Teacher`
    : "Teacher";

  const roleBadgeText = getRoleBadge(profile);

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

  // FIX #1 — NAV_ITEMS derived with useMemo; only updates when profile loads.
  // While profile is loading we render a skeleton so the sidebar doesn't flash
  // wrong items.
  const NAV_ITEMS = useMemo(() => {
    if (!profileLoaded) return null; // signal: still loading
    return profile?.isMentor ? MENTOR_NAV : SUBJECT_TEACHER_NAV;
  }, [profileLoaded, profile?.isMentor]);

  const QUICK_ACTION_ITEMS = useMemo(() => {
    if (!profileLoaded) return [];
    return profile?.isMentor ? MENTOR_QUICK_ACTIONS : SUBJECT_QUICK_ACTIONS;
  }, [profileLoaded, profile?.isMentor]);

  // FIX #2 — Bottom nav also derived from profile, memoized.
  const BOTTOM_NAV = useMemo(() => {
    if (!profileLoaded) return MENTOR_BOTTOM_NAV; // safe default while loading
    return profile?.isMentor ? MENTOR_BOTTOM_NAV : SUBJECT_BOTTOM_NAV;
  }, [profileLoaded, profile?.isMentor]);

  // ── RENDER ──
  return (
    <div className={`tl-root${effectiveCollapsed ? " tl-collapsed" : ""}`}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="tl-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside
        className={`tl-sidebar${sidebarOpen ? " tl-sidebar-open" : ""}`}
        aria-label="Main navigation">
        {/* Brand */}
        <div className="tl-brand">
          <div className="tl-brand-logo" aria-hidden="true">
            <BookOpen size={18} color="#fff" strokeWidth={2} />
          </div>
          {!effectiveCollapsed && (
            <div className="tl-brand-text">
              <span className="tl-brand-name">Pariksha.io</span>
              <span className="tl-brand-role">Faculty Workspace</span>
            </div>
          )}
          {!effectiveCollapsed && !isMobile && (
            <button
              className="tl-collapse-toggle"
              onClick={() => setCollapsed((p) => !p)}
              aria-label="Collapse sidebar">
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>
          )}
          {effectiveCollapsed && (
            <button
              className="tl-expand-toggle"
              onClick={() => setCollapsed((p) => !p)}
              aria-label="Expand sidebar">
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          )}
          {isMobile && sidebarOpen && (
            <button
              className="tl-sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu">
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Nav — FIX #1: show skeleton while profile loads */}
        <nav className="tl-nav" aria-label="Sidebar navigation">
          {!NAV_ITEMS ? (
            /* Profile still loading — render placeholder rows so nothing flashes */
            <div className="tl-nav-skeleton">
              {[...Array(6)].map((_, i) => (
                <span key={i} className="tl-nav-skeleton-item" />
              ))}
            </div>
          ) : (
            NAV_ITEMS.map((group) => (
              <div
                key={group.group}
                className="tl-nav-group"
                role="group"
                aria-label={group.group}>
                {!effectiveCollapsed && (
                  <p className="tl-nav-group-label">{group.group}</p>
                )}
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      className={`tl-nav-item${active ? " tl-nav-active" : ""}`}
                      onClick={() => navigate(item.path)}
                      aria-current={active ? "page" : undefined}
                      title={effectiveCollapsed ? item.label : undefined}>
                      <item.icon
                        size={18}
                        strokeWidth={active ? 2.2 : 1.8}
                        className="tl-nav-icon"
                        aria-hidden="true"
                      />
                      {!effectiveCollapsed && (
                        <>
                          <span className="tl-nav-label">{item.label}</span>
                          {active && (
                            <ChevronRight
                              size={13}
                              strokeWidth={2.5}
                              className="tl-nav-chevron"
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
        <div className="tl-sidebar-footer">
          {!effectiveCollapsed ? (
            <div className="tl-teacher-card">
              <div className="tl-teacher-card-top">
                <TeacherAvatar profile={profile} size="md" showStatus={true} />
                <div className="tl-teacher-card-info">
                  <span className="tl-teacher-card-name">{displayName}</span>
                  <RoleBadge label={roleBadgeText} />
                  <span className="tl-teacher-card-subject">{subjectLine}</span>
                  {profile?.teacherCode && (
                    <span className="tl-teacher-card-code">
                      {profile.teacherCode}
                    </span>
                  )}
                </div>
              </div>
              <TeacherMetrics
                classCount={classes.length}
                studentCount={studentCount}
                loading={metricsLoading}
              />
            </div>
          ) : (
            <div className="tl-teacher-card-collapsed">
              <TeacherAvatar profile={profile} size="sm" showStatus={true} />
            </div>
          )}

          <button
            className="tl-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="Logout"
            title="Logout">
            <LogOut size={16} strokeWidth={2} />
            {!effectiveCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <div className="tl-main">
        <header className="tl-topbar" role="banner">
          {/* LEFT */}
          <div className="tl-topbar-left">
            <button
              className="tl-hamburger"
              onClick={() => setSidebarOpen((p) => !p)}
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              aria-expanded={sidebarOpen}>
              {sidebarOpen ? (
                <X size={20} strokeWidth={2} />
              ) : (
                <Menu size={20} strokeWidth={2} />
              )}
            </button>

            <div className="tl-title-wrap">
              <h1 className="tl-page-title">{title}</h1>
              <nav className="tl-breadcrumb" aria-label="Breadcrumb">
                <button
                  className="tl-breadcrumb-item tl-breadcrumb-home"
                  onClick={() => navigate("/teacher/dashboard")}
                  aria-label="Home">
                  <Home size={11} strokeWidth={2} aria-hidden="true" />
                </button>
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.path} className="tl-breadcrumb-segment">
                    <ChevronRight
                      size={10}
                      strokeWidth={2.5}
                      className="tl-breadcrumb-sep"
                      aria-hidden="true"
                    />
                    {i === breadcrumbs.length - 1 ? (
                      <span
                        className="tl-breadcrumb-current"
                        aria-current="page">
                        {crumb.label}
                      </span>
                    ) : (
                      <button
                        className="tl-breadcrumb-item"
                        onClick={() => navigate("/teacher/dashboard")}>
                        {crumb.label}
                      </button>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          </div>

          {/* RIGHT */}
          <div className="tl-topbar-right">
            {/* Quick Actions */}
            <div className="tl-dropdown-wrap" ref={quickActRef}>
              <button
                className="tl-quick-act-btn"
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
                <span className="tl-quick-act-label">Create</span>
                <ChevronRight
                  size={12}
                  strokeWidth={2.5}
                  className={`tl-quick-act-chevron${quickActOpen ? " tl-quick-act-chevron-open" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {quickActOpen && (
                <div className="tl-dropdown tl-quick-act-dropdown" role="menu">
                  <p className="tl-dropdown-group-label">Create new</p>
                  {QUICK_ACTION_ITEMS.map((action) => (
                    <button
                      key={action.path}
                      className="tl-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setQuickActOpen(false);
                        navigate(action.path);
                      }}>
                      <div
                        className={`tl-dropdown-item-icon ${action.colorClass}`}>
                        <action.icon
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <span className="tl-dropdown-item-label">
                          {action.label}
                        </span>
                        <span className="tl-dropdown-item-desc">
                          {action.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="tl-dropdown-wrap" ref={notifRef}>
              <button
                className="tl-icon-btn"
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
                  <span className="tl-notif-badge" aria-hidden="true">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="tl-dropdown tl-notif-dropdown"
                  role="dialog"
                  aria-label="Notifications">
                  <div className="tl-notif-header">
                    <span className="tl-notif-header-title">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="tl-notif-header-badge">
                          {unreadCount} new
                        </span>
                      )}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        className="tl-notif-mark-all"
                        onClick={handleMarkAllRead}>
                        <CheckCheck size={13} strokeWidth={2} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="tl-notif-list">
                    {notifLoading ? (
                      <div className="tl-notif-state">
                        <Spinner size="small" color="var(--teacher-primary)" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="tl-notif-state tl-notif-empty">
                        <div className="tl-notif-empty-icon">
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
                            className={`tl-notif-item${!n.read ? " tl-notif-item-unread" : ""}`}
                            onClick={() => handleMarkRead(n.id)}>
                            <div className="tl-notif-item-icon">
                              <IconComp size={14} strokeWidth={2} />
                            </div>
                            <div className="tl-notif-item-body">
                              <p className="tl-notif-item-title">{n.title}</p>
                              <p className="tl-notif-item-msg">{n.message}</p>
                              {n.createdAt && (
                                <p className="tl-notif-item-time">
                                  <Clock size={10} strokeWidth={2} />
                                  {new Date(n.createdAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            {!n.read && <span className="tl-notif-item-dot" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      className="tl-notif-footer"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate("/teacher/notifications");
                      }}>
                      View all notifications
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="tl-dropdown-wrap" ref={profileRef}>
              <button
                className="tl-profile-btn"
                onClick={() => {
                  setProfileOpen((p) => !p);
                  setNotifOpen(false);
                  setQuickActOpen(false);
                }}
                aria-haspopup="dialog"
                aria-expanded={profileOpen}
                aria-label="Account menu">
                <TeacherAvatar profile={profile} size="xs" />
              </button>

              {profileOpen && (
                <div
                  className="tl-dropdown tl-profile-dropdown"
                  role="dialog"
                  aria-label="Account menu">
                  <div className="tl-profile-dropdown-header">
                    <TeacherAvatar
                      profile={profile}
                      size="lg"
                      showStatus={true}
                    />
                    <div className="tl-profile-dropdown-info">
                      <p className="tl-profile-dropdown-name">{displayName}</p>
                      <RoleBadge label={roleBadgeText} />
                      <p className="tl-profile-dropdown-subject">
                        {subjectLine}
                      </p>
                      {profile?.teacherCode && (
                        <p className="tl-profile-dropdown-code">
                          {profile.teacherCode}
                        </p>
                      )}
                      <p className="tl-profile-dropdown-email">
                        <Mail size={11} strokeWidth={2} aria-hidden="true" />
                        {profile?.email}
                      </p>
                    </div>
                  </div>

                  <ProfileCompletion profile={profile} />
                  <div className="tl-dropdown-divider" />
                  <div className="tl-dropdown-group-label">Account</div>

                  <button
                    className="tl-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/teacher/profile");
                    }}>
                    <div className="tl-dropdown-item-icon tl-dropdown-item-icon-blue">
                      <User size={13} strokeWidth={2} />
                    </div>
                    <div>
                      <span className="tl-dropdown-item-label">My Profile</span>
                      <span className="tl-dropdown-item-desc">
                        View and edit your details
                      </span>
                    </div>
                  </button>

                  <button
                    className="tl-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/change-password");
                    }}>
                    <div className="tl-dropdown-item-icon tl-dropdown-item-icon-purple">
                      <KeyRound size={13} strokeWidth={2} />
                    </div>
                    <div>
                      <span className="tl-dropdown-item-label">
                        Change Password
                      </span>
                      <span className="tl-dropdown-item-desc">
                        Update your credentials
                      </span>
                    </div>
                  </button>

                  <div className="tl-dropdown-divider" />

                  <button
                    className="tl-dropdown-item tl-dropdown-item-danger"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      setShowLogoutConfirm(true);
                    }}>
                    <div className="tl-dropdown-item-icon tl-dropdown-item-icon-red">
                      <LogOut size={13} strokeWidth={2} />
                    </div>
                    <div>
                      <span className="tl-dropdown-item-label">Sign Out</span>
                      <span className="tl-dropdown-item-desc">
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
        <main className="tl-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* ═══ BOTTOM NAV — FIX #2: role-based ═══ */}
      <nav className="tl-bottom-nav" aria-label="Mobile navigation">
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              className={`tl-bottom-item${active ? " tl-bottom-active" : ""}`}
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}>
              <span className="tl-bottom-icon-wrap">
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
          <div className="tl-logout-confirm">
            <div className="tl-logout-confirm-icon">
              <AlertTriangle size={32} strokeWidth={1.5} color="#D69E2E" />
            </div>
            <p className="tl-logout-confirm-title">Sign out of Pariksha.io?</p>
            <p className="tl-logout-confirm-sub">
              You'll need to sign in again to access the faculty workspace.
            </p>
            <div className="tl-logout-confirm-actions">
              <button
                className="tl-logout-cancel"
                onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="tl-logout-confirm-btn" onClick={handleLogout}>
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
