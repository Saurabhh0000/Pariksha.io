import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BookOpen,
  Plus,
  Search,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Users,
  UserCheck,
  Trash2,
  UserPlus,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Shield,
  BookMarked,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/shared/Modal";
import Toast from "../../components/shared/Toast";
import Spinner from "../../components/shared/Spinner";
import adminService from "../../services/adminService";
import "./AdminClasses.css";

// ── Pagination config ──
const PAGE_SIZE_OPTIONS = [6, 12, 24];

// ── Sort options ──
const SORT_OPTIONS = [
  { value: "className_asc", label: "Class Name A → Z" },
  { value: "className_desc", label: "Class Name Z → A" },
  { value: "section_asc", label: "Section A → Z" },
  { value: "section_desc", label: "Section Z → A" },
  { value: "mentor_asc", label: "Mentor Assigned First" },
  { value: "mentor_desc", label: "No Mentor First" },
];

export default function AdminClasses() {
  // ── Data state ──
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Search / filter / sort ──
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("className_asc");
  const sortDropdownRef = useRef(null);
  const [showSort, setShowSort] = useState(false);

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // ── Modals ──
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showMentor, setShowMentor] = useState(false);
  const [showSubject, setShowSubject] = useState(false);
  const [showRemSub, setShowRemSub] = useState(false);
  const [selected, setSelected] = useState(null);

  // ── Form fields ──
  const [newClassName, setNewClassName] = useState("");
  const [newSection, setNewSection] = useState("");
  const [createErrors, setCreateErrors] = useState({});
  const [mentorTeacherId, setMentorTeacherId] = useState("");
  const [subjectTeacherId, setSubjectTeacherId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectErrors, setSubjectErrors] = useState({});
  const [subjectToRemove, setSubjectToRemove] = useState(null);

  // ── Fetch all data ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [classRes, teacherRes] = await Promise.all([
        adminService.getAllClasses(),
        adminService.getAllTeachers(),
      ]);
      setClasses(classRes.data.data || []);
      setTeachers(teacherRes.data.data || []);
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to load data.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Reset to page 1 when search/sort changes ──
  useEffect(() => {
    setPage(1);
  }, [search, sortBy, pageSize]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target)
      ) {
        setShowSort(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ── Filtered + sorted + paginated data ──
  const processed = useMemo(() => {
    let list = [...classes];

    // Search
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (c) =>
          c.className?.toLowerCase().includes(q) ||
          c.section?.toLowerCase().includes(q) ||
          c.mentorTeacherName?.toLowerCase().includes(q),
      );
    }

    // Sort
    const [field, dir] = sortBy.split("_");
    list.sort((a, b) => {
      let av, bv;
      if (field === "className") {
        av = a.className || "";
        bv = b.className || "";
      }
      if (field === "section") {
        av = a.section || "";
        bv = b.section || "";
      }
      if (field === "mentor") {
        av = a.mentorTeacherName ? 0 : 1;
        bv = b.mentorTeacherName ? 0 : 1;
        return dir === "asc" ? av - bv : bv - av;
      }
      if (typeof av === "string") {
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return 0;
    });

    return list;
  }, [classes, search, sortBy]);

  // Pagination calcs
  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginated = processed.slice(pageStart, pageStart + pageSize);

  // ── Stats ──
  const withMentor = classes.filter((c) => c.mentorTeacherName).length;
  const withoutMentor = classes.length - withMentor;
  const totalSubjects = classes.reduce(
    (acc, c) => acc + (c.subjectTeachers?.length || 0),
    0,
  );

  // ────────────────────────────────────────
  //   CREATE CLASS
  // ────────────────────────────────────────

  async function handleCreate(e) {
    e.preventDefault();
    const errs = {};
    if (!newClassName.trim()) errs.className = "Class name is required.";
    if (!newSection.trim()) errs.section = "Section is required.";
    if (Object.keys(errs).length) {
      setCreateErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      await adminService.createClass({
        className: newClassName.trim(),
        section: newSection.trim().toUpperCase(),
      });
      setToast({ type: "success", message: "Class created successfully!" });
      setShowCreate(false);
      setNewClassName("");
      setNewSection("");
      setCreateErrors({});
      fetchAll();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to create class.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ────────────────────────────────────────
  //   ASSIGN MENTOR
  // ────────────────────────────────────────

  async function handleAssignMentor(e) {
    e.preventDefault();
    if (!mentorTeacherId) {
      setToast({ type: "warning", message: "Please select a teacher." });
      return;
    }
    setSubmitting(true);
    try {
      await adminService.updateMentor(selected.id, mentorTeacherId);
      setToast({ type: "success", message: "Mentor teacher assigned!" });
      setShowMentor(false);
      setMentorTeacherId("");
      fetchAll();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to assign mentor.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ────────────────────────────────────────
  //   ADD SUBJECT TEACHER
  // ────────────────────────────────────────

  async function handleAddSubject(e) {
    e.preventDefault();
    const errs = {};
    if (!subjectTeacherId) errs.teacher = "Please select a teacher.";
    if (!subjectName.trim()) errs.subject = "Subject name is required.";
    if (Object.keys(errs).length) {
      setSubjectErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      await adminService.addSubjectTeacher(selected.id, {
        teacherUserId: subjectTeacherId,
        subject: subjectName.trim(),
      });
      setToast({ type: "success", message: "Subject teacher added!" });
      setShowSubject(false);
      setSubjectTeacherId("");
      setSubjectName("");
      setSubjectErrors({});
      fetchAll();
    } catch (err) {
      setToast({
        type: "error",
        message:
          err.response?.data?.message || "Failed to add subject teacher.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ────────────────────────────────────────
  //   REMOVE SUBJECT TEACHER
  // ────────────────────────────────────────

  async function handleRemoveSubject() {
    if (!subjectToRemove) return;
    setSubmitting(true);
    try {
      await adminService.removeSubjectTeacher(
        selected.id,
        subjectToRemove.teacherUserId,
        subjectToRemove.subject,
      );
      setToast({ type: "success", message: "Subject teacher removed." });
      setShowRemSub(false);
      setSubjectToRemove(null);
      fetchAll();
    } catch (err) {
      setToast({
        type: "error",
        message:
          err.response?.data?.message || "Failed to remove subject teacher.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ────────────────────────────────────────
  //   HELPERS
  // ────────────────────────────────────────

  function teacherName(t) {
    return `${t.firstName || ""} ${t.lastName || ""}`.trim() || t.email;
  }

  function openMentor(cls) {
    setSelected(cls);
    setMentorTeacherId(cls.mentorTeacherId?.toString() || "");
    setShowMentor(true);
  }

  function openSubject(cls) {
    setSelected(cls);
    setSubjectTeacherId("");
    setSubjectName("");
    setSubjectErrors({});
    setShowSubject(true);
  }

  function openRemSub(cls, sub) {
    setSelected(cls);
    setSubjectToRemove(sub);
    setShowRemSub(true);
  }

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort";

  // ────────────────────────────────────────
  //   RENDER
  // ────────────────────────────────────────

  return (
    <AdminLayout title="Classes">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Page header ── */}
      <div className="ac-header">
        <div>
          <h2 className="ac-page-title">Classes</h2>
          <p className="ac-page-sub">
            Create classes, assign mentor teachers and manage subject
            allocations.
          </p>
        </div>
        <button
          className="ac-add-btn"
          onClick={() => {
            setNewClassName("");
            setNewSection("");
            setCreateErrors({});
            setShowCreate(true);
          }}>
          <Plus size={17} strokeWidth={2.5} />
          New Class
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="ac-summary">
        {[
          {
            label: "Total Classes",
            desc: "Classes available",
            value: classes.length,
            icon: BookOpen,
            variant: "blue",
          },
          {
            label: "Mentor Assigned",
            desc: "Classes with mentors",
            value: withMentor,
            icon: UserCheck,
            variant: "green",
          },
          {
            label: "No Mentor Yet",
            desc: "Need mentor assignment",
            value: withoutMentor,
            icon: AlertCircle,
            variant: "amber",
          },
          {
            label: "Subject Teachers",
            desc: "Teachers assigned",
            value: totalSubjects,
            icon: BookMarked,
            variant: "purple",
          },
        ].map((s) => (
          <div key={s.label} className={`ac-stat ac-stat--${s.variant}`}>
            <div className="ac-stat-icon">
              <s.icon size={20} strokeWidth={1.8} />
            </div>

            <div className="ac-stat-body">
              <p className="ac-stat-val">{s.value}</p>
              <p className="ac-stat-label">{s.label}</p>
              <p className="ac-stat-desc">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="ac-toolbar">
        {/* Search */}
        <div className="ac-search">
          <Search size={15} strokeWidth={2} className="ac-search-icon" />
          <input
            type="text"
            placeholder="Search by class, section or mentor..."
            className="ac-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="ac-search-clear" onClick={() => setSearch("")}>
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="ac-toolbar-right">
          {/* Sort dropdown */}
          <div className="ac-sort-wrap" ref={sortDropdownRef}>
            <button
              className="ac-sort-btn"
              onClick={() => setShowSort((p) => !p)}>
              <ArrowUpDown size={14} strokeWidth={2} />
              <span>{currentSortLabel}</span>
              {showSort ? (
                <ChevronUp size={13} strokeWidth={2.5} />
              ) : (
                <ChevronDown size={13} strokeWidth={2.5} />
              )}
            </button>
            {showSort && (
              <div className="ac-sort-menu">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`ac-sort-item${sortBy === opt.value ? " ac-sort-active" : ""}`}
                    onClick={() => {
                      setSortBy(opt.value);
                      setShowSort(false);
                    }}>
                    {sortBy === opt.value && (
                      <CheckCircle size={13} strokeWidth={2.5} />
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Page size */}
          <div className="ac-pagesize">
            {PAGE_SIZE_OPTIONS.map((n) => (
              <button
                key={n}
                className={`ac-pagesize-btn${pageSize === n ? " active" : ""}`}
                onClick={() => setPageSize(n)}>
                {n}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button className="ac-icon-btn" onClick={fetchAll} title="Refresh">
            <RefreshCw size={15} strokeWidth={2} />
          </button>

          {/* Count */}
          <span className="ac-count">
            {processed.length} of {classes.length}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="ac-loading">
          <Spinner size="large" color="var(--admin-primary)" />
          <p>Loading classes...</p>
        </div>
      ) : processed.length === 0 ? (
        <div className="ac-empty">
          <div className="ac-empty-icon">
            <BookOpen size={40} strokeWidth={1.3} />
          </div>
          <p className="ac-empty-title">
            {search ? "No classes found" : "No classes yet"}
          </p>
          <p className="ac-empty-sub">
            {search
              ? `No results for "${search}".`
              : "Create your first class to get started."}
          </p>
          {!search && (
            <button
              className="ac-empty-cta"
              onClick={() => setShowCreate(true)}>
              <Plus size={16} strokeWidth={2.5} />
              Create First Class
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Cards grid ── */}
          <div className="ac-grid">
            {paginated.map((cls, i) => (
              <div
                key={cls.id}
                className="ac-card"
                style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Card header */}
                <div className="ac-card-top">
                  <div className="ac-card-badge">
                    <BookOpen size={18} strokeWidth={1.8} />
                  </div>
                  <div className="ac-card-title-wrap">
                    <p className="ac-card-name">Class {cls.className}</p>
                    <span className="ac-card-section">
                      Section {cls.section}
                    </span>
                  </div>
                  <span
                    className={`ac-card-status ${cls.mentorTeacherName ? "ac-status-ok" : "ac-status-warn"}`}>
                    {cls.mentorTeacherName ? "Mentor Set" : "No Mentor"}
                  </span>
                </div>

                {/* Mentor row */}
                <div className="ac-card-mentor">
                  <div className="ac-card-mentor-label">
                    <Shield size={13} strokeWidth={2} />
                    Mentor Teacher
                  </div>
                  {cls.mentorTeacherName ? (
                    <div className="ac-card-mentor-name">
                      <div className="ac-mentor-avatar">
                        {cls.mentorTeacherName.charAt(0).toUpperCase()}
                      </div>
                      <span>{cls.mentorTeacherName}</span>
                    </div>
                  ) : (
                    <span className="ac-card-no-mentor">Not assigned</span>
                  )}
                </div>

                {/* Subject teachers */}
                <div className="ac-card-subjects">
                  <div className="ac-card-subjects-label">
                    <GraduationCap size={13} strokeWidth={2} />
                    Subject Teachers
                    <span className="ac-subjects-count">
                      {cls.subjectTeachers?.length || 0}
                    </span>
                  </div>

                  {cls.subjectTeachers?.length > 0 ? (
                    <div className="ac-subjects-list">
                      {cls.subjectTeachers.map((st, idx) => (
                        <div key={idx} className="ac-subject-item">
                          <div className="ac-subject-info">
                            <span className="ac-subject-name">
                              {st.subject}
                            </span>
                            <span className="ac-subject-teacher">
                              {st.teacherName}
                            </span>
                          </div>
                          <button
                            className="ac-subject-remove"
                            onClick={() => openRemSub(cls, st)}
                            title="Remove subject teacher">
                            <X size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="ac-no-subjects">
                      No subject teachers assigned
                    </p>
                  )}
                </div>

                {/* Card actions */}
                <div className="ac-card-actions">
                  <button
                    className="ac-btn-mentor"
                    onClick={() => openMentor(cls)}>
                    <UserCheck size={14} strokeWidth={2} />
                    {cls.mentorTeacherName ? "Change Mentor" : "Assign Mentor"}
                  </button>
                  <button
                    className="ac-btn-subject"
                    onClick={() => openSubject(cls)}>
                    <UserPlus size={14} strokeWidth={2} />
                    Add Subject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="ac-pagination">
              <span className="ac-page-info">
                Page {safePage} of {totalPages} · {processed.length} classes
              </span>

              <div className="ac-page-btns">
                {/* Prev */}
                <button
                  className="ac-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}>
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => {
                    if (totalPages <= 7) return true;
                    if (n === 1 || n === totalPages) return true;
                    if (Math.abs(n - safePage) <= 1) return true;
                    return false;
                  })
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) {
                      acc.push("...");
                    }
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`dots-${idx}`} className="ac-page-dots">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        className={`ac-page-num${safePage === item ? " ac-page-active" : ""}`}
                        onClick={() => setPage(item)}>
                        {item}
                      </button>
                    ),
                  )}

                {/* Next */}
                <button
                  className="ac-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}>
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════
          CREATE CLASS MODAL
      ════════════════════════════ */}
      {showCreate && (
        <Modal
          title="Create New Class"
          onClose={() => setShowCreate(false)}
          size="small">
          <form className="ac-form" onSubmit={handleCreate} noValidate>
            <div className="ac-form-notice">
              <AlertCircle size={14} strokeWidth={2} />
              <span>
                Class + Section must be unique. e.g. Class 10, Section A
              </span>
            </div>

            <div className="ac-form-field">
              <label className="ac-form-label">
                Class Name <span className="ac-required">*</span>
              </label>
              <input
                type="text"
                className={`ac-form-input${createErrors.className ? " ac-input-error" : ""}`}
                placeholder="e.g. 10 or XII-A or Grade 5"
                value={newClassName}
                onChange={(e) => {
                  setNewClassName(e.target.value);
                  if (createErrors.className)
                    setCreateErrors((p) => ({ ...p, className: "" }));
                }}
                autoFocus
              />
              {createErrors.className && (
                <span className="ac-error-msg">{createErrors.className}</span>
              )}
            </div>

            <div className="ac-form-field">
              <label className="ac-form-label">
                Section <span className="ac-required">*</span>
              </label>
              <input
                type="text"
                className={`ac-form-input${createErrors.section ? " ac-input-error" : ""}`}
                placeholder="e.g. A or B or C"
                value={newSection}
                onChange={(e) => {
                  setNewSection(e.target.value);
                  if (createErrors.section)
                    setCreateErrors((p) => ({ ...p, section: "" }));
                }}
              />
              {createErrors.section && (
                <span className="ac-error-msg">{createErrors.section}</span>
              )}
            </div>

            <div className="ac-form-actions">
              <button
                type="button"
                className="ac-btn-cancel"
                onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="ac-btn-submit"
                disabled={submitting}>
                {submitting ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <Plus size={15} strokeWidth={2.5} /> Create Class
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════
          ASSIGN MENTOR MODAL
      ════════════════════════════ */}
      {showMentor && selected && (
        <Modal
          title={`Assign Mentor — Class ${selected.className} ${selected.section}`}
          onClose={() => setShowMentor(false)}
          size="small">
          <form className="ac-form" onSubmit={handleAssignMentor} noValidate>
            <div className="ac-form-notice ac-notice-blue">
              <Shield size={14} strokeWidth={2} />
              <span>
                The mentor teacher manages attendance and student records for
                this class.
              </span>
            </div>

            {/* Current mentor */}
            {selected.mentorTeacherName && (
              <div className="ac-current-mentor">
                <p className="ac-current-mentor-label">Current Mentor</p>
                <div className="ac-current-mentor-info">
                  <div className="ac-mentor-avatar ac-mentor-avatar-lg">
                    {selected.mentorTeacherName.charAt(0).toUpperCase()}
                  </div>
                  <span>{selected.mentorTeacherName}</span>
                </div>
              </div>
            )}

            <div className="ac-form-field">
              <label className="ac-form-label">
                Select Teacher <span className="ac-required">*</span>
              </label>
              <div className="ac-select-wrap">
                <select
                  className="ac-form-select"
                  value={mentorTeacherId}
                  onChange={(e) => setMentorTeacherId(e.target.value)}>
                  <option value="">— Choose a teacher —</option>
                  {teachers.map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {teacherName(t)} ({t.teacherCode})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="ac-select-icon"
                  strokeWidth={2}
                />
              </div>
            </div>

            <div className="ac-form-actions">
              <button
                type="button"
                className="ac-btn-cancel"
                onClick={() => setShowMentor(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="ac-btn-submit ac-btn-blue"
                disabled={submitting}>
                {submitting ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <UserCheck size={15} strokeWidth={2} /> Assign Mentor
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════
          ADD SUBJECT TEACHER MODAL
      ════════════════════════════ */}
      {showSubject && selected && (
        <Modal
          title={`Add Subject Teacher — Class ${selected.className} ${selected.section}`}
          onClose={() => setShowSubject(false)}
          size="small">
          <form className="ac-form" onSubmit={handleAddSubject} noValidate>
            <div className="ac-form-field">
              <label className="ac-form-label">
                Subject Name <span className="ac-required">*</span>
              </label>
              <input
                type="text"
                className={`ac-form-input${subjectErrors.subject ? " ac-input-error" : ""}`}
                placeholder="e.g. Mathematics or Physics"
                value={subjectName}
                onChange={(e) => {
                  setSubjectName(e.target.value);
                  if (subjectErrors.subject)
                    setSubjectErrors((p) => ({ ...p, subject: "" }));
                }}
                autoFocus
              />
              {subjectErrors.subject && (
                <span className="ac-error-msg">{subjectErrors.subject}</span>
              )}
            </div>

            <div className="ac-form-field">
              <label className="ac-form-label">
                Teacher <span className="ac-required">*</span>
              </label>
              <div className="ac-select-wrap">
                <select
                  className={`ac-form-select${subjectErrors.teacher ? " ac-input-error" : ""}`}
                  value={subjectTeacherId}
                  onChange={(e) => {
                    setSubjectTeacherId(e.target.value);
                    if (subjectErrors.teacher)
                      setSubjectErrors((p) => ({ ...p, teacher: "" }));
                  }}>
                  <option value="">— Choose a teacher —</option>
                  {teachers.map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {teacherName(t)} ({t.teacherCode})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="ac-select-icon"
                  strokeWidth={2}
                />
              </div>
              {subjectErrors.teacher && (
                <span className="ac-error-msg">{subjectErrors.teacher}</span>
              )}
            </div>

            <div className="ac-form-actions">
              <button
                type="button"
                className="ac-btn-cancel"
                onClick={() => setShowSubject(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="ac-btn-submit"
                disabled={submitting}>
                {submitting ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <UserPlus size={15} strokeWidth={2} /> Add Teacher
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════
          REMOVE SUBJECT TEACHER MODAL
      ════════════════════════════ */}
      {showRemSub && selected && subjectToRemove && (
        <Modal
          title="Remove Subject Teacher"
          onClose={() => setShowRemSub(false)}
          size="small">
          <div className="ac-delete">
            <div className="ac-delete-icon">
              <AlertCircle size={32} strokeWidth={1.5} color="#E53E3E" />
            </div>
            <p className="ac-delete-title">Remove Subject Teacher?</p>
            <p className="ac-delete-sub">
              Remove <strong>{subjectToRemove.teacherName}</strong> from
              teaching <strong>{subjectToRemove.subject}</strong> in Class{" "}
              {selected.className} — {selected.section}?
            </p>
            <div className="ac-form-actions">
              <button
                className="ac-btn-cancel"
                onClick={() => setShowRemSub(false)}>
                Cancel
              </button>
              <button
                className="ac-btn-danger"
                onClick={handleRemoveSubject}
                disabled={submitting}>
                {submitting ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <Trash2 size={14} strokeWidth={2} /> Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
