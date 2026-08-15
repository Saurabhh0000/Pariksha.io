import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  PencilLine,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ListChecks,
  Send,
  ArrowLeft,
  Circle,
  CheckCircle,
  Timer,
  HourglassIcon,
} from "lucide-react";
import StudentLayout from "../../components/student/StudentLayout";
import studentService from "../../services/studentService";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import "./StudentExam.css";

const PAGE_THRESH = 6;

const SUBJECT_PALETTE = [
  { bg: "#DBEAFE", fg: "#2563EB" },
  { bg: "#EDE9FE", fg: "#7C3AED" },
  { bg: "#FFEDD5", fg: "#EA580C" },
  { bg: "#DCFCE7", fg: "#16A34A" },
  { bg: "#E0E7FF", fg: "#4F46E5" },
];

function getSubjectColor(subject) {
  if (!subject) return SUBJECT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < subject.length; i++)
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}

function parseOptions(raw) {
  if (!raw) return [];
  if (raw.trim().startsWith("[")) {
    try {
      return JSON.parse(raw).map((v, i) => ({
        key: String.fromCharCode(65 + i),
        value: v,
      }));
    } catch {
      return [];
    }
  }
  return raw.split(",").map((pair) => {
    const [key, ...rest] = pair.split(":");
    return { key: key.trim(), value: rest.join(":").trim() };
  });
}

// FIX: extract the real backend error message when available, instead of
// always showing a generic string. Falls back sensibly for network issues.
function getErrorMessage(err, fallback) {
  if (!err?.response)
    return "Connection problem. Check your internet and retry.";
  return err.response.data?.message || fallback;
}

// FIX: format seconds as mm:ss (or hh:mm:ss for longer exams) for the timer
function formatDuration(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ─────────────────────────────────────────────
//  Loading skeleton
// ─────────────────────────────────────────────
function ExamSkeleton() {
  return (
    <>
      <div className="se-skel-hero" />
      <div className="se-skel-list">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="se-skel-row" />
        ))}
      </div>
    </>
  );
}

