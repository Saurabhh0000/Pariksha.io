import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, UserX, BookX } from "lucide-react";

/**
 * Attention Required — a real-time snapshot of items that need
 * admin action, derived from current classes + pending students.
 * This is NOT a historical log (no audit-log backend exists yet);
 * it's a live "what needs doing right now" list.
 */
export default function AttentionPanel({ classes, pendingStudents }) {
  const items = [];

  if (pendingStudents.length > 0) {
    items.push({
      icon: Clock,
      color: "#D69E2E",
      bg: "#FFFBEB",
      title: `${pendingStudents.length} student${pendingStudents.length > 1 ? "s" : ""} awaiting approval`,
      desc:
        pendingStudents
          .slice(0, 3)
          .map((s) => `${s.firstName} ${s.lastName}`)
          .join(", ") +
        (pendingStudents.length > 3
          ? ` +${pendingStudents.length - 3} more`
          : ""),
      action: "/admin/pending",
      actionLabel: "Review",
    });
  }

  const mentorless = classes.filter((c) => !c.mentorTeacherName);
  if (mentorless.length > 0) {
    items.push({
      icon: UserX,
      color: "#E53E3E",
      bg: "#FFF5F5",
      title: `${mentorless.length} class${mentorless.length > 1 ? "es" : ""} without a mentor`,
      desc: mentorless
        .slice(0, 4)
        .map((c) => `${c.className}-${c.section}`)
        .join(", "),
      action: "/admin/classes",
      actionLabel: "Assign",
    });
  }

  const noSubjects = classes.filter(
    (c) => !c.subjectTeachers || c.subjectTeachers.length === 0,
  );
  if (noSubjects.length > 0) {
    items.push({
      icon: BookX,
      color: "#185FA5",
      bg: "#E6F1FB",
      title: `${noSubjects.length} class${noSubjects.length > 1 ? "es" : ""} with no subject teachers`,
      desc: noSubjects
        .slice(0, 4)
        .map((c) => `${c.className}-${c.section}`)
        .join(", "),
      action: "/admin/classes",
      actionLabel: "Assign",
    });
  }

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <div className="ad-card-title-wrap">
          <AlertTriangle size={17} strokeWidth={2} color="#D69E2E" />
          <h3 className="ad-card-title">Attention Required</h3>
        </div>
        {items.length > 0 && (
          <span className="ad-attention-count">{items.length}</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="ad-empty ad-empty-good">
          <CheckCircle2 size={32} strokeWidth={1.4} color="#38A169" />
          <p>Everything looks good. No action needed right now.</p>
        </div>
      ) : (
        <div className="ad-attention-list">
          {items.map((item, i) => (
            <div
              key={i}
              className="ad-attention-item"
              style={{ animationDelay: `${i * 0.06}s` }}>
              <div
                className="ad-attention-icon"
                style={{ background: item.bg, color: item.color }}>
                <item.icon size={16} strokeWidth={2} />
              </div>
              <div className="ad-attention-info">
                <p className="ad-attention-title">{item.title}</p>
                {item.desc && <p className="ad-attention-desc">{item.desc}</p>}
              </div>
              <Link
                to={item.action}
                className="ad-attention-action"
                style={{ color: item.color }}>
                {item.actionLabel}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
