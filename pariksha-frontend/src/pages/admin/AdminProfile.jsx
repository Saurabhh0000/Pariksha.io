import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  ShieldCheck,
  BadgeCheck,
  Clock,
  UserCog,
  KeyRound,
  RefreshCw,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  CheckCircle2,
  Lock,
  Activity,
} from "lucide-react";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import AdminLayout from "../../components/admin/AdminLayout";
import { getMyProfile } from "../../services/profileService";
import "./AdminProfile.css";

// Generates two-letter initials from an email address
const getInitials = (email) => {
  if (!email) return "AD";
  const namePart = email.split("@")[0];
  const parts = namePart.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return namePart.slice(0, 2).toUpperCase();
};

// Formats ROLE_ADMIN -> Administrator style label
const formatRole = (role) => {
  if (!role) return "Not available";
  return (
    role.replace("ROLE_", "").charAt(0).toUpperCase() +
    role.replace("ROLE_", "").slice(1).toLowerCase()
  );
};

// Small reusable stat card for the overview grid
const StatCard = ({ icon, label, value, valueClassName = "" }) => (
  <div className="profile-stat-card">
    <div className="profile-stat-icon">{icon}</div>
    <div className="profile-stat-content">
      <span className="profile-stat-label">{label}</span>
      <span className={`profile-stat-value ${valueClassName}`}>{value}</span>
    </div>
  </div>
);

// Reusable row for the account information card
const InfoRow = ({ icon, label, children }) => (
  <div className="profile-info-row">
    <div className="profile-info-label">
      <span className="profile-info-icon">{icon}</span>
      {label}
    </div>
    <div className="profile-info-value">{children}</div>
  </div>
);

// Permission chip for the permissions grid
const PermissionChip = ({ icon, label }) => (
  <div className="permission-chip">
    <CheckCircle2 size={14} className="permission-chip-check" />
    <span className="permission-chip-icon">{icon}</span>
    {label}
  </div>
);

// Security item row with success indicator
const SecurityItem = ({ icon, label, description }) => (
  <div className="security-item">
    <div className="security-item-icon">{icon}</div>
    <div className="security-item-text">
      <span className="security-item-label">{label}</span>
      <span className="security-item-desc">{description}</span>
    </div>
    <span className="security-badge">
      <CheckCircle2 size={14} />
      Active
    </span>
  </div>
);

const AdminProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await getMyProfile();
      setProfile(res.data.data);

      if (isRefresh) {
        setToast({ message: "Profile refreshed.", type: "success" });
      }
    } catch (err) {
      setToast({ message: "Failed to load profile.", type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Profile">
        <div className="admin-profile-loading">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  const statusValue = profile?.status || "Not available";
  const isActive = profile?.status?.toUpperCase() === "ACTIVE";

  return (
    <AdminLayout title="Profile">
      <div className="admin-profile-page">
        {/* Hero section */}
        <div className="profile-hero-card">
          <div className="profile-hero-left">
            <div className="profile-hero-avatar">
              {getInitials(profile?.email)}
            </div>
            <div className="profile-hero-info">
              <h1 className="profile-hero-title">Administrator</h1>
              <span className="profile-hero-email">{profile?.email}</span>
              <span
                className={`profile-hero-badge ${
                  isActive
                    ? "profile-hero-badge-active"
                    : "profile-hero-badge-inactive"
                }`}>
                <span className="profile-hero-badge-dot" />
                {statusValue}
              </span>
            </div>
          </div>

          <div className="profile-hero-actions">
            <button
              className="profile-action-btn profile-action-btn-primary"
              onClick={() => navigate("/change-password")}>
              <KeyRound size={16} />
              Change Password
            </button>
            <button
              className="profile-action-btn profile-action-btn-secondary"
              onClick={() => fetchProfile(true)}
              disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? "spin-icon" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Account overview stat cards */}
        <div className="profile-stats-grid">
          <StatCard
            icon={<ShieldCheck size={20} />}
            label="Role"
            value={formatRole(profile?.role)}
          />
          <StatCard
            icon={<BadgeCheck size={20} />}
            label="Account Status"
            value={statusValue}
            valueClassName={isActive ? "stat-value-active" : ""}
          />
          <StatCard
            icon={<Clock size={20} />}
            label="Last Login"
            value="Not available"
            valueClassName="stat-value-muted"
          />
          <StatCard
            icon={<UserCog size={20} />}
            label="Account Type"
            value="Not available"
            valueClassName="stat-value-muted"
          />
        </div>

        {/* Account information */}
        <div className="profile-section-card">
          <h2 className="profile-section-title">Account Information</h2>

          <InfoRow icon={<Mail size={16} />} label="Email">
            {profile?.email}
          </InfoRow>

          <InfoRow icon={<ShieldCheck size={16} />} label="Role">
            {formatRole(profile?.role)}
          </InfoRow>

          <InfoRow icon={<BadgeCheck size={16} />} label="Status">
            <span
              className={`profile-status-pill ${
                isActive
                  ? "profile-status-pill-active"
                  : "profile-status-pill-inactive"
              }`}>
              {statusValue}
            </span>
          </InfoRow>
        </div>

        {/* Permissions */}
        <div className="profile-section-card">
          <h2 className="profile-section-title">Permissions</h2>
          <div className="permissions-grid">
            <PermissionChip
              icon={<Users size={14} />}
              label="Manage Teachers"
            />
            <PermissionChip
              icon={<GraduationCap size={14} />}
              label="Manage Students"
            />
            <PermissionChip
              icon={<Layers size={14} />}
              label="Manage Classes"
            />
            <PermissionChip
              icon={<BookOpen size={14} />}
              label="Manage Question Bank"
            />
            <PermissionChip
              icon={<CheckCircle2 size={14} />}
              label="Approve Registrations"
            />
          </div>
        </div>

        {/* Security overview */}
        <div className="profile-section-card">
          <h2 className="profile-section-title">Security Overview</h2>
          <div className="security-list">
            <SecurityItem
              icon={<Lock size={18} />}
              label="Account Protected"
              description="Password authentication enabled"
            />
            <SecurityItem
              icon={<ShieldCheck size={18} />}
              label="Role Based Access"
              description="Admin permissions enforced platform-wide"
            />
            <SecurityItem
              icon={<Activity size={18} />}
              label="Session Active"
              description="You are currently signed in"
            />
          </div>
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