export default function StudentExam() {
  // "list" | "taking" | "result"
  const [view, setView] = useState("list");

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [papers, setPapers] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);

  // Exam-taking state
  const [session, setSession] = useState(null); // ExamSessionResponse
  const [answers, setAnswers] = useState({}); // { questionId: answerText }
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [starting, setStarting] = useState(null); // paperId being started
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [result, setResult] = useState(null);

  // FIX: live countdown timer, seeded from session.timeRemainingSeconds
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const autoSubmittedRef = useRef(false);

  const loadExams = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setError(null);

    const [papersRes, historyRes] = await Promise.allSettled([
      studentService.getMyPapers(),
      studentService.getHistory(),
    ]);

    if (papersRes.status === "fulfilled")
      setPapers(papersRes.value.data.data || []);
    if (historyRes.status === "fulfilled")
      setHistory(historyRes.value.data.data || []);

    const allFailed =
      papersRes.status === "rejected" && historyRes.status === "rejected";
    if (allFailed) {
      const msg = getErrorMessage(
        papersRes.reason,
        "Unable to load your exams.",
      );
      setError(msg);
      if (isRetry) setToast({ type: "error", message: msg });
    } else if (isRetry) {
      setToast({ type: "success", message: "Exams refreshed successfully 🚀" });
    }

    setLoading(false);
    setRetrying(false);
  }, []);

  useEffect(() => {
    loadExams(false);
  }, [loadExams]);

  const attemptedPaperIds = useMemo(
    () => new Set(history.map((h) => h.paperId).filter(Boolean)),
    [history],
  );

  const availablePapers = useMemo(() => {
    return papers
      .filter((p) => !attemptedPaperIds.has(p.id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [papers, attemptedPaperIds]);

  const totalRecords = availablePapers.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_THRESH));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedPapers = useMemo(() => {
    const start = (page - 1) * PAGE_THRESH;
    return availablePapers.slice(start, start + PAGE_THRESH);
  }, [availablePapers, page]);

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * PAGE_THRESH + 1;
  const rangeEnd = Math.min(page * PAGE_THRESH, totalRecords);

  // ── Start exam ──
  async function handleStart(paper) {
    setStarting(paper.id);
    try {
      const sessionRes = await studentService.startExam(paper.id);
      const sessionData = sessionRes.data.data;

      // Resume support: restore previously saved answers if any
      const restoredAnswers = {};
      (sessionData.answers || []).forEach((a) => {
        if (a.answerText != null && a.answerText !== "") {
          restoredAnswers[a.questionId] = a.answerText;
        }
      });

      autoSubmittedRef.current = false;
      setSession({ ...sessionData, questions: paper.questions || [] });
      setAnswers(restoredAnswers);
      setCurrentQIdx(0);
      // Seed the countdown from the backend's authoritative remaining time
      setRemainingSeconds(sessionData.timeRemainingSeconds ?? null);
      setView("taking");
    } catch (err) {
      setToast({
        type: "error",
        message: getErrorMessage(
          err,
          "Unable to start this exam. Please try again.",
        ),
      });
    } finally {
      setStarting(null);
    }
  }

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  const sessionQuestions = session?.questions || [];
  const answeredCount = Object.keys(answers).length;

  // FIX: submit payload now sends "answerText" — matching SubmitAnswerRequest
  // exactly (questionId, answerText). Previously sent "answer", which the
  // backend rejected outright with UnrecognizedPropertyException.
  async function handleSubmit(isAutoSubmit = false) {
    setShowSubmitConfirm(false);
    setSubmitting(true);
    try {
      const payload = {
        answers: sessionQuestions.map((q) => ({
          questionId: q.questionId ?? q.id,
          answerText: answers[q.questionId ?? q.id] ?? "",
        })),
      };
      const res = await studentService.submitExam(session.paperId, payload);
      setResult(res.data.data);
      setView("result");
      setToast({
        type: isAutoSubmit ? "warning" : "success",
        message: isAutoSubmit
          ? "Time's up! Your exam was submitted automatically."
          : "Exam submitted successfully 🚀",
      });
      loadExams(false); // refresh history in background
    } catch (err) {
      setToast({
        type: "error",
        message: getErrorMessage(
          err,
          "Unable to submit your exam. Please try again.",
        ),
      });
    } finally {
      setSubmitting(false);
    }
  }

  // FIX: live countdown — ticks every second while an exam is in progress.
  // Auto-submits (silently, no confirm modal) the instant it hits zero.
  useEffect(() => {
    if (view !== "taking" || remainingSeconds == null) return;

    if (remainingSeconds <= 0) {
      if (!autoSubmittedRef.current && !submitting) {
        autoSubmittedRef.current = true;
        handleSubmit(true);
      }
      return;
    }

    const timeout = setTimeout(() => {
      setRemainingSeconds((s) => (s == null ? s : s - 1));
    }, 1000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, view, submitting]);

  function backToList() {
    setView("list");
    setSession(null);
    setResult(null);
    setAnswers({});
    setRemainingSeconds(null);
    autoSubmittedRef.current = false;
  }

  const isTimeCritical = remainingSeconds != null && remainingSeconds <= 60;

  // ─────────────────────────────────────────────
  //  RENDER: EXAM TAKING VIEW
  // ─────────────────────────────────────────────
  if (view === "taking" && session) {
    const q = sessionQuestions[currentQIdx];
    const qId = q?.questionId ?? q?.id;
    const options = parseOptions(q?.options);

    return (
      <StudentLayout title="Attempt Exam">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <div className="se-exam-header">
          <button
            className="se-back-btn"
            onClick={backToList}
            disabled={submitting}>
            <ArrowLeft size={16} strokeWidth={2.2} /> Exit
          </button>

          <div className="se-exam-header-info">
            <span className="se-exam-header-title">
              {session.paperTitle || session.title}
            </span>
            <span className="se-exam-header-sub">
              {answeredCount} of {sessionQuestions.length} answered
            </span>
          </div>

          {/* FIX: live countdown timer, turns red under 60s */}
          {remainingSeconds != null && (
            <div
              className={`se-timer-badge${isTimeCritical ? " se-timer-critical" : ""}`}>
              <Timer size={15} strokeWidth={2.2} />
              {formatDuration(remainingSeconds)}
            </div>
          )}

          <button
            className="se-submit-btn"
            onClick={() => setShowSubmitConfirm(true)}
            disabled={submitting}>
            {submitting ? (
              <Spinner size="small" color="#fff" />
            ) : (
              <>
                <Send size={15} strokeWidth={2.2} /> Submit
              </>
            )}
          </button>
        </div>

        <div className="se-exam-body">
          {/* Question navigator */}
          <div className="se-q-nav">
            {sessionQuestions.map((qq, i) => {
              const id = qq.questionId ?? qq.id;
              const isAnswered = answers[id] != null && answers[id] !== "";
              const isCurrent = i === currentQIdx;
              return (
                <button
                  key={id ?? i}
                  className={`se-q-dot${isAnswered ? " se-q-dot-answered" : ""}${isCurrent ? " se-q-dot-current" : ""}`}
                  onClick={() => setCurrentQIdx(i)}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Current question */}
          {q ? (
            <div className="se-question-card">
              <div className="se-question-meta">
                <span className="se-question-number">
                  Question {currentQIdx + 1} of {sessionQuestions.length}
                </span>
                <span className="se-question-marks">
                  {q.marks ?? 1} mark{(q.marks ?? 1) === 1 ? "" : "s"}
                </span>
              </div>
              <p className="se-question-text">{q.questionText}</p>

              {q.questionType === "TRUE_FALSE" ? (
                <div className="se-options-list">
                  {["True", "False"].map((opt) => (
                    <button
                      key={opt}
                      className={`se-option${answers[qId] === opt ? " se-option-selected" : ""}`}
                      onClick={() => setAnswer(qId, opt)}>
                      <span className="se-option-radio">
                        {answers[qId] === opt ? (
                          <CheckCircle size={18} strokeWidth={2} />
                        ) : (
                          <Circle size={18} strokeWidth={1.6} />
                        )}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : options.length > 0 ? (
                <div className="se-options-list">
                  {options.map((opt) => (
                    <button
                      key={opt.key}
                      className={`se-option${answers[qId] === opt.key ? " se-option-selected" : ""}`}
                      onClick={() => setAnswer(qId, opt.key)}>
                      <span className="se-option-radio">
                        {answers[qId] === opt.key ? (
                          <CheckCircle size={18} strokeWidth={2} />
                        ) : (
                          <Circle size={18} strokeWidth={1.6} />
                        )}
                      </span>
                      <span className="se-option-key">{opt.key}.</span>{" "}
                      {opt.value}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  className="se-text-answer"
                  rows={5}
                  placeholder="Type your answer here..."
                  value={answers[qId] || ""}
                  onChange={(e) => setAnswer(qId, e.target.value)}
                />
              )}

              <div className="se-question-nav-btns">
                <button
                  className="se-nav-btn"
                  onClick={() => setCurrentQIdx((i) => Math.max(0, i - 1))}
                  disabled={currentQIdx === 0}>
                  <ChevronLeft size={16} strokeWidth={2.2} /> Previous
                </button>
                <button
                  className="se-nav-btn se-nav-btn-primary"
                  onClick={() =>
                    setCurrentQIdx((i) =>
                      Math.min(sessionQuestions.length - 1, i + 1),
                    )
                  }
                  disabled={currentQIdx === sessionQuestions.length - 1}>
                  Next <ChevronRight size={16} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          ) : (
            <div className="se-empty">
              <AlertCircle size={26} strokeWidth={1.6} />
              <p>No questions found for this exam</p>
            </div>
          )}
        </div>

        {showSubmitConfirm && (
          <Modal
            title="Submit Exam"
            onClose={() => setShowSubmitConfirm(false)}
            size="small">
            <div className="se-confirm-body">
              <p className="se-confirm-text">
                You've answered {answeredCount} of {sessionQuestions.length}{" "}
                questions.
                {answeredCount < sessionQuestions.length &&
                  " Unanswered questions will be marked blank."}
              </p>
              <p className="se-confirm-text">
                Are you sure you want to submit this exam?
              </p>
              <div className="se-confirm-actions">
                <button
                  className="se-confirm-cancel"
                  onClick={() => setShowSubmitConfirm(false)}>
                  Keep Reviewing
                </button>
                <button
                  className="se-confirm-submit"
                  onClick={() => handleSubmit(false)}>
                  <Send size={15} strokeWidth={2.2} /> Submit Exam
                </button>
              </div>
            </div>
          </Modal>
        )}
      </StudentLayout>
    );
  }

  // ─────────────────────────────────────────────
  //  RENDER: RESULT VIEW
  // ─────────────────────────────────────────────
  if (view === "result" && result) {
    // FIX: ExamSessionResponse has no "score" field — use totalMarksObtained,
    // and only treat it as scored once the session is actually EVALUATED
    // (auto-evaluated MCQ/T-F/fill-blank, or fully teacher-reviewed).
    const scored =
      result.status === "EVALUATED" &&
      result.totalMarksObtained != null &&
      result.totalMarks != null;
    const pct = scored
      ? Math.round((result.totalMarksObtained / result.totalMarks) * 100)
      : null;
    const pendingReview = result.status === "SUBMITTED";

    return (
      <StudentLayout title="Exam Result">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <div className="se-result-hero">
          <div className="se-result-icon">
            <CheckCircle2 size={40} strokeWidth={1.6} />
          </div>
          <h1 className="se-result-title">Exam Submitted!</h1>
          <p className="se-result-sub">
            {session?.paperTitle || "Your exam"} has been submitted
            successfully.
          </p>

          {scored ? (
            <div className="se-result-score">
              <span className="se-result-pct">{pct}%</span>
              <span className="se-result-raw">
                {result.totalMarksObtained}/{result.totalMarks} marks
              </span>
            </div>
          ) : (
            <div className="se-result-pending">
              <Clock size={16} strokeWidth={2} />
              {pendingReview
                ? "Your written answers are being reviewed. Results will appear here once evaluated."
                : "Result not available yet."}
            </div>
          )}

          <button className="se-back-to-list-btn" onClick={backToList}>
            Back to Exams
          </button>
        </div>
      </StudentLayout>
    );
  }

  // ─────────────────────────────────────────────
  //  RENDER: EXAM LIST VIEW
  // ─────────────────────────────────────────────
  return (
    <StudentLayout title="Exams">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loading ? (
        <ExamSkeleton />
      ) : error ? (
        <div className="se-error-state">
          <div className="se-error-icon">
            <AlertCircle size={32} strokeWidth={1.6} />
          </div>
          <h3>Unable to load your exams 😔</h3>
          <p>{error}</p>
          <span className="se-error-sub">Your data is safe. Please retry.</span>
          <button
            className="se-retry-btn"
            onClick={() => loadExams(true)}
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
          {/* ── HERO ── */}
          <div className="se-hero">
            <div className="se-hero-decor" aria-hidden="true" />
            <div className="se-hero-left">
              <span className="se-hero-label">Exams</span>
              <div className="se-hero-value-row">
                <span className="se-hero-value">{availablePapers.length}</span>
                <span className="se-hero-value-label">
                  Available to attempt
                </span>
              </div>
              <span className="se-hero-sub">
                {history.length} exam{history.length === 1 ? "" : "s"} completed
                so far
              </span>
            </div>
            <div className="se-hero-icon">
              <PencilLine size={28} strokeWidth={1.8} />
            </div>
          </div>

          {/* ── AVAILABLE EXAMS ── */}
          <div className="se-card">
            <div className="se-card-header">
              <div className="se-card-title-wrap">
                <ListChecks size={17} strokeWidth={2} />
                <h2 className="se-card-title">Available Exams</h2>
              </div>
            </div>

            {paginatedPapers.length === 0 ? (
              <div className="se-empty">
                <PencilLine size={28} strokeWidth={1.6} />
                <p>No exams available right now</p>
                <span className="se-empty-sub">
                  New exams assigned to you will appear here
                </span>
              </div>
            ) : (
              <>
                <div className="se-exam-list">
                  {paginatedPapers.map((paper) => {
                    const color = getSubjectColor(paper.subject);
                    const isStarting = starting === paper.id;
                    return (
                      <div key={paper.id} className="se-exam-card">
                        <span
                          className="se-exam-icon"
                          style={{ background: color.bg, color: color.fg }}>
                          <PencilLine size={20} strokeWidth={2} />
                        </span>
                        <div className="se-exam-info">
                          <span className="se-exam-title">{paper.title}</span>
                          <div className="se-exam-tags">
                            <span
                              className="se-subject-chip"
                              style={{ background: color.bg, color: color.fg }}>
                              {paper.subject}
                            </span>
                            {paper.durationMinutes != null && (
                              <span className="se-tag">
                                <Clock size={11} strokeWidth={2} />{" "}
                                {paper.durationMinutes} min
                              </span>
                            )}
                            {paper.totalMarks != null && (
                              <span className="se-tag">
                                <Award size={11} strokeWidth={2} />{" "}
                                {paper.totalMarks} marks
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="se-start-btn"
                          onClick={() => handleStart(paper)}
                          disabled={
                            isStarting || paper.availabilityStatus === "EXPIRED"
                          }>
                          {isStarting ? (
                            <Spinner size="small" color="#fff" />
                          ) : (
                            "Start Exam"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {totalRecords > PAGE_THRESH && (
                  <div className="se-pagination">
                    <span className="se-pagination-info">
                      {rangeStart}–{rangeEnd} of {totalRecords}
                    </span>
                    <div className="se-pagination-controls">
                      <button
                        className="se-page-btn"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="Previous page">
                        <ChevronLeft size={16} strokeWidth={2.2} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <button
                            key={p}
                            className={`se-page-btn${p === page ? " se-page-btn-active" : ""}`}
                            onClick={() => setPage(p)}
                            aria-current={p === page ? "page" : undefined}>
                            {p}
                          </button>
                        ),
                      )}
                      <button
                        className="se-page-btn"
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

          {/* ── EXAM HISTORY ── */}
          <div className="se-card">
            <div className="se-card-header">
              <div className="se-card-title-wrap">
                <CheckCircle2 size={17} strokeWidth={2} />
                <h2 className="se-card-title">Completed Exams</h2>
              </div>
            </div>
            {history.length === 0 ? (
              <div className="se-empty">
                <XCircle size={26} strokeWidth={1.6} />
                <p>No completed exams yet</p>
                <span className="se-empty-sub">
                  Your exam history will appear here
                </span>
              </div>
            ) : (
              <div className="se-history-list">
                {history.map((h) => {
                  // FIX: real field is totalMarksObtained, not score. Also
                  // gate on status so a genuinely-pending review shows a
                  // distinct badge instead of a false "Pending" for
                  // everything, including already-evaluated exams.
                  const scored =
                    h.status === "EVALUATED" &&
                    h.totalMarksObtained != null &&
                    h.totalMarks != null;
                  const pct = scored
                    ? Math.round((h.totalMarksObtained / h.totalMarks) * 100)
                    : null;
                  const pendingReview = h.status === "SUBMITTED";
                  const color = getSubjectColor(h.subject);

                  return (
                    <div key={h.id} className="se-history-item">
                      <span
                        className="se-exam-icon"
                        style={{ background: color.bg, color: color.fg }}>
                        <CheckCircle2 size={16} strokeWidth={2} />
                      </span>
                      <div className="se-history-body">
                        <span className="se-history-title">
                          {h.paperTitle || h.subject}
                        </span>
                        <span className="se-history-meta">{h.subject}</span>
                      </div>
                      <span
                        className={`se-history-score ${
                          scored
                            ? pct >= 75
                              ? "se-score-good"
                              : pct >= 40
                                ? "se-score-avg"
                                : "se-score-low"
                            : "se-score-pending"
                        }`}>
                        {scored ? (
                          `${pct}%`
                        ) : pendingReview ? (
                          <>
                            <HourglassIcon size={12} strokeWidth={2.2} />{" "}
                            Pending Review
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </StudentLayout>
  );
}
