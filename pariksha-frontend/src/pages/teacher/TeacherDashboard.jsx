import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Users,
  FileText,
  CalendarCheck,
  ClipboardList,
  BookOpen,
  ChevronRight,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Zap,
  GraduationCap,
  BookMarked,
  BarChart2,
  Inbox,
  BookCopy,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import teacherService from "../../services/teacherService";
import "./TeacherDashboard.css";

// ── Constants ──────────────────────────────────────────
const DAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
const WEEK_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

// ── Helpers ────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function fmtTime(t) {
  if (!t) return "—";
  return t.slice(0, 5);
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ══════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════════

function EmptyState({ icon: Icon, title, desc, actionLabel, onAction }) {
  return (
    <div className="tdb-empty">
      <div className="tdb-empty__icon">
        <Icon size={28} strokeWidth={1.4} />
      </div>
      <p className="tdb-empty__title">{title}</p>
      <span className="tdb-empty__desc">{desc}</span>
      {actionLabel && (
        <button className="tdb-empty__action" onClick={onAction}>
          <Plus size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, colorClass }) {
  return (
    <div className={`tdb-kpi-card tdb-kpi-card--${colorClass}`}>
      <div className="tdb-kpi-icon">{icon}</div>
      <div className="tdb-kpi-body">
        <span className="tdb-kpi-value">
          {value !== null && value !== undefined ? (
            value
          ) : (
            <span className="tdb-kpi-na">—</span>
          )}
        </span>
        <span className="tdb-kpi-label">{label}</span>
        {sub && <span className="tdb-kpi-sub">{sub}</span>}
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, badge, children, action, onAction }) {
  return (
    <div className="tdb-card">
      <div className="tdb-card__header">
        <div className="tdb-card__title">
          <Icon size={16} strokeWidth={2} />
          {title}
        </div>
        <div className="tdb-card__header-right">
          {badge !== undefined && (
            <span className="tdb-card__badge">{badge}</span>
          )}
          {action && (
            <button className="tdb-card__action" onClick={onAction}>
              {action} <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="tdb-card__body">{children}</div>
    </div>
  );
}

// ── Hero ───────────────────────────────────────────────
function DashboardHero({
  profile,
  isMentor,
  todayCount,
  totalClasses,
  refreshing,
  onRefresh,
}) {
  const name = profile?.firstName
    ? `${profile.firstName} ${profile.lastName ?? ""}`.trim()
    : "Teacher";

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let summary = "";
  if (isMentor) {
    if (todayCount > 0)
      summary = `You have ${todayCount} ${todayCount === 1 ? "class" : "classes"} scheduled today.`;
    else if (totalClasses > 0)
      summary = `No classes today. You are assigned to ${totalClasses} ${totalClasses === 1 ? "class" : "classes"}.`;
    else summary = "You have no classes assigned yet. Contact your admin.";
  } else {
    if (todayCount > 0)
      summary = `You have ${todayCount} subject ${todayCount === 1 ? "period" : "periods"} today. Focus on teaching!`;
    else if (totalClasses > 0)
      summary = `No periods today. You teach across ${totalClasses} ${totalClasses === 1 ? "class" : "classes"}.`;
    else summary = "No subjects assigned yet. Contact your admin.";
  }

  return (
    <div className="tdb-hero">
      <div className="tdb-hero__left">
        <div className="tdb-hero__avatar">{name.charAt(0).toUpperCase()}</div>
        <div className="tdb-hero__text">
          <span className="tdb-hero__greeting">{getGreeting()}</span>
          <h1 className="tdb-hero__name">{name}</h1>
          <div className="tdb-hero__meta-row">
            {profile?.teacherCode && (
              <span className="tdb-hero__code">{profile.teacherCode}</span>
            )}
            <span
              className={`tdb-hero__role-badge tdb-hero__role-badge--${isMentor ? "mentor" : "subject"}`}>
              {isMentor ? "Mentor Teacher" : "Subject Teacher"}
            </span>
          </div>
          <p className="tdb-hero__summary">{summary}</p>
          <span className="tdb-hero__date">{todayLabel}</span>
        </div>
      </div>
      <button
        className="tdb-hero__refresh"
        onClick={onRefresh}
        disabled={refreshing}
        title="Refresh dashboard">
        <RefreshCw size={15} className={refreshing ? "tdb-spin" : ""} />
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}

// ── Subject Teacher banner ─────────────────────────────
function SubjectTeacherBanner({ navigate }) {
  return (
    <div className="tdb-subject-banner">
      <div className="tdb-subject-banner__icon">
        <BookOpen size={20} strokeWidth={1.6} />
      </div>
      <div className="tdb-subject-banner__text">
        <span className="tdb-subject-banner__title">Subject Teacher View</span>
        <span className="tdb-subject-banner__desc">
          You have access to your question bank, exam papers, marks, and
          results. Student roster and attendance are managed by the Mentor
          Teacher of each class.
        </span>
      </div>
      <button
        className="tdb-subject-banner__btn"
        onClick={() => navigate("/teacher/papers")}>
        Create Paper <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ── Upcoming classes ───────────────────────────────────
function UpcomingClassesWidget({ todaySchedule }) {
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const upcoming = todaySchedule.filter(
    (s) => (s.timeSlotStart ?? "") >= nowStr,
  );
  const current = todaySchedule.find(
    (s) =>
      (s.timeSlotStart ?? "") <= nowStr && (s.timeSlotEnd ?? "99:99") >= nowStr,
  );

  if (!current && upcoming.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No upcoming classes"
        desc="All classes for today are done — or none scheduled."
      />
    );
  }

  return (
    <div className="tdb-upcoming">
      {current && (
        <div className="tdb-upcoming__row tdb-upcoming__row--now">
          <span className="tdb-upcoming__badge tdb-upcoming__badge--live">
            NOW
          </span>
          <div className="tdb-upcoming__info">
            <span className="tdb-upcoming__subject">{current.subject}</span>
            <span className="tdb-upcoming__meta">
              {current.className}
              {current.section ? ` · ${current.section}` : ""}
              {current.roomNumber ? ` · Room ${current.roomNumber}` : ""}
            </span>
          </div>
          <span className="tdb-upcoming__time">
            {fmtTime(current.timeSlotStart)} – {fmtTime(current.timeSlotEnd)}
          </span>
        </div>
      )}
      {upcoming.slice(0, 3).map((slot) => (
        <div key={slot.id} className="tdb-upcoming__row">
          <span className="tdb-upcoming__badge">
            {fmtTime(slot.timeSlotStart)}
          </span>
          <div className="tdb-upcoming__info">
            <span className="tdb-upcoming__subject">{slot.subject}</span>
            <span className="tdb-upcoming__meta">
              {slot.className}
              {slot.section ? ` · ${slot.section}` : ""}
              {slot.roomNumber ? ` · Room ${slot.roomNumber}` : ""}
            </span>
          </div>
          <span className="tdb-upcoming__time">
            {fmtTime(slot.timeSlotStart)} – {fmtTime(slot.timeSlotEnd)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Weekly calendar ────────────────────────────────────
function WeeklyCalendarWidget({ timetable }) {
  const todayName = DAY_NAMES[new Date().getDay()];

  const countByDay = WEEK_DAYS.reduce((acc, day) => {
    acc[day] = timetable.filter((s) => s.day === day).length;
    return acc;
  }, {});

  const max = Math.max(...Object.values(countByDay), 1);

  return (
    <div className="tdb-week">
      {WEEK_DAYS.map((day) => {
        const count = countByDay[day];
        const isToday = day === todayName;
        const pct = Math.round((count / max) * 100);
        return (
          <div
            key={day}
            className={`tdb-week__col${isToday ? " tdb-week__col--today" : ""}`}>
            <span className="tdb-week__count">{count > 0 ? count : ""}</span>
            <div className="tdb-week__bar-wrap">
              <div
                className="tdb-week__bar"
                style={{ height: count > 0 ? `${pct}%` : "4px" }}
              />
            </div>
            <span className="tdb-week__day">{day.slice(0, 3)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Pending tasks ──────────────────────────────────────
function PendingTasksWidget({
  isMentor,
  classes,
  timetable,
  papers,
  profile,
  navigate,
}) {
  const tasks = [];

  if (isMentor) {
    if (classes.length === 0)
      tasks.push({
        id: "no-class",
        icon: Layers,
        label: "No classes assigned",
        desc: "Ask your admin to assign you to a class.",
        action: null,
      });
    if (timetable.length === 0 && classes.length > 0)
      tasks.push({
        id: "no-tt",
        icon: CalendarCheck,
        label: "No timetable created",
        desc: "Create a timetable for your class.",
        action: () => navigate("/teacher/timetable"),
        actionLabel: "Create",
      });
  }

  if (papers.length === 0)
    tasks.push({
      id: "no-paper",
      icon: FileText,
      label: "No question papers created",
      desc: "Create your first exam paper.",
      action: () => navigate("/teacher/papers"),
      actionLabel: "Create",
    });

  if (!profile?.phone)
    tasks.push({
      id: "incomplete-profile",
      icon: AlertCircle,
      label: "Profile incomplete",
      desc: "Add your phone number to complete your profile.",
      action: () => navigate("/teacher/profile"),
      actionLabel: "Update",
    });

  if (tasks.length === 0) {
    return (
      <div className="tdb-tasks__done">
        <CheckCircle2 size={22} strokeWidth={1.8} />
        <span>All caught up — nothing pending!</span>
      </div>
    );
  }

  return (
    <div className="tdb-tasks">
      {tasks.map((task) => (
        <div key={task.id} className="tdb-tasks__row">
          <div className="tdb-tasks__icon">
            <task.icon size={15} />
          </div>
          <div className="tdb-tasks__text">
            <span className="tdb-tasks__label">{task.label}</span>
            <span className="tdb-tasks__desc">{task.desc}</span>
          </div>
          {task.action && (
            <button className="tdb-tasks__btn" onClick={task.action}>
              {task.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Recent papers ──────────────────────────────────────
function RecentPapersWidget({ papers, navigate }) {
  if (papers.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No papers created yet"
        desc="Create your first question paper to get started."
        actionLabel="Create Paper"
        onAction={() => navigate("/teacher/papers")}
      />
    );
  }

  const recent = [...papers]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="tdb-papers">
      {recent.map((p) => (
        <div key={p.id} className="tdb-papers__row">
          <div className="tdb-papers__icon">
            <FileText size={15} />
          </div>
          <div className="tdb-papers__info">
            <span className="tdb-papers__title">{p.title}</span>
            <span className="tdb-papers__meta">
              {p.subject}
              {p.className ? ` · ${p.className}` : ""}
              {p.section ? ` ${p.section}` : ""}
              {" · "}
              {fmtDate(p.createdAt)}
            </span>
          </div>
          <div className="tdb-papers__right">
            {p.aiGenerated && <span className="tdb-papers__ai-badge">AI</span>}
            <span className="tdb-papers__marks">{p.totalMarks} Marks</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Quick Actions ──────────────────────────────────────
function QuickCreatePanel({ isMentor, navigate }) {
  const mentorActions = [
    {
      icon: BookMarked,
      label: "Question",
      desc: "Add to bank",
      path: "/teacher/questions",
      colorClass: "qa--purple",
    },
    {
      icon: FileText,
      label: "Paper",
      desc: "Create exam",
      path: "/teacher/papers",
      colorClass: "qa--blue",
    },
    {
      icon: CalendarCheck,
      label: "Attendance",
      desc: "Mark today",
      path: "/teacher/attendance",
      colorClass: "qa--teal",
    },
    {
      icon: ClipboardList,
      label: "Marks",
      desc: "Enter results",
      path: "/teacher/marks",
      colorClass: "qa--indigo",
    },
    {
      icon: Users,
      label: "Students",
      desc: "View roster",
      path: "/teacher/students",
      colorClass: "qa--cyan",
    },
  ];

  const subjectActions = [
    {
      icon: BookMarked,
      label: "Question",
      desc: "Add to bank",
      path: "/teacher/questions",
      colorClass: "qa--purple",
    },
    {
      icon: FileText,
      label: "Paper",
      desc: "Create exam",
      path: "/teacher/papers",
      colorClass: "qa--blue",
    },
    {
      icon: ClipboardList,
      label: "Marks",
      desc: "Enter marks",
      path: "/teacher/marks",
      colorClass: "qa--indigo",
    },
    {
      icon: BarChart2,
      label: "Results",
      desc: "View results",
      path: "/teacher/results",
      colorClass: "qa--teal",
    },
  ];

  const actions = isMentor ? mentorActions : subjectActions;

  return (
    <div className={`tdb-qa-grid tdb-qa-grid--${isMentor ? "5" : "4"}`}>
      {actions.map((a) => (
        <button
          key={a.path}
          className={`tdb-qa-card ${a.colorClass}`}
          onClick={() => navigate(a.path)}>
          <div className="tdb-qa-icon-wrap">
            <a.icon size={22} strokeWidth={1.8} />
          </div>
          <div className="tdb-qa-text">
            <span className="tdb-qa-label">{a.label}</span>
            <span className="tdb-qa-desc">{a.desc}</span>
          </div>
          <ChevronRight size={14} className="tdb-qa-arrow" />
        </button>
      ))}
    </div>
  );
}

// ── Activity feed ──────────────────────────────────────
function ActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="tdb-activity__empty">
        <Inbox size={28} strokeWidth={1.3} />
        <span>No recent activity available.</span>
      </div>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case "STUDENT":
        return Users;
      case "ATTENDANCE":
        return CalendarCheck;
      case "MARKS":
        return ClipboardList;
      case "PAPER":
        return FileText;
      default:
        return Inbox;
    }
  };

  return (
    <div className="tdb-activity">
      {activities.map((activity, index) => {
        const Icon = getIcon(activity.type);
        return (
          <div key={`${activity.type}-${index}`} className="tdb-activity__row">
            <div className="tdb-activity__icon">
              <Icon size={14} />
            </div>
            <div className="tdb-activity__text">
              <span className="tdb-activity__label">{activity.title}</span>
              <span className="tdb-activity__desc">{activity.description}</span>
              <span className="tdb-activity__time">
                {fmtDate(activity.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Class overview cards ───────────────────────────────
function ClassOverviewCards({ isMentor, profile, classes, navigate }) {
  if (classes.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No classes assigned"
        desc="Contact your admin to get assigned to a class."
      />
    );
  }

  return (
    <div className="tdb-classes">
      {classes.map((cls) => {
        const isMyMentorClass =
          isMentor && cls.mentorTeacherId === profile?.userId;

        return (
          <div key={cls.id} className="tdb-classes__card">
            <div className="tdb-classes__card-top">
              <div className="tdb-classes__avatar">
                {(cls.className ?? "CL").slice(0, 2).toUpperCase()}
              </div>
              <div className="tdb-classes__info">
                <span className="tdb-classes__name">
                  {cls.className}
                  {cls.section ? ` — ${cls.section}` : ""}
                </span>
                <span
                  className={`tdb-classes__role-chip tdb-classes__role-chip--${isMyMentorClass ? "mentor" : "subject"}`}>
                  {isMyMentorClass ? "My Mentor Class" : "Subject Teacher"}
                </span>
                {cls.mentorTeacherName && !isMyMentorClass && (
                  <span className="tdb-classes__mentor">
                    Mentor: {cls.mentorTeacherName}
                  </span>
                )}
                {cls.subjectTeachers?.length > 0 && (
                  <div className="tdb-classes__subjects">
                    {cls.subjectTeachers.map((s) => (
                      <span
                        key={s.id ?? s.subject}
                        className="tdb-classes__subject-chip">
                        {s.subject}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="tdb-classes__actions">
              {isMyMentorClass ? (
                <>
                  <button onClick={() => navigate("/teacher/students")}>
                    <Users size={13} />
                    <span>Students</span>
                  </button>
                  <button onClick={() => navigate("/teacher/attendance")}>
                    <CalendarCheck size={13} />
                    <span>Attendance</span>
                  </button>
                  <button onClick={() => navigate("/teacher/marks")}>
                    <ClipboardList size={13} />
                    <span>Marks</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate("/teacher/marks")}>
                    <ClipboardList size={13} />
                    <span>Marks</span>
                  </button>
                  <button onClick={() => navigate("/teacher/papers")}>
                    <FileText size={13} />
                    <span>Papers</span>
                  </button>
                  <button onClick={() => navigate("/teacher/results")}>
                    <BarChart2 size={13} />
                    <span>Results</span>
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ══════════════════════════════════════════════════════
export default function TeacherDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [activities, setActivities] = useState([]);

  const fetchAll = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      const [profileRes, classRes, ttRes, paperRes, activityRes] =
        await Promise.all([
          teacherService.getProfile(),
          teacherService.getClasses(),
          teacherService.getMyTimetable(),
          teacherService.getMyPapers
            ? teacherService.getMyPapers()
            : Promise.resolve({ data: { data: [] } }),
          teacherService.getRecentActivities(),
        ]);

      setProfile(profileRes.data.data ?? null);
      setClasses(classRes.data.data ?? []);
      setTimetable(ttRes.data.data ?? []);
      setPapers(paperRes.data.data ?? []);
      setActivities(activityRes.data.data ?? []);

      if (isRefresh)
        setToast({ message: "Dashboard refreshed.", type: "success" });
    } catch {
      setToast({ message: "Failed to load dashboard.", type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isMentor = profile?.isMentor === true;
  const todayName = DAY_NAMES[new Date().getDay()];
  const todaySchedule = timetable
    .filter((s) => s.day === todayName)
    .sort((a, b) =>
      (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? ""),
    );
  const totalStudents = classes.reduce(
    (sum, cls) => sum + (cls.totalStudents || 0),
    0,
  );
  const mySubjects = [
    ...new Set(timetable.map((s) => s.subject).filter(Boolean)),
  ];

  if (loading) {
    return (
      <TeacherLayout title="Dashboard">
        <div className="tdb-loading">
          <Spinner />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="Dashboard">
      <div className="tdb-page">
        {/* 1 ── Hero */}
        <DashboardHero
          profile={profile}
          isMentor={isMentor}
          todayCount={todaySchedule.length}
          totalClasses={classes.length}
          refreshing={refreshing}
          onRefresh={() => fetchAll(true)}
        />

        {/* 2 ── Subject teacher banner */}
        {!isMentor && <SubjectTeacherBanner navigate={navigate} />}

        {/* 3 ── KPI row */}
        <div className="tdb-kpi-grid">
          {isMentor ? (
            <>
              <KpiCard
                icon={<Layers size={20} />}
                label="Assigned Classes"
                value={classes.length}
                sub="Total classes"
                colorClass="blue"
              />
              <KpiCard
                icon={<Users size={20} />}
                label="Students"
                value={totalStudents}
                sub="Across all classes"
                colorClass="cyan"
              />
              <KpiCard
                icon={<CalendarCheck size={20} />}
                label="Today's Classes"
                value={todaySchedule.length}
                sub={todaySchedule.length === 0 ? "Free today" : "Scheduled"}
                colorClass="teal"
              />
              <KpiCard
                icon={<FileText size={20} />}
                label="Papers Created"
                value={papers.length}
                sub="Question papers"
                colorClass="indigo"
              />
              <KpiCard
                icon={<BarChart2 size={20} />}
                label="Weekly Classes"
                value={timetable.length}
                sub="Timetable entries"
                colorClass="blue"
              />
            </>
          ) : (
            <>
              <KpiCard
                icon={<BookCopy size={20} />}
                label="Subjects I Teach"
                value={mySubjects.length}
                sub="Across classes"
                colorClass="blue"
              />
              <KpiCard
                icon={<Layers size={20} />}
                label="Classes Assigned"
                value={classes.length}
                sub="As subject teacher"
                colorClass="cyan"
              />
              <KpiCard
                icon={<CalendarCheck size={20} />}
                label="Today's Periods"
                value={todaySchedule.length}
                sub={todaySchedule.length === 0 ? "Free today" : "Scheduled"}
                colorClass="teal"
              />
              <KpiCard
                icon={<FileText size={20} />}
                label="Papers Created"
                value={papers.length}
                sub="Question papers"
                colorClass="indigo"
              />
            </>
          )}
        </div>

        {/* 4 ── Quick Actions */}
        <Card title="Quick Actions" icon={Zap}>
          <QuickCreatePanel isMentor={isMentor} navigate={navigate} />
        </Card>

        {/* 5 ── Main two-column grid */}
        <div className="tdb-main-grid">
          <div className="tdb-col">
            <Card
              title="Upcoming Today"
              icon={Clock}
              badge={todaySchedule.length}>
              <UpcomingClassesWidget todaySchedule={todaySchedule} />
            </Card>
            <Card title="Weekly Schedule" icon={CalendarCheck}>
              <WeeklyCalendarWidget timetable={timetable} />
            </Card>
            <Card
              title="Recent Papers"
              icon={FileText}
              badge={papers.length}
              action={papers.length > 0 ? "View all" : undefined}
              onAction={() => navigate("/teacher/papers")}>
              <RecentPapersWidget papers={papers} navigate={navigate} />
            </Card>
          </div>

          <div className="tdb-col">
            <Card title="Recent Activity" icon={Inbox}>
              <ActivityFeed activities={activities} />
            </Card>
            <Card title="Pending Tasks" icon={AlertCircle}>
              <PendingTasksWidget
                isMentor={isMentor}
                classes={classes}
                timetable={timetable}
                papers={papers}
                profile={profile}
                navigate={navigate}
              />
            </Card>
          </div>
        </div>

        {/* 6 ── Class overview */}
        <Card
          title={isMentor ? "Assigned Classes" : "Classes I Teach In"}
          icon={GraduationCap}
          badge={`${classes.length} total`}>
          <ClassOverviewCards
            isMentor={isMentor}
            profile={profile}
            classes={classes}
            navigate={navigate}
          />
        </Card>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </TeacherLayout>
  );
}
