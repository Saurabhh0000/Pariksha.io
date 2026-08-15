import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  BookOpen,
  Award,
  MapPin,
  Camera,
  Edit2,
  Save,
  X,
  ShieldCheck,
  BadgeCheck,
  Briefcase,
  Home,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Lock,
  Activity,
  GraduationCap,
  BookMarked,
  AlertCircle,
} from "lucide-react";
import TeacherLayout from "../../components/teacher/TeacherLayout";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import Modal from "../../components/shared/Modal";
import teacherService from "../../services/teacherService";
import "./TeacherProfile.css";

// ─────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasAddress(addr) {
  if (!addr) return false;
  return !!(addr.addressLine || addr.city || addr.state || addr.pincode);
}

function fmtAddress(addr) {
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

// Profile completion calculator
function calcCompletion(p) {
  if (!p) return { pct: 0, items: [] };
  const items = [
    { key: "firstName", label: "Full Name", done: !!p.firstName },
    { key: "email", label: "Email Address", done: !!p.email },
    { key: "phone", label: "Phone Number", done: !!p.phone },
    { key: "qual", label: "Qualifications", done: !!p.qualifications },
    { key: "exp", label: "Experience", done: !!p.experience },
    { key: "photo", label: "Profile Photo", done: !!p.photoPath },
    {
      key: "permAddr",
      label: "Permanent Address",
      done: hasAddress(p.permanentAddress),
    },
    {
      key: "currAddr",
      label: "Current Address",
      done: hasAddress(p.currentAddress),
    },
  ];
  const done = items.filter((i) => i.done).length;
  return { pct: Math.round((done / items.length) * 100), items };
}

// ─────────────────────────────────────
//  SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────

// Each data row in an info card
function InfoRow({ icon: Icon, label, value, mono, placeholder }) {
  return (
    <div className="tp-info-row">
      <span className="tp-info-label">
        <span className="tp-info-icon">
          <Icon size={13} />
        </span>
        {label}
      </span>
      <span className={`tp-info-value${mono ? " tp-mono" : ""}`}>
        {value || (
          <span className="tp-empty-text">{placeholder || "Not added"}</span>
        )}
      </span>
    </div>
  );
}

// Reusable card with header
function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <div className="tp-section-card">
      <div className="tp-section-header">
        <span className="tp-section-header-left">
          <span className="tp-section-header-icon">
            <Icon size={14} strokeWidth={2} />
          </span>
          {title}
        </span>
        {action && <div className="tp-section-header-action">{action}</div>}
      </div>
      <div className="tp-section-body">{children}</div>
    </div>
  );
}

