import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Clock,
  Search,
  X,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  GraduationCap,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Heart,
  Shield,
  Filter,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/shared/Modal";
import Toast from "../../components/shared/Toast";
import Spinner from "../../components/shared/Spinner";
import adminService from "../../services/adminService";
import "./AdminPending.css";

// ── Constants ──
const PAGE_SIZES = [5, 10, 20];

// ── Sort field labels ──
const SORT_FIELDS = {
  name: "Name",
  className: "Class",
  email: "Email",
};

function Dropdown({
  icon: Icon,
  value,
  options,
  getLabel,
  onChange,
  width = 170,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="ap-sort-wrap" style={{ width }} ref={dropdownRef}>
      <button className="ap-sort-btn" onClick={() => setOpen((p) => !p)}>
        {Icon && <Icon size={14} />}

        <span>{getLabel(value)}</span>

        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="ap-sort-dropdown">
          {options.map((opt) => (
            <button
              key={opt}
              className={`ap-sort-option ${
                value === opt ? "ap-sort-option--active" : ""
              }`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}>
              {value === opt && <CheckCircle size={12} />}

              {getLabel(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPending() {
  // ── Data ──
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Search / Sort / Paginate ──
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Modals ──
  const [showView, setShowView] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [selected, setSelected] = useState(null);

  // ── Filter by class ──
  const [classFilter, setClassFilter] = useState("ALL");

  // ── Fetch ──
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getPending();
      setStudents(res.data.data || []);
    } catch (err) {
      setToast({
        type: "error",
        message:
          err.response?.data?.message || "Failed to load pending students.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // ── Unique class options ──
  const classOptions = useMemo(() => {
    const classes = [
      ...new Set(students.map((s) => `${s.className}-${s.section}`)),
    ].sort();
    return ["ALL", ...classes];
  }, [students]);

  // ── Filtered + Sorted + Paginated ──
  const filtered = useMemo(() => {
    let list = [...students];

    // Class filter
    if (classFilter !== "ALL") {
      const [cls, sec] = classFilter.split("-");
      list = list.filter((s) => s.className === cls && s.section === sec);
    }

    // Search
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.className?.toLowerCase().includes(q) ||
          s.section?.toLowerCase().includes(q) ||
          s.fatherName?.toLowerCase().includes(q),
      );
    }

    // Sort
    list.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      if (sortField === "name") {
        aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
        bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
      } else if (sortField === "className") {
        aVal = `${a.className}-${a.section}`;
        bVal = `${b.className}-${b.section}`;
      } else if (sortField === "email") {
        aVal = a.email?.toLowerCase() || "";
        bVal = b.email?.toLowerCase() || "";
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [students, search, sortField, sortDir, classFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, sortField, sortDir, classFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── Sort handler ──
  function handleSort(field) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }) {
    if (sortField !== field)
      return <ArrowUpDown size={13} strokeWidth={2} className="ap-sort-icon" />;
    return sortDir === "asc" ? (
      <ArrowUp
        size={13}
        strokeWidth={2.5}
        className="ap-sort-icon ap-sort-active"
      />
    ) : (
      <ArrowDown
        size={13}
        strokeWidth={2.5}
        className="ap-sort-icon ap-sort-active"
      />
    );
  }

  // ── Approve ──
  async function handleApprove() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await adminService.approveStudent(selected.userId);
      setToast({
        type: "success",
        message: `${selected.firstName} ${selected.lastName} has been approved! Roll code assigned.`,
      });
      setShowApprove(false);
      setSelected(null);
      fetchPending();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to approve student.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Reject ──
  async function handleReject() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await adminService.rejectStudent(selected.userId);
      setToast({
        type: "warning",
        message: `${selected.firstName} ${selected.lastName}'s registration has been rejected.`,
      });
      setShowReject(false);
      setSelected(null);
      fetchPending();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to reject student.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Helpers ──
  function initials(s) {
    return (
      (s.firstName?.charAt(0) || "") + (s.lastName?.charAt(0) || "")
    ).toUpperCase();
  }

  function openView(s) {
    setSelected(s);
    setShowView(true);
  }
  function openApprove(s) {
    setSelected(s);
    setShowApprove(true);
  }
  function openReject(s) {
    setSelected(s);
    setShowReject(true);
  }

  // ── Approve all ──
  const [approvingAll, setApprovingAll] = useState(false);

  async function handleApproveAll() {
    if (filtered.length === 0) return;
    setApprovingAll(true);
    let success = 0;
    let failed = 0;
    for (const s of filtered) {
      try {
        await adminService.approveStudent(s.userId);
        success++;
      } catch {
        failed++;
      }
    }
    setApprovingAll(false);
    setToast({
      type: success > 0 ? "success" : "error",
      message:
        failed === 0
          ? `All ${success} student(s) approved successfully!`
          : `${success} approved, ${failed} failed.`,
    });
    fetchPending();
  }

  return (
    <AdminLayout title="Pending Approvals">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Page header ── */}
      <div className="ap-header">
        <div className="ap-header-left">
          <h2 className="ap-page-title">Pending Approvals</h2>
          <p className="ap-page-sub">
            Review and approve student registrations added by teachers.
          </p>
        </div>

        {/* Approve all button — shown only when there's something */}
        {students.length > 0 && (
          <button
            className="ap-approve-all-btn"
            onClick={handleApproveAll}
            disabled={approvingAll || loading}>
            {approvingAll ? (
              <Spinner size="small" color="#fff" />
            ) : (
              <CheckCircle size={16} strokeWidth={2} />
            )}
            Approve All ({filtered.length})
          </button>
        )}
      </div>

      {/* ── Alert notice ── */}
      {!loading && students.length > 0 && (
        <div className="ap-notice">
          <AlertCircle size={16} strokeWidth={2} />
          <span>
            <strong>{students.length}</strong> student
            {students.length !== 1 ? "s" : ""} waiting for approval. Approved
            students will receive a roll code and login access.
          </span>
        </div>
      )}

      {/* ── Filters row ── */}
      <div className="ap-filters">
        {/* Search */}
        <div className="ap-search">
          <Search size={15} strokeWidth={2} className="ap-search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, class..."
            className="ap-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="ap-search-clear" onClick={() => setSearch("")}>
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Class filter */}
        <Dropdown
          icon={Filter}
          value={classFilter}
          options={classOptions}
          onChange={setClassFilter}
          width={180}
          getLabel={(opt) => (opt === "ALL" ? "All Classes" : `Class ${opt}`)}
        />

        {/* Right side */}
        <div className="ap-filter-right">
          <span className="ap-count">
            {filtered.length} of {students.length} pending
          </span>

          {/* Page size */}
          <Dropdown
            value={pageSize}
            options={PAGE_SIZES}
            onChange={(v) => setPageSize(Number(v))}
            width={140}
            getLabel={(v) => `${v} per page`}
          />

          <button
            className="ap-refresh-btn"
            onClick={fetchPending}
            title="Refresh">
            <RefreshCw size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="ap-loading">
          <Spinner size="large" color="var(--admin-primary)" />
          <p>Loading pending students...</p>
        </div>
      ) : students.length === 0 ? (
        /* All clear state */
        <div className="ap-all-clear">
          <div className="ap-all-clear-icon">
            <CheckCircle size={48} strokeWidth={1.3} color="#38A169" />
          </div>
          <h3 className="ap-all-clear-title">All Caught Up!</h3>
          <p className="ap-all-clear-sub">
            No pending student approvals at this time. When teachers add
            students, they'll appear here for review.
          </p>
          <button className="ap-refresh-cta" onClick={fetchPending}>
            <RefreshCw size={15} strokeWidth={2} />
            Refresh
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* No search results */
        <div className="ap-empty">
          <div className="ap-empty-icon">
            <GraduationCap size={40} strokeWidth={1.3} />
          </div>
          <p className="ap-empty-title">No students found</p>
          <p className="ap-empty-sub">
            Try a different search or class filter.
          </p>
          <button
            className="ap-empty-reset"
            onClick={() => {
              setSearch("");
              setClassFilter("ALL");
            }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  {/* Name column */}
                  <th>
                    <button
                      className="ap-th-btn"
                      onClick={() => handleSort("name")}>
                      Student <SortIcon field="name" />
                    </button>
                  </th>

                  {/* Class column */}
                  <th>
                    <button
                      className="ap-th-btn"
                      onClick={() => handleSort("className")}>
                      Class <SortIcon field="className" />
                    </button>
                  </th>

                  {/* Email column */}
                  <th>
                    <button
                      className="ap-th-btn"
                      onClick={() => handleSort("email")}>
                      Email <SortIcon field="email" />
                    </button>
                  </th>

                  <th>Parent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s, i) => (
                  <tr
                    key={s.id}
                    className="ap-row"
                    style={{ animationDelay: `${i * 0.04}s` }}>
                    {/* Student */}
                    <td>
                      <div className="ap-student-cell">
                        <div
                          className="ap-avatar"
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
                          <p className="ap-student-name">
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="ap-student-gender">{s.gender || "—"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Class */}
                    <td>
                      <span className="ap-class-badge">
                        Class {s.className} — {s.section}
                      </span>
                    </td>

                    {/* Email */}
                    <td>
                      <span className="ap-email">{s.email}</span>
                    </td>

                    {/* Parent */}
                    <td>
                      <span className="ap-parent">
                        {s.fatherName || (
                          <span className="ap-na">Not provided</span>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="ap-actions">
                        <button
                          className="ap-btn-view"
                          onClick={() => openView(s)}
                          title="View details">
                          <Eye size={14} strokeWidth={2} />
                          View
                        </button>
                        <button
                          className="ap-btn-approve"
                          onClick={() => openApprove(s)}
                          title="Approve">
                          <CheckCircle size={14} strokeWidth={2} />
                          Approve
                        </button>
                        <button
                          className="ap-btn-reject"
                          onClick={() => openReject(s)}
                          title="Reject">
                          <XCircle size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="ap-mobile-cards">
            {paginated.map((s, i) => (
              <div
                key={s.id}
                className="ap-mobile-card"
                style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Top row */}
                <div className="ap-mobile-card-top">
                  <div
                    className="ap-avatar ap-avatar-lg"
                    style={{
                      background:
                        s.gender === "FEMALE"
                          ? "#FCE7F3"
                          : "var(--admin-accent)",
                      color:
                        s.gender === "FEMALE" ? "#9D174D" : "var(--admin-text)",
                    }}>
                    {initials(s)}
                  </div>

                  <div className="ap-mobile-info">
                    <p className="ap-student-name">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="ap-email ap-email-sm">{s.email}</p>
                    <span className="ap-class-badge ap-class-badge-sm">
                      Class {s.className} — {s.section}
                    </span>
                  </div>

                  <button
                    className="ap-btn-view ap-btn-view-icon"
                    onClick={() => openView(s)}>
                    <Eye size={15} strokeWidth={2} />
                  </button>
                </div>

                {/* Tags row */}
                {(s.fatherName || s.phone) && (
                  <div className="ap-mobile-tags">
                    {s.fatherName && (
                      <span className="ap-mobile-tag">
                        <User size={12} strokeWidth={2} />
                        {s.fatherName}
                      </span>
                    )}
                    {s.phone && (
                      <span className="ap-mobile-tag">
                        <Phone size={12} strokeWidth={2} />
                        {s.phone}
                      </span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="ap-mobile-actions">
                  <button
                    className="ap-btn-approve ap-btn-mobile"
                    onClick={() => openApprove(s)}>
                    <CheckCircle size={15} strokeWidth={2} />
                    Approve
                  </button>
                  <button
                    className="ap-btn-reject ap-btn-reject-mobile"
                    onClick={() => openReject(s)}>
                    <XCircle size={15} strokeWidth={2} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="ap-pagination">
              <span className="ap-page-info">
                Page {page} of {totalPages} — showing{" "}
                {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, filtered.length)} of{" "}
                {filtered.length}
              </span>

              <div className="ap-page-btns">
                <button
                  className="ap-page-btn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  title="First page">
                  «
                </button>
                <button
                  className="ap-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}>
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (n) =>
                      n === 1 || n === totalPages || Math.abs(n - page) <= 1,
                  )
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) {
                      acc.push("...");
                    }
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`dots-${idx}`} className="ap-page-dots">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        className={`ap-page-btn${page === item ? " ap-page-active" : ""}`}
                        onClick={() => setPage(item)}>
                        {item}
                      </button>
                    ),
                  )}

                <button
                  className="ap-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}>
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
                <button
                  className="ap-page-btn"
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
          VIEW MODAL
      ════════════════════════════ */}
      {showView && selected && (
        <Modal
          title="Student Details"
          onClose={() => setShowView(false)}
          size="medium">
          <div className="ap-view">
            {/* Top */}
            <div className="ap-view-top">
              <div
                className="ap-view-avatar"
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
              <div>
                <h3 className="ap-view-name">
                  {selected.firstName} {selected.lastName}
                </h3>
                <span className="ap-class-badge">
                  Class {selected.className} — {selected.section}
                </span>
              </div>
            </div>

            {/* Pending notice */}
            <div className="ap-view-notice">
              <Clock size={15} strokeWidth={2} />
              <span>
                This student was added by a teacher and is awaiting your
                approval. After approval, a roll code and login access will be
                created.
              </span>
            </div>

            {/* Details */}
            <div className="ap-view-grid">
              {[
                { icon: Mail, label: "Email", value: selected.email },
                {
                  icon: Phone,
                  label: "Phone",
                  value: selected.phone || "Not provided",
                },
                { icon: User, label: "Gender", value: selected.gender || "—" },
              ].map((row) => (
                <div key={row.label} className="ap-view-row">
                  <div className="ap-view-row-icon">
                    <row.icon size={15} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="ap-view-row-label">{row.label}</p>
                    <p className="ap-view-row-value">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Parent info */}
            {(selected.fatherName || selected.motherName) && (
              <div className="ap-view-section">
                <p className="ap-view-section-title">
                  <Heart size={13} strokeWidth={2} />
                  Parent / Guardian
                </p>
                <div className="ap-view-grid">
                  {selected.fatherName && (
                    <div className="ap-view-row">
                      <div className="ap-view-row-icon">
                        <User size={15} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="ap-view-row-label">Father</p>
                        <p className="ap-view-row-value">
                          {selected.fatherName}
                          {selected.fatherContact && (
                            <span className="ap-view-contact">
                              &nbsp;· {selected.fatherContact}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {selected.motherName && (
                    <div className="ap-view-row">
                      <div className="ap-view-row-icon">
                        <Heart size={15} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="ap-view-row-label">Mother</p>
                        <p className="ap-view-row-value">
                          {selected.motherName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Decision buttons */}
            <div className="ap-view-actions">
              <button
                className="ap-form-cancel"
                onClick={() => setShowView(false)}>
                Close
              </button>
              <button
                className="ap-btn-reject-solid"
                onClick={() => {
                  setShowView(false);
                  openReject(selected);
                }}>
                <XCircle size={15} strokeWidth={2} />
                Reject
              </button>
              <button
                className="ap-btn-approve-solid"
                onClick={() => {
                  setShowView(false);
                  openApprove(selected);
                }}>
                <CheckCircle size={15} strokeWidth={2} />
                Approve
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════
          APPROVE CONFIRM MODAL
      ════════════════════════════ */}
      {showApprove && selected && (
        <Modal
          title="Approve Student"
          onClose={() => setShowApprove(false)}
          size="small">
          <div className="ap-confirm">
            <div className="ap-confirm-icon ap-confirm-icon-approve">
              <CheckCircle size={32} strokeWidth={1.5} color="#38A169" />
            </div>

            <p className="ap-confirm-title">
              Approve {selected.firstName} {selected.lastName}?
            </p>

            <p className="ap-confirm-sub">
              This will activate their account for Class
              <strong>
                {" "}
                {selected.className} — {selected.section}
              </strong>
              . They'll receive a unique roll code and default login password.
            </p>

            <div className="ap-confirm-info">
              <Shield size={14} strokeWidth={2} />
              <span>
                Default password will be&nbsp;
                <code>Pariksha@STU-YYYY-XXX</code>. They must change it on first
                login.
              </span>
            </div>

            <div className="ap-confirm-actions">
              <button
                className="ap-form-cancel"
                onClick={() => setShowApprove(false)}>
                Cancel
              </button>
              <button
                className="ap-btn-approve-solid"
                onClick={handleApprove}
                disabled={submitting}>
                {submitting ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={15} strokeWidth={2} />
                    Yes, Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════
          REJECT CONFIRM MODAL
      ════════════════════════════ */}
      {showReject && selected && (
        <Modal
          title="Reject Registration"
          onClose={() => setShowReject(false)}
          size="small">
          <div className="ap-confirm">
            <div className="ap-confirm-icon ap-confirm-icon-reject">
              <XCircle size={32} strokeWidth={1.5} color="#E53E3E" />
            </div>

            <p className="ap-confirm-title">
              Reject {selected.firstName} {selected.lastName}?
            </p>

            <p className="ap-confirm-sub">
              Their registration will be declined. Their account status will be
              set to Inactive. This action cannot be undone without contacting
              support.
            </p>

            <div className="ap-confirm-actions">
              <button
                className="ap-form-cancel"
                onClick={() => setShowReject(false)}>
                Cancel
              </button>
              <button
                className="ap-btn-reject-solid"
                onClick={handleReject}
                disabled={submitting}>
                {submitting ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <XCircle size={15} strokeWidth={2} />
                    Yes, Reject
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
