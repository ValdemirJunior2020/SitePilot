import { severityLabel } from '../utils/format';
export default function ChangeBadge({ severity = 'insignificant', score }) {
  return <span className={`badge severity-${severity}`}>
    {severityLabel(severity)}{score !== undefined && score !== null ? ` · ${score}` : ''}
  </span>;
}
