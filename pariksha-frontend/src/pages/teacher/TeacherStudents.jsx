import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Phone,
  Mail,
  User,
  MapPin,
  X,
  Save,
  RefreshCw,
  Eye,
  UserPlus,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Home,
  Navigation,
  ShieldCheck,
  BookMarked,
  Info,
  UserCheck,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import teacherService from "../../services/teacherService";
import "./TeacherStudents.css";

// ── Constants ─────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [6, 12, 24];
const PAGE_THRESH = 6; // show pagination only when rows exceed this

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A → Z" },
  { value: "name_desc", label: "Name Z → A" },
  { value: "roll_asc", label: "Roll Code ↑" },
  { value: "roll_desc", label: "Roll Code ↓" },
  { value: "status_asc", label: "Status A → Z" },
];

const BLANK_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "MALE",
  className: "",
  section: "",
  fatherName: "",
  fatherContact: "",
  motherName: "",
  permanentAddress: {
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    addressType: "PERMANENT",
  },
  currentAddress: {
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    addressType: "CURRENT",
  },
};

// ── Helpers ───────────────────────────────────────────
function statusMeta(status) {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return { label: "Active", cls: "ts-badge--active" };
    case "PENDING":
      return { label: "Pending", cls: "ts-badge--pending" };
    case "INACTIVE":
      return { label: "Inactive", cls: "ts-badge--inactive" };
    default:
      return { label: status ?? "—", cls: "" };
  }
}

function statusIcon(status) {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return <CheckCircle2 size={11} />;
    case "PENDING":
      return <Clock size={11} />;
    case "INACTIVE":
      return <XCircle size={11} />;
    default:
      return null;
  }
}

function getInitials(s) {
  return (
    ((s?.firstName?.[0] ?? "") + (s?.lastName?.[0] ?? "")).toUpperCase() || "S"
  );
}

function formatAddress(addr) {
  if (!addr) return null;
  const parts = [
    addr.addressLine,
    addr.city,
    addr.state,
    addr.pincode,
    addr.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function sortStudents(list, sortKey) {
  const s = [...list];
  switch (sortKey) {
    case "name_asc":
      return s.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        ),
      );
    case "name_desc":
      return s.sort((a, b) =>
        `${b.firstName} ${b.lastName}`.localeCompare(
          `${a.firstName} ${a.lastName}`,
        ),
      );
    case "roll_asc":
      return s.sort((a, b) =>
        (a.studentRollCode ?? "").localeCompare(b.studentRollCode ?? ""),
      );
    case "roll_desc":
      return s.sort((a, b) =>
        (b.studentRollCode ?? "").localeCompare(a.studentRollCode ?? ""),
      );
    case "status_asc":
      return s.sort((a, b) => (a.status ?? "").localeCompare(b.status ?? ""));
    default:
      return s;
  }
}

// ── Small reusable form bits ──────────────────────────
function FormGroup({ label, required, children }) {
  return (
    <div className="ts-form-group">
      <label className="ts-form-label">
        {label}
        {required && <span className="ts-form-req">*</span>}
      </label>
      {children}
    </div>
  );
}

function AddressFields({ prefix, values, onChange }) {
  const f = (field) => (e) => onChange(prefix, field, e.target.value);
  return (
    <>
      <FormGroup label="Address Line">
        <input
          type="text"
          className="ts-input"
          value={values.addressLine}
          onChange={f("addressLine")}
          placeholder="Street / House no."
        />
      </FormGroup>
      <div className="ts-form-row">
        <FormGroup label="City">
          <input
            type="text"
            className="ts-input"
            value={values.city}
            onChange={f("city")}
            placeholder="City"
          />
        </FormGroup>
        <FormGroup label="State">
          <input
            type="text"
            className="ts-input"
            value={values.state}
            onChange={f("state")}
            placeholder="State"
          />
        </FormGroup>
      </div>
      <div className="ts-form-row">
        <FormGroup label="Pincode">
          <input
            type="text"
            className="ts-input"
            value={values.pincode}
            onChange={f("pincode")}
            placeholder="Pincode"
          />
        </FormGroup>
        <FormGroup label="Country">
          <input
            type="text"
            className="ts-input"
            value={values.country}
            onChange={f("country")}
            placeholder="Country"
          />
        </FormGroup>
      </div>
    </>
  );
}

