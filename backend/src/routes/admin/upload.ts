import { Hono } from 'hono'
import { writeFile } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif'
])
const MAX_SIZE = 5 * 1024 * 1024  // 5MB
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/opt/alast/uploads'

const r = new Hono()

r.post('/', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file'] as File | undefined
  if (!file) return c.json(err('No file provided', 'VALIDATION_ERROR'), 400)
  if (!ALLOWED_MIMES.has(file.type)) {
    return c.json(err('File type not allowed. Accepted: jpeg, png, webp, gif', 'VALIDATION_ERROR'), 400)
  }
  if (file.size > MAX_SIZE) {
    return c.json(err('File too large. Maximum 5MB', 'VALIDATION_ERROR'), 400)
  }

  const ext = extname(file.name) || '.jpg'
  const filename = `${randomUUID()}${ext}`
  const type = c.req.query('type')
  const folder = ['teams', 'players', 'news'].includes(type ?? '') ? type! : 'news'
  const filePath = join(UPLOADS_DIR, folder, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  const { rows } = await query(
    `INSERT INTO media (filename, original_name, path, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [filename, file.name, filePath, file.type, file.size]
  )

  const url = `/uploads/${folder}/${filename}`
  return c.json(ok({ url, media_id: rows[0].id }), 201)
})

export default r
