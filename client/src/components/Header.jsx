import { LogOut, Menu, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ title, subtitle, onMenu, primaryAction }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = user?.displayName || user?.email?.split('@')[0] || 'User';
  return <header className="app-header">
    <div className="header-title"><button className="mobile-menu" onClick={onMenu}><Menu size={21} /></button><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div>
    <div className="header-actions">
      {primaryAction && <button className="btn btn-primary header-add" onClick={primaryAction.onClick}><Plus size={17} />{primaryAction.label}</button>}
      <div className="user-chip"><span>{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>{user?.email}</small></div></div>
      <button className="icon-btn logout-btn" title="Logout" onClick={async () => { await logout(); navigate('/login'); }}><LogOut size={19} /></button>
    </div>
  </header>;
}
