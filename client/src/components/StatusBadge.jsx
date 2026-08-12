export default function StatusBadge({ status = 'unknown' }) {
  return <span className={`status-pill status-${status}`}><span />{status === 'unknown' ? 'Not scanned' : status}</span>;
}
