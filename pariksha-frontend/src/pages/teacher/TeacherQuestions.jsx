import { useState, useEffect, useCallback } from "react";
import {
  BookMarked,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Filter,
  AlertTriangle,
  Tag,
  Layers,
  BookOpen,
  HelpCircle,
  ToggleLeft,
  AlignLeft,
  List,
  Save,
  XCircle,
  GraduationCap,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import questionService from "../../services/questionService";
import "./TeacherQuestions.css";

// ── Constants ──────────────────────────────────────────
const PAGE_SIZE = 6;
const PAGE_THRESH = 6;

const DIFFICULTY_LEVELS = ["EASY", "MEDIUM", "HARD"];

const QUESTION_TYPES = [
  { value: "MCQ", label: "MCQ" },
  { value: "SHORT_ANSWER", label: "Short Answer" },
  { value: "LONG_ANSWER", label: "Long Answer" },
  { value: "TRUE_FALSE", label: "True / False" },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
  { value: "subject_asc", label: "Subject A → Z" },
  { value: "topic_asc", label: "Topic A → Z" },
  { value: "diff_asc", label: "Easy → Hard" },
  { value: "diff_desc", label: "Hard → Easy" },
];

// Blank form — field names match CreateQuestionRequest DTO exactly
const BLANK_FORM = {
  questionText: "",
  subject: "",
  topic: "",
  classLevel: "", // required by backend
  questionType: "MCQ",
  difficultyLevel: "MEDIUM",
  marks: "1",
  options: "", // backend single field — we build it from optionA/B/C/D
  answer: "", // maps to backend `answer`
  explanation: "",
  // UI-only helper fields (not sent to backend directly)
  _optionA: "",
  _optionB: "",
  _optionC: "",
  _optionD: "",
  _correctKey: "", // "A" | "B" | "C" | "D" for MCQ
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

function diffMeta(d) {
  switch (d?.toUpperCase()) {
    case "EASY":
      return { cls: "tq-diff--easy", label: "Easy" };
    case "MEDIUM":
      return { cls: "tq-diff--medium", label: "Medium" };
    case "HARD":
      return { cls: "tq-diff--hard", label: "Hard" };
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

function sortQuestions(list, key) {
  const s = [...list];
  const dOrd = { EASY: 0, MEDIUM: 1, HARD: 2 };
  switch (key) {
    case "date_desc":
      return s.sort(
        (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
      );
    case "date_asc":
      return s.sort(
        (a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0),
      );
    case "subject_asc":
      return s.sort((a, b) => (a.subject ?? "").localeCompare(b.subject ?? ""));
    case "topic_asc":
      return s.sort((a, b) => (a.topic ?? "").localeCompare(b.topic ?? ""));
    case "diff_asc":
      return s.sort(
        (a, b) =>
          (dOrd[a.difficultyLevel ?? a.difficulty] ?? 1) -
          (dOrd[b.difficultyLevel ?? b.difficulty] ?? 1),
      );
    case "diff_desc":
      return s.sort(
        (a, b) =>
          (dOrd[b.difficultyLevel ?? b.difficulty] ?? 1) -
          (dOrd[a.difficultyLevel ?? a.difficulty] ?? 1),
      );
    default:
      return s;
  }
}

// Build the `options` string for MCQ (comma-separated "A:val,B:val,C:val,D:val")
function buildOptions(form) {
  if (form.questionType !== "MCQ") return null;
  const opts = [];
  if (form._optionA.trim()) opts.push(`A:${form._optionA.trim()}`);
  if (form._optionB.trim()) opts.push(`B:${form._optionB.trim()}`);
  if (form._optionC.trim()) opts.push(`C:${form._optionC.trim()}`);
  if (form._optionD.trim()) opts.push(`D:${form._optionD.trim()}`);
  return opts.join(",") || null;
}

// Parse options string back into _optionA/B/C/D for edit modal
function parseOptions(optionsStr) {
  if (!optionsStr)
    return { _optionA: "", _optionB: "", _optionC: "", _optionD: "" };
  const map = {};
  optionsStr.split(",").forEach((part) => {
    const [key, ...rest] = part.split(":");
    if (key && rest.length) map[key.trim()] = rest.join(":").trim();
  });
  return {
    _optionA: map["A"] ?? "",
    _optionB: map["B"] ?? "",
    _optionC: map["C"] ?? "",
    _optionD: map["D"] ?? "",
  };
}

// Get question text from response (backend may use questionText)
function qText(q) {
  return q.questionText ?? q.question ?? "";
}
// Get difficulty from response (backend uses difficultyLevel)
function qDiff(q) {
  return q.difficultyLevel ?? q.difficulty ?? "MEDIUM";
}
// Get type from response (backend uses questionType)
function qType(q) {
  return q.questionType ?? q.type ?? "MCQ";
}

// ── Sub-components ─────────────────────────────────────
function FormGroup({ label, required, children }) {
  return (
    <div className="tq-form-group">
      <label className="tq-form-label">
        {label}
        {required && <span className="tq-form-req">*</span>}
      </label>
      {children}
    </div>
  );
}

function SortDropdown({ sortKey, setSortKey, show, setShow }) {
  return (
    <div className="tq-sort-wrap">
      <button className="tq-sort-btn" onClick={() => setShow((p) => !p)}>
        <ArrowUpDown size={14} />
        {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort"}
        {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {show && (
        <div className="tq-sort-dropdown">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`tq-sort-option${sortKey === o.value ? " tq-sort-option--active" : ""}`}
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
    <div className="tq-pagination">
      <span className="tq-page-info">
        {start}–{end} of {totalRows}
      </span>
      <div className="tq-page-controls">
        <button
          className="tq-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}>
          <ChevronLeft size={16} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={`tq-page-btn tq-page-btn--num${page === p ? " tq-page-btn--active" : ""}`}
            onClick={() => setPage(p)}>
            {p}
          </button>
        ))}
        <button
          className="tq-page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Question form ──────────────────────────────────────
function QuestionForm({ form, setForm, saving, onSave, onCancel, saveLabel }) {
  const f = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));
  const isMCQ = form.questionType === "MCQ";
  const isTF = form.questionType === "TRUE_FALSE";

  return (
    <div className="tq-form">
      {/* Question text */}
      <FormGroup label="Question Text" required>
        <textarea
          className="tq-input tq-textarea"
          rows={3}
          value={form.questionText}
          onChange={f("questionText")}
          placeholder="Type your question here…"
        />
      </FormGroup>

      {/* Subject + Topic */}
      <div className="tq-form-row">
        <FormGroup label="Subject" required>
          <input
            type="text"
            className="tq-input"
            value={form.subject}
            onChange={f("subject")}
            placeholder="e.g. Mathematics"
          />
        </FormGroup>
        <FormGroup label="Topic" required>
          <input
            type="text"
            className="tq-input"
            value={form.topic}
            onChange={f("topic")}
            placeholder="e.g. Algebra"
          />
        </FormGroup>
      </div>

      {/* Class Level (required by backend) */}
      <FormGroup label="Class Level" required>
        <input
          type="text"
          className="tq-input"
          value={form.classLevel}
          onChange={f("classLevel")}
          placeholder="e.g. Class 10, Grade 9, Standard 8"
        />
      </FormGroup>

      {/* Type + Difficulty + Marks */}
      <div className="tq-form-row tq-form-row--3">
        <FormGroup label="Question Type" required>
          <select
            className="tq-input tq-select"
            value={form.questionType}
            onChange={f("questionType")}>
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormGroup>
        <FormGroup label="Difficulty" required>
          <select
            className="tq-input tq-select"
            value={form.difficultyLevel}
            onChange={f("difficultyLevel")}>
            {DIFFICULTY_LEVELS.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </FormGroup>
        <FormGroup label="Marks" required>
          <input
            type="number"
            className="tq-input"
            value={form.marks}
            onChange={f("marks")}
            placeholder="1"
            min="1"
          />
        </FormGroup>
      </div>

      {/* MCQ options */}
      {isMCQ && (
        <>
          <p className="tq-form-section">
            <List size={13} /> MCQ Options
          </p>
          <div className="tq-form-row">
            <FormGroup label="Option A" required>
              <input
                type="text"
                className="tq-input"
                value={form._optionA}
                onChange={f("_optionA")}
                placeholder="Option A"
              />
            </FormGroup>
            <FormGroup label="Option B" required>
              <input
                type="text"
                className="tq-input"
                value={form._optionB}
                onChange={f("_optionB")}
                placeholder="Option B"
              />
            </FormGroup>
          </div>
          <div className="tq-form-row">
            <FormGroup label="Option C">
              <input
                type="text"
                className="tq-input"
                value={form._optionC}
                onChange={f("_optionC")}
                placeholder="Option C (optional)"
              />
            </FormGroup>
            <FormGroup label="Option D">
              <input
                type="text"
                className="tq-input"
                value={form._optionD}
                onChange={f("_optionD")}
                placeholder="Option D (optional)"
              />
            </FormGroup>
          </div>
          <FormGroup label="Correct Answer" required>
            <select
              className="tq-input tq-select"
              value={form._correctKey}
              onChange={f("_correctKey")}>
              <option value="">— Select correct option —</option>
              {["A", "B", "C", "D"].map((opt) => (
                <option key={opt} value={opt}>
                  Option {opt}
                </option>
              ))}
            </select>
          </FormGroup>
        </>
      )}

      {/* True/False */}
      {isTF && (
        <FormGroup label="Correct Answer" required>
          <select
            className="tq-input tq-select"
            value={form.answer}
            onChange={f("answer")}>
            <option value="">— Select answer —</option>
            <option value="TRUE">True</option>
            <option value="FALSE">False</option>
          </select>
        </FormGroup>
      )}

      {/* Short / Long answer */}
      {!isMCQ && !isTF && (
        <FormGroup label="Model Answer">
          <textarea
            className="tq-input tq-textarea"
            rows={3}
            value={form.answer}
            onChange={f("answer")}
            placeholder="Write the model / expected answer here…"
          />
        </FormGroup>
      )}

      {/* Explanation */}
      <FormGroup label="Explanation (optional)">
        <textarea
          className="tq-input tq-textarea"
          rows={2}
          value={form.explanation}
          onChange={f("explanation")}
          placeholder="Explain why this is the correct answer…"
        />
      </FormGroup>

      <div className="tq-form-actions">
        <button className="tq-cancel-btn" onClick={onCancel} disabled={saving}>
          <XCircle size={14} /> Cancel
        </button>
        <button className="tq-save-btn" onClick={onSave} disabled={saving}>
          {saving ? (
            <Spinner size="small" color="#fff" />
          ) : (
            <>
              <Save size={14} /> {saveLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── View question modal ────────────────────────────────
function ViewQuestionModal({ q, onClose, onEdit }) {
  const dm = diffMeta(qDiff(q));
  const qt = qType(q);
  // Parse options string for display
  const opts = parseOptions(q.options ?? "");
  // For MCQ correct answer is stored as "A", "B", "C", "D"
  const correct = q.answer ?? q.correctAnswer ?? "";

  return (
    <Modal title="Question Details" onClose={onClose} size="medium">
      <div className="tq-view-modal">
        {/* Badges */}
        <div className="tq-view-badges">
          <span className={`tq-diff-badge ${dm.cls}`}>{dm.label}</span>
          <span className="tq-type-badge">
            {typeIcon(qt)}
            {typeLabel(qt)}
          </span>
          {q.subject && (
            <span className="tq-subject-badge">
              <Tag size={11} />
              {q.subject}
            </span>
          )}
          {q.topic && <span className="tq-topic-badge">{q.topic}</span>}
          {q.classLevel && (
            <span className="tq-class-badge">
              <GraduationCap size={11} />
              {q.classLevel}
            </span>
          )}
          <span className="tq-marks-badge">
            {q.marks ?? 1} Mark{(q.marks ?? 1) !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Question text */}
        <div className="tq-view-question">{qText(q)}</div>

        {/* MCQ options */}
        {qt === "MCQ" && (opts._optionA || opts._optionB) && (
          <div className="tq-view-options">
            {["A", "B", "C", "D"].map((key) => {
              const val = opts[`_option${key}`];
              if (!val) return null;
              const isCorrect = correct === key;
              return (
                <div
                  key={key}
                  className={`tq-view-option${isCorrect ? " tq-view-option--correct" : ""}`}>
                  <span className="tq-view-option__key">{key}</span>
                  <span className="tq-view-option__text">{val}</span>
                  {isCorrect && (
                    <CheckCircle2 size={13} className="tq-view-option__tick" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* True/False answer */}
        {qt === "TRUE_FALSE" && correct && (
          <div className="tq-view-answer">
            <span className="tq-view-answer__label">Correct Answer:</span>
            <span
              className={`tq-view-answer__val tq-view-answer__val--${correct.toLowerCase()}`}>
              {correct}
            </span>
          </div>
        )}

        {/* Short/Long model answer */}
        {(qt === "SHORT_ANSWER" || qt === "LONG_ANSWER") && correct && (
          <div className="tq-view-model-answer">
            <p className="tq-view-model-answer__title">Model Answer</p>
            <p className="tq-view-model-answer__text">{correct}</p>
          </div>
        )}

        {/* Explanation */}
        {q.explanation && (
          <div className="tq-view-explanation">
            <p className="tq-view-explanation__title">Explanation</p>
            <p className="tq-view-explanation__text">{q.explanation}</p>
          </div>
        )}

        {q.createdAt && (
          <p className="tq-view-date">Added on {fmtDate(q.createdAt)}</p>
        )}

        <div className="tq-view-footer">
          <button className="tq-cancel-btn" onClick={onClose}>
            Close
          </button>
          <button
            className="tq-save-btn"
            onClick={() => {
              onClose();
              onEdit(q);
            }}>
            <Edit2 size={14} /> Edit Question
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Delete confirm modal ───────────────────────────────
function DeleteModal({ q, onConfirm, onCancel, deleting }) {
  const text = qText(q);
  return (
    <Modal title="Delete Question" onClose={onCancel} size="small">
      <div className="tq-delete-modal">
        <div className="tq-delete-modal__icon">
          <AlertTriangle size={28} strokeWidth={1.5} />
        </div>
        <p className="tq-delete-modal__title">Delete this question?</p>
        <p className="tq-delete-modal__sub">
          "{text.slice(0, 80)}
          {text.length > 80 ? "…" : ""}"
          <br />
          This action cannot be undone.
        </p>
        <div className="tq-delete-modal__actions">
          <button
            className="tq-cancel-btn"
            onClick={onCancel}
            disabled={deleting}>
            Cancel
          </button>
          <button
            className="tq-delete-confirm-btn"
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
export default function TeacherQuestions() {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterDiff, setFilterDiff] = useState("ALL");
  const [sortKey, setSortKey] = useState("date_desc");
  const [showSort, setShowSort] = useState(false);
  const [page, setPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editQuestion, setEditQuestion] = useState(null);
  const [viewQuestion, setViewQuestion] = useState(null);
  const [deleteQuestion, setDeleteQuestion] = useState(null);

  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [editForm, setEditForm] = useState(BLANK_FORM);

  const [toast, setToast] = useState(null);

  // ── Fetch ─────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [questionsRes, subjectsRes] = await Promise.allSettled([
        questionService.getMyQuestions(), // GET /api/questions/my ✅
        questionService.getSubjects(), // GET /api/questions/subjects ✅
      ]);

      if (questionsRes.status === "fulfilled") {
        setQuestions(questionsRes.value.data.data ?? []);
      } else {
        setQuestions([]);
        setToast({
          message: "Failed to load questions. Check your connection.",
          type: "error",
        });
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
  }, [search, filterSubject, filterType, filterDiff, sortKey]);

  // ── Build payload matching CreateQuestionRequest DTO ──
  const buildPayload = (form) => {
    const isMCQ = form.questionType === "MCQ";
    return {
      questionText: form.questionText.trim(),
      subject: form.subject.trim(),
      topic: form.topic.trim(),
      classLevel: form.classLevel.trim(), // required ✅
      questionType: form.questionType, // enum ✅
      difficultyLevel: form.difficultyLevel, // enum ✅
      marks: Number(form.marks), // Integer ✅
      options: isMCQ ? buildOptions(form) : null, // string ✅
      answer: isMCQ
        ? form._correctKey
          ? (form[`_option${form._correctKey}`]?.trim() ?? form._correctKey)
          : ""
        : form.answer.trim() || null, // string ✅
      explanation: form.explanation.trim() || null,
    };
  };

  // ── Add ───────────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.questionText.trim()) {
      setToast({ message: "Question text is required.", type: "error" });
      return;
    }
    if (!addForm.subject.trim()) {
      setToast({ message: "Subject is required.", type: "error" });
      return;
    }
    if (!addForm.topic.trim()) {
      setToast({ message: "Topic is required.", type: "error" });
      return;
    }
    if (!addForm.classLevel.trim()) {
      setToast({
        message: "Class level is required (e.g. Class 10).",
        type: "error",
      });
      return;
    }
    if (!addForm.marks || Number(addForm.marks) < 1) {
      setToast({ message: "Marks must be at least 1.", type: "error" });
      return;
    }
    if (addForm.questionType === "MCQ") {
      if (!addForm._optionA.trim() || !addForm._optionB.trim()) {
        setToast({
          message: "MCQ requires at least Options A and B.",
          type: "error",
        });
        return;
      }
      if (!addForm._correctKey) {
        setToast({
          message: "Please select the correct answer option.",
          type: "error",
        });
        return;
      }
    }
    if (addForm.questionType === "TRUE_FALSE" && !addForm.answer) {
      setToast({
        message: "Please select True or False as the answer.",
        type: "error",
      });
      return;
    }
    try {
      setSaving(true);
      await questionService.create(buildPayload(addForm)); // POST /api/questions ✅
      setToast({
        message: "Question added to bank successfully!",
        type: "success",
      });
      setShowAddModal(false);
      setAddForm(BLANK_FORM);
      fetchAll();
    } catch (err) {
      setToast({
        message: err?.response?.data?.message ?? "Failed to add question.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Update ────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editForm.questionText.trim()) {
      setToast({ message: "Question text is required.", type: "error" });
      return;
    }
    if (!editForm.subject.trim()) {
      setToast({ message: "Subject is required.", type: "error" });
      return;
    }
    if (!editForm.topic.trim()) {
      setToast({ message: "Topic is required.", type: "error" });
      return;
    }
    if (!editForm.classLevel.trim()) {
      setToast({ message: "Class level is required.", type: "error" });
      return;
    }
    try {
      setSaving(true);
      await questionService.update(editQuestion.id, buildPayload(editForm)); // PUT /api/questions/{id} ✅
      setToast({ message: "Question updated successfully!", type: "success" });
      setShowEditModal(false);
      setEditQuestion(null);
      fetchAll();
    } catch (err) {
      setToast({
        message: err?.response?.data?.message ?? "Failed to update question.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await questionService.delete(deleteQuestion.id); // DELETE /api/questions/{id} ✅
      setToast({ message: "Question deleted.", type: "success" });
      setShowDeleteModal(false);
      setDeleteQuestion(null);
      setQuestions((prev) => prev.filter((q) => q.id !== deleteQuestion.id));
    } catch (err) {
      setToast({
        message: err?.response?.data?.message ?? "Failed to delete question.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── Open edit — populate form from response fields ──
  const openEdit = (q) => {
    const parsed = parseOptions(q.options ?? "");
    const qt = qType(q);
    const answer = q.answer ?? q.correctAnswer ?? "";
    // For MCQ: find which key matches the stored answer value
    let correctKey = "";
    if (qt === "MCQ") {
      ["A", "B", "C", "D"].forEach((k) => {
        if (
          parsed[`_option${k}`] &&
          (answer === k || answer === parsed[`_option${k}`])
        ) {
          correctKey = k;
        }
      });
    }
    setEditQuestion(q);
    setEditForm({
      questionText: q.questionText ?? q.question ?? "",
      subject: q.subject ?? "",
      topic: q.topic ?? "",
      classLevel: q.classLevel ?? "",
      questionType: qt,
      difficultyLevel: qDiff(q),
      marks: String(q.marks ?? 1),
      options: q.options ?? "",
      answer: qt === "MCQ" ? "" : answer,
      explanation: q.explanation ?? "",
      _optionA: parsed._optionA,
      _optionB: parsed._optionB,
      _optionC: parsed._optionC,
      _optionD: parsed._optionD,
      _correctKey: correctKey,
    });
    setShowEditModal(true);
  };

  // ── Derived stats ─────────────────────────────────
  const byType = QUESTION_TYPES.reduce((acc, t) => {
    acc[t.value] = questions.filter((q) => qType(q) === t.value).length;
    return acc;
  }, {});

  const byDiff = DIFFICULTY_LEVELS.reduce((acc, d) => {
    acc[d] = questions.filter((q) => qDiff(q) === d).length;
    return acc;
  }, {});

  const uniqueSubjects =
    subjects.length > 0
      ? subjects
      : [...new Set(questions.map((q) => q.subject).filter(Boolean))];

  // ── Filter + sort + paginate ──────────────────────
  const filtered = questions.filter((q) => {
    const text = qText(q).toLowerCase();
    const ms =
      !search.trim() ||
      text.includes(search.toLowerCase()) ||
      (q.subject ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (q.topic ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (q.classLevel ?? "").toLowerCase().includes(search.toLowerCase());
    const msub = filterSubject === "ALL" || q.subject === filterSubject;
    const mtype = filterType === "ALL" || qType(q) === filterType;
    const mdiff = filterDiff === "ALL" || qDiff(q) === filterDiff;
    return ms && msub && mtype && mdiff;
  });

  const sorted = sortQuestions(filtered, sortKey);
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <TeacherLayout title="Questions">
        <div className="tq-loading">
          <Spinner />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="Questions">
      <div className="tq-page">
        {/* ── Heading ── */}
        <div className="tq-heading-row">
          <div>
            <h1 className="tq-heading">Question Bank</h1>
            <p className="tq-sub">
              {questions.length === 0
                ? "No questions yet — add your first question below"
                : `${questions.length} question${questions.length !== 1 ? "s" : ""} · ${uniqueSubjects.length} subject${uniqueSubjects.length !== 1 ? "s" : ""} · ${byType["MCQ"] ?? 0} MCQ · ${byType["TRUE_FALSE"] ?? 0} True/False`}
            </p>
          </div>
          <div className="tq-heading-actions">
            <button
              className="tq-refresh-btn"
              onClick={fetchAll}
              disabled={loading}
              title="Refresh">
              <RefreshCw size={15} className={loading ? "tq-spin" : ""} />
            </button>
            <button
              className="tq-add-btn"
              onClick={() => setShowAddModal(true)}>
              <Plus size={15} /> Add Question
            </button>
          </div>
        </div>

        {/* ── KPI Stats cards ── */}
        <div className="tq-kpi-grid">
          <div className="tq-kpi-card tq-kpi-card--blue">
            <div className="tq-kpi-icon">
              <BookMarked size={20} />
            </div>
            <div className="tq-kpi-body">
              <span className="tq-kpi-value">{questions.length}</span>
              <span className="tq-kpi-label">Total Questions</span>
              <span className="tq-kpi-sub">In your bank</span>
            </div>
          </div>
          <div className="tq-kpi-card tq-kpi-card--indigo">
            <div className="tq-kpi-icon">
              <List size={20} />
            </div>
            <div className="tq-kpi-body">
              <span className="tq-kpi-value">{byType["MCQ"] ?? 0}</span>
              <span className="tq-kpi-label">MCQ</span>
              <span className="tq-kpi-sub">Multiple choice</span>
            </div>
          </div>
          <div className="tq-kpi-card tq-kpi-card--cyan">
            <div className="tq-kpi-icon">
              <AlignLeft size={20} />
            </div>
            <div className="tq-kpi-body">
              <span className="tq-kpi-value">
                {(byType["SHORT_ANSWER"] ?? 0) + (byType["LONG_ANSWER"] ?? 0)}
              </span>
              <span className="tq-kpi-label">Written</span>
              <span className="tq-kpi-sub">Short + Long answer</span>
            </div>
          </div>
          <div className="tq-kpi-card tq-kpi-card--green">
            <div className="tq-kpi-icon">
              <CheckCircle2 size={20} />
            </div>
            <div className="tq-kpi-body">
              <span className="tq-kpi-value">{byDiff["EASY"] ?? 0}</span>
              <span className="tq-kpi-label">Easy</span>
              <span className="tq-kpi-sub">
                {byDiff["MEDIUM"] ?? 0} Medium · {byDiff["HARD"] ?? 0} Hard
              </span>
            </div>
          </div>
          <div className="tq-kpi-card tq-kpi-card--purple">
            <div className="tq-kpi-icon">
              <Layers size={20} />
            </div>
            <div className="tq-kpi-body">
              <span className="tq-kpi-value">{uniqueSubjects.length}</span>
              <span className="tq-kpi-label">Subjects</span>
              <span className="tq-kpi-sub">Unique subjects</span>
            </div>
          </div>
        </div>

        {/* ── Empty page state ── */}
        {questions.length === 0 ? (
          <div className="tq-empty-page">
            <div className="tq-empty-page__icon">
              <BookMarked size={36} strokeWidth={1.3} />
            </div>
            <p className="tq-empty-page__title">Your question bank is empty</p>
            <span className="tq-empty-page__desc">
              Start building your question bank. Add MCQs, short answer, long
              answer, and true/false questions — then use them to create exam
              papers instantly.
            </span>
            <button
              className="tq-add-btn"
              onClick={() => setShowAddModal(true)}>
              <Plus size={15} /> Add First Question
            </button>
          </div>
        ) : (
          <>
            {/* ── Toolbar ── */}
            <div className="tq-toolbar">
              <div className="tq-search-wrap">
                <Search size={14} className="tq-search-icon" />
                <input
                  type="text"
                  className="tq-search"
                  placeholder="Search question, subject, topic, class level…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="tq-search-clear"
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

            {/* ── Filter chips ── */}
            <div className="tq-filter-row">
              <div className="tq-filter-section">
                <span className="tq-filter-label">
                  <Filter size={12} /> Subject
                </span>
                <div className="tq-filter-chips">
                  <button
                    className={`tq-chip${filterSubject === "ALL" ? " tq-chip--active" : ""}`}
                    onClick={() => setFilterSubject("ALL")}>
                    All
                  </button>
                  {uniqueSubjects.map((s) => (
                    <button
                      key={s}
                      className={`tq-chip${filterSubject === s ? " tq-chip--active" : ""}`}
                      onClick={() => setFilterSubject(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tq-filter-section">
                <span className="tq-filter-label">
                  <HelpCircle size={12} /> Type
                </span>
                <div className="tq-filter-chips">
                  <button
                    className={`tq-chip${filterType === "ALL" ? " tq-chip--active" : ""}`}
                    onClick={() => setFilterType("ALL")}>
                    All
                  </button>
                  {QUESTION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      className={`tq-chip${filterType === t.value ? " tq-chip--active" : ""}`}
                      onClick={() => setFilterType(t.value)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tq-filter-section">
                <span className="tq-filter-label">
                  <Layers size={12} /> Difficulty
                </span>
                <div className="tq-filter-chips">
                  <button
                    className={`tq-chip${filterDiff === "ALL" ? " tq-chip--active" : ""}`}
                    onClick={() => setFilterDiff("ALL")}>
                    All
                  </button>
                  {DIFFICULTY_LEVELS.map((d) => (
                    <button
                      key={d}
                      className={`tq-chip tq-chip--diff-${d.toLowerCase()}${filterDiff === d ? " tq-chip--active" : ""}`}
                      onClick={() => setFilterDiff(d)}>
                      {d.charAt(0) + d.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Results info ── */}
            <div className="tq-results-info">
              {totalRows === 0
                ? "No questions match your filters"
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalRows)} of ${totalRows} question${totalRows !== 1 ? "s" : ""}${search ? ` matching "${search}"` : ""}`}
            </div>

            {/* ── Question cards ── */}
            {paginated.length === 0 ? (
              <div className="tq-empty">
                <div className="tq-empty__icon">
                  <Search size={28} strokeWidth={1.3} />
                </div>
                <p>No questions match your filters</p>
                <span>Try a different search term or clear the filters.</span>
                <button
                  className="tq-empty__clear"
                  onClick={() => {
                    setSearch("");
                    setFilterSubject("ALL");
                    setFilterType("ALL");
                    setFilterDiff("ALL");
                  }}>
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="tq-grid">
                {paginated.map((q) => {
                  const dm = diffMeta(qDiff(q));
                  const qt = qType(q);
                  const opts = parseOptions(q.options ?? "");
                  const ans = q.answer ?? q.correctAnswer ?? "";
                  return (
                    <div key={q.id} className="tq-card">
                      {/* Badges */}
                      <div className="tq-card__top">
                        <div className="tq-card__badges">
                          <span className={`tq-diff-badge ${dm.cls}`}>
                            {dm.label}
                          </span>
                          <span className="tq-type-badge">
                            {typeIcon(qt)}
                            {typeLabel(qt)}
                          </span>
                          {q.marks && (
                            <span className="tq-marks-badge">{q.marks}M</span>
                          )}
                        </div>
                      </div>

                      {/* Question text */}
                      <p className="tq-card__question">
                        {qText(q).slice(0, 160)}
                        {qText(q).length > 160 ? "…" : ""}
                      </p>

                      {/* Subject + topic + classLevel */}
                      <div className="tq-card__meta">
                        {q.subject && (
                          <span className="tq-card__subject">
                            <Tag size={11} />
                            {q.subject}
                          </span>
                        )}
                        {q.topic && (
                          <span className="tq-card__topic">{q.topic}</span>
                        )}
                        {q.classLevel && (
                          <span className="tq-card__class">
                            <GraduationCap size={11} />
                            {q.classLevel}
                          </span>
                        )}
                      </div>

                      {/* MCQ options preview */}
                      {qt === "MCQ" && opts._optionA && (
                        <div className="tq-card__options">
                          {["A", "B", "C", "D"].map((key) => {
                            const val = opts[`_option${key}`];
                            if (!val) return null;
                            const isCorrect = ans === key || ans === val;
                            return (
                              <span
                                key={key}
                                className={`tq-card__option${isCorrect ? " tq-card__option--correct" : ""}`}>
                                <span className="tq-card__option-key">
                                  {key}
                                </span>
                                {val.slice(0, 36)}
                                {val.length > 36 ? "…" : ""}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="tq-card__actions">
                        <button
                          className="tq-card__btn tq-card__btn--view"
                          onClick={() => {
                            setViewQuestion(q);
                            setShowViewModal(true);
                          }}>
                          <Eye size={13} /> View
                        </button>
                        <button
                          className="tq-card__btn tq-card__btn--edit"
                          onClick={() => openEdit(q)}>
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          className="tq-card__btn tq-card__btn--delete"
                          onClick={() => {
                            setDeleteQuestion(q);
                            setShowDeleteModal(true);
                          }}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Pagination (only when > PAGE_THRESH) ── */}
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

      {/* ════ ADD MODAL ════ */}
      {showAddModal && (
        <Modal
          title="Add New Question"
          onClose={() => {
            setShowAddModal(false);
            setAddForm(BLANK_FORM);
          }}
          size="large">
          <QuestionForm
            form={addForm}
            setForm={setAddForm}
            saving={saving}
            onSave={handleAdd}
            onCancel={() => {
              setShowAddModal(false);
              setAddForm(BLANK_FORM);
            }}
            saveLabel="Add Question"
          />
        </Modal>
      )}

      {/* ════ EDIT MODAL ════ */}
      {showEditModal && editQuestion && (
        <Modal
          title="Edit Question"
          onClose={() => {
            setShowEditModal(false);
            setEditQuestion(null);
          }}
          size="large">
          <QuestionForm
            form={editForm}
            setForm={setEditForm}
            saving={saving}
            onSave={handleUpdate}
            onCancel={() => {
              setShowEditModal(false);
              setEditQuestion(null);
            }}
            saveLabel="Update Question"
          />
        </Modal>
      )}

      {/* ════ VIEW MODAL ════ */}
      {showViewModal && viewQuestion && (
        <ViewQuestionModal
          q={viewQuestion}
          onClose={() => {
            setShowViewModal(false);
            setViewQuestion(null);
          }}
          onEdit={(q) => openEdit(q)}
        />
      )}

      {/* ════ DELETE MODAL ════ */}
      {showDeleteModal && deleteQuestion && (
        <DeleteModal
          q={deleteQuestion}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeleteQuestion(null);
          }}
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
    </TeacherLayout>
  );
}
