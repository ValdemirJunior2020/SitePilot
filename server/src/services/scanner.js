import puppeteer from 'puppeteer'
import { assertSafeUrl, installRequestGuard } from '../utils/urlSecurity.js'
import {
  normalizeText,
  normalizeUrl,
  truncate
} from '../utils/normalization.js'
import { sha256 } from '../utils/hashing.js'

export async function scanWebsite(url) {
  await assertSafeUrl(url)

  const started = Date.now()
  let browser
  let page

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })

    page = await browser.newPage()

    await page.setViewport({
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1
    })

    await page.setUserAgent(
      'SitePilot Website Monitor/1.0'
    )

    page.setDefaultNavigationTimeout(60000)
    page.setDefaultTimeout(30000)

    await installRequestGuard(page)

    let response
    let navigationError = null

    try {
      response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      })

      await new Promise((resolve) => {
        setTimeout(resolve, 1200)
      })
    } catch (error) {
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
        const blocked = new Error(
          'Scan blocked because the page attempted to navigate to an unsafe/internal address.'
        )

        blocked.status = 400
        throw blocked
      }

      navigationError =
        error.message || 'Navigation failed'
    }

    const finalUrl =
      page.url() === 'about:blank'
        ? url
        : page.url()

    await assertSafeUrl(finalUrl)

    const statusCode =
      response?.status() || 0

    const extracted = await page.evaluate(() => {
      const clean = (value) =>
        (value || '')
          .replace(/\s+/g, ' ')
          .trim()

      const meta = (name) =>
        document
          .querySelector(`meta[name="${name}"]`)
          ?.getAttribute('content') || ''

      const canonical =
        document.querySelector(
          'link[rel="canonical"]'
        )?.href || ''

      const links = [
        ...document.querySelectorAll('a[href]')
      ]
        .map((anchor) => anchor.href)
        .filter(Boolean)

      const images = [
        ...document.images
      ]
        .map((image) => ({
          src:
            image.currentSrc ||
            image.src,
          alt: clean(image.alt)
        }))
        .filter((image) => image.src)

      const headings = [
        ...document.querySelectorAll(
          'h1,h2,h3'
        )
      ]
        .map((heading) => ({
          level:
            heading.tagName.toLowerCase(),
          text: clean(
            heading.innerText
          )
        }))
        .filter(
          (heading) => heading.text
        )

      const h1 = clean(
        document.querySelector('h1')
          ?.innerText
      )

      const clone =
        document.body?.cloneNode(true)

      if (clone) {
        clone
          .querySelectorAll(
            'script,style,noscript,svg,canvas,template'
          )
          .forEach((element) => {
            element.remove()
          })
      }

      const visibleText = clean(
        clone?.innerText ||
          document.body?.innerText ||
          ''
      )

      return {
        title: clean(
          document.title
        ),

        description: clean(
          meta('description')
        ),

        h1,

        canonical,

        links,

        images,

        headings,

        visibleText,

        html:
          document.documentElement
            ?.outerHTML || ''
      }
    })

    const screenshotSize =
      navigationError
        ? null
        : await page
            .evaluate(() => ({
              width: Math.max(
                1,
                Math.min(
                  1440,
                  document.documentElement
                    ?.scrollWidth || 1440
                )
              ),

              height: Math.max(
                1,
                Math.min(
                  12000,
                  document.documentElement
                    ?.scrollHeight || 1000
                )
              )
            }))
            .catch(() => null)

    const screenshotBuffer =
      !screenshotSize
        ? null
        : await page
            .screenshot({
              type: 'png',

              captureBeyondViewport: true,

              clip: {
                x: 0,
                y: 0,

                width:
                  screenshotSize.width,

                height:
                  screenshotSize.height
              }
            })
            .catch(() => null)

    const visibleText = truncate(
      normalizeText(
        extracted.visibleText
      ),
      90000
    )

    const normalizedHtml =
      normalizeText(
        extracted.html
      )

    const links = [
      ...new Set(
        extracted.links
          .map((link) =>
            normalizeUrl(link)
          )
          .filter(Boolean)
      )
    ].slice(0, 300)

    const cleanTitle = truncate(
      normalizeText(
        extracted.title
      ),
      500
    )

    const cleanDescription =
      truncate(
        normalizeText(
          extracted.description
        ),
        1200
      )

    const cleanH1 = truncate(
      normalizeText(
        extracted.h1
      ),
      800
    )

    const cleanCanonical =
      truncate(
        normalizeUrl(
          extracted.canonical
        ),
        1200
      )

    const missingAlt =
      extracted.images.filter(
        (image) =>
          !normalizeText(
            image.alt
          )
      ).length

    const healthIssues = []

    if (!cleanTitle) {
      healthIssues.push(
        'Missing page title'
      )
    }

    if (
      cleanTitle.length > 60
    ) {
      healthIssues.push(
        'Page title is longer than 60 characters'
      )
    }

    if (!cleanDescription) {
      healthIssues.push(
        'Missing meta description'
      )
    }

    if (
      cleanDescription.length > 160
    ) {
      healthIssues.push(
        'Meta description is longer than 160 characters'
      )
    }

    if (!cleanH1) {
      healthIssues.push(
        'Missing main H1'
      )
    }

    if (!cleanCanonical) {
      healthIssues.push(
        'Missing canonical URL'
      )
    }

    if (missingAlt) {
      healthIssues.push(
        `${missingAlt} image${
          missingAlt === 1
            ? ''
            : 's'
        } missing alt text`
      )
    }

    if (statusCode === 0) {
      healthIssues.push(
        'Page could not be reached'
      )
    } else if (
      statusCode >= 400
    ) {
      healthIssues.push(
        `HTTP ${statusCode} response`
      )
    }

    return {
      url: finalUrl,

      title:
        cleanTitle,

      description:
        cleanDescription,

      h1:
        cleanH1,

      canonicalUrl:
        cleanCanonical,

      statusCode,

      visibleText,

      textHash:
        sha256(
          visibleText
        ),

      htmlHash:
        sha256(
          normalizedHtml
        ),

      links,

      images:
        extracted.images.slice(
          0,
          120
        ),

      headings:
        extracted.headings.slice(
          0,
          100
        ),

      healthIssues,

      screenshotHash:
        screenshotBuffer
          ? sha256(
              screenshotBuffer
            )
          : null,

      screenshotBuffer,

      navigationError,

      duration:
        Date.now() - started
    }
  } finally {
    if (page) {
      await page
        .close()
        .catch(() => {})
    }

    if (browser) {
      await browser
        .close()
        .catch(() => {})
    }
  }
}