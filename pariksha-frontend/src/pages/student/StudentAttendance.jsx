import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock3,
  MinusCircle,
} from "lucide-react";
import StudentLayout from "../../components/student/StudentLayout";
import studentService from "../../services/studentService";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import "./StudentAttendance.css";

const PAGE_THRESH = 6;

const STATUS_META = {
  PRESENT: {
    label: "Present",
    short: "Present",
    color: "#16A34A",
    bg: "#DCFCE7",
    icon: CheckCircle2,
  },
  ABSENT: {
    label: "Absent",
    short: "Absent",
    color: "#DC2626",
    bg: "#FEE2E2",
    icon: XCircle,
  },
  LATE: {
    label: "Late",
    short: "Late",
    color: "#D97706",
    bg: "#FEF3C7",
    icon: Clock3,
  },
  HALF_DAY: {
    label: "Half Day",
    short: "Half",
    color: "#7C3AED",
    bg: "#EDE9FE",
    icon: MinusCircle,
  },
};

function getStatusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status || "—",
      short: status || "—",
      color: "#64748B",
      bg: "#F1F5F9",
      icon: MinusCircle,
    }
  );
}

function getAttendanceStatusTone(pct) {
  if (pct == null) return { label: "No data", tone: "sa-badge-neutral" };
  if (pct >= 90) return { label: "Excellent", tone: "sa-badge-good" };
  if (pct >= 75) return { label: "Good", tone: "sa-badge-good" };
  if (pct >= 60) return { label: "Needs Improvement", tone: "sa-badge-avg" };
  return { label: "Critical", tone: "sa-badge-low" };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateKey(date) {
  if (typeof date === "string") return date.slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─────────────────────────────────────────────
//  Loading skeleton
// ─────────────────────────────────────────────
function AttendanceSkeleton() {
  return (
    <>
      <div className="sa-skel-hero" />
      <div className="sa-skel-stats-row">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="sa-skel-stat" />
        ))}
      </div>
      <div className="sa-skel-calendar" />
    </>
  );
}

