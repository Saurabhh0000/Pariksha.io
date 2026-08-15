import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GraduationCap,
  CheckCircle2,
  BookOpen,
  MapPin,
  LayoutGrid,
  List,
  User,
  AlertTriangle,
  ShieldCheck,
  BookMarked,
  Eye,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import teacherService from "../../services/teacherService";
import "./TeacherTimetable.css";

// ── Constants ─────────────────────────────────────────
const DAYS_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const _jsDay = new Date().getDay();
const TODAY_NAME = _jsDay === 0 ? "SUNDAY" : DAYS_ORDER[_jsDay - 1];

const SORT_OPTIONS = [
  { value: "day_asc", label: "Day (Week order)" },
  { value: "time_asc", label: "Time ↑" },
  { value: "time_desc", label: "Time ↓" },
  { value: "subject_asc", label: "Subject A → Z" },
  { value: "class_asc", label: "Class A → Z" },
];

const PAGE_SIZES = [6, 10, 20, 50];
const PAGE_THRESH = 6; // show pagination only when rows exceed this

const BLANK_FORM = {
  classRoomId: "",
  day: "MONDAY",
  subject: "",
  timeSlotStart: "",
  timeSlotEnd: "",
  roomNumber: "",
};

// ── Helpers ───────────────────────────────────────────
function fmtTime(t) {
  if (!t) return "—";
  return String(t).slice(0, 5);
}
function toInputTime(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function sortEntries(list, key) {
  const s = [...list];
  const dayIdx = (d) => DAYS_ORDER.indexOf(d ?? "");
  switch (key) {
    case "day_asc":
      return s.sort(
        (a, b) =>
          dayIdx(a.day) - dayIdx(b.day) ||
          (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? ""),
      );
    case "time_asc":
      return s.sort((a, b) =>
        (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? ""),
      );
    case "time_desc":
      return s.sort((a, b) =>
        (b.timeSlotStart ?? "").localeCompare(a.timeSlotStart ?? ""),
      );
    case "subject_asc":
      return s.sort((a, b) => (a.subject ?? "").localeCompare(b.subject ?? ""));
    case "class_asc":
      return s.sort((a, b) =>
        (a.className ?? "").localeCompare(b.className ?? ""),
      );
    default:
      return s;
  }
}

function classLabel(cls) {
  return `${cls.className}${cls.section ? ` · ${cls.section}` : ""}`;
}

// ── Small reusables ────────────────────────────────────
function FormGroup({ label, required, children }) {
  return (
    <div className="tt-form-group">
      <label className="tt-form-label">
        {label}
        {required && <span className="tt-form-req">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Timetable entry form ───────────────────────────────
function TimetableForm({
  form,
  setForm,
  classes,
  saving,
  onSave,
  onCancel,
  saveLabel,
  isEdit,
}) {
  const f = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="tt-form">
      {!isEdit ? (
        <FormGroup label="Class" required>
          <select
            className="tt-input tt-select"
            value={form.classRoomId}
            onChange={f("classRoomId")}>
            <option value="">— Select class —</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Class {classLabel(cls)}
              </option>
            ))}
          </select>
        </FormGroup>
      ) : (
        <div className="tt-form-class-readonly">
          <GraduationCap size={14} strokeWidth={2} />
          {(() => {
            const cls = classes.find(
              (c) => String(c.id) === String(form.classRoomId),
            );
            return cls ? `Class ${classLabel(cls)}` : "Class";
          })()}
        </div>
      )}

      <div className="tt-form-row">
        <FormGroup label="Day" required>
          <select
            className="tt-input tt-select"
            value={form.day}
            onChange={f("day")}>
            {DAYS_ORDER.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </FormGroup>
        <FormGroup label="Subject" required>
          <input
            type="text"
            className="tt-input"
            value={form.subject}
            onChange={f("subject")}
            placeholder="e.g. Mathematics"
          />
        </FormGroup>
      </div>

      <div className="tt-form-row">
        <FormGroup label="Start Time" required>
          <input
            type="time"
            className="tt-input"
            value={form.timeSlotStart}
            onChange={f("timeSlotStart")}
          />
        </FormGroup>
        <FormGroup label="End Time" required>
          <input
            type="time"
            className="tt-input"
            value={form.timeSlotEnd}
            onChange={f("timeSlotEnd")}
          />
        </FormGroup>
      </div>

      <FormGroup label="Room Number">
        <input
          type="text"
          className="tt-input"
          value={form.roomNumber}
          onChange={f("roomNumber")}
          placeholder="e.g. Room 12A (optional)"
        />
      </FormGroup>

      <div className="tt-form-note">
        <CheckCircle2 size={13} strokeWidth={2} />
        The subject teacher will be automatically assigned based on subject
        allocation for this class.
      </div>

      <div className="tt-form-actions">
        <button className="tt-cancel-btn" onClick={onCancel} disabled={saving}>
          <XCircle size={14} /> Cancel
        </button>
        <button className="tt-save-btn" onClick={onSave} disabled={saving}>
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

// ── Sort dropdown ──────────────────────────────────────
function SortDropdown({ sortKey, setSortKey, show, setShow }) {
  return (
    <div className="tt-sort-wrap">
      <button className="tt-sort-btn" onClick={() => setShow((p) => !p)}>
        <ArrowUpDown size={14} />
        {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort"}
        {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {show && (
        <div className="tt-sort-dropdown">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`tt-sort-option${sortKey === o.value ? " tt-sort-option--active" : ""}`}
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

// ── Pagination (only when > PAGE_THRESH) ──────────────
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
    <div className="tt-pagination">
      <div className="tt-page-size">
        <span>Per page</span>
        <select
          className="tt-page-size-select"
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
      <div className="tt-page-controls">
        <button
          className="tt-page-btn"
          onClick={() => setPage(1)}
          disabled={page === 1}>
          «
        </button>
        <button
          className="tt-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}>
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="tt-page-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`tt-page-btn tt-page-btn--num${page === p ? " tt-page-btn--active" : ""}`}
              onClick={() => setPage(p)}>
              {p}
            </button>
          ),
        )}
        <button
          className="tt-page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}>
          <ChevronRight size={14} />
        </button>
        <button
          className="tt-page-btn"
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}>
          »
        </button>
      </div>
      <span className="tt-page-info">
        Page {page} of {totalPages}
      </span>
    </div>
  );
}

// ── Week grid view ─────────────────────────────────────
function WeekGridView({
  timetable,
  onEdit,
  onDeleteRequest,
  deletingId,
  canEdit,
}) {
  const byDay = DAYS_ORDER.reduce((acc, d) => {
    acc[d] = timetable
      .filter((t) => t.day === d)
      .sort((a, b) =>
        (a.timeSlotStart ?? "").localeCompare(b.timeSlotStart ?? ""),
      );
    return acc;
  }, {});

  const activeDays = DAYS_ORDER.filter((d) => byDay[d].length > 0);
  if (activeDays.length === 0) return null;

  return (
    <div className="tt-week-grid">
      {activeDays.map((day) => (
        <div
          key={day}
          className={`tt-week-col${day === TODAY_NAME ? " tt-week-col--today" : ""}`}>
          <div className="tt-week-col__header">
            <span className="tt-week-col__day">{DAY_LABELS[day]}</span>
            {day === TODAY_NAME && (
              <span className="tt-week-today-badge">Today</span>
            )}
            <span className="tt-week-col__count">{byDay[day].length}</span>
          </div>

          <div className="tt-week-col__slots">
            {byDay[day].map((entry) => (
              <div key={entry.id} className="tt-week-slot">
                <div className="tt-week-slot__time">
                  <Clock size={10} />
                  {fmtTime(entry.timeSlotStart)} – {fmtTime(entry.timeSlotEnd)}
                </div>
                <span className="tt-week-slot__subject">{entry.subject}</span>
                <span className="tt-week-slot__class">
                  Class {entry.className}
                  {entry.section ? ` · Sec ${entry.section}` : ""}
                </span>
                {entry.teacherName && (
                  <span className="tt-week-slot__teacher">
                    <User size={10} />
                    {entry.teacherName}
                  </span>
                )}
                {entry.roomNumber && (
                  <span className="tt-week-slot__room">
                    <MapPin size={10} />
                    {entry.roomNumber}
                  </span>
                )}

                {/* Action buttons only for mentor teacher */}
                {canEdit ? (
                  <div className="tt-week-slot__actions">
                    <button
                      className="tt-slot-edit"
                      onClick={() => onEdit(entry)}
                      title="Edit">
                      <Edit2 size={11} />
                    </button>
                    <button
                      className="tt-slot-delete"
                      onClick={() => onDeleteRequest(entry)}
                      disabled={deletingId === entry.id}
                      title="Delete">
                      {deletingId === entry.id ? (
                        <Spinner size="small" color="#991B1B" />
                      ) : (
                        <Trash2 size={11} />
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="tt-week-slot__readonly-tag">
                    <Eye size={10} /> View Only
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Delete confirm modal ───────────────────────────────
function DeleteConfirmModal({ entry, onConfirm, onCancel, deleting }) {
  return (
    <Modal title="Delete Entry" onClose={onCancel} size="small">
      <div className="tt-delete-modal">
        <div className="tt-delete-modal__icon">
          <AlertTriangle size={28} strokeWidth={1.5} />
        </div>
        <p className="tt-delete-modal__title">Delete this timetable entry?</p>
        <p className="tt-delete-modal__sub">
          <strong>{entry.subject}</strong> on{" "}
          {entry.day.charAt(0) + entry.day.slice(1).toLowerCase()},{" "}
          {fmtTime(entry.timeSlotStart)} – {fmtTime(entry.timeSlotEnd)}. This
          action cannot be undone.
        </p>
        <div className="tt-delete-modal__actions">
          <button
            className="tt-cancel-btn"
            onClick={onCancel}
            disabled={deleting}>
            Cancel
          </button>
          <button
            className="tt-delete-confirm-btn"
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

// ─────────────────────────────────────────────────────
export default function TeacherTimetable() {
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [ttLoading, setTtLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [viewMode, setViewMode] = useState("week");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [editForm, setEditForm] = useState(BLANK_FORM);

  const [filterDay, setFilterDay] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("day_asc");
  const [showSort, setShowSort] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [toast, setToast] = useState(null);

  // ── Boot: profile + classes ───────────────────────
  useEffect(() => {
    (async () => {
      try {
        setPageLoading(true);
        const [profileRes, classRes] = await Promise.all([
          teacherService.getProfile(),
          teacherService.getClasses(),
        ]);
        const profileData = profileRes.data.data ?? null;
        const list = classRes.data.data ?? [];
        setProfile(profileData);
        setClasses(list);
        if (list.length > 0) setSelectedClassId(list[0].id);
      } catch {
        setToast({ message: "Failed to load classes.", type: "error" });
      } finally {
        setPageLoading(false);
      }
    })();
  }, []);

  // ── Fetch timetable when class changes ────────────
  const fetchTimetable = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      setTtLoading(true);
      const res = await teacherService.getClassTimetable(selectedClassId);
      setTimetable(res.data.data ?? []);
    } catch {
      setToast({ message: "Failed to load timetable.", type: "error" });
      setTimetable([]);
    } finally {
      setTtLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);
  useEffect(() => {
    setPage(1);
  }, [search, filterDay, sortKey, selectedClassId]);

  // ── Derived role values ───────────────────────────
  const isMentor = profile?.isMentor === true;
  const selectedClass = classes.find(
    (c) => String(c.id) === String(selectedClassId),
  );
  const isMyMentorClass =
    isMentor && selectedClass?.mentorTeacherId === profile?.userId;
  // canEdit = only mentor of this specific class can create/edit/delete
  const canEdit = isMyMentorClass;

  // ── Add ───────────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.classRoomId) {
      setToast({ message: "Please select a class.", type: "error" });
      return;
    }
    if (!addForm.subject.trim()) {
      setToast({ message: "Subject is required.", type: "error" });
      return;
    }
    if (!addForm.timeSlotStart || !addForm.timeSlotEnd) {
      setToast({ message: "Start and end times are required.", type: "error" });
      return;
    }
    if (addForm.timeSlotStart >= addForm.timeSlotEnd) {
      setToast({
        message: "End time must be after start time.",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);
      await teacherService.createTimetable({
        classRoomId: Number(addForm.classRoomId),
        day: addForm.day,
        subject: addForm.subject.trim(),
        timeSlotStart: addForm.timeSlotStart,
        timeSlotEnd: addForm.timeSlotEnd,
        roomNumber: addForm.roomNumber.trim() || null,
      });
      setToast({
        message: "Timetable entry added successfully.",
        type: "success",
      });
      setShowAddModal(false);
      setAddForm(BLANK_FORM);
      fetchTimetable();
    } catch (err) {
      setToast({
        message: err?.response?.data?.message ?? "Failed to add entry.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Update ────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editForm.subject.trim()) {
      setToast({ message: "Subject is required.", type: "error" });
      return;
    }
    if (!editForm.timeSlotStart || !editForm.timeSlotEnd) {
      setToast({ message: "Start and end times are required.", type: "error" });
      return;
    }
    if (editForm.timeSlotStart >= editForm.timeSlotEnd) {
      setToast({
        message: "End time must be after start time.",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);
      await teacherService.updateTimetable(editEntry.id, {
        classRoomId: Number(editForm.classRoomId),
        day: editForm.day,
        subject: editForm.subject.trim(),
        timeSlotStart: editForm.timeSlotStart,
        timeSlotEnd: editForm.timeSlotEnd,
        roomNumber: editForm.roomNumber.trim() || null,
      });
      setToast({ message: "Entry updated successfully.", type: "success" });
      setShowEditModal(false);
      setEditEntry(null);
      fetchTimetable();
    } catch (err) {
      setToast({
        message: err?.response?.data?.message ?? "Failed to update entry.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeletingId(deleteTarget.id);
      await teacherService.deleteTimetable(deleteTarget.id);
      setToast({ message: "Entry deleted successfully.", type: "success" });
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setTimetable((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    } catch (err) {
      setToast({
        message: err?.response?.data?.message ?? "Failed to delete entry.",
        type: "error",
      });
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  const openEditModal = (entry) => {
    setEditEntry(entry);
    setEditForm({
      classRoomId: entry.classRoomId ?? "",
      day: entry.day ?? "MONDAY",
      subject: entry.subject ?? "",
      timeSlotStart: toInputTime(entry.timeSlotStart),
      timeSlotEnd: toInputTime(entry.timeSlotEnd),
      roomNumber: entry.roomNumber ?? "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (entry) => {
    setDeleteTarget(entry);
    setShowDeleteModal(true);
  };
  const openAddModal = () => {
    setAddForm({ ...BLANK_FORM, classRoomId: selectedClassId ?? "" });
    setShowAddModal(true);
  };

  // ── Derived data ──────────────────────────────────
  const filtered = timetable.filter((t) => {
    const q = search.toLowerCase().trim();
    const ms =
      q === "" ||
      (t.subject ?? "").toLowerCase().includes(q) ||
      (t.className ?? "").toLowerCase().includes(q) ||
      (t.roomNumber ?? "").toLowerCase().includes(q) ||
      (t.teacherName ?? "").toLowerCase().includes(q);
    const md = filterDay === "ALL" || t.day === filterDay;
    return ms && md;
  });

  const sorted = sortEntries(filtered, sortKey);
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const todayCount = timetable.filter((t) => t.day === TODAY_NAME).length;
  const subjects = [
    ...new Set(timetable.map((t) => t.subject).filter(Boolean)),
  ];
  const daysActive = [...new Set(timetable.map((t) => t.day).filter(Boolean))]
    .length;

  if (pageLoading) {
    return (
      <TeacherLayout title="Timetable">
        <div className="tt-loading">
          <Spinner />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="Timetable">
      <div className="tt-page">
        {/* ── Heading ── */}
        <div className="tt-heading-row">
          <div>
            <h1 className="tt-heading">Class Timetable</h1>
            <p className="tt-sub">
              {classes.length === 0
                ? "No classes assigned yet"
                : canEdit
                  ? `Managing schedule for Class ${selectedClass ? classLabel(selectedClass) : ""}`
                  : isMentor
                    ? "Viewing schedule — select your mentor class to make changes"
                    : "Viewing weekly schedule for your classes"}
            </p>
          </div>
          <div className="tt-heading-actions">
            <button
              className="tt-refresh-btn"
              onClick={fetchTimetable}
              disabled={ttLoading}
              title="Refresh">
              <RefreshCw size={15} className={ttLoading ? "tt-spin" : ""} />
            </button>
            {/* Add button only for mentor of THIS class */}
            {canEdit && (
              <button className="tt-add-btn" onClick={openAddModal}>
                <Plus size={15} /> Add Entry
              </button>
            )}
          </div>
        </div>

        {/* ── No classes empty state ── */}
        {classes.length === 0 && (
          <div className="tt-empty-page">
            <div className="tt-empty-page__icon">
              <CalendarDays size={36} strokeWidth={1.3} />
            </div>
            <p className="tt-empty-page__title">No classes assigned</p>
            <span className="tt-empty-page__desc">
              You need to be assigned to a class before you can view or manage
              its timetable. Contact your admin to get assigned.
            </span>
          </div>
        )}

        {classes.length > 0 && (
          <>
            {/* ── Class tabs ── */}
            {classes.length > 0 && (
              <div className="tt-class-tabs">
                {classes.map((cls) => {
                  const isThisMentor =
                    isMentor && cls.mentorTeacherId === profile?.userId;
                  return (
                    <button
                      key={cls.id}
                      className={`tt-class-tab${String(selectedClassId) === String(cls.id) ? " tt-class-tab--active" : ""}`}
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setSearch("");
                        setFilterDay("ALL");
                      }}>
                      <GraduationCap size={13} />
                      Class {classLabel(cls)}
                      <span
                        className={`tt-tab-role-chip tt-tab-role-chip--${isThisMentor ? "mentor" : "subject"}`}>
                        {isThisMentor ? "Mentor" : "Subject"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Role access banner ── */}
            {canEdit ? (
              <div className="tt-role-banner tt-role-banner--mentor">
                <div className="tt-role-banner__icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="tt-role-banner__text">
                  <span className="tt-role-banner__title">
                    Mentor Teacher — Full Timetable Access
                  </span>
                  <span className="tt-role-banner__desc">
                    You can create, edit, and delete timetable entries for Class{" "}
                    {selectedClass ? classLabel(selectedClass) : ""}. Subject
                    teachers are automatically assigned based on subject
                    allocations.
                  </span>
                </div>
                <button className="tt-role-banner__btn" onClick={openAddModal}>
                  <Plus size={14} /> Add Entry
                </button>
              </div>
            ) : (
              <div className="tt-role-banner tt-role-banner--subject">
                <div className="tt-role-banner__icon">
                  <BookMarked size={18} />
                </div>
                <div className="tt-role-banner__text">
                  <span className="tt-role-banner__title">
                    {isMentor
                      ? "Not Your Mentor Class — View Only"
                      : "Subject Teacher — View Only"}
                  </span>
                  <span className="tt-role-banner__desc">
                    {isMentor
                      ? `Only your mentor class allows timetable editing. This class is managed by ${selectedClass?.mentorTeacherName ?? "another teacher"}.`
                      : `The timetable for this class is managed by ${selectedClass?.mentorTeacherName ?? "the Mentor Teacher"}. You can view the schedule here.`}
                  </span>
                </div>
                <div className="tt-role-banner__view-tag">
                  <Eye size={13} /> View Only
                </div>
              </div>
            )}

            {/* ── KPI Stats cards ── */}
            <div className="tt-kpi-grid">
              <div className="tt-kpi-card tt-kpi-card--blue">
                <div className="tt-kpi-icon">
                  <CalendarDays size={20} />
                </div>
                <div className="tt-kpi-body">
                  <span className="tt-kpi-value">{timetable.length}</span>
                  <span className="tt-kpi-label">Total Entries</span>
                  <span className="tt-kpi-sub">This class schedule</span>
                </div>
              </div>
              <div className="tt-kpi-card tt-kpi-card--green">
                <div className="tt-kpi-icon">
                  <Clock size={20} />
                </div>
                <div className="tt-kpi-body">
                  <span className="tt-kpi-value">{todayCount}</span>
                  <span className="tt-kpi-label">Today's Classes</span>
                  <span className="tt-kpi-sub">
                    {todayCount === 0 ? "No classes today" : "Scheduled today"}
                  </span>
                </div>
              </div>
              <div className="tt-kpi-card tt-kpi-card--indigo">
                <div className="tt-kpi-icon">
                  <BookOpen size={20} />
                </div>
                <div className="tt-kpi-body">
                  <span className="tt-kpi-value">{subjects.length}</span>
                  <span className="tt-kpi-label">Subjects</span>
                  <span className="tt-kpi-sub">In this timetable</span>
                </div>
              </div>
              <div className="tt-kpi-card tt-kpi-card--cyan">
                <div className="tt-kpi-icon">
                  <CalendarDays size={20} />
                </div>
                <div className="tt-kpi-body">
                  <span className="tt-kpi-value">{daysActive}</span>
                  <span className="tt-kpi-label">Active Days</span>
                  <span className="tt-kpi-sub">Days with classes</span>
                </div>
              </div>
            </div>

            {/* ── No entries empty state ── */}
            {timetable.length === 0 && !ttLoading && (
              <div className="tt-empty-page">
                <div className="tt-empty-page__icon">
                  <CalendarDays size={36} strokeWidth={1.3} />
                </div>
                <p className="tt-empty-page__title">No timetable entries yet</p>
                <span className="tt-empty-page__desc">
                  {canEdit
                    ? `No schedule has been created for Class ${selectedClass ? classLabel(selectedClass) : ""} yet. Add the first entry to get started.`
                    : `No timetable has been set up for this class yet. The Mentor Teacher ${selectedClass?.mentorTeacherName ? `(${selectedClass.mentorTeacherName})` : ""} will manage this.`}
                </span>
                {canEdit && (
                  <button className="tt-empty-action" onClick={openAddModal}>
                    <Plus size={13} /> Add First Entry
                  </button>
                )}
              </div>
            )}

            {timetable.length > 0 && (
              <>
                {/* ── View toggle ── */}
                <div className="tt-view-toggle">
                  <button
                    className={`tt-view-btn${viewMode === "week" ? " tt-view-btn--active" : ""}`}
                    onClick={() => setViewMode("week")}>
                    <LayoutGrid size={14} /> Week View
                  </button>
                  <button
                    className={`tt-view-btn${viewMode === "list" ? " tt-view-btn--active" : ""}`}
                    onClick={() => setViewMode("list")}>
                    <List size={14} /> List View
                  </button>
                </div>

                {/* ═══ WEEK VIEW ═══ */}
                {viewMode === "week" &&
                  (ttLoading ? (
                    <div className="tt-loading-inline">
                      <Spinner />
                    </div>
                  ) : (
                    <WeekGridView
                      timetable={timetable}
                      onEdit={openEditModal}
                      onDeleteRequest={openDeleteModal}
                      deletingId={deletingId}
                      canEdit={canEdit}
                    />
                  ))}

                {/* ═══ LIST VIEW ═══ */}
                {viewMode === "list" && (
                  <>
                    <div className="tt-toolbar">
                      <div className="tt-search-wrap">
                        <Search size={14} className="tt-search-icon" />
                        <input
                          type="text"
                          className="tt-search"
                          placeholder="Search subject, teacher, class, room…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                          <button
                            className="tt-search-clear"
                            onClick={() => setSearch("")}>
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      <div className="tt-filter-group">
                        <button
                          className={`tt-filter-btn${filterDay === "ALL" ? " tt-filter-btn--active" : ""}`}
                          onClick={() => setFilterDay("ALL")}>
                          All
                        </button>
                        {DAYS_ORDER.map((d) => (
                          <button
                            key={d}
                            className={`tt-filter-btn${filterDay === d ? " tt-filter-btn--active" : ""}${d === TODAY_NAME ? " tt-filter-btn--today" : ""}`}
                            onClick={() => setFilterDay(d)}>
                            {DAY_LABELS[d]}
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

                    <div className="tt-results-info">
                      Showing{" "}
                      {paginated.length > 0 ? (page - 1) * pageSize + 1 : 0}–
                      {Math.min(page * pageSize, totalRows)} of {totalRows} entr
                      {totalRows !== 1 ? "ies" : "y"}
                      {search && ` matching "${search}"`}
                    </div>

                    {ttLoading ? (
                      <div className="tt-loading-inline">
                        <Spinner />
                      </div>
                    ) : paginated.length === 0 ? (
                      <div className="tt-empty">
                        <div className="tt-empty__icon">
                          <Search size={28} strokeWidth={1.3} />
                        </div>
                        <p>No entries match your filter</p>
                        <span>Try a different search term or day filter.</span>
                      </div>
                    ) : (
                      <div className="tt-table-card">
                        <div className="tt-table-wrap">
                          <table className="tt-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Day</th>
                                <th>Time</th>
                                <th>Subject</th>
                                <th>Teacher</th>
                                <th>Class</th>
                                <th>Room</th>
                                {/* Actions column only for mentor */}
                                {canEdit && <th>Actions</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.map((entry, idx) => (
                                <tr
                                  key={entry.id}
                                  className={
                                    entry.day === TODAY_NAME
                                      ? "tt-row--today"
                                      : ""
                                  }>
                                  <td className="tt-cell-no">
                                    {(page - 1) * pageSize + idx + 1}
                                  </td>

                                  <td>
                                    <span
                                      className={`tt-day-badge${entry.day === TODAY_NAME ? " tt-day-badge--today" : ""}`}>
                                      {DAY_LABELS[entry.day] ?? entry.day}
                                      {entry.day === TODAY_NAME && " · Today"}
                                    </span>
                                  </td>

                                  <td>
                                    <span className="tt-time-cell">
                                      <Clock size={12} />
                                      {fmtTime(entry.timeSlotStart)} –{" "}
                                      {fmtTime(entry.timeSlotEnd)}
                                    </span>
                                  </td>

                                  <td>
                                    <span className="tt-subject-pill">
                                      {entry.subject}
                                    </span>
                                  </td>

                                  <td>
                                    <span className="tt-teacher-cell">
                                      <User size={12} />
                                      {entry.teacherName ?? "—"}
                                    </span>
                                  </td>

                                  <td>
                                    <span className="tt-class-cell">
                                      <GraduationCap size={12} />
                                      Class {entry.className}
                                      {entry.section
                                        ? ` · ${entry.section}`
                                        : ""}
                                    </span>
                                  </td>

                                  <td>
                                    {entry.roomNumber ? (
                                      <span className="tt-room-cell">
                                        <MapPin size={12} />
                                        {entry.roomNumber}
                                      </span>
                                    ) : (
                                      <span className="tt-empty-text">—</span>
                                    )}
                                  </td>

                                  {/* Action buttons only for mentor */}
                                  {canEdit && (
                                    <td>
                                      <div className="tt-action-row">
                                        <button
                                          className="tt-edit-btn"
                                          onClick={() => openEditModal(entry)}>
                                          <Edit2 size={13} /> Edit
                                        </button>
                                        <button
                                          className="tt-delete-btn"
                                          onClick={() => openDeleteModal(entry)}
                                          disabled={deletingId === entry.id}>
                                          {deletingId === entry.id ? (
                                            <Spinner
                                              size="small"
                                              color="#991B1B"
                                            />
                                          ) : (
                                            <>
                                              <Trash2 size={13} /> Delete
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
              </>
            )}
          </>
        )}
      </div>

      {/* ════════ ADD MODAL ════════ */}
      {showAddModal && canEdit && (
        <Modal
          title="Add Timetable Entry"
          onClose={() => setShowAddModal(false)}
          size="medium">
          <TimetableForm
            form={addForm}
            setForm={setAddForm}
            classes={classes.filter(
              (c) => c.mentorTeacherId === profile?.userId,
            )}
            saving={saving}
            onSave={handleAdd}
            onCancel={() => setShowAddModal(false)}
            saveLabel="Add Entry"
            isEdit={false}
          />
        </Modal>
      )}

      {/* ════════ EDIT MODAL ════════ */}
      {showEditModal && editEntry && canEdit && (
        <Modal
          title="Edit Timetable Entry"
          onClose={() => {
            setShowEditModal(false);
            setEditEntry(null);
          }}
          size="medium">
          <TimetableForm
            form={editForm}
            setForm={setEditForm}
            classes={classes}
            saving={saving}
            onSave={handleUpdate}
            onCancel={() => {
              setShowEditModal(false);
              setEditEntry(null);
            }}
            saveLabel="Update Entry"
            isEdit={true}
          />
        </Modal>
      )}

      {/* ════════ DELETE MODAL ════════ */}
      {showDeleteModal && deleteTarget && canEdit && (
        <DeleteConfirmModal
          entry={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
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
