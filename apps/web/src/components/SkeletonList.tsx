export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}
