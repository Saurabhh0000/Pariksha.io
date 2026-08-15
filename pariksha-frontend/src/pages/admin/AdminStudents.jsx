import { useState, useEffect, useCallback, useMemo } from "react";
import {
  UserPlus,
  Search,
  Trash2,
  Eye,
  GraduationCap,
  Mail,
  Phone,
  BookOpen,
  XCircle,
  X,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Home,
  User,
  Heart,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
  UserX,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/shared/Modal";
import Toast from "../../components/shared/Toast";
import Spinner from "../../components/shared/Spinner";
import adminService from "../../services/adminService";
import "./AdminStudents.css";

// ── Constants ──
const GENDER_OPTIONS = [
  { value: "", label: "Select gender" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Students" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const PAGE_SIZES = [10, 20, 50];

const SORT_FIELDS = {
  name: "Name",
  className: "Class",
  rollCode: "Roll Code",
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  gender: "",
  className: "",
  section: "",
  phone: "",
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

const STATUS_CONFIG = {
  ACTIVE: { label: "Active", bg: "#EAF4F0", color: "#0F6E56" },
  INACTIVE: { label: "Inactive", bg: "#F3F4F6", color: "#6B7280" },
  PENDING: { label: "Pending", bg: "#FFFBEB", color: "#92400E" },
};

// ── Helpers ──
function initials(s) {
  return (
    (s.firstName?.charAt(0) || "") + (s.lastName?.charAt(0) || "")
  ).toUpperCase();
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

// ── Address block for view modal ──
function AddressCard({ type, addr }) {
  const text = formatAddress(addr);
  if (!text) return null;
  return (
    <div className="as-view-addr-card">
      <p className="as-view-addr-type">
        <MapPin size={11} strokeWidth={2.5} />
        {type}
      </p>
      <p className="as-view-addr-text">{text}</p>
    </div>
  );
}

// ════════════════════════════════════════════
// Address form section — MOVED OUTSIDE the page
// component so its identity is stable across
// re-renders (fixes input-focus-loss bug).
// ════════════════════════════════════════════
function AddressFormSection({ type, label, icon: Icon, value, onFieldChange }) {
  return (
    <div className="as-form-section">
      <p className="as-form-section-title">
        <Icon size={14} strokeWidth={2} />
        {label}
      </p>

      <div className="as-form-field">
        <label className="as-form-label">Address Line</label>
        <input
          type="text"
          className="as-form-input"
          placeholder="Flat/House No., Street, Area"
          value={value.addressLine}
          onChange={(e) => onFieldChange(type, "addressLine", e.target.value)}
        />
      </div>

      <div className="as-form-row">
        <div className="as-form-field">
          <label className="as-form-label">City</label>
          <input
            type="text"
            className="as-form-input"
            placeholder="e.g. Hyderabad"
            value={value.city}
            onChange={(e) => onFieldChange(type, "city", e.target.value)}
          />
        </div>
        <div className="as-form-field">
          <label className="as-form-label">State</label>
          <input
            type="text"
            className="as-form-input"
            placeholder="e.g. Telangana"
            value={value.state}
            onChange={(e) => onFieldChange(type, "state", e.target.value)}
          />
        </div>
      </div>

      <div className="as-form-row">
        <div className="as-form-field">
          <label className="as-form-label">Pincode</label>
          <input
            type="text"
            className="as-form-input"
            placeholder="500 000"
            value={value.pincode}
            onChange={(e) => onFieldChange(type, "pincode", e.target.value)}
          />
        </div>
        <div className="as-form-field">
          <label className="as-form-label">Country</label>
          <input
            type="text"
            className="as-form-input"
            value={value.country}
            onChange={(e) => onFieldChange(type, "country", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ── Sort / pagination ──
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);

  // Form
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  // ── Fetch ──
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllStudents();
      setStudents(res.data.data || []);
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to load students.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ── Filter + Sort (memoized) ──
  const filtered = useMemo(() => {
    let list = [...students];

    if (statusFilter !== "ALL") {
      list = list.filter((s) => s.status === statusFilter);
    }

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.studentRollCode?.toLowerCase().includes(q) ||
          s.className?.toLowerCase().includes(q) ||
          s.section?.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case "name":
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "className":
          aVal = `${a.className}-${a.section}`.toLowerCase();
          bVal = `${b.className}-${b.section}`.toLowerCase();
          break;
        case "rollCode":
          aVal = a.studentRollCode || "";
          bVal = b.studentRollCode || "";
          break;
        default:
          aVal = "";
          bVal = "";
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [students, search, statusFilter, sortField, sortDir]);

  // Reset to page 1 whenever filters/sort/pageSize change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortField, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }) {
    if (sortField !== field)
      return <ArrowUpDown size={13} strokeWidth={2} className="as-sort-icon" />;
    return sortDir === "asc" ? (
      <ArrowUp
        size={13}
        strokeWidth={2.5}
        className="as-sort-icon as-sort-active"
      />
    ) : (
      <ArrowDown
        size={13}
        strokeWidth={2.5}
        className="as-sort-icon as-sort-active"
      />
    );
  }

  const counts = {
    ALL: students.length,
    ACTIVE: students.filter((s) => s.status === "ACTIVE").length,
    INACTIVE: students.filter((s) => s.status === "INACTIVE").length,
  };

  // ── Form handlers ──
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (formErrors[name]) setFormErrors((p) => ({ ...p, [name]: "" }));
  }

  // Stable callback reference — passed to AddressFormSection
  const handleAddressChange = useCallback((type, field, value) => {
    setForm((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  }, []);

  function validate() {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required.";
    if (!form.lastName.trim()) errs.lastName = "Last name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      errs.email = "Enter a valid email address.";
    if (!form.gender) errs.gender = "Please select gender.";
    if (!form.className.trim()) errs.className = "Class is required.";
    if (!form.section.trim()) errs.section = "Section is required.";
    return errs;
  }

  // ── Add student ──
  async function handleAdd(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await adminService.createStudent(form);
      setToast({ type: "success", message: "Student created successfully!" });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
      fetchStudents();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to create student.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete student ──
  async function handleDelete() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await adminService.removeStudent(selected.userId);
      setToast({ type: "success", message: "Student removed successfully." });
      setShowDelete(false);
      setSelected(null);
      fetchStudents();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to remove student.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openView(s) {
    setSelected(s);
    setShowView(true);
  }
  function openDelete(s) {
    setSelected(s);
    setShowDelete(true);
  }
  function openAdd() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowAdd(true);
  }

  return (
    <AdminLayout title="Students">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Page header ── */}
      <div className="as-header">
        <div className="as-header-left">
          <h2 className="as-page-title">Students</h2>
          <p className="as-page-sub">
            Manage all student accounts, classes and records.
          </p>
        </div>
        <button className="as-add-btn" onClick={openAdd}>
          <UserPlus size={17} strokeWidth={2} />
          Add Student
        </button>
      </div>

      <div className="as-kpi-grid">
        <div
          className="as-kpi-card as-kpi-card--blue"
          onClick={() => setStatusFilter("ALL")}>
          <div className="as-kpi-icon">
            <GraduationCap size={22} />
          </div>

          <div className="as-kpi-body">
            <div className="as-kpi-value">{counts.ALL}</div>

            <div className="as-kpi-label">Total Students</div>

            <div className="as-kpi-sub">
              All registered students in your school.
            </div>
          </div>
        </div>

        <div
          className="as-kpi-card as-kpi-card--green"
          onClick={() => setStatusFilter("ACTIVE")}>
          <div className="as-kpi-icon">
            <UserCheck size={22} />
          </div>

          <div className="as-kpi-body">
            <div className="as-kpi-value">{counts.ACTIVE}</div>

            <div className="as-kpi-label">Active Students</div>

            <div className="as-kpi-sub">
              Students currently enrolled and active.
            </div>
          </div>
        </div>

        <div
          className="as-kpi-card as-kpi-card--red"
          onClick={() => setStatusFilter("INACTIVE")}>
          <div className="as-kpi-icon">
            <UserX size={22} />
          </div>

          <div className="as-kpi-body">
            <div className="as-kpi-value">{counts.INACTIVE}</div>

            <div className="as-kpi-label">Inactive Students</div>

            <div className="as-kpi-sub">
              Students whose accounts are disabled.
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="as-toolbar">
        <div className="as-search">
          <Search size={15} strokeWidth={2} className="as-search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, roll code, class..."
            className="as-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="as-search-clear" onClick={() => setSearch("")}>
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="as-filter-tabs">
          <button
            className={`as-filter-chip ${
              statusFilter === "ALL" ? "as-filter-chip--active" : ""
            }`}
            onClick={() => setStatusFilter("ALL")}>
            All
            <span>{counts.ALL}</span>
          </button>

          <button
            className={`as-filter-chip ${
              statusFilter === "ACTIVE" ? "as-filter-chip--active" : ""
            }`}
            onClick={() => setStatusFilter("ACTIVE")}>
            Active
            <span>{counts.ACTIVE}</span>
          </button>

          <button
            className={`as-filter-chip ${
              statusFilter === "INACTIVE" ? "as-filter-chip--active" : ""
            }`}
            onClick={() => setStatusFilter("INACTIVE")}>
            Inactive
            <span>{counts.INACTIVE}</span>
          </button>
        </div>
        <div className="as-toolbar-right">
          <span className="as-count">
            {filtered.length} of {students.length} students
          </span>
          <select
            className="as-page-size"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}>
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
          <button
            className="as-refresh-btn"
            onClick={fetchStudents}
            title="Refresh">
            <RefreshCw size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="as-loading">
          <Spinner size="large" color="var(--admin-primary)" />
          <p>Loading students...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="as-empty">
          <div className="as-empty-icon">
            <GraduationCap size={40} strokeWidth={1.3} />
          </div>
          <p className="as-empty-title">
            {search ? "No students found" : "No students yet"}
          </p>
          <p className="as-empty-sub">
            {search
              ? `No results for "${search}".`
              : "Add your first student to get started."}
          </p>
          {!search && (
            <button className="as-empty-cta" onClick={openAdd}>
              <UserPlus size={16} strokeWidth={2} />
              Add First Student
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="as-table-wrap">
            <table className="as-table">
              <thead>
                <tr>
                  <th>
                    <button
                      className="as-th-btn"
                      onClick={() => handleSort("name")}>
                      Student <SortIcon field="name" />
                    </button>
                  </th>
                  <th>
                    <button
                      className="as-th-btn"
                      onClick={() => handleSort("rollCode")}>
                      Roll Code <SortIcon field="rollCode" />
                    </button>
                  </th>
                  <th>
                    <button
                      className="as-th-btn"
                      onClick={() => handleSort("className")}>
                      Class <SortIcon field="className" />
                    </button>
                  </th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s, i) => {
                  const status =
                    STATUS_CONFIG[s.status] || STATUS_CONFIG.ACTIVE;
                  return (
                    <tr
                      key={s.id}
                      className="as-row"
                      style={{ animationDelay: `${i * 0.04}s` }}>
                      <td>
                        <div className="as-student-cell">
                          <div
                            className="as-avatar"
                            style={{
                              background:
                                s.gender === "FEMALE"
                                  ? "#FCE7F3"
                                  : "var(--admin-accent)",
                              color:
                                s.gender === "FEMALE"
                                  ? "#9D174D"
                                  : "var(--admin-text)",
                            }}>
                            {initials(s)}
                          </div>
                          <div>
                            <p className="as-student-name">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="as-student-email">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="as-code">
                          {s.studentRollCode || (
                            <span className="as-na">Pending</span>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="as-class-badge">
                          {s.className} — {s.section}
                        </span>
                      </td>
                      <td>
                        <span className="as-phone">
                          {s.phone || <span className="as-na">—</span>}
                        </span>
                      </td>
                      <td>
                        <span
                          className="as-status-badge"
                          style={{
                            background: status.bg,
                            color: status.color,
                          }}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="as-actions">
                          <button
                            className="as-btn-view"
                            onClick={() => openView(s)}>
                            <Eye size={15} strokeWidth={2} /> View
                          </button>
                          <button
                            className="as-btn-delete"
                            onClick={() => openDelete(s)}>
                            <Trash2 size={15} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="as-mobile-cards">
            {paginated.map((s, i) => {
              const status = STATUS_CONFIG[s.status] || STATUS_CONFIG.ACTIVE;
              return (
                <div
                  key={s.id}
                  className="as-mobile-card"
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="as-mobile-card-top">
                    <div
                      className="as-avatar as-avatar-lg"
                      style={{
                        background:
                          s.gender === "FEMALE"
                            ? "#FCE7F3"
                            : "var(--admin-accent)",
                        color:
                          s.gender === "FEMALE"
                            ? "#9D174D"
                            : "var(--admin-text)",
                      }}>
                      {initials(s)}
                    </div>
                    <div className="as-mobile-info">
                      <p className="as-student-name">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="as-student-email">{s.email}</p>
                      <div className="as-mobile-meta">
                        <span className="as-code">
                          {s.studentRollCode || "Pending"}
                        </span>
                        <span
                          className="as-status-badge"
                          style={{
                            background: status.bg,
                            color: status.color,
                          }}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className="as-mobile-actions">
                      <button
                        className="as-btn-view"
                        onClick={() => openView(s)}>
                        <Eye size={15} strokeWidth={2} />
                      </button>
                      <button
                        className="as-btn-delete"
                        onClick={() => openDelete(s)}>
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <div className="as-mobile-card-footer">
                    <span className="as-mobile-tag">
                      <BookOpen size={12} strokeWidth={2} />
                      Class {s.className} — {s.section}
                    </span>
                    {s.phone && (
                      <span className="as-mobile-tag">
                        <Phone size={12} strokeWidth={2} />
                        {s.phone}
                      </span>
                    )}
                    {s.fatherName && (
                      <span className="as-mobile-tag">
                        <User size={12} strokeWidth={2} />
                        {s.fatherName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="as-pagination">
              <span className="as-page-info">
                Page {page} of {totalPages} — showing{" "}
                {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, filtered.length)} of{" "}
                {filtered.length}
              </span>

              <div className="as-page-btns">
                <button
                  className="as-page-btn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  title="First page">
                  «
                </button>
                <button
                  className="as-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}>
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (n) =>
                      n === 1 || n === totalPages || Math.abs(n - page) <= 1,
                  )
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push("...");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`dots-${idx}`} className="as-page-dots">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        className={`as-page-btn${page === item ? " as-page-active" : ""}`}
                        onClick={() => setPage(item)}>
                        {item}
                      </button>
                    ),
                  )}

                <button
                  className="as-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}>
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
                <button
                  className="as-page-btn"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  title="Last page">
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════
          ADD STUDENT MODAL
      ════════════════════════════ */}
      {showAdd && (
        <Modal
          title="Add New Student"
          onClose={() => setShowAdd(false)}
          size="large">
          <form className="as-form" onSubmit={handleAdd} noValidate>
            {/* Notice */}
            <div className="as-form-notice">
              <AlertCircle size={15} strokeWidth={2} />
              <span>
                Default password will be&nbsp;
                <code>Pariksha@STU-YYYY-XXX</code>. Student must change it on
                first login.
              </span>
            </div>

            {/* ── Personal Info ── */}
            <div className="as-form-section">
              <p className="as-form-section-title">
                <User size={14} strokeWidth={2} />
                Personal Information
              </p>

              <div className="as-form-row">
                <div className="as-form-field">
                  <label className="as-form-label">
                    First Name <span className="as-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    autoFocus
                    className={`as-form-input${formErrors.firstName ? " as-input-error" : ""}`}
                    placeholder="e.g. Rahul"
                    value={form.firstName}
                    onChange={handleChange}
                  />
                  {formErrors.firstName && (
                    <span className="as-error-msg">
                      <XCircle size={12} strokeWidth={2.5} />
                      {formErrors.firstName}
                    </span>
                  )}
                </div>
                <div className="as-form-field">
                  <label className="as-form-label">
                    Last Name <span className="as-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    className={`as-form-input${formErrors.lastName ? " as-input-error" : ""}`}
                    placeholder="e.g. Sharma"
                    value={form.lastName}
                    onChange={handleChange}
                  />
                  {formErrors.lastName && (
                    <span className="as-error-msg">
                      <XCircle size={12} strokeWidth={2.5} />
                      {formErrors.lastName}
                    </span>
                  )}
                </div>
              </div>

              <div className="as-form-row">
                <div className="as-form-field">
                  <label className="as-form-label">
                    Email <span className="as-required">*</span>
                  </label>
                  <div className="as-input-icon-wrap">
                    <Mail
                      size={15}
                      className="as-input-icon"
                      strokeWidth={1.8}
                    />
                    <input
                      type="email"
                      name="email"
                      className={`as-form-input as-form-input-icon${formErrors.email ? " as-input-error" : ""}`}
                      placeholder="student@school.com"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>
                  {formErrors.email && (
                    <span className="as-error-msg">
                      <XCircle size={12} strokeWidth={2.5} />
                      {formErrors.email}
                    </span>
                  )}
                </div>
                <div className="as-form-field">
                  <label className="as-form-label">
                    Gender <span className="as-required">*</span>
                  </label>
                  <div className="as-select-wrap">
                    <select
                      name="gender"
                      className={`as-form-select${formErrors.gender ? " as-input-error" : ""}`}
                      value={form.gender}
                      onChange={handleChange}>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={15}
                      className="as-select-icon"
                      strokeWidth={2}
                    />
                  </div>
                  {formErrors.gender && (
                    <span className="as-error-msg">
                      <XCircle size={12} strokeWidth={2.5} />
                      {formErrors.gender}
                    </span>
                  )}
                </div>
              </div>

              <div className="as-form-field">
                <label className="as-form-label">Phone</label>
                <div className="as-input-icon-wrap">
                  <Phone
                    size={15}
                    className="as-input-icon"
                    strokeWidth={1.8}
                  />
                  <input
                    type="tel"
                    name="phone"
                    className="as-form-input as-form-input-icon"
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* ── Class Info ── */}
            <div className="as-form-section">
              <p className="as-form-section-title">
                <BookOpen size={14} strokeWidth={2} />
                Class Information
              </p>
              <div className="as-form-row">
                <div className="as-form-field">
                  <label className="as-form-label">
                    Class <span className="as-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="className"
                    className={`as-form-input${formErrors.className ? " as-input-error" : ""}`}
                    placeholder="e.g. 10"
                    value={form.className}
                    onChange={handleChange}
                  />
                  {formErrors.className && (
                    <span className="as-error-msg">
                      <XCircle size={12} strokeWidth={2.5} />
                      {formErrors.className}
                    </span>
                  )}
                </div>
                <div className="as-form-field">
                  <label className="as-form-label">
                    Section <span className="as-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="section"
                    className={`as-form-input${formErrors.section ? " as-input-error" : ""}`}
                    placeholder="e.g. A"
                    value={form.section}
                    onChange={handleChange}
                  />
                  {formErrors.section && (
                    <span className="as-error-msg">
                      <XCircle size={12} strokeWidth={2.5} />
                      {formErrors.section}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Parent Info ── */}
            <div className="as-form-section">
              <p className="as-form-section-title">
                <Heart size={14} strokeWidth={2} />
                Parent / Guardian Information
              </p>
              <div className="as-form-row">
                <div className="as-form-field">
                  <label className="as-form-label">Father's Name</label>
                  <input
                    type="text"
                    name="fatherName"
                    className="as-form-input"
                    placeholder="e.g. Rajesh Sharma"
                    value={form.fatherName}
                    onChange={handleChange}
                  />
                </div>
                <div className="as-form-field">
                  <label className="as-form-label">Father's Contact</label>
                  <div className="as-input-icon-wrap">
                    <Phone
                      size={15}
                      className="as-input-icon"
                      strokeWidth={1.8}
                    />
                    <input
                      type="tel"
                      name="fatherContact"
                      className="as-form-input as-form-input-icon"
                      placeholder="9876543210"
                      value={form.fatherContact}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              <div className="as-form-field">
                <label className="as-form-label">Mother's Name</label>
                <input
                  type="text"
                  name="motherName"
                  className="as-form-input"
                  placeholder="e.g. Sunita Sharma"
                  value={form.motherName}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* ── Current Address ── */}
            <AddressFormSection
              type="currentAddress"
              label="Current Address"
              icon={Home}
              value={form.currentAddress}
              onFieldChange={handleAddressChange}
            />
            {/* ── Permanent Address ── */}
            <AddressFormSection
              type="permanentAddress"
              label="Permanent Address"
              icon={MapPin}
              value={form.permanentAddress}
              onFieldChange={handleAddressChange}
            />

            {/* ── Actions ── */}
            <div className="as-form-actions">
              <button
                type="button"
                className="as-form-cancel"
                onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="as-form-submit"
                disabled={submitting}>
                {submitting ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <UserPlus size={16} strokeWidth={2} /> Create Student
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════
          VIEW STUDENT MODAL
      ════════════════════════════ */}
      {showView && selected && (
        <Modal
          title="Student Details"
          onClose={() => setShowView(false)}
          size="medium">
          <div className="as-view">
            {/* ── Top: avatar + name + badges ── */}
            <div className="as-view-top">
              <div
                className="as-view-avatar"
                style={{
                  background:
                    selected.gender === "FEMALE"
                      ? "#FCE7F3"
                      : "var(--admin-accent)",
                  color:
                    selected.gender === "FEMALE"
                      ? "#9D174D"
                      : "var(--admin-text)",
                }}>
                {initials(selected)}
              </div>
              <div className="as-view-top-info">
                <h3 className="as-view-name">
                  {selected.firstName} {selected.lastName}
                </h3>
                <div className="as-view-top-badges">
                  <span className="as-code">
                    {selected.studentRollCode || "Pending"}
                  </span>
                  <span
                    className="as-status-badge"
                    style={{
                      background:
                        STATUS_CONFIG[selected.status]?.bg || "#F3F4F6",
                      color: STATUS_CONFIG[selected.status]?.color || "#6B7280",
                    }}>
                    {STATUS_CONFIG[selected.status]?.label || selected.status}
                  </span>
                  <span className="as-class-badge">
                    Class {selected.className} — {selected.section}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Contact Details ── */}
            <div className="as-view-section">
              <p className="as-view-section-title">
                <User size={13} strokeWidth={2} />
                Contact Details
              </p>
              <div className="as-view-grid">
                {[
                  { icon: Mail, label: "Email", value: selected.email },
                  {
                    icon: Phone,
                    label: "Phone",
                    value: selected.phone || "Not provided",
                  },
                  {
                    icon: User,
                    label: "Gender",
                    value: selected.gender || "—",
                  },
                ].map((row) => (
                  <div key={row.label} className="as-view-row">
                    <div className="as-view-row-icon">
                      <row.icon size={15} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="as-view-row-label">{row.label}</p>
                      <p className="as-view-row-value">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Parent Info ── */}
            {(selected.fatherName || selected.motherName) && (
              <div className="as-view-section">
                <p className="as-view-section-title">
                  <Heart size={13} strokeWidth={2} />
                  Parent Information
                </p>
                <div className="as-view-grid">
                  {selected.fatherName && (
                    <div className="as-view-row">
                      <div className="as-view-row-icon">
                        <User size={15} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="as-view-row-label">Father</p>
                        <p className="as-view-row-value">
                          {selected.fatherName}
                          {selected.fatherContact && (
                            <span className="as-view-contact">
                              {" "}
                              · {selected.fatherContact}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {selected.motherName && (
                    <div className="as-view-row">
                      <div className="as-view-row-icon">
                        <Heart size={15} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="as-view-row-label">Mother</p>
                        <p className="as-view-row-value">
                          {selected.motherName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Address Information ── */}
            {(selected.currentAddress || selected.permanentAddress) && (
              <div className="as-view-section">
                <p className="as-view-section-title">
                  <MapPin size={13} strokeWidth={2} />
                  Address Information
                </p>
                <div className="as-view-addr-grid">
                  <AddressCard type="Current" addr={selected.currentAddress} />
                  <AddressCard
                    type="Permanent"
                    addr={selected.permanentAddress}
                  />
                </div>
              </div>
            )}

            {/* ── Password hint ── */}
            {selected.studentRollCode && selected.status === "ACTIVE" && (
              <div className="as-view-hint">
                <AlertCircle size={14} strokeWidth={2} />
                <span>
                  Default password:&nbsp;
                  <code>Pariksha@{selected.studentRollCode}</code>
                </span>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="as-form-actions">
              <button
                className="as-form-cancel as-form-cancel-full"
                onClick={() => setShowView(false)}>
                Close
              </button>
              <button
                className="as-form-delete"
                onClick={() => {
                  setShowView(false);
                  openDelete(selected);
                }}>
                <Trash2 size={15} strokeWidth={2} />
                Remove Student
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════
          DELETE CONFIRM MODAL
      ════════════════════════════ */}
      {showDelete && selected && (
        <Modal
          title="Remove Student"
          onClose={() => setShowDelete(false)}
          size="small">
          <div className="as-delete">
            <div className="as-delete-icon">
              <AlertCircle size={32} strokeWidth={1.5} color="#E53E3E" />
            </div>
            <p className="as-delete-title">
              Remove {selected.firstName} {selected.lastName}?
            </p>
            <p className="as-delete-sub">
              This will deactivate the student's account. Their records and data
              will be preserved.
            </p>
            <div className="as-form-actions" style={{ width: "100%" }}>
              <button
                className="as-form-cancel"
                onClick={() => setShowDelete(false)}>
                Cancel
              </button>
              <button
                className="as-form-delete"
                onClick={handleDelete}
                disabled={submitting}>
                {submitting ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <Trash2 size={15} strokeWidth={2} /> Yes, Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
