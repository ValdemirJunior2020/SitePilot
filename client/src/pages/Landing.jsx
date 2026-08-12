import { Activity, ArrowRight, Bot, Camera, Check, Radar, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Brand from '../components/Brand';

const features = [
  [Search, 'Website monitoring', 'Track titles, metadata, headings, visible text, links, HTTP status, and more.'],
  [Activity, 'Change detection', 'See exactly what changed and how important it is with a 0–100 change score.'],
  [Camera, 'Screenshot history', 'Keep visual evidence of each scan and compare before versus after.'],
  [Bot, 'Local AI analysis', 'Optionally use Ollama for private, local summaries of important changes.']
];

export default function Landing() {
  return <div className="landing">
    <nav className="landing-nav"><Brand /><div><a href="#features">Features</a><a href="#privacy">Privacy</a><Link to="/login">Login</Link><Link className="btn btn-primary" to="/register">Start Monitoring</Link></div></nav>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><Sparkles size={15} /> Website intelligence without the noise</span><h1>Know when the web changes.</h1><p>Monitor competitor websites, campaigns, pricing, promotions, SEO signals, and important pages automatically.</p><div className="hero-actions"><Link className="btn btn-primary btn-lg" to="/register">Start Monitoring <ArrowRight size={18} /></Link><Link className="btn btn-secondary btn-lg" to="/login">Login</Link></div><div className="trust-row"><span><Check size={16} /> Secure per-user data</span><span><Check size={16} /> SSRF protected</span><span><Check size={16} /> Optional local AI</span></div></div>
      <div className="hero-visual"><div className="mock-window"><div className="mock-bar"><i/><i/><i/><span>sitepilot.app/dashboard</span></div><div className="mock-body"><aside><div className="mock-brand"/><div/><div/><div/><div/></aside><main><div className="mock-title"/><div className="mock-stats"><div/><div/><div/></div><div className="mock-chart"><div className="fake-line"/></div><div className="mock-feed"><div/><div/><div/></div></main></div></div><div className="floating-card fc-one"><Radar size={18}/><div><strong>Change detected</strong><span>Score 72 · Important</span></div></div><div className="floating-card fc-two"><ShieldCheck size={18}/><div><strong>nike.com</strong><span>Online · 200 OK</span></div></div></div>
    </section>
    <section className="how"><div className="section-heading"><span>How it works</span><h2>From URL to intelligence in three steps</h2></div><div className="how-grid"><div><b>01</b><h3>Add a website</h3><p>Enter any public HTTP or HTTPS page you want to watch.</p></div><div><b>02</b><h3>Scan & compare</h3><p>SitePilot captures content, status, structure, links, and a screenshot.</p></div><div><b>03</b><h3>Review changes</h3><p>See the timeline, severity, before/after details, and optional AI analysis.</p></div></div></section>
    <section className="features" id="features"><div className="section-heading"><span>Features</span><h2>Built for teams that watch the market</h2><p>Useful signal for marketing, ecommerce, SEO, agencies, developers, and competitive intelligence.</p></div><div className="feature-grid">{features.map(([Icon, title, text]) => <div className="feature-card" key={title}><span><Icon size={22}/></span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
    <section className="privacy" id="privacy"><div><span className="eyebrow"><ShieldCheck size={15}/> Privacy & security</span><h2>Your monitoring data stays separated by Firebase user.</h2><p>The API verifies Firebase ID tokens, scopes Firestore reads to the verified UID, blocks internal network targets, rate-limits scans, and never puts server credentials in the browser.</p></div><div className="privacy-panel"><div><Check/> Firebase Authentication</div><div><Check/> User-scoped Firestore paths</div><div><Check/> Private IP & redirect blocking</div><div><Check/> Server-only Admin credentials</div></div></section>
    <section className="landing-cta"><div><h2>Start building your web intelligence history.</h2><p>Add your first website and see what changes next.</p></div><Link className="btn btn-white btn-lg" to="/register">Create free account <ArrowRight size={18}/></Link></section>
    <footer><Brand/><p>Website Intelligence & Monitoring Platform</p><span>SitePilot · Built for responsible public-web monitoring.</span></footer>
  </div>;
}
