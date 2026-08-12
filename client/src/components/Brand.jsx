import { Radar } from 'lucide-react';
export default function Brand({ light = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}>
    <span className="brand-mark"><Radar size={20} /></span>
    <span>SitePilot</span>
  </div>;
}
