import { useEffect, useMemo, useState } from 'react'
import { BellRing, ExternalLink, Search, Tag } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import Header from '../components/Header'
import EmptyState from '../components/EmptyState'
import Loading from '../components/Loading'
import PriceWatchModal from '../components/PriceWatchModal'
import api, { apiError } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatDateLong, hostname } from '../utils/format'

const money = (value, currency = 'USD') => value == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)

export default function PriceWatches() {
  const { openMenu } = useOutletContext()
  const { toast } = useToast()
  const [watches, setWatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try { const r = await api.get('/api/price-watches'); setWatches(r.data.data) }
    catch (e) { toast(apiError(e), 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function create(form) {
    setBusy(true)
    try { await api.post('/api/price-watches', form); toast('Price watch added.'); setOpen(false); await load() }
    catch (e) { toast(apiError(e), 'error') }
    finally { setBusy(false) }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return !q ? watches : watches.filter((w) => `${w.productName} ${w.url}`.toLowerCase().includes(q))
  }, [watches, search])

  return <>
    <Header title="Price Watch" subtitle="Track product prices and get drop alerts." onMenu={openMenu} primaryAction={{ label: 'Add price watch', onClick: () => setOpen(true) }} />
    <div className="page-content">
      <div className="price-watch-intro panel"><div className="price-watch-intro-icon"><BellRing /></div><div><h2>Never miss a better price</h2><p>Add a product page, set an optional target, and SitePilot builds a price history while automatic checks can email you when the price falls.</p></div><span className="new-pill">NEW</span></div>
      <div className="filters-bar price-search"><div className="search-box"><Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search price watches…"/></div></div>
      {loading ? <Loading label="Loading price watches…"/> : !watches.length ? <EmptyState title="You're not tracking any prices yet." text="Add a product page and SitePilot will start building its price history." action={<button className="btn btn-primary" onClick={() => setOpen(true)}>Add Price Watch</button>} /> : !filtered.length ? <EmptyState title="No price watches match that search." text="Try another product name or website."/> : <div className="price-watch-grid">{filtered.map((watch) => {
        const hitTarget = watch.targetPrice != null && watch.lastPrice != null && watch.lastPrice <= watch.targetPrice
        return <Link className="price-watch-card" key={watch.id} to={`/dashboard/price-watch/${watch.id}`}>
          <div className="price-watch-card-top"><div className="price-product-icon"><Tag size={20}/></div><span className={`watch-state ${watch.active === false ? 'paused' : hitTarget ? 'target' : 'active'}`}>{watch.active === false ? 'Paused' : hitTarget ? 'Target reached' : 'Watching'}</span></div>
          <h3>{watch.productName}</h3><p className="site-host">{hostname(watch.url)}</p>
          <div className="price-big">{money(watch.lastPrice, watch.currency)}<small>current price</small></div>
          <div className="price-watch-meta"><span><b>Target</b>{money(watch.targetPrice, watch.currency)}</span><span><b>Lowest</b>{money(watch.lowestPrice, watch.currency)}</span><span><b>Checks</b>{watch.totalChecks || 0}</span></div>
          <div className="site-card-foot"><span>{watch.lastCheckedAt ? `Checked ${formatDateLong(watch.lastCheckedAt)}` : 'Not checked yet'}</span><ExternalLink size={15}/></div>
        </Link>
      })}</div>}
    </div>
    <PriceWatchModal open={open} busy={busy} onClose={() => setOpen(false)} onSubmit={create}/>
  </>
}
