import { Radar } from 'lucide-react';
export default function EmptyState({ title = "You're not monitoring any websites yet.", text = 'Add your first website and SitePilot will start building its change history.', action }) {
  return <div className="empty-state">
    <div className="empty-icon"><Radar size={28} /></div>
    <h3>{title}</h3>
    <p>{text}</p>
    {action}
  </div>;
}
