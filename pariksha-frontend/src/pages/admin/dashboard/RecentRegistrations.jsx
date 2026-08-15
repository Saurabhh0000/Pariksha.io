import { Link } from "react-router-dom";
import { UserPlus, GraduationCap, Users } from "lucide-react";

/**
 * Recent Registrations — sorted by id descending as a recency proxy
 * since TeacherResponse/StudentResponse don't currently expose createdAt.
 * Backend enhancement note: add `createdAt` to these DTOs for true
 * chronological ordering.
 */
export default function RecentRegistrations({ teachers, students }) {
  const recentTeachers = [...teachers].sort((a, b) => b.id - a.id).slice(0, 4);
  const recentStudents = [...students]
    .filter((s) => s.status === "ACTIVE")
    .sort((a, b) => b.id - a.id)
    .slice(0, 4);

  const hasAny = recentTeachers.length > 0 || recentStudents.length > 0;

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <div className="ad-card-title-wrap">
          <UserPlus size={17} strokeWidth={2} color="var(--admin-primary)" />
          <h3 className="ad-card-title">Recent Registrations</h3>
        </div>
      </div>

      {!hasAny ? (
        <div className="ad-empty">
          <Users size={32} strokeWidth={1.4} />
          <p>No registrations yet</p>
        </div>
      ) : (
        <div className="ad-registrations-grid">
          <div className="ad-reg-col">
            <p className="ad-reg-col-title">
              <GraduationCap size={13} strokeWidth={2} />
              Students
            </p>
            {recentStudents.length === 0 ? (
              <p className="ad-reg-empty">No active students yet</p>
            ) : (
              recentStudents.map((s) => (
                <div key={s.id} className="ad-reg-item">
                  <div
                    className="ad-reg-avatar"
                    style={{ background: "#EAF4F0", color: "#1D9E75" }}>
                    {s.firstName?.charAt(0)?.toUpperCase()}
                    {s.lastName?.charAt(0)?.toUpperCase() || ""}
                  </div>
                  <div className="ad-reg-info">
                    <p className="ad-reg-name">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="ad-reg-sub">
                      Class {s.className}-{s.section} · {s.studentRollCode}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="ad-reg-col">
            <p className="ad-reg-col-title">
              <Users size={13} strokeWidth={2} />
              Teachers
            </p>
            {recentTeachers.length === 0 ? (
              <p className="ad-reg-empty">No teachers yet</p>
            ) : (
              recentTeachers.map((t) => (
                <div key={t.id} className="ad-reg-item">
                  <div
                    className="ad-reg-avatar"
                    style={{
                      background: "var(--admin-accent)",
                      color: "var(--admin-text)",
                    }}>
                    {t.firstName?.charAt(0)?.toUpperCase()}
                    {t.lastName?.charAt(0)?.toUpperCase() || ""}
                  </div>
                  <div className="ad-reg-info">
                    <p className="ad-reg-name">
                      {t.firstName} {t.lastName}
                    </p>
                    <p className="ad-reg-sub">{t.teacherCode}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <Link
        to="/admin/teachers"
        className="ad-card-link"
        style={{ marginTop: 14, display: "inline-flex" }}>
        View all people
      </Link>
    </div>
  );
}