// ── Pagination ────────────────────────────────────────
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
    <div className="ts-pagination">
      <div className="ts-page-size">
        <span>Per page</span>
        <select
          className="ts-page-size-select"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="ts-page-controls">
        <button
          className="ts-page-btn"
          onClick={() => setPage(1)}
          disabled={page === 1}>
          «
        </button>
        <button
          className="ts-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}>
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="ts-page-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`ts-page-btn ts-page-btn--num${page === p ? " ts-page-btn--active" : ""}`}
              onClick={() => setPage(p)}>
              {p}
            </button>
          ),
        )}
        <button
          className="ts-page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}>
          <ChevronRight size={14} />
        </button>
        <button
          className="ts-page-btn"
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}>
          »
        </button>
      </div>
      <span className="ts-page-info">
        Page {page} of {totalPages}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────
export default function TeacherStudents() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stuLoading, setStuLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState("name_asc");
  const [showSort, setShowSort] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Boot: load profile + classes ──────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    })();
  }, []);

  // ── Fetch students for selected class ─────────────
  const fetchStudents = useCallback(async (classId) => {
    if (!classId) return;
    try {
      setStuLoading(true);
      const res = await teacherService.getStudentsIn(classId);
      setStudents(res.data.data ?? []);
      setPage(1);
    } catch {
      setToast({ message: "Failed to load students.", type: "error" });
      setStudents([]);
    } finally {
      setStuLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) fetchStudents(selectedClassId);
  }, [selectedClassId, fetchStudents]);

  // Pre-fill class/section in add form
  useEffect(() => {
    if (!selectedClassId) return;
    const cls = classes.find((c) => c.id === selectedClassId);
    if (cls)
      setForm((prev) => ({
        ...prev,
        className: cls.className ?? "",
        section: cls.section ?? "",
      }));
  }, [selectedClassId, classes]);

  useEffect(() => {
    setPage(1);
  }, [search, filter, sortKey]);

  // ── Derive per-class role ─────────────────────────
  const isMentor = profile?.isMentor === true;
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const isMyMentorClass =
    isMentor && selectedClass?.mentorTeacherId === profile?.userId;

  // ── Add student ────────────────────────────────────
  const handleAddStudent = async () => {
    if (!form.firstName.trim()) {
      setToast({ message: "First name is required.", type: "error" });
      return;
    }
    if (!form.email.trim()) {
      setToast({ message: "Email is required.", type: "error" });
      return;
    }
    if (!form.className.trim() || !form.section.trim()) {
      setToast({ message: "Class and section are required.", type: "error" });
      return;
    }
    try {
      setSaving(true);
      await teacherService.addStudent(form);
      setToast({
        message: "Student added successfully. Waiting for admin approval.",
        type: "success",
      });
      setShowAddModal(false);
      setForm(BLANK_FORM);
      fetchStudents(selectedClassId);
    } catch (err) {
      setToast({
        message: err?.response?.data?.message ?? "Failed to add student.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const setAddr = (type, field, value) =>
    setForm((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));

  // ── Derived data ──────────────────────────────────
  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search.trim() ||
      `${s.firstName} ${s.lastName} ${s.email} ${s.studentRollCode}`
        .toLowerCase()
        .includes(q);
    const matchFilter = filter === "ALL" || s.status?.toUpperCase() === filter;
    return matchSearch && matchFilter;
  });

  const sorted = sortStudents(filtered, sortKey);
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const counts = {
    ALL: students.length,
    ACTIVE: students.filter((s) => s.status?.toUpperCase() === "ACTIVE").length,
    PENDING: students.filter((s) => s.status?.toUpperCase() === "PENDING")
      .length,
    INACTIVE: students.filter((s) => s.status?.toUpperCase() === "INACTIVE")
      .length,
  };

  if (loading) {
    return (
      <TeacherLayout title="Students">
        <div className="ts-loading">
          <Spinner />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="Students">
      <div className="ts-page">
        {/* ── Page heading ── */}
        <div className="ts-heading-row">
          <div>
            <h1 className="ts-heading">Students</h1>
            <p className="ts-sub">
              {classes.length === 0
                ? "No classes assigned yet"
                : isMentor
                  ? isMyMentorClass
                    ? `Managing students in ${selectedClass?.className ?? ""}${selectedClass?.section ? ` — Section ${selectedClass.section}` : ""}`
                    : `Viewing students in ${selectedClass?.className ?? ""}${selectedClass?.section ? ` — Section ${selectedClass.section}` : ""}`
                  : `Viewing students across ${classes.length} class${classes.length !== 1 ? "es" : ""}`}
            </p>
          </div>
          <div className="ts-heading-actions">
            <button
              className="ts-refresh-btn"
              onClick={() => fetchStudents(selectedClassId)}
              disabled={stuLoading}
              title="Refresh students">
              <RefreshCw size={15} className={stuLoading ? "ts-spin" : ""} />
            </button>
            {/* Add button ONLY for mentor's own class */}
            {isMyMentorClass && (
              <button
                className="ts-add-btn"
                onClick={() => setShowAddModal(true)}>
                <UserPlus size={16} /> Add Student
              </button>
            )}
          </div>
        </div>

        {/* ── No classes empty state ── */}
        {classes.length === 0 && (
          <div className="ts-empty-page">
            <div className="ts-empty-page__icon">
              <GraduationCap size={36} strokeWidth={1.3} />
            </div>
            <p className="ts-empty-page__title">No classes assigned</p>
            <span className="ts-empty-page__desc">
              Your admin hasn't assigned you to any class yet. Once assigned,
              you'll be able to view and manage students here.
            </span>
          </div>
        )}

        {classes.length > 0 && (
          <>
            {/* ── Class tabs with per-class role chip ── */}
            <div className="ts-class-tabs">
              {classes.map((cls) => {
                const isThisMentor =
                  isMentor && cls.mentorTeacherId === profile?.userId;
                return (
                  <button
                    key={cls.id}
                    className={`ts-class-tab${selectedClassId === cls.id ? " ts-class-tab--active" : ""}`}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setSearch("");
                      setFilter("ALL");
                    }}>
                    <GraduationCap size={13} />
                    {cls.className}
                    {cls.section ? ` · ${cls.section}` : ""}
                    <span
                      className={`ts-tab-role-chip ts-tab-role-chip--${isThisMentor ? "mentor" : "subject"}`}>
                      {isThisMentor ? "Mentor" : "Subject"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Role access banner ── */}
            {isMyMentorClass ? (
              <div className="ts-role-banner ts-role-banner--mentor">
                <div className="ts-role-banner__icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="ts-role-banner__text">
                  <span className="ts-role-banner__title">
                    Mentor Teacher — Full Access
                  </span>
                  <span className="ts-role-banner__desc">
                    You are the Mentor Teacher for this class. You can add new
                    students, view their complete details, and manage their
                    records. New students require admin approval before they can
                    log in.
                  </span>
                </div>
                <button
                  className="ts-role-banner__btn"
                  onClick={() => setShowAddModal(true)}>
                  <UserPlus size={14} /> Add Student
                </button>
              </div>
            ) : (
              <div className="ts-role-banner ts-role-banner--subject">
                <div className="ts-role-banner__icon">
                  <BookMarked size={18} />
                </div>
                <div className="ts-role-banner__text">
                  <span className="ts-role-banner__title">
                    Subject Teacher — View Only
                  </span>
                  <span className="ts-role-banner__desc">
                    You are a Subject Teacher in this class. You can view
                    student details, but only the Mentor Teacher
                    {selectedClass?.mentorTeacherName
                      ? ` (${selectedClass.mentorTeacherName})`
                      : ""}{" "}
                    can add students.
                  </span>
                </div>
              </div>
            )}

            {/* ── KPI Stats cards ── */}
            <div className="ts-kpi-grid">
              <div className="ts-kpi-card ts-kpi-card--blue">
                <div className="ts-kpi-icon">
                  <Users size={20} />
                </div>
                <div className="ts-kpi-body">
                  <span className="ts-kpi-value">{counts.ALL}</span>
                  <span className="ts-kpi-label">Total Students</span>
                  <span className="ts-kpi-sub">In this class</span>
                </div>
              </div>
              <div className="ts-kpi-card ts-kpi-card--green">
                <div className="ts-kpi-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div className="ts-kpi-body">
                  <span className="ts-kpi-value">{counts.ACTIVE}</span>
                  <span className="ts-kpi-label">Active</span>
                  <span className="ts-kpi-sub">Can log in</span>
                </div>
              </div>
              <div className="ts-kpi-card ts-kpi-card--amber">
                <div className="ts-kpi-icon">
                  <Clock size={20} />
                </div>
                <div className="ts-kpi-body">
                  <span className="ts-kpi-value">{counts.PENDING}</span>
                  <span className="ts-kpi-label">Pending</span>
                  <span className="ts-kpi-sub">Awaiting admin approval</span>
                </div>
              </div>
              <div className="ts-kpi-card ts-kpi-card--red">
                <div className="ts-kpi-icon">
                  <XCircle size={20} />
                </div>
                <div className="ts-kpi-body">
                  <span className="ts-kpi-value">{counts.INACTIVE}</span>
                  <span className="ts-kpi-label">Inactive</span>
                  <span className="ts-kpi-sub">Access disabled</span>
                </div>
              </div>
            </div>

            {/* ── Toolbar ── */}
            <div className="ts-toolbar">
              <div className="ts-search-wrap">
                <Search size={14} className="ts-search-icon" />
                <input
                  type="text"
                  className="ts-search"
                  placeholder="Search by name, email or roll code…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="ts-search-clear"
                    onClick={() => setSearch("")}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="ts-filter-group">
                {["ALL", "ACTIVE", "PENDING", "INACTIVE"].map((f) => (
                  <button
                    key={f}
                    className={`ts-filter-btn${filter === f ? " ts-filter-btn--active" : ""}`}
                    onClick={() => setFilter(f)}>
                    {f === "ALL"
                      ? "All"
                      : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              <div className="ts-sort-wrap">
                <button
                  className="ts-sort-btn"
                  onClick={() => setShowSort((p) => !p)}>
                  <ArrowUpDown size={14} />
                  {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ??
                    "Sort"}
                  {showSort ? (
                    <ChevronUp size={13} />
                  ) : (
                    <ChevronDown size={13} />
                  )}
                </button>
                {showSort && (
                  <div className="ts-sort-dropdown">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`ts-sort-option${sortKey === opt.value ? " ts-sort-option--active" : ""}`}
                        onClick={() => {
                          setSortKey(opt.value);
                          setShowSort(false);
                        }}>
                        {sortKey === opt.value && <CheckCircle2 size={13} />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Results info ── */}
            {!stuLoading && (
              <div className="ts-results-info">
                {totalRows === 0
                  ? search
                    ? `No students match "${search}"`
                    : "No students in this class yet"
                  : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalRows)} of ${totalRows} student${totalRows !== 1 ? "s" : ""}${search ? ` matching "${search}"` : ""}${filter !== "ALL" ? ` · ${filter.charAt(0) + filter.slice(1).toLowerCase()} only` : ""}`}
              </div>
            )}

            {/* ── Student grid ── */}
            {stuLoading ? (
              <div className="ts-loading-inline">
                <Spinner />
              </div>
            ) : paginated.length === 0 ? (
              <div className="ts-empty">
                <div className="ts-empty__icon">
                  {search ? (
                    <Search size={28} strokeWidth={1.3} />
                  ) : (
                    <Users size={28} strokeWidth={1.3} />
                  )}
                </div>
                <p>
                  {search
                    ? "No students match your search"
                    : filter !== "ALL"
                      ? `No ${filter.toLowerCase()} students`
                      : "No students in this class yet"}
                </p>
                <span>
                  {search
                    ? "Try a different name, email, or roll code."
                    : filter !== "ALL"
                      ? `There are no students with ${filter.toLowerCase()} status in this class.`
                      : isMyMentorClass
                        ? "Add students to this class using the 'Add Student' button above."
                        : "The Mentor Teacher of this class needs to add students first."}
                </span>
                {!search && filter === "ALL" && isMyMentorClass && (
                  <button
                    className="ts-empty__action"
                    onClick={() => setShowAddModal(true)}>
                    <Plus size={13} /> Add First Student
                  </button>
                )}
              </div>
            ) : (
              <div className="ts-student-grid">
                {paginated.map((student) => {
                  const sm = statusMeta(student.status);
                  return (
                    <div key={student.id} className="ts-student-card">
                      <div className="ts-student-card__top">
                        <div className="ts-student-avatar">
                          {student.photoPath ? (
                            <img
                              src={`http://localhost:8080/${student.photoPath}`}
                              alt=""
                              className="ts-avatar-img"
                            />
                          ) : (
                            getInitials(student)
                          )}
                        </div>
                        <div className="ts-student-info">
                          <span className="ts-student-name">
                            {student.firstName} {student.lastName}
                          </span>
                          {student.studentRollCode && (
                            <span className="ts-student-roll">
                              {student.studentRollCode}
                            </span>
                          )}
                          <span className="ts-student-email">
                            {student.email}
                          </span>
                        </div>
                        <span className={`ts-badge ${sm.cls}`}>
                          {statusIcon(student.status)}
                          {sm.label}
                        </span>
                      </div>

                      <div className="ts-student-meta">
                        {student.phone && (
                          <span>
                            <Phone size={11} />
                            {student.phone}
                          </span>
                        )}
                        <span>
                          <GraduationCap size={11} />
                          {student.className}
                          {student.section ? ` · ${student.section}` : ""}
                        </span>
                        {student.gender && (
                          <span>
                            <User size={11} />
                            {student.gender}
                          </span>
                        )}
                      </div>

                      <div className="ts-student-card__actions">
                        <button
                          className="ts-card-btn"
                          onClick={() => {
                            setViewStudent(student);
                            setShowViewModal(true);
                          }}>
                          <Eye size={13} /> View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Pagination (only when > PAGE_THRESH) ── */}
            {!stuLoading && (
              <Pagination
                page={page}
                totalPages={totalPages}
                setPage={setPage}
                pageSize={pageSize}
                setPageSize={setPageSize}
                totalRows={totalRows}
              />
            )}
          </>
        )}
      </div>

      {/* ════════ ADD STUDENT MODAL (mentor only) ════════ */}
      {showAddModal && isMyMentorClass && (
        <Modal
          title="Add New Student"
          onClose={() => {
            setShowAddModal(false);
            setForm(BLANK_FORM);
          }}
          size="large">
          <div className="ts-add-form">
            <p className="ts-form-section">Personal Information</p>
            <div className="ts-form-row">
              <FormGroup label="First Name" required>
                <input
                  type="text"
                  className="ts-input"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                  placeholder="First name"
                />
              </FormGroup>
              <FormGroup label="Last Name" required>
                <input
                  type="text"
                  className="ts-input"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                  placeholder="Last name"
                />
              </FormGroup>
            </div>
            <div className="ts-form-row">
              <FormGroup label="Email" required>
                <input
                  type="email"
                  className="ts-input"
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="Student email address"
                />
              </FormGroup>
              <FormGroup label="Phone">
                <input
                  type="tel"
                  className="ts-input"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="Phone number"
                />
              </FormGroup>
            </div>
            <FormGroup label="Gender" required>
              <select
                className="ts-input ts-select"
                value={form.gender}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gender: e.target.value }))
                }>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </FormGroup>

            <p className="ts-form-section">Class Information</p>
            <div className="ts-form-row">
              <FormGroup label="Class Name" required>
                <input
                  type="text"
                  className="ts-input"
                  value={form.className}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, className: e.target.value }))
                  }
                  placeholder="e.g. Class 10"
                />
              </FormGroup>
              <FormGroup label="Section" required>
                <input
                  type="text"
                  className="ts-input"
                  value={form.section}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, section: e.target.value }))
                  }
                  placeholder="e.g. A"
                />
              </FormGroup>
            </div>

            <p className="ts-form-section">Parent / Guardian</p>
            <div className="ts-form-row">
              <FormGroup label="Father's Name">
                <input
                  type="text"
                  className="ts-input"
                  value={form.fatherName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, fatherName: e.target.value }))
                  }
                  placeholder="Father's name"
                />
              </FormGroup>
              <FormGroup label="Father's Contact">
                <input
                  type="tel"
                  className="ts-input"
                  value={form.fatherContact}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, fatherContact: e.target.value }))
                  }
                  placeholder="Father's phone"
                />
              </FormGroup>
            </div>
            <FormGroup label="Mother's Name">
              <input
                type="text"
                className="ts-input"
                value={form.motherName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, motherName: e.target.value }))
                }
                placeholder="Mother's name"
              />
            </FormGroup>

            <p className="ts-form-section">
              <Home size={12} /> Permanent Address
            </p>
            <AddressFields
              prefix="permanentAddress"
              values={form.permanentAddress}
              onChange={setAddr}
            />

            <p className="ts-form-section">
              <MapPin size={12} /> Current Address
            </p>
            <AddressFields
              prefix="currentAddress"
              values={form.currentAddress}
              onChange={setAddr}
            />

            <div className="ts-info-note">
              <Info size={13} />
              The student will be added as <strong>Pending</strong> and must be
              approved by the admin before they can log in to Pariksha.io.
            </div>

            <div className="ts-form-actions">
              <button
                className="ts-cancel-btn"
                onClick={() => {
                  setShowAddModal(false);
                  setForm(BLANK_FORM);
                }}
                disabled={saving}>
                <X size={14} /> Cancel
              </button>
              <button
                className="ts-save-btn"
                onClick={handleAddStudent}
                disabled={saving}>
                {saving ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={14} /> Add Student
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════ VIEW STUDENT MODAL ════════ */}
      {showViewModal && viewStudent && (
        <Modal
          title="Student Details"
          onClose={() => {
            setShowViewModal(false);
            setViewStudent(null);
          }}
          size="medium">
          <div className="ts-view-modal">
            {/* Hero */}
            <div className="ts-view-header">
              <div className="ts-view-avatar">
                {viewStudent.photoPath ? (
                  <img
                    src={`http://localhost:8080/${viewStudent.photoPath}`}
                    alt=""
                    className="ts-avatar-img"
                  />
                ) : (
                  getInitials(viewStudent)
                )}
              </div>
              <div className="ts-view-meta">
                <h2 className="ts-view-name">
                  {viewStudent.firstName} {viewStudent.lastName}
                </h2>
                {viewStudent.studentRollCode && (
                  <span className="ts-view-roll">
                    {viewStudent.studentRollCode}
                  </span>
                )}
                <span
                  className={`ts-badge ts-badge--lg ${statusMeta(viewStudent.status).cls}`}>
                  {statusIcon(viewStudent.status)}
                  {statusMeta(viewStudent.status).label}
                </span>
              </div>
            </div>

            {/* Pending warning */}
            {viewStudent.status?.toUpperCase() === "PENDING" && (
              <div className="ts-view-pending-note">
                <Clock size={13} />
                This student is awaiting admin approval and cannot log in yet.
                Once approved, they will receive access credentials.
              </div>
            )}

            {/* Detail rows */}
            <div className="ts-view-details">
              {[
                { icon: Mail, label: "Email", value: viewStudent.email },
                { icon: Phone, label: "Phone", value: viewStudent.phone },
                { icon: User, label: "Gender", value: viewStudent.gender },
                {
                  icon: GraduationCap,
                  label: "Class",
                  value: viewStudent.className
                    ? `${viewStudent.className}${viewStudent.section ? ` — Section ${viewStudent.section}` : ""}`
                    : null,
                },
                {
                  icon: UserCheck,
                  label: "Father's Name",
                  value: viewStudent.fatherName,
                },
                {
                  icon: Phone,
                  label: "Father's Contact",
                  value: viewStudent.fatherContact,
                },
                {
                  icon: User,
                  label: "Mother's Name",
                  value: viewStudent.motherName,
                },
              ].map((row) => (
                <div key={row.label} className="ts-view-row">
                  <span className="ts-view-label">
                    <span className="ts-view-label-icon">
                      <row.icon size={14} strokeWidth={2} />
                    </span>
                    {row.label}
                  </span>
                  <span className="ts-view-value">
                    {row.value || (
                      <span className="ts-empty-text">Not added</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Address section */}
            {(formatAddress(viewStudent.permanentAddress) ||
              formatAddress(viewStudent.currentAddress)) && (
              <div className="ts-view-addresses">
                <p className="ts-view-addresses-title">Address Information</p>
                <div className="ts-view-addresses-grid">
                  {formatAddress(viewStudent.permanentAddress) && (
                    <div className="ts-view-address-card">
                      <div className="ts-view-address-card-header">
                        <span className="ts-view-address-card-icon ts-view-address-card-icon--permanent">
                          <Home size={14} strokeWidth={2} />
                        </span>
                        <span className="ts-view-address-card-type">
                          Permanent Address
                        </span>
                      </div>
                      <div className="ts-view-address-card-body">
                        {viewStudent.permanentAddress.addressLine && (
                          <p className="ts-view-address-line">
                            {viewStudent.permanentAddress.addressLine}
                          </p>
                        )}
                        <div className="ts-view-address-tags">
                          {viewStudent.permanentAddress.city && (
                            <span className="ts-view-address-tag">
                              {viewStudent.permanentAddress.city}
                            </span>
                          )}
                          {viewStudent.permanentAddress.state && (
                            <span className="ts-view-address-tag">
                              {viewStudent.permanentAddress.state}
                            </span>
                          )}
                          {viewStudent.permanentAddress.pincode && (
                            <span className="ts-view-address-tag ts-view-address-tag--pin">
                              {viewStudent.permanentAddress.pincode}
                            </span>
                          )}
                          {viewStudent.permanentAddress.country && (
                            <span className="ts-view-address-tag">
                              {viewStudent.permanentAddress.country}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {formatAddress(viewStudent.currentAddress) && (
                    <div className="ts-view-address-card">
                      <div className="ts-view-address-card-header">
                        <span className="ts-view-address-card-icon ts-view-address-card-icon--current">
                          <Navigation size={14} strokeWidth={2} />
                        </span>
                        <span className="ts-view-address-card-type">
                          Current Address
                        </span>
                      </div>
                      <div className="ts-view-address-card-body">
                        {viewStudent.currentAddress.addressLine && (
                          <p className="ts-view-address-line">
                            {viewStudent.currentAddress.addressLine}
                          </p>
                        )}
                        <div className="ts-view-address-tags">
                          {viewStudent.currentAddress.city && (
                            <span className="ts-view-address-tag">
                              {viewStudent.currentAddress.city}
                            </span>
                          )}
                          {viewStudent.currentAddress.state && (
                            <span className="ts-view-address-tag">
                              {viewStudent.currentAddress.state}
                            </span>
                          )}
                          {viewStudent.currentAddress.pincode && (
                            <span className="ts-view-address-tag ts-view-address-tag--pin">
                              {viewStudent.currentAddress.pincode}
                            </span>
                          )}
                          {viewStudent.currentAddress.country && (
                            <span className="ts-view-address-tag">
                              {viewStudent.currentAddress.country}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
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
