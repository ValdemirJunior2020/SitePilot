import { useEffect, useState } from 'react'
import { ArrowLeft, Bell, ExternalLink, Pencil, Play, Power, Search, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Loading from '../components/Loading'
import PriceWatchModal from '../components/PriceWatchModal'
import ConfirmDialog from '../components/ConfirmDialog'
import api, { apiError } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatDateLong, hostname } from '../utils/format'

const money = (value, currency = 'USD') => value == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)

export default function PriceWatchDetails() {
  const { id } = useParams()
  const { openMenu } = useOutletContext()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [watch, setWatch] = useState(null)
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [searching, setSearching] = useState(false)
  const [deals, setDeals] = useState(null)
  const [edit, setEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [a, b] = await Promise.all([api.get(`/api/price-watches/${id}`), api.get(`/api/price-watches/${id}/checks`)])
      setWatch(a.data.data); setChecks(b.data.data)
    } catch (e) { toast(apiError(e), 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function checkPrice() {
    setChecking(true)
    try {
      const r = await api.post(`/api/price-watches/${id}/check`)
      const d = r.data.data
      toast(d.priceDrop ? `Price dropped to ${money(d.price, d.currency)}.` : `Price check complete — ${money(d.price, d.currency)}.`)
      await load()
    } catch (e) { toast(apiError(e), 'error') }
    finally { setChecking(false) }
  }

  async function findDeals() {
    setSearching(true)
    try { const r = await api.get(`/api/price-watches/${id}/deals`); setDeals(r.data.data); if (!r.data.data.enabled) toast(r.data.data.message, 'info') }
    catch (e) { toast(apiError(e), 'error') }
    finally { setSearching(false) }
  }

  async function save(form) {
    setSaving(true)
    try { await api.put(`/api/price-watches/${id}`, form); toast('Price watch updated.'); setEdit(false); await load() }
    catch (e) { toast(apiError(e), 'error') }
    finally { setSaving(false) }
  }

  async function remove() {
    try { await api.delete(`/api/price-watches/${id}`); toast('Price watch deleted.'); navigate('/dashboard/price-watch') }
    catch (e) { toast(apiError(e), 'error') }
  }

  async function toggleActive() {
    try { await api.put(`/api/price-watches/${id}`, { active: !watch.active }); toast(watch.active ? 'Price watch paused.' : 'Price watch resumed.'); await load() }
    catch (e) { toast(apiError(e), 'error') }
  }

  if (loading) return <><Header title="Price Watch" onMenu={openMenu}/><Loading label="Loading product…"/></>
  if (!watch) return null
  const latest = checks[0]

  return <>
    <Header title={watch.productName} subtitle={hostname(watch.url)} onMenu={openMenu}/>
    {checking && <div className="scan-loading-overlay"><div className="scan-loading-card"><img src="/sitepilot-loader.gif" alt="Checking price" className="scan-loading-gif"/><div className="scan-loading-title">Checking live price</div><div className="scan-loading-text">Opening the product page and comparing it with your saved price history...</div><div className="scan-loading-subtext">Large retailers can take up to a minute.</div></div></div>}
    <div className="page-content">
      <Link to="/dashboard/price-watch" className="back-link"><ArrowLeft size={16}/>Back to Price Watch</Link>
      <section className="price-detail-hero panel">
        <div><div className="site-title-line"><h2>{watch.productName}</h2><span className={`watch-state ${watch.active ? 'active' : 'paused'}`}>{watch.active ? 'Watching' : 'Paused'}</span></div><a href={watch.url} target="_blank" rel="noreferrer">{watch.url}<ExternalLink size={14}/></a>
          <div className="current-price-block"><span>Current price</span><strong>{money(watch.lastPrice, watch.currency)}</strong>{latest?.priceDrop && <em><TrendingDown size={15}/>Down {money(latest.dropAmount, watch.currency)} ({latest.dropPercent}%)</em>}</div>
          <div className="site-facts"><span><b>Target price</b>{money(watch.targetPrice, watch.currency)}</span><span><b>Lowest seen</b>{money(watch.lowestPrice, watch.currency)}</span><span><b>Highest seen</b>{money(watch.highestPrice, watch.currency)}</span><span><b>Frequency</b>{watch.frequency}</span><span><b>Last check</b>{formatDateLong(watch.lastCheckedAt)}</span><span><b>Alert email</b>{watch.alertEmail}</span></div>
        </div>
        <div className="site-actions"><button className="btn btn-primary" onClick={checkPrice} disabled={checking || !watch.active}><Play size={17}/>{checking ? 'Checking…' : 'Check Price'}</button><button className="btn btn-deal" onClick={findDeals} disabled={searching}><Search size={17}/>{searching ? 'Searching…' : 'Find Better Prices'}</button><button className="btn btn-secondary" onClick={() => setEdit(true)}><Pencil size={17}/>Edit</button><button className="btn btn-secondary" onClick={toggleActive}><Power size={17}/>{watch.active ? 'Pause' : 'Resume'}</button><button className="icon-btn danger" onClick={() => setConfirm(true)}><Trash2 size={18}/></button></div>
      </section>

      <div className="price-detail-grid">
        <section className="panel history-panel"><div className="panel-head"><div><h2>Price history</h2><p>Every successful product price check</p></div><Bell size={17}/></div>{!checks.length ? <div className="history-empty"><p>No price checks yet. Run your first check to create a baseline.</p><button className="btn btn-primary" onClick={checkPrice}>Check Price</button></div> : <div className="price-timeline">{checks.map((c) => <div className="price-history-row" key={c.id}><div className={`price-direction ${c.priceDrop ? 'down' : c.priceIncrease ? 'up' : ''}`}>{c.priceDrop ? <TrendingDown/> : c.priceIncrease ? <TrendingUp/> : <span>•</span>}</div><div><strong>{money(c.price, c.currency)}</strong><span>{formatDateLong(c.createdAt)} · HTTP {c.statusCode || '—'}</span></div><div className="price-history-note">{c.priceDrop ? `-${money(c.dropAmount, c.currency)} (${c.dropPercent}%)` : c.priceIncrease ? 'Price increased' : c.previousPrice == null ? 'Baseline' : 'No change'}{c.alertSent && <small>Alert emailed</small>}</div></div>)}</div>}</section>

        <section className="panel deal-panel"><div className="panel-head"><div><h2>Better prices</h2><p>Compare shopping results for this product</p></div><Search size={17}/></div>{!deals ? <div className="deal-empty"><Search size={28}/><p>Search other stores to compare your current price.</p><button className="btn btn-deal" onClick={findDeals} disabled={searching}>{searching ? 'Searching…' : 'Find Better Prices'}</button></div> : !deals.enabled ? <div className="deal-empty"><p>{deals.message}</p><small>Add <b>SERPAPI_KEY</b> on Render to enable broader Google Shopping discovery.</small></div> : !deals.results.length ? <div className="deal-empty"><p>No comparable shopping results were returned.</p></div> : <div className="deal-list">{deals.results.map((deal, i) => <a href={deal.link || '#'} target="_blank" rel="noreferrer" className="deal-row" key={`${deal.source}-${i}`}><div>{deal.thumbnail ? <img src={deal.thumbnail} alt=""/> : <span className="deal-rank">{i + 1}</span>}</div><div><strong>{deal.title}</strong><span>{deal.source}{deal.rating ? ` · ★ ${deal.rating}` : ''}</span></div><b>{deal.price != null ? money(deal.price, watch.currency) : deal.priceText}</b></a>)}</div>}</section>
      </div>
    </div>
    <PriceWatchModal open={edit} watch={watch} busy={saving} onClose={() => setEdit(false)} onSubmit={save}/>
    <ConfirmDialog open={confirm} title={`Delete ${watch.productName}?`} message="This permanently deletes this price watch and its saved price history." confirmText="Delete price watch" danger onCancel={() => setConfirm(false)} onConfirm={remove}/>
  </>
}
