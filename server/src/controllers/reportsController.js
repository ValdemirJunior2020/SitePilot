import { getDb } from '../config/firebase.js';
import { serializeDoc } from '../utils/serializers.js';

export async function getReport(req, res, next) {
  try {
    const db = getDb();
    const sitesSnap = await db.collection('users').doc(req.user.uid).collection('sites').get();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const scans = [];
    for (const siteDoc of sitesSnap.docs) {
      const snap = await siteDoc.ref.collection('scans').where('createdAt', '>=', since).orderBy('createdAt', 'desc').get();
      snap.docs.forEach((doc) => scans.push({ ...serializeDoc(doc), siteName: siteDoc.data().name, category: siteDoc.data().category }));
    }
    const changed = scans.filter((s) => s.changed);
    const critical = scans.filter((s) => s.severity === 'critical');
    const bySite = {};
    changed.forEach((s) => { bySite[s.siteName] = (bySite[s.siteName] || 0) + 1; });
    const mostActive = Object.entries(bySite).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const largest = [...scans].sort((a, b) => (b.changeScore || 0) - (a.changeScore || 0))[0] || null;
    const report = {
      period: 'Last 7 days',
      websitesMonitored: sitesSnap.size,
      scansPerformed: scans.length,
      changesDetected: changed.length,
      criticalChanges: critical.length,
      mostActiveWebsite: mostActive,
      largestChange: largest ? { siteName: largest.siteName, score: largest.changeScore, severity: largest.severity, createdAt: largest.createdAt } : null,
      generatedAt: new Date().toISOString()
    };
    res.json({ success: true, data: report });
  } catch (e) { next(e); }
}
