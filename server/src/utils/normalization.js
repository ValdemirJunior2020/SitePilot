export function normalizeText(value = '') {
  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeUrl(value = '') {
  try {
    const url = new URL(value);
    url.hash = '';
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
    return url.toString();
  } catch {
    return value;
  }
}

export function truncate(value = '', max = 80000) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
