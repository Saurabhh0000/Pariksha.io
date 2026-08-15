import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  BookOpen,
  RefreshCw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  GraduationCap,
  Tag,
  BookMarked,
  BarChart2,
  Sparkles,
  AlertCircle,
  ClipboardList,
  User,
  CalendarDays,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import paperService from "../../services/paperService";
import questionService from "../../services/questionService";
import teacherService from "../../services/teacherService";
import pdfService from "../../services/pdfService";
import "./TeacherPapers.css";

// ── Constants ──────────────────────────────────────────
const PAGE_SIZES = [6, 12, 24];
const PAGE_THRESH = 6;

// Must match ExamType enum exactly
const EXAM_TYPES = [
  { value: "UNIT_TEST", label: "Unit Test" },
  { value: "MID_TERM", label: "Mid Term" },
  { value: "FINAL_EXAM", label: "Final Exam" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "PRACTICAL", label: "Practical" },
];

// Must match DifficultyLevel enum exactly
const DIFFICULTY_LEVELS = ["EASY", "MEDIUM", "HARD"];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
  { value: "title_asc", label: "Title A → Z" },
  { value: "title_desc", label: "Title Z → A" },
];

// Blank form for manual paper — fields match CreatePaperRequest DTO
const BLANK_MANUAL = {
  title: "",
  subject: "",
  classLevel: "", // required ✅
  classRoomId: "", // Long ✅
  examType: "UNIT_TEST", // ExamType enum ✅
  durationMinutes: "", // Integer ✅
  instructions: "",
  examStartTime: "",
  examEndTime: "",
  questionIds: [], // List<Long> ✅
};

// Blank form for AI paper — fields match AiPaperRequest DTO
const BLANK_AI = {
  title: "",
  subject: "",
  topic: "", // required ✅
  classLevel: "", // required ✅
  classRoomId: "", // Long ✅
  examType: "UNIT_TEST", // ExamType enum ✅
  durationMinutes: "60", // Integer ✅
  numberOfQuestions: "10", // required ✅
  difficultyLevel: "MEDIUM", // DifficultyLevel enum ✅
  marksPerQuestion: "2", // required ✅
  instructions: "",
  examStartTime: "",
  examEndTime: "",
};

// ── Helpers ────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function examTypeLabel(v) {
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
    default:
      return s;
  }
}

function classLabel(cls) {
  if (!cls) return "";
  return `${cls.className}${cls.section ? ` · ${cls.section}` : ""}`;
}

// ── Sub-components ─────────────────────────────────────
function FormGroup({ label, required, hint, children }) {
  return (
    <div className="tp2-form-group">
      <label className="tp2-form-label">
        {label}
        {required && <span className="tp2-form-req">*</span>}
      </label>
      {children}
      {hint && <span className="tp2-field-hint">{hint}</span>}
    </div>
  );
}

