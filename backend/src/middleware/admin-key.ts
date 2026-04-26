import type { MiddlewareHandler } from 'hono'

export function adminKeyMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const expected = process.env.ADMIN_IMPORT_KEY
    if (!expected) {
      return c.json({ success: false, error: 'Admin import disabled', code: 'NOT_CONFIGURED' }, 503)
    }
    const supplied = c.req.header('X-Admin-Key')
    if (supplied !== expected) {
      return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }
    return next()
  }
}
