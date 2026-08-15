import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  UserPlus,
  Brain,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Toast from "../../components/shared/Toast";
import adminService from "../../services/adminService";

import StatCard from "./dashboard/StatCard";
import SchoolHealthCard from "./dashboard/SchoolHealthCard";
import AttentionPanel from "./dashboard/AttentionPanel";
import RecentRegistrations from "./dashboard/RecentRegistrations";
import QuickSearch from "./dashboard/QuickSearch";
import { SkeletonStatCard, SkeletonCard } from "./dashboard/SkeletonCard";

import "./AdminDashboard.css";

// ── Animated counter hook ──
function useCounter(target, duration = 1200, trigger = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger || target === 0) {
      setCount(0);
      return;
    }
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - prog, 3);
      setCount(Math.floor(eased * target));
      if (prog < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, trigger, duration]);
  return count;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [data, setData] = useState({
    teachers: [],
    students: [],
    classes: [],
    pendingStudents: [],
  });
  const [counted, setCounted] = useState(false);
  const statsRef = useRef(null);

  // ── Fetch all data ──
  const fetchAll = useCallback(async (showToastOnError = true) => {
    try {
      const [teachersRes, studentsRes, classesRes, pendingRes] =
        await Promise.all([
          adminService.getAllTeachers(),
          adminService.getAllStudents(),
          adminService.getAllClasses(),
          adminService.getPending(),
        ]);
      setData({
        teachers: teachersRes.data.data || [],
        students: studentsRes.data.data || [],
        classes: classesRes.data.data || [],
        pendingStudents: pendingRes.data.data || [],
      });
      setLastUpdated(new Date());
    } catch (err) {
      if (showToastOnError) {
        setToast({
          type: "error",
          message:
            err.response?.data?.message || "Failed to load dashboard data.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Trigger counters on scroll ──
  useEffect(() => {
    if (loading) return;
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setCounted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading]);

  // Active students (memoized — avoid recompute on every render)
  const activeStudents = useMemo(
    () => data.students.filter((s) => s.status === "ACTIVE"),
    [data.students],
  );

  // Counters
  const cTeachers = useCounter(data.teachers.length, 1000, counted);
  const cStudents = useCounter(activeStudents.length, 1000, counted);
  const cClasses = useCounter(data.classes.length, 800, counted);
  const cPending = useCounter(data.pendingStudents.length, 800, counted);

  // ── Stat cards (memoized) ──
  const STATS = useMemo(
    () => [
      {
        label: "Total Teachers",
        value: cTeachers,
        icon: Users,
        color: "var(--admin-primary)",
        bg: "var(--admin-accent)",
        trend: null,
        action: "/admin/teachers",
        actionLabel: "View all",
      },
      {
        label: "Active Students",
        value: cStudents,
        icon: GraduationCap,
        color: "#1D9E75",
        bg: "#EAF4F0",
        trend: null,
        action: "/admin/students",
        actionLabel: "View all",
      },
      {
        label: "Classes",
        value: cClasses,
        icon: BookOpen,
        color: "#185FA5",
        bg: "#E6F1FB",
        trend: null,
        action: "/admin/classes",
        actionLabel: "Manage",
      },
      {
        label: "Pending Approval",
        value: cPending,
        icon: Clock,
        color: "#D69E2E",
        bg: "#FFFBEB",
        trend: data.pendingStudents.length > 0 ? "Needs attention" : null,
        action: "/admin/pending",
        actionLabel: "Review",
        alert: data.pendingStudents.length > 0,
      },
    ],
    [cTeachers, cStudents, cClasses, cPending, data.pendingStudents.length],
  );

  function formatLastUpdated(date) {
    if (!date) return "";
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 10) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  async function handleRefresh() {
    setToast(null);
    await fetchAll();
    setToast({ type: "success", message: "Dashboard refreshed." });
  }

  // ════════════════════════════════════════
  //   LOADING STATE — skeletons, not spinner
  // ════════════════════════════════════════
  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="ad-welcome">
          <div className="ad-welcome-left">
            <div
              className="ad-skeleton-line ad-skeleton-line-lg"
              style={{ width: 240, marginBottom: 8 }}
            />
            <div
              className="ad-skeleton-line ad-skeleton-line-sm"
              style={{ width: 320 }}
            />
          </div>
        </div>

        <div className="ad-stats">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} delay={i * 0.05} />
          ))}
        </div>

        <div className="ad-grid-2">
          <SkeletonCard rows={4} />
          <SkeletonCard rows={4} />
        </div>
        <SkeletonCard rows={3} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Welcome bar ── */}
      <div className="ad-welcome">
        <div className="ad-welcome-left">
          <h2 className="ad-welcome-title">Good morning, Administrator 👋</h2>
          <p className="ad-welcome-sub">
            Here's what's happening across your school today.
          </p>
        </div>

        <div className="ad-welcome-right">
          {lastUpdated && (
            <span className="ad-last-updated">
              Updated {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <button
            className="ad-refresh-btn"
            onClick={handleRefresh}
            title="Refresh dashboard data">
            <RefreshCw size={15} strokeWidth={2} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Quick Search ── */}
      <QuickSearch
        teachers={data.teachers}
        students={data.students}
        classes={data.classes}
      />

      {/* ── Stat cards ── */}
      <div className="ad-stats" ref={statsRef}>
        {STATS.map((s, i) => (
          <StatCard key={s.label} stat={s} index={i} />
        ))}
      </div>

      {/* ── School Health + Attention Required ── */}
      <div className="ad-grid-2">
        <SchoolHealthCard
          classes={data.classes}
          pendingCount={data.pendingStudents.length}
        />
        <AttentionPanel
          classes={data.classes}
          pendingStudents={data.pendingStudents}
        />
      </div>

      {/* ── Recent Teachers + Pending Approvals ── */}
      <div className="ad-grid-2">
        {/* Recent Teachers */}
        <div className="ad-card">
          <div className="ad-card-header">
            <div className="ad-card-title-wrap">
              <Users size={17} strokeWidth={2} color="var(--admin-primary)" />
              <h3 className="ad-card-title">Recent Teachers</h3>
            </div>
            <Link to="/admin/teachers" className="ad-card-link">
              View all <ArrowUpRight size={13} strokeWidth={2.5} />
            </Link>
          </div>

          {data.teachers.length === 0 ? (
            <div className="ad-empty">
              <Users size={32} strokeWidth={1.4} />
              <p>No teachers added yet</p>
              <Link to="/admin/teachers" className="ad-empty-cta">
                Add First Teacher
              </Link>
            </div>
          ) : (
            <div className="ad-list">
              {[...data.teachers]
                .sort((a, b) => b.id - a.id)
                .slice(0, 5)
                .map((t) => (
                  <div key={t.id} className="ad-list-item">
                    <div
                      className="ad-list-avatar"
                      style={{
                        background: "var(--admin-accent)",
                        color: "var(--admin-text)",
                      }}>
                      {t.firstName?.charAt(0)?.toUpperCase() || "T"}
                      {t.lastName?.charAt(0)?.toUpperCase() || ""}
                    </div>
                    <div className="ad-list-info">
                      <p className="ad-list-name">
                        {t.firstName} {t.lastName}
                      </p>
                      <p className="ad-list-sub">{t.email}</p>
                    </div>
                    <span className="ad-list-code">{t.teacherCode}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="ad-card">
          <div className="ad-card-header">
            <div className="ad-card-title-wrap">
              <Clock size={17} strokeWidth={2} color="#D69E2E" />
              <h3 className="ad-card-title">Pending Approvals</h3>
            </div>
            {data.pendingStudents.length > 0 && (
              <Link
                to="/admin/pending"
                className="ad-card-link ad-card-link-warn">
                Review all <ArrowUpRight size={13} strokeWidth={2.5} />
              </Link>
            )}
          </div>

          {data.pendingStudents.length === 0 ? (
            <div className="ad-empty ad-empty-good">
              <CheckCircle size={32} strokeWidth={1.4} color="#38A169" />
              <p>All caught up! No pending approvals.</p>
            </div>
          ) : (
            <div className="ad-list">
              {data.pendingStudents.slice(0, 5).map((s) => (
                <div key={s.id} className="ad-list-item">
                  <div
                    className="ad-list-avatar"
                    style={{ background: "#FFFBEB", color: "#92400E" }}>
                    {s.firstName?.charAt(0)?.toUpperCase() || "S"}
                    {s.lastName?.charAt(0)?.toUpperCase() || ""}
                  </div>
                  <div className="ad-list-info">
                    <p className="ad-list-name">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="ad-list-sub">
                      Class {s.className} · {s.section}
                    </p>
                  </div>
                  <span className="ad-list-pending-badge">Pending</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Registrations ── */}
      <RecentRegistrations teachers={data.teachers} students={data.students} />

      {/* ── Classes Overview ── */}
      <div className="ad-card ad-card-full">
        <div className="ad-card-header">
          <div className="ad-card-title-wrap">
            <BookOpen size={17} strokeWidth={2} color="#185FA5" />
            <h3 className="ad-card-title">Classes Overview</h3>
          </div>
          <Link to="/admin/classes" className="ad-card-link ad-card-link-blue">
            Manage <ArrowUpRight size={13} strokeWidth={2.5} />
          </Link>
        </div>

        {data.classes.length === 0 ? (
          <div className="ad-empty">
            <BookOpen size={32} strokeWidth={1.4} />
            <p>No classes created yet</p>
            <Link to="/admin/classes" className="ad-empty-cta">
              Create First Class
            </Link>
          </div>
        ) : (
          <div className="ad-classes-grid">
            {data.classes.map((cls) => (
              <div key={cls.id} className="ad-class-card">
                <div className="ad-class-header">
                  <div className="ad-class-icon">
                    <BookOpen size={18} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="ad-class-name">Class {cls.className}</p>
                    <p className="ad-class-section">Section {cls.section}</p>
                  </div>
                </div>

                <div className="ad-class-mentor">
                  {cls.mentorTeacherName ? (
                    <>
                      <CheckCircle
                        size={13}
                        strokeWidth={2.5}
                        color="#38A169"
                      />
                      <span>{cls.mentorTeacherName}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle
                        size={13}
                        strokeWidth={2.5}
                        color="#D69E2E"
                      />
                      <span className="ad-class-no-mentor">
                        No mentor assigned
                      </span>
                    </>
                  )}
                </div>

                <div className="ad-class-subjects">
                  <span className="ad-class-subjects-count">
                    {cls.subjectTeachers?.length || 0} subject{" "}
                    {cls.subjectTeachers?.length === 1 ? "teacher" : "teachers"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="ad-card ad-card-full">
        <div className="ad-card-header">
          <div className="ad-card-title-wrap">
            <Brain size={17} strokeWidth={2} color="var(--admin-primary)" />
            <h3 className="ad-card-title">Quick Actions</h3>
          </div>
        </div>

        <div className="ad-quick-grid">
          {[
            {
              icon: UserPlus,
              label: "Add Teacher",
              desc: "Create a new teacher account",
              href: "/admin/teachers",
              color: "var(--admin-primary)",
              bg: "var(--admin-accent)",
            },
            {
              icon: GraduationCap,
              label: "Add Student",
              desc: "Create a new student account",
              href: "/admin/students",
              color: "#1D9E75",
              bg: "#EAF4F0",
            },
            {
              icon: BookOpen,
              label: "New Class",
              desc: "Create a new classroom",
              href: "/admin/classes",
              color: "#185FA5",
              bg: "#E6F1FB",
            },
            {
              icon: Clock,
              label: "Review Pending",
              desc: "Approve student registrations",
              href: "/admin/pending",
              color: "#D69E2E",
              bg: "#FFFBEB",
            },
          ].map((a) => (
            <Link key={a.label} to={a.href} className="ad-quick-card">
              <div
                className="ad-quick-icon"
                style={{ background: a.bg, color: a.color }}>
                <a.icon size={22} strokeWidth={1.8} />
              </div>
              <div>
                <p className="ad-quick-label">{a.label}</p>
                <p className="ad-quick-desc">{a.desc}</p>
              </div>
              <ArrowUpRight
                size={16}
                strokeWidth={2.5}
                className="ad-quick-arrow"
                style={{ color: a.color }}
              />
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