function SortDropdown({ sortKey, setSortKey, show, setShow }) {
  return (
    <div className="tp2-sort-wrap">
      <button className="tp2-sort-btn" onClick={() => setShow((p) => !p)}>
        <ArrowUpDown size={14} />
        {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort"}
        {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {show && (
        <div className="tp2-sort-dropdown">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`tp2-sort-option${sortKey === o.value ? " tp2-sort-option--active" : ""}`}
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

function Pagination({
  page,
  totalPages,
  setPage,
  pageSize,
  setPageSize,
  totalRows,
}) {
  if (totalRows <= PAGE_THRESH) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="tp2-pagination">
      <div className="tp2-page-size">
        <span>Per page</span>
        <select
          className="tp2-page-size-select"
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
      <div className="tp2-page-controls">
        <button
          className="tp2-page-btn"
          onClick={() => setPage(1)}
          disabled={page === 1}>
          «
        </button>
        <button
          className="tp2-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}>
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="tp2-page-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`tp2-page-btn tp2-page-btn--num${page === p ? " tp2-page-btn--active" : ""}`}
              onClick={() => setPage(p)}>
              {p}
            </button>
          ),
        )}
        <button
          className="tp2-page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}>
          <ChevronRight size={14} />
        </button>
        <button
          className="tp2-page-btn"
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}>
          »
        </button>
      </div>
      <span className="tp2-page-info">
        Page {page} of {totalPages}
      </span>
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
      <div className="tp2-detail-modal">
        {/* Header */}
        <div className="tp2-detail-hero">
          <div
            className={`tp2-detail-icon${paper.aiGenerated ? " tp2-detail-icon--ai" : ""}`}>
            {paper.aiGenerated ? (
              <Sparkles size={22} />
            ) : (
              <FileText size={22} />
            )}
          </div>
          <div className="tp2-detail-info">
            <h2 className="tp2-detail-title">{paper.title}</h2>
            <div className="tp2-detail-badges">
              {paper.subject && (
                <span className="tp2-detail-subject">
                  <Tag size={11} />
                  {paper.subject}
                </span>
              )}
              {paper.examType && (
                <span className="tp2-detail-exam-type">
                  {examTypeLabel(paper.examType)}
                </span>
              )}
              {paper.classLevel && (
                <span className="tp2-detail-class">
                  <GraduationCap size={11} />
                  {paper.classLevel}
                </span>
              )}
              {paper.aiGenerated && (
                <span className="tp2-detail-ai-badge">
                  <Sparkles size={11} />
                  AI Generated
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="tp2-detail-stats">
          <div className="tp2-detail-stat tp2-detail-stat--blue">
            <div className="tp2-detail-stat__icon">
              <ClipboardList size={16} />
            </div>
            <div className="tp2-detail-stat__body">
              <span className="tp2-detail-stat__val">
                {paper.questions?.length ?? paper.questionCount ?? "—"}
              </span>
              <span className="tp2-detail-stat__lbl">Questions</span>
            </div>
          </div>
          <div className="tp2-detail-stat tp2-detail-stat--green">
            <div className="tp2-detail-stat__icon">
              <BarChart2 size={16} />
            </div>
            <div className="tp2-detail-stat__body">
              <span className="tp2-detail-stat__val">
                {paper.totalMarks ?? "—"}
              </span>
              <span className="tp2-detail-stat__lbl">Total Marks</span>
            </div>
          </div>
          <div className="tp2-detail-stat tp2-detail-stat--amber">
            <div className="tp2-detail-stat__icon">
              <Clock size={16} />
            </div>
            <div className="tp2-detail-stat__body">
              <span className="tp2-detail-stat__val">
                {paper.durationMinutes ?? paper.duration ?? "—"}
              </span>
              <span className="tp2-detail-stat__lbl">Duration (min)</span>
            </div>
          </div>
          <div className="tp2-detail-stat tp2-detail-stat--indigo">
            <div className="tp2-detail-stat__icon">
              <User size={16} />
            </div>
            <div className="tp2-detail-stat__body">
              <span className="tp2-detail-stat__val">
                {fmtDate(paper.createdAt)}
              </span>
              <span className="tp2-detail-stat__lbl">Created On</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {paper.instructions && (
          <div className="tp2-detail-instructions">
            <p className="tp2-detail-section-title">
              <AlertCircle size={13} /> Instructions
            </p>
            <p className="tp2-detail-instructions-text">{paper.instructions}</p>
          </div>
        )}

        {/* Questions preview */}
        {paper.questions?.length > 0 && (
          <div className="tp2-detail-questions">
            <p className="tp2-detail-section-title">
              <BookOpen size={13} /> Questions ({paper.questions.length})
            </p>
            <div className="tp2-detail-q-list">
              {paper.questions.map((q, i) => (
                <div key={q.id ?? i} className="tp2-detail-q-row">
                  <span className="tp2-detail-q-num">Q{i + 1}</span>
                  <span className="tp2-detail-q-text">
                    {q.questionText ?? q.question}
                  </span>
                  <span className="tp2-detail-q-marks">{q.marks ?? "—"} M</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download buttons */}
        <div className="tp2-detail-downloads">
          <p className="tp2-detail-section-title">
            <Download size={13} /> Download PDF
          </p>
          <div className="tp2-detail-download-btns">
            <button
              className="tp2-dl-btn tp2-dl-btn--teacher"
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
              className="tp2-dl-btn tp2-dl-btn--student"
              onClick={() => onDownloadStudent(paper.id)}
              disabled={downloading === `s-${paper.id}`}>
              {downloading === `s-${paper.id}` ? (
                <Spinner size="small" color="var(--teacher-primary)" />
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

// ══════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════
export default function TeacherPapers() {
  const [papers, setPapers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState("date_desc");
  const [showSort, setShowSort] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [showManualModal, setShowManualModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [viewPaper, setViewPaper] = useState(null);

  const [manualForm, setManualForm] = useState(BLANK_MANUAL);
  const [aiForm, setAiForm] = useState(BLANK_AI);

  const [toast, setToast] = useState(null);

  // ── Pre-select first class in both forms ────────────
  const preSelectClass = useCallback((list, mSetter, aSetter) => {
    if (!list?.length) return;
    const first = list[0];
    const patch = {
      classRoomId: String(first.id),
      classLevel: `${first.className}${first.section ? ` ${first.section}` : ""}`,
    };
    mSetter((p) => ({ ...p, ...patch }));
    aSetter((p) => ({ ...p, ...patch }));
  }, []);

  // ── Fetch all data ────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [papersRes, classesRes, questionsRes] = await Promise.allSettled([
        paperService.getMyPapers(), // GET /api/papers/my ✅
        teacherService.getClasses(), // GET teacher's classes ✅
        questionService.getMyQuestions(), // GET /api/questions/my ✅
      ]);

      if (papersRes.status === "fulfilled") {
        setPapers(papersRes.value.data.data ?? []);
      } else {
        setPapers([]);
        setToast({
          message: "Failed to load papers. Check your connection.",
          type: "error",
        });
      }

      if (classesRes.status === "fulfilled") {
        const list = classesRes.value.data.data ?? [];
        setClasses(list);
        preSelectClass(list, setManualForm, setAiForm);
      } else {
        setClasses([]);
      }

      if (questionsRes.status === "fulfilled") {
        setQuestions(questionsRes.value.data.data ?? []);
      } else {
        setQuestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [preSelectClass]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useEffect(() => {
    setPage(1);
  }, [search, filter, sortKey]);

  // ── Handle class select — sync classLevel + classRoomId ─
  const handleClassSelect = (setter, classRoomId) => {
    const cls = classes.find((c) => String(c.id) === String(classRoomId));
    setter((p) => ({
      ...p,
      classRoomId,
      classLevel: cls
        ? `${cls.className}${cls.section ? ` ${cls.section}` : ""}`
        : p.classLevel,
    }));
  };

  // ── Build CreatePaperRequest payload ─────────────────
  const buildManualPayload = (form) => ({
    title: form.title.trim(),
    subject: form.subject.trim(),
    classLevel: form.classLevel.trim(), // required ✅
    classRoomId: Number(form.classRoomId), // Long ✅
    examType: form.examType, // ExamType enum ✅
    durationMinutes: Number(form.durationMinutes), // Integer ✅
    instructions: form.instructions.trim() || null,
    examStartTime: form.examStartTime || null,
    examEndTime: form.examEndTime || null,
    questionIds: form.questionIds, // List<Long> ✅
  });

  // ── Build AiPaperRequest payload ──────────────────────
  const buildAiPayload = (form) => ({
    title: form.title.trim(),
    subject: form.subject.trim(),
    topic: form.topic.trim(), // required ✅
    classLevel: form.classLevel.trim(), // required ✅
    classRoomId: Number(form.classRoomId), // Long ✅
    examType: form.examType, // ExamType enum ✅
    durationMinutes: Number(form.durationMinutes), // Integer ✅
    numberOfQuestions: Number(form.numberOfQuestions), // required ✅
    difficultyLevel: form.difficultyLevel, // DifficultyLevel enum ✅
    marksPerQuestion: Number(form.marksPerQuestion), // required ✅
    instructions: form.instructions.trim() || null,
    examStartTime: form.examStartTime || null,
    examEndTime: form.examEndTime || null,
  });

  // ── Create Manual Paper ───────────────────────────
  const handleCreateManual = async () => {
    if (!manualForm.title.trim()) {
      setToast({ message: "Paper title is required.", type: "error" });
      return;
    }
    if (!manualForm.subject.trim()) {
      setToast({ message: "Subject is required.", type: "error" });
      return;
    }
    if (!manualForm.classRoomId) {
      setToast({ message: "Please select a class.", type: "error" });
      return;
    }
    if (!manualForm.classLevel.trim()) {
      setToast({ message: "Class level is required.", type: "error" });
      return;
    }
    if (!manualForm.durationMinutes || Number(manualForm.durationMinutes) < 1) {
      setToast({
        message: "Duration must be at least 1 minute.",
        type: "error",
      });
      return;
    }
    if (manualForm.questionIds.length === 0) {
      setToast({ message: "Select at least one question.", type: "error" });
      return;
    }
    try {
      setSaving(true);
      await paperService.createManual(buildManualPayload(manualForm)); // POST /api/papers ✅
      setToast({ message: "Paper created successfully!", type: "success" });
      setShowManualModal(false);
      setManualForm(BLANK_MANUAL);
      fetchAll();
    } catch (err) {
      setToast({
        message: err?.response?.data?.message ?? "Failed to create paper.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Create AI Paper ───────────────────────────────
  const handleCreateAi = async () => {
    if (!aiForm.title.trim()) {
      setToast({ message: "Paper title is required.", type: "error" });
      return;
    }
    if (!aiForm.subject.trim()) {
      setToast({ message: "Subject is required.", type: "error" });
      return;
    }
    if (!aiForm.topic.trim()) {
      setToast({ message: "Topic is required.", type: "error" });
      return;
    }
    if (!aiForm.classRoomId) {
      setToast({ message: "Please select a class.", type: "error" });
      return;
    }
    if (!aiForm.classLevel.trim()) {
      setToast({ message: "Class level is required.", type: "error" });
      return;
    }
    if (!aiForm.durationMinutes || Number(aiForm.durationMinutes) < 1) {
      setToast({
        message: "Duration must be at least 1 minute.",
        type: "error",
      });
      return;
    }
    if (!aiForm.numberOfQuestions || Number(aiForm.numberOfQuestions) < 1) {
      setToast({
        message: "Number of questions must be at least 1.",
        type: "error",
      });
      return;
    }
    if (!aiForm.marksPerQuestion || Number(aiForm.marksPerQuestion) < 1) {
      setToast({
        message: "Marks per question must be at least 1.",
        type: "error",
      });
      return;
    }
    try {
      setGenerating(true);
      await paperService.createAi(buildAiPayload(aiForm)); // POST /api/papers/ai ✅
      setToast({
        message: "AI paper generated successfully!",
        type: "success",
      });
      setShowAiModal(false);
      setAiForm(BLANK_AI);
      fetchAll();
    } catch (err) {
      setToast({
        message: err?.response?.data?.message ?? "Failed to generate AI paper.",
        type: "error",
      });
    } finally {
      setGenerating(false);
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
  const subjects = [...new Set(papers.map((p) => p.subject).filter(Boolean))];

  // ── Filter + sort + paginate ──────────────────────
  const filtered = papers.filter((p) => {
    const q = search.toLowerCase();
    const ms =
      !search.trim() ||
      (p.title ?? "").toLowerCase().includes(q) ||
      (p.subject ?? "").toLowerCase().includes(q) ||
      (p.classLevel ?? "").toLowerCase().includes(q);
    const mf =
      filter === "ALL" ||
      (filter === "AI" && p.aiGenerated) ||
      (filter === "MANUAL" && !p.aiGenerated);
    return ms && mf;
  });

  const sorted = sortPapers(filtered, sortKey);
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  if (loading) {
    return (
      <TeacherLayout title="Papers">
        <div className="tp2-loading">
          <Spinner />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="Papers">
      <div className="tp2-page">
        {/* ── Heading ── */}
        <div className="tp2-heading-row">
          <div>
            <h1 className="tp2-heading">Question Papers</h1>
            <p className="tp2-sub">
              {papers.length === 0
                ? "No papers yet — create your first paper below"
                : `${papers.length} paper${papers.length !== 1 ? "s" : ""} · ${aiPapers.length} AI · ${manualPapers.length} manual · ${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="tp2-heading-actions">
            <button
              className="tp2-refresh-btn"
              onClick={fetchAll}
              disabled={loading}
              title="Refresh">
              <RefreshCw size={15} className={loading ? "tp2-spin" : ""} />
            </button>
            <button className="tp2-ai-btn" onClick={() => setShowAiModal(true)}>
              <Sparkles size={15} /> AI Generate
            </button>
            <button
              className="tp2-add-btn"
              onClick={() => setShowManualModal(true)}>
              <Plus size={15} /> Create Manual
            </button>
          </div>
        </div>

        {/* ── KPI Stats cards ── */}
        <div className="tp2-kpi-grid">
          <div className="tp2-kpi-card tp2-kpi-card--blue">
            <div className="tp2-kpi-icon">
              <FileText size={20} />
            </div>
            <div className="tp2-kpi-body">
              <span className="tp2-kpi-value">{papers.length}</span>
              <span className="tp2-kpi-label">Total Papers</span>
              <span className="tp2-kpi-sub">All created papers</span>
            </div>
          </div>
          <div className="tp2-kpi-card tp2-kpi-card--purple">
            <div className="tp2-kpi-icon">
              <Sparkles size={20} />
            </div>
            <div className="tp2-kpi-body">
              <span className="tp2-kpi-value">{aiPapers.length}</span>
              <span className="tp2-kpi-label">AI Generated</span>
              <span className="tp2-kpi-sub">Auto-created by Gemini</span>
            </div>
          </div>
          <div className="tp2-kpi-card tp2-kpi-card--green">
            <div className="tp2-kpi-icon">
              <ClipboardList size={20} />
            </div>
            <div className="tp2-kpi-body">
              <span className="tp2-kpi-value">{manualPapers.length}</span>
              <span className="tp2-kpi-label">Manual Papers</span>
              <span className="tp2-kpi-sub">Handpicked questions</span>
            </div>
          </div>
          <div className="tp2-kpi-card tp2-kpi-card--cyan">
            <div className="tp2-kpi-icon">
              <BookOpen size={20} />
            </div>
            <div className="tp2-kpi-body">
              <span className="tp2-kpi-value">{subjects.length}</span>
              <span className="tp2-kpi-label">Subjects</span>
              <span className="tp2-kpi-sub">Unique subjects covered</span>
            </div>
          </div>
          <div className="tp2-kpi-card tp2-kpi-card--indigo">
            <div className="tp2-kpi-icon">
              <BookMarked size={20} />
            </div>
            <div className="tp2-kpi-body">
              <span className="tp2-kpi-value">{questions.length}</span>
              <span className="tp2-kpi-label">Question Bank</span>
              <span className="tp2-kpi-sub">Available to use</span>
            </div>
          </div>
        </div>

        {/* ── Empty state ── */}
        {papers.length === 0 ? (
          <div className="tp2-empty-page">
            <div className="tp2-empty-page__icon">
              <FileText size={36} strokeWidth={1.3} />
            </div>
            <p className="tp2-empty-page__title">No papers created yet</p>
            <span className="tp2-empty-page__desc">
              Create your first question paper manually from your question bank,
              or let AI generate one instantly based on topic and difficulty.
            </span>
            <div className="tp2-empty-page__actions">
              <button
                className="tp2-ai-btn"
                onClick={() => setShowAiModal(true)}>
                <Sparkles size={15} /> AI Generate
              </button>
              <button
                className="tp2-add-btn"
                onClick={() => setShowManualModal(true)}>
                <Plus size={15} /> Create Manual
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Toolbar ── */}
            <div className="tp2-toolbar">
              <div className="tp2-search-wrap">
                <Search size={14} className="tp2-search-icon" />
                <input
                  type="text"
                  className="tp2-search"
                  placeholder="Search by title, subject, class level…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="tp2-search-clear"
                    onClick={() => setSearch("")}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="tp2-filter-group">
                {[
                  { key: "ALL", label: "All" },
                  { key: "AI", label: "AI" },
                  { key: "MANUAL", label: "Manual" },
                ].map((f) => (
                  <button
                    key={f.key}
                    className={`tp2-filter-btn${filter === f.key ? " tp2-filter-btn--active" : ""}`}
                    onClick={() => setFilter(f.key)}>
                    {f.label}
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
            <div className="tp2-results-info">
              {totalRows === 0
                ? `No papers match "${search}"`
                : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalRows)} of ${totalRows} paper${totalRows !== 1 ? "s" : ""}${search ? ` matching "${search}"` : ""}`}
            </div>

            {/* ── Paper cards ── */}
            {paginated.length === 0 ? (
              <div className="tp2-empty">
                <div className="tp2-empty__icon">
                  <Search size={28} strokeWidth={1.3} />
                </div>
                <p>No papers match your filter</p>
                <span>
                  Try a different title, subject, or clear the filter.
                </span>
                <button
                  className="tp2-empty__clear"
                  onClick={() => {
                    setSearch("");
                    setFilter("ALL");
                  }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="tp2-grid">
                {paginated.map((paper) => (
                  <div
                    key={paper.id}
                    className={`tp2-card${paper.aiGenerated ? " tp2-card--ai" : ""}`}>
                    <div className="tp2-card__header">
                      <div
                        className={`tp2-card__icon-wrap${paper.aiGenerated ? " tp2-card__icon-wrap--ai" : ""}`}>
                        {paper.aiGenerated ? (
                          <Sparkles size={18} />
                        ) : (
                          <FileText size={18} />
                        )}
                      </div>
                      <div className="tp2-card__title-wrap">
                        <h3 className="tp2-card__title">{paper.title}</h3>
                        <div className="tp2-card__badges">
                          {paper.subject && (
                            <span className="tp2-card__subject">
                              <Tag size={10} />
                              {paper.subject}
                            </span>
                          )}
                          {paper.examType && (
                            <span className="tp2-card__exam-type">
                              {examTypeLabel(paper.examType)}
                            </span>
                          )}
                          {paper.aiGenerated && (
                            <span className="tp2-card__ai-chip">
                              <Sparkles size={10} />
                              AI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {paper.classLevel && (
                      <div className="tp2-card__class-row">
                        <GraduationCap size={12} />
                        <span>{paper.classLevel}</span>
                      </div>
                    )}

                    <div className="tp2-card__stats">
                      <span className="tp2-card__stat">
                        <ClipboardList size={12} />
                        {paper.questions?.length ??
                          paper.questionCount ??
                          "—"}{" "}
                        Qs
                      </span>
                      <span className="tp2-card__stat">
                        <BarChart2 size={12} />
                        {paper.totalMarks ?? "—"} Marks
                      </span>
                      <span className="tp2-card__stat">
                        <Clock size={12} />
                        {paper.durationMinutes ?? paper.duration ?? "—"} min
                      </span>
                      <span className="tp2-card__stat tp2-card__stat--date">
                        <CalendarDays size={12} />
                        {fmtDate(paper.createdAt)}
                      </span>
                    </div>

                    <div className="tp2-card__actions">
                      <button
                        className="tp2-card__btn tp2-card__btn--view"
                        onClick={() => setViewPaper(paper)}>
                        <Eye size={13} /> View
                      </button>
                      <button
                        className="tp2-card__btn tp2-card__btn--teacher-dl"
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
                        className="tp2-card__btn tp2-card__btn--student-dl"
                        onClick={() => handleDownloadStudent(paper.id)}
                        disabled={downloading === `s-${paper.id}`}
                        title="Download questions only">
                        {downloading === `s-${paper.id}` ? (
                          <Spinner
                            size="small"
                            color="var(--teacher-primary)"
                          />
                        ) : (
                          <>
                            <Download size={13} /> Questions
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
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

      {/* ════ MANUAL PAPER MODAL ════ */}
      {showManualModal && (
        <Modal
          title="Create Manual Paper"
          onClose={() => {
            setShowManualModal(false);
            setManualForm(BLANK_MANUAL);
          }}
          size="large">
          <div className="tp2-form">
            <p className="tp2-form-section">Paper Details</p>

            <div className="tp2-form-row">
              <FormGroup label="Paper Title" required>
                <input
                  type="text"
                  className="tp2-input"
                  value={manualForm.title}
                  onChange={(e) =>
                    setManualForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g. Mid-Term Mathematics Paper"
                />
              </FormGroup>
              <FormGroup label="Subject" required>
                <input
                  type="text"
                  className="tp2-input"
                  value={manualForm.subject}
                  onChange={(e) =>
                    setManualForm((p) => ({ ...p, subject: e.target.value }))
                  }
                  placeholder="e.g. Mathematics"
                />
              </FormGroup>
            </div>

            {/* Class select — populates classRoomId + classLevel */}
            <FormGroup
              label="Class"
              required
              hint={
                classes.length === 0
                  ? "No classes assigned yet. Contact your admin."
                  : ""
              }>
              <select
                className="tp2-input tp2-select"
                value={manualForm.classRoomId}
                onChange={(e) =>
                  handleClassSelect(setManualForm, e.target.value)
                }>
                <option value="">— Select class —</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={String(cls.id)}>
                    Class {classLabel(cls)}
                  </option>
                ))}
              </select>
            </FormGroup>

            <div className="tp2-form-row">
              <FormGroup label="Exam Type" required>
                <select
                  className="tp2-input tp2-select"
                  value={manualForm.examType}
                  onChange={(e) =>
                    setManualForm((p) => ({ ...p, examType: e.target.value }))
                  }>
                  {EXAM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FormGroup>
              <FormGroup label="Duration (minutes)" required>
                <input
                  type="number"
                  className="tp2-input"
                  value={manualForm.durationMinutes}
                  onChange={(e) =>
                    setManualForm((p) => ({
                      ...p,
                      durationMinutes: e.target.value,
                    }))
                  }
                  placeholder="e.g. 60"
                  min="1"
                />
              </FormGroup>
            </div>

            <FormGroup label="Instructions">
              <textarea
                className="tp2-input tp2-textarea"
                value={manualForm.instructions}
                onChange={(e) =>
                  setManualForm((p) => ({ ...p, instructions: e.target.value }))
                }
                placeholder="Write exam instructions here…"
                rows={3}
              />
            </FormGroup>

            <p className="tp2-form-section">
              <BookOpen size={13} /> Select Questions from Bank
            </p>

            {questions.length === 0 ? (
              <div className="tp2-no-questions">
                <AlertCircle size={18} />
                No questions in your bank yet. Go to the Questions page and add
                some first.
              </div>
            ) : (
              <div className="tp2-q-picker">
                {questions.map((q) => {
                  const sel = manualForm.questionIds.includes(q.id);
                  return (
                    <label
                      key={q.id}
                      className={`tp2-q-row${sel ? " tp2-q-row--selected" : ""}`}>
                      <input
                        type="checkbox"
                        className="tp2-q-check"
                        checked={sel}
                        onChange={() =>
                          setManualForm((p) => ({
                            ...p,
                            questionIds: sel
                              ? p.questionIds.filter((id) => id !== q.id)
                              : [...p.questionIds, q.id],
                          }))
                        }
                      />
                      <div className="tp2-q-info">
                        <span className="tp2-q-text">
                          {q.questionText ?? q.question}
                        </span>
                        <div className="tp2-q-meta">
                          {q.questionType && (
                            <span className="tp2-q-tag">{q.questionType}</span>
                          )}
                          {q.difficultyLevel && (
                            <span className="tp2-q-tag tp2-q-tag--diff">
                              {q.difficultyLevel}
                            </span>
                          )}
                          {q.topic && (
                            <span className="tp2-q-tag">{q.topic}</span>
                          )}
                        </div>
                      </div>
                      <span className="tp2-q-marks">{q.marks ?? 1}M</span>
                    </label>
                  );
                })}
              </div>
            )}

            {manualForm.questionIds.length > 0 && (
              <div className="tp2-selected-count">
                <CheckCircle2 size={14} />
                {manualForm.questionIds.length} question
                {manualForm.questionIds.length !== 1 ? "s" : ""} selected
              </div>
            )}

            <div className="tp2-form-actions">
              <button
                className="tp2-cancel-btn"
                onClick={() => {
                  setShowManualModal(false);
                  setManualForm(BLANK_MANUAL);
                }}
                disabled={saving}>
                Cancel
              </button>
              <button
                className="tp2-save-btn"
                onClick={handleCreateManual}
                disabled={saving}>
                {saving ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <FileText size={14} /> Create Paper
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════ AI PAPER MODAL ════ */}
      {showAiModal && (
        <Modal
          title="AI Generate Paper"
          onClose={() => {
            setShowAiModal(false);
            setAiForm(BLANK_AI);
          }}
          size="large">
          <div className="tp2-form">
            <div className="tp2-ai-info-banner">
              <Sparkles size={16} />
              <span>
                Gemini AI will generate unique questions based on your topic,
                difficulty and exam type. This may take a few seconds — please
                wait after clicking Generate.
              </span>
            </div>

            <p className="tp2-form-section">Paper Details</p>

            <div className="tp2-form-row">
              <FormGroup label="Paper Title" required>
                <input
                  type="text"
                  className="tp2-input"
                  value={aiForm.title}
                  onChange={(e) =>
                    setAiForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g. Unit Test — Chapter 3"
                />
              </FormGroup>
              <FormGroup label="Subject" required>
                <input
                  type="text"
                  className="tp2-input"
                  value={aiForm.subject}
                  onChange={(e) =>
                    setAiForm((p) => ({ ...p, subject: e.target.value }))
                  }
                  placeholder="e.g. Physics"
                />
              </FormGroup>
            </div>

            <FormGroup label="Topic / Chapter" required>
              <input
                type="text"
                className="tp2-input"
                value={aiForm.topic}
                onChange={(e) =>
                  setAiForm((p) => ({ ...p, topic: e.target.value }))
                }
                placeholder="e.g. Newton's Laws of Motion"
              />
            </FormGroup>

            {/* Class select — populates classRoomId + classLevel */}
            <FormGroup
              label="Class"
              required
              hint={
                classes.length === 0
                  ? "No classes assigned yet. Contact your admin."
                  : ""
              }>
              <select
                className="tp2-input tp2-select"
                value={aiForm.classRoomId}
                onChange={(e) => handleClassSelect(setAiForm, e.target.value)}>
                <option value="">— Select class —</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={String(cls.id)}>
                    Class {classLabel(cls)}
                  </option>
                ))}
              </select>
            </FormGroup>

            <div className="tp2-form-row">
              <FormGroup label="Exam Type" required>
                <select
                  className="tp2-input tp2-select"
                  value={aiForm.examType}
                  onChange={(e) =>
                    setAiForm((p) => ({ ...p, examType: e.target.value }))
                  }>
                  {EXAM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FormGroup>
              <FormGroup label="Difficulty" required>
                <select
                  className="tp2-input tp2-select"
                  value={aiForm.difficultyLevel}
                  onChange={(e) =>
                    setAiForm((p) => ({
                      ...p,
                      difficultyLevel: e.target.value,
                    }))
                  }>
                  {DIFFICULTY_LEVELS.map((d) => (
                    <option key={d} value={d}>
                      {d.charAt(0) + d.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </FormGroup>
            </div>

            <div className="tp2-form-row">
              <FormGroup label="No. of Questions" required>
                <input
                  type="number"
                  className="tp2-input"
                  value={aiForm.numberOfQuestions}
                  onChange={(e) =>
                    setAiForm((p) => ({
                      ...p,
                      numberOfQuestions: e.target.value,
                    }))
                  }
                  placeholder="10"
                  min="1"
                  max="50"
                />
              </FormGroup>
              <FormGroup label="Marks per Question" required>
                <input
                  type="number"
                  className="tp2-input"
                  value={aiForm.marksPerQuestion}
                  onChange={(e) =>
                    setAiForm((p) => ({
                      ...p,
                      marksPerQuestion: e.target.value,
                    }))
                  }
                  placeholder="2"
                  min="1"
                />
              </FormGroup>
              <FormGroup label="Duration (minutes)" required>
                <input
                  type="number"
                  className="tp2-input"
                  value={aiForm.durationMinutes}
                  onChange={(e) =>
                    setAiForm((p) => ({
                      ...p,
                      durationMinutes: e.target.value,
                    }))
                  }
                  placeholder="60"
                  min="1"
                />
              </FormGroup>
            </div>

            <FormGroup label="Instructions">
              <textarea
                className="tp2-input tp2-textarea"
                value={aiForm.instructions}
                onChange={(e) =>
                  setAiForm((p) => ({ ...p, instructions: e.target.value }))
                }
                placeholder="Write exam instructions here…"
                rows={3}
              />
            </FormGroup>

            <div className="tp2-form-actions">
              <button
                className="tp2-cancel-btn"
                onClick={() => {
                  setShowAiModal(false);
                  setAiForm(BLANK_AI);
                }}
                disabled={generating}>
                Cancel
              </button>
              <button
                className="tp2-ai-save-btn"
                onClick={handleCreateAi}
                disabled={generating}>
                {generating ? (
                  <>
                    <Spinner size="small" color="#fff" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Generate Paper
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════ VIEW PAPER MODAL ════ */}
      {viewPaper && (
        <PaperDetailModal
          paper={viewPaper}
          onClose={() => setViewPaper(null)}
          onDownloadTeacher={handleDownloadTeacher}
          onDownloadStudent={handleDownloadStudent}
          downloading={downloading}
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
