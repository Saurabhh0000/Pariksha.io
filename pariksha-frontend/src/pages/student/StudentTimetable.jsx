import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  AlertCircle,
  RefreshCw,
  PartyPopper,
  Radio,
  CheckCircle2,
  Sparkles,
  Calculator,
  Atom,
  FlaskConical,
  Leaf,
  BookOpen,
  Monitor,
  Landmark,
  Globe,
  BookMarked,
  Moon,
} from "lucide-react";
import StudentLayout from "../../components/student/StudentLayout";
import studentService from "../../services/studentService";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import "./StudentTimetable.css";

const DAYS = [
  { key: "MONDAY", label: "Mon", full: "Monday" },
  { key: "TUESDAY", label: "Tue", full: "Tuesday" },
  { key: "WEDNESDAY", label: "Wed", full: "Wednesday" },
  { key: "THURSDAY", label: "Thu", full: "Thursday" },
  { key: "FRIDAY", label: "Fri", full: "Friday" },
  { key: "SATURDAY", label: "Sat", full: "Saturday" },
  { key: "SUNDAY", label: "Sun", full: "Sunday" },
];

// Fixed, consistent palette — same subject always resolves to the same
// color via a simple string hash, no randomness.
const SUBJECT_PALETTE = [
  { bg: "#DBEAFE", fg: "#2563EB" }, // blue
  { bg: "#EDE9FE", fg: "#7C3AED" }, // purple
  { bg: "#FFEDD5", fg: "#EA580C" }, // orange
  { bg: "#DCFCE7", fg: "#16A34A" }, // green
  { bg: "#E0E7FF", fg: "#4F46E5" }, // indigo
  { bg: "#FCE7F3", fg: "#DB2777" }, // pink
  { bg: "#FEF9C3", fg: "#A16207" }, // amber
];

function getSubjectColor(subject) {
  if (!subject) return SUBJECT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}
// Subject → icon + fixed brand color, matched by keyword. Falls back to
// the hash-based palette (still deterministic) for unlisted subjects.
const SUBJECT_ICON_MAP = [
  { keywords: ["math"], icon: Calculator, bg: "#DBEAFE", fg: "#2563EB" },
  { keywords: ["physic"], icon: Atom, bg: "#EDE9FE", fg: "#7C3AED" },
  { keywords: ["chem"], icon: FlaskConical, bg: "#DCFCE7", fg: "#16A34A" },
  { keywords: ["bio"], icon: Leaf, bg: "#D1FAE5", fg: "#059669" },
  {
    keywords: ["english", "literat"],
    icon: BookOpen,
    bg: "#FFEDD5",
    fg: "#EA580C",
  },
  {
    keywords: ["computer", "coding", "programming", "cs"],
    icon: Monitor,
    bg: "#E0E7FF",
    fg: "#4F46E5",
  },
  { keywords: ["history"], icon: Landmark, bg: "#F0E4D3", fg: "#92400E" },
  { keywords: ["geograph"], icon: Globe, bg: "#CFFAFE", fg: "#0891B2" },
];

function getSubjectMeta(subject) {
  if (!subject) {
    return {
      Icon: BookMarked,
      bg: "#F1F5F9",
      fg: "#64748B",
    };
  }

  const lower = subject.toLowerCase();

  const found = SUBJECT_ICON_MAP.find((s) =>
    s.keywords.some((k) => lower.includes(k)),
  );

  if (found) {
    return {
      Icon: found.icon,
      bg: found.bg,
      fg: found.fg,
    };
  }

  const fallback = getSubjectColor(subject);

  return {
    Icon: BookMarked,
    bg: fallback.bg,
    fg: fallback.fg,
  };
}

