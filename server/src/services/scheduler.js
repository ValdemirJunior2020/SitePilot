import { getDb } from '../config/firebase.js';
import { performSiteScan } from './siteService.js';
import { performPriceCheck } from './priceWatchService.js';

const hoursFor = { 'Every 6 hours': 6, 'Every 12 hours': 12, 'Daily': 24, 'Weekly': 168 };
let timer = null;
let running = false;

function due(site) {
  const hours = hoursFor[site.frequency];
  if (!hours || site.active === false) return false;
  if (!site.lastScanAt) return true;
  const last = site.lastScanAt.toDate ? site.lastScanAt.toDate() : new Date(site.lastScanAt);
  return Date.now() - last.getTime() >= hours * 3600 * 1000;
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const users = await getDb().collection('users').get();
    for (const user of users.docs) {
      const sites = await user.ref.collection('sites').get();
      for (const site of sites.docs) {
        if (!due(site.data())) continue;
        try { await performSiteScan(user.id, site.id); }
        catch (error) { console.error(`Scheduled scan failed ${user.id}/${site.id}:`, error.message); }
      }
      const watches = await user.ref.collection('priceWatches').get();
      for (const watch of watches.docs) {
        if (!due(watch.data())) continue;
        try { await performPriceCheck(user.id, watch.id); }
        catch (error) { console.error(`Scheduled price check failed ${user.id}/${watch.id}:`, error.message); }
      }
    }
  } catch (error) {
    console.error('Scheduler tick failed:', error.message);
  } finally {
    running = false;
  }
}

export function startScheduler() {
  if (String(process.env.ENABLE_SCHEDULER).toLowerCase() !== 'true' || timer) return;
  console.log('SitePilot scheduler enabled (15-minute due-site checks).');
  timer = setInterval(tick, 15 * 60 * 1000);
  setTimeout(tick, 5000);
}
