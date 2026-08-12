import { getDb, admin } from '../config/firebase.js';
import { scanWebsite } from './scanner.js';
import { detectChanges } from './changeDetector.js';
import { saveScreenshot } from './screenshotService.js';
import { analyzeWithOllama } from './ollamaService.js';

export function siteRef(uid, siteId) {
  return getDb().collection('users').doc(uid).collection('sites').doc(siteId);
}

export async function getOwnedSite(uid, siteId) {
  const ref = siteRef(uid, siteId);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error('Website not found.');
    error.status = 404;
    throw error;
  }
  return { id: snap.id, ref, ...snap.data() };
}

export async function performSiteScan(uid, siteId) {
  const site = await getOwnedSite(uid, siteId);
  if (site.active === false) {
    const error = new Error('This website is paused.');
    error.status = 409;
    throw error;
  }

  const scans = site.ref.collection('scans');
  const previousSnap = await scans.orderBy('createdAt', 'desc').limit(1).get();
  const previous = previousSnap.empty ? null : { id: previousSnap.docs[0].id, ...previousSnap.docs[0].data() };
  const scanRef = scans.doc();
  const current = await scanWebsite(site.url);
  const changeResult = detectChanges(previous, current);
  const screenshotUrl = await saveScreenshot({ buffer: current.screenshotBuffer, uid, siteId, scanId: scanRef.id }).catch((error) => {
    console.warn('Screenshot storage unavailable:', error.message);
    return null;
  });
  const aiSummary = changeResult.changeScore >= 31
    ? await analyzeWithOllama({ site, current, previous, changeResult })
    : null;

  const createdAt = admin.firestore.Timestamp.now();
  const scanData = {
    siteId,
    ownerId: uid,
    url: current.url,
    title: current.title,
    description: current.description,
    h1: current.h1,
    canonicalUrl: current.canonicalUrl,
    statusCode: current.statusCode,
    navigationError: current.navigationError || null,
    visibleText: current.visibleText,
    textHash: current.textHash,
    htmlHash: current.htmlHash,
    screenshotHash: current.screenshotHash,
    links: current.links,
    images: current.images,
    headings: current.headings,
    healthIssues: current.healthIssues,
    screenshotUrl,
    changed: changeResult.changed,
    changeScore: changeResult.changeScore,
    severity: changeResult.severity,
    changes: changeResult.changes,
    addedContent: changeResult.addedContent,
    removedContent: changeResult.removedContent,
    aiSummary,
    duration: current.duration,
    createdAt
  };

  await scanRef.set(scanData);
  const isOnline = current.statusCode >= 200 && current.statusCode < 400;
  await site.ref.set({
    lastScanAt: createdAt,
    lastStatus: isOnline ? 'online' : 'offline',
    lastStatusCode: current.statusCode,
    lastChangeScore: changeResult.changeScore,
    lastSeverity: changeResult.severity,
    lastScreenshotUrl: screenshotUrl,
    totalScans: admin.firestore.FieldValue.increment(1),
    totalChanges: admin.firestore.FieldValue.increment(changeResult.changed ? 1 : 0),
    totalCriticalChanges: admin.firestore.FieldValue.increment(changeResult.severity === 'critical' ? 1 : 0),
    updatedAt: createdAt
  }, { merge: true });

  return { id: scanRef.id, ...scanData, previousScanId: previous?.id || null };
}
