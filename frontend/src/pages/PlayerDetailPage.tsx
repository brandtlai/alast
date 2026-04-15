import { useParams, Link } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { usePlayer } from '../api/players'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'

function StatCard({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-lg p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{value ?? '—'}</div>
      <div className="text-xs opacity-50 mt-1">{label}</div>
    </div>
  )
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: player, isLoading, error } = usePlayer(id!)

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error.message} />
  if (!player) return null

  const cs = player.career_stats

  const radarOption = cs ? {
    backgroundColor: 'transparent',
    radar: {
      indicator: [
        { name: 'Rating', max: 2 },
        { name: 'ADR', max: 150 },
        { name: 'KAST%', max: 100 },
        { name: 'HS%', max: 80 },
      ],
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      name: { textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 11 } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          parseFloat(cs.avg_rating ?? '0'),
          parseFloat(cs.avg_adr ?? '0'),
          parseFloat(cs.avg_kast ?? '0'),
          parseFloat(cs.avg_hs_pct ?? '0'),
        ],
        name: player.nickname,
        areaStyle: { color: 'rgba(255,138,0,0.2)' },
        lineStyle: { color: 'var(--color-primary)' },
        itemStyle: { color: 'var(--color-primary)' },
      }],
    }],
  } : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: 'var(--color-secondary)', border: '2px solid var(--color-primary)' }}>
          {player.nickname.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{player.nickname}</h1>
          {player.real_name && <div className="opacity-60">{player.real_name}</div>}
          {player.team_name && (
            <Link to={`/teams/${player.team_id}`} className="flex items-center gap-2 mt-1 hover:opacity-80">
              <TeamLogo url={player.team_logo_url} name={player.team_name} size={20} />
              <span className="text-sm opacity-70">{player.team_name}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {cs && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Rating" value={cs.avg_rating} />
          <StatCard label="ADR" value={cs.avg_adr} />
          <StatCard label="KAST%" value={cs.avg_kast} />
          <StatCard label="HS%" value={cs.avg_hs_pct} />
          <StatCard label="总击杀" value={cs.total_kills} />
          <StatCard label="总死亡" value={cs.total_deaths} />
          <StatCard label="参赛图数" value={cs.maps_played} />
        </div>
      )}

      {/* Radar Chart */}
      {radarOption && (
        <section>
          <h2 className="text-xl font-bold mb-4">能力雷达</h2>
          <div className="rounded-lg p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', maxWidth: 360 }}>
            <ReactECharts option={radarOption as object} style={{ height: 280 }} />
          </div>
        </section>
      )}

      {/* Match History */}
      {player.match_history && player.match_history.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">近期表现</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase opacity-50" style={{ background: 'rgba(10,15,45,0.8)' }}>
                  <th className="px-4 py-3">地图</th>
                  <th className="px-4 py-3">对手</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">K/D</th>
                  <th className="px-4 py-3">ADR</th>
                  <th className="px-4 py-3">日期</th>
                </tr>
              </thead>
              <tbody>
                {player.match_history.map((h, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(10,15,45,0.3)' }}>
                    <td className="px-4 py-3 font-mono text-xs">{h.map_name}</td>
                    <td className="px-4 py-3 opacity-70">{h.opponent_name ?? '—'}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: parseFloat(String(h.rating ?? 0)) >= 1.0 ? 'var(--color-primary)' : 'inherit' }}>{h.rating?.toFixed(2) ?? '—'}</td>
                    <td className="px-4 py-3">{h.kills ?? '—'}/{h.deaths ?? '—'}</td>
                    <td className="px-4 py-3 opacity-70">{h.adr?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-3 opacity-40 text-xs">{h.scheduled_at ? dayjs(h.scheduled_at).format('MM-DD') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
