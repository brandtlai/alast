import type { BracketMatch } from '../../../types'
import type { BracketSlot, SlotSource } from './structure'
import { SLOT_BY_ID } from './structure'
import type { SeededTeam } from './seeds'

/**
 * Resolved team for a slot position. `null` means "not yet determined"
 * (e.g. predecessor match hasn't finished, or DB row doesn't exist yet).
 * `{ type: 'bye' }` is the canonical "no opponent" marker.
 */
export type ResolvedTeam =
  | { type: 'team'; teamId: string; name: string; logoUrl: string | null; seed: number | null }
  | { type: 'bye' }
  | { type: 'tbd'; sourceLabel: string }

export interface ResolvedSlot {
  slot: BracketSlot
  match: BracketMatch | null   // DB row if found
  top: ResolvedTeam
  bottom: ResolvedTeam
  winnerTeamId: string | null  // populated when match is finished
  loserTeamId: string | null
}

// ── Source resolution ────────────────────────────────────────────────────────

/** Human-readable label for a TBD slot position (e.g. "胜者组 R1 #1 胜者"). */
function sourceLabel(src: SlotSource): string {
  if (src.type === 'seed') return `种子 #${src.seed}`
  if (src.type === 'bye') return '轮空'
  const refSlot = SLOT_BY_ID.get(src.slotId)
  if (!refSlot) return 'TBD'
  // e.g. "胜者组 R1 #1 胜者" – pull last digit from slot id where possible
  const trailing = src.slotId.match(/m(\d+)/)
  const suffix = trailing ? ` #${trailing[1]}` : ''
  return `${refSlot.stageLabel}${suffix} ${src.type === 'winnerOf' ? '胜者' : '败者'}`
}

function resolveSource(
  src: SlotSource,
  seeds: Map<number, SeededTeam>,
  resolved: Map<string, ResolvedSlot>,
): ResolvedTeam {
  if (src.type === 'bye') return { type: 'bye' }
  if (src.type === 'seed') {
    const t = seeds.get(src.seed)
    if (!t) return { type: 'tbd', sourceLabel: `种子 #${src.seed}` }
    return { type: 'team', teamId: t.teamId, name: t.name, logoUrl: t.logoUrl, seed: t.seed }
  }
  const ref = resolved.get(src.slotId)
  if (!ref || !ref.match || ref.match.status !== 'finished') {
    return { type: 'tbd', sourceLabel: sourceLabel(src) }
  }
  const targetTeamId = src.type === 'winnerOf' ? ref.winnerTeamId : ref.loserTeamId
  if (!targetTeamId) {
    return { type: 'tbd', sourceLabel: sourceLabel(src) }
  }
  // Hydrate name/logo from the source match row
  if (targetTeamId === ref.match.team_a_id) {
    return {
      type: 'team', teamId: targetTeamId,
      name: ref.match.team_a_name ?? '',
      logoUrl: ref.match.team_a_logo,
      seed: ref.top.type === 'team' ? ref.top.seed : null,
    }
  }
  return {
    type: 'team', teamId: targetTeamId,
    name: ref.match.team_b_name ?? '',
    logoUrl: ref.match.team_b_logo,
    seed: ref.bottom.type === 'team' ? ref.bottom.seed : null,
  }
}

// ── DB match matching ────────────────────────────────────────────────────────

function deriveWinnerLoser(m: BracketMatch): { winner: string | null; loser: string | null } {
  if (m.status !== 'finished') return { winner: null, loser: null }
  if (m.maps_won_a > m.maps_won_b) return { winner: m.team_a_id, loser: m.team_b_id }
  if (m.maps_won_b > m.maps_won_a) return { winner: m.team_b_id, loser: m.team_a_id }
  return { winner: null, loser: null }
}

/**
 * Resolve every bracket slot against current DB matches and seed mapping.
 *
 * Algorithm (two passes per (bracket_kind, bracket_round) bucket):
 *   1. Strict pass — match by exact team permutation against seed-derived expectations.
 *      Keeps "this is slot ub-w1-m1 = seed 1 vs seed 8" intact when the DB agrees.
 *   2. Ordinal fallback — any DB row still unmatched in a bucket is assigned to
 *      the bucket's next unfilled slot (by rowOrder). Slot's top/bottom are then
 *      hydrated from the DB row, so seed labels become positional rather than literal.
 *
 * Slots are processed column→row→rowOrder so downstream slots can read upstream winners.
 */
