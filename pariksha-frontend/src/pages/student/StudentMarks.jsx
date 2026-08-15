import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Award,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  ClipboardList,
} from "lucide-react";
import StudentLayout from "../../components/student/StudentLayout";
import studentService from "../../services/studentService";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import "./StudentMarks.css";

const PAGE_THRESH = 6;

const SUBJECT_PALETTE = [
  { bg: "#DBEAFE", fg: "#2563EB" },
  { bg: "#EDE9FE", fg: "#7C3AED" },
  { bg: "#FFEDD5", fg: "#EA580C" },
  { bg: "#DCFCE7", fg: "#16A34A" },
  { bg: "#E0E7FF", fg: "#4F46E5" },
  { bg: "#FCE7F3", fg: "#DB2777" },
  { bg: "#FEF9C3", fg: "#A16207" },
];

function getSubjectColor(subject) {
  if (!subject) return SUBJECT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}

function getGradeTone(pct) {
  if (pct == null) return "sm-badge-neutral";
  if (pct >= 75) return "sm-badge-good";
  if (pct >= 40) return "sm-badge-avg";
  return "sm-badge-low";
}

function formatExamType(examType) {
  if (!examType) return "Exam";
  return examType
    .toString()
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────
//  Loading skeleton
// ─────────────────────────────────────────────
function MarksSkeleton() {
  return (
    <>
      <div className="sm-skel-hero" />
      <div className="sm-skel-cards-row">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="sm-skel-card" />
        ))}
      </div>
      <div className="sm-skel-list">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="sm-skel-row" />
        ))}
      </div>
    </>
  );
}

