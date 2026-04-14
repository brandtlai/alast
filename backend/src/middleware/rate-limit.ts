import type { MiddlewareHandler } from 'hono'

const ipCounts = new Map<string, { count: number; resetAt: number }>()

export function rateLimitMiddleware(maxRequests: number, windowMs: number): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP')
      ?? c.req.header('X-Real-IP')
      ?? 'unknown'
    const now = Date.now()
    const entry = ipCounts.get(ip)

    if (!entry || entry.resetAt < now) {
      ipCounts.set(ip, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (entry.count >= maxRequests) {
      return c.json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' }, 429)
    }

    entry.count++
    return next()
  }
}