export default function StudentAttendance() {
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [recordsPage, setRecordsPage] = useState(1);

  const loadAttendance = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setError(null);

    const [summaryRes, listRes] = await Promise.allSettled([
      studentService.getSummary(),
      studentService.getAttendance(),
    ]);

    if (summaryRes.status === "fulfilled")
      setSummary(summaryRes.value.data.data);
    if (listRes.status === "fulfilled")
      setRecords(listRes.value.data.data || []);

    const allFailed =
      summaryRes.status === "rejected" && listRes.status === "rejected";
    if (allFailed) {
      const isNetworkIssue = !summaryRes.reason?.response;
      setError(
        isNetworkIssue
          ? "Connection problem. Check your internet and retry."
          : "Unable to load your attendance record.",
      );
      if (isRetry) {
        setToast({
          type: "error",
          message: isNetworkIssue
            ? "Connection problem. Check your internet and retry."
            : "Unable to load your attendance record.",
        });
      }
    } else if (isRetry) {
      setToast({
        type: "success",
        message: "Attendance refreshed successfully 🚀",
      });
    } else if (
      summaryRes.status === "rejected" ||
      listRes.status === "rejected"
    ) {
      setToast({
        type: "warning",
        message: "Some attendance data couldn't load.",
      });
    }

    setLoading(false);
    setRetrying(false);
  }, []);

  useEffect(() => {
    loadAttendance(false);
  }, [loadAttendance]);

  // Group records by date for O(1) calendar lookups
  const recordsByDate = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      if (r.date) map.set(toDateKey(r.date), r);
    });
    return map;
  }, [records]);

  const attendancePct = summary?.attendancePercentage ?? null;
  const statusTone = getAttendanceStatusTone(attendancePct);

  const STAT_CARDS = summary
    ? [
        { key: "PRESENT", count: summary.presentDays },
        { key: "ABSENT", count: summary.absentDays },
        { key: "LATE", count: summary.lateDays },
        { key: "HALF_DAY", count: summary.halfDays },
      ]
    : [];

  // ── Calendar grid computation ──
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDayOfMonth.getDay();
  const todayKey = toDateKey(new Date());

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({ day: d, key: toDateKey(dateObj) });
    }
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, daysInMonth, startWeekday]);

  const goToPrevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
  const goToToday = () => setCalendarDate(new Date());

  const isFutureMonth =
    year > new Date().getFullYear() ||
    (year === new Date().getFullYear() && month >= new Date().getMonth());

  // ── All records, sorted newest-first, paginated ──
  const sortedRecords = useMemo(() => {
    return [...records]
      .filter((r) => r.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [records]);

  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_THRESH));

  // Clamp page if records shrink (e.g. after a refresh)
  useEffect(() => {
    if (recordsPage > totalPages) setRecordsPage(totalPages);
  }, [totalPages, recordsPage]);

  const paginatedRecords = useMemo(() => {
    const start = (recordsPage - 1) * PAGE_THRESH;
    return sortedRecords.slice(start, start + PAGE_THRESH);
  }, [sortedRecords, recordsPage]);

  const rangeStart =
    totalRecords === 0 ? 0 : (recordsPage - 1) * PAGE_THRESH + 1;
  const rangeEnd = Math.min(recordsPage * PAGE_THRESH, totalRecords);

  return (
    <StudentLayout title="Attendance">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loading ? (
        <AttendanceSkeleton />
      ) : error ? (
        <div className="sa-error-state">
          <div className="sa-error-icon">
            <AlertCircle size={32} strokeWidth={1.6} />
          </div>
          <h3>Unable to load your attendance 😔</h3>
          <p>We couldn't fetch your attendance record.</p>
          <span className="sa-error-sub">Your data is safe. Please retry.</span>
          <button
            className="sa-retry-btn"
            onClick={() => loadAttendance(true)}
            disabled={retrying}>
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
        <>
          {/* ── HERO SUMMARY ── */}
          <div className="sa-hero">
            <div className="sa-hero-decor" aria-hidden="true" />
            <div className="sa-hero-left">
              <span className="sa-hero-label">Overall Attendance</span>
              <div className="sa-hero-pct-row">
                <span className="sa-hero-pct">
                  {attendancePct != null ? `${attendancePct}%` : "–"}
                </span>
                <span className={`sa-badge ${statusTone.tone}`}>
                  {statusTone.label}
                </span>
              </div>
              <span className="sa-hero-sub">
                {summary
                  ? `${summary.presentDays} of ${summary.totalDays} days present`
                  : "No attendance recorded yet"}
              </span>
            </div>
            <div className="sa-hero-ring">
              <svg viewBox="0 0 100 100" className="sa-hero-ring-svg">
                <circle cx="50" cy="50" r="42" className="sa-hero-ring-track" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="sa-hero-ring-fill"
                  style={{
                    strokeDasharray: 2 * Math.PI * 42,
                    strokeDashoffset:
                      2 * Math.PI * 42 * (1 - (attendancePct ?? 0) / 100),
                  }}
                />
              </svg>
              <CalendarCheck
                size={22}
                strokeWidth={2}
                className="sa-hero-ring-icon"
              />
            </div>
          </div>

          {/* ── STATS ROW ── */}
          <div className="sa-stats-grid">
            {STAT_CARDS.map((stat) => {
              const meta = getStatusMeta(stat.key);
              return (
                <div key={stat.key} className="sa-stat-card">
                  <div
                    className="sa-stat-icon"
                    style={{ background: meta.bg, color: meta.color }}>
                    <meta.icon size={19} strokeWidth={2} />
                  </div>
                  <div className="sa-stat-info">
                    <span className="sa-stat-value">{stat.count ?? 0}</span>
                    <span className="sa-stat-label">{meta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── CALENDAR ── */}
          <div className="sa-card">
            <div className="sa-card-header">
              <div className="sa-calendar-nav">
                <button
                  className="sa-nav-btn"
                  onClick={goToPrevMonth}
                  aria-label="Previous month">
                  <ChevronLeft size={18} strokeWidth={2.2} />
                </button>
                <h2 className="sa-card-title">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <button
                  className="sa-nav-btn"
                  onClick={goToNextMonth}
                  disabled={isFutureMonth}
                  aria-label="Next month">
                  <ChevronRight size={18} strokeWidth={2.2} />
                </button>
              </div>
              <button className="sa-today-btn" onClick={goToToday}>
                Today
              </button>
            </div>

            <div className="sa-calendar-grid sa-calendar-weekdays">
              {WEEKDAY_LABELS.map((w, i) => (
                <span key={i} className="sa-weekday-label">
                  {w}
                </span>
              ))}
            </div>

            <div className="sa-calendar-grid">
              {calendarCells.map((cell, i) => {
                if (!cell)
                  return (
                    <div
                      key={`empty-${i}`}
                      className="sa-calendar-cell sa-cell-empty"
                    />
                  );
                const record = recordsByDate.get(cell.key);
                const meta = record ? getStatusMeta(record.status) : null;
                const isToday = cell.key === todayKey;
                return (
                  <div
                    key={cell.key}
                    className={`sa-calendar-cell${isToday ? " sa-cell-today" : ""}${meta ? " sa-cell-marked" : ""}`}
                    title={meta ? meta.label : undefined}>
                    <span className="sa-cell-day">{cell.day}</span>
                    {meta && (
                      <span
                        className="sa-cell-status"
                        style={{ background: meta.bg, color: meta.color }}>
                        {meta.short}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="sa-legend">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <span key={key} className="sa-legend-item">
                  <span
                    className="sa-legend-dot"
                    style={{ background: meta.color }}
                  />
                  {meta.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── RECORDS LIST (paginated) ── */}
          <div className="sa-card">
            <div className="sa-card-header">
              <h2 className="sa-card-title">Attendance Records</h2>
            </div>
            {paginatedRecords.length === 0 ? (
              <div className="sa-empty">
                <CalendarCheck size={26} strokeWidth={1.6} />
                <p>No attendance records yet</p>
                <span className="sa-empty-sub">
                  Your attendance history will appear here
                </span>
              </div>
            ) : (
              <>
                <div className="sa-record-list">
                  {paginatedRecords.map((r) => {
                    const meta = getStatusMeta(r.status);
                    const dateObj = new Date(r.date);
                    return (
                      <div key={r.id} className="sa-record-item">
                        <div
                          className="sa-record-icon"
                          style={{ background: meta.bg, color: meta.color }}>
                          <meta.icon size={16} strokeWidth={2} />
                        </div>
                        <div className="sa-record-body">
                          <span className="sa-record-date">
                            {dateObj.toLocaleDateString(undefined, {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <span
                          className="sa-record-status"
                          style={{ color: meta.color, background: meta.bg }}>
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {totalRecords > PAGE_THRESH && (
                  <div className="sa-pagination">
                    <span className="sa-pagination-info">
                      {rangeStart}–{rangeEnd} of {totalRecords}
                    </span>
                    <div className="sa-pagination-controls">
                      <button
                        className="sa-page-btn"
                        onClick={() =>
                          setRecordsPage((p) => Math.max(1, p - 1))
                        }
                        disabled={recordsPage === 1}
                        aria-label="Previous page">
                        <ChevronLeft size={16} strokeWidth={2.2} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <button
                            key={p}
                            className={`sa-page-btn${p === recordsPage ? " sa-page-btn-active" : ""}`}
                            onClick={() => setRecordsPage(p)}
                            aria-current={
                              p === recordsPage ? "page" : undefined
                            }>
                            {p}
                          </button>
                        ),
                      )}
                      <button
                        className="sa-page-btn"
                        onClick={() =>
                          setRecordsPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={recordsPage === totalPages}
                        aria-label="Next page">
                        <ChevronRight size={16} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </StudentLayout>
  );
}
