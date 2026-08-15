import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  Search,
  X,
  RefreshCw,
  GraduationCap,
  BookOpen,
  MapPin,
  LayoutGrid,
  List,
  User,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Coffee,
  Sunrise,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import teacherService from "../../services/teacherService";
import "./TeacherMySchedule.css";

// ─────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────

const DAYS_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const DAY_FULL = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const _jsDay = new Date().getDay();
const TODAY_NAME = _jsDay === 0 ? "SUNDAY" : DAYS_ORDER[_jsDay - 1];

const SORT_OPTIONS = [
  { value: "day_asc", label: "Day (Week order)" },
  { value: "time_asc", label: "Time ↑" },
  { value: "time_desc", label: "Time ↓" },
  { value: "subject_asc", label: "Subject A → Z" },
  { value: "class_asc", label: "Class A → Z" },
];

const PAGE_SIZES = [10, 20, 50];

// ─────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────

function fmtTime(t) {
  if (!t) return "—";
  return String(t).slice(0, 5);
}

/** Returns "HH:mm" string from current time */
function nowTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function isOngoing(entry) {
  if (entry.day !== TODAY_NAME) return false;
  const now = nowTimeStr();
  const start = String(entry.timeSlotStart ?? "").slice(0, 5);
  const end = String(entry.timeSlotEnd ?? "").slice(0, 5);
  return now >= start && now < end;
}

function isUpcoming(entry) {
  if (entry.day !== TODAY_NAME) return false;
  const now = nowTimeStr();
  const start = String(entry.timeSlotStart ?? "").slice(0, 5);
  return start > now;
}

function sortEntries(list, key) {
  const s = [...list];
  const dayIdx = (d) => DAYS_ORDER.indexOf(d ?? "");
  switch (key) {
    case "day_asc":
      return s.sort(
        (a, b) =>
          dayIdx(a.day) - dayIdx(b.day) ||
          (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? ""),
      );
    case "time_asc":
      return s.sort((a, b) =>
        (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? ""),
      );
    case "time_desc":
      return s.sort((a, b) =>
        (b.timeSlotStart ?? "").localeCompare(a.timeSlotStart ?? ""),
      );
    case "subject_asc":
      return s.sort((a, b) => (a.subject ?? "").localeCompare(b.subject ?? ""));
    case "class_asc":
      return s.sort((a, b) =>
        (a.className ?? "").localeCompare(b.className ?? ""),
      );
    default:
      return s;
  }
}

// ─────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────

/* ── Stat card ── */
function StatCard({ icon, value, label, accent }) {
  return (
    <div className={`ms-stat ms-stat--${accent}`}>
      <div className="ms-stat__icon">{icon}</div>
      <div className="ms-stat__body">
        <span className="ms-stat__value">{value}</span>
        <span className="ms-stat__label">{label}</span>
      </div>
    </div>
  );
}

