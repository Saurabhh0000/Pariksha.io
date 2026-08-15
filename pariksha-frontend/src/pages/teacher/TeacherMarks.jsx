import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  X,
  Save,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Users,
  Award,
  BarChart2,
  FileText,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Eye,
  Pencil,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import teacherService from "../../services/teacherService";
import "./TeacherMarks.css";

// ── Enums matching backend ExamType ───────────────────
// NOTE: these values must match io.pariksha.enums.ExamType EXACTLY,
// otherwise Jackson will reject the payload on save with a 400.
//   UNIT_TEST, MID_TERM, FINAL_EXAM, ASSIGNMENT, PRACTICAL
const EXAM_TYPES = [
  { value: "", label: "Select exam type" },
  { value: "UNIT_TEST", label: "Unit Test" },
  { value: "MID_TERM", label: "Mid Term" },
  { value: "FINAL_EXAM", label: "Final Exam" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "PRACTICAL", label: "Practical" },
];

const PAGE_SIZE = 6;

// ── Helpers ───────────────────────────────────────────

/** "Class 10 · Section A" from a class object */
function fmtClass(cls) {
  if (!cls) return "—";
  const name = cls.className ?? cls.name ?? "";
  const section = cls.section ?? "";
  if (!name) return "—";
  return section ? `Class ${name}  ·  Section ${section}` : `Class ${name}`;
}

function fmtExamType(type) {
  return EXAM_TYPES.find((e) => e.value === type)?.label ?? type ?? "—";
}