function getInitials(name) {
  if (!name) return "T";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getTodayKey() {
  const idx = new Date().getDay(); // 0 = Sunday
  return DAYS[idx === 0 ? 6 : idx - 1].key;
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${suffix}`;
}

function isSlotCurrent(slot, dayKey) {
  if (dayKey !== getTodayKey()) return false;
  if (!slot.timeSlotStart || !slot.timeSlotEnd) return false;
  const currentTimeStr = new Date().toTimeString().slice(0, 5);
  const start = slot.timeSlotStart.slice(0, 5);
  const end = slot.timeSlotEnd.slice(0, 5);
  return currentTimeStr >= start && currentTimeStr <= end;
}

function isSlotPast(slot, dayKey) {
  if (dayKey !== getTodayKey()) return false;
  if (!slot.timeSlotEnd) return false;
  const currentTimeStr = new Date().toTimeString().slice(0, 5);
  return currentTimeStr > slot.timeSlotEnd.slice(0, 5);
}

// "HH:mm:ss" / "HH:mm" -> minutes since midnight
function toMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning 🌞";
  if (hour < 17) return "Good Afternoon ☀️";
  return "Good Evening 🌙";
}

// ── Rotating motivational copy — purely presentational, picks a
// deterministic index that changes every 5 minutes so it feels "alive"
// without flickering on every re-render. ──
const MESSAGES_GENERAL = [
  "Stay focused. Every lesson today builds your future.",
  "Learn something today that your future self will thank you for.",
  "One class at a time. One step closer to success.",
  "Consistency beats talent when talent doesn't work hard.",
];
const MESSAGES_ALMOST_DONE = [
  "Almost there! Finish today's final class strong.",
];
const MESSAGES_ALL_DONE = [
  "Excellent work! You've completed today's learning journey.",
  "No more classes today. Enjoy your evening and recharge.",
];
const MESSAGES_NO_CLASSES = [
  "🎉 No classes scheduled today.",
  "Take time to relax, revise, or learn something new.",
  "Every great learner also knows when to recharge.",
];

function pickRotating(arr) {
  const idx = Math.floor(Date.now() / (5 * 60 * 1000)) % arr.length;
  return arr[idx];
}

// ─────────────────────────────────────────────
//  Loading skeleton
// ─────────────────────────────────────────────
function TimetableSkeleton() {
  return (
    <>
      <div className="stt-skel-hero" />
      <div className="stt-skel-feature-row">
        <div className="stt-skel-feature" />
        <div className="stt-skel-feature" />
      </div>
      <div className="stt-day-tabs stt-day-tabs-skel">
        {DAYS.map((d) => (
          <div key={d.key} className="stt-day-tab-skel" />
        ))}
      </div>
      <div className="stt-skel-list">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stt-skel-row" />
        ))}
      </div>
    </>
  );
}

export default function StudentTimetable() {
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [timetable, setTimetable] = useState([]);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedDay, setSelectedDay] = useState(getTodayKey());

  // Ticks every 60s purely to force a re-render so countdowns / live
  // status stay fresh without a refetch. No API call happens here.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadTimetable = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await studentService.getTimetable();
      setTimetable(res.data.data || []);
      if (isRetry) {
        setToast({
          type: "success",
          message: "Timetable refreshed successfully 🚀",
        });
      }
    } catch (err) {
      const isNetworkIssue = !err?.response;
      setError(
        isNetworkIssue
          ? "Connection problem. Check your internet and retry."
          : "Unable to load your timetable.",
      );
      if (isRetry) {
        setToast({
          type: "error",
          message: isNetworkIssue
            ? "Connection problem. Check your internet and retry."
            : "Unable to load your timetable.",
        });
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    loadTimetable(false);
  }, [loadTimetable]);

  const groupedByDay = useMemo(() => {
    const map = {};
    DAYS.forEach((d) => (map[d.key] = []));
    timetable.forEach((slot) => {
      const key = (slot.day || "").toUpperCase();
      if (map[key]) map[key].push(slot);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) =>
        (a.timeSlotStart || "").localeCompare(b.timeSlotStart || ""),
      );
    });
    return map;
  }, [timetable]);

  const todayKey = getTodayKey();
  const todaySlots = groupedByDay[todayKey] || [];
  const selectedSlots = groupedByDay[selectedDay] || [];

  // ── Today's progress, current class, next class — all derived
  // from the real timetable array, recomputed on each tick ──
  const { completedCount, currentClass, nextClass, progressPct } =
    useMemo(() => {
      // eslint-disable-next-line no-unused-expressions
      tick; // dependency touch — forces recompute every minute
      const nowMin = nowMinutes();
      let completed = 0;
      let current = null;
      let upcoming = null;

      todaySlots.forEach((slot) => {
        const start = toMinutes(slot.timeSlotStart);
        const end = toMinutes(slot.timeSlotEnd);
        if (nowMin > end) {
          completed += 1;
        } else if (nowMin >= start && nowMin <= end) {
          current = slot;
        } else if (!upcoming && start > nowMin) {
          upcoming = slot;
        }
      });

      const pct = todaySlots.length
        ? Math.round((completed / todaySlots.length) * 100)
        : 0;

      return {
        completedCount: completed,
        currentClass: current,
        nextClass: upcoming,
        progressPct: pct,
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todaySlots, tick]);

  const currentRemainingMin = currentClass
    ? Math.max(0, toMinutes(currentClass.timeSlotEnd) - nowMinutes())
    : null;
  const nextStartsInMin = nextClass
    ? Math.max(0, toMinutes(nextClass.timeSlotStart) - nowMinutes())
    : null;
  const nextDurationMin = nextClass
    ? toMinutes(nextClass.timeSlotEnd) - toMinutes(nextClass.timeSlotStart)
    : null;

  const runningCount = currentClass ? 1 : 0;
  const remainingCount = Math.max(
    0,
    todaySlots.length - completedCount - runningCount,
  );

  // ── Motivational message selection (rotates every 5 min) ──
  const motivationalMessage = useMemo(() => {
    // eslint-disable-next-line no-unused-expressions
    tick;
    if (todaySlots.length === 0) return pickRotating(MESSAGES_NO_CLASSES);
    if (remainingCount === 0 && !currentClass)
      return pickRotating(MESSAGES_ALL_DONE);
    if (remainingCount === 1 && !currentClass) return MESSAGES_ALMOST_DONE[0];
    return pickRotating(MESSAGES_GENERAL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaySlots.length, remainingCount, currentClass, tick]);

  const today = new Date();
  const todayDayLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
  });
  const todayDateShort = today.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });

  const isTodaySelected = selectedDay === todayKey;
  const selectedDayFull = DAYS.find((d) => d.key === selectedDay)?.full;

  return (
    <StudentLayout title="Timetable">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loading ? (
        <TimetableSkeleton />
      ) : error ? (
        <div className="stt-error-state">
          <div className="stt-error-icon">
            <AlertCircle size={32} strokeWidth={1.6} />
          </div>
          <h3>We couldn't load today's schedule.</h3>
          <p>Your timetable is safe. Please try again.</p>
          <button
            className="stt-retry-btn"
            onClick={() => loadTimetable(true)}
            disabled={retrying}
            aria-label="Retry loading timetable">
            {retrying ? (
              <Spinner size="small" color="#fff" />
            ) : (
              <>
                <RefreshCw size={15} strokeWidth={2.2} /> Retry
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="stt-planner">
          {/* ── HERO CARD ── */}
          <div className="stt-hero stt-fade-in">
            <div className="stt-hero-decor" aria-hidden="true" />
            <div className="stt-hero-content">
              <p className="stt-hero-greeting">{getGreeting()}</p>
              <h1 className="stt-hero-date">
                {todayDayLabel} • {todayDateShort}
              </h1>
              <p className="stt-hero-quote">
                <Sparkles size={13} strokeWidth={2.2} />
                {motivationalMessage}
              </p>

              <div
                className="stt-hero-stats"
                role="group"
                aria-label="Today's class summary">
                <div className="stt-hero-stat">
                  <span className="stt-hero-stat-value">
                    {todaySlots.length}
                  </span>
                  <span className="stt-hero-stat-label">Classes</span>
                </div>
                <div className="stt-hero-stat-divider" />
                <div className="stt-hero-stat">
                  <span className="stt-hero-stat-value">{completedCount}</span>
                  <span className="stt-hero-stat-label">Completed</span>
                </div>
                <div className="stt-hero-stat-divider" />
                <div className="stt-hero-stat">
                  <span className="stt-hero-stat-value">{runningCount}</span>
                  <span className="stt-hero-stat-label">Running</span>
                </div>
                <div className="stt-hero-stat-divider" />
                <div className="stt-hero-stat">
                  <span className="stt-hero-stat-value">{remainingCount}</span>
                  <span className="stt-hero-stat-label">Remaining</span>
                </div>
              </div>

              {todaySlots.length > 0 && (
                <div className="stt-hero-progress">
                  <div
                    className="stt-hero-progress-track"
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}>
                    <div
                      className="stt-hero-progress-bar"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="stt-hero-progress-label">
                    {completedCount}/{todaySlots.length} classes completed ·{" "}
                    {progressPct}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── CURRENT CLASS + NEXT CLASS ── */}
          <div className="stt-feature-grid stt-fade-in">
            {/* Current class */}
            <div
              className={`stt-feature-card${currentClass ? " stt-feature-live" : ""}`}>
              <div className="stt-feature-header">
                <span className="stt-feature-label">Current Class</span>
                {currentClass && (
                  <span
                    className="stt-live-badge"
                    role="status"
                    aria-live="polite">
                    <span className="stt-live-dot" /> LIVE
                  </span>
                )}
              </div>

              {currentClass ? (
                (() => {
                  const meta = getSubjectMeta(currentClass.subject);
                  return (
                    <>
                      <div className="stt-feature-subject-row">
                        <span
                          className="stt-feature-icon"
                          style={{ background: meta.bg, color: meta.fg }}>
                          <meta.Icon size={20} strokeWidth={2} />
                        </span>
                        <div className="stt-feature-subject-info">
                          <span className="stt-feature-subject">
                            {currentClass.subject}
                          </span>
                          <span className="stt-feature-time">
                            {formatTime(currentClass.timeSlotStart)} –{" "}
                            {formatTime(currentClass.timeSlotEnd)}
                          </span>
                        </div>
                      </div>
                      <div className="stt-feature-meta-row">
                        {currentClass.teacherName && (
                          <span className="stt-teacher-chip">
                            <span className="stt-teacher-avatar">
                              {getInitials(currentClass.teacherName)}
                            </span>
                            {currentClass.teacherName}
                          </span>
                        )}
                        {currentClass.roomNumber && (
                          <span className="stt-slot-meta-item">
                            <MapPin size={12} strokeWidth={2} /> Room{" "}
                            {currentClass.roomNumber}
                          </span>
                        )}
                      </div>
                      <div className="stt-feature-countdown" aria-live="polite">
                        <Clock size={13} strokeWidth={2.2} />
                        {currentRemainingMin} minute
                        {currentRemainingMin === 1 ? "" : "s"} remaining
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="stt-feature-empty">
                  <p>No class is currently running.</p>
                  <span>
                    Take this time to revise or prepare for your next lesson.
                  </span>
                </div>
              )}
            </div>

            {/* Next class */}
            <div className="stt-feature-card">
              <div className="stt-feature-header">
                <span className="stt-feature-label">Next Class</span>
              </div>

              {nextClass ? (
                (() => {
                  const meta = getSubjectMeta(nextClass.subject);
                  return (
                    <>
                      <div className="stt-feature-subject-row">
                        <span
                          className="stt-feature-icon"
                          style={{ background: meta.bg, color: meta.fg }}>
                          <meta.Icon size={20} strokeWidth={2} />
                        </span>
                        <div className="stt-feature-subject-info">
                          <span className="stt-feature-subject">
                            {nextClass.subject}
                          </span>
                          <span className="stt-feature-starts-in">
                            Starts in {nextStartsInMin} minute
                            {nextStartsInMin === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                      <div className="stt-feature-meta-row">
                        {nextClass.teacherName && (
                          <span className="stt-teacher-chip">
                            <span className="stt-teacher-avatar">
                              {getInitials(nextClass.teacherName)}
                            </span>
                            {nextClass.teacherName}
                          </span>
                        )}
                        {nextClass.roomNumber && (
                          <span className="stt-slot-meta-item">
                            <MapPin size={12} strokeWidth={2} /> Room{" "}
                            {nextClass.roomNumber}
                          </span>
                        )}
                      </div>
                      <div className="stt-feature-duration">
                        Duration: {nextDurationMin} minutes
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="stt-feature-empty">
                  <p>
                    <Moon
                      size={14}
                      strokeWidth={2}
                      style={{
                        display: "inline",
                        verticalAlign: "-2px",
                        marginRight: 4,
                      }}
                    />
                    You're done for today 🎉
                  </p>
                  <span>Enjoy your free time.</span>
                </div>
              )}
            </div>
          </div>

          {/* ── WEEKLY CALENDAR TABS ── */}
          <div className="stt-day-tabs" role="tablist" aria-label="Select day">
            {DAYS.map((d) => {
              const isToday = d.key === todayKey;
              const isActive = d.key === selectedDay;
              const count = groupedByDay[d.key]?.length || 0;
              return (
                <button
                  key={d.key}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`${d.full}, ${count} class${count === 1 ? "" : "es"}`}
                  className={`stt-day-tab${isActive ? " stt-day-tab-active" : ""}${isToday ? " stt-day-tab-today" : ""}`}
                  onClick={() => setSelectedDay(d.key)}>
                  <span className="stt-day-tab-label">{d.label}</span>
                  {isToday && (
                    <span className="stt-day-tab-dot" aria-hidden="true" />
                  )}
                  <span className="stt-day-tab-count">
                    {count > 0 ? count : "–"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── TIMELINE SCHEDULE ── */}
          <div className="stt-card">
            <div className="stt-card-header">
              <h2 className="stt-card-title">
                {selectedDayFull}
                {isTodaySelected && (
                  <span className="stt-today-badge">Today</span>
                )}
              </h2>
            </div>

            {selectedSlots.length === 0 ? (
              isTodaySelected ? (
                <div className="stt-empty">
                  <PartyPopper size={30} strokeWidth={1.6} />
                  <p>No Classes Today</p>
                  <span className="stt-empty-sub">
                    Enjoy your free day. Take this opportunity to revise your
                    favourite subject.
                  </span>
                </div>
              ) : (
                <div className="stt-empty">
                  <BookOpen size={30} strokeWidth={1.6} />
                  <p>Nothing Scheduled</p>
                  <span className="stt-empty-sub">
                    Your timetable for {selectedDayFull} is empty. Enjoy your
                    well-deserved break.
                  </span>
                </div>
              )
            ) : (
              <div
                className="stt-timeline"
                role="list"
                aria-label={`${selectedDayFull} classes`}>
                {selectedSlots.map((slot, i) => {
                  const current = isSlotCurrent(slot, selectedDay);
                  const past = isSlotPast(slot, selectedDay);
                  const meta = getSubjectMeta(slot.subject);
                  const status = current
                    ? "running"
                    : past
                      ? "completed"
                      : "upcoming";

                  return (
                    <div
                      key={slot.id}
                      className="stt-timeline-row"
                      role="listitem">
                      <div className="stt-timeline-track">
                        <span
                          className={`stt-timeline-node stt-node-${status}`}
                          style={
                            status === "upcoming"
                              ? {
                                  background: meta.bg,
                                  color: meta.fg,
                                  borderColor: meta.fg,
                                }
                              : undefined
                          }>
                          {status === "completed" ? (
                            <CheckCircle2 size={13} strokeWidth={2.4} />
                          ) : status === "running" ? (
                            <Radio size={12} strokeWidth={2.4} />
                          ) : (
                            <meta.Icon size={12} strokeWidth={2.4} />
                          )}
                        </span>
                        {i !== selectedSlots.length - 1 && (
                          <span
                            className={`stt-timeline-line stt-line-${status}`}
                          />
                        )}
                      </div>

                      <div className={`stt-timeline-card stt-card-${status}`}>
                        <div className="stt-timeline-time">
                          <Clock size={12} strokeWidth={2} />
                          {formatTime(slot.timeSlotStart)} –{" "}
                          {formatTime(slot.timeSlotEnd)}
                        </div>

                        <div className="stt-timeline-main">
                          <div className="stt-timeline-subject-row">
                            <span
                              className="stt-subject-chip"
                              style={{ background: meta.bg, color: meta.fg }}>
                              <meta.Icon size={12} strokeWidth={2.2} />
                              {slot.subject}
                            </span>

                            {status === "running" && (
                              <span className="stt-live-badge">
                                <span className="stt-live-dot" /> Running
                              </span>
                            )}
                            {status === "completed" && (
                              <span className="stt-status-badge stt-status-completed">
                                Completed
                              </span>
                            )}
                            {status === "upcoming" && (
                              <span className="stt-status-badge stt-status-upcoming">
                                Upcoming
                              </span>
                            )}
                          </div>

                          <div className="stt-timeline-meta">
                            {slot.teacherName && (
                              <span className="stt-teacher-chip">
                                <span className="stt-teacher-avatar">
                                  {getInitials(slot.teacherName)}
                                </span>
                                {slot.teacherName}
                              </span>
                            )}
                            {slot.roomNumber && (
                              <span className="stt-slot-meta-item">
                                <MapPin size={12} strokeWidth={2} /> Room{" "}
                                {slot.roomNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
