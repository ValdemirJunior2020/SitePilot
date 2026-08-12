export default function StatCard({ icon: Icon, label, value, note }) {
  return <div className="stat-card">
    <div className="stat-icon">{Icon ? <Icon size={20} /> : null}</div>
    <div><p>{label}</p><strong>{value ?? 0}</strong>{note && <span>{note}</span>}</div>
  </div>;
}
