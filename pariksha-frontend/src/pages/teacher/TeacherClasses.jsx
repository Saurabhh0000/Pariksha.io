import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Users,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GraduationCap,
  CheckCircle2,
  UserCheck,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  ShieldCheck,
  Tag,
  BarChart2,
  FileText,
  BookMarked,
  Info,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import teacherService from "../../services/teacherService";
import "./TeacherClasses.css";

// ── Constants ─────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "name_asc", label: "Class Name A → Z" },
  { value: "name_desc", label: "Class Name Z → A" },
  { value: "section_asc", label: "Section A → Z" },
  { value: "students_desc", label: "Most Students" },
  { value: "students_asc", label: "Fewest Students" },
];

const PAGE_SIZE = 6;
const PAGE_THRESH = 6; // pagination only shows when items exceed this

// ── Helpers ───────────────────────────────────────────
function sortClasses(list, key) {
  const s = [...list];
  switch (key) {
    case "name_asc":
      return s.sort((a, b) =>
        (a.className ?? "").localeCompare(b.className ?? ""),
      );
    case "name_desc":
      return s.sort((a, b) =>
        (b.className ?? "").localeCompare(a.className ?? ""),
      );
    case "section_asc":
      return s.sort((a, b) => (a.section ?? "").localeCompare(b.section ?? ""));
    case "students_desc":
      return s.sort((a, b) => (b.studentCount ?? 0) - (a.studentCount ?? 0));
    case "students_asc":
      return s.sort((a, b) => (a.studentCount ?? 0) - (b.studentCount ?? 0));
    default:
      return s;
  }
}