/* ── Next class widget ── */
function NextClassWidget({ entry }) {
  if (!entry) {
    return (
      <div className="ms-next ms-next--free">
        <div className="ms-next__icon">
          <Coffee size={22} strokeWidth={1.5} />
        </div>
        <div className="ms-next__body">
          <span className="ms-next__label">Next Class</span>
          <span className="ms-next__free-text">
            You're free for the rest of the day
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="ms-next ms-next--active">
      <div className="ms-next__icon">
        <Zap size={22} strokeWidth={1.5} />
      </div>
      <div className="ms-next__body">
        <span className="ms-next__label">Next Class</span>
        <span className="ms-next__subject">{entry.subject}</span>
        <div className="ms-next__meta">
          {entry.className && (
            <span>
              <GraduationCap size={12} />
              Class {entry.className}
              {entry.section ? ` · ${entry.section}` : ""}
            </span>
          )}
          {entry.roomNumber && (
            <span>
              <MapPin size={12} />
              {entry.roomNumber}
            </span>
          )}
          <span>
            <Clock size={12} />
            {fmtTime(entry.timeSlotStart)} – {fmtTime(entry.timeSlotEnd)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Today's schedule section ── */
function TodaySchedule({ todayEntries }) {
  if (todayEntries.length === 0) {
    return (
      <div className="ms-today">
        <div className="ms-today__header">
          <Sunrise size={16} strokeWidth={2} />
          <span>Today · {DAY_FULL[TODAY_NAME]}</span>
        </div>
        <div className="ms-today__empty">
          <Coffee size={28} strokeWidth={1.3} />
          <p>No classes scheduled today</p>
          <span>Enjoy your day off!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ms-today">
      <div className="ms-today__header">
        <Sunrise size={16} strokeWidth={2} />
        <span>Today · {DAY_FULL[TODAY_NAME]}</span>
        <span className="ms-today__count">
          {todayEntries.length} period{todayEntries.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="ms-today__list">
        {todayEntries.map((entry) => {
          const ongoing = isOngoing(entry);
          const upcoming = !ongoing && isUpcoming(entry);
          return (
            <div
              key={entry.id}
              className={`ms-today-slot ${ongoing ? "ms-today-slot--ongoing" : ""} ${upcoming ? "ms-today-slot--upcoming" : ""}`}>
              <div className="ms-today-slot__time">
                <span>{fmtTime(entry.timeSlotStart)}</span>
                <div className="ms-today-slot__dot" />
                <span>{fmtTime(entry.timeSlotEnd)}</span>
              </div>
              <div className="ms-today-slot__content">
                <div className="ms-today-slot__top">
                  <span className="ms-today-slot__subject">
                    {entry.subject}
                  </span>
                  {ongoing && (
                    <span className="ms-badge ms-badge--live">● Live now</span>
                  )}
                  {upcoming && (
                    <span className="ms-badge ms-badge--next">Up next</span>
                  )}
                </div>
                <div className="ms-today-slot__meta">
                  {entry.className && (
                    <span>
                      <GraduationCap size={11} />
                      Class {entry.className}
                      {entry.section ? ` · ${entry.section}` : ""}
                    </span>
                  )}
                  {entry.teacherName && (
                    <span>
                      <User size={11} />
                      {entry.teacherName}
                    </span>
                  )}
                  {entry.roomNumber && (
                    <span>
                      <MapPin size={11} />
                      {entry.roomNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week grid view ── */
function WeekGridView({ timetable }) {
  const byDay = useMemo(() => {
    return DAYS_ORDER.reduce((acc, d) => {
      acc[d] = timetable
        .filter((t) => t.day === d)
        .sort((a, b) =>
          (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? ""),
        );
      return acc;
    }, {});
  }, [timetable]);

  const activeDays = DAYS_ORDER.filter((d) => byDay[d].length > 0);

  if (activeDays.length === 0) return null;

  return (
    <div className="ms-week-grid">
      {activeDays.map((day) => (
        <div
          key={day}
          className={`ms-week-col ${day === TODAY_NAME ? "ms-week-col--today" : ""}`}>
          <div className="ms-week-col__header">
            <span className="ms-week-col__day">{DAY_LABELS[day]}</span>
            {day === TODAY_NAME && (
              <span className="ms-week-today-badge">Today</span>
            )}
            <span className="ms-week-col__count">{byDay[day].length}</span>
          </div>

          <div className="ms-week-col__slots">
            {byDay[day].map((entry) => {
              const ongoing = isOngoing(entry);
              const upcoming = !ongoing && isUpcoming(entry);
              return (
                <div
                  key={entry.id}
                  className={`ms-week-slot ${ongoing ? "ms-week-slot--ongoing" : ""} ${upcoming ? "ms-week-slot--upcoming" : ""}`}>
                  <div className="ms-week-slot__time">
                    <Clock size={10} />
                    {fmtTime(entry.timeSlotStart)} –{" "}
                    {fmtTime(entry.timeSlotEnd)}
                  </div>

                  {ongoing && (
                    <span className="ms-badge ms-badge--live ms-badge--sm">
                      ● Live
                    </span>
                  )}
                  {upcoming && (
                    <span className="ms-badge ms-badge--next ms-badge--sm">
                      Next
                    </span>
                  )}

                  <span className="ms-week-slot__subject">{entry.subject}</span>

                  <span className="ms-week-slot__class">
                    Class {entry.className}
                    {entry.section ? ` · ${entry.section}` : ""}
                  </span>

                  {entry.teacherName && (
                    <span className="ms-week-slot__teacher">
                      <User size={10} />
                      {entry.teacherName}
                    </span>
                  )}

                  {entry.roomNumber && (
                    <span className="ms-week-slot__room">
                      <MapPin size={10} />
                      {entry.roomNumber}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Sort dropdown ── */
function SortDropdown({ sortKey, setSortKey, show, setShow }) {
  return (
    <div className="ms-sort-wrap">
      <button className="ms-sort-btn" onClick={() => setShow((p) => !p)}>
        <ArrowUpDown size={14} />
        {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort"}
        {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {show && (
        <div className="ms-sort-dropdown">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`ms-sort-option ${sortKey === o.value ? "ms-sort-option--active" : ""}`}
              onClick={() => {
                setSortKey(o.value);
                setShow(false);
              }}>
              {sortKey === o.value && <CheckCircle2 size={12} />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Pagination ── */
function Pagination({
  page,
  totalPages,
  setPage,
  pageSize,
  setPageSize,
  totalRows,
}) {
  if (totalRows === 0) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="ms-pagination">
      <div className="ms-page-size">
        <span>Rows per page</span>
        <select
          className="ms-page-size-select"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}>
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="ms-page-controls">
        <button
          className="ms-page-btn"
          onClick={() => setPage(1)}
          disabled={page === 1}>
          «
        </button>
        <button
          className="ms-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}>
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="ms-page-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`ms-page-btn ms-page-btn--num ${page === p ? "ms-page-btn--active" : ""}`}
              onClick={() => setPage(p)}>
              {p}
            </button>
          ),
        )}
        <button
          className="ms-page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}>
          <ChevronRight size={14} />
        </button>
        <button
          className="ms-page-btn"
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}>
          »
        </button>
      </div>

      <span className="ms-page-info">
        Page {page} of {totalPages}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────

export default function TeacherMySchedule() {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("week");
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState("ALL");
  const [sortKey, setSortKey] = useState("day_asc");
  const [showSort, setShowSort] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState(null);

  // ── Fetch ────────────────────────────────────────────
  const fetchSchedule = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await teacherService.getMyTimetable();
      setTimetable(res.data.data ?? []);
    } catch {
      setToast({ message: "Failed to load your schedule.", type: "error" });
      setTimetable([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Reset pagination on filter/sort change
  useEffect(() => {
    setPage(1);
  }, [search, filterDay, sortKey]);

  // ── Derived data ─────────────────────────────────────
  const todayEntries = useMemo(
    () =>
      timetable
        .filter((t) => t.day === TODAY_NAME)
        .sort((a, b) =>
          (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? ""),
        ),
    [timetable],
  );

  const nextClass = useMemo(() => {
    const upcoming = todayEntries.filter(isUpcoming);
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [todayEntries]);

  const subjects = useMemo(
    () => [...new Set(timetable.map((t) => t.subject).filter(Boolean))],
    [timetable],
  );

  const daysActive = useMemo(
    () => [...new Set(timetable.map((t) => t.day).filter(Boolean))].length,
    [timetable],
  );

  const todayCount = todayEntries.length;

  // List view filtered + sorted + paginated
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return timetable.filter((t) => {
      const ms =
        q === "" ||
        (t.subject ?? "").toLowerCase().includes(q) ||
        (t.className ?? "").toLowerCase().includes(q) ||
        (t.roomNumber ?? "").toLowerCase().includes(q) ||
        (t.teacherName ?? "").toLowerCase().includes(q);
      const md = filterDay === "ALL" || t.day === filterDay;
      return ms && md;
    });
  }, [timetable, search, filterDay]);

  const sorted = useMemo(
    () => sortEntries(filtered, sortKey),
    [filtered, sortKey],
  );
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  // ── Loading screen ────────────────────────────────────
  if (loading) {
    return (
      <TeacherLayout title="My Schedule">
        <div className="ms-loading">
          <Spinner />
        </div>
      </TeacherLayout>
    );
  }

  // ── Empty state (no schedule at all) ─────────────────
  if (timetable.length === 0) {
    return (
      <TeacherLayout title="My Schedule">
        <div className="ms-page">
          <div className="ms-heading-row">
            <div>
              <h1 className="ms-heading">My Schedule</h1>
              <p className="ms-sub">
                View all teaching periods assigned to you
              </p>
            </div>
            <button
              className="ms-refresh-btn"
              onClick={() => fetchSchedule(true)}
              disabled={refreshing}
              title="Refresh">
              <RefreshCw size={15} className={refreshing ? "ms-spin" : ""} />
            </button>
          </div>
          <div className="ms-empty-page">
            <div className="ms-empty-page__icon">
              <CalendarDays size={40} strokeWidth={1.2} />
            </div>
            <p>No schedule assigned yet</p>
            <span>
              Your teaching periods will appear here once the timetable is set
              up by your school admin.
            </span>
          </div>
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

  // ── Main render ───────────────────────────────────────
  return (
    <TeacherLayout title="My Schedule">
      <div className="ms-page">
        {/* ── Heading ── */}
        <div className="ms-heading-row">
          <div>
            <h1 className="ms-heading">My Schedule</h1>
            <p className="ms-sub">View all teaching periods assigned to you</p>
          </div>
          <button
            className="ms-refresh-btn"
            onClick={() => fetchSchedule(true)}
            disabled={refreshing}
            title="Refresh schedule">
            <RefreshCw size={15} className={refreshing ? "ms-spin" : ""} />
          </button>
        </div>

        {/* ── Stats strip ── */}
        <div className="ms-stats-strip">
          <StatCard
            icon={<CalendarDays size={18} />}
            value={timetable.length}
            label="Total Periods"
            accent="blue"
          />
          <StatCard
            icon={<Clock size={18} />}
            value={todayCount}
            label="Today's Classes"
            accent="green"
          />
          <StatCard
            icon={<BookOpen size={18} />}
            value={subjects.length}
            label="Subjects"
            accent="violet"
          />
          <StatCard
            icon={<CalendarDays size={18} />}
            value={daysActive}
            label="Active Days"
            accent="amber"
          />
        </div>

        {/* ── Today + Next class row ── */}
        <div className="ms-today-row">
          <div className="ms-today-col">
            <TodaySchedule todayEntries={todayEntries} />
          </div>
          <div className="ms-next-col">
            <NextClassWidget entry={nextClass} />
          </div>
        </div>

        {/* ── View toggle ── */}
        <div className="ms-view-toggle">
          <button
            className={`ms-view-btn ${viewMode === "week" ? "ms-view-btn--active" : ""}`}
            onClick={() => setViewMode("week")}>
            <LayoutGrid size={14} /> Week View
          </button>
          <button
            className={`ms-view-btn ${viewMode === "list" ? "ms-view-btn--active" : ""}`}
            onClick={() => setViewMode("list")}>
            <List size={14} /> List View
          </button>
        </div>

        {/* ══ WEEK VIEW ══ */}
        {viewMode === "week" &&
          (refreshing ? (
            <div className="ms-loading-inline">
              <Spinner />
            </div>
          ) : (
            <WeekGridView timetable={timetable} />
          ))}

        {/* ══ LIST VIEW ══ */}
        {viewMode === "list" && (
          <>
            {/* Toolbar */}
            <div className="ms-toolbar">
              <div className="ms-search-wrap">
                <Search size={14} className="ms-search-icon" />
                <input
                  type="text"
                  className="ms-search"
                  placeholder="Search subject, teacher, class, room…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="ms-search-clear"
                    onClick={() => setSearch("")}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="ms-filter-group">
                <button
                  className={`ms-filter-btn ${filterDay === "ALL" ? "ms-filter-btn--active" : ""}`}
                  onClick={() => setFilterDay("ALL")}>
                  All
                </button>
                {DAYS_ORDER.map((d) => (
                  <button
                    key={d}
                    className={`ms-filter-btn ${filterDay === d ? "ms-filter-btn--active" : ""} ${d === TODAY_NAME ? "ms-filter-btn--today" : ""}`}
                    onClick={() => setFilterDay(d)}>
                    {DAY_LABELS[d]}
                  </button>
                ))}
              </div>

              <SortDropdown
                sortKey={sortKey}
                setSortKey={setSortKey}
                show={showSort}
                setShow={setShowSort}
              />
            </div>

            {/* Results info */}
            <div className="ms-results-info">
              Showing {paginated.length > 0 ? (page - 1) * pageSize + 1 : 0}–
              {Math.min(page * pageSize, totalRows)} of {totalRows} entr
              {totalRows !== 1 ? "ies" : "y"}
              {search && ` matching "${search}"`}
            </div>

            {refreshing ? (
              <div className="ms-loading-inline">
                <Spinner />
              </div>
            ) : paginated.length === 0 ? (
              <div className="ms-empty">
                <div className="ms-empty__icon">
                  <Search size={28} strokeWidth={1.3} />
                </div>
                <p>No entries match your filter</p>
                <span>Try a different search or day filter.</span>
              </div>
            ) : (
              <div className="ms-table-card">
                <div className="ms-table-wrap">
                  <table className="ms-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Class</th>
                        <th>Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((entry, idx) => {
                        const ongoing = isOngoing(entry);
                        const upcoming = !ongoing && isUpcoming(entry);
                        return (
                          <tr
                            key={entry.id}
                            className={`${entry.day === TODAY_NAME ? "ms-row--today" : ""} ${ongoing ? "ms-row--ongoing" : ""}`}>
                            <td className="ms-cell-no">
                              {(page - 1) * pageSize + idx + 1}
                            </td>

                            <td>
                              <span
                                className={`ms-day-badge ${entry.day === TODAY_NAME ? "ms-day-badge--today" : ""}`}>
                                {DAY_LABELS[entry.day] ?? entry.day}
                                {entry.day === TODAY_NAME && " · Today"}
                              </span>
                            </td>

                            <td>
                              <span className="ms-time-cell">
                                <Clock size={12} />
                                {fmtTime(entry.timeSlotStart)} –{" "}
                                {fmtTime(entry.timeSlotEnd)}
                              </span>
                              {ongoing && (
                                <span
                                  className="ms-badge ms-badge--live ms-badge--sm"
                                  style={{ marginLeft: 6 }}>
                                  ● Live
                                </span>
                              )}
                              {upcoming && (
                                <span
                                  className="ms-badge ms-badge--next ms-badge--sm"
                                  style={{ marginLeft: 6 }}>
                                  Next
                                </span>
                              )}
                            </td>

                            <td>
                              <span className="ms-subject-pill">
                                {entry.subject}
                              </span>
                            </td>

                            <td>
                              <span className="ms-teacher-cell">
                                <User size={12} />
                                {entry.teacherName ?? "—"}
                              </span>
                            </td>

                            <td>
                              <span className="ms-class-cell">
                                <GraduationCap size={12} />
                                Class {entry.className}
                                {entry.section ? ` · ${entry.section}` : ""}
                              </span>
                            </td>

                            <td>
                              {entry.roomNumber ? (
                                <span className="ms-room-cell">
                                  <MapPin size={12} />
                                  {entry.roomNumber}
                                </span>
                              ) : (
                                <span className="ms-empty-text">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              totalRows={totalRows}
            />
          </>
        )}
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
