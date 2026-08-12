import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const defaults = {
  productName: '',
  url: '',
  targetPrice: '',
  frequency: 'Daily',
  alertEmail: '',
  alertOnAnyDrop: true
}

export default function PriceWatchModal({ open, watch, busy, onClose, onSubmit }) {
  const { user } = useAuth()
  const [form, setForm] = useState(defaults)

  useEffect(() => {
    if (!open) return
    setForm(watch ? {
      productName: watch.productName || '',
      url: watch.url || '',
      targetPrice: watch.targetPrice ?? '',
      frequency: watch.frequency || 'Daily',
      alertEmail: watch.alertEmail || user?.email || '',
      alertOnAnyDrop: watch.alertOnAnyDrop !== false
    } : { ...defaults, alertEmail: user?.email || '' })
  }, [open, watch, user?.email])

  if (!open) return null
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
    <form className="site-modal price-watch-modal" onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
      <div className="modal-head"><div><h3>{watch ? 'Edit price watch' : 'Add price watch'}</h3><p>Track a product page and get alerted when the price drops.</p></div><button type="button" className="icon-btn" onClick={onClose} disabled={busy}><X size={18}/></button></div>
      <label>What do you want?<input value={form.productName} onChange={(e) => set('productName', e.target.value)} placeholder="32GB DDR5 Memory RAM" maxLength={180} required /></label>
      <label>Product page URL<input type="url" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://www.amazon.com/..." required /></label>
      <div className="form-grid-2">
        <label>Target price <input type="number" min="0.01" step="0.01" value={form.targetPrice} onChange={(e) => set('targetPrice', e.target.value)} placeholder="99.99" /></label>
        <label>Check frequency<select value={form.frequency} onChange={(e) => set('frequency', e.target.value)}><option>Manual</option><option>Every 6 hours</option><option>Every 12 hours</option><option>Daily</option><option>Weekly</option></select></label>
      </div>
      <label>Alert email<input type="email" value={form.alertEmail} onChange={(e) => set('alertEmail', e.target.value)} required /></label>
      <label className="check-row"><input type="checkbox" checked={form.alertOnAnyDrop} onChange={(e) => set('alertOnAnyDrop', e.target.checked)} /><span><b>Email me on any price drop</b><small>Target-price alerts still work even if this is turned off.</small></span></label>
      <p className="form-help">SitePilot reads structured product data and common price elements. Some retailers may block automated browsers or show location-specific prices.</p>
      <div className="dialog-actions"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : watch ? 'Save changes' : 'Start tracking'}</button></div>
    </form>
  </div>
}
