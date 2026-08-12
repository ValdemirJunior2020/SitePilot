import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import Header from '../components/Header';
import SiteCard from '../components/SiteCard';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import SiteFormModal from '../components/SiteFormModal';
import api, { apiError } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Sites(){
  const {openMenu}=useOutletContext(); const {toast}=useToast(); const [sites,setSites]=useState([]); const [loading,setLoading]=useState(true); const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false); const [search,setSearch]=useState(''); const [filter,setFilter]=useState('All'); const [category,setCategory]=useState('All categories');
  async function load(){setLoading(true);try{const r=await api.get('/api/sites');setSites(r.data.data)}catch(e){toast(apiError(e),'error')}finally{setLoading(false)}} useEffect(()=>{load()},[]);
  async function create(form){setBusy(true);try{await api.post('/api/sites',form);toast('Website added.');setOpen(false);await load()}catch(e){toast(apiError(e),'error')}finally{setBusy(false)}}
  const filtered=useMemo(()=>sites.filter(s=>{const q=search.toLowerCase();if(q&&!`${s.name} ${s.url}`.toLowerCase().includes(q))return false;if(category!=='All categories'&&s.category!==category)return false;if(filter==='Online'&&s.lastStatus!=='online')return false;if(filter==='Offline'&&s.lastStatus!=='offline')return false;if(filter==='Recently changed'&&!(s.totalChanges>0))return false;if(filter==='Critical changes'&&s.lastSeverity!=='critical')return false;return true}),[sites,search,filter,category]);
  return <><Header title="Websites" subtitle={`${sites.length} monitored website${sites.length===1?'':'s'}`} onMenu={openMenu} primaryAction={{label:'Add website',onClick:()=>setOpen(true)}}/><div className="page-content"><div className="filters-bar"><div className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search websites…"/></div><div className="filter-chips">{['All','Online','Offline','Recently changed','Critical changes'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div><select className="category-filter" value={category} onChange={e=>setCategory(e.target.value)}><option>All categories</option><option>Competitor</option><option>Client</option><option>Ecommerce</option><option>News</option><option>Marketing</option><option>Other</option></select></div>{loading?<Loading label="Loading websites…"/>:!sites.length?<EmptyState action={<button className="btn btn-primary" onClick={()=>setOpen(true)}>Add Website</button>}/>:!filtered.length?<EmptyState title="No websites match those filters." text="Try a different search or filter."/>:<div className="site-grid">{filtered.map(site=><SiteCard site={site} key={site.id}/>)}</div>}</div><SiteFormModal open={open} busy={busy} onClose={()=>setOpen(false)} onSubmit={create}/></>;
}