export function resolveBracket(
  slots: BracketSlot[],
  matches: BracketMatch[] | undefined,
  seeds: Map<number, SeededTeam>,
): Map<string, ResolvedSlot> {
  const out = new Map<string, ResolvedSlot>()
  const takenMatchIds = new Set<string>()

  const buckets = new Map<string, BracketMatch[]>()
  for (const m of matches ?? []) {
    const key = `${m.bracket_kind}:${m.bracket_round}`
    const arr = buckets.get(key) ?? []
    arr.push(m)
    buckets.set(key, arr)
  }

  const ordered = [...slots].sort((a, b) =>
    a.column - b.column ||
    (a.row === b.row ? 0 : a.row === 'ub' ? -1 : 1) ||
    a.rowOrder - b.rowOrder
  )

  // ── Pass 1: strict per-slot exact permutation ──────────────────────────
  const slotMatchById = new Map<string, BracketMatch>()
  for (const slot of ordered) {
    const top = resolveSource(slot.topSource, seeds, out)
    const bottom = resolveSource(slot.bottomSource, seeds, out)
    const bucketKey = `${slot.bracketKind}:${slot.bracketRound}`
    const candidates = (buckets.get(bucketKey) ?? []).filter(m => !takenMatchIds.has(m.id))

    if (top.type === 'team' && bottom.type === 'team') {
      const exact = candidates.find(m =>
        (m.team_a_id === top.teamId && m.team_b_id === bottom.teamId) ||
        (m.team_a_id === bottom.teamId && m.team_b_id === top.teamId)
      )
      if (exact) {
        slotMatchById.set(slot.id, exact)
        takenMatchIds.add(exact.id)
      }
    }

    // Tentative top/bottom (may be overridden in pass 2)
    out.set(slot.id, {
      slot,
      match: slotMatchById.get(slot.id) ?? null,
      top, bottom,
      winnerTeamId: null,
      loserTeamId: null,
    })
  }

  // ── Pass 2: ordinal fallback for unmatched bucket rows ─────────────────
  for (const [bucketKey, bucketMatches] of buckets) {
    const unmatchedRows = bucketMatches.filter(m => !takenMatchIds.has(m.id))
    if (unmatchedRows.length === 0) continue
    const bucketSlots = ordered.filter(s =>
      `${s.bracketKind}:${s.bracketRound}` === bucketKey && !slotMatchById.has(s.id)
    )
    for (let i = 0; i < Math.min(unmatchedRows.length, bucketSlots.length); i++) {
      slotMatchById.set(bucketSlots[i].id, unmatchedRows[i])
      takenMatchIds.add(unmatchedRows[i].id)
    }
  }

  // ── Pass 3: hydrate top/bottom from match rows + compute winners ───────
  for (const slot of ordered) {
    const match = slotMatchById.get(slot.id) ?? null
    const prior = out.get(slot.id)!
    let top = prior.top
    let bottom = prior.bottom

    if (match) {
      // Re-resolve source teams now that earlier slots have their matches.
      top = resolveSource(slot.topSource, seeds, out)
      bottom = resolveSource(slot.bottomSource, seeds, out)

      const dbTeamIds = new Set([match.team_a_id, match.team_b_id].filter(Boolean))
      const topMatchesDb = top.type === 'team' && dbTeamIds.has(top.teamId)
      const bottomMatchesDb = bottom.type === 'team' && dbTeamIds.has(bottom.teamId)

      if (topMatchesDb && bottomMatchesDb && top.type === 'team') {
        // Seed-derived teams match DB — only flip orientation if needed
        if (match.team_a_id !== top.teamId) {
          const tmp = top; top = bottom; bottom = tmp
        }
      } else {
        // DB row's teams don't match what we expected by seed — trust the DB row
        // and drop the seed labels (since the assumed seeding is unconfirmed here).
        if (match.team_a_id) {
          top = {
            type: 'team', teamId: match.team_a_id,
            name: match.team_a_name ?? '', logoUrl: match.team_a_logo,
            seed: null,
          }
        }
        if (match.team_b_id) {
          bottom = {
            type: 'team', teamId: match.team_b_id,
            name: match.team_b_name ?? '', logoUrl: match.team_b_logo,
            seed: null,
          }
        }
      }
    }

    const { winner, loser } = match ? deriveWinnerLoser(match) : { winner: null, loser: null }
    out.set(slot.id, {
      slot, match, top, bottom,
      winnerTeamId: winner, loserTeamId: loser,
    })
  }

  return out
}
