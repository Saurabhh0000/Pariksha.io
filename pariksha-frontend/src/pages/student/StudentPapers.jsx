import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  Clock,
  Award,
  Download,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Sparkles,
  CheckCircle2,
  Hourglass,
  XCircle,
} from "lucide-react";
import StudentLayout from "../../components/student/StudentLayout";
import studentService from "../../services/studentService";
import pdfService from "../../services/pdfService";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import "./StudentPapers.css";

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

const STATUS_META = {
  AVAILABLE: {
    label: "Available",
    color: "#16A34A",
    bg: "#DCFCE7",
    icon: CheckCircle2,
  },
  UPCOMING: {
    label: "Upcoming",
    color: "#D97706",
    bg: "#FEF3C7",
    icon: Hourglass,
  },
  EXPIRED: { label: "Expired", color: "#DC2626", bg: "#FEE2E2", icon: XCircle },
  COMPLETED: {
    label: "Completed",
    color: "#64748B",
    bg: "#F1F5F9",
    icon: CheckCircle2,
  },
};

function getStatusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status || "—",
      color: "#64748B",
      bg: "#F1F5F9",
      icon: FileText,
    }
  );
}

function formatExamType(examType) {
  if (!examType) return null;
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
function PapersSkeleton() {
  return (
    <>
      <div className="sp-skel-hero" />
      <div className="sp-skel-list">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="sp-skel-row" />
        ))}
      </div>
    </>
  );
}

