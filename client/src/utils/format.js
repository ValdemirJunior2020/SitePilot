export function formatDate(value, fallback = 'Never') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDateLong(value) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function hostname(value) {
  try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return value || ''; }
}

export function severityLabel(value = 'insignificant') {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
