import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index.js'
import { resetTables, query } from './setup.js'
import bcrypt from 'bcryptjs'

async function getToken() {
  const hash = await bcrypt.hash('changeme123', 10)
  await query('INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING', ['admin', hash])
  const res = await app.request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'changeme123' }),
  })
  const body = await res.json() as { data: { accessToken: string } }
  return body.data.accessToken
}

describe('POST /api/admin/upload', () => {
  beforeEach(() => resetTables('admins', 'media'))

  it('rejects without auth', async () => {
    const res = await app.request('/api/admin/upload', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('rejects non-image MIME types', async () => {
    const token = await getToken()

    const formData = new FormData()
    const blob = new Blob(['not an image'], { type: 'text/plain' })
    formData.append('file', blob, 'test.txt')

    const res = await app.request('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    expect(res.status).toBe(400)
  })
})