export default function StudentMarks() {
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [summary, setSummary] = useState([]);
  const [marks, setMarks] = useState([]);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeSubject, setActiveSubject] = useState("ALL");
  const [page, setPage] = useState(1);

  const loadMarks = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setError(null);

    const [summaryRes, marksRes] = await Promise.allSettled([
      studentService.getMarksSummary(),
      studentService.getMarks(),
    ]);

    if (summaryRes.status === "fulfilled")
      setSummary(summaryRes.value.data.data || []);
    if (marksRes.status === "fulfilled")
      setMarks(marksRes.value.data.data || []);

    const allFailed =
      summaryRes.status === "rejected" && marksRes.status === "rejected";
    if (allFailed) {
      const isNetworkIssue = !summaryRes.reason?.response;
      setError(
        isNetworkIssue
          ? "Connection problem. Check your internet and retry."
          : "Unable to load your marks.",
      );
      if (isRetry) {
        setToast({
          type: "error",
          message: isNetworkIssue
            ? "Connection problem. Check your internet and retry."
            : "Unable to load your marks.",
        });
      }
    } else if (isRetry) {
      setToast({ type: "success", message: "Marks refreshed successfully 🚀" });
    } else if (
      summaryRes.status === "rejected" ||
      marksRes.status === "rejected"
    ) {
      setToast({ type: "warning", message: "Some marks data couldn't load." });
    }

    setLoading(false);
    setRetrying(false);
  }, []);

  useEffect(() => {
    loadMarks(false);
  }, [loadMarks]);

  // ── Overall average — from summary percentages ──
  const overallAvg = useMemo(() => {
    const valid = summary.filter((s) => s.percentage != null);
    if (!valid.length) return null;
    const sum = valid.reduce((acc, s) => acc + s.percentage, 0);
    return Math.round((sum / valid.length) * 10) / 10;
  }, [summary]);

  const overallGrade = useMemo(() => {
    if (overallAvg == null) return "–";
    if (overallAvg >= 90) return "A+";
    if (overallAvg >= 80) return "A";
    if (overallAvg >= 70) return "B";
    if (overallAvg >= 60) return "C";
    if (overallAvg >= 50) return "D";
    return "F";
  }, [overallAvg]);

  const bestSubject = useMemo(() => {
    const valid = summary.filter((s) => s.percentage != null);
    if (!valid.length) return null;
    return valid.reduce((a, b) => (b.percentage > a.percentage ? b : a));
  }, [summary]);

  // ── Subject filter chips derived from real exam records ──
  const subjectChips = useMemo(() => {
    const unique = [...new Set(marks.map((m) => m.subject).filter(Boolean))];
    return unique.sort();
  }, [marks]);

  const filteredMarks = useMemo(() => {
    const list =
      activeSubject === "ALL"
        ? marks
        : marks.filter((m) => m.subject === activeSubject);
    return [...list].sort(
      (a, b) => new Date(b.examDate) - new Date(a.examDate),
    );
  }, [marks, activeSubject]);

  useEffect(() => {
    setPage(1);
  }, [activeSubject]);

  const totalRecords = filteredMarks.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_THRESH));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedMarks = useMemo(() => {
    const start = (page - 1) * PAGE_THRESH;
    return filteredMarks.slice(start, start + PAGE_THRESH);
  }, [filteredMarks, page]);

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * PAGE_THRESH + 1;
  const rangeEnd = Math.min(page * PAGE_THRESH, totalRecords);

  return (
    <StudentLayout title="Marks">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loading ? (
        <MarksSkeleton />
      ) : error ? (
        <div className="sm-error-state">
          <div className="sm-error-icon">
            <AlertCircle size={32} strokeWidth={1.6} />
          </div>
          <h3>Unable to load your marks 😔</h3>
          <p>We couldn't fetch your exam results.</p>
          <span className="sm-error-sub">Your data is safe. Please retry.</span>
          <button
            className="sm-retry-btn"
            onClick={() => loadMarks(true)}
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
          <div className="sm-hero">
            <div className="sm-hero-decor" aria-hidden="true" />
            <div className="sm-hero-left">
              <span className="sm-hero-label">Overall Average</span>
              <div className="sm-hero-pct-row">
                <span className="sm-hero-pct">
                  {overallAvg != null ? `${overallAvg}%` : "–"}
                </span>
                <span className="sm-badge sm-badge-onhero">
                  Grade {overallGrade}
                </span>
              </div>
              <span className="sm-hero-sub">
                {bestSubject
                  ? `Strongest in ${bestSubject.subject} (${bestSubject.percentage}%)`
                  : "No marks recorded yet"}
              </span>
            </div>
            <div className="sm-hero-ring">
              <svg viewBox="0 0 100 100" className="sm-hero-ring-svg">
                <circle cx="50" cy="50" r="42" className="sm-hero-ring-track" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="sm-hero-ring-fill"
                  style={{
                    strokeDasharray: 2 * Math.PI * 42,
                    strokeDashoffset:
                      2 * Math.PI * 42 * (1 - (overallAvg ?? 0) / 100),
                  }}
                />
              </svg>
              <Award size={22} strokeWidth={2} className="sm-hero-ring-icon" />
            </div>
          </div>

          {/* ── SUBJECT SUMMARY CARDS ── */}
          <div className="sm-card">
            <div className="sm-card-header">
              <div className="sm-card-title-wrap">
                <TrendingUp size={17} strokeWidth={2} />
                <h2 className="sm-card-title">Subject Performance</h2>
              </div>
            </div>

            {summary.length === 0 ? (
              <div className="sm-empty">
                <BookMarked size={26} strokeWidth={1.6} />
                <p>No subject summary yet</p>
                <span className="sm-empty-sub">
                  Your subject-wise performance will appear here
                </span>
              </div>
            ) : (
              <div className="sm-subject-grid">
                {summary.map((s, i) => {
                  const color = getSubjectColor(s.subject);
                  return (
                    <div key={i} className="sm-subject-card">
                      <div className="sm-subject-top">
                        <span
                          className="sm-subject-icon"
                          style={{ background: color.bg, color: color.fg }}>
                          <BookMarked size={18} strokeWidth={2} />
                        </span>
                        <span
                          className={`sm-badge ${getGradeTone(s.percentage)}`}>
                          {s.grade || "–"}
                        </span>
                      </div>
                      <span className="sm-subject-name">{s.subject}</span>
                      <div className="sm-subject-progress-track">
                        <div
                          className="sm-subject-progress-bar"
                          style={{
                            width: `${s.percentage ?? 0}%`,
                            background: color.fg,
                          }}
                        />
                      </div>
                      <div className="sm-subject-meta-row">
                        <span className="sm-subject-pct">
                          {s.percentage != null ? `${s.percentage}%` : "–"}
                        </span>
                        <span className="sm-subject-marks">
                          {s.totalMarksObtained ?? "–"}/{s.totalMaxMarks ?? "–"}{" "}
                          marks
                        </span>
                      </div>
                      <span className="sm-subject-exams-count">
                        {s.examsCount} exam{s.examsCount === 1 ? "" : "s"}{" "}
                        recorded
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── DETAILED EXAM RECORDS ── */}
          <div className="sm-card">
            <div className="sm-card-header">
              <div className="sm-card-title-wrap">
                <ClipboardList size={17} strokeWidth={2} />
                <h2 className="sm-card-title">Exam Records</h2>
              </div>
            </div>

            {subjectChips.length > 0 && (
              <div className="sm-filter-row">
                <button
                  className={`sm-filter-chip${activeSubject === "ALL" ? " sm-filter-chip-active" : ""}`}
                  onClick={() => setActiveSubject("ALL")}>
                  All Subjects
                </button>
                {subjectChips.map((subj) => (
                  <button
                    key={subj}
                    className={`sm-filter-chip${activeSubject === subj ? " sm-filter-chip-active" : ""}`}
                    onClick={() => setActiveSubject(subj)}>
                    {subj}
                  </button>
                ))}
              </div>
            )}

            {paginatedMarks.length === 0 ? (
              <div className="sm-empty">
                <ClipboardList size={26} strokeWidth={1.6} />
                <p>No exam records found</p>
                <span className="sm-empty-sub">
                  {activeSubject === "ALL"
                    ? "Your exam results will appear here"
                    : `No records for ${activeSubject} yet`}
                </span>
              </div>
            ) : (
              <>
                <div className="sm-record-list">
                  {paginatedMarks.map((m) => {
                    const color = getSubjectColor(m.subject);
                    return (
                      <div key={m.id} className="sm-record-item">
                        <span
                          className="sm-record-icon"
                          style={{ background: color.bg, color: color.fg }}>
                          <BookMarked size={16} strokeWidth={2} />
                        </span>
                        <div className="sm-record-body">
                          <span className="sm-record-subject">{m.subject}</span>
                          <span className="sm-record-meta">
                            {formatExamType(m.examType)} ·{" "}
                            {formatDate(m.examDate)}
                          </span>
                        </div>
                        <div className="sm-record-score">
                          <span
                            className={`sm-record-pct ${getGradeTone(m.percentage)}`}>
                            {m.percentage != null ? `${m.percentage}%` : "–"}
                          </span>
                          <span className="sm-record-raw">
                            {m.marksObtained}/{m.totalMarks}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalRecords > PAGE_THRESH && (
                  <div className="sm-pagination">
                    <span className="sm-pagination-info">
                      {rangeStart}–{rangeEnd} of {totalRecords}
                    </span>
                    <div className="sm-pagination-controls">
                      <button
                        className="sm-page-btn"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="Previous page">
                        <ChevronLeft size={16} strokeWidth={2.2} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <button
                            key={p}
                            className={`sm-page-btn${p === page ? " sm-page-btn-active" : ""}`}
                            onClick={() => setPage(p)}
                            aria-current={p === page ? "page" : undefined}>
                            {p}
                          </button>
                        ),
                      )}
                      <button
                        className="sm-page-btn"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
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
