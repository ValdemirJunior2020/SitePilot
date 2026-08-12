import { Link } from 'react-router-dom';
export default function NotFound(){return <div className="not-found"><span>404</span><h1>Page not found</h1><p>The page you're looking for isn't here.</p><Link className="btn btn-primary" to="/">Go home</Link></div>}
