import crypto from 'node:crypto'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()

  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

function safePart(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 160)
}

function signCloudinaryParams(params, apiSecret) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return crypto
    .createHash('sha1')
    .update(`${serialized}${apiSecret}`)
    .digest('hex')
}

async function uploadToCloudinary({ buffer, uid, siteId, scanId }) {
  const config = cloudinaryConfig()
  if (!config) return null

  const publicId = `sitepilot/${safePart(uid)}/${safePart(siteId)}/${safePart(scanId)}`
  const timestamp = Math.floor(Date.now() / 1000)
  const signedParams = {
    overwrite: 'true',
    public_id: publicId,
    timestamp
  }

  const signature = signCloudinaryParams(signedParams, config.apiSecret)
  const form = new FormData()

  form.append('file', new Blob([buffer], { type: 'image/png' }), `${safePart(scanId)}.png`)
  form.append('api_key', config.apiKey)
  form.append('timestamp', String(timestamp))
  form.append('public_id', publicId)
  form.append('overwrite', 'true')
  form.append('signature', signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`,
    {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000)
    }
  )

  const result = await response.json().catch(() => ({}))

  if (!response.ok || !result.secure_url) {
    const message = result?.error?.message || `Cloudinary upload failed with HTTP ${response.status}`
    throw new Error(message)
  }

  return result.secure_url
}

async function deleteCloudinaryPrefix(prefix) {
  const config = cloudinaryConfig()
  if (!config) return false

  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')
  let nextCursor = null

  do {
    const params = new URLSearchParams({ prefix })
    if (nextCursor) params.set('next_cursor', nextCursor)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/resources/image/upload?${params}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(30000)
      }
    )

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = result?.error?.message || `Cloudinary delete failed with HTTP ${response.status}`
      throw new Error(message)
    }

    nextCursor = result?.next_cursor || null
  } while (nextCursor)

  return true
}

export async function saveScreenshot({ buffer, uid, siteId, scanId }) {
  if (!buffer) return null

  const cloudinaryUrl = await uploadToCloudinary({ buffer, uid, siteId, scanId })
  if (cloudinaryUrl) return cloudinaryUrl

  // Local-only development fallback when Cloudinary isn't configured.
  const dir = path.resolve('screenshots', safePart(uid), safePart(siteId))
  await mkdir(dir, { recursive: true })

  const fileName = `${safePart(scanId)}.png`
  await writeFile(path.join(dir, fileName), buffer)

  const base = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || 5000}`
  return `${base.replace(/\/$/, '')}/screenshots/${encodeURIComponent(safePart(uid))}/${encodeURIComponent(safePart(siteId))}/${fileName}`
}

export async function deleteSiteScreenshots(uid, siteId) {
  const prefix = `sitepilot/${safePart(uid)}/${safePart(siteId)}/`
  const deletedFromCloudinary = await deleteCloudinaryPrefix(prefix)
  if (deletedFromCloudinary) return

  const dir = path.resolve('screenshots', safePart(uid), safePart(siteId))
  await rm(dir, { recursive: true, force: true })
}
