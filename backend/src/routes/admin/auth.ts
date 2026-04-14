import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'
import { rateLimitMiddleware } from '../../middleware/rate-limit.js'

const r = new Hono()

r.post('/login', rateLimitMiddleware(5, 60_000), async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()

  const { rows } = await query<{ id: string; username: string; password_hash: string }>(
    'SELECT * FROM admins WHERE username = $1',
    [username]
  )
  if (rows.length === 0) return c.json(err('Invalid credentials', 'INVALID_CREDENTIALS'), 401)

  const valid = await bcrypt.compare(password, rows[0].password_hash)
  if (!valid) return c.json(err('Invalid credentials', 'INVALID_CREDENTIALS'), 401)

  const payload = { adminId: rows[0].id, username: rows[0].username }
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' })
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })

  setCookie(c, 'refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/api/admin/refresh',
  })

  return c.json(ok({ accessToken }))
})

r.post('/refresh', async (c) => {
  const cookies = c.req.header('cookie') ?? ''
  const match = cookies.match(/refreshToken=([^;]+)/)
  if (!match) return c.json(err('No refresh token', 'UNAUTHORIZED'), 401)

  try {
    const payload = jwt.verify(match[1], process.env.JWT_REFRESH_SECRET!) as {
      adminId: string; username: string
    }
    const newPayload = { adminId: payload.adminId, username: payload.username }
    const accessToken = jwt.sign(newPayload, process.env.JWT_SECRET!, { expiresIn: '15m' })
    const newRefresh = jwt.sign(newPayload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })

    setCookie(c, 'refreshToken', newRefresh, {
      httpOnly: true, secure: true, sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60, path: '/api/admin/refresh',
    })

    return c.json(ok({ accessToken }))
  } catch {
    return c.json(err('Invalid refresh token', 'INVALID_TOKEN'), 401)
  }
})

r.post('/logout', (c) => {
  deleteCookie(c, 'refreshToken', { path: '/api/admin/refresh' })
  return c.json(ok({ message: 'Logged out' }))
})

export default r
