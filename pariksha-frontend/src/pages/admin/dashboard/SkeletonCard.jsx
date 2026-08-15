export function SkeletonStatCard({ delay = 0 }) {
  return (
    <div className="ad-skeleton-stat" style={{ animationDelay: `${delay}s` }}>
      <div className="ad-skeleton-circle" />
      <div className="ad-skeleton-line ad-skeleton-line-sm" />
      <div className="ad-skeleton-line ad-skeleton-line-lg" />
      <div className="ad-skeleton-line ad-skeleton-line-md" />
    </div>
  );
}

export function SkeletonListItem({ delay = 0 }) {
  return (
    <div
      className="ad-skeleton-list-item"
      style={{ animationDelay: `${delay}s` }}>
      <div className="ad-skeleton-circle ad-skeleton-circle-sm" />
      <div className="ad-skeleton-list-text">
        <div className="ad-skeleton-line ad-skeleton-line-md" />
        <div className="ad-skeleton-line ad-skeleton-line-sm" />
      </div>
    </div>
  );
}

export function SkeletonCard({ rows = 4 }) {
  return (
    <div className="ad-card">
      <div className="ad-skeleton-header">
        <div className="ad-skeleton-circle ad-skeleton-circle-sm" />
        <div className="ad-skeleton-line ad-skeleton-line-md" />
      </div>
      <div className="ad-list">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonListItem key={i} delay={i * 0.05} />
        ))}
      </div>
    </div>
  );
}
