export function serializeValue(value) {
  if (value == null) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializeValue(v)]));
  return value;
}

export function serializeDoc(doc) {
  return serializeValue({ id: doc.id, ...doc.data() });
}
