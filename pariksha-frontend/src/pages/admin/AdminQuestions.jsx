import { useState, useEffect, useCallback } from "react";
import {
  BookMarked,
  Search,
  X,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  CheckCircle2,
  Filter,
  Tag,
  Layers,
  BookOpen,
  HelpCircle,
  ToggleLeft,
  AlignLeft,
  List,
  GraduationCap,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import questionService from "../../services/questionService";
import "./AdminQuestions.css";

// ── Constants ──────────────────────────────────────────
const PAGE_SIZES = [10, 20, 50];
const PAGE_THRESH = 6;

const DIFFICULTY_LEVELS = ["EASY", "MEDIUM", "HARD"];

const QUESTION_TYPES = [
  { value: "MCQ", label: "MCQ" },
  { value: "SHORT_ANSWER", label: "Short Answer" },
  { value: "LONG_ANSWER", label: "Long Answer" },
  { value: "TRUE_FALSE", label: "True / False" },
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

function diffMeta(d) {
  switch (d?.toUpperCase()) {
    case "EASY":
      return { cls: "aq-diff--easy", label: "Easy" };
    case "MEDIUM":
      return { cls: "aq-diff--medium", label: "Medium" };
    case "HARD":
      return { cls: "aq-diff--hard", label: "Hard" };
    default:
      return { cls: "", label: d ?? "—" };
  }
}

function typeIcon(t) {
  switch (t?.toUpperCase()) {
    case "MCQ":
      return <List size={12} />;
    case "SHORT_ANSWER":
      return <AlignLeft size={12} />;
    case "LONG_ANSWER":
      return <BookOpen size={12} />;
    case "TRUE_FALSE":
      return <ToggleLeft size={12} />;
    default:
      return <HelpCircle size={12} />;
  }
}

function typeLabel(t) {
  return QUESTION_TYPES.find((q) => q.value === t)?.label ?? t ?? "—";
}

function parseOptions(optStr) {
  const map = {};
  if (optStr) {
    optStr.split(",").forEach((part) => {
      const idx = part.indexOf(":");
      if (idx > 0) map[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    });
  }
  return map;
}

// ── Custom filter dropdown ─────────────────────────────
function FilterDropdown({ label, value, onChange, options, icon }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="aq-dropdown" onMouseDown={(e) => e.stopPropagation()}>
      <button
        className={`aq-dropdown__trigger${open ? " aq-dropdown__trigger--open" : ""}`}
        onClick={() => setOpen((p) => !p)}
        type="button">
        {icon && <span className="aq-dropdown__icon">{icon}</span>}
        <span className="aq-dropdown__label">{current?.label ?? label}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="aq-dropdown__menu">
          {options.map((o) => (
            <button
              key={o.value}
              className={`aq-dropdown__item${value === o.value ? " aq-dropdown__item--active" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}>
              {value === o.value && <CheckCircle2 size={12} />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sortable column header ─────────────────────────────
function SortTh({ col, label, sortCol, sortDir, onSort, className }) {
  const active = sortCol === col;
  return (
    <th
      className={`aq-th aq-th--sortable${active ? " aq-th--active" : ""}${className ? ` ${className}` : ""}`}
      onClick={() => onSort(col)}>
      <span className="aq-th__inner">
        {label}
        <span className="aq-th__sort-icon">
          {active ? (
            sortDir === "asc" ? (
              <ChevronUp size={13} />
            ) : (
              <ChevronDown size={13} />
            )
          ) : (
            <ArrowUpDown size={12} />
          )}
        </span>
      </span>
    </th>
  );
}

// ── Pagination — screenshot style ──────────────────────
// Bottom-left: "1–10 of 20"
// Bottom-right: < 1 2 > (no dots)
// Only shows when totalRows > PAGE_THRESH
function Pagination({
  page,
  totalPages,
  setPage,
  pageSize,
  setPageSize,
  totalRows,
}) {
  if (totalRows <= PAGE_THRESH) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalRows);

  // Only nearby page numbers — NO connecting dots
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="aq-pagination">
      {/* LEFT — "1–10 of 20" */}
      <span className="aq-pagination__count">
        {from}–{to} of {totalRows}
      </span>

      {/* RIGHT — < 1 2 > */}
      <div className="aq-pagination__controls">
        {/* Rows per page (compact) */}
        <select
          className="aq-pagination__size-select"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}>
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>

        {/* Prev arrow */}
        <button
          className="aq-pagination__arrow"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          title="Previous page">
          <ChevronLeft size={16} />
        </button>

        {/* Page number buttons — NO dots */}
        {pages.map((p) => (
          <button
            key={p}
            className={`aq-pagination__page${page === p ? " aq-pagination__page--active" : ""}`}
            onClick={() => setPage(p)}>
            {p}
          </button>
        ))}

        {/* Next arrow */}
        <button
          className="aq-pagination__arrow"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          title="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── View question modal ────────────────────────────────
function ViewModal({ q, onClose }) {
  const dm = diffMeta(q.difficultyLevel);
  const qt = q.questionType ?? "MCQ";
  const opts = parseOptions(q.options ?? "");
  const ans = q.answer ?? "";

  return (
    <Modal title="Question Details" onClose={onClose} size="medium">
      <div className="aq-view-modal">
        <div className="aq-view-badges">
          <span className={`aq-diff-badge ${dm.cls}`}>{dm.label}</span>
          <span className="aq-type-badge">
            {typeIcon(qt)}
            {typeLabel(qt)}
          </span>
          {q.subject && (
            <span className="aq-subject-badge">
              <Tag size={11} />
              {q.subject}
            </span>
          )}
          {q.topic && <span className="aq-topic-badge">{q.topic}</span>}
          {q.classLevel && (
            <span className="aq-class-badge">
              <GraduationCap size={11} />
              {q.classLevel}
            </span>
          )}
          <span className="aq-marks-badge">
            {q.marks ?? 1} Mark{(q.marks ?? 1) !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="aq-view-question">{q.questionText}</div>

        {qt === "MCQ" && Object.keys(opts).length > 0 && (
          <div className="aq-view-options">
            {["A", "B", "C", "D"].map((key) => {
              const val = opts[key];
              if (!val) return null;
              const isCorrect = ans === val || ans === key;
              return (
                <div
                  key={key}
                  className={`aq-view-option${isCorrect ? " aq-view-option--correct" : ""}`}>
                  <span className="aq-view-option__key">{key}</span>
                  <span className="aq-view-option__text">{val}</span>
                  {isCorrect && (
                    <CheckCircle2 size={13} className="aq-view-tick" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {qt === "TRUE_FALSE" && ans && (
          <div className="aq-view-answer">
            <span className="aq-view-answer__lbl">Correct Answer:</span>
            <span
              className={`aq-view-answer__val aq-view-answer__val--${ans.toLowerCase()}`}>
              {ans}
            </span>
          </div>
        )}

        {(qt === "SHORT_ANSWER" || qt === "LONG_ANSWER") && ans && (
          <div className="aq-view-model">
            <p className="aq-view-model__title">Model Answer</p>
            <p className="aq-view-model__text">{ans}</p>
          </div>
        )}

        {q.explanation && (
          <div className="aq-view-explain">
            <p className="aq-view-explain__title">Explanation</p>
            <p className="aq-view-explain__text">{q.explanation}</p>
          </div>
        )}

        {q.createdByName && (
          <p className="aq-view-meta">
            Added by <strong>{q.createdByName}</strong>
            {q.createdAt ? ` · ${fmtDate(q.createdAt)}` : ""}
          </p>
        )}

        <div className="aq-view-footer">
          <button className="aq-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════
export default function AdminQuestions() {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewQ, setViewQ] = useState(null);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterDiff, setFilterDiff] = useState("ALL");
  const [sortCol, setSortCol] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Fetch ─────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [questionsRes, subjectsRes] = await Promise.allSettled([
        questionService.getAll(),
        questionService.getSubjects(),
      ]);
      if (questionsRes.status === "fulfilled") {
        setQuestions(questionsRes.value.data.data ?? []);
      } else {
        setQuestions([]);
        setToast({ message: "Failed to load questions.", type: "error" });
      }
      if (subjectsRes.status === "fulfilled") {
        setSubjects(subjectsRes.value.data.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useEffect(() => {
    setPage(1);
  }, [search, filterSubject, filterType, filterDiff, sortCol, sortDir]);

  // ── Sort toggle ───────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  // ── Derived stats ─────────────────────────────────
  const byType = QUESTION_TYPES.reduce((acc, t) => {
    acc[t.value] = questions.filter((q) => q.questionType === t.value).length;
    return acc;
  }, {});

  const byDiff = DIFFICULTY_LEVELS.reduce((acc, d) => {
    acc[d] = questions.filter((q) => q.difficultyLevel === d).length;
    return acc;
  }, {});

  const uniqueSubjects =
    subjects.length > 0
      ? subjects
      : [...new Set(questions.map((q) => q.subject).filter(Boolean))];

  const teachers = [
    ...new Set(questions.map((q) => q.createdByName).filter(Boolean)),
  ];

  // ── Filter options ────────────────────────────────
  const subjectOptions = [
    { value: "ALL", label: "All Subjects" },
    ...uniqueSubjects.map((s) => ({ value: s, label: s })),
  ];
  const typeOptions = [
    { value: "ALL", label: "All Types" },
    ...QUESTION_TYPES.map((t) => ({ value: t.value, label: t.label })),
  ];
  const diffOptions = [
    { value: "ALL", label: "All Difficulties" },
    ...DIFFICULTY_LEVELS.map((d) => ({
      value: d,
      label: d.charAt(0) + d.slice(1).toLowerCase(),
    })),
  ];

  // ── Filter + sort + paginate ──────────────────────
  const filtered = questions.filter((q) => {
    const ms =
      !search.trim() ||
      (q.questionText ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (q.subject ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (q.topic ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (q.createdByName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (q.classLevel ?? "").toLowerCase().includes(search.toLowerCase());
    const msub = filterSubject === "ALL" || q.subject === filterSubject;
    const mtype = filterType === "ALL" || q.questionType === filterType;
    const mdiff = filterDiff === "ALL" || q.difficultyLevel === filterDiff;
    return ms && msub && mtype && mdiff;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortCol === "marks") {
      return sortDir === "asc"
        ? (a.marks ?? 0) - (b.marks ?? 0)
        : (b.marks ?? 0) - (a.marks ?? 0);
    }
    if (sortCol === "createdAt") {
      const av = new Date(a.createdAt ?? 0),
        bv = new Date(b.createdAt ?? 0);
      return sortDir === "asc" ? av - bv : bv - av;
    }
    const av = (a[sortCol] ?? "").toLowerCase();
    const bv = (b[sortCol] ?? "").toLowerCase();
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  if (loading) {
    return (
      <AdminLayout title="Questions">
        <div className="aq-loading">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Questions">
      <div className="aq-page">
        {/* ── Heading ── */}
        <div className="aq-heading-row">
          <div>
            <h1 className="aq-heading">Question Bank</h1>
            <p className="aq-sub">
              {questions.length === 0
                ? "No questions in the bank yet"
                : `${questions.length} question${questions.length !== 1 ? "s" : ""} · ${uniqueSubjects.length} subject${uniqueSubjects.length !== 1 ? "s" : ""} · ${teachers.length} teacher${teachers.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            className="aq-refresh-btn"
            onClick={fetchAll}
            disabled={loading}
            title="Refresh">
            <RefreshCw size={15} className={loading ? "aq-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* ── KPI Stats cards ── */}
        <div className="aq-kpi-grid">
          <div className="aq-kpi-card aq-kpi-card--purple">
            <div className="aq-kpi-icon">
              <BookMarked size={20} />
            </div>

            <div className="aq-kpi-body">
              <div className="aq-kpi-value">{questions.length}</div>
              <div className="aq-kpi-label">Total Questions</div>
              <div className="aq-kpi-sub">Questions in the question bank</div>
            </div>
          </div>

          <div className="aq-kpi-card aq-kpi-card--blue">
            <div className="aq-kpi-icon">
              <List size={20} />
            </div>

            <div className="aq-kpi-body">
              <div className="aq-kpi-value">{byType.MCQ ?? 0}</div>
              <div className="aq-kpi-label">MCQ Questions</div>
              <div className="aq-kpi-sub">Multiple choice questions</div>
            </div>
          </div>

          <div className="aq-kpi-card aq-kpi-card--cyan">
            <div className="aq-kpi-icon">
              <AlignLeft size={20} />
            </div>

            <div className="aq-kpi-body">
              <div className="aq-kpi-value">
                {(byType.SHORT_ANSWER ?? 0) + (byType.LONG_ANSWER ?? 0)}
              </div>
              <div className="aq-kpi-label">Written Questions</div>
              <div className="aq-kpi-sub">Short & Long answer questions</div>
            </div>
          </div>

          <div className="aq-kpi-card aq-kpi-card--green">
            <div className="aq-kpi-icon">
              <CheckCircle2 size={20} />
            </div>

            <div className="aq-kpi-body">
              <div className="aq-kpi-value">{byDiff.EASY ?? 0}</div>
              <div className="aq-kpi-label">Easy Questions</div>
              <div className="aq-kpi-sub">
                {byDiff.MEDIUM ?? 0} Medium • {byDiff.HARD ?? 0} Hard
              </div>
            </div>
          </div>

          <div className="aq-kpi-card aq-kpi-card--indigo">
            <div className="aq-kpi-icon">
              <Layers size={20} />
            </div>

            <div className="aq-kpi-body">
              <div className="aq-kpi-value">{uniqueSubjects.length}</div>
              <div className="aq-kpi-label">Subjects</div>
              <div className="aq-kpi-sub">Covered across all classes</div>
            </div>
          </div>
        </div>

        {/* ── Empty state ── */}
        {questions.length === 0 ? (
          <div className="aq-empty-page">
            <div className="aq-empty-page__icon">
              <BookMarked size={36} strokeWidth={1.3} />
            </div>
            <p className="aq-empty-page__title">No questions yet</p>
            <span className="aq-empty-page__desc">
              Teachers haven't added any questions to the bank yet.
            </span>
          </div>
        ) : (
          <>
            {/* ── Toolbar ── */}
            <div className="aq-toolbar">
              <div className="aq-search-wrap">
                <Search size={14} className="aq-search-icon" />
                <input
                  type="text"
                  className="aq-search"
                  placeholder="Search question, subject, topic, teacher…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="aq-search-clear"
                    onClick={() => setSearch("")}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <FilterDropdown
                label="All Subjects"
                value={filterSubject}
                onChange={(v) => setFilterSubject(v)}
                options={subjectOptions}
                icon={<Filter size={13} />}
              />
              <FilterDropdown
                label="All Types"
                value={filterType}
                onChange={(v) => setFilterType(v)}
                options={typeOptions}
              />
              <FilterDropdown
                label="All Difficulties"
                value={filterDiff}
                onChange={(v) => setFilterDiff(v)}
                options={diffOptions}
              />

              <div className="aq-toolbar-right">
                <span className="aq-count-badge">
                  {Math.min((page - 1) * pageSize + 1, totalRows)}–
                  {Math.min(page * pageSize, totalRows)} of {totalRows}
                </span>
                <select
                  className="aq-page-inline-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}>
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Table ── */}
            {paginated.length === 0 ? (
              <div className="aq-empty">
                <div className="aq-empty__icon">
                  <Search size={28} strokeWidth={1.3} />
                </div>
                <p>No questions match your filters</p>
                <span>Try a different search or clear the filters.</span>
                <button
                  className="aq-empty__clear"
                  onClick={() => {
                    setSearch("");
                    setFilterSubject("ALL");
                    setFilterType("ALL");
                    setFilterDiff("ALL");
                  }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="aq-table-card">
                <div className="aq-table-wrap">
                  <table className="aq-table">
                    <thead>
                      <tr>
                        <SortTh
                          col="subject"
                          label="Subject / Topic"
                          sortCol={sortCol}
                          sortDir={sortDir}
                          onSort={handleSort}
                          className="aq-th--subject"
                        />
                        <th className="aq-th aq-th--question">Question</th>
                        <th className="aq-th">Type</th>
                        <th className="aq-th">Difficulty</th>
                        <SortTh
                          col="marks"
                          label="Marks"
                          sortCol={sortCol}
                          sortDir={sortDir}
                          onSort={handleSort}
                          className="aq-th--marks"
                        />
                        <th className="aq-th">Teacher</th>
                        <SortTh
                          col="createdAt"
                          label="Created"
                          sortCol={sortCol}
                          sortDir={sortDir}
                          onSort={handleSort}
                          className="aq-th--created"
                        />
                        <th className="aq-th aq-th--view">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((q, idx) => {
                        const dm = diffMeta(q.difficultyLevel);
                        const qt = q.questionType ?? "—";
                        return (
                          <tr key={q.id ?? idx} className="aq-row">
                            <td className="aq-td aq-td--subject">
                              <div className="aq-subject-cell">
                                <span className="aq-subject-name">
                                  {q.subject ?? "—"}
                                </span>
                                {(q.topic || q.classLevel) && (
                                  <span className="aq-topic-name">
                                    {[q.topic, q.classLevel]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="aq-td aq-td--question">
                              <span className="aq-question-text">
                                {(q.questionText ?? "").slice(0, 120)}
                                {(q.questionText ?? "").length > 120 ? "…" : ""}
                              </span>
                            </td>
                            <td className="aq-td">
                              <span className="aq-type-badge">
                                {typeIcon(qt)}
                                {typeLabel(qt)}
                              </span>
                            </td>
                            <td className="aq-td">
                              <span className={`aq-diff-badge ${dm.cls}`}>
                                {dm.label}
                              </span>
                            </td>
                            <td className="aq-td aq-td--center">
                              <span className="aq-marks-badge">
                                {q.marks ?? 1}
                              </span>
                            </td>
                            <td className="aq-td">
                              <div className="aq-teacher-cell">
                                <span className="aq-teacher-name">
                                  {q.createdByName ?? "—"}
                                </span>
                                {q.teacherCode && (
                                  <span className="aq-teacher-code">
                                    {q.teacherCode}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="aq-td aq-td--date">
                              {fmtDate(q.createdAt)}
                            </td>
                            <td className="aq-td aq-td--center">
                              <button
                                className="aq-view-btn"
                                onClick={() => setViewQ(q)}
                                title="View">
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination inside table card at bottom ── */}
                {totalRows > PAGE_THRESH && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    setPage={setPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    totalRows={totalRows}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {viewQ && <ViewModal q={viewQ} onClose={() => setViewQ(null)} />}
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
