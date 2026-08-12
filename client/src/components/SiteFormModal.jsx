import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const initial = { name: '', url: 'https://', category: 'Competitor', frequency: 'Daily' };
export default function SiteFormModal({ open, site, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  useEffect(() => {
    if (open) setForm(site ? { name: site.name, url: site.url, category: site.category, frequency: site.frequency } : initial);
  }, [open, site]);
  if (!open) return null;
  const change = (event) => setForm((x) => ({ ...x, [event.target.name]: event.target.value }));
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <form className="site-modal" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-head"><div><h3>{site ? 'Edit website' : 'Add website'}</h3><p>Choose a public page SitePilot should monitor.</p></div><button type="button" className="icon-btn" onClick={onClose}><X size={19} /></button></div>
      <label>Website name<input name="name" value={form.name} onChange={change} placeholder="Nike" maxLength="120" required /></label>
      <label>Website URL<input name="url" value={form.url} onChange={change} placeholder="https://nike.com" type="url" required /></label>
      <div className="form-grid-2">
        <label>Category<select name="category" value={form.category} onChange={change}><option>Competitor</option><option>Client</option><option>Ecommerce</option><option>News</option><option>Marketing</option><option>Other</option></select></label>
        <label>Scan frequency<select name="frequency" value={form.frequency} onChange={change}><option>Manual</option><option>Every 6 hours</option><option>Every 12 hours</option><option>Daily</option><option>Weekly</option></select></label>
      </div>
      <p className="form-help">Private networks, localhost, file URLs, and unsafe redirects are blocked by the server.</p>
      <div className="dialog-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : site ? 'Save changes' : 'Add website'}</button></div>
    </form>
  </div>;
}
