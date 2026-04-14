import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import 'dotenv/config'

import tournamentsRoutes from './routes/tournaments.js'
import teamsRoutes from './routes/teams.js'
import playersRoutes from './routes/players.js'
import matchesRoutes from './routes/matches.js'
import newsRoutes from './routes/news.js'
import statsRoutes from './routes/stats.js'
import searchRoutes from './routes/search.js'
import adminAuthRoutes from './routes/admin/auth.js'
import adminTeamsRoutes from './routes/admin/teams.js'
import adminPlayersRoutes from './routes/admin/players.js'
import adminMatchesRoutes from './routes/admin/matches.js'
import adminNewsRoutes from './routes/admin/news.js'
import adminUploadRoutes from './routes/admin/upload.js'
import adminImportRoutes from './routes/admin/import.js'

export const app = new Hono()

// Public routes
app.route('/api/tournaments', tournamentsRoutes)
app.route('/api/teams', teamsRoutes)
app.route('/api/players', playersRoutes)
app.route('/api/matches', matchesRoutes)
app.route('/api/news', newsRoutes)
app.route('/api/stats', statsRoutes)
app.route('/api/search', searchRoutes)

// Admin routes
app.route('/api/admin', adminAuthRoutes)
app.route('/api/admin/teams', adminTeamsRoutes)
app.route('/api/admin/players', adminPlayersRoutes)
app.route('/api/admin/matches', adminMatchesRoutes)
app.route('/api/admin/news', adminNewsRoutes)
app.route('/api/admin/upload', adminUploadRoutes)
app.route('/api/admin/import', adminImportRoutes)

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Only start server when not in test
if (process.env.NODE_ENV !== 'test') {
  const port = parseInt(process.env.PORT ?? '3001')
  serve({ fetch: app.fetch, port }, () => {
    console.log(`ALAST API running on http://localhost:${port}`)
  })
}

export default app
