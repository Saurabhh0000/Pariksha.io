import { useState, useEffect, useCallback, useMemo } from "react";
import {
  UserPlus,
  Search,
  Trash2,
  Eye,
  Users,
  Mail,
  Phone,
  BookOpen,
  XCircle,
  X,
  ChevronDown,
  Award,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  Home,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/shared/Modal";
import Toast from "../../components/shared/Toast";
import Spinner from "../../components/shared/Spinner";
import adminService from "../../services/adminService";
import "./AdminTeachers.css";

// ── Constants ──────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: "", label: "Select gender" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const PAGE_SIZES = [10, 20, 50];

const EMPTY_ADDRESS = {
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  gender: "",
  phone: "",
  qualifications: "",
  experience: "",
  permanentAddress: { ...EMPTY_ADDRESS },
  currentAddress: { ...EMPTY_ADDRESS },
};

// ── Helpers ────────────────────────────────────────────

function hasAddress(addr) {
  if (!addr) return false;

  return (
    addr.addressLine?.trim() ||
    addr.city?.trim() ||
    addr.state?.trim() ||
    addr.pincode?.trim()
  );
}

// ── Address sub-form — DEFINED OUTSIDE the page component
//    so React never recreates the DOM node on re-render,
//    which is what caused the "must click twice" bug.
// ──────────────────────────────────────────────────────

function AddressFormSection({
  type,
  label,
  icon: Icon,
  value,
  onFieldChange,
  errors,
}) {
  return (
    <div className="at-form-section">
      <p className="at-form-section-title">
        <Icon size={14} strokeWidth={2} />
        {label}
      </p>

      {/* Address Line */}
      <div className="at-form-field">
        <label className="at-form-label">Address Line</label>
        <input
          type="text"
          className={`at-form-input${errors?.[`${type}.addressLine`] ? " at-input-error" : ""}`}
          placeholder="Flat / House No., Street, Area"
          value={value.addressLine}
          onChange={(e) => onFieldChange(type, "addressLine", e.target.value)}
        />
        {errors?.[`${type}.addressLine`] && (
          <span className="at-error-msg">
            <XCircle size={12} strokeWidth={2.5} />
            {errors[`${type}.addressLine`]}
          </span>
        )}
      </div>

      {/* City + State */}
      <div className="at-form-row">
        <div className="at-form-field">
          <label className="at-form-label">City</label>
          <input
            type="text"
            className={`at-form-input${errors?.[`${type}.city`] ? " at-input-error" : ""}`}
            placeholder="e.g. Bengaluru"
            value={value.city}
            onChange={(e) => onFieldChange(type, "city", e.target.value)}
          />
          {errors?.[`${type}.city`] && (
            <span className="at-error-msg">
              <XCircle size={12} strokeWidth={2.5} />
              {errors[`${type}.city`]}
            </span>
          )}
        </div>

        <div className="at-form-field">
          <label className="at-form-label">State</label>
          <input
            type="text"
            className={`at-form-input${errors?.[`${type}.state`] ? " at-input-error" : ""}`}
            placeholder="e.g. Karnataka"
            value={value.state}
            onChange={(e) => onFieldChange(type, "state", e.target.value)}
          />
          {errors?.[`${type}.state`] && (
            <span className="at-error-msg">
              <XCircle size={12} strokeWidth={2.5} />
              {errors[`${type}.state`]}
            </span>
          )}
        </div>
      </div>

      {/* Pincode + Country */}
      <div className="at-form-row">
        <div className="at-form-field">
          <label className="at-form-label">Pincode</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            className={`at-form-input${errors?.[`${type}.pincode`] ? " at-input-error" : ""}`}
            placeholder="e.g. 560034"
            value={value.pincode}
            onChange={(e) =>
              onFieldChange(type, "pincode", e.target.value.replace(/\D/g, ""))
            }
          />
          {errors?.[`${type}.pincode`] && (
            <span className="at-error-msg">
              <XCircle size={12} strokeWidth={2.5} />
              {errors[`${type}.pincode`]}
            </span>
          )}
        </div>

        <div className="at-form-field">
          <label className="at-form-label">Country</label>
          <input
            type="text"
            className="at-form-input"
            placeholder="e.g. India"
            value={value.country}
            onChange={(e) => onFieldChange(type, "country", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ── Address view card ──────────────────────────────────

function AddressViewCard({ title, addr }) {
  if (!hasAddress(addr)) return null;
  return (
    <div className="at-view-address-card">
      <div className="at-view-address-header">
        <MapPin size={13} strokeWidth={2} />
        <p className="at-view-address-type">{title}</p>
      </div>
      <div className="at-view-address-body">
        {addr.addressLine && (
          <p className="at-view-address-line">{addr.addressLine}</p>
        )}
        <div className="at-view-address-meta">
          {addr.city && <span>{addr.city}</span>}
          {addr.state && <span>{addr.state}</span>}
          {addr.country && <span>{addr.country}</span>}
          {addr.pincode && (
            <span className="at-view-pincode">{addr.pincode}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  PAGE COMPONENT
// ══════════════════════════════════════════════════════

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  // Sort / pagination
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

  // ── Fetch ──────────────────────────────────────────

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllTeachers();
      setTeachers(res.data.data || []);
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to load teachers.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // ── Filter + Sort ──────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...teachers];

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          t.teacherCode?.toLowerCase().includes(q) ||
          t.qualifications?.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case "name":
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "code":
          aVal = a.teacherCode || "";
          bVal = b.teacherCode || "";
          break;
        case "qualifications":
          aVal = a.qualifications?.toLowerCase() || "";
          bVal = b.qualifications?.toLowerCase() || "";
          break;
        case "experience":
          aVal = a.experience?.toLowerCase() || "";
          bVal = b.experience?.toLowerCase() || "";
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
  }, [teachers, search, sortField, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [search, sortField, sortDir, pageSize]);

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
      return <ArrowUpDown size={13} strokeWidth={2} className="at-sort-icon" />;
    return sortDir === "asc" ? (
      <ArrowUp
        size={13}
        strokeWidth={2.5}
        className="at-sort-icon at-sort-active"
      />
    ) : (
      <ArrowDown
        size={13}
        strokeWidth={2.5}
        className="at-sort-icon at-sort-active"
      />
    );
  }

  // ── Form handlers ──────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (formErrors[name]) setFormErrors((p) => ({ ...p, [name]: "" }));
  }

  // Stable reference — prevents AddressFormSection remount
  const handleAddressChange = useCallback((type, field, value) => {
    setForm((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
    setFormErrors((prev) => {
      const key = `${type}.${field}`;
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // ── Validation ─────────────────────────────────────

  function validate() {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required.";
    if (!form.lastName.trim()) errs.lastName = "Last name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      errs.email = "Enter a valid email address.";
    if (!form.gender) errs.gender = "Please select gender.";

    // Only validate address if any field has been touched
    ["permanentAddress", "currentAddress"].forEach((type) => {
      if (hasAddress(form[type])) {
        if (!form[type].addressLine.trim())
          errs[`${type}.addressLine`] = "Address line is required.";
        if (!form[type].city.trim()) errs[`${type}.city`] = "City is required.";
        if (!form[type].state.trim())
          errs[`${type}.state`] = "State is required.";
        if (!form[type].pincode.trim())
          errs[`${type}.pincode`] = "Pincode is required.";
        else if (!/^\d{6}$/.test(form[type].pincode))
          errs[`${type}.pincode`] = "Enter a valid 6-digit pincode.";
      }
    });

    return errs;
  }

  // ── Add teacher ────────────────────────────────────

  async function handleAdd(e) {
    e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }

    const payload = {
      ...form,

      permanentAddress: hasAddress(form.permanentAddress)
        ? {
            ...form.permanentAddress,
            addressType: "PERMANENT",
          }
        : null,

      currentAddress: hasAddress(form.currentAddress)
        ? {
            ...form.currentAddress,
            addressType: "CURRENT",
          }
        : null,
    };

    setSubmitting(true);

    try {
      await adminService.createTeacher(payload);

      setToast({
        type: "success",
        message: "Teacher created successfully!",
      });

      setShowAdd(false);
      setForm(EMPTY_FORM);
      setFormErrors({});

      await fetchTeachers();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to create teacher.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete teacher ─────────────────────────────────

  async function handleDelete() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await adminService.removeTeacher(selected.userId);
      setToast({ type: "success", message: "Teacher removed successfully." });
      setShowDelete(false);
      setSelected(null);
      fetchTeachers();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to remove teacher.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openView(teacher) {
    setSelected(teacher);
    setShowView(true);
  }
  function openDelete(teacher) {
    setSelected(teacher);
    setShowDelete(true);
  }
  function openAdd() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowAdd(true);
  }

  function initials(t) {
    return (
      (t.firstName?.charAt(0) || "") + (t.lastName?.charAt(0) || "")
    ).toUpperCase();
  }

  // ── RENDER ─────────────────────────────────────────

  return (
    <AdminLayout title="Teachers">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page header */}
      <div className="at-header">
        <div className="at-header-left">
          <h2 className="at-page-title">Teachers</h2>
          <p className="at-page-sub">
            Manage all teacher accounts and their assignments.
          </p>
        </div>
        <button className="at-add-btn" onClick={openAdd}>
          <UserPlus size={17} strokeWidth={2} />
          Add Teacher
        </button>
      </div>

      {/* Toolbar */}
      <div className="at-toolbar">
        <div className="at-search">
          <Search size={15} strokeWidth={2} className="at-search-icon" />
          <input
            type="text"
            placeholder="Search by name, email or code..."
            className="at-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="at-search-clear" onClick={() => setSearch("")}>
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="at-toolbar-right">
          <span className="at-count">
            {filtered.length} of {teachers.length} teachers
          </span>
          <select
            className="at-page-size"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}>
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
          <button
            className="at-refresh-btn"
            onClick={fetchTeachers}
            title="Refresh">
            <RefreshCw size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="at-loading">
          <Spinner size="large" color="var(--admin-primary)" />
          <p>Loading teachers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="at-empty">
          <div className="at-empty-icon">
            <Users size={40} strokeWidth={1.3} />
          </div>
          <p className="at-empty-title">
            {search ? "No teachers found" : "No teachers yet"}
          </p>
          <p className="at-empty-sub">
            {search
              ? `No results for "${search}". Try a different search.`
              : "Add your first teacher to get started."}
          </p>
          {!search && (
            <button className="at-empty-cta" onClick={openAdd}>
              <UserPlus size={16} strokeWidth={2} />
              Add First Teacher
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="at-table-wrap">
            <table className="at-table">
              <thead>
                <tr>
                  <th>
                    <button
                      className="at-th-btn"
                      onClick={() => handleSort("name")}>
                      Teacher <SortIcon field="name" />
                    </button>
                  </th>
                  <th>
                    <button
                      className="at-th-btn"
                      onClick={() => handleSort("code")}>
                      Code <SortIcon field="code" />
                    </button>
                  </th>
                  <th>Contact</th>
                  <th>
                    <button
                      className="at-th-btn"
                      onClick={() => handleSort("qualifications")}>
                      Qualification <SortIcon field="qualifications" />
                    </button>
                  </th>
                  <th>
                    <button
                      className="at-th-btn"
                      onClick={() => handleSort("experience")}>
                      Experience <SortIcon field="experience" />
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t, i) => (
                  <tr
                    key={t.id}
                    className="at-row"
                    style={{ animationDelay: `${i * 0.04}s` }}>
                    <td>
                      <div className="at-teacher-cell">
                        <div className="at-avatar">{initials(t)}</div>
                        <div>
                          <p className="at-teacher-name">
                            {t.firstName} {t.lastName}
                          </p>
                          <p className="at-teacher-email">{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="at-code">{t.teacherCode || "—"}</span>
                    </td>
                    <td>
                      <span className="at-phone">
                        {t.phone || <span className="at-na">Not provided</span>}
                      </span>
                    </td>
                    <td>
                      <span className="at-qual">
                        {t.qualifications || <span className="at-na">—</span>}
                      </span>
                    </td>
                    <td>
                      <span className="at-exp">
                        {t.experience || <span className="at-na">—</span>}
                      </span>
                    </td>
                    <td>
                      <div className="at-actions">
                        <button
                          className="at-btn-view"
                          onClick={() => openView(t)}
                          title="View details">
                          <Eye size={15} strokeWidth={2} /> View
                        </button>
                        <button
                          className="at-btn-delete"
                          onClick={() => openDelete(t)}
                          title="Remove teacher">
                          <Trash2 size={15} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="at-mobile-cards">
            {paginated.map((t, i) => (
              <div
                key={t.id}
                className="at-mobile-card"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="at-mobile-card-top">
                  <div className="at-avatar at-avatar-lg">{initials(t)}</div>
                  <div className="at-mobile-info">
                    <p className="at-teacher-name">
                      {t.firstName} {t.lastName}
                    </p>
                    <p className="at-teacher-email">{t.email}</p>
                    <span className="at-code">{t.teacherCode}</span>
                  </div>
                  <div className="at-mobile-actions">
                    <button className="at-btn-view" onClick={() => openView(t)}>
                      <Eye size={15} strokeWidth={2} />
                    </button>
                    <button
                      className="at-btn-delete"
                      onClick={() => openDelete(t)}>
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="at-mobile-card-footer">
                  {t.phone && (
                    <span className="at-mobile-tag">
                      <Phone size={12} strokeWidth={2} />
                      {t.phone}
                    </span>
                  )}
                  {t.qualifications && (
                    <span className="at-mobile-tag">
                      <Award size={12} strokeWidth={2} />
                      {t.qualifications}
                    </span>
                  )}
                  {t.experience && (
                    <span className="at-mobile-tag">
                      <BookOpen size={12} strokeWidth={2} />
                      {t.experience}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="at-pagination">
              <span className="at-page-info">
                Page {page} of {totalPages} — showing{" "}
                {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, filtered.length)} of{" "}
                {filtered.length}
              </span>
              <div className="at-page-btns">
                <button
                  className="at-page-btn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  title="First">
                  «
                </button>
                <button
                  className="at-page-btn"
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
                      <span key={`dots-${idx}`} className="at-page-dots">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        className={`at-page-btn${page === item ? " at-page-active" : ""}`}
                        onClick={() => setPage(item)}>
                        {item}
                      </button>
                    ),
                  )}

                <button
                  className="at-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}>
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
                <button
                  className="at-page-btn"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  title="Last">
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════
          ADD TEACHER MODAL
      ════════════════════════════ */}
      {showAdd && (
        <Modal
          title="Add New Teacher"
          onClose={() => setShowAdd(false)}
          size="large">
          <form className="at-form" onSubmit={handleAdd} noValidate>
            {/* Notice */}
            <div className="at-form-notice">
              <AlertCircle size={15} strokeWidth={2} />
              <span>
                Default password will be&nbsp;
                <code>Pariksha@TCH-YYYY-XXX</code>. Teacher must change it on
                first login.
              </span>
            </div>

            {/* ── Personal Details ── */}
            <div className="at-form-section">
              <p className="at-form-section-title">Personal Details</p>

              <div className="at-form-row">
                <div className="at-form-field">
                  <label className="at-form-label">
                    First Name <span className="at-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    autoFocus
                    className={`at-form-input${formErrors.firstName ? " at-input-error" : ""}`}
                    placeholder="e.g. Priya"
                    value={form.firstName}
                    onChange={handleChange}
                  />
                  {formErrors.firstName && (
                    <span className="at-error-msg">
                      <XCircle size={12} strokeWidth={2.5} />
                      {formErrors.firstName}
                    </span>
                  )}
                </div>

                <div className="at-form-field">
                  <label className="at-form-label">
                    Last Name <span className="at-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    className={`at-form-input${formErrors.lastName ? " at-input-error" : ""}`}
                    placeholder="e.g. Sharma"
                    value={form.lastName}
                    onChange={handleChange}
                  />
                  {formErrors.lastName && (
                    <span className="at-error-msg">
                      <XCircle size={12} strokeWidth={2.5} />
                      {formErrors.lastName}
                    </span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="at-form-field">
                <label className="at-form-label">
                  Email Address <span className="at-required">*</span>
                </label>
                <div className="at-input-icon-wrap">
                  <Mail size={15} className="at-input-icon" strokeWidth={1.8} />
                  <input
                    type="email"
                    name="email"
                    className={`at-form-input at-form-input-icon${formErrors.email ? " at-input-error" : ""}`}
                    placeholder="teacher@school.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                {formErrors.email && (
                  <span className="at-error-msg">
                    <XCircle size={12} strokeWidth={2.5} />
                    {formErrors.email}
                  </span>
                )}
              </div>

              {/* Gender + Phone */}
              <div className="at-form-row">
                <div className="at-form-field">
                  <label className="at-form-label">
                    Gender <span className="at-required">*</span>
                  </label>
                  <div className="at-select-wrap">
                    <select
                      name="gender"
                      className={`at-form-select${formErrors.gender ? " at-input-error" : ""}`}
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
                      className="at-select-icon"
                      strokeWidth={2}
                    />
                  </div>
                  {formErrors.gender && (
                    <span className="at-error-msg">
                      <XCircle size={12} strokeWidth={2.5} />
                      {formErrors.gender}
                    </span>
                  )}
                </div>

                <div className="at-form-field">
                  <label className="at-form-label">Phone</label>
                  <div className="at-input-icon-wrap">
                    <Phone
                      size={15}
                      className="at-input-icon"
                      strokeWidth={1.8}
                    />
                    <input
                      type="tel"
                      name="phone"
                      className="at-form-input at-form-input-icon"
                      placeholder="9876543210"
                      value={form.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Qualifications + Experience */}
              <div className="at-form-row">
                <div className="at-form-field">
                  <label className="at-form-label">Qualifications</label>
                  <input
                    type="text"
                    name="qualifications"
                    className="at-form-input"
                    placeholder="e.g. M.Sc Mathematics, B.Ed"
                    value={form.qualifications}
                    onChange={handleChange}
                  />
                </div>
                <div className="at-form-field">
                  <label className="at-form-label">Experience</label>
                  <input
                    type="text"
                    name="experience"
                    className="at-form-input"
                    placeholder="e.g. 5 years"
                    value={form.experience}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* ── Address sections ── */}
            <AddressFormSection
              type="permanentAddress"
              label="Permanent Address"
              icon={MapPin}
              value={form.permanentAddress}
              onFieldChange={handleAddressChange}
              errors={formErrors}
            />

            <AddressFormSection
              type="currentAddress"
              label="Current Address"
              icon={Home}
              value={form.currentAddress}
              onFieldChange={handleAddressChange}
              errors={formErrors}
            />

            {/* Submit */}
            <div className="at-form-actions">
              <button
                type="button"
                className="at-form-cancel"
                onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="at-form-submit"
                disabled={submitting}>
                {submitting ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <UserPlus size={16} strokeWidth={2} /> Create Teacher
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════
          VIEW TEACHER MODAL
      ════════════════════════════ */}
      {showView && selected && (
        <Modal
          title="Teacher Details"
          onClose={() => setShowView(false)}
          size="medium">
          <div className="at-view">
            {/* Avatar + name */}
            <div className="at-view-top">
              <div className="at-view-avatar">{initials(selected)}</div>
              <div>
                <h3 className="at-view-name">
                  {selected.firstName} {selected.lastName}
                </h3>
                <span className="at-view-code">{selected.teacherCode}</span>
              </div>
            </div>

            {/* Details */}
            <div className="at-view-grid">
              {[
                { icon: Mail, label: "Email", value: selected.email },
                {
                  icon: Phone,
                  label: "Phone",
                  value: selected.phone || "Not provided",
                },
                {
                  icon: Award,
                  label: "Qualifications",
                  value: selected.qualifications || "Not provided",
                },
                {
                  icon: BookOpen,
                  label: "Experience",
                  value: selected.experience || "Not provided",
                },
              ].map((row) => (
                <div key={row.label} className="at-view-row">
                  <div className="at-view-row-icon">
                    <row.icon size={15} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="at-view-row-label">{row.label}</p>
                    <p className="at-view-row-value">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Address */}
            {(hasAddress(selected.permanentAddress) ||
              hasAddress(selected.currentAddress)) && (
              <div className="at-view-address-section">
                <p className="at-view-section-title">Address Information</p>
                <div className="at-view-address-grid">
                  <AddressViewCard
                    title="Permanent Address"
                    addr={selected.permanentAddress}
                  />
                  <AddressViewCard
                    title="Current Address"
                    addr={selected.currentAddress}
                  />
                </div>
              </div>
            )}

            {/* Password hint */}
            <div className="at-view-hint">
              <AlertCircle size={14} strokeWidth={2} />
              <span>
                Default password:&nbsp;
                <code>Pariksha@{selected.teacherCode}</code>
              </span>
            </div>

            {/* Actions */}
            <div className="at-form-actions">
              <button
                className="at-form-cancel at-form-cancel-full"
                onClick={() => setShowView(false)}>
                Close
              </button>
              <button
                className="at-form-delete"
                onClick={() => {
                  setShowView(false);
                  openDelete(selected);
                }}>
                <Trash2 size={15} strokeWidth={2} />
                Remove Teacher
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
          title="Remove Teacher"
          onClose={() => setShowDelete(false)}
          size="small">
          <div className="at-delete">
            <div className="at-delete-icon">
              <AlertCircle size={32} strokeWidth={1.5} color="#E53E3E" />
            </div>
            <p className="at-delete-title">
              Remove {selected.firstName} {selected.lastName}?
            </p>
            <p className="at-delete-sub">
              This will deactivate the teacher's account. Their data will be
              preserved. This action can be reviewed by contacting support.
            </p>
            <div className="at-form-actions">
              <button
                className="at-form-cancel"
                onClick={() => setShowDelete(false)}>
                Cancel
              </button>
              <button
                className="at-form-delete"
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
