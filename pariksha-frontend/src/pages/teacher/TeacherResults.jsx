import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardList,
  Users,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Award,
  BarChart2,
  BookOpen,
  Eye,
  TrendingUp,
  FileText,
  Clock,
  Zap,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import teacherService from "../../services/teacherService";
import "./TeacherResults.css";

// ── Constants ─────────────────────────────────────────
const PAGE_SIZE = 10;
const PAGE_THRESH = 6; // pagination only shows above this count

const SORT_OPTIONS = [
  { value: "name_asc", label: "Student Name A → Z" },
  { value: "name_desc", label: "Student Name Z → A" },
  { value: "score_desc", label: "Score High → Low" },
  { value: "score_asc", label: "Score Low → High" },
  { value: "pct_desc", label: "% High → Low" },
  { value: "pct_asc", label: "% Low → High" },
];

// ── Helpers ───────────────────────────────────────────
function calcGrade(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

function gradeClass(pct) {
  if (pct >= 90) return "tr-grade--aplus";
  if (pct >= 80) return "tr-grade--a";
  if (pct >= 70) return "tr-grade--b";
  if (pct >= 60) return "tr-grade--c";
  if (pct >= 50) return "tr-grade--d";
  return "tr-grade--f";
}

// FIX: ExamSessionStatus is IN_PROGRESS / SUBMITTED / EVALUATED —
// there is no PASSED/FAILED on the backend. Map real statuses to labels.
function statusMeta(status) {
  switch (status) {
    case "EVALUATED":
      return { label: "Evaluated", cls: "tr-status--pass" };
    case "SUBMITTED":
      return { label: "Pending Review", cls: "tr-status--submitted" };
    case "IN_PROGRESS":
      return { label: "In Progress", cls: "tr-status--pending" };
    default:
      return { label: status ?? "—", cls: "tr-status--pending" };
  }
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtExamType(t) {
  if (!t) return "—";
  return (
    t.replace(/_/g, " ").charAt(0).toUpperCase() +
    t.replace(/_/g, " ").slice(1).toLowerCase()
  );
}

function getInitials(r) {
  return (r?.studentName?.[0] ?? "S").toUpperCase();
}

// FIX: sort by real fields — totalMarksObtained, not totalScore
function sortResults(list, key) {
  const s = [...list];
  switch (key) {
    case "name_asc":
      return s.sort((a, b) =>
        (a.studentName ?? "").localeCompare(b.studentName ?? ""),
      );
    case "name_desc":
      return s.sort((a, b) =>
        (b.studentName ?? "").localeCompare(a.studentName ?? ""),
      );
    case "score_desc":
      return s.sort(
        (a, b) => (b.totalMarksObtained ?? -1) - (a.totalMarksObtained ?? -1),
      );
    case "score_asc":
      return s.sort(
        (a, b) => (a.totalMarksObtained ?? -1) - (b.totalMarksObtained ?? -1),
      );
    case "pct_desc":
      return s.sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1));
    case "pct_asc":
      return s.sort((a, b) => (a.percentage ?? -1) - (b.percentage ?? -1));
    default:
      return s;
  }
}

// FIX: derive correct/wrong/skipped/time-taken from real fields
// (answers[] with isCorrect/answerText, startedAt/submittedAt) since
// the backend never sends these as flat counts.
function deriveAnswerStats(result) {
  const answers = result.answers ?? [];
  const correct = answers.filter((a) => a.isCorrect === true).length;
  const wrong = answers.filter((a) => a.isCorrect === false).length;
  const skipped = answers.filter(
    (a) => a.answerText == null || a.answerText === "",
  ).length;
  const pendingReview = answers.filter(
    (a) => a.isCorrect == null && a.answerText,
  ).length;

  let timeTaken = null;
  if (result.startedAt && result.submittedAt) {
    const ms = new Date(result.submittedAt) - new Date(result.startedAt);
    timeTaken = Math.max(0, Math.round(ms / 60000));
  }

  return { correct, wrong, skipped, pendingReview, timeTaken };
}

