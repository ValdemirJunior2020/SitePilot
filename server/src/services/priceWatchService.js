import { getDb, admin } from '../config/firebase.js'
import { scanProductPrice } from './priceScanner.js'
import { saveScreenshot } from './screenshotService.js'
import { sendPriceAlert } from './emailService.js'

export function priceWatchRef(uid, watchId) {
  return getDb().collection('users').doc(uid).collection('priceWatches').doc(watchId)
}

export async function getOwnedPriceWatch(uid, watchId) {
  const ref = priceWatchRef(uid, watchId)
  const snap = await ref.get()
  if (!snap.exists) throw Object.assign(new Error('Price watch not found.'), { status: 404 })
  return { id: snap.id, ref, ...snap.data() }
}

export async function performPriceCheck(uid, watchId) {
  const watch = await getOwnedPriceWatch(uid, watchId)
  if (watch.active === false) throw Object.assign(new Error('This price watch is paused.'), { status: 409 })

  const checks = watch.ref.collection('checks')
  const previousSnap = await checks.orderBy('createdAt', 'desc').limit(1).get()
  const previous = previousSnap.empty ? null : { id: previousSnap.docs[0].id, ...previousSnap.docs[0].data() }
  const current = await scanProductPrice(watch.url)
  const checkRef = checks.doc()
  const now = admin.firestore.Timestamp.now()
  const previousPrice = previous?.price ?? watch.lastPrice ?? null
  const priceDrop = previousPrice != null && current.price < previousPrice
  const priceIncrease = previousPrice != null && current.price > previousPrice
  const targetReached = watch.targetPrice != null && current.price <= Number(watch.targetPrice)
  const dropAmount = priceDrop ? Number((previousPrice - current.price).toFixed(2)) : 0
  const dropPercent = priceDrop && previousPrice ? Number(((dropAmount / previousPrice) * 100).toFixed(2)) : 0

  const screenshotUrl = await saveScreenshot({
    buffer: current.screenshotBuffer,
    uid,
    siteId: `price-watch-${watchId}`,
    scanId: checkRef.id
  }).catch(() => null)

  let alert = { sent: false, reason: 'No alert condition matched.' }
  const alreadyAlertedAtThisPrice = watch.lastAlertPrice != null && Number(watch.lastAlertPrice) === current.price
  const shouldAlert = !alreadyAlertedAtThisPrice && ((watch.alertOnAnyDrop !== false && priceDrop) || targetReached)
  if (shouldAlert) {
    try {
      alert = await sendPriceAlert({
        to: watch.alertEmail,
        productName: watch.productName,
        oldPrice: previousPrice,
        newPrice: current.price,
        currency: current.currency,
        productUrl: current.url,
        targetPrice: watch.targetPrice ?? null
      })
    } catch (error) {
      console.warn('Price alert email failed:', error.response?.data?.message || error.message)
      alert = { sent: false, reason: error.response?.data?.message || error.message }
    }
  }

  const checkData = {
    watchId,
    ownerId: uid,
    url: current.url,
    productTitle: current.title,
    price: current.price,
    previousPrice,
    currency: current.currency,
    availability: current.availability,
    statusCode: current.statusCode,
    priceDrop,
    priceIncrease,
    targetReached,
    dropAmount,
    dropPercent,
    screenshotUrl,
    duration: current.duration,
    alertSent: Boolean(alert.sent),
    alertReason: alert.reason || null,
    createdAt: now
  }

  await checkRef.set(checkData)
  await watch.ref.set({
    detectedTitle: current.title,
    lastPrice: current.price,
    currency: current.currency,
    lastCheckedAt: now,
    lastStatusCode: current.statusCode,
    lowestPrice: watch.lowestPrice == null ? current.price : Math.min(Number(watch.lowestPrice), current.price),
    highestPrice: watch.highestPrice == null ? current.price : Math.max(Number(watch.highestPrice), current.price),
    totalChecks: admin.firestore.FieldValue.increment(1),
    totalDrops: admin.firestore.FieldValue.increment(priceDrop ? 1 : 0),
    ...(alert.sent ? { lastAlertPrice: current.price, lastAlertAt: now } : {}),
    updatedAt: now
  }, { merge: true })

  return { id: checkRef.id, ...checkData }
}
