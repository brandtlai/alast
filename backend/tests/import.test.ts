import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index.js'
import { resetTables, insertTeam, insertTournament, query } from './setup.js'
import bcrypt from 'bcryptjs'

const SAMPLE_CSDM = {
  name: 'test-match',
  date: '2026-04-14T10:00:00Z',
  mapName: 'de_dust2',
  duration: 2280,
  teamA: {
    name: 'NAVI', score: 13,
    players: [{
      steamId: '76561198034202275', name: 's1mple',
      kills: 28, deaths: 14, assists: 2,
      headshotsCount: 8, headshotPercentage: 28.57,
      averageDamagePerRound: 94.2, kast: 78.5,
      hltv2Rating: 1.58, firstKillCount: 7, firstDeathCount: 3
    }]
  },
  teamB: { name: 'Vitality', score: 6, players: [] }
}

async function getAdminToken() {
  const hash = await bcrypt.hash('password123', 10)
  await query('INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING', ['admin', hash])
  const res = await app.request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password123' }),
  })
  const body = await res.json() as { data: { accessToken: string } }
  return body.data.accessToken
}

describe('POST /api/admin/import/preview', () => {
  beforeEach(() => resetTables('csdm_imports', 'player_match_stats', 'match_maps', 'matches', 'players', 'teams', 'tournaments', 'admins'))

  it('returns preview with team match status', async () => {
    const token = await getAdminToken()
    const formData = new FormData()
    const blob = new Blob([JSON.stringify(SAMPLE_CSDM)], { type: 'application/json' })
    formData.append('file', blob, 'match.json')

    const res = await app.request('/api/admin/import/preview', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    expect(res.status).toBe(200)
    const body = await res.json() as {
      data: {
        import_id: string
        map_name: string
        team_a: { name: string; matched_id?: string }
        team_b: { name: string; matched_id?: string }
        players: Array<{ steam_id: string; match_status: string }>
      }
    }
    expect(body.data.import_id).toBeTruthy()
    expect(body.data.map_name).toBe('de_dust2')
    expect(body.data.team_a.name).toBe('NAVI')
    expect(body.data.team_a.matched_id).toBeUndefined()
    expect(body.data.players[0].match_status).toBe('team_missing')
  })

  it('matches existing teams by name', async () => {
    await insertTeam({ name: 'NAVI', region: 'EU' })
    const token = await getAdminToken()
    const formData = new FormData()
    const blob = new Blob([JSON.stringify(SAMPLE_CSDM)], { type: 'application/json' })
    formData.append('file', blob, 'match.json')

    const res = await app.request('/api/admin/import/preview', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const body = await res.json() as {
      data: { team_a: { name: string; matched_id: string } }
    }
    expect(body.data.team_a.matched_id).toBeTruthy()
  })
})
