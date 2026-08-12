import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  return <div className="app-shell">
    <Sidebar open={open} onClose={() => setOpen(false)} />
    <main className="app-main" key={location.pathname}>
      <Outlet context={{ openMenu: () => setOpen(true) }} />
    </main>
  </div>;
}
