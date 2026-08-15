import { Link } from "react-router-dom";
import { TrendingUp, ArrowUpRight, AlertCircle } from "lucide-react";

export default function StatCard({ stat, index }) {
  const {
    label,
    value,
    icon: Icon,
    color,
    bg,
    trend,
    action,
    actionLabel,
    alert,
  } = stat;

  return (
    <div
      className={`ad-stat-card${alert ? " ad-stat-alert" : ""}`}
      style={{ animationDelay: `${index * 0.08}s` }}>
      {alert && (
        <div className="ad-stat-alert-badge">
          <AlertCircle size={12} strokeWidth={2.5} />
          Needs attention
        </div>
      )}

      <div className="ad-stat-top">
        <div className="ad-stat-icon" style={{ background: bg, color }}>
          <Icon size={22} strokeWidth={1.8} />
        </div>
        <span className="ad-stat-label">{label}</span>
      </div>

      <div className="ad-stat-value" style={{ color }}>
        {value}
      </div>

      <div className="ad-stat-bottom">
        {trend && (
          <span className="ad-stat-trend">
            <TrendingUp size={12} strokeWidth={2.5} />
            {trend}
          </span>
        )}
        <Link to={action} className="ad-stat-action" style={{ color }}>
          {actionLabel}
          <ArrowUpRight size={13} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
