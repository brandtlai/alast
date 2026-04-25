import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import TeamLogo from '../TeamLogo.js'
import StatusBadge from '../StatusBadge.js'
import type { Match } from '../../types.js'

interface Props {
  match: Match
  variant?: 'overview' | 'results' | 'bracket-card'
}

export default function MatchRow({ match, variant = 'overview' }: Props) {
  const finished = match.status === 'finished'

  if (variant === 'bracket-card') {
    return (
      <Link
        to={`/matches/${match.id}`}
        className="block rounded-md border px-3 py-2 transition-colors"
        style={{
          background: 'var(--color-data-row)',
          borderColor: 'var(--color-data-divider)',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamLogo url={match.team_a_logo} name={match.team_a_name ?? '?'} size={20} />
            <span className="text-xs font-bold truncate text-white/85">{match.team_a_name ?? 'TBD'}</span>
          </div>
          <span className={`text-sm font-black tabular-nums ${finished ? 'text-primary' : 'text-white/40'}`}>
            {finished ? match.maps_won_a : '–'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamLogo url={match.team_b_logo} name={match.team_b_name ?? '?'} size={20} />
            <span className="text-xs font-bold truncate text-white/85">{match.team_b_name ?? 'TBD'}</span>
          </div>
          <span className={`text-sm font-black tabular-nums ${finished ? 'text-primary' : 'text-white/40'}`}>
            {finished ? match.maps_won_b : '–'}
          </span>
        </div>
      </Link>
    )
  }

  // overview / results — horizontal row
  return (
    <Link
      to={`/matches/${match.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-md border transition-colors hover:border-primary/40"
      style={{
        background: 'var(--color-data-row)',
        borderColor: 'var(--color-data-divider)',
      }}
    >
      {/* Time */}
      <div className="hidden sm:block text-[10px] font-mono text-white/35 w-14 flex-shrink-0">
        {match.scheduled_at ? dayjs(match.scheduled_at).format('MM-DD HH:mm') : ''}
      </div>

      {/* Team A */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="font-black text-sm truncate text-white/90">{match.team_a_name ?? 'TBD'}</span>
        <TeamLogo url={match.team_a_logo} name={match.team_a_name ?? '?'} size={28} />
      </div>

      {/* Score capsule */}
      <div className="text-center flex-shrink-0 min-w-[70px]">
        {finished
          ? (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-md font-black tabular-nums text-base"
              style={{ background: 'var(--color-data-chip)' }}>
              <span className="text-white">{match.maps_won_a}</span>
              <span className="text-white/30">:</span>
              <span className="text-white">{match.maps_won_b}</span>
            </div>
          )
          : <StatusBadge status={match.status} />}
      </div>

      {/* Team B */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TeamLogo url={match.team_b_logo} name={match.team_b_name ?? '?'} size={28} />
        <span className="font-black text-sm truncate text-white/90">{match.team_b_name ?? 'TBD'}</span>
      </div>

      {/* BO badge */}
      <div className="hidden md:block text-[9px] font-black uppercase tracking-widest text-white/30 w-10 text-right flex-shrink-0">
        {variant === 'results' ? 'FT' : 'BO?'}
      </div>
    </Link>
  )
}