function getClassInitials(name) {
  if (!name) return "CL";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Sort dropdown ──────────────────────────────────────
function SortDropdown({ sortKey, setSortKey, show, setShow }) {
  return (
    <div className="tc-sort-wrap">
      <button className="tc-sort-btn" onClick={() => setShow((p) => !p)}>
        <ArrowUpDown size={14} />
        {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort"}
        {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {show && (
        <div className="tc-sort-dropdown">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`tc-sort-option${sortKey === o.value ? " tc-sort-option--active" : ""}`}
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
    <div className="tc-pagination">
      <span className="tc-page-info">
        {start}–{end} of {totalRows}
      </span>
      <div className="tc-page-controls">
        <button
          className="tc-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}>
          <ChevronLeft size={16} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={`tc-page-btn tc-page-btn--num${page === p ? " tc-page-btn--active" : ""}`}
            onClick={() => setPage(p)}>
            {p}
          </button>
        ))}
        <button
          className="tc-page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Class detail modal (role-aware buttons) ───────────
function ClassDetailModal({ cls, profile, onClose, navigate }) {
  const isMentor = profile?.isMentor === true;
  const isMyMentorClass = isMentor && cls.mentorTeacherId === profile?.userId;

  return (
    <Modal title="Class Details" onClose={onClose} size="medium">
      <div className="tc-detail-modal">
        {/* Hero row */}
        <div className="tc-detail-hero">
          <div className="tc-detail-avatar">
            {getClassInitials(cls.className)}
          </div>
          <div className="tc-detail-info">
            <h2 className="tc-detail-name">
              {cls.className}
              {cls.section ? ` — Section ${cls.section}` : ""}
            </h2>
            {/* Per-class role chip */}
            <span
              className={`tc-detail-role-chip tc-detail-role-chip--${isMyMentorClass ? "mentor" : "subject"}`}>
              {isMyMentorClass ? "My Mentor Class" : "Subject Teacher"}
            </span>
            {cls.mentorTeacherName && !isMyMentorClass && (
              <span className="tc-detail-mentor">
                <UserCheck size={13} /> Mentor: {cls.mentorTeacherName}
                {cls.mentorTeacherCode && (
                  <span className="tc-detail-code">
                    {cls.mentorTeacherCode}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Student count stat */}
        <div className="tc-detail-stat-row">
          <div className="tc-detail-stat">
            <div className="tc-detail-stat__icon">
              <Users size={16} />
            </div>
            <div className="tc-detail-stat__body">
              <span className="tc-detail-stat__value">
                {cls.studentCount ?? "—"}
              </span>
              <span className="tc-detail-stat__label">Active Students</span>
            </div>
          </div>
          {isMyMentorClass && (
            <div className="tc-detail-info-note">
              <Info size={13} />
              <span>
                You are the Mentor Teacher of this class. You have full access
                to manage students, attendance, and marks.
              </span>
            </div>
          )}
          {!isMyMentorClass && (
            <div className="tc-detail-info-note tc-detail-info-note--subject">
              <Info size={13} />
              <span>
                You are a Subject Teacher in this class. You can manage marks,
                papers, and results for your subject.
              </span>
            </div>
          )}
        </div>

        {/* Subject teachers list */}
        {cls.subjectTeachers?.length > 0 && (
          <div className="tc-detail-section">
            <p className="tc-detail-section-title">
              <BookOpen size={13} /> Subject Teachers
            </p>
            <div className="tc-detail-subjects">
              {cls.subjectTeachers.map((st) => (
                <div
                  key={st.id ?? st.subject}
                  className="tc-detail-subject-row">
                  <span className="tc-subject-chip">
                    <Tag size={10} />
                    {st.subject}
                  </span>
                  <span className="tc-subject-teacher">{st.teacherName}</span>
                  {st.teacherCode && (
                    <span className="tc-subject-code">{st.teacherCode}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role-aware action buttons */}
        <div className="tc-detail-actions">
          {isMyMentorClass ? (
            <>
              <button
                className="tc-detail-action-btn"
                onClick={() => {
                  onClose();
                  navigate("/teacher/students");
                }}>
                <Users size={15} /> Students
              </button>
              <button
                className="tc-detail-action-btn"
                onClick={() => {
                  onClose();
                  navigate("/teacher/attendance");
                }}>
                <CalendarCheck size={15} /> Attendance
              </button>
              <button
                className="tc-detail-action-btn"
                onClick={() => {
                  onClose();
                  navigate("/teacher/marks");
                }}>
                <ClipboardList size={15} /> Marks
              </button>
            </>
          ) : (
            <>
              <button
                className="tc-detail-action-btn"
                onClick={() => {
                  onClose();
                  navigate("/teacher/marks");
                }}>
                <ClipboardList size={15} /> Marks
              </button>
              <button
                className="tc-detail-action-btn"
                onClick={() => {
                  onClose();
                  navigate("/teacher/papers");
                }}>
                <FileText size={15} /> Papers
              </button>
              <button
                className="tc-detail-action-btn"
                onClick={() => {
                  onClose();
                  navigate("/teacher/results");
                }}>
                <BarChart2 size={15} /> Results
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────
export default function TeacherClasses() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countLoading, setCountLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name_asc");
  const [showSort, setShowSort] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedClass, setSelectedClass] = useState(null);
  const [toast, setToast] = useState(null);

  // ── Fetch profile + classes + student counts ──────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const [profileRes, classRes] = await Promise.all([
        teacherService.getProfile(),
        teacherService.getClasses(),
      ]);

      const profileData = profileRes.data.data ?? null;
      const list = classRes.data.data ?? [];

      setProfile(profileData);
      setClasses(list.map((c) => ({ ...c, studentCount: null })));

      // Fetch student counts in parallel
      setCountLoading(true);
      const countResults = await Promise.allSettled(
        list.map((cls) => teacherService.getStudentsIn(cls.id)),
      );

      setClasses(
        list.map((cls, i) => {
          const result = countResults[i];
          const students =
            result.status === "fulfilled"
              ? (result.value.data.data ?? []).filter(
                  (s) => s.status?.toUpperCase() === "ACTIVE",
                )
              : [];
          return { ...cls, studentCount: students.length, students };
        }),
      );
    } catch {
      setToast({ message: "Failed to load classes.", type: "error" });
    } finally {
      setLoading(false);
      setCountLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useEffect(() => {
    setPage(1);
  }, [search, sortKey]);

  // ── Derived values ────────────────────────────────
  const isMentor = profile?.isMentor === true;

  // Per-class mentor check
  const enriched = classes.map((cls) => ({
    ...cls,
    isMyMentorClass: isMentor && cls.mentorTeacherId === profile?.userId,
  }));

  const filtered = enriched.filter((cls) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      cls.className?.toLowerCase().includes(q) ||
      cls.section?.toLowerCase().includes(q) ||
      cls.mentorTeacherName?.toLowerCase().includes(q) ||
      cls.subjectTeachers?.some(
        (st) =>
          st.subject?.toLowerCase().includes(q) ||
          st.teacherName?.toLowerCase().includes(q),
      )
    );
  });

  const sorted = sortClasses(filtered, sortKey);
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary stats
  const totalStudents = classes.reduce(
    (sum, c) => sum + (c.studentCount ?? 0),
    0,
  );
  const myMentorClass = enriched.find((c) => c.isMyMentorClass);
  const subjectClasses = enriched.filter((c) => !c.isMyMentorClass).length;
  const totalSubjects = new Set(
    classes.flatMap((c) => c.subjectTeachers?.map((s) => s.subject) ?? []),
  ).size;

  if (loading) {
    return (
      <TeacherLayout title="My Classes">
        <div className="tc-loading">
          <Spinner />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="My Classes">
      <div className="tc-page">
        {/* ── Page heading ── */}
        <div className="tc-heading-row">
          <div>
            <h1 className="tc-heading">My Classes</h1>
            <p className="tc-sub">
              {classes.length === 0
                ? "No classes assigned yet — contact your admin"
                : isMentor
                  ? `You mentor ${myMentorClass ? "1 class" : "no class"} and teach in ${subjectClasses} other${subjectClasses !== 1 ? "s" : ""}`
                  : `You teach subjects across ${classes.length} class${classes.length !== 1 ? "es" : ""}`}
            </p>
          </div>
          <button
            className="tc-refresh-btn"
            onClick={fetchAll}
            disabled={loading || countLoading}
            title="Refresh classes">
            <RefreshCw
              size={15}
              className={loading || countLoading ? "tc-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ── No classes empty state ── */}
        {classes.length === 0 && (
          <div className="tc-empty-page">
            <div className="tc-empty-page__icon">
              <Layers size={36} strokeWidth={1.3} />
            </div>
            <p className="tc-empty-page__title">No classes assigned yet</p>
            <span className="tc-empty-page__desc">
              Your admin hasn't assigned you to any class yet. Once assigned,
              your classes will appear here with full details.
            </span>
          </div>
        )}

        {classes.length > 0 && (
          <>
            {/* ── Role info banner ── */}
            {isMentor ? (
              <div className="tc-role-banner tc-role-banner--mentor">
                <div className="tc-role-banner__icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="tc-role-banner__text">
                  <span className="tc-role-banner__title">Mentor Teacher</span>
                  <span className="tc-role-banner__desc">
                    You have full management access to your mentor class — add
                    students, mark attendance, and upload marks. For other
                    classes, you are a subject teacher with limited access.
                  </span>
                </div>
              </div>
            ) : (
              <div className="tc-role-banner tc-role-banner--subject">
                <div className="tc-role-banner__icon">
                  <BookMarked size={18} />
                </div>
                <div className="tc-role-banner__text">
                  <span className="tc-role-banner__title">Subject Teacher</span>
                  <span className="tc-role-banner__desc">
                    You teach subjects across these classes. You can manage
                    marks, create papers, and view results. Student roster and
                    attendance are handled by each class's Mentor Teacher.
                  </span>
                </div>
              </div>
            )}

            {/* ── Stats strip (same style as Dashboard KPI cards) ── */}
            <div className="tc-kpi-grid">
              <div className="tc-kpi-card tc-kpi-card--blue">
                <div className="tc-kpi-icon">
                  <Layers size={20} />
                </div>
                <div className="tc-kpi-body">
                  <span className="tc-kpi-value">{classes.length}</span>
                  <span className="tc-kpi-label">Total Classes</span>
                  <span className="tc-kpi-sub">Assigned to you</span>
                </div>
              </div>

              <div className="tc-kpi-card tc-kpi-card--cyan">
                <div className="tc-kpi-icon">
                  {countLoading ? (
                    <Spinner size="small" color="#0E7490" />
                  ) : (
                    <Users size={20} />
                  )}
                </div>
                <div className="tc-kpi-body">
                  <span className="tc-kpi-value">
                    {countLoading ? "—" : totalStudents}
                  </span>
                  <span className="tc-kpi-label">Total Students</span>
                  <span className="tc-kpi-sub">Active across classes</span>
                </div>
              </div>

              {isMentor ? (
                <div className="tc-kpi-card tc-kpi-card--green">
                  <div className="tc-kpi-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="tc-kpi-body">
                    <span className="tc-kpi-value">
                      {myMentorClass ? 1 : 0}
                    </span>
                    <span className="tc-kpi-label">Mentor Class</span>
                    <span className="tc-kpi-sub">
                      {myMentorClass
                        ? `${myMentorClass.className}${myMentorClass.section ? ` — ${myMentorClass.section}` : ""}`
                        : "Not yet assigned"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="tc-kpi-card tc-kpi-card--green">
                  <div className="tc-kpi-icon">
                    <GraduationCap size={20} />
                  </div>
                  <div className="tc-kpi-body">
                    <span className="tc-kpi-value">{classes.length}</span>
                    <span className="tc-kpi-label">Classes Teaching</span>
                    <span className="tc-kpi-sub">As subject teacher</span>
                  </div>
                </div>
              )}

              <div className="tc-kpi-card tc-kpi-card--indigo">
                <div className="tc-kpi-icon">
                  <BookOpen size={20} />
                </div>
                <div className="tc-kpi-body">
                  <span className="tc-kpi-value">{totalSubjects}</span>
                  <span className="tc-kpi-label">Subjects Taught</span>
                  <span className="tc-kpi-sub">Across all classes</span>
                </div>
              </div>
            </div>

            {/* ── Search + Sort toolbar ── */}
            <div className="tc-toolbar">
              <div className="tc-search-wrap">
                <Search size={14} className="tc-search-icon" />
                <input
                  type="text"
                  className="tc-search"
                  placeholder="Search by class name, section, subject or teacher…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="tc-search-clear"
                    onClick={() => setSearch("")}>
                    <X size={13} />
                  </button>
                )}
              </div>
              <SortDropdown
                sortKey={sortKey}
                setSortKey={setSortKey}
                show={showSort}
                setShow={setShowSort}
              />
            </div>

            {/* ── Results count ── */}
            <div className="tc-results-info">
              {totalRows === 0
                ? `No classes match "${search}"`
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalRows)} of ${totalRows} class${totalRows !== 1 ? "es" : ""}${search ? ` matching "${search}"` : ""}`}
            </div>

            {/* ── Empty search state ── */}
            {paginated.length === 0 ? (
              <div className="tc-empty">
                <div className="tc-empty__icon">
                  <Search size={28} strokeWidth={1.3} />
                </div>
                <p>No classes match your search</p>
                <span>
                  Try searching by a different class name, section, or subject.
                </span>
                <button
                  className="tc-empty__clear"
                  onClick={() => setSearch("")}>
                  Clear search
                </button>
              </div>
            ) : (
              /* ── Class cards grid ── */
              <div className="tc-grid">
                {paginated.map((cls) => (
                  <div
                    key={cls.id}
                    className={`tc-card${cls.isMyMentorClass ? " tc-card--mentor" : ""}`}>
                    {/* Card header */}
                    <div className="tc-card__header">
                      <div className="tc-card__avatar">
                        {getClassInitials(cls.className)}
                      </div>
                      <div className="tc-card__title-wrap">
                        <h2 className="tc-card__title">
                          {cls.className}
                          {cls.section ? ` — Sec ${cls.section}` : ""}
                        </h2>
                        {/* Per-class role chip */}
                        <span
                          className={`tc-card__role-chip tc-card__role-chip--${cls.isMyMentorClass ? "mentor" : "subject"}`}>
                          {cls.isMyMentorClass
                            ? "My Mentor Class"
                            : "Subject Teacher"}
                        </span>
                      </div>
                      {/* Student count */}
                      <div className="tc-card__count">
                        {countLoading && cls.studentCount === null ? (
                          <Spinner
                            size="small"
                            color="var(--teacher-primary)"
                          />
                        ) : (
                          <>
                            <span className="tc-card__count-num">
                              {cls.studentCount ?? 0}
                            </span>
                            <span className="tc-card__count-label">
                              Students
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mentor info (only for non-mentor classes) */}
                    {cls.mentorTeacherName && !cls.isMyMentorClass && (
                      <div className="tc-card__mentor-row">
                        <UserCheck size={12} />
                        <span>Mentor: {cls.mentorTeacherName}</span>
                        {cls.mentorTeacherCode && (
                          <span className="tc-card__mentor-code">
                            {cls.mentorTeacherCode}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Subject chips */}
                    {cls.subjectTeachers?.length > 0 && (
                      <div className="tc-card__subjects">
                        {cls.subjectTeachers.slice(0, 4).map((st) => (
                          <span
                            key={st.id ?? st.subject}
                            className="tc-subject-chip">
                            <Tag size={10} />
                            {st.subject}
                          </span>
                        ))}
                        {cls.subjectTeachers.length > 4 && (
                          <span className="tc-subject-chip tc-subject-chip--more">
                            +{cls.subjectTeachers.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Role-aware action buttons */}
                    <div className="tc-card__actions">
                      <button
                        className="tc-card__action-btn tc-card__action-btn--details"
                        onClick={() => setSelectedClass(cls)}>
                        <Layers size={13} /> Details
                      </button>

                      {cls.isMyMentorClass ? (
                        <>
                          <button
                            className="tc-card__action-btn"
                            onClick={() => navigate("/teacher/students")}>
                            <Users size={13} /> Students
                          </button>
                          <button
                            className="tc-card__action-btn"
                            onClick={() => navigate("/teacher/attendance")}>
                            <CalendarCheck size={13} /> Attendance
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="tc-card__action-btn"
                            onClick={() => navigate("/teacher/marks")}>
                            <ClipboardList size={13} /> Marks
                          </button>
                          <button
                            className="tc-card__action-btn"
                            onClick={() => navigate("/teacher/papers")}>
                            <FileText size={13} /> Papers
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Pagination (only when > PAGE_THRESH items) ── */}
            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              totalRows={totalRows}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </div>

      {/* ── Class detail modal ── */}
      {selectedClass && (
        <ClassDetailModal
          cls={selectedClass}
          profile={profile}
          onClose={() => setSelectedClass(null)}
          navigate={navigate}
        />
      )}

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
