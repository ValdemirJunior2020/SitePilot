import { normalizeText } from '../utils/normalization.js';

function chunks(text = '') {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+|\s+[|•]\s+|\s{2,}/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 18)
    .slice(0, 500);
}

function uniqDiff(before = [], after = [], max = 16) {
  const oldSet = new Set(before);
  return [...new Set(after.filter((item) => !oldSet.has(item)))].slice(0, max);
}

function linkDiff(before = [], after = [], max = 25) {
  const a = new Set(before);
  return [...new Set(after.filter((x) => !a.has(x)))].slice(0, max);
}

export function severityForScore(score) {
  if (score <= 10) return 'insignificant';
  if (score <= 30) return 'minor';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'important';
  return 'critical';
}

export function detectChanges(previous, current) {
  if (!previous) {
    return { changed: false, changeScore: 0, severity: 'insignificant', changes: [], addedContent: [], removedContent: [] };
  }

  const changes = [];
  let score = 0;
  const push = (type, label, weight, before, after, detail = null) => {
    changes.push({ type, label, before: before ?? null, after: after ?? null, detail });
    score += weight;
  };

  if (previous.title !== current.title) push('title', 'Title changed', 18, previous.title, current.title);
  if ((previous.description || '') !== (current.description || '')) push('description', 'Meta description changed', 12, previous.description, current.description);
  if ((previous.h1 || '') !== (current.h1 || '')) push('h1', 'Main H1 changed', 15, previous.h1, current.h1);
  if ((previous.canonicalUrl || '') !== (current.canonicalUrl || '')) push('canonical', 'Canonical URL changed', 8, previous.canonicalUrl, current.canonicalUrl);

  const oldOnline = Number(previous.statusCode) >= 200 && Number(previous.statusCode) < 400;
  const newOnline = Number(current.statusCode) >= 200 && Number(current.statusCode) < 400;
  if (previous.statusCode !== current.statusCode) push('status', 'HTTP status changed', 14, previous.statusCode, current.statusCode);
  if (oldOnline && !newOnline) push('availability', 'Page became unavailable', 30, 'online', 'offline');
  if (!oldOnline && newOnline) push('availability', 'Page restored', 22, 'offline', 'online');

  const addedLinks = linkDiff(previous.links || [], current.links || []);
  const removedLinks = linkDiff(current.links || [], previous.links || []);
  if (addedLinks.length) push('links-added', 'Links added', Math.min(10, 2 + addedLinks.length), null, null, addedLinks);
  if (removedLinks.length) push('links-removed', 'Links removed', Math.min(10, 2 + removedLinks.length), null, null, removedLinks);

  const oldChunks = chunks(previous.visibleText || '');
  const newChunks = chunks(current.visibleText || '');
  const addedContent = uniqDiff(oldChunks, newChunks);
  const removedContent = uniqDiff(newChunks, oldChunks);
  const textChanged = previous.textHash && current.textHash && previous.textHash !== current.textHash;
  if (textChanged) {
    const contentWeight = Math.min(35, 8 + addedContent.length + removedContent.length);
    push('content', 'Visible text changed', contentWeight, null, null, { added: addedContent, removed: removedContent });
  }


  const pricePattern = /(?:[$£€]\s?\d{1,6}(?:[,.]\d{2})?|\b(?:USD|EUR|GBP)\s?\d{1,6}(?:[,.]\d{2})?)/gi;
  const oldPrices = [...new Set((previous.visibleText || '').match(pricePattern) || [])].slice(0, 30);
  const newPrices = [...new Set((current.visibleText || '').match(pricePattern) || [])].slice(0, 30);
  const addedPrices = newPrices.filter((price) => !oldPrices.includes(price));
  const removedPrices = oldPrices.filter((price) => !newPrices.includes(price));
  if (addedPrices.length || removedPrices.length) {
    push('pricing', 'Pricing changed', 18, removedPrices, addedPrices, { added: addedPrices, removed: removedPrices });
  }

  if (previous.screenshotHash && current.screenshotHash && previous.screenshotHash !== current.screenshotHash) {
    push('visual', 'Visual screenshot changed', 8, previous.screenshotHash, current.screenshotHash);
  }

  const importantPattern = /\b(price|pricing|sale|save|discount|% off|free shipping|limited time|new product|launch|offer|deal|coupon|promotion|subscribe|buy now|shop now)\b/i;
  const importantAdded = addedContent.filter((x) => importantPattern.test(x)).slice(0, 8);
  const importantRemoved = removedContent.filter((x) => importantPattern.test(x)).slice(0, 8);
  if (importantAdded.length) push('important-added', 'Important content added', 12, null, null, importantAdded);
  if (importantRemoved.length) push('important-removed', 'Important content removed', 10, null, null, importantRemoved);

  score = Math.max(0, Math.min(100, score));
  return {
    changed: changes.length > 0,
    changeScore: score,
    severity: severityForScore(score),
    changes,
    addedContent,
    removedContent
  };
}