// ── Sub-components ────────────────────────────────────
function SortDropdown({ sortKey, setSortKey, show, setShow }) {
  const wrapRef = useRef(null);

  // FIX: close on outside click — previously only closed via option click
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShow(false);
      }
    }
    if (show) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show, setShow]);

  return (
    <div className="tr-sort-wrap" ref={wrapRef}>
      <button className="tr-sort-btn" onClick={() => setShow((p) => !p)}>
        <ArrowUpDown size={14} />
        {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort"}
        {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {show && (
        <div className="tr-sort-dropdown">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`tr-sort-option ${sortKey === o.value ? "tr-sort-option--active" : ""}`}
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

// FIX: pagination redesigned to match the standard app-wide pattern —
// left "X–Y of Z" text, right rounded-square prev/number/next buttons,
// no rows-per-page dropdown, no ellipsis, only rendered above PAGE_THRESH.
function Pagination({
  page,
  totalPages,
  setPage,
  rangeStart,
  rangeEnd,
  totalRows,
}) {
  if (totalRows <= PAGE_THRESH) return null;
  return (
    <div className="tr-pagination">
      <span className="tr-pagination-info">
        {rangeStart}–{rangeEnd} of {totalRows}
      </span>
      <div className="tr-page-controls">
        <button
          className="tr-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          aria-label="Previous page">
          <ChevronLeft size={16} strokeWidth={2.2} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            className={`tr-page-btn tr-page-btn--num ${page === p ? "tr-page-btn--active" : ""}`}
            onClick={() => setPage(p)}
            aria-current={p === page ? "page" : undefined}>
            {p}
          </button>
        ))}
        <button
          className="tr-page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          aria-label="Next page">
          <ChevronRight size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

// ── Result detail modal ───────────────────────────────
function ResultDetailModal({ result, onClose }) {
  const { correct, wrong, skipped, pendingReview, timeTaken } =
    deriveAnswerStats(result);
  const meta = statusMeta(result.status);
  const pct = result.percentage;
  const hasPct = pct != null;
  const grade = hasPct ? calcGrade(pct) : "–";

  const rows = [
    { label: "Submitted At", value: fmtDateTime(result.submittedAt) },
    {
      label: "Time Taken",
      value: timeTaken != null ? `${timeTaken} min` : "—",
    },
    { label: "Correct", value: correct },
    { label: "Wrong", value: wrong },
    { label: "Skipped", value: skipped },
  ];
  if (pendingReview > 0) {
    rows.push({ label: "Awaiting Teacher Review", value: pendingReview });
  }

  return (
    <Modal title="Student Result Detail" onClose={onClose} size="medium">
      <div className="tr-detail-modal">
        {/* Student header */}
        <div className="tr-detail-header">
          <div className="tr-detail-avatar">
            {result.studentName?.[0]?.toUpperCase() ?? "S"}
          </div>
          <div className="tr-detail-info">
            <h2 className="tr-detail-name">{result.studentName ?? "—"}</h2>
            {result.studentRollCode && (
              <span className="tr-detail-roll">{result.studentRollCode}</span>
            )}
            <span className={`tr-status-badge ${meta.cls}`}>{meta.label}</span>
          </div>
          <div
            className={`tr-grade-large ${hasPct ? gradeClass(pct) : "tr-grade--pending"}`}>
            {grade}
          </div>
        </div>

        {/* Score summary */}
        <div className="tr-detail-scores">
          <div className="tr-detail-score-box tr-detail-score-box--primary">
            <span className="tr-detail-score-value">
              {result.totalMarksObtained ?? "—"}
            </span>
            <span className="tr-detail-score-label">Score</span>
          </div>
          <div className="tr-detail-score-box">
            <span className="tr-detail-score-value">
              {result.totalMarks ?? "—"}
            </span>
            <span className="tr-detail-score-label">Max Marks</span>
          </div>
          <div className="tr-detail-score-box">
            <span className="tr-detail-score-value">
              {hasPct ? `${pct.toFixed(1)}%` : "—"}
            </span>
            <span className="tr-detail-score-label">Percentage</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="tr-detail-progress-wrap">
          <div
            className="tr-detail-progress-bar"
            style={{ width: `${Math.min(hasPct ? pct : 0, 100)}%` }}
          />
        </div>

        {!hasPct && result.status === "SUBMITTED" && (
          <p className="tr-detail-note">
            This exam has written answers still awaiting your review. Final
            score will appear once evaluated.
          </p>
        )}

        {/* Meta rows */}
        {rows.map((row) => (
          <div key={row.label} className="tr-detail-row">
            <span className="tr-detail-label">{row.label}</span>
            <span className="tr-detail-value">{row.value}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────
export default function TeacherResults() {
  // Papers list (to select from)
  const [papers, setPapers] = useState([]);
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const [papersLoading, setPapersLoading] = useState(true);

  // Results for selected paper
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [activeResult, setActiveResult] = useState(null);

  // Search, sort, pagination
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("score_desc");
  const [showSort, setShowSort] = useState(false);
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState(null);

  // ── Fetch papers ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setPapersLoading(true);
        const res = await teacherService.getMyPapers();
        const list = res.data.data ?? [];
        setPapers(list);
        if (list.length > 0) setSelectedPaperId(list[0].id);
      } catch {
        setToast({ message: "Failed to load papers.", type: "error" });
      } finally {
        setPapersLoading(false);
      }
    })();
  }, []);

  // ── Fetch results when paper changes ──────────────
  const fetchResults = useCallback(async (paperId) => {
    if (!paperId) return;
    try {
      setResultsLoading(true);
      const res = await teacherService.getPaperResults(paperId);
      setResults(res.data.data ?? []);
      setPage(1);
    } catch {
      setToast({ message: "Failed to load results.", type: "error" });
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPaperId) fetchResults(selectedPaperId);
  }, [selectedPaperId, fetchResults]);

  useEffect(() => {
    setPage(1);
  }, [search, sortKey]);

  // ── Derived ───────────────────────────────────────
  const filtered = results.filter(
    (r) =>
      search.trim() === "" ||
      (r.studentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.studentRollCode ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = sortResults(filtered, sortKey);
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = totalRows === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalRows);

  // FIX: stats now computed only from EVALUATED sessions with a real
  // percentage, so in-progress/pending-review attempts don't drag
  // "Avg Score" down to 0 or get miscounted as failing.
  const attempted = results.length;
  const evaluated = results.filter(
    (r) => r.status === "EVALUATED" && r.percentage != null,
  );
  const passed = evaluated.filter((r) => r.percentage >= 40).length;
  const avgPct = evaluated.length
    ? (
        evaluated.reduce((s, r) => s + r.percentage, 0) / evaluated.length
      ).toFixed(1)
    : "0.0";
  const topScore = evaluated.length
    ? Math.max(...evaluated.map((r) => r.percentage)).toFixed(1)
    : "0.0";

  const selectedPaper = papers.find((p) => p.id === selectedPaperId);

  if (papersLoading) {
    return (
      <TeacherLayout title="Results">
        <div className="tr-loading">
          <Spinner />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="Results">
      <div className="tr-page">
        {/* ── Heading ── */}
        <div className="tr-heading-row">
          <div>
            <h1 className="tr-heading">Exam Results</h1>
            <p className="tr-sub">
              View student results and performance per paper
            </p>
          </div>
          {selectedPaperId && (
            <button
              className="tr-refresh-btn"
              onClick={() => fetchResults(selectedPaperId)}
              disabled={resultsLoading}
              title="Refresh">
              <RefreshCw
                size={15}
                className={resultsLoading ? "tr-spin" : ""}
              />
              Refresh
            </button>
          )}
        </div>

        {/* ── No papers ── */}
        {papers.length === 0 && (
          <div className="tr-empty-page">
            <div className="tr-empty-page__icon">
              <FileText size={36} strokeWidth={1.3} />
            </div>
            <p>No papers found</p>
            <span>Create a question paper first before viewing results.</span>
          </div>
        )}

        {papers.length > 0 && (
          <>
            {/* ── Paper selector ── */}
            <div className="tr-paper-selector-card">
              <div className="tr-paper-selector-label">
                <FileText size={14} /> Select Paper
              </div>
              <div className="tr-paper-tabs">
                {papers.map((paper) => (
                  <button
                    key={paper.id}
                    className={`tr-paper-tab ${selectedPaperId === paper.id ? "tr-paper-tab--active" : ""}`}
                    onClick={() => {
                      setSelectedPaperId(paper.id);
                      setSearch("");
                    }}>
                    <div className="tr-paper-tab-title-row">
                      {paper.aiGenerated && (
                        <Zap size={13} className="tr-paper-tab-zap" />
                      )}
                      <span className="tr-paper-tab-title">{paper.title}</span>
                    </div>
                    <span className="tr-paper-tab-type">
                      {fmtExamType(paper.examType)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Selected paper info strip */}
              {selectedPaper && (
                <div className="tr-paper-info-strip">
                  <span>
                    <BookOpen size={12} />
                    {selectedPaper.subject}
                  </span>
                  {selectedPaper.totalMarks && (
                    <span>
                      <Award size={12} />
                      {selectedPaper.totalMarks} Marks
                    </span>
                  )}
                  {selectedPaper.durationMinutes && (
                    <span>
                      <Clock size={12} />
                      {selectedPaper.durationMinutes} min
                    </span>
                  )}
                  {selectedPaper.questions?.length > 0 && (
                    <span>
                      <ClipboardList size={12} />
                      {selectedPaper.questions.length} Questions
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Stats strip ── */}
            <div className="tr-stats-strip">
              {[
                {
                  icon: <Users size={17} />,
                  value: attempted,
                  label: "Attempted",
                  cls: "blue",
                },
                {
                  icon: <CheckCircle2 size={17} />,
                  value: passed,
                  label: "Passed",
                  cls: "green",
                },
                {
                  icon: <BarChart2 size={17} />,
                  value: `${avgPct}%`,
                  label: "Avg Score",
                  cls: "indigo",
                },
                {
                  icon: <TrendingUp size={17} />,
                  value: `${topScore}%`,
                  label: "Top Score",
                  cls: "cyan",
                },
              ].map((s, i) => (
                <div key={i} className={`tr-stat tr-stat--${s.cls}`}>
                  {s.icon}
                  <div>
                    <span className="tr-stat__value">{s.value}</span>
                    <span className="tr-stat__label">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── No results yet ── */}
            {!resultsLoading && results.length === 0 && (
              <div className="tr-empty">
                <div className="tr-empty__icon">
                  <ClipboardList size={28} strokeWidth={1.3} />
                </div>
                <p>No results yet for this paper</p>
                <span>
                  Results will appear here once students attempt this exam.
                </span>
              </div>
            )}

            {results.length > 0 && (
              <>
                {/* ── Toolbar ── */}
                <div className="tr-toolbar">
                  <div className="tr-search-wrap">
                    <Search size={14} className="tr-search-icon" />
                    <input
                      type="text"
                      className="tr-search"
                      placeholder="Search by student name or roll code…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        className="tr-search-clear"
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

                {/* Results info */}
                <div className="tr-results-info">
                  Showing {paginated.length > 0 ? rangeStart : 0}–{rangeEnd} of{" "}
                  {totalRows} result
                  {totalRows !== 1 ? "s" : ""}
                  {search && ` matching "${search}"`}
                </div>

                {/* ── Table ── */}
                {resultsLoading ? (
                  <div className="tr-loading-inline">
                    <Spinner />
                  </div>
                ) : paginated.length === 0 ? (
                  <div className="tr-empty">
                    <div className="tr-empty__icon">
                      <Search size={28} strokeWidth={1.3} />
                    </div>
                    <p>No results match your search</p>
                    <span>Try a different name or roll code.</span>
                  </div>
                ) : (
                  <div className="tr-table-card">
                    <div className="tr-table-wrap">
                      <table className="tr-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Student</th>
                            <th>Roll Code</th>
                            <th>Score</th>
                            <th>Percentage</th>
                            <th>Grade</th>
                            <th>Status</th>
                            <th>Submitted</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map((result, idx) => {
                            const hasPct = result.percentage != null;
                            const pct = hasPct ? result.percentage : 0;
                            const meta = statusMeta(result.status);
                            return (
                              <tr key={result.id ?? idx}>
                                <td className="tr-cell-no">
                                  {rangeStart + idx}
                                </td>

                                {/* Student */}
                                <td>
                                  <div className="tr-student-cell">
                                    <div className="tr-student-avatar">
                                      {getInitials(result)}
                                    </div>
                                    <span className="tr-student-name">
                                      {result.studentName ?? "—"}
                                    </span>
                                  </div>
                                </td>

                                {/* Roll code */}
                                <td>
                                  {result.studentRollCode ? (
                                    <span className="tr-roll">
                                      {result.studentRollCode}
                                    </span>
                                  ) : (
                                    <span className="tr-empty-text">—</span>
                                  )}
                                </td>

                                {/* Score — FIX: real field names */}
                                <td>
                                  <span className="tr-score-cell">
                                    <strong>
                                      {result.totalMarksObtained ?? "—"}
                                    </strong>
                                    <span className="tr-score-sep">/</span>
                                    {result.totalMarks ?? "—"}
                                  </span>
                                </td>

                                {/* Percentage */}
                                <td>
                                  <div className="tr-pct-cell">
                                    <span className="tr-pct-value">
                                      {hasPct ? `${pct.toFixed(1)}%` : "—"}
                                    </span>
                                    <div className="tr-pct-bar-wrap">
                                      <div
                                        className="tr-pct-bar"
                                        style={{
                                          width: `${Math.min(pct, 100)}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                {/* Grade */}
                                <td>
                                  <span
                                    className={`tr-grade ${hasPct ? gradeClass(pct) : "tr-grade--pending"}`}>
                                    {hasPct ? calcGrade(pct) : "–"}
                                  </span>
                                </td>

                                {/* Status — FIX: real status labels */}
                                <td>
                                  <span
                                    className={`tr-status-badge ${meta.cls}`}>
                                    {meta.label}
                                  </span>
                                </td>

                                {/* Submitted at */}
                                <td className="tr-date-cell">
                                  {fmtDateTime(result.submittedAt)}
                                </td>

                                {/* Action */}
                                <td>
                                  <button
                                    className="tr-view-btn"
                                    onClick={() => {
                                      setActiveResult(result);
                                      setShowDetail(true);
                                    }}>
                                    <Eye size={13} /> View
                                  </button>
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
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  totalRows={totalRows}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* ── Result detail modal ── */}
      {showDetail && activeResult && (
        <ResultDetailModal
          result={activeResult}
          onClose={() => {
            setShowDetail(false);
            setActiveResult(null);
          }}
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
