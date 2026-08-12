export default function Loading({ fullscreen = false, label = 'Loading…' }) {
  return <div className={fullscreen ? 'loading-screen' : 'loading-inline'}>
    <div className="spinner" />
    <span>{label}</span>
  </div>;
}

export function SkeletonCards({ count = 4 }) {
  return <div className="stats-grid">{Array.from({ length: count }).map((_, i) => <div key={i} className="skeleton-card"><div /><div /><div /></div>)}</div>;
}
