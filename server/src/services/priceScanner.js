import puppeteer from 'puppeteer'
import { assertSafeUrl, installRequestGuard } from '../utils/urlSecurity.js'
import { normalizeText, truncate } from '../utils/normalization.js'

export function parsePriceValue(value) {
  if (value == null) return null
  const raw = String(value).trim().replace(/\s/g, '')
  if (!raw) return null

  let cleaned = raw.replace(/[^0-9.,-]/g, '')
  if (!cleaned) return null

  const comma = cleaned.lastIndexOf(',')
  const dot = cleaned.lastIndexOf('.')
  if (comma > dot) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    cleaned = cleaned.replace(/,/g, '')
  }

  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function normalizeCurrency(value) {
  const text = String(value || '').trim().toUpperCase()
  if (/^[A-Z]{3}$/.test(text)) return text
  if (text.includes('$')) return 'USD'
  if (text.includes('€')) return 'EUR'
  if (text.includes('£')) return 'GBP'
  if (text.includes('CAD')) return 'CAD'
  return 'USD'
}

export async function scanProductPrice(url) {
  await assertSafeUrl(url)
  const started = Date.now()
  let browser
  let page

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    })

    page = await browser.newPage()
    await page.setViewport({ width: 1365, height: 900, deviceScaleFactor: 1 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36 SitePilot/1.0')
    page.setDefaultNavigationTimeout(60000)
    page.setDefaultTimeout(25000)
    await installRequestGuard(page)

    let response = null
    try {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await new Promise((resolve) => setTimeout(resolve, 1200))
    } catch (error) {
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
        const blocked = new Error('Product scan was blocked because the page attempted to reach an unsafe/internal address.')
        blocked.status = 400
        throw blocked
      }
      throw Object.assign(new Error(`Product page could not be loaded: ${error.message}`), { status: 502 })
    }

    const finalUrl = page.url() === 'about:blank' ? url : page.url()
    await assertSafeUrl(finalUrl)

    const extracted = await page.evaluate(() => {
      const clean = (v) => (v || '').replace(/\s+/g, ' ').trim()
      const content = (selector, attr = 'content') => document.querySelector(selector)?.getAttribute(attr) || ''
      const text = (selector) => clean(document.querySelector(selector)?.textContent || '')

      const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .flatMap((node) => {
          try {
            const parsed = JSON.parse(node.textContent || '{}')
            return Array.isArray(parsed) ? parsed : [parsed]
          } catch {
            return []
          }
        })

      const nodes = []
      const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return
        nodes.push(obj)
        if (Array.isArray(obj['@graph'])) obj['@graph'].forEach(walk)
        if (Array.isArray(obj.itemListElement)) obj.itemListElement.forEach(walk)
      }
      jsonLd.forEach(walk)

      let structured = null
      for (const node of nodes) {
        const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
        if (!types.filter(Boolean).some((t) => String(t).toLowerCase() === 'product')) continue
        const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers
        if (offers) {
          structured = {
            name: node.name || '',
            price: offers.price || offers.lowPrice || '',
            currency: offers.priceCurrency || '',
            availability: offers.availability || ''
          }
          break
        }
      }

      const selectorCandidates = [
        '[itemprop="price"]',
        '[data-testid*="price"]',
        '[data-test*="price"]',
        '.a-price .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '#corePrice_feature_div .a-offscreen',
        '.priceView-customer-price span',
        '.price-current',
        '.product-price',
        '.price',
        '[class*="sale-price"]',
        '[class*="current-price"]'
      ]

      let selectorPrice = ''
      for (const selector of selectorCandidates) {
        const el = document.querySelector(selector)
        if (!el) continue
        selectorPrice = el.getAttribute('content') || clean(el.textContent)
        if (selectorPrice) break
      }

      const metaPrice =
        content('meta[property="product:price:amount"]') ||
        content('meta[property="og:price:amount"]') ||
        content('meta[itemprop="price"]')

      const currency =
        structured?.currency ||
        content('meta[property="product:price:currency"]') ||
        content('meta[property="og:price:currency"]') ||
        content('meta[itemprop="priceCurrency"]') || ''

      const title =
        structured?.name ||
        content('meta[property="og:title"]') ||
        text('h1') ||
        document.title || ''

      const bodyText = clean(document.body?.innerText || '')
      const priceMatches = bodyText.match(/(?:US\$|CA\$|\$|€|£)\s?\d{1,6}(?:[,.]\d{2})?/g) || []

      return {
        title: clean(title),
        structuredPrice: structured?.price || '',
        metaPrice,
        selectorPrice,
        currency,
        availability: structured?.availability || '',
        fallbackPrices: priceMatches.slice(0, 25)
      }
    })

    const candidates = [extracted.structuredPrice, extracted.metaPrice, extracted.selectorPrice, ...extracted.fallbackPrices]
      .map((raw) => ({ raw, value: parsePriceValue(raw) }))
      .filter((item) => item.value != null && item.value > 0)

    if (!candidates.length) {
      const error = new Error('SitePilot loaded the product page but could not identify a reliable product price.')
      error.status = 422
      throw error
    }

    const chosen = candidates[0]
    const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false }).catch(() => null)

    return {
      url: finalUrl,
      title: truncate(normalizeText(extracted.title), 500),
      price: Number(chosen.value.toFixed(2)),
      currency: normalizeCurrency(extracted.currency || chosen.raw),
      availability: truncate(normalizeText(extracted.availability), 300),
      statusCode: response?.status() || 0,
      screenshotBuffer,
      duration: Date.now() - started
    }
  } finally {
    if (page) await page.close().catch(() => {})
    if (browser) await browser.close().catch(() => {})
  }
}
