import { createHash } from 'node:crypto'
import type { MatchFacts } from './types.js'

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = canonicalize(obj[key])
      return acc
    }, {})
  }
  return value
}

export function hashFacts(facts: MatchFacts): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(facts)))
    .digest('hex')
}
