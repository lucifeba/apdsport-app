export function cleanText(value: string) {
  return value.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();
}

export function normalizeText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return cleanText(String(value));
  }
  if (!value || typeof value !== 'object') return '';
  const item = value as Record<string, unknown>;
  for (const key of ['text', 'content', 'summary', 'point', 'item', 'description', 'value', 'title', 'name']) {
    const result = normalizeText(item[key]);
    if (result) return result;
  }
  return Object.values(item).map(normalizeText).filter(Boolean).join(': ');
}

export function normalizeList(value: unknown) {
  return Array.isArray(value)
    ? value.map(normalizeText).filter(Boolean).slice(0, 12)
    : [];
}
