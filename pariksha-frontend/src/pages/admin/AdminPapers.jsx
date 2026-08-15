import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Search,
  X,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  ClipboardList,
  Tag,
  GraduationCap,
  Clock,
  BarChart2,
  User,
  BookOpen,
  AlertCircle,
  Users,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import paperService from "../../services/paperService";
import pdfService from "../../services/pdfService";
import "./AdminPapers.css";

// ── Constants ──────────────────────────────────────────
const PAGE_SIZES = [6, 12, 24];
const PAGE_THRESH = 6;

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
  { value: "title_asc", label: "Title A → Z" },
  { value: "title_desc", label: "Title Z → A" },
  { value: "teacher_asc", label: "Teacher A → Z" },
  { value: "subject_asc", label: "Subject A → Z" },
];

const EXAM_TYPES = [
  { value: "UNIT_TEST", label: "Unit Test" },
  { value: "MID_TERM", label: "Mid Term" },
  { value: "FINAL_EXAM", label: "Final Exam" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "PRACTICAL", label: "Practical" },
];

// ── Helpers ────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function examLabel(v) {
  return EXAM_TYPES.find((e) => e.value === v)?.label ?? v ?? "—";
}

function sortPapers(list, key) {
  const s = [...list];
  switch (key) {
    case "date_desc":
      return s.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case "date_asc":
      return s.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case "title_asc":
      return s.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    case "title_desc":
      return s.sort((a, b) => (b.title ?? "").localeCompare(a.title ?? ""));
    case "teacher_asc":
      return s.sort((a, b) =>
        (a.createdByName ?? "").localeCompare(b.createdByName ?? ""),
      );
    case "subject_asc":
      return s.sort((a, b) => (a.subject ?? "").localeCompare(b.subject ?? ""));
    default:
      return s;
  }
}