function fmtDate(value) {
  if (!value) return "No date";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getGrade(pct) {
  if (pct === null || pct === undefined || isNaN(pct))
    return { letter: "—", cls: "tm-grade--na" };
  if (pct >= 90) return { letter: "A+", cls: "tm-grade--a-plus" };
  if (pct >= 75) return { letter: "A", cls: "tm-grade--a" };
  if (pct >= 60) return { letter: "B", cls: "tm-grade--b" };
  if (pct >= 45) return { letter: "C", cls: "tm-grade--c" };
  return { letter: "D", cls: "tm-grade--d" };
}

function calcStats(students, marks, totalMarks) {
  const total = Number(totalMarks);
  const scored = students.filter(
    (s) => marks[s.id] !== "" && marks[s.id] !== undefined && total > 0,
  );
  if (!scored.length)
    return {
      avg: null,
      highest: null,
      passRate: null,
      scoredCount: 0,
      total: students.length,
    };

  const pcts = scored.map((s) => (Number(marks[s.id]) / total) * 100);
  const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const highest = Math.max(...pcts);
  const passCount = pcts.filter((p) => p >= 35).length;
  const passRate = (passCount / pcts.length) * 100;
  return {
    avg,
    highest,
    passRate,
    passCount,
    scoredCount: scored.length,
    total: students.length,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ─────────────────────────────────────────────────────
//  PAGE COMPONENT
// ─────────────────────────────────────────────────────

export default function TeacherMarks() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  // ── Form fields mapping to AddMarksRequest ──
  // subject      → String  (required)
  // examType     → ExamType enum (required)
  // totalMarks   → Double  (required)
  // examDate     → LocalDate  (optional, defaults to today)
  const [subject, setSubject] = useState("");
  const [examType, setExamType] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [examDate, setExamDate] = useState(today());

  // Map of studentId → marksObtained string (empty = not filled)
  const [marks, setMarks] = useState({});

  // Map of studentId → array of that student's previously saved
  // MarksResponse records (from GET /api/teacher/marks/{stuId}).
  // Used to detect "this subject + exam type is already graded for
  // this student" so Save can update instead of duplicate, and to
  // power the "view marks history" modal below.
  const [studentMarksData, setStudentMarksData] = useState({});

  // Map of studentId → existing marks record id, when the current
  // subject/examType combo already has a saved record for that student.
  // Present  → handleSave calls updateMarks(id, ...)
  // Missing  → handleSave calls addMarks(...) (new record)
  const [markRecordIds, setMarkRecordIds] = useState({});

  // The student whose full marks history modal is currently open
  // (null = modal closed). Clicking a student row/card opens this.
  const [viewingStudent, setViewingStudent] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [saving, setSaving] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Fetch every student's existing marks records ──
  // teacherService.getStudentMarks(stuId) hits GET /api/teacher/marks/{stuId}
  // and returns that student's full marks history (all subjects/exam types).
  // We fetch it per-student in parallel and key the results by our local
  // student.id so the prefill effect + the history modal can look it up.
  async function fetchMarksMap(list) {
    const results = await Promise.allSettled(
      list.map((s) => teacherService.getStudentMarks(s.userId ?? s.id)),
    );
    const map = {};
    list.forEach((s, i) => {
      const r = results[i];
      map[s.id] =
        r.status === "fulfilled"
          ? (r.value?.data?.data ?? r.value?.data ?? [])
          : [];
    });
    return map;
  }

  // ── Load classes ──────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await teacherService.getClasses();
        const list = res.data.data ?? [];
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0]);
      } catch {
        setToast({ type: "error", message: "Failed to load classes." });
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  // ── Load students (+ their existing marks) when class changes ──

  useEffect(() => {
    if (!selectedClass) return;
    (async () => {
      try {
        setLoadingClass(true);
        setStudents([]);
        setMarks({});
        setMarkRecordIds({});
        setStudentMarksData({});
        setPage(1);
        const res = await teacherService.getStudentsIn(selectedClass.id);
        const list = res.data.data ?? [];
        setStudents(list);

        // Initialise every student's mark entry to empty string
        const init = {};
        list.forEach((s) => {
          init[s.id] = "";
        });
        setMarks(init);

        // Pull each student's marks history so the prefill effect and
        // the "view marks" modal can both use it.
        const marksMap = await fetchMarksMap(list);
        setStudentMarksData(marksMap);
      } catch {
        setToast({ type: "error", message: "Failed to load students." });
      } finally {
        setLoadingClass(false);
      }
    })();
  }, [selectedClass]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [search, selectedClass]);

  // ── Prefill marks + detect existing records ────────
  // Whenever the teacher settles on a Subject + Exam Type, check each
  // student's marks history for a matching record. If found: show the
  // previously saved score and remember its id (so Save edits it).
  // If not found: leave that student's field blank (new record on save).
  useEffect(() => {
    if (!students.length) return;
    if (!subject.trim() || !examType) return;

    const newMarks = {};
    const newIds = {};
    let matchedTotal = null;

    students.forEach((s) => {
      const records = studentMarksData[s.id] ?? [];
      const match = records.find(
        (r) =>
          (r.subject ?? "").trim().toLowerCase() ===
            subject.trim().toLowerCase() && r.examType === examType,
      );
      if (match) {
        newMarks[s.id] =
          match.marksObtained !== null && match.marksObtained !== undefined
            ? String(match.marksObtained)
            : "";
        newIds[s.id] = match.id;
        if (matchedTotal === null && match.totalMarks) {
          matchedTotal = match.totalMarks;
        }
      } else {
        newMarks[s.id] = "";
      }
    });

    setMarks(newMarks);
    setMarkRecordIds(newIds);
    if (matchedTotal !== null && !totalMarks) {
      setTotalMarks(String(matchedTotal));
    }
    // totalMarks intentionally excluded — it's written to inside this
    // effect and including it would create a feedback loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, examType, studentMarksData, students]);

  // ── Derived data ──────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        `${s.firstName ?? ""} ${s.lastName ?? ""}`.toLowerCase().includes(q) ||
        (s.studentRollCode ?? s.studentCode ?? "").toLowerCase().includes(q),
    );
  }, [students, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const showPagination = filtered.length > PAGE_SIZE;

  const filledCount = Object.values(marks).filter(
    (v) => v !== "" && v !== null && v !== undefined,
  ).length;

  const editingCount = Object.keys(markRecordIds).length;

  const stats = useMemo(
    () => calcStats(students, marks, totalMarks),
    [students, marks, totalMarks],
  );

  // ── Mark input ────────────────────────────────────

  function handleMarkChange(studentId, value) {
    const max = totalMarks ? Number(totalMarks) : Infinity;
    const num = Number(value);
    if (value !== "" && (isNaN(num) || num < 0 || num > max)) return;
    setMarks((prev) => ({ ...prev, [studentId]: value }));
  }

  // ── "View marks" modal: jump into edit mode for a record ──
  // Sets the Exam Details fields to match the clicked record so the
  // prefill effect (above) picks it up and the teacher can immediately
  // adjust the score and hit Update Marks.
  function handleEditRecord(record) {
    setSubject(record.subject ?? "");
    setExamType(record.examType ?? "");
    if (record.totalMarks) setTotalMarks(String(record.totalMarks));
    if (record.examDate) setExamDate(String(record.examDate).slice(0, 10));
    setViewingStudent(null);
    // Scroll up so the teacher can see the Exam Details card they'll edit.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Validation ────────────────────────────────────

  function validate() {
    if (!subject.trim()) {
      setToast({
        type: "error",
        message: "Subject is required before saving.",
      });
      return false;
    }
    if (!examType) {
      setToast({ type: "error", message: "Please select an exam type." });
      return false;
    }
    if (!totalMarks || Number(totalMarks) <= 0) {
      setToast({ type: "error", message: "Please enter valid total marks." });
      return false;
    }
    const toSave = students.filter(
      (s) =>
        marks[s.id] !== "" && marks[s.id] !== null && marks[s.id] !== undefined,
    );
    if (!toSave.length) {
      setToast({
        type: "error",
        message: "Enter marks for at least one student.",
      });
      return false;
    }
    return true;
  }

  // ── Save — builds one request per student; edits records ─
  //   that already exist for this subject/exam type, adds the rest ─

  async function handleSave() {
    if (!validate()) return;

    // Build one request payload per student with marks entered.
    // Field names match the backend AddMarksRequest DTO exactly:
    //   studentUserId  → Long   (student's userId, NOT classroom id)
    //   subject        → String
    //   examType       → ExamType enum string
    //   marksObtained  → Double
    //   totalMarks     → Double
    //   examDate       → LocalDate "YYYY-MM-DD"  (optional)
    // `recordId` is our own bookkeeping field (stripped before sending) —
    // when present it means this student already has a saved record for
    // this subject/exam type, so we PUT instead of POST.
    const payload = students
      .filter(
        (s) =>
          marks[s.id] !== "" &&
          marks[s.id] !== null &&
          marks[s.id] !== undefined,
      )
      .map((s) => ({
        recordId: markRecordIds[s.id] ?? null,
        studentUserId: s.userId ?? s.id,
        subject: subject.trim(),
        examType: examType,
        marksObtained: Number(marks[s.id]),
        totalMarks: Number(totalMarks),
        examDate: examDate || null,
      }));

    try {
      setSaving(true);

      // IMPORTANT: both POST /api/teacher/marks (addMarks) and
      // PUT /api/teacher/marks/{id} (updateMarks) accept ONE
      // AddMarksRequest body per call — not an array. So we fire one
      // request per student and wait for all of them. allSettled (not
      // all) so one bad record doesn't hide the outcome of the rest.
      const results = await Promise.allSettled(
        payload.map(({ recordId, ...body }) =>
          recordId
            ? teacherService.updateMarks(recordId, body)
            : teacherService.addMarks(body),
        ),
      );

      const failed = results.filter((r) => r.status === "rejected");

      if (failed.length === 0) {
        setToast({
          type: "success",
          message: `Marks saved for ${payload.length} student(s).`,
        });
        // Re-sync record ids (new records now have ids) and prefilled
        // values so a second Save on the same combo edits, not duplicates.
        const marksMap = await fetchMarksMap(students);
        setStudentMarksData(marksMap);
      } else if (failed.length < payload.length) {
        setToast({
          type: "error",
          message: `Saved ${payload.length - failed.length} of ${payload.length}. ${failed.length} failed — check and retry.`,
        });
        const marksMap = await fetchMarksMap(students);
        setStudentMarksData(marksMap);
      } else {
        const firstErr = failed[0].reason;
        setToast({
          type: "error",
          message: firstErr?.response?.data?.message ?? "Failed to save marks.",
        });
      }
    } catch (err) {
      setToast({
        type: "error",
        message: err?.response?.data?.message ?? "Failed to save marks.",
      });
    } finally {
      setSaving(false);
    }
  }

  // ── Refresh ───────────────────────────────────────

  async function handleRefresh() {
    if (!selectedClass) return;
    try {
      setLoadingClass(true);
      const res = await teacherService.getStudentsIn(selectedClass.id);
      const list = res.data.data ?? [];
      setStudents(list);
      const init = {};
      list.forEach((s) => {
        init[s.id] = "";
      });
      setMarks(init);
      setMarkRecordIds({});

      const marksMap = await fetchMarksMap(list);
      setStudentMarksData(marksMap);
      // If subject/examType are already chosen, the prefill effect will
      // re-run automatically (it depends on studentMarksData) and refill
      // matched students' scores + record ids.
    } catch {
      setToast({ type: "error", message: "Failed to refresh students." });
    } finally {
      setLoadingClass(false);
    }
  }

  // ── Empty / loading screens ───────────────────────

  if (loadingInit) {
    return (
      <TeacherLayout title="Marks">
        <div className="tm-loading-full">
          <Spinner />
          <p>Loading classes…</p>
        </div>
      </TeacherLayout>
    );
  }

  if (classes.length === 0) {
    return (
      <TeacherLayout title="Marks">
        <div className="tm-empty-page">
          <div className="tm-empty-page__icon">
            <ClipboardList size={38} strokeWidth={1.3} />
          </div>
          <p>No classes assigned yet</p>
          <span>You can enter marks once a class is assigned to you.</span>
        </div>
      </TeacherLayout>
    );
  }

  const classLabel = fmtClass(selectedClass);

  // ── History modal body — this student's saved marks records ──
  const historyRecords = viewingStudent
    ? (studentMarksData[viewingStudent.id] ?? []).slice().sort((a, b) => {
        const da = a.examDate ? new Date(a.examDate).getTime() : 0;
        const db = b.examDate ? new Date(b.examDate).getTime() : 0;
        return db - da;
      })
    : [];

  // ── RENDER ────────────────────────────────────────

  return (
    <TeacherLayout title="Marks">
      <div className="tm-page">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* ── Heading ── */}
        <div className="tm-heading-row">
          <div className="tm-heading-text">
            <h1 className="tm-heading">Marks Entry</h1>
            <p className="tm-sub">
              Enter and manage student marks by class and exam
            </p>
          </div>
          <div className="tm-heading-actions">
            <button
              className="tm-refresh-btn"
              onClick={handleRefresh}
              disabled={loadingClass}
              title="Refresh students">
              <RefreshCw size={15} className={loadingClass ? "tm-spin" : ""} />
            </button>
            <button
              className="tm-save-btn"
              onClick={handleSave}
              disabled={saving || loadingClass}>
              {saving ? (
                <Spinner size="small" color="#fff" />
              ) : (
                <>
                  <Save size={15} />{" "}
                  {editingCount > 0 ? "Update Marks" : "Save Marks"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="tm-stats-row">
          <div className="tm-stat-card tm-stat-card--blue">
            <div className="tm-stat-card__icon">
              <Users size={20} />
            </div>
            <div className="tm-stat-card__body">
              <span className="tm-stat-card__value">{students.length}</span>
              <span className="tm-stat-card__label">Total Students</span>
              <span className="tm-stat-card__sub">{classLabel}</span>
            </div>
          </div>

          <div className="tm-stat-card tm-stat-card--amber">
            <div className="tm-stat-card__icon">
              <FileText size={20} />
            </div>
            <div className="tm-stat-card__body">
              <span className="tm-stat-card__value">{filledCount}</span>
              <span className="tm-stat-card__label">Marks Entered</span>
              <span className="tm-stat-card__sub">
                of {students.length} students
              </span>
            </div>
          </div>

          <div className="tm-stat-card tm-stat-card--green">
            <div className="tm-stat-card__icon">
              <BarChart2 size={20} />
            </div>
            <div className="tm-stat-card__body">
              <span className="tm-stat-card__value">
                {stats.avg !== null ? `${stats.avg.toFixed(1)}%` : "—"}
              </span>
              <span className="tm-stat-card__label">Class Average</span>
              <span className="tm-stat-card__sub">
                {stats.scoredCount
                  ? `based on ${stats.scoredCount} entries`
                  : "no entries yet"}
              </span>
            </div>
          </div>

          <div className="tm-stat-card tm-stat-card--purple">
            <div className="tm-stat-card__icon">
              <Award size={20} />
            </div>
            <div className="tm-stat-card__body">
              <span className="tm-stat-card__value">
                {stats.highest !== null ? `${stats.highest.toFixed(0)}%` : "—"}
              </span>
              <span className="tm-stat-card__label">Highest Score</span>
              <span className="tm-stat-card__sub">
                {stats.passRate !== null
                  ? `${stats.passRate.toFixed(0)}% pass rate`
                  : "no entries yet"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Filters card ── */}
        <div className="tm-filters-card">
          <p className="tm-filters-title">Exam Details</p>

          <div className="tm-filters-grid">
            {/* Class */}
            <div className="tm-filter-group">
              <label className="tm-filter-label">
                <GraduationCap size={13} />
                Class
              </label>
              <div className="tm-select-wrap">
                <select
                  className="tm-select"
                  value={selectedClass?.id ?? ""}
                  onChange={(e) => {
                    const cls = classes.find(
                      (c) => String(c.id) === e.target.value,
                    );
                    setSelectedClass(cls ?? null);
                  }}>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {fmtClass(cls)}
                    </option>
                  ))}
                </select>
                <ChevronRight size={13} className="tm-select-chevron" />
              </div>
            </div>

            {/* Subject — maps to AddMarksRequest.subject */}
            <div className="tm-filter-group">
              <label className="tm-filter-label">
                <BookOpen size={13} />
                Subject <span className="tm-req">*</span>
              </label>
              <input
                type="text"
                className={`tm-input${!subject.trim() && filledCount > 0 ? " tm-input--error" : ""}`}
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Exam Type — maps to AddMarksRequest.examType */}
            <div className="tm-filter-group">
              <label className="tm-filter-label">
                <ClipboardList size={13} />
                Exam Type <span className="tm-req">*</span>
              </label>
              <div className="tm-select-wrap">
                <select
                  className={`tm-select${!examType && filledCount > 0 ? " tm-select--error" : ""}`}
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}>
                  {EXAM_TYPES.map((t) => (
                    <option
                      key={t.value}
                      value={t.value}
                      disabled={t.value === ""}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronRight size={13} className="tm-select-chevron" />
              </div>
            </div>

            {/* Total Marks — maps to AddMarksRequest.totalMarks */}
            <div className="tm-filter-group">
              <label className="tm-filter-label">
                <Award size={13} />
                Total Marks <span className="tm-req">*</span>
              </label>
              <input
                type="number"
                className={`tm-input${!totalMarks && filledCount > 0 ? " tm-input--error" : ""}`}
                placeholder="e.g. 100"
                min="1"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
              />
            </div>

            {/* Exam Date — maps to AddMarksRequest.examDate (LocalDate) */}
            <div className="tm-filter-group">
              <label className="tm-filter-label">
                <CalendarDays size={13} />
                Exam Date
                <span className="tm-opt">(optional)</span>
              </label>
              <input
                type="date"
                className="tm-input tm-input--date"
                value={examDate}
                max={today()}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
          </div>

          {/* Required fields notice */}
          {filledCount > 0 && (!subject.trim() || !examType || !totalMarks) && (
            <div className="tm-filters-warn">
              <AlertCircle size={14} strokeWidth={2} />
              <span>
                Fill in all required fields (<span className="tm-req">*</span>)
                before saving.
              </span>
            </div>
          )}

          {/* Editing-existing-record notice */}
          {editingCount > 0 && (
            <div className="tm-filters-warn tm-filters-warn--danger">
              <AlertCircle size={14} strokeWidth={2} />
              <span>
                {editingCount} student(s) already have marks for this subject
                &amp; exam type — saving will update their existing record
                instead of creating a new one.
              </span>
            </div>
          )}
        </div>

        {/* ── Students table card ── */}
        <div className="tm-table-card">
          {/* Toolbar */}
          <div className="tm-table-toolbar">
            <div className="tm-search-wrap">
              <Search size={14} className="tm-search-icon" />
              <input
                type="text"
                className="tm-search"
                placeholder="Search by name or roll no…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="tm-search-clear"
                  onClick={() => setSearch("")}>
                  <X size={13} />
                </button>
              )}
            </div>

            {filledCount > 0 && (
              <div className="tm-progress-pill">
                <CheckCircle2 size={13} />
                {filledCount} / {students.length} filled
              </div>
            )}
          </div>

          {/* Class + exam context strip */}
          {selectedClass && (
            <div className="tm-context-strip">
              <GraduationCap size={14} className="tm-context-icon" />
              <span className="tm-context-class">{classLabel}</span>

              {examType && (
                <span className="tm-context-badge tm-context-badge--blue">
                  {fmtExamType(examType)}
                </span>
              )}
              {subject && (
                <span className="tm-context-badge tm-context-badge--green">
                  {subject}
                </span>
              )}
              {totalMarks && (
                <span className="tm-context-badge tm-context-badge--purple">
                  / {totalMarks} Marks
                </span>
              )}
              {examDate && (
                <span className="tm-context-badge tm-context-badge--amber">
                  {new Date(examDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          )}

          {/* Content */}
          {loadingClass ? (
            <div className="tm-loading-inline">
              <Spinner />
              <p>Loading students…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="tm-empty">
              <div className="tm-empty__icon">
                <Users size={32} strokeWidth={1.3} />
              </div>
              <p>
                {search
                  ? "No students match your search"
                  : "No students in this class"}
              </p>
              {search && (
                <button
                  className="tm-clear-search"
                  onClick={() => setSearch("")}>
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              {/* ── Desktop table ── */}
              <div className="tm-table-wrap">
                <table className="tm-table">
                  <thead>
                    <tr>
                      <th className="tm-th tm-th--no">#</th>
                      <th className="tm-th tm-th--name">Student</th>
                      <th className="tm-th tm-th--roll">Roll No.</th>
                      <th className="tm-th tm-th--marks">
                        Marks Obtained
                        {totalMarks && (
                          <span className="tm-th-sub"> / {totalMarks}</span>
                        )}
                      </th>
                      <th className="tm-th tm-th--pct">Score %</th>
                      <th className="tm-th tm-th--grade">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((student, idx) => {
                      const val = marks[student.id];
                      const total = totalMarks ? Number(totalMarks) : null;
                      const pct =
                        val !== "" && val !== undefined && total
                          ? (Number(val) / total) * 100
                          : null;
                      const grade = getGrade(pct);
                      const rowNo = (page - 1) * PAGE_SIZE + idx + 1;
                      const isExisting = !!markRecordIds[student.id];
                      const historyCount = (studentMarksData[student.id] ?? [])
                        .length;

                      return (
                        <tr key={student.id} className="tm-row">
                          <td className="tm-td tm-td--no">{rowNo}</td>

                          <td className="tm-td tm-td--name">
                            <button
                              type="button"
                              className="tm-student-cell tm-student-cell--btn"
                              onClick={() => setViewingStudent(student)}
                              title={`View marks history for ${student.firstName} ${student.lastName}`}>
                              <div className="tm-avatar">
                                {(student.firstName?.[0] ?? "S").toUpperCase()}
                              </div>
                              <div className="tm-student-info">
                                <span className="tm-student-name">
                                  {student.firstName} {student.lastName}
                                  <Eye size={12} className="tm-view-icon" />
                                </span>
                                <span className="tm-student-meta">
                                  {historyCount > 0
                                    ? `${historyCount} record(s) saved`
                                    : classLabel}
                                </span>
                              </div>
                            </button>
                          </td>

                          <td className="tm-td tm-td--roll">
                            <span className="tm-roll-pill">
                              {student.studentRollCode ??
                                student.studentCode ??
                                "—"}
                            </span>
                          </td>

                          <td className="tm-td tm-td--marks">
                            <input
                              type="number"
                              className="tm-mark-input"
                              placeholder="—"
                              min="0"
                              max={totalMarks || undefined}
                              value={val ?? ""}
                              title={
                                isExisting
                                  ? "Existing record — saving will update it"
                                  : undefined
                              }
                              onChange={(e) =>
                                handleMarkChange(student.id, e.target.value)
                              }
                            />
                          </td>

                          <td className="tm-td tm-td--pct">
                            {pct !== null ? (
                              <div className="tm-pct-wrap">
                                <span className="tm-pct-text">
                                  {pct.toFixed(1)}%
                                </span>
                                <div className="tm-pct-bar-track">
                                  <div
                                    className="tm-pct-bar-fill"
                                    style={{
                                      width: `${Math.min(pct, 100)}%`,
                                      background:
                                        pct >= 75
                                          ? "#22C55E"
                                          : pct >= 45
                                            ? "#F59E0B"
                                            : "#EF4444",
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="tm-na">—</span>
                            )}
                          </td>

                          <td className="tm-td tm-td--grade">
                            <span className={`tm-grade ${grade.cls}`}>
                              {grade.letter}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="tm-mobile-cards">
                {paginated.map((student, idx) => {
                  const val = marks[student.id];
                  const total = totalMarks ? Number(totalMarks) : null;
                  const pct =
                    val !== "" && val !== undefined && total
                      ? (Number(val) / total) * 100
                      : null;
                  const grade = getGrade(pct);
                  const rowNo = (page - 1) * PAGE_SIZE + idx + 1;
                  const isExisting = !!markRecordIds[student.id];
                  const historyCount = (studentMarksData[student.id] ?? [])
                    .length;

                  return (
                    <div key={student.id} className="tm-mobile-card">
                      {/* Header */}
                      <div className="tm-mobile-card-header">
                        <button
                          type="button"
                          className="tm-mobile-card-left tm-mobile-card-left--btn"
                          onClick={() => setViewingStudent(student)}>
                          <div className="tm-avatar tm-avatar--lg">
                            {(student.firstName?.[0] ?? "S").toUpperCase()}
                          </div>
                          <div className="tm-mobile-card-meta">
                            <p className="tm-student-name">
                              {rowNo}.&nbsp;{student.firstName}{" "}
                              {student.lastName}
                              <Eye size={12} className="tm-view-icon" />
                            </p>
                            <p className="tm-student-meta">
                              {historyCount > 0
                                ? `${historyCount} record(s) saved`
                                : (student.studentRollCode ??
                                    student.studentCode)
                                  ? `Roll: ${student.studentRollCode ?? student.studentCode}`
                                  : classLabel}
                            </p>
                          </div>
                        </button>
                        <span className={`tm-grade ${grade.cls}`}>
                          {grade.letter}
                        </span>
                      </div>

                      {/* Mark entry */}
                      <div className="tm-mobile-card-body">
                        <div className="tm-mobile-mark-row">
                          <label className="tm-mobile-mark-label">
                            Marks Obtained
                            {isExisting ? " (editing)" : ""}
                          </label>
                          <div className="tm-mobile-mark-input-wrap">
                            <input
                              type="number"
                              className="tm-mark-input tm-mark-input--mobile"
                              placeholder="Enter marks"
                              min="0"
                              max={totalMarks || undefined}
                              value={val ?? ""}
                              onChange={(e) =>
                                handleMarkChange(student.id, e.target.value)
                              }
                            />
                            {totalMarks && (
                              <span className="tm-mobile-out-of">
                                / {totalMarks}
                              </span>
                            )}
                          </div>
                        </div>

                        {pct !== null && (
                          <div className="tm-mobile-pct-row">
                            <span className="tm-mobile-pct-label">Score</span>
                            <div className="tm-mobile-pct-right">
                              <span className="tm-pct-text">
                                {pct.toFixed(1)}%
                              </span>
                              <div className="tm-pct-bar-track tm-pct-bar-track--wide">
                                <div
                                  className="tm-pct-bar-fill"
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    background:
                                      pct >= 75
                                        ? "#22C55E"
                                        : pct >= 45
                                          ? "#F59E0B"
                                          : "#EF4444",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Pagination — "X–Y of Z" left, ‹ [1] [2] › right ── */}
              {showPagination && (
                <div className="tm-table-footer">
                  <span className="tm-page-info">
                    {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length}
                  </span>

                  <div className="tm-page-btns">
                    <button
                      className="tm-page-btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}>
                      <ChevronLeft size={16} strokeWidth={2.5} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          className={`tm-page-btn tm-page-btn--num${
                            page === p ? " tm-page-btn--active" : ""
                          }`}
                          onClick={() => setPage(p)}>
                          {p}
                        </button>
                      ),
                    )}

                    <button
                      className="tm-page-btn"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}>
                      <ChevronRight size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Student marks history modal ──
          Opens when a student's name/avatar is clicked. Lists every
          saved marks record for that student across all subjects and
          exam types, each with an Edit button that jumps the Exam
          Details form into edit-mode for that specific record. */}
      {viewingStudent && (
        <Modal
          title={`${viewingStudent.firstName} ${viewingStudent.lastName} — Marks History`}
          onClose={() => setViewingStudent(null)}
          size="medium">
          {historyRecords.length === 0 ? (
            <div className="tm-history-empty">
              <ClipboardList size={28} strokeWidth={1.3} />
              <p>No marks recorded yet for this student.</p>
            </div>
          ) : (
            <div className="tm-history-list">
              {historyRecords.map((r) => {
                const pct =
                  r.marksObtained !== null &&
                  r.marksObtained !== undefined &&
                  r.totalMarks
                    ? (r.marksObtained / r.totalMarks) * 100
                    : null;
                const grade = getGrade(pct);
                return (
                  <div key={r.id} className="tm-history-item">
                    <div className="tm-history-item__top">
                      <span className="tm-history-subject">{r.subject}</span>
                      <span className="tm-history-examtype">
                        {fmtExamType(r.examType)}
                      </span>
                    </div>

                    <div className="tm-history-item__mid">
                      <span className="tm-history-score">
                        {r.marksObtained} / {r.totalMarks}
                        {pct !== null && (
                          <span className="tm-history-pct">
                            {" "}
                            ({pct.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                      <span className={`tm-grade ${grade.cls}`}>
                        {grade.letter}
                      </span>
                    </div>

                    <div className="tm-history-item__bottom">
                      <span className="tm-history-date">
                        <CalendarDays size={12} />
                        {fmtDate(r.examDate)}
                      </span>
                      <button
                        type="button"
                        className="tm-history-edit-btn"
                        onClick={() => handleEditRecord(r)}>
                        <Pencil size={12} />
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </TeacherLayout>
  );
}