// Form field wrapper used in edit modal
function FormGroup({ label, children }) {
  return (
    <div className="tp-form-group">
      <label className="tp-form-label">{label}</label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────
//  PAGE COMPONENT
// ─────────────────────────────────────

export default function TeacherProfile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    qualifications: "",
    experience: "",
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
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await teacherService.getProfile();
      const data = res.data.data;
      setProfile(data);
      setForm({
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        phone: data.phone ?? "",
        qualifications: data.qualifications ?? "",
        experience: data.experience ?? "",
        permanentAddress: {
          addressLine: data.permanentAddress?.addressLine ?? "",
          city: data.permanentAddress?.city ?? "",
          state: data.permanentAddress?.state ?? "",
          pincode: data.permanentAddress?.pincode ?? "",
          country: data.permanentAddress?.country ?? "India",
          addressType: "PERMANENT",
        },
        currentAddress: {
          addressLine: data.currentAddress?.addressLine ?? "",
          city: data.currentAddress?.city ?? "",
          state: data.currentAddress?.state ?? "",
          pincode: data.currentAddress?.pincode ?? "",
          country: data.currentAddress?.country ?? "India",
          addressType: "CURRENT",
        },
      });
    } catch {
      setToast({ message: "Failed to load profile.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.firstName.trim()) {
      setToast({ message: "First name is required.", type: "error" });
      return;
    }
    try {
      setSaving(true);
      const res = await teacherService.updateProfile(form);
      setProfile(res.data.data);
      setShowEditModal(false);
      setToast({ message: "Profile updated successfully.", type: "success" });
    } catch {
      setToast({ message: "Failed to update profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ message: "Please select a valid image file.", type: "error" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast({ message: "Photo size must not exceed 2 MB.", type: "error" });
      return;
    }
    try {
      setUploadingPhoto(true);
      const fd = new FormData();
      fd.append("photo", file);
      const res = await teacherService.uploadPhoto(fd);
      setProfile((prev) => ({ ...prev, photoPath: res.data.data }));
      setToast({ message: "Photo uploaded successfully.", type: "success" });
    } catch {
      setToast({ message: "Failed to upload photo.", type: "error" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const setAddr = (type, field, value) =>
    setForm((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));

  // ── Loading ──
  if (loading) {
    return (
      <TeacherLayout title="Profile">
        <div className="tp-loading">
          <Spinner />
        </div>
      </TeacherLayout>
    );
  }

  // ── Derived values ──
  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    "Teacher";
  const initials = fullName.slice(0, 2).toUpperCase();
  const completion = calcCompletion(profile);
  const isMentor = profile?.isMentor === true;

  return (
    <TeacherLayout title="Profile">
      <div className="tp-page">
        {/* ══════════════════════════════
            1. HERO
        ══════════════════════════════ */}
        <div className="tp-hero">
          {/* Gradient band at top */}
          <div className="tp-hero__band" />

          <div className="tp-hero__body">
            {/* ── Avatar (flat square, no ring) ── */}
            <div className="tp-hero__avatar-wrap">
              <div className="tp-hero__avatar">
                {profile?.photoPath ? (
                  <img
                    src={`http://localhost:8080/${profile.photoPath}`}
                    alt="Profile"
                    className="tp-hero__avatar-img"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <button
                className="tp-hero__camera"
                onClick={() => fileRef.current.click()}
                disabled={uploadingPhoto}
                title="Change photo">
                {uploadingPhoto ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <Camera size={12} />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </div>

            {/* ── Name + meta ── */}
            <div className="tp-hero__info">
              {/* Role + status badges */}
              <div className="tp-hero__badges">
                <span
                  className={`tp-role-badge tp-role-badge--${isMentor ? "mentor" : "subject"}`}>
                  {isMentor ? "Mentor Teacher" : "Subject Teacher"}
                </span>
                <span className="tp-status-badge">
                  <span className="tp-status-badge__dot" />
                  Active
                </span>
                <span className="tp-completion-badge">
                  {completion.pct}% complete
                </span>
              </div>

              {/* Name */}
              <h1 className="tp-hero__name">{fullName}</h1>

              {/* Teacher code */}
              {profile?.teacherCode && (
                <span className="tp-hero__code">{profile.teacherCode}</span>
              )}

              {/* Qualification subtitle */}
              {profile?.qualifications && (
                <p className="tp-hero__subtitle">{profile.qualifications}</p>
              )}

              {/* Inline meta chips */}
              <div className="tp-hero__meta">
                {profile?.email && (
                  <span>
                    <Mail size={12} />
                    {profile.email}
                  </span>
                )}
                {profile?.phone && (
                  <span>
                    <Phone size={12} />
                    {profile.phone}
                  </span>
                )}
                {profile?.experience && (
                  <span>
                    <Briefcase size={12} />
                    {profile.experience} exp.
                  </span>
                )}
                {profile?.createdAt && (
                  <span>
                    <Clock size={12} />
                    Joined {fmtDate(profile.createdAt)}
                  </span>
                )}
              </div>
            </div>

            {/* ── CTA buttons ── */}
            <div className="tp-hero__actions">
              <button
                className="tp-hero__edit-btn"
                onClick={() => setShowEditModal(true)}>
                <Edit2 size={14} /> Edit Profile
              </button>
              <button
                className="tp-hero__pwd-btn"
                onClick={() => navigate("/change-password")}>
                <KeyRound size={14} /> Change Password
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════
            MAIN CONTENT GRID
        ══════════════════════════════ */}
        <div className="tp-main-grid">
          {/* ── LEFT COLUMN ── */}
          <div className="tp-col">
            {/* 2. Personal Information */}
            <SectionCard
              title="Personal Information"
              icon={User}
              action={
                <button
                  className="tp-section-edit-btn"
                  onClick={() => setShowEditModal(true)}>
                  <Edit2 size={12} /> Edit
                </button>
              }>
              <InfoRow
                icon={User}
                label="First Name"
                value={profile?.firstName}
              />
              <InfoRow
                icon={User}
                label="Last Name"
                value={profile?.lastName}
              />
              <InfoRow icon={Mail} label="Email" value={profile?.email} />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={profile?.phone}
                placeholder="Add your phone number"
              />
            </SectionCard>

            {/* 3. Professional Information */}
            <SectionCard title="Professional Information" icon={BookOpen}>
              <InfoRow
                icon={Award}
                label="Qualifications"
                value={profile?.qualifications}
                placeholder="e.g. B.Ed, M.Sc Mathematics"
              />
              <InfoRow
                icon={Briefcase}
                label="Experience"
                value={profile?.experience}
                placeholder="e.g. 5 years"
              />
              {/* Role information — context-aware */}
              <InfoRow
                icon={isMentor ? GraduationCap : BookMarked}
                label="Role Type"
                value={isMentor ? "Mentor Teacher" : "Subject Teacher"}
              />
            </SectionCard>

            {/* 4. Address Details */}
            <SectionCard title="Address Details" icon={MapPin}>
              <div className="tp-address-block">
                <div className="tp-address-card">
                  <div className="tp-address-card-header">
                    <span className="tp-address-card-icon">
                      <Home size={13} />
                    </span>
                    <span className="tp-address-card-title">
                      Permanent Address
                    </span>
                  </div>
                  {fmtAddress(profile?.permanentAddress) ? (
                    <p className="tp-address-card-body">
                      {fmtAddress(profile.permanentAddress)}
                    </p>
                  ) : (
                    <p className="tp-empty-text tp-address-empty">
                      <MapPin size={13} /> No permanent address added yet
                    </p>
                  )}
                </div>
                <div className="tp-address-card">
                  <div className="tp-address-card-header">
                    <span className="tp-address-card-icon">
                      <MapPin size={13} />
                    </span>
                    <span className="tp-address-card-title">
                      Current Address
                    </span>
                  </div>
                  {fmtAddress(profile?.currentAddress) ? (
                    <p className="tp-address-card-body">
                      {fmtAddress(profile.currentAddress)}
                    </p>
                  ) : (
                    <p className="tp-empty-text tp-address-empty">
                      <MapPin size={13} /> No current address added yet
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="tp-col">
            {/* 5. Profile Completion */}
            <SectionCard title="Profile Completion" icon={Activity}>
              <div className="tp-completion-wrap">
                {/* Progress bar + label */}
                <div className="tp-completion-header">
                  <span className="tp-completion-pct">{completion.pct}%</span>
                  <div className="tp-completion-meta">
                    <span className="tp-completion-title">
                      {completion.pct === 100
                        ? "Profile complete!"
                        : "Complete your profile"}
                    </span>
                    <span className="tp-completion-sub">
                      {completion.items.filter((i) => !i.done).length === 0
                        ? "All fields filled in."
                        : `${completion.items.filter((i) => !i.done).length} item${completion.items.filter((i) => !i.done).length > 1 ? "s" : ""} remaining`}
                    </span>
                  </div>
                </div>

                {/* Linear progress bar */}
                <div className="tp-completion-bar-wrap">
                  <div
                    className="tp-completion-bar"
                    style={{ width: `${completion.pct}%` }}
                  />
                </div>

                {/* Checklist items */}
                <div className="tp-completion-checklist">
                  {completion.items.map((item) => (
                    <div
                      key={item.key}
                      className={`tp-completion-item${item.done ? " tp-completion-item--done" : ""}`}>
                      {item.done ? (
                        <CheckCircle2 size={13} className="tp-check-icon" />
                      ) : (
                        <XCircle size={13} className="tp-x-icon" />
                      )}
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* CTA if not complete */}
                {completion.pct < 100 && (
                  <button
                    className="tp-completion-cta"
                    onClick={() => setShowEditModal(true)}>
                    <Edit2 size={13} /> Complete Profile
                  </button>
                )}
              </div>
            </SectionCard>

            {/* 6. Security Centre */}
            <SectionCard title="Security Centre" icon={ShieldCheck}>
              {/* Password protection */}
              <div className="tp-security-item">
                <div className="tp-security-icon tp-security-icon--ok">
                  <Lock size={15} />
                </div>
                <div className="tp-security-text">
                  <span className="tp-security-label">Password Protection</span>
                  <span className="tp-security-desc">
                    Password authentication is enabled
                  </span>
                </div>
                <span className="tp-security-badge tp-security-badge--ok">
                  Active
                </span>
              </div>

              {/* Role based access */}
              <div className="tp-security-item">
                <div className="tp-security-icon tp-security-icon--ok">
                  <ShieldCheck size={15} />
                </div>
                <div className="tp-security-text">
                  <span className="tp-security-label">Role-Based Access</span>
                  <span className="tp-security-desc">
                    {isMentor
                      ? "Full class management permissions active"
                      : "Subject teacher permissions active"}
                  </span>
                </div>
                <span className="tp-security-badge tp-security-badge--ok">
                  Active
                </span>
              </div>

              {/* Account status */}
              <div className="tp-security-item">
                <div className="tp-security-icon tp-security-icon--ok">
                  <BadgeCheck size={15} />
                </div>
                <div className="tp-security-text">
                  <span className="tp-security-label">Account Status</span>
                  <span className="tp-security-desc">
                    Your account is in good standing
                  </span>
                </div>
                <span className="tp-security-badge tp-security-badge--ok">
                  Active
                </span>
              </div>

              {/* Last login — placeholder until backend supports it */}
              <div className="tp-security-item">
                <div className="tp-security-icon tp-security-icon--pending">
                  <Clock size={15} />
                </div>
                <div className="tp-security-text">
                  <span className="tp-security-label">Last Login</span>
                  <span className="tp-security-desc">
                    {profile?.lastLoginAt
                      ? fmtDateTime(profile.lastLoginAt)
                      : "Session tracking not yet enabled"}
                  </span>
                </div>
                <span className="tp-security-badge tp-security-badge--pending">
                  {profile?.lastLoginAt ? "Recorded" : "Pending"}
                </span>
              </div>

              {/* Change password CTA */}
              <div className="tp-security-footer">
                <button
                  className="tp-pwd-btn"
                  onClick={() => navigate("/change-password")}>
                  <KeyRound size={13} /> Change Password
                </button>
              </div>
            </SectionCard>

            {/* 7. Account Information */}
            <SectionCard title="Account Information" icon={BadgeCheck}>
              <InfoRow
                icon={ShieldCheck}
                label="Teacher Code"
                value={profile?.teacherCode}
                mono
              />
              <InfoRow
                icon={BadgeCheck}
                label="Account Status"
                value="Active"
              />
              <InfoRow
                icon={Clock}
                label="Account Created"
                value={fmtDate(profile?.createdAt)}
              />
              <InfoRow
                icon={RefreshCw}
                label="Last Updated"
                value={fmtDate(profile?.updatedAt)}
              />
            </SectionCard>
          </div>
        </div>

        {/* ══════════════════════════════
            8. RECENT ACTIVITY TIMELINE
            (real data from profile timestamps only)
        ══════════════════════════════ */}
        <SectionCard title="Account Activity" icon={Clock}>
          <div className="tp-timeline">
            {profile?.updatedAt && (
              <div className="tp-timeline-item tp-timeline-item--blue">
                <div className="tp-timeline-node">
                  <Edit2 size={13} strokeWidth={2} />
                </div>
                <div className="tp-timeline-line" />
                <div className="tp-timeline-body">
                  <p className="tp-timeline-label">Profile last updated</p>
                  <p className="tp-timeline-time">
                    {fmtDate(profile.updatedAt)}
                  </p>
                </div>
              </div>
            )}

            {profile?.photoPath && (
              <div className="tp-timeline-item tp-timeline-item--indigo">
                <div className="tp-timeline-node">
                  <Camera size={13} strokeWidth={2} />
                </div>
                <div className="tp-timeline-line" />
                <div className="tp-timeline-body">
                  <p className="tp-timeline-label">Profile photo uploaded</p>
                  <p className="tp-timeline-time">Photo on file</p>
                </div>
              </div>
            )}

            {profile?.createdAt && (
              <div className="tp-timeline-item tp-timeline-item--green">
                <div className="tp-timeline-node">
                  <User size={13} strokeWidth={2} />
                </div>
                {/* No line after last item */}
                <div className="tp-timeline-body">
                  <p className="tp-timeline-label">Account created</p>
                  <p className="tp-timeline-time">
                    {fmtDate(profile.createdAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Placeholder row for last login */}
            <div className="tp-timeline-item tp-timeline-item--grey">
              <div className="tp-timeline-node">
                <AlertCircle size={13} strokeWidth={2} />
              </div>
              <div className="tp-timeline-body">
                <p className="tp-timeline-label">Last login tracking</p>
                <p className="tp-timeline-time">
                  Will be available in a future update
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ══════════════════════════════
          EDIT MODAL
      ══════════════════════════════ */}
      {showEditModal && (
        <Modal
          title="Edit Profile"
          onClose={() => setShowEditModal(false)}
          size="large">
          <div className="tp-edit-form">
            {/* Personal */}
            <p className="tp-edit-section-title">Personal Information</p>
            <div className="tp-edit-row">
              <FormGroup label="First Name *">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                  placeholder="First name"
                />
              </FormGroup>
              <FormGroup label="Last Name">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                  placeholder="Last name"
                />
              </FormGroup>
            </div>
            <FormGroup label="Phone">
              <input
                type="tel"
                className="tp-edit-input"
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="Phone number"
              />
            </FormGroup>

            {/* Professional */}
            <p className="tp-edit-section-title">Professional Information</p>
            <div className="tp-edit-row">
              <FormGroup label="Qualifications">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.qualifications}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, qualifications: e.target.value }))
                  }
                  placeholder="e.g. B.Ed, M.Sc Mathematics"
                />
              </FormGroup>
              <FormGroup label="Experience">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.experience}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, experience: e.target.value }))
                  }
                  placeholder="e.g. 5 years"
                />
              </FormGroup>
            </div>

            {/* Permanent Address */}
            <p className="tp-edit-section-title">
              <Home size={13} /> Permanent Address
            </p>
            <FormGroup label="Address Line">
              <input
                type="text"
                className="tp-edit-input"
                value={form.permanentAddress.addressLine}
                onChange={(e) =>
                  setAddr("permanentAddress", "addressLine", e.target.value)
                }
                placeholder="Street / House no."
              />
            </FormGroup>
            <div className="tp-edit-row">
              <FormGroup label="City">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.permanentAddress.city}
                  onChange={(e) =>
                    setAddr("permanentAddress", "city", e.target.value)
                  }
                  placeholder="City"
                />
              </FormGroup>
              <FormGroup label="State">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.permanentAddress.state}
                  onChange={(e) =>
                    setAddr("permanentAddress", "state", e.target.value)
                  }
                  placeholder="State"
                />
              </FormGroup>
            </div>
            <div className="tp-edit-row">
              <FormGroup label="Pincode">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.permanentAddress.pincode}
                  onChange={(e) =>
                    setAddr("permanentAddress", "pincode", e.target.value)
                  }
                  placeholder="Pincode"
                />
              </FormGroup>
              <FormGroup label="Country">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.permanentAddress.country}
                  onChange={(e) =>
                    setAddr("permanentAddress", "country", e.target.value)
                  }
                  placeholder="Country"
                />
              </FormGroup>
            </div>

            {/* Current Address */}
            <p className="tp-edit-section-title">
              <MapPin size={13} /> Current Address
            </p>
            <FormGroup label="Address Line">
              <input
                type="text"
                className="tp-edit-input"
                value={form.currentAddress.addressLine}
                onChange={(e) =>
                  setAddr("currentAddress", "addressLine", e.target.value)
                }
                placeholder="Street / House no."
              />
            </FormGroup>
            <div className="tp-edit-row">
              <FormGroup label="City">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.currentAddress.city}
                  onChange={(e) =>
                    setAddr("currentAddress", "city", e.target.value)
                  }
                  placeholder="City"
                />
              </FormGroup>
              <FormGroup label="State">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.currentAddress.state}
                  onChange={(e) =>
                    setAddr("currentAddress", "state", e.target.value)
                  }
                  placeholder="State"
                />
              </FormGroup>
            </div>
            <div className="tp-edit-row">
              <FormGroup label="Pincode">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.currentAddress.pincode}
                  onChange={(e) =>
                    setAddr("currentAddress", "pincode", e.target.value)
                  }
                  placeholder="Pincode"
                />
              </FormGroup>
              <FormGroup label="Country">
                <input
                  type="text"
                  className="tp-edit-input"
                  value={form.currentAddress.country}
                  onChange={(e) =>
                    setAddr("currentAddress", "country", e.target.value)
                  }
                  placeholder="Country"
                />
              </FormGroup>
            </div>

            {/* Modal actions */}
            <div className="tp-edit-actions">
              <button
                className="tp-edit-cancel"
                onClick={() => setShowEditModal(false)}
                disabled={saving}>
                <X size={14} /> Cancel
              </button>
              <button
                className="tp-edit-save"
                onClick={handleSave}
                disabled={saving}>
                {saving ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={14} /> Save Changes
                  </>
                )}
              </button>
            </div>
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
