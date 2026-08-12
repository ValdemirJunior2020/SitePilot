import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Sites from './pages/Sites';
import SiteDetails from './pages/SiteDetails';
import ScanDetails from './pages/ScanDetails';
import ActivityPage from './pages/ActivityPage';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

export default function App(){return <BrowserRouter><AuthProvider><ToastProvider><Routes>
  <Route path="/" element={<Landing/>}/><Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/register" element={<AuthPage mode="register"/>}/>
  <Route path="/dashboard" element={<ProtectedRoute><AppShell/></ProtectedRoute>}>
    <Route index element={<Dashboard/>}/><Route path="sites" element={<Sites/>}/><Route path="sites/:id" element={<SiteDetails/>}/><Route path="sites/:id/scans/:scanId" element={<ScanDetails/>}/><Route path="activity" element={<ActivityPage/>}/><Route path="reports" element={<Reports/>}/><Route path="settings" element={<Settings/>}/>
  </Route><Route path="*" element={<NotFound/>}/>
</Routes></ToastProvider></AuthProvider></BrowserRouter>}
