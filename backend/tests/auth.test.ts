import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index.js'
import { resetTables, query } from './setup.js'
import bcrypt from 'bcryptjs'

async function insertAdmin(username = 'testadmin', password = 'password123') {
  const hash = await bcrypt.hash(password, 10)
  await query(
    'INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [username, hash]
  )
}

describe('POST /api/admin/login', () => {
  beforeEach(async () => {
    await resetTables('admins')
    await insertAdmin()
  })

  it('rejects invalid credentials', async () => {
    const res = await app.request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testadmin', password: 'wrongpassword' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns accessToken on valid credentials', async () => {
    const res = await app.request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testadmin', password: 'password123' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { accessToken: string } }
    expect(typeof body.data.accessToken).toBe('string')
    expect(body.data.accessToken.split('.')).toHaveLength(3)
  })
})

describe('Protected admin routes', () => {
  it('returns 401 without token', async () => {
    const res = await app.request('/api/admin/teams', { method: 'POST' })
    expect(res.status).toBe(401)
  })
})
