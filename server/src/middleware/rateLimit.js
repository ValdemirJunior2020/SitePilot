import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const getRateLimitKey = (req) => {
  // Once Firebase authentication has run, rate-limit authenticated users
  // by their verified Firebase UID.
  if (req.user?.uid) {
    return `user:${req.user.uid}`
  }

  // Safe IPv4/IPv6 fallback for unauthenticated requests.
  return `ip:${ipKeyGenerator(req.ip)}`
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  message: {
    success: false,
    error: 'Too many requests. Please try again shortly.'
  }
})

export const scanLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  message: {
    success: false,
    error: 'Too many scan requests. Please wait before scanning again.'
  }
})