import { getDb } from '../config/firebase.js';
import { serializeDoc } from '../utils/serializers.js';

function dayKey(value) {
  const date = value?.toDate ? value.toDate() : new Date(value);
  return date.toISOString().slice(0, 10);
}

export async function getDashboard(req, res, next) {
  try {
    const sitesSnap = await getDb().collection('users').doc(req.user.uid).collection('sites').get();
    const sites = sitesSnap.docs.map(serializeDoc);
    const stats = {
      websitesMonitored: sites.length,
      scansPerformed: sites.reduce((n, s) => n + (s.totalScans || 0), 0),
      changesDetected: sites.reduce((n, s) => n + (s.totalChanges || 0), 0),
      criticalChanges: sites.reduce((n, s) => n + (s.totalCriticalChanges || 0), 0),
      websitesOnline: sites.filter((s) => s.lastStatus === 'online').length,
      websitesOffline: sites.filter((s) => s.lastStatus === 'offline').length,
      lastScan: sites.map((s) => s.lastScanAt).filter(Boolean).sort().reverse()[0] || null
    };

    const recent = [];
    const trendMap = new Map();
    for (const siteDoc of sitesSnap.docs) {
      const scanSnap = await siteDoc.ref.collection('scans').orderBy('createdAt', 'desc').limit(10).get();
      for (const doc of scanSnap.docs) {
        const scan = serializeDoc(doc);
        recent.push({ ...scan, siteName: siteDoc.data().name, siteId: siteDoc.id });
        const key = dayKey(doc.data().createdAt);
        const row = trendMap.get(key) || { date: key, scans: 0, changes: 0 };
        row.scans += 1;
        if (scan.changed) row.changes += 1;
        trendMap.set(key, row);
      }
    }
    recent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const trend = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    const byWebsite = sites.map((s) => ({ name: s.name, changes: s.totalChanges || 0, scans: s.totalScans || 0 })).sort((a,b) => b.changes-a.changes).slice(0,8);
    const categoryMap = new Map();
    sites.forEach((s) => { const row = categoryMap.get(s.category) || { name: s.category, changes: 0, scans: 0 }; row.changes += s.totalChanges || 0; row.scans += s.totalScans || 0; categoryMap.set(s.category, row); });
    const severityMap = new Map(['insignificant','minor','medium','important','critical'].map((name) => [name, 0]));
    recent.forEach((scan) => severityMap.set(scan.severity || 'insignificant', (severityMap.get(scan.severity || 'insignificant') || 0) + 1));
    const status = [
      { name: 'Online', value: sites.filter((s) => s.lastStatus === 'online').length },
      { name: 'Offline', value: sites.filter((s) => s.lastStatus === 'offline').length },
      { name: 'Not scanned', value: sites.filter((s) => !s.lastStatus || s.lastStatus === 'unknown').length }
    ];
    const analytics = { byWebsite, byCategory: [...categoryMap.values()], severity: [...severityMap].map(([name,value]) => ({ name, value })), status };
    res.json({ success: true, data: { stats, recentActivity: recent.slice(0, 8), trend, analytics, sites: sites.slice(0, 8) } });
  } catch (e) { next(e); }
}

export async function getActivity(req, res, next) {
  try {
    const sitesSnap = await getDb().collection('users').doc(req.user.uid).collection('sites').get();
    const items = [];
    for (const siteDoc of sitesSnap.docs) {
      const scans = await siteDoc.ref.collection('scans').orderBy('createdAt', 'desc').limit(20).get();
      scans.docs.forEach((doc) => items.push({ ...serializeDoc(doc), siteId: siteDoc.id, siteName: siteDoc.data().name, category: siteDoc.data().category }));
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, data: items.slice(0, 100) });
  } catch (e) { next(e); }
}
