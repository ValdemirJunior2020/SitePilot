import { getDb, admin } from '../config/firebase.js'
import { assertSafeUrl } from '../utils/urlSecurity.js'
import { serializeDoc, serializeValue } from '../utils/serializers.js'
import { getOwnedPriceWatch, performPriceCheck, priceWatchRef } from '../services/priceWatchService.js'
import { searchShoppingDeals } from '../services/dealSearchService.js'

const frequencies = new Set(['Manual', 'Every 6 hours', 'Every 12 hours', 'Daily', 'Weekly'])

function validate(body, partial = false, fallbackEmail = '') {
  const out = {}
  if (!partial || body.productName !== undefined) {
    const value = String(body.productName || '').trim()
    if (!value || value.length > 180) throw Object.assign(new Error('What do you want to track? Enter a product name.'), { status: 400 })
    out.productName = value
  }
  if (!partial || body.url !== undefined) {
    const value = String(body.url || '').trim()
    if (!value || value.length > 2048) throw Object.assign(new Error('A product page URL is required.'), { status: 400 })
    out.url = value
  }
  if (!partial || body.frequency !== undefined) {
    if (!frequencies.has(body.frequency)) throw Object.assign(new Error('Choose a valid check frequency.'), { status: 400 })
    out.frequency = body.frequency
  }
  if (body.targetPrice !== undefined) {
    if (body.targetPrice === '' || body.targetPrice == null) out.targetPrice = null
    else {
      const value = Number(body.targetPrice)
      if (!Number.isFinite(value) || value <= 0) throw Object.assign(new Error('Target price must be a positive number.'), { status: 400 })
      out.targetPrice = Number(value.toFixed(2))
    }
  }
  if (!partial || body.alertEmail !== undefined) {
    const email = String(body.alertEmail || fallbackEmail || '').trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) throw Object.assign(new Error('Enter a valid alert email.'), { status: 400 })
    out.alertEmail = email
  }
  if (body.alertOnAnyDrop !== undefined) out.alertOnAnyDrop = Boolean(body.alertOnAnyDrop)
  if (body.active !== undefined) out.active = Boolean(body.active)
  return out
}

export async function listPriceWatches(req, res, next) {
  try {
    const snap = await getDb().collection('users').doc(req.user.uid).collection('priceWatches').orderBy('createdAt', 'desc').get()
    res.json({ success: true, data: snap.docs.map(serializeDoc) })
  } catch (e) { next(e) }
}

export async function createPriceWatch(req, res, next) {
  try {
    const data = validate(req.body, false, req.user.email || '')
    await assertSafeUrl(data.url)
    const ref = getDb().collection('users').doc(req.user.uid).collection('priceWatches').doc()
    const now = admin.firestore.Timestamp.now()
    const watch = {
      ...data,
      active: true,
      alertOnAnyDrop: data.alertOnAnyDrop !== false,
      lastPrice: null,
      currency: 'USD',
      lowestPrice: null,
      highestPrice: null,
      lastCheckedAt: null,
      lastAlertAt: null,
      lastAlertPrice: null,
      totalChecks: 0,
      totalDrops: 0,
      createdAt: now,
      updatedAt: now
    }
    await ref.set(watch)
    res.status(201).json({ success: true, data: serializeValue({ id: ref.id, ...watch }) })
  } catch (e) { next(e) }
}

export async function getPriceWatch(req, res, next) {
  try {
    const watch = await getOwnedPriceWatch(req.user.uid, req.params.id)
    const { ref, ...data } = watch
    res.json({ success: true, data: serializeValue(data) })
  } catch (e) { next(e) }
}

export async function updatePriceWatch(req, res, next) {
  try {
    const data = validate(req.body, true, req.user.email || '')
    if (data.url) await assertSafeUrl(data.url)
    await getOwnedPriceWatch(req.user.uid, req.params.id)
    await priceWatchRef(req.user.uid, req.params.id).update({ ...data, updatedAt: admin.firestore.Timestamp.now() })
    const snap = await priceWatchRef(req.user.uid, req.params.id).get()
    res.json({ success: true, data: serializeDoc(snap) })
  } catch (e) { next(e) }
}

export async function deletePriceWatch(req, res, next) {
  try {
    const watch = await getOwnedPriceWatch(req.user.uid, req.params.id)
    const checks = await watch.ref.collection('checks').get()
    const db = getDb()
    for (let i = 0; i < checks.docs.length; i += 400) {
      const batch = db.batch()
      checks.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
    }
    await watch.ref.delete()
    res.json({ success: true, data: { id: req.params.id } })
  } catch (e) { next(e) }
}

export async function checkPrice(req, res, next) {
  try {
    const result = await performPriceCheck(req.user.uid, req.params.id)
    res.status(201).json({ success: true, data: serializeValue(result) })
  } catch (e) { next(e) }
}

export async function listPriceChecks(req, res, next) {
  try {
    const watch = await getOwnedPriceWatch(req.user.uid, req.params.id)
    const snap = await watch.ref.collection('checks').orderBy('createdAt', 'desc').limit(100).get()
    res.json({ success: true, data: snap.docs.map(serializeDoc) })
  } catch (e) { next(e) }
}

export async function searchDeals(req, res, next) {
  try {
    const watch = await getOwnedPriceWatch(req.user.uid, req.params.id)
    const result = await searchShoppingDeals(watch.productName)
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
}
