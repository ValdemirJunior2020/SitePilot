import {
  Activity,
  BarChart3,
  CircleHelp,
  Headphones,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
  X,
  Globe2
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import Brand from './Brand'
import { useAuth } from '../context/AuthContext'

const links = [
  ['/dashboard', LayoutDashboard, 'Dashboard', true],
  ['/dashboard/sites', Globe2, 'Websites'],
  ['/dashboard/price-watch', ShoppingBag, 'Price Watch', false, 'New'],
  ['/dashboard/activity', Activity, 'Activity'],
  ['/dashboard/reports', BarChart3, 'Reports'],
  ['/dashboard/settings', Settings, 'Settings']
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const name = user?.displayName || user?.email?.split('@')[0] || 'SitePilot User'
  const initials = name.slice(0, 1).toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return <>
    {open && <div className="drawer-overlay" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top"><Brand light/><button className="sidebar-close" onClick={onClose}><X size={20}/></button></div>

      <div className="sidebar-profile">
        <div className="profile-avatar">{user?.photoURL ? <img src={user.photoURL} alt=""/> : initials}</div>
        <strong>{name}</strong>
        <small>{user?.email}</small>
      </div>

      <nav className="sidebar-nav">
        {links.map(([to, Icon, label, end, badge]) => <NavLink key={to} to={to} end={Boolean(end)} onClick={onClose} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <Icon size={18}/><span>{label}</span>{badge && <em className="nav-badge">{badge}</em>}
        </NavLink>)}
      </nav>

      <div className="sidebar-divider"/>
      <div className="sidebar-secondary">
        <a href="mailto:support@example.com"><Headphones size={18}/><span>Support</span></a>
        <a href="/" target="_blank" rel="noreferrer"><CircleHelp size={18}/><span>Help</span></a>
      </div>

      <button className="sidebar-logout" onClick={handleLogout}><LogOut size={17}/><span>Logout</span></button>
      <div className="sidebar-foot"><span className="pulse-dot"/><div><strong>Monitoring ready</strong><small>Website + price intelligence</small></div></div>
    </aside>
  </>
}
