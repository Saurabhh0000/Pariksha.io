import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck,
  Users,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  GraduationCap,
  AlertCircle,
  ShieldCheck,
  BookMarked,
  Eye,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import teacherService from "../../services/teacherService";
import "./TeacherAttendance.css";

// ── Constants ─────────────────────────────────────────
const TODAY = new Date().toISOString().split("T")[0];
const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
const PAGE_SIZE = 10;
const PAGE_THRESH = 6; // pagination only when rows exceed this

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A → Z" },
  { value: "name_desc", label: "Name Z → A" },
  { value: "roll_asc", label: "Roll Code ↑" },
  { value: "status_asc", label: "Status A → Z" },
];

// ── Helpers ───────────────────────────────────────────
function statusMeta(s) {
  switch (s?.toUpperCase()) {
    case "PRESENT":
      return {
        label: "Present",
        cls: "ta-badge--present",
        icon: <CheckCircle2 size={11} />,
      };
    case "ABSENT":
      return {
        label: "Absent",
        cls: "ta-badge--absent",
        icon: <XCircle size={11} />,
      };
    case "LATE":
      return {
        label: "Late",
        cls: "ta-badge--late",
        icon: <Clock size={11} />,
      };
    case "EXCUSED":
      return {
        label: "Excused",
        cls: "ta-badge--excused",
        icon: <AlertCircle size={11} />,
      };
    default:
      return { label: "—", cls: "", icon: null };
  }
}

function getInitials(s) {
  return (
    ((s?.firstName?.[0] ?? "") + (s?.lastName?.[0] ?? "")).toUpperCase() || "S"
  );
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sortStudents(list, key) {
  const s = [...list];
  switch (key) {
    case "name_asc":
      return s.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        ),
      );
    case "name_desc":
      return s.sort((a, b) =>
        `${b.firstName} ${b.lastName}`.localeCompare(
          `${a.firstName} ${a.lastName}`,
        ),
      );
    case "roll_asc":
      return s.sort((a, b) =>
        (a.studentRollCode ?? "").localeCompare(b.studentRollCode ?? ""),
      );
    case "status_asc":
      return s.sort((a, b) =>
        (a.attendanceStatus ?? "").localeCompare(b.attendanceStatus ?? ""),
      );
    default:
      return s;
  }
}

