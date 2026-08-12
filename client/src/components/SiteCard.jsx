import { ArrowRight, CalendarClock, Globe2, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, hostname } from '../utils/format';
import ChangeBadge from './ChangeBadge';
import StatusBadge from './StatusBadge';

export default function SiteCard({ site }) {
  return <Link to={`/dashboard/sites/${site.id}`} className="site-card">
    <div className="site-card-top"><div className="site-logo"><Globe2 size={21} /></div><span className="icon-btn mini"><MoreHorizontal size={18} /></span></div>
    <h3>{site.name}</h3><p className="site-host">{hostname(site.url)}</p>
    <div className="site-card-badges"><StatusBadge status={site.lastStatus} />{site.totalScans > 0 && <ChangeBadge severity={site.lastSeverity} score={site.lastChangeScore} />}</div>
    <div className="site-card-meta"><span><CalendarClock size={15} />{formatDate(site.lastScanAt)}</span><span>{site.category} · {site.frequency}</span></div>
    <div className="site-card-foot"><span>{site.totalScans || 0} scans · {site.totalChanges || 0} changes</span><ArrowRight size={17} /></div>
  </Link>;
}