export default function StudentPapers() {
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [papers, setPapers] = useState([]);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeSubject, setActiveSubject] = useState("ALL");
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadPapers = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await studentService.getMyPapers();
      setPapers(res.data.data || []);
      if (isRetry) {
        setToast({
          type: "success",
          message: "Papers refreshed successfully 🚀",
        });
      }
    } catch (err) {
      const isNetworkIssue = !err?.response;
      setError(
        isNetworkIssue
          ? "Connection problem. Check your internet and retry."
          : "Unable to load your papers.",
      );
      if (isRetry) {
        setToast({
          type: "error",
          message: isNetworkIssue
            ? "Connection problem. Check your internet and retry."
            : "Unable to load your papers.",
        });
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    loadPapers(false);
  }, [loadPapers]);

  const subjectChips = useMemo(() => {
    const unique = [...new Set(papers.map((p) => p.subject).filter(Boolean))];
    return unique.sort();
  }, [papers]);

  const filteredPapers = useMemo(() => {
    const list =
      activeSubject === "ALL"
        ? papers
        : papers.filter((p) => p.subject === activeSubject);
    return [...list].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }, [papers, activeSubject]);

  useEffect(() => {
    setPage(1);
  }, [activeSubject]);

  const availableCount = papers.filter(
    (p) => p.availabilityStatus === "AVAILABLE",
  ).length;

  const totalRecords = filteredPapers.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_THRESH));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedPapers = useMemo(() => {
    const start = (page - 1) * PAGE_THRESH;
    return filteredPapers.slice(start, start + PAGE_THRESH);
  }, [filteredPapers, page]);

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * PAGE_THRESH + 1;
  const rangeEnd = Math.min(page * PAGE_THRESH, totalRecords);

  async function handleDownload(paper) {
    setDownloadingId(paper.id);
    try {
      await pdfService.downloadStudent(paper.id);
      setToast({ type: "success", message: `Downloaded "${paper.title}" 🚀` });
    } catch (err) {
      const isNetworkIssue = !err?.response;
      setToast({
        type: "error",
        message: isNetworkIssue
          ? "Connection problem. Check your internet and retry."
          : "Unable to download this paper. Please try again.",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <StudentLayout title="Papers">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loading ? (
        <PapersSkeleton />
      ) : error ? (
        <div className="sp-error-state">
          <div className="sp-error-icon">
            <AlertCircle size={32} strokeWidth={1.6} />
          </div>
          <h3>Unable to load your papers 😔</h3>
          <p>We couldn't fetch your question papers.</p>
          <span className="sp-error-sub">Your data is safe. Please retry.</span>
          <button
            className="sp-retry-btn"
            onClick={() => loadPapers(true)}
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
          <div className="sp-hero">
            <div className="sp-hero-decor" aria-hidden="true" />
            <div className="sp-hero-left">
              <span className="sp-hero-label">Question Papers</span>
              <div className="sp-hero-value-row">
                <span className="sp-hero-value">{papers.length}</span>
                <span className="sp-hero-value-label">Total papers</span>
              </div>
              <span className="sp-hero-sub">
                {availableCount > 0
                  ? `${availableCount} paper${availableCount === 1 ? "" : "s"} available now`
                  : "No papers available right now"}
              </span>
            </div>
            <div className="sp-hero-icon">
              <FileText size={28} strokeWidth={1.8} />
            </div>
          </div>

          {/* ── PAPERS LIST ── */}
          <div className="sp-card">
            <div className="sp-card-header">
              <div className="sp-card-title-wrap">
                <ListChecks size={17} strokeWidth={2} />
                <h2 className="sp-card-title">My Papers</h2>
              </div>
            </div>

            {subjectChips.length > 0 && (
              <div className="sp-filter-row">
                <button
                  className={`sp-filter-chip${activeSubject === "ALL" ? " sp-filter-chip-active" : ""}`}
                  onClick={() => setActiveSubject("ALL")}>
                  All Subjects
                </button>
                {subjectChips.map((subj) => (
                  <button
                    key={subj}
                    className={`sp-filter-chip${activeSubject === subj ? " sp-filter-chip-active" : ""}`}
                    onClick={() => setActiveSubject(subj)}>
                    {subj}
                  </button>
                ))}
              </div>
            )}

            {paginatedPapers.length === 0 ? (
              <div className="sp-empty">
                <FileText size={28} strokeWidth={1.6} />
                <p>No papers found</p>
                <span className="sp-empty-sub">
                  {activeSubject === "ALL"
                    ? "Your question papers will appear here"
                    : `No papers for ${activeSubject} yet`}
                </span>
              </div>
            ) : (
              <>
                <div className="sp-paper-list">
                  {paginatedPapers.map((paper) => {
                    const color = getSubjectColor(paper.subject);
                    const statusMeta = getStatusMeta(paper.availabilityStatus);
                    const examTypeLabel = formatExamType(paper.examType);
                    const questionCount = paper.questions?.length ?? 0;
                    const isDownloading = downloadingId === paper.id;

                    return (
                      <div key={paper.id} className="sp-paper-card">
                        <div className="sp-paper-top">
                          <span
                            className="sp-paper-icon"
                            style={{ background: color.bg, color: color.fg }}>
                            <FileText size={20} strokeWidth={2} />
                          </span>
                          <div className="sp-paper-info">
                            <div className="sp-paper-title-row">
                              <span className="sp-paper-title">
                                {paper.title}
                              </span>
                              {paper.aiGenerated && (
                                <span className="sp-ai-badge">
                                  <Sparkles size={10} strokeWidth={2.4} /> AI
                                </span>
                              )}
                            </div>
                            <div className="sp-paper-tags">
                              <span
                                className="sp-subject-chip"
                                style={{
                                  background: color.bg,
                                  color: color.fg,
                                }}>
                                {paper.subject}
                              </span>
                              {examTypeLabel && (
                                <span className="sp-tag">{examTypeLabel}</span>
                              )}
                              {paper.className && (
                                <span className="sp-tag">
                                  Class {paper.className}
                                  {paper.section ? ` - ${paper.section}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className="sp-status-badge"
                            style={{
                              background: statusMeta.bg,
                              color: statusMeta.color,
                            }}>
                            <statusMeta.icon size={12} strokeWidth={2.4} />
                            {statusMeta.label}
                          </span>
                        </div>

                        <div className="sp-paper-meta">
                          {paper.durationMinutes != null && (
                            <span className="sp-meta-item">
                              <Clock size={13} strokeWidth={2} />{" "}
                              {paper.durationMinutes} min
                            </span>
                          )}
                          {paper.totalMarks != null && (
                            <span className="sp-meta-item">
                              <Award size={13} strokeWidth={2} />{" "}
                              {paper.totalMarks} marks
                            </span>
                          )}
                          {questionCount > 0 && (
                            <span className="sp-meta-item">
                              <ListChecks size={13} strokeWidth={2} />{" "}
                              {questionCount} questions
                            </span>
                          )}
                          {paper.createdAt && (
                            <span className="sp-meta-item sp-meta-date">
                              {formatDate(paper.createdAt)}
                            </span>
                          )}
                        </div>

                        <button
                          className="sp-download-btn"
                          onClick={() => handleDownload(paper)}
                          disabled={isDownloading}>
                          {isDownloading ? (
                            <Spinner size="small" color="#fff" />
                          ) : (
                            <>
                              <Download size={15} strokeWidth={2.2} /> Download
                              PDF
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {totalRecords > PAGE_THRESH && (
                  <div className="sp-pagination">
                    <span className="sp-pagination-info">
                      {rangeStart}–{rangeEnd} of {totalRecords}
                    </span>
                    <div className="sp-pagination-controls">
                      <button
                        className="sp-page-btn"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="Previous page">
                        <ChevronLeft size={16} strokeWidth={2.2} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <button
                            key={p}
                            className={`sp-page-btn${p === page ? " sp-page-btn-active" : ""}`}
                            onClick={() => setPage(p)}
                            aria-current={p === page ? "page" : undefined}>
                            {p}
                          </button>
                        ),
                      )}
                      <button
                        className="sp-page-btn"
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
