import test from 'node:test';
import assert from 'node:assert/strict';
import { detectChanges, severityForScore } from '../src/services/changeDetector.js';

test('detects title and content changes', () => {
  const previous = { title: 'Summer Collection', description: 'A', h1: 'Hello', statusCode: 200, visibleText: 'Welcome to our summer collection. Explore the catalog today.', textHash: 'old', links: ['https://example.com/a'] };
  const current = { title: 'Summer Sale - Save 40%', description: 'A', h1: 'Hello', statusCode: 200, visibleText: 'Summer Sale. Save 40% today. Free shipping is available now.', textHash: 'new', links: ['https://example.com/a', 'https://example.com/sale'] };
  const result = detectChanges(previous, current);
  assert.equal(result.changed, true);
  assert.ok(result.changeScore > 20);
  assert.ok(result.changes.some((c) => c.type === 'title'));
});

test('severity boundaries are stable', () => {
  assert.equal(severityForScore(10), 'insignificant');
  assert.equal(severityForScore(31), 'medium');
  assert.equal(severityForScore(81), 'critical');
});


test('detects pricing changes', () => {
  const previous = { title: 'Shop', description: '', h1: 'Deals', canonicalUrl: 'https://example.com', statusCode: 200, visibleText: 'Our plan costs $19.99 per month.', textHash: 'a', links: [], screenshotHash: 'same' };
  const current = { title: 'Shop', description: '', h1: 'Deals', canonicalUrl: 'https://example.com', statusCode: 200, visibleText: 'Our plan costs $29.99 per month.', textHash: 'b', links: [], screenshotHash: 'same' };
  const result = detectChanges(previous, current);
  assert.ok(result.changes.some((change) => change.type === 'pricing'));
});
