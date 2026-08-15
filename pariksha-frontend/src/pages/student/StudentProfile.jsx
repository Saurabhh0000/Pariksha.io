import { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Users,
  Camera,
  AlertCircle,
  RefreshCw,
  Save,
  CheckCircle2,
  Edit3,
  X,
  Hash,
  GraduationCap,
} from "lucide-react";
import StudentLayout from "../../components/student/StudentLayout";
import studentService from "../../services/studentService";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import "./StudentProfile.css";

function getInitials(firstName, lastName) {
  const f = firstName?.[0] || "";
  const l = lastName?.[0] || "";
  return (f + l).toUpperCase() || "ST";
}

function getProfileCompletion(profile) {
  const fields = [
    { key: "phone", label: "Phone" },
    { key: "photoPath", label: "Photo" },
    { key: "fatherName", label: "Father's Name" },
    { key: "fatherContact", label: "Father's Contact" },
    { key: "motherName", label: "Mother's Name" },
    {
      key: "permanentAddress",
      label: "Permanent Address",
      check: (v) => v?.addressLine,
    },
    {
      key: "currentAddress",
      label: "Current Address",
      check: (v) => v?.addressLine,
    },
  ];
  const filled = fields.map((f) => ({
    label: f.label,
    done: f.check
      ? Boolean(f.check(profile?.[f.key]))
      : Boolean(profile?.[f.key]),
  }));
  const pct = Math.round(
    (filled.filter((f) => f.done).length / fields.length) * 100,
  );
  return { pct, checklist: filled };
}

function emptyAddress() {
  return {
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    addressType: "",
  };
}

