import type { MiddlewareHandler } from 'hono'
import jwt from 'jsonwebtoken'

export interface JwtPayload {
  adminId: string
  username: string
}

export function authMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('Authorization')
    if (!header?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
    }
    const token = header.slice(7)
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
      c.set('jwtPayload', payload)
      return next()
    } catch {
      return c.json({ success: false, error: 'Invalid token', code: 'INVALID_TOKEN' }, 401)
    }
  }
}
