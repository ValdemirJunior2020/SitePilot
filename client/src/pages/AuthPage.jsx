import { useState } from 'react';
import { ArrowRight, Chrome, LockKeyhole, Radar } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ mode = 'login' }) {
  const { user, login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  const isRegister = mode === 'register';
  const destination = location.state?.from || '/dashboard';

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (isRegister) await register(form.name, form.email, form.password); else await login(form.email, form.password);
      navigate(destination, { replace: true });
    } catch (e) { setError(e.message.replace('Firebase: ', '').replace(/\(auth\/.+\)\.?/, '').trim()); }
    finally { setBusy(false); }
  }

  async function google() {
    setBusy(true); setError('');
    try { await loginWithGoogle(); navigate(destination, { replace: true }); }
    catch (e) { if (e.code !== 'auth/popup-closed-by-user') setError(e.message); }
    finally { setBusy(false); }
  }

  return <div className="auth-page">
    <div className="auth-aside"><Link to="/" className="auth-brand"><span><Radar size={21}/></span>SitePilot</Link><div><span className="eyebrow dark"><LockKeyhole size={15}/> Secure website intelligence</span><h1>See what changed before everyone else does.</h1><p>Track the pages that matter and turn website changes into a clear, searchable history.</p></div><small>Firebase Authentication · Secure API tokens · Per-user data isolation</small></div>
    <div className="auth-main"><div className="auth-card"><div className="auth-heading"><h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2><p>{isRegister ? 'Start monitoring your first website.' : 'Sign in to your SitePilot workspace.'}</p></div>
      {error && <div className="auth-error">{error}</div>}
      <button className="google-btn" onClick={google} disabled={busy}><Chrome size={18}/>Continue with Google</button><div className="or"><span/>or<span/></div>
      <form onSubmit={submit}>{isRegister && <label>Name<input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="Your name" required/></label>}<label>Email<input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="you@company.com" required/></label><label>Password<input type="password" minLength="6" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} placeholder="At least 6 characters" required/></label><button className="btn btn-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={18}/></button></form>
      <p className="auth-switch">{isRegister ? 'Already have an account?' : "Don't have an account?"} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create one'}</Link></p>
    </div></div>
  </div>;
}
