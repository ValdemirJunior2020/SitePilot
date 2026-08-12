import { getDb, admin } from '../config/firebase.js';
import { getOwnedSite, performSiteScan, siteRef } from '../services/siteService.js';
import { assertSafeUrl } from '../utils/urlSecurity.js';
import { deleteSiteScreenshots } from '../services/screenshotService.js';
import { serializeDoc, serializeValue } from '../utils/serializers.js';

const categories = new Set(['Competitor', 'Client', 'Ecommerce', 'News', 'Marketing', 'Other']);
const frequencies = new Set(['Manual', 'Every 6 hours', 'Every 12 hours', 'Daily', 'Weekly']);

function validateSite(body, partial = false) {
  const out = {};
  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name || name.length > 120) throw Object.assign(new Error('Website name is required and must be under 120 characters.'), { status: 400 });
    out.name = name;
  }
  if (!partial || body.url !== undefined) {
    const url = String(body.url || '').trim();
    if (!url || url.length > 2048) throw Object.assign(new Error('A valid website URL is required.'), { status: 400 });
    out.url = url;
  }
  if (!partial || body.category !== undefined) {
    if (!categories.has(body.category)) throw Object.assign(new Error('Choose a valid category.'), { status: 400 });
    out.category = body.category;
  }
  if (!partial || body.frequency !== undefined) {
    if (!frequencies.has(body.frequency)) throw Object.assign(new Error('Choose a valid scan frequency.'), { status: 400 });
    out.frequency = body.frequency;
  }
  if (body.active !== undefined) out.active = Boolean(body.active);
  return out;
}

export async function listSites(req, res, next) {
  try {
    const snap = await getDb().collection('users').doc(req.user.uid).collection('sites').orderBy('createdAt', 'desc').get();
    res.json({ success: true, data: snap.docs.map(serializeDoc) });
  } catch (e) { next(e); }
}

export async function createSite(req, res, next) {
  try {
    const data = validateSite(req.body);
    await assertSafeUrl(data.url);
    const ref = getDb().collection('users').doc(req.user.uid).collection('sites').doc();
    const now = admin.firestore.Timestamp.now();
    const site = { ...data, active: true, lastScanAt: null, lastStatus: 'unknown', lastStatusCode: null, lastChangeScore: 0, lastSeverity: 'insignificant', totalScans: 0, totalChanges: 0, totalCriticalChanges: 0, createdAt: now, updatedAt: now };
    await ref.set(site);
    res.status(201).json({ success: true, data: serializeValue({ id: ref.id, ...site }) });
  } catch (e) { next(e); }
}

export async function getSite(req, res, next) {
  try {
    const site = await getOwnedSite(req.user.uid, req.params.id);
    const { ref, ...data } = site;
    res.json({ success: true, data: serializeValue(data) });
  } catch (e) { next(e); }
}

export async function updateSite(req, res, next) {
  try {
    const data = validateSite(req.body, true);
    if (data.url) await assertSafeUrl(data.url);
    await getOwnedSite(req.user.uid, req.params.id);
    const update = { ...data, updatedAt: admin.firestore.Timestamp.now() };
    await siteRef(req.user.uid, req.params.id).update(update);
    const fresh = await siteRef(req.user.uid, req.params.id).get();
    res.json({ success: true, data: serializeDoc(fresh) });
  } catch (e) { next(e); }
}

export async function deleteSite(req, res, next) {
  try {
    const site = await getOwnedSite(req.user.uid, req.params.id);
    const scans = await site.ref.collection('scans').get();
    const db = getDb();
    const batchSize = 400;
    for (let i = 0; i < scans.docs.length; i += batchSize) {
      const batch = db.batch();
      scans.docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    await site.ref.delete();
    await deleteSiteScreenshots(req.user.uid, req.params.id).catch((error) => console.warn('Screenshot cleanup failed:', error.message));
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
}

export async function scanSite(req, res, next) {
  try {
    const scan = await performSiteScan(req.user.uid, req.params.id);
    res.status(201).json({ success: true, data: serializeValue(scan) });
  } catch (e) { next(e); }
}
