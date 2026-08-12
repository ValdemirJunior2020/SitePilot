import { Activity, BarChart3, LayoutDashboard, Settings, X, Globe2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import Brand from './Brand';

const links = [
  ['/dashboard', LayoutDashboard, 'Dashboard', true],
  ['/dashboard/sites', Globe2, 'Websites'],
  ['/dashboard/activity', Activity, 'Activity'],
  ['/dashboard/reports', BarChart3, 'Reports'],
  ['/dashboard/settings', Settings, 'Settings']
];

export default function Sidebar({ open, onClose }) {
  return <>
    {open && <div className="drawer-overlay" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top"><Brand light /><button className="sidebar-close" onClick={onClose}><X size={20} /></button></div>
      <nav>{links.map(([to, Icon, label, end]) => <NavLink key={to} to={to} end={Boolean(end)} onClick={onClose} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-foot"><span className="pulse-dot" /><div><strong>Monitoring ready</strong><small>Secure scan engine</small></div></div>
    </aside>
  </>;
}
