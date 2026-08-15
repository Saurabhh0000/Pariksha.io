import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  Users2,
  BookOpenCheck,
  ArrowUpRight,
} from "lucide-react";

/**
 * School Health Card — derived entirely from already-fetched
 * classes + pendingStudents arrays. No new API calls.
 */
export default function SchoolHealthCard({ classes, pendingCount }) {
  const total = classes.length;
  const withMentor = classes.filter((c) => c.mentorTeacherName).length;
  const withoutMentor = total - withMentor;
  const unassignedSubjects = classes.filter(
    (c) => !c.subjectTeachers || c.subjectTeachers.length === 0,
  ).length;

  const healthScore =
    total === 0
      ? 100
      : Math.round(
          ((withMentor + (total - unassignedSubjects)) / (total * 2)) * 100,
        );

  const healthLabel =
    healthScore >= 85
      ? "Excellent"
      : healthScore >= 60
        ? "Good"
        : healthScore >= 35
          ? "Needs Attention"
          : "Critical";

  const healthColor =
    healthScore >= 85
      ? "#1D9E75"
      : healthScore >= 60
        ? "#185FA5"
        : healthScore >= 35
          ? "#D69E2E"
          : "#E53E3E";

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <div className="ad-card-title-wrap">
          <ShieldCheck size={17} strokeWidth={2} color="var(--admin-primary)" />
          <h3 className="ad-card-title">School Health</h3>
        </div>
        <span className="ad-health-score" style={{ color: healthColor }}>
          {healthLabel}
        </span>
      </div>

      {total === 0 ? (
        <div className="ad-empty">
          <ShieldAlert size={32} strokeWidth={1.4} />
          <p>
            No classes yet — health metrics will appear once classes are
            created.
          </p>
          <Link to="/admin/classes" className="ad-empty-cta">
            Create First Class
          </Link>
        </div>
      ) : (
        <div className="ad-health-grid">
          <div className="ad-health-item">
            <div
              className="ad-health-icon"
              style={{ background: "#EAF4F0", color: "#1D9E75" }}>
              <ShieldCheck size={18} strokeWidth={1.8} />
            </div>
            <div className="ad-health-info">
              <p className="ad-health-value">
                {withMentor}
                <span>/{total}</span>
              </p>
              <p className="ad-health-label">Classes with mentor</p>
            </div>
          </div>

          <div className="ad-health-item">
            <div
              className="ad-health-icon"
              style={{
                background: withoutMentor > 0 ? "#FFFBEB" : "#EAF4F0",
                color: withoutMentor > 0 ? "#D69E2E" : "#1D9E75",
              }}>
              <ShieldAlert size={18} strokeWidth={1.8} />
            </div>
            <div className="ad-health-info">
              <p className="ad-health-value">{withoutMentor}</p>
              <p className="ad-health-label">Missing mentor</p>
            </div>
          </div>

          <div className="ad-health-item">
            <div
              className="ad-health-icon"
              style={{
                background: unassignedSubjects > 0 ? "#FFFBEB" : "#EAF4F0",
                color: unassignedSubjects > 0 ? "#D69E2E" : "#1D9E75",
              }}>
              <BookOpenCheck size={18} strokeWidth={1.8} />
            </div>
            <div className="ad-health-info">
              <p className="ad-health-value">{unassignedSubjects}</p>
              <p className="ad-health-label">No subject teachers</p>
            </div>
          </div>

          <div className="ad-health-item">
            <div
              className="ad-health-icon"
              style={{
                background: pendingCount > 0 ? "#FFFBEB" : "#EAF4F0",
                color: pendingCount > 0 ? "#D69E2E" : "#1D9E75",
              }}>
              <Users2 size={18} strokeWidth={1.8} />
            </div>
            <div className="ad-health-info">
              <p className="ad-health-value">{pendingCount}</p>
              <p className="ad-health-label">Pending approvals</p>
            </div>
          </div>
        </div>
      )}

      {(withoutMentor > 0 || unassignedSubjects > 0 || pendingCount > 0) && (
        <Link
          to="/admin/classes"
          className="ad-card-link ad-health-footer-link">
          Review classes <ArrowUpRight size={13} strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}