// ─────────────────────────────────────────────
//  Loading skeleton
// ─────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <>
      <div className="spf-skel-hero" />
      <div className="spf-skel-card" />
      <div className="spf-skel-card" />
    </>
  );
}

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    firstName: "",
    phone: "",
    fatherName: "",
    fatherContact: "",
    motherName: "",
    permanentAddress: emptyAddress(),
    currentAddress: emptyAddress(),
  });

  const loadProfile = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await studentService.getProfile();
      const data = res.data.data;
      setProfile(data);
      setForm({
        firstName: data.firstName || "",
        phone: data.phone || "",
        fatherName: data.fatherName || "",
        fatherContact: data.fatherContact || "",
        motherName: data.motherName || "",
        permanentAddress: data.permanentAddress || emptyAddress(),
        currentAddress: data.currentAddress || emptyAddress(),
      });
      if (isRetry) {
        setToast({
          type: "success",
          message: "Profile refreshed successfully 🚀",
        });
      }
    } catch (err) {
      const isNetworkIssue = !err?.response;
      setError(
        isNetworkIssue
          ? "Connection problem. Check your internet and retry."
          : "Unable to load your profile.",
      );
      if (isRetry) {
        setToast({
          type: "error",
          message: isNetworkIssue
            ? "Connection problem. Check your internet and retry."
            : "Unable to load your profile.",
        });
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    loadProfile(false);
  }, [loadProfile]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateAddressField(addrKey, field, value) {
    setForm((prev) => ({
      ...prev,
      [addrKey]: { ...prev[addrKey], [field]: value },
    }));
  }

  function cancelEdit() {
    setForm({
      firstName: profile.firstName || "",
      phone: profile.phone || "",
      fatherName: profile.fatherName || "",
      fatherContact: profile.fatherContact || "",
      motherName: profile.motherName || "",
      permanentAddress: profile.permanentAddress || emptyAddress(),
      currentAddress: profile.currentAddress || emptyAddress(),
    });
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName,
        phone: form.phone,
        fatherName: form.fatherName,
        fatherContact: form.fatherContact,
        motherName: form.motherName,
        permanentAddress: form.permanentAddress,
        currentAddress: form.currentAddress,
      };
      const res = await studentService.updateProfile(payload);
      setProfile(res.data.data);
      setEditing(false);
      setToast({ type: "success", message: "Profile updated successfully 🚀" });
    } catch (err) {
      const isNetworkIssue = !err?.response;
      setToast({
        type: "error",
        message: isNetworkIssue
          ? "Connection problem. Check your internet and retry."
          : "Unable to update your profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToast({
        type: "error",
        message: "Only image files are allowed (JPG, PNG, etc.).",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: "error", message: "Photo size must not exceed 2MB." });
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await studentService.uploadPhoto(formData);
      setProfile((prev) => ({ ...prev, photoPath: res.data.data }));
      setToast({ type: "success", message: "Photo uploaded successfully 🚀" });
    } catch (err) {
      const isNetworkIssue = !err?.response;
      setToast({
        type: "error",
        message: isNetworkIssue
          ? "Connection problem. Check your internet and retry."
          : "Failed to upload photo. Please try again.",
      });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <StudentLayout title="Profile">
        <ProfileSkeleton />
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout title="Profile">
        <div className="spf-error-state">
          <div className="spf-error-icon">
            <AlertCircle size={32} strokeWidth={1.6} />
          </div>
          <h3>Unable to load your profile 😔</h3>
          <p>We couldn't fetch your profile details.</p>
          <span className="spf-error-sub">
            Your data is safe. Please retry.
          </span>
          <button
            className="spf-retry-btn"
            onClick={() => loadProfile(true)}
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
      </StudentLayout>
    );
  }

  const { pct, checklist } = getProfileCompletion(profile);
  const fullName =
    `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
  const classLine = profile.className
    ? `Class ${profile.className}${profile.section ? " - " + profile.section : ""}`
    : null;

  return (
    <StudentLayout title="Profile">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── HERO ── */}
      <div className="spf-hero">
        <div className="spf-hero-decor" aria-hidden="true" />
        <div className="spf-hero-content">
          <div className="spf-avatar-wrap">
            <div className="spf-avatar">
              {profile.photoPath ? (
                <img
                  src={`http://localhost:8080/${profile.photoPath}`}
                  alt=""
                />
              ) : (
                <span>{getInitials(profile.firstName, profile.lastName)}</span>
              )}
            </div>
            <button
              className="spf-avatar-edit-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label="Change photo">
              {uploadingPhoto ? (
                <Spinner size="small" color="#fff" />
              ) : (
                <Camera size={14} strokeWidth={2.2} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="spf-file-input"
              onChange={handlePhotoSelect}
            />
          </div>

          <div className="spf-hero-info">
            <h1 className="spf-hero-name">{fullName || "Student"}</h1>
            <div className="spf-hero-meta">
              {profile.studentRollCode && (
                <span className="spf-hero-chip">
                  <Hash size={12} strokeWidth={2.2} /> {profile.studentRollCode}
                </span>
              )}
              {classLine && (
                <span className="spf-hero-chip">
                  <GraduationCap size={12} strokeWidth={2.2} /> {classLine}
                </span>
              )}
              {profile.status && (
                <span className="spf-hero-chip spf-hero-chip-status">
                  {profile.status}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="spf-completion">
          <div className="spf-completion-header">
            <span>Profile Completion</span>
            <span className="spf-completion-pct">{pct}%</span>
          </div>
          <div className="spf-completion-track">
            <div className="spf-completion-bar" style={{ width: `${pct}%` }} />
          </div>
          <div className="spf-completion-checklist">
            {checklist.map((item) => (
              <span
                key={item.label}
                className={`spf-check-item${item.done ? " spf-check-done" : ""}`}>
                <CheckCircle2 size={11} strokeWidth={2.5} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PERSONAL INFO ── */}
      <div className="spf-card">
        <div className="spf-card-header">
          <div className="spf-card-title-wrap">
            <User size={17} strokeWidth={2} />
            <h2 className="spf-card-title">Personal Information</h2>
          </div>
          {!editing ? (
            <button className="spf-edit-btn" onClick={() => setEditing(true)}>
              <Edit3 size={14} strokeWidth={2.2} /> Edit
            </button>
          ) : (
            <div className="spf-edit-actions">
              <button
                className="spf-cancel-btn"
                onClick={cancelEdit}
                disabled={saving}>
                <X size={14} strokeWidth={2.2} /> Cancel
              </button>
              <button
                className="spf-save-btn"
                onClick={handleSave}
                disabled={saving}>
                {saving ? (
                  <Spinner size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={14} strokeWidth={2.2} /> Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="spf-field-grid">
          <div className="spf-field">
            <label className="spf-label">First Name</label>
            {editing ? (
              <input
                className="spf-input"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
              />
            ) : (
              <span className="spf-value">{profile.firstName || "–"}</span>
            )}
          </div>

          <div className="spf-field">
            <label className="spf-label">Last Name</label>
            <span className="spf-value spf-value-locked">
              {profile.lastName || "–"}
            </span>
          </div>

          <div className="spf-field">
            <label className="spf-label">
              <Mail size={12} strokeWidth={2} /> Email
            </label>
            <span className="spf-value spf-value-locked">
              {profile.email || "–"}
            </span>
          </div>

          <div className="spf-field">
            <label className="spf-label">
              <Phone size={12} strokeWidth={2} /> Phone
            </label>
            {editing ? (
              <input
                type="tel"
                className="spf-input"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Enter phone number"
              />
            ) : (
              <span className="spf-value">{profile.phone || "–"}</span>
            )}
          </div>

          <div className="spf-field">
            <label className="spf-label">Gender</label>
            <span className="spf-value spf-value-locked">
              {profile.gender || "–"}
            </span>
          </div>

          <div className="spf-field">
            <label className="spf-label">Roll Code</label>
            <span className="spf-value spf-value-locked">
              {profile.studentRollCode || "–"}
            </span>
          </div>
        </div>
      </div>

      {/* ── PARENT / GUARDIAN INFO ── */}
      <div className="spf-card">
        <div className="spf-card-header">
          <div className="spf-card-title-wrap">
            <Users size={17} strokeWidth={2} />
            <h2 className="spf-card-title">Parent / Guardian Details</h2>
          </div>
        </div>

        <div className="spf-field-grid">
          <div className="spf-field">
            <label className="spf-label">Father's Name</label>
            {editing ? (
              <input
                className="spf-input"
                value={form.fatherName}
                onChange={(e) => updateField("fatherName", e.target.value)}
                placeholder="Enter father's name"
              />
            ) : (
              <span className="spf-value">{profile.fatherName || "–"}</span>
            )}
          </div>

          <div className="spf-field">
            <label className="spf-label">Father's Contact</label>
            {editing ? (
              <input
                type="tel"
                className="spf-input"
                value={form.fatherContact}
                onChange={(e) => updateField("fatherContact", e.target.value)}
                placeholder="Enter father's contact"
              />
            ) : (
              <span className="spf-value">{profile.fatherContact || "–"}</span>
            )}
          </div>

          <div className="spf-field">
            <label className="spf-label">Mother's Name</label>
            {editing ? (
              <input
                className="spf-input"
                value={form.motherName}
                onChange={(e) => updateField("motherName", e.target.value)}
                placeholder="Enter mother's name"
              />
            ) : (
              <span className="spf-value">{profile.motherName || "–"}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── ADDRESSES ── */}
      <div className="spf-card">
        <div className="spf-card-header">
          <div className="spf-card-title-wrap">
            <MapPin size={17} strokeWidth={2} />
            <h2 className="spf-card-title">Address</h2>
          </div>
        </div>

        <div className="spf-address-grid">
          {["permanentAddress", "currentAddress"].map((addrKey) => {
            const label =
              addrKey === "permanentAddress"
                ? "Permanent Address"
                : "Current Address";
            const addr = editing ? form[addrKey] : profile[addrKey];
            return (
              <div key={addrKey} className="spf-address-block">
                <span className="spf-address-label">{label}</span>
                {editing ? (
                  <div className="spf-address-form">
                    <input
                      className="spf-input"
                      placeholder="Address line"
                      value={form[addrKey]?.addressLine || ""}
                      onChange={(e) =>
                        updateAddressField(
                          addrKey,
                          "addressLine",
                          e.target.value,
                        )
                      }
                    />
                    <div className="spf-address-row">
                      <input
                        className="spf-input"
                        placeholder="City"
                        value={form[addrKey]?.city || ""}
                        onChange={(e) =>
                          updateAddressField(addrKey, "city", e.target.value)
                        }
                      />
                      <input
                        className="spf-input"
                        placeholder="State"
                        value={form[addrKey]?.state || ""}
                        onChange={(e) =>
                          updateAddressField(addrKey, "state", e.target.value)
                        }
                      />
                    </div>
                    <div className="spf-address-row">
                      <input
                        className="spf-input"
                        placeholder="Pincode"
                        value={form[addrKey]?.pincode || ""}
                        onChange={(e) =>
                          updateAddressField(addrKey, "pincode", e.target.value)
                        }
                      />
                      <input
                        className="spf-input"
                        placeholder="Country"
                        value={form[addrKey]?.country || ""}
                        onChange={(e) =>
                          updateAddressField(addrKey, "country", e.target.value)
                        }
                      />
                    </div>
                  </div>
                ) : addr?.addressLine ? (
                  <p className="spf-address-text">
                    {addr.addressLine}, {addr.city}, {addr.state} {addr.pincode}
                    , {addr.country}
                  </p>
                ) : (
                  <p className="spf-address-empty">No address added yet</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </StudentLayout>
  );
}