// ── Sort dropdown ──────────────────────────────────────
function SortDropdown({ sortKey, setSortKey, show, setShow }) {
  return (
    <div className="ta-sort-wrap">
      <button className="ta-sort-btn" onClick={() => setShow((p) => !p)}>
        <ArrowUpDown size={14} />
        {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort"}
        {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {show && (
        <div className="ta-sort-dropdown">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`ta-sort-option${sortKey === o.value ? " ta-sort-option--active" : ""}`}
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

// ── Pagination — matches reference screenshot:
//    "X–Y of Z" on the left, ‹ [1] [2] [3] › on the right ──
function Pagination({ page, totalPages, setPage, totalRows, pageSize }) {
  if (totalRows <= PAGE_THRESH) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRows);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="ta-pagination">
      <span className="ta-page-info">
        {start}–{end} of {totalRows}
      </span>
      <div className="ta-page-controls">
        <button
          className="ta-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}>
          <ChevronLeft size={16} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={`ta-page-btn ta-page-btn--num${page === p ? " ta-page-btn--active" : ""}`}
            onClick={() => setPage(p)}>
            {p}
          </button>
        ))}
        <button
          className="ta-page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
export default function TeacherAttendance() {
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [students, setStudents] = useState([]);
  const [stuLoading, setStuLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(TODAY);

  const [existingAtt, setExistingAtt] = useState([]);
  const [attLoading, setAttLoading] = useState(false);

  const [markMap, setMarkMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveIdx, setSaveIdx] = useState(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name_asc");
  const [showSort, setShowSort] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState(null);

  // ── Boot: profile + classes ───────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoadingClasses(true);
        const [profileRes, classRes] = await Promise.all([
          teacherService.getProfile(),
          teacherService.getClasses(),
        ]);
        setProfile(profileRes.data.data ?? null);
        const list = classRes.data.data ?? [];
        setClasses(list);
        if (list.length > 0) setSelectedClassId(list[0].id);
      } catch {
        setToast({ message: "Failed to load classes.", type: "error" });
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  // ── Fetch students ────────────────────────────────
  const fetchStudents = useCallback(async (classId) => {
    if (!classId) return;
    try {
      setStuLoading(true);
      const res = await teacherService.getStudentsIn(classId);
      const list = (res.data.data ?? []).filter(
        (s) => s.status?.toUpperCase() === "ACTIVE",
      );
      setStudents(list);
      const init = {};
      list.forEach((s) => {
        init[s.userId] = "";
      });
      setMarkMap(init);
    } catch {
      setToast({ message: "Failed to load students.", type: "error" });
      setStudents([]);
    } finally {
      setStuLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
      setPage(1);
    }
  }, [selectedClassId, fetchStudents]);

  // ── Fetch existing attendance ─────────────────────
  const fetchAttendance = useCallback(async (classId, date) => {
    if (!classId || !date) return;
    try {
      setAttLoading(true);
      const res = await teacherService.getAttendance(classId, date);
      const list = res.data.data ?? [];
      setExistingAtt(list);
      const existing = {};
      list.forEach((a) => {
        existing[a.studentUserId] = a.status;
      });
      setMarkMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((uid) => {
          if (existing[uid]) next[uid] = existing[uid];
        });
        return next;
      });
    } catch {
      setExistingAtt([]);
    } finally {
      setAttLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedDate) {
      fetchAttendance(selectedClassId, selectedDate);
      setPage(1);
    }
  }, [selectedClassId, selectedDate, fetchAttendance]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, sortKey]);

  // ── Derived role values ───────────────────────────
  const isMentor = profile?.isMentor === true;
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const isMyMentorClass =
    isMentor && selectedClass?.mentorTeacherId === profile?.userId;

  // ── Mark single student (mentor only) ────────────
  const markSingle = async (studentUserId, status) => {
    if (!status || !isMyMentorClass) return;
    try {
      setSaveIdx(studentUserId);
      await teacherService.markAttendance({
        studentUserId,
        classRoomId: selectedClassId,
        date: selectedDate,
        status,
      });
      setMarkMap((prev) => ({ ...prev, [studentUserId]: status }));
      setToast({ message: `Attendance marked as ${status}.`, type: "success" });
      fetchAttendance(selectedClassId, selectedDate);
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Failed to mark attendance.";
      setToast({ message: msg, type: "error" });
    } finally {
      setSaveIdx(null);
    }
  };

  // ── Mark all unmarked (mentor only) ──────────────
  const markAll = async (status) => {
    if (!isMyMentorClass) return;
    try {
      setSaving(true);
      const unmarked = students.filter((s) => !markMap[s.userId]);
      for (const s of unmarked) {
        try {
          await teacherService.markAttendance({
            studentUserId: s.userId,
            classRoomId: selectedClassId,
            date: selectedDate,
            status,
          });
          setMarkMap((prev) => ({ ...prev, [s.userId]: status }));
        } catch {
          /* skip already marked */
        }
      }
      setToast({
        message: `All unmarked students marked as ${status}.`,
        type: "success",
      });
      fetchAttendance(selectedClassId, selectedDate);
    } catch {
      setToast({ message: "Bulk mark failed.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ── Derived stats ─────────────────────────────────
  const markedCount = Object.values(markMap).filter((v) => !!v).length;
  const unmarkedCount = students.length - markedCount;
  const presentCount = Object.values(markMap).filter(
    (v) => v === "PRESENT",
  ).length;
  const absentCount = Object.values(markMap).filter(
    (v) => v === "ABSENT",
  ).length;
  const lateCount = Object.values(markMap).filter((v) => v === "LATE").length;
  const excusedCount = Object.values(markMap).filter(
    (v) => v === "EXCUSED",
  ).length;

  const enriched = students.map((s) => ({
    ...s,
    attendanceStatus: markMap[s.userId] ?? "",
  }));

  const filtered = enriched.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search.trim() ||
      `${s.firstName} ${s.lastName} ${s.studentRollCode} ${s.email}`
        .toLowerCase()
        .includes(q);
    const matchFilter =
      filterStatus === "ALL" ||
      s.attendanceStatus?.toUpperCase() === filterStatus ||
      (filterStatus === "UNMARKED" && !s.attendanceStatus);
    return matchSearch && matchFilter;
  });

  const sorted = sortStudents(filtered, sortKey);
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loadingClasses) {
    return (
      <TeacherLayout title="Attendance">
        <div className="ta-loading">
          <Spinner />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="Attendance">
      <div className="ta-page">
        {/* ── Heading ── */}
        <div className="ta-heading-row">
          <div>
            <h1 className="ta-heading">Attendance</h1>
            <p className="ta-sub">
              {classes.length === 0
                ? "No classes assigned yet"
                : isMyMentorClass
                  ? `Marking attendance for ${selectedClass?.className ?? ""}${selectedClass?.section ? ` — Section ${selectedClass.section}` : ""}`
                  : isMentor
                    ? "Select your mentor class to mark attendance"
                    : "Viewing attendance records for your classes"}
            </p>
          </div>
          <button
            className="ta-refresh-btn"
            onClick={() => {
              fetchStudents(selectedClassId);
              fetchAttendance(selectedClassId, selectedDate);
            }}
            disabled={stuLoading || attLoading}
            title="Refresh">
            <RefreshCw
              size={15}
              className={stuLoading || attLoading ? "ta-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ── No classes empty state ── */}
        {classes.length === 0 && (
          <div className="ta-empty-page">
            <div className="ta-empty-page__icon">
              <GraduationCap size={36} strokeWidth={1.3} />
            </div>
            <p className="ta-empty-page__title">No classes assigned</p>
            <span className="ta-empty-page__desc">
              You need to be assigned to a class before you can view or mark
              attendance. Contact your admin to get assigned.
            </span>
          </div>
        )}

        {classes.length > 0 && (
          <>
            {/* ── Class tabs + date picker row ── */}
            <div className="ta-controls">
              <div className="ta-class-tabs">
                {classes.map((cls) => {
                  const isThisMentor =
                    isMentor && cls.mentorTeacherId === profile?.userId;
                  return (
                    <button
                      key={cls.id}
                      className={`ta-class-tab${selectedClassId === cls.id ? " ta-class-tab--active" : ""}`}
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setSearch("");
                        setFilterStatus("ALL");
                      }}>
                      <GraduationCap size={13} />
                      {cls.className}
                      {cls.section ? ` · ${cls.section}` : ""}
                      <span
                        className={`ta-tab-role-chip ta-tab-role-chip--${isThisMentor ? "mentor" : "subject"}`}>
                        {isThisMentor ? "Mentor" : "Subject"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Date picker — only useful for mentor */}
              <div className="ta-date-wrap">
                <CalendarCheck size={15} className="ta-date-icon" />
                <input
                  type="date"
                  className="ta-date-input"
                  value={selectedDate}
                  max={TODAY}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            {/* ── Role access banner ── */}
            {isMyMentorClass ? (
              <div className="ta-role-banner ta-role-banner--mentor">
                <div className="ta-role-banner__icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="ta-role-banner__text">
                  <span className="ta-role-banner__title">
                    Mentor Teacher — Attendance Access
                  </span>
                  <span className="ta-role-banner__desc">
                    You are the Mentor Teacher for this class. You can mark and
                    update attendance for all active students. Select a date
                    above to mark or review attendance.
                  </span>
                </div>
                <div className="ta-role-banner__date">
                  <CalendarCheck size={14} />
                  {fmtDate(selectedDate)}
                </div>
              </div>
            ) : (
              <div className="ta-role-banner ta-role-banner--subject">
                <div className="ta-role-banner__icon">
                  <BookMarked size={18} />
                </div>
                <div className="ta-role-banner__text">
                  <span className="ta-role-banner__title">
                    {isMentor
                      ? "Not Your Mentor Class — View Only"
                      : "Subject Teacher — View Only"}
                  </span>
                  <span className="ta-role-banner__desc">
                    {isMentor
                      ? `Only your mentor class allows attendance marking. This class is managed by ${selectedClass?.mentorTeacherName ?? "another teacher"}.`
                      : `Attendance for this class is managed by ${selectedClass?.mentorTeacherName ?? "the Mentor Teacher"}. You can view records but cannot mark attendance.`}
                  </span>
                </div>
                <div className="ta-role-banner__view-tag">
                  <Eye size={13} /> View Only
                </div>
              </div>
            )}

            {/* ── KPI Stats cards ── */}
            <div className="ta-kpi-grid">
              <div className="ta-kpi-card ta-kpi-card--blue">
                <div className="ta-kpi-icon">
                  <Users size={20} />
                </div>
                <div className="ta-kpi-body">
                  <span className="ta-kpi-value">{students.length}</span>
                  <span className="ta-kpi-label">Total Students</span>
                  <span className="ta-kpi-sub">Active in class</span>
                </div>
              </div>
              <div className="ta-kpi-card ta-kpi-card--green">
                <div className="ta-kpi-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div className="ta-kpi-body">
                  <span className="ta-kpi-value">{presentCount}</span>
                  <span className="ta-kpi-label">Present</span>
                  <span className="ta-kpi-sub">
                    {students.length > 0
                      ? `${Math.round((presentCount / students.length) * 100)}% attendance`
                      : "No students"}
                  </span>
                </div>
              </div>
              <div className="ta-kpi-card ta-kpi-card--red">
                <div className="ta-kpi-icon">
                  <XCircle size={20} />
                </div>
                <div className="ta-kpi-body">
                  <span className="ta-kpi-value">{absentCount}</span>
                  <span className="ta-kpi-label">Absent</span>
                  <span className="ta-kpi-sub">
                    {students.length > 0
                      ? `${Math.round((absentCount / students.length) * 100)}% absent`
                      : "No students"}
                  </span>
                </div>
              </div>
              <div className="ta-kpi-card ta-kpi-card--amber">
                <div className="ta-kpi-icon">
                  <Clock size={20} />
                </div>
                <div className="ta-kpi-body">
                  <span className="ta-kpi-value">{lateCount}</span>
                  <span className="ta-kpi-label">Late</span>
                  <span className="ta-kpi-sub">
                    {excusedCount > 0
                      ? `+${excusedCount} excused`
                      : "Arrived late"}
                  </span>
                </div>
              </div>
              <div className="ta-kpi-card ta-kpi-card--purple">
                <div className="ta-kpi-icon">
                  <AlertCircle size={20} />
                </div>
                <div className="ta-kpi-body">
                  <span className="ta-kpi-value">{unmarkedCount}</span>
                  <span className="ta-kpi-label">Unmarked</span>
                  <span className="ta-kpi-sub">
                    {isMyMentorClass ? "Needs attention" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Progress + bulk actions (mentor only) ── */}
            {students.length > 0 && (
              <div className="ta-progress-card">
                <div className="ta-progress-header">
                  <span className="ta-progress-label">
                    Attendance Progress — {fmtDate(selectedDate)}
                  </span>
                  <span className="ta-progress-pct">
                    {markedCount}/{students.length} marked
                    {students.length > 0 &&
                      ` · ${Math.round((markedCount / students.length) * 100)}%`}
                  </span>
                </div>
                <div className="ta-progress-bar-wrap">
                  <div
                    className="ta-progress-bar"
                    style={{
                      width: `${students.length ? (markedCount / students.length) * 100 : 0}%`,
                    }}
                  />
                </div>

                {/* Bulk actions — MENTOR ONLY */}
                {isMyMentorClass && unmarkedCount > 0 && (
                  <div className="ta-bulk-actions">
                    <span className="ta-bulk-label">
                      Mark all {unmarkedCount} unmarked as:
                    </span>
                    {ATTENDANCE_STATUSES.map((s) => (
                      <button
                        key={s}
                        className={`ta-bulk-btn ta-bulk-btn--${s.toLowerCase()}`}
                        onClick={() => markAll(s)}
                        disabled={saving}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                    {saving && (
                      <Spinner size="small" color="var(--teacher-primary)" />
                    )}
                  </div>
                )}

                {/* Subject teacher: explain they cannot bulk mark */}
                {!isMyMentorClass && (
                  <div className="ta-readonly-note">
                    <Eye size={13} />
                    You are viewing attendance records. Only the Mentor Teacher
                    can mark or update attendance.
                  </div>
                )}
              </div>
            )}

            {/* ── Toolbar ── */}
            <div className="ta-toolbar">
              <div className="ta-search-wrap">
                <Search size={14} className="ta-search-icon" />
                <input
                  type="text"
                  className="ta-search"
                  placeholder="Search by name, roll code, email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="ta-search-clear"
                    onClick={() => setSearch("")}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="ta-filter-group">
                {[
                  "ALL",
                  "PRESENT",
                  "ABSENT",
                  "LATE",
                  "EXCUSED",
                  "UNMARKED",
                ].map((f) => (
                  <button
                    key={f}
                    className={`ta-filter-btn${filterStatus === f ? " ta-filter-btn--active" : ""}`}
                    onClick={() => setFilterStatus(f)}>
                    {f === "ALL"
                      ? "All"
                      : f.charAt(0) + f.slice(1).toLowerCase()}
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

            {/* ── Results info ── */}
            {!stuLoading && (
              <div className="ta-results-info">
                {fmtDate(selectedDate)} · Showing{" "}
                {paginated.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
                {Math.min(page * PAGE_SIZE, totalRows)} of {totalRows} student
                {totalRows !== 1 ? "s" : ""}
                {search && ` matching "${search}"`}
              </div>
            )}

            {/* ── Attendance table ── */}
            {stuLoading || attLoading ? (
              <div className="ta-loading-inline">
                <Spinner />
              </div>
            ) : students.length === 0 ? (
              <div className="ta-empty">
                <div className="ta-empty__icon">
                  <Users size={28} strokeWidth={1.3} />
                </div>
                <p>No active students in this class</p>
                <span>
                  {isMyMentorClass
                    ? "Add students via the Students page first, then mark their attendance here."
                    : "There are no active students in this class yet."}
                </span>
              </div>
            ) : paginated.length === 0 ? (
              <div className="ta-empty">
                <div className="ta-empty__icon">
                  <Search size={28} strokeWidth={1.3} />
                </div>
                <p>No students match your search</p>
                <span>
                  Try a different name, roll code, or clear the filter.
                </span>
              </div>
            ) : (
              <div className="ta-table-card">
                <div className="ta-table-wrap">
                  <table className="ta-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>Roll Code</th>
                        <th>Status</th>
                        {/* Action column header changes based on role */}
                        <th>
                          {isMyMentorClass
                            ? "Mark Attendance"
                            : "Attendance (View Only)"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((student, idx) => {
                        const rowNo = (page - 1) * PAGE_SIZE + idx + 1;
                        const sm = statusMeta(student.attendanceStatus);
                        const marked = !!student.attendanceStatus;
                        const isSaving = saveIdx === student.userId;
                        return (
                          <tr
                            key={student.id}
                            className={marked ? "ta-row--marked" : ""}>
                            <td className="ta-cell-no">{rowNo}</td>

                            {/* Student */}
                            <td>
                              <div className="ta-student-cell">
                                <div className="ta-student-avatar">
                                  {student.photoPath ? (
                                    <img
                                      src={`http://localhost:8080/${student.photoPath}`}
                                      alt=""
                                      className="ta-avatar-img"
                                    />
                                  ) : (
                                    getInitials(student)
                                  )}
                                </div>
                                <div className="ta-student-info">
                                  <span className="ta-student-name">
                                    {student.firstName} {student.lastName}
                                  </span>
                                  <span className="ta-student-email">
                                    {student.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Roll code */}
                            <td>
                              <span className="ta-roll">
                                {student.studentRollCode || "—"}
                              </span>
                            </td>

                            {/* Current status badge */}
                            <td>
                              {marked ? (
                                <span className={`ta-badge ${sm.cls}`}>
                                  {sm.icon}
                                  {sm.label}
                                </span>
                              ) : (
                                <span className="ta-badge ta-badge--unmarked">
                                  <AlertCircle size={11} /> Unmarked
                                </span>
                              )}
                            </td>

                            {/* Mark buttons (mentor) OR read-only view (subject) */}
                            <td>
                              {isMyMentorClass ? (
                                <div className="ta-mark-row">
                                  {ATTENDANCE_STATUSES.map((status) => (
                                    <button
                                      key={status}
                                      className={`ta-mark-btn ta-mark-btn--${status.toLowerCase()}${student.attendanceStatus === status ? " ta-mark-btn--selected" : ""}`}
                                      onClick={() =>
                                        markSingle(student.userId, status)
                                      }
                                      disabled={
                                        isSaving ||
                                        saving ||
                                        student.attendanceStatus === status
                                      }
                                      title={`Mark as ${status}`}>
                                      {isSaving &&
                                      student.attendanceStatus !== status ? (
                                        <Spinner
                                          size="small"
                                          color="currentColor"
                                        />
                                      ) : (
                                        status.charAt(0) +
                                        status.slice(1).toLowerCase()
                                      )}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                /* Subject teacher: show status text only */
                                <span className="ta-readonly-cell">
                                  {marked ? (
                                    <span className={`ta-badge ${sm.cls}`}>
                                      {sm.icon}
                                      {sm.label}
                                    </span>
                                  ) : (
                                    <span className="ta-readonly-na">
                                      Not marked yet
                                    </span>
                                  )}
                                </span>
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

            {/* ── Pagination (only when > PAGE_THRESH) ── */}
            {!stuLoading && (
              <Pagination
                page={page}
                totalPages={totalPages}
                setPage={setPage}
                totalRows={totalRows}
                pageSize={PAGE_SIZE}
              />
            )}
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
