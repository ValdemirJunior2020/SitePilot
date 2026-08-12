import { getOwnedSite } from '../services/siteService.js';
import { serializeDoc } from '../utils/serializers.js';

export async function listScans(req, res, next) {
  try {
    const site = await getOwnedSite(req.user.uid, req.params.id);
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const snap = await site.ref.collection('scans').orderBy('createdAt', 'desc').limit(limit).get();
    res.json({ success: true, data: snap.docs.map(serializeDoc) });
  } catch (e) { next(e); }
}

export async function getScan(req, res, next) {
  try {
    const site = await getOwnedSite(req.user.uid, req.params.id);
    const ref = site.ref.collection('scans').doc(req.params.scanId);
    const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Scan not found.'), { status: 404 });
    const current = serializeDoc(snap);
    const previousSnap = await site.ref.collection('scans').where('createdAt', '<', snap.data().createdAt).orderBy('createdAt', 'desc').limit(1).get();
    const previous = previousSnap.empty ? null : serializeDoc(previousSnap.docs[0]);
    res.json({ success: true, data: { current, previous } });
  } catch (e) { next(e); }
}