// ── Sort dropdown ──────────────────────────────────────
function SortDropdown({ sortKey, setSortKey, show, setShow }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShow(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShow]);

  return (
    <div className="ap-sort-wrap" ref={dropdownRef}>
      <button className="ap-sort-btn" onClick={() => setShow((p) => !p)}>
        <ArrowUpDown size={14} />
        {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort"}
        {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {show && (
        <div className="ap-sort-dropdown">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`ap-sort-option${sortKey === o.value ? " ap-sort-option--active" : ""}`}
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
// ── Subject dropdown ──────────────────────────────────────

function SubjectDropdown({
  subjects,
  filterSubject,
  setFilterSubject,
  show,
  setShow,
}) {
  const dropdownRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShow]);
  return (
    <div className="ap-sort-wrap" ref={dropdownRef}>
      <button className="ap-sort-btn" onClick={() => setShow((p) => !p)}>
        <BookOpen size={14} />

        {filterSubject === "ALL" ? "All Subjects" : filterSubject}

        {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {show && (
        <div className="ap-sort-dropdown">
          <button
            className={`ap-sort-option ${
              filterSubject === "ALL" ? "ap-sort-option--active" : ""
            }`}
            onClick={() => {
              setFilterSubject("ALL");
              setShow(false);
            }}>
            {filterSubject === "ALL" && <CheckCircle2 size={12} />}
            All Subjects
          </button>

          {subjects.map((subject) => (
            <button
              key={subject}
              className={`ap-sort-option ${
                filterSubject === subject ? "ap-sort-option--active" : ""
              }`}
              onClick={() => {
                setFilterSubject(subject);
                setShow(false);
              }}>
              {filterSubject === subject && <CheckCircle2 size={12} />}
              {subject}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pagination (left: per page, right: numbers, NO dots) ─
function Pagination({
  page,
  totalPages,
  setPage,
  pageSize,
  setPageSize,
  totalRows,
}) {
  if (totalRows <= PAGE_THRESH) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="ap-pagination">
      <div className="ap-page-left">
        <span className="ap-page-label">Rows per page</span>
        <select
          className="ap-page-size-select"
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
      <div className="ap-page-right">
        <span className="ap-page-info">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRows)} of{" "}
          {totalRows}
        </span>
        <button
          className="ap-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}>
          <ChevronLeft size={14} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={`ap-page-btn ap-page-num${page === p ? " ap-page-num--active" : ""}`}
            onClick={() => setPage(p)}>
            {p}
          </button>
        ))}
        <button
          className="ap-page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Paper detail modal ─────────────────────────────────
function PaperDetailModal({
  paper,
  onClose,
  onDownloadTeacher,
  onDownloadStudent,
  downloading,
}) {
  return (
    <Modal title="Paper Details" onClose={onClose} size="large">
      <div className="ap-detail-modal">
        {/* Header */}
        <div className="ap-detail-hero">
          <div
            className={`ap-detail-icon${paper.aiGenerated ? " ap-detail-icon--ai" : ""}`}>
            {paper.aiGenerated ? (
              <Sparkles size={22} />
            ) : (
              <FileText size={22} />
            )}
          </div>
          <div className="ap-detail-info">
            <h2 className="ap-detail-title">{paper.title}</h2>
            <div className="ap-detail-badges">
              {paper.subject && (
                <span className="ap-badge ap-badge--subject">
                  <Tag size={11} />
                  {paper.subject}
                </span>
              )}
              {paper.examType && (
                <span className="ap-badge ap-badge--exam">
                  {examLabel(paper.examType)}
                </span>
              )}
              {paper.classLevel && (
                <span className="ap-badge ap-badge--class">
                  <GraduationCap size={11} />
                  {paper.classLevel}
                </span>
              )}
              {paper.aiGenerated && (
                <span className="ap-badge ap-badge--ai">
                  <Sparkles size={11} />
                  AI Generated
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="ap-detail-stats">
          <div className="ap-detail-stat ap-detail-stat--blue">
            <div className="ap-detail-stat__icon">
              <ClipboardList size={16} />
            </div>
            <div className="ap-detail-stat__body">
              <span className="ap-detail-stat__val">
                {paper.questions?.length ?? paper.questionCount ?? "—"}
              </span>
              <span className="ap-detail-stat__lbl">Questions</span>
            </div>
          </div>
          <div className="ap-detail-stat ap-detail-stat--green">
            <div className="ap-detail-stat__icon">
              <BarChart2 size={16} />
            </div>
            <div className="ap-detail-stat__body">
              <span className="ap-detail-stat__val">
                {paper.totalMarks ?? "—"}
              </span>
              <span className="ap-detail-stat__lbl">Total Marks</span>
            </div>
          </div>
          <div className="ap-detail-stat ap-detail-stat--amber">
            <div className="ap-detail-stat__icon">
              <Clock size={16} />
            </div>
            <div className="ap-detail-stat__body">
              <span className="ap-detail-stat__val">
                {paper.durationMinutes ?? paper.duration ?? "—"}
              </span>
              <span className="ap-detail-stat__lbl">Duration (min)</span>
            </div>
          </div>
          <div className="ap-detail-stat ap-detail-stat--indigo">
            <div className="ap-detail-stat__icon">
              <User size={16} />
            </div>
            <div className="ap-detail-stat__body">
              <span className="ap-detail-stat__val" style={{ fontSize: 13 }}>
                {paper.createdByName ?? "—"}
              </span>
              <span className="ap-detail-stat__lbl">Created By</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {paper.instructions && (
          <div className="ap-detail-instructions">
            <p className="ap-detail-section-title">
              <AlertCircle size={13} /> Instructions
            </p>
            <p className="ap-detail-instructions-text">{paper.instructions}</p>
          </div>
        )}

        {/* Questions preview */}
        {paper.questions?.length > 0 && (
          <div className="ap-detail-questions">
            <p className="ap-detail-section-title">
              <BookOpen size={13} /> Questions ({paper.questions.length})
            </p>
            <div className="ap-detail-q-list">
              {paper.questions.map((q, i) => (
                <div key={q.id ?? i} className="ap-detail-q-row">
                  <span className="ap-detail-q-num">Q{i + 1}</span>
                  <span className="ap-detail-q-text">
                    {q.questionText ?? q.question}
                  </span>
                  <span className="ap-detail-q-marks">{q.marks ?? "—"} M</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download */}
        <div className="ap-detail-downloads">
          <p className="ap-detail-section-title">
            <Download size={13} /> Download PDF
          </p>
          <div className="ap-detail-dl-btns">
            <button
              className="ap-dl-btn ap-dl-btn--teacher"
              onClick={() => onDownloadTeacher(paper.id)}
              disabled={downloading === `t-${paper.id}`}>
              {downloading === `t-${paper.id}` ? (
                <Spinner size="small" color="#fff" />
              ) : (
                <>
                  <Download size={15} /> With Answer Key
                </>
              )}
            </button>
            <button
              className="ap-dl-btn ap-dl-btn--student"
              onClick={() => onDownloadStudent(paper.id)}
              disabled={downloading === `s-${paper.id}`}>
              {downloading === `s-${paper.id}` ? (
                <Spinner size="small" color="var(--admin-primary)" />
              ) : (
                <>
                  <Download size={15} /> Questions Only
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Delete confirm modal ───────────────────────────────
function DeleteModal({ paper, onConfirm, onCancel, deleting }) {
  return (
    <Modal title="Delete Paper" onClose={onCancel} size="small">
      <div className="ap-delete-modal">
        <div className="ap-delete-modal__icon">
          <AlertTriangle size={28} strokeWidth={1.5} />
        </div>
        <p className="ap-delete-modal__title">Delete this paper?</p>
        <p className="ap-delete-modal__sub">
          "<strong>{paper.title}</strong>" by{" "}
          {paper.createdByName ?? "Unknown Teacher"}.
          <br />
          This action cannot be undone.
        </p>
        <div className="ap-delete-modal__actions">
          <button
            className="ap-cancel-btn"
            onClick={onCancel}
            disabled={deleting}>
            Cancel
          </button>
          <button
            className="ap-delete-confirm-btn"
            onClick={onConfirm}
            disabled={deleting}>
            {deleting ? (
              <Spinner size="small" color="#fff" />
            ) : (
              <>
                <Trash2 size={14} /> Delete
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════
export default function AdminPapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL | AI | MANUAL
  const [filterSubject, setFilterSubject] = useState("ALL");
  const [sortKey, setSortKey] = useState("date_desc");
  const [showSort, setShowSort] = useState(false);
  const [showSubject, setShowSubject] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [viewPaper, setViewPaper] = useState(null);
  const [deletePaper, setDeletePaper] = useState(null);
  const [toast, setToast] = useState(null);

  // ── Fetch all papers (admin endpoint) ────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await paperService.getAll(); // GET /api/papers/all ✅
      setPapers(res.data.data ?? []);
    } catch {
      setToast({ message: "Failed to load papers.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useEffect(() => {
    setPage(1);
  }, [search, filterType, filterSubject, sortKey]);

  // ── Delete ────────────────────────────────────────
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await paperService.delete(deletePaper.id); // DELETE /api/papers/{id} ✅
      setToast({ message: "Paper deleted successfully.", type: "success" });
      setDeletePaper(null);
      setPapers((prev) => prev.filter((p) => p.id !== deletePaper.id));
    } catch (err) {
      setToast({
        message: err?.response?.data?.message ?? "Failed to delete paper.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── PDF Downloads ─────────────────────────────────
  const handleDownloadTeacher = async (paperId) => {
    try {
      setDownloading(`t-${paperId}`);
      await pdfService.downloadTeacher(paperId);
      setToast({ message: "Teacher PDF downloaded.", type: "success" });
    } catch {
      setToast({ message: "Failed to download PDF.", type: "error" });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadStudent = async (paperId) => {
    try {
      setDownloading(`s-${paperId}`);
      await pdfService.downloadStudent(paperId);
      setToast({ message: "Student PDF downloaded.", type: "success" });
    } catch {
      setToast({ message: "Failed to download PDF.", type: "error" });
    } finally {
      setDownloading(null);
    }
  };

  // ── Derived stats ─────────────────────────────────
  const aiPapers = papers.filter((p) => p.aiGenerated);
  const manualPapers = papers.filter((p) => !p.aiGenerated);
  const teachers = [
    ...new Set(papers.map((p) => p.createdByName).filter(Boolean)),
  ];
  const subjects = [...new Set(papers.map((p) => p.subject).filter(Boolean))];

  // ── Filter + sort + paginate ──────────────────────
  const filtered = papers.filter((p) => {
    const q = search.toLowerCase();
    const ms =
      !search.trim() ||
      (p.title ?? "").toLowerCase().includes(q) ||
      (p.subject ?? "").toLowerCase().includes(q) ||
      (p.classLevel ?? "").toLowerCase().includes(q) ||
      (p.createdByName ?? "").toLowerCase().includes(q);
    const mt =
      filterType === "ALL" ||
      (filterType === "AI" && p.aiGenerated) ||
      (filterType === "MANUAL" && !p.aiGenerated);
    const msub = filterSubject === "ALL" || p.subject === filterSubject;
    return ms && mt && msub;
  });

  const sorted = sortPapers(filtered, sortKey);
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  if (loading) {
    return (
      <AdminLayout title="Papers">
        <div className="ap-loading">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Papers">
      <div className="ap-page">
        {/* ── Heading ── */}
        <div className="ap-heading-row">
          <div>
            <h1 className="ap-heading">Question Papers</h1>
            <p className="ap-sub">
              {papers.length === 0
                ? "No papers created yet"
                : `${papers.length} paper${papers.length !== 1 ? "s" : ""} · ${aiPapers.length} AI · ${manualPapers.length} manual · ${teachers.length} teacher${teachers.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            className="ap-refresh-btn"
            onClick={fetchAll}
            disabled={loading}
            title="Refresh Papers">
            <RefreshCw
              size={17}
              strokeWidth={2}
              className={loading ? "ap-spin" : ""}
            />
          </button>
        </div>

        {/* ── KPI Stats cards ── */}
        <div className="ap-kpi-grid">
          <div className="ap-kpi-card ap-kpi-card--purple">
            <div className="ap-kpi-icon">
              <FileText size={20} />
            </div>
            <div className="ap-kpi-body">
              <span className="ap-kpi-value">{papers.length}</span>
              <span className="ap-kpi-label">Total Papers</span>
              <span className="ap-kpi-sub">Across all teachers</span>
            </div>
          </div>
          <div className="ap-kpi-card ap-kpi-card--indigo">
            <div className="ap-kpi-icon">
              <Sparkles size={20} />
            </div>
            <div className="ap-kpi-body">
              <span className="ap-kpi-value">{aiPapers.length}</span>
              <span className="ap-kpi-label">AI Generated</span>
              <span className="ap-kpi-sub">Auto-created by Gemini</span>
            </div>
          </div>
          <div className="ap-kpi-card ap-kpi-card--blue">
            <div className="ap-kpi-icon">
              <ClipboardList size={20} />
            </div>
            <div className="ap-kpi-body">
              <span className="ap-kpi-value">{manualPapers.length}</span>
              <span className="ap-kpi-label">Manual Papers</span>
              <span className="ap-kpi-sub">Handpicked questions</span>
            </div>
          </div>
          <div className="ap-kpi-card ap-kpi-card--cyan">
            <div className="ap-kpi-icon">
              <BookOpen size={20} />
            </div>
            <div className="ap-kpi-body">
              <span className="ap-kpi-value">{subjects.length}</span>
              <span className="ap-kpi-label">Subjects</span>
              <span className="ap-kpi-sub">Unique subjects</span>
            </div>
          </div>
          <div className="ap-kpi-card ap-kpi-card--green">
            <div className="ap-kpi-icon">
              <Users size={20} />
            </div>
            <div className="ap-kpi-body">
              <span className="ap-kpi-value">{teachers.length}</span>
              <span className="ap-kpi-label">Teachers</span>
              <span className="ap-kpi-sub">Who created papers</span>
            </div>
          </div>
        </div>

        {/* ── Empty state ── */}
        {papers.length === 0 ? (
          <div className="ap-empty-page">
            <div className="ap-empty-page__icon">
              <FileText size={36} strokeWidth={1.3} />
            </div>
            <p className="ap-empty-page__title">No papers created yet</p>
            <span className="ap-empty-page__desc">
              Teachers haven't created any question papers yet. Papers created
              by teachers will appear here for admin review.
            </span>
          </div>
        ) : (
          <>
            {/* ── Toolbar ── */}
            <div className="ap-toolbar">
              <div className="ap-search-wrap">
                <Search size={14} className="ap-search-icon" />
                <input
                  type="text"
                  className="ap-search"
                  placeholder="Search by title, subject, teacher, class…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="ap-search-clear"
                    onClick={() => setSearch("")}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="ap-filter-group">
                {[
                  { key: "ALL", label: "All" },
                  { key: "AI", label: "AI" },
                  { key: "MANUAL", label: "Manual" },
                ].map((f) => (
                  <button
                    key={f.key}
                    className={`ap-filter-btn${filterType === f.key ? " ap-filter-btn--active" : ""}`}
                    onClick={() => setFilterType(f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Subject filter */}
              <SubjectDropdown
                subjects={subjects}
                filterSubject={filterSubject}
                setFilterSubject={setFilterSubject}
                show={showSubject}
                setShow={setShowSubject}
              />

              <SortDropdown
                sortKey={sortKey}
                setSortKey={setSortKey}
                show={showSort}
                setShow={setShowSort}
              />
            </div>

            {/* ── Results info ── */}
            <div className="ap-results-info">
              {totalRows === 0
                ? `No papers match your filters`
                : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalRows)} of ${totalRows} paper${totalRows !== 1 ? "s" : ""}${search ? ` matching "${search}"` : ""}`}
            </div>

            {/* ── Paper cards ── */}
            {paginated.length === 0 ? (
              <div className="ap-empty">
                <div className="ap-empty__icon">
                  <Search size={28} strokeWidth={1.3} />
                </div>
                <p>No papers match your filters</p>
                <span>Try a different search or clear the filters.</span>
                <button
                  className="ap-empty__clear"
                  onClick={() => {
                    setSearch("");
                    setFilterType("ALL");
                    setFilterSubject("ALL");
                  }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="ap-grid">
                {paginated.map((paper) => (
                  <div
                    key={paper.id}
                    className={`ap-card${paper.aiGenerated ? " ap-card--ai" : ""}`}>
                    {/* Card header */}
                    <div className="ap-card__header">
                      <div
                        className={`ap-card__icon${paper.aiGenerated ? " ap-card__icon--ai" : ""}`}>
                        {paper.aiGenerated ? (
                          <Sparkles size={18} />
                        ) : (
                          <FileText size={18} />
                        )}
                      </div>
                      <div className="ap-card__title-wrap">
                        <h3 className="ap-card__title">{paper.title}</h3>
                        <div className="ap-card__badges">
                          {paper.subject && (
                            <span className="ap-badge ap-badge--subject">
                              <Tag size={10} />
                              {paper.subject}
                            </span>
                          )}
                          {paper.examType && (
                            <span className="ap-badge ap-badge--exam">
                              {examLabel(paper.examType)}
                            </span>
                          )}
                          {paper.aiGenerated && (
                            <span className="ap-badge ap-badge--ai">
                              <Sparkles size={10} />
                              AI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Teacher + class info */}
                    <div className="ap-card__meta">
                      {paper.createdByName && (
                        <span className="ap-card__meta-item">
                          <User size={12} />
                          {paper.createdByName}
                        </span>
                      )}
                      {paper.classLevel && (
                        <span className="ap-card__meta-item">
                          <GraduationCap size={12} />
                          {paper.classLevel}
                        </span>
                      )}
                    </div>

                    {/* Stats strip */}
                    <div className="ap-card__stats">
                      <span className="ap-card__stat">
                        <ClipboardList size={12} />
                        {paper.questions?.length ??
                          paper.questionCount ??
                          "—"}{" "}
                        Qs
                      </span>
                      <span className="ap-card__stat">
                        <BarChart2 size={12} />
                        {paper.totalMarks ?? "—"} Marks
                      </span>
                      <span className="ap-card__stat">
                        <Clock size={12} />
                        {paper.durationMinutes ?? paper.duration ?? "—"} min
                      </span>
                      <span className="ap-card__stat ap-card__stat--date">
                        <Clock size={12} />
                        {fmtDate(paper.createdAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="ap-card__actions">
                      <button
                        className="ap-card__btn ap-card__btn--view"
                        onClick={() => setViewPaper(paper)}>
                        <Eye size={13} /> View
                      </button>
                      <button
                        className="ap-card__btn ap-card__btn--teacher-dl"
                        onClick={() => handleDownloadTeacher(paper.id)}
                        disabled={downloading === `t-${paper.id}`}
                        title="Download with answer key">
                        {downloading === `t-${paper.id}` ? (
                          <Spinner size="small" color="#fff" />
                        ) : (
                          <>
                            <Download size={13} /> With Answers
                          </>
                        )}
                      </button>
                      <button
                        className="ap-card__btn ap-card__btn--student-dl"
                        onClick={() => handleDownloadStudent(paper.id)}
                        disabled={downloading === `s-${paper.id}`}
                        title="Download questions only">
                        {downloading === `s-${paper.id}` ? (
                          <Spinner size="small" color="var(--admin-primary)" />
                        ) : (
                          <>
                            <Download size={13} /> Questions
                          </>
                        )}
                      </button>
                      <button
                        className="ap-card__btn ap-card__btn--delete"
                        onClick={() => setDeletePaper(paper)}
                        title="Delete paper">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Pagination (only > PAGE_THRESH, no dots) ── */}
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

      {/* ════ VIEW MODAL ════ */}
      {viewPaper && (
        <PaperDetailModal
          paper={viewPaper}
          onClose={() => setViewPaper(null)}
          onDownloadTeacher={handleDownloadTeacher}
          onDownloadStudent={handleDownloadStudent}
          downloading={downloading}
        />
      )}

      {/* ════ DELETE MODAL ════ */}
      {deletePaper && (
        <DeleteModal
          paper={deletePaper}
          onConfirm={handleDelete}
          onCancel={() => setDeletePaper(null)}
          deleting={deleting}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AdminLayout>
  );
}
