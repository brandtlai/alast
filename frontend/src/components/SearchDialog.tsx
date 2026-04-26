// src/components/SearchDialog.tsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, X, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiFetch } from '../api/client'
import type { SearchResults } from '../types'
import TeamLogo from './TeamLogo'
import { fadeUp, panelReveal, staggerContainer } from '../lib/motion'

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    } else {
      setQuery('')
      setResults(null)
    }
  }, [open])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) { setResults(null); return }

    let cancelled = false

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await apiFetch<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`)
        if (!cancelled) setResults(data)
      } catch {
        if (!cancelled) setResults(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const hasResults = results && (results.teams.length > 0 || results.players.length > 0)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-[200] bg-[#050714]/88 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        </Dialog.Overlay>
        <Dialog.Content
          asChild
          aria-describedby={undefined}
        >
          <motion.div
            className="fixed inset-0 z-[201] flex flex-col items-center justify-start pt-[15vh] px-4"
            initial={{ opacity: 0, y: 16, scale: 0.985, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <Dialog.Title className="sr-only">搜索战队 / 选手</Dialog.Title>
            <motion.div className="w-full max-w-xl" variants={staggerContainer} initial="hidden" animate="show">
            {/* Input */}
            <motion.div
              variants={panelReveal}
              className="relative flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden surface-sheen"
            >
              <Search size={16} className="absolute left-4 text-white/40 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="搜索战队、选手..."
                className="w-full bg-transparent py-4 pl-11 pr-10 text-sm text-white/90 placeholder:text-white/30 outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-4 text-white/40 hover:text-white/80 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </motion.div>

            {/* Loading */}
            {loading && (
              <p className="mt-4 text-center text-sm text-white/40">搜索中…</p>
            )}

            {/* Results */}
            {!loading && hasResults && (
              <motion.div
                className="mt-3 bg-white/5 border border-white/10 rounded-xl overflow-hidden custom-scrollbar max-h-[60vh] overflow-y-auto"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {results!.teams.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 border-b border-white/5 bg-white/[0.02]">
                      TEAMS
                    </p>
                    {results!.teams.map(team => (
                      <motion.div key={team.id} variants={fadeUp}>
                        <Link
                          to={`/teams/${team.id}`}
                          onClick={() => onOpenChange(false)}
                          className="group flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                          <TeamLogo url={team.logo_url} name={team.name} size={28} />
                          <span className="flex-1 text-sm font-black group-hover:text-primary transition-colors">
                            {team.name}
                          </span>
                          <ChevronRight
                            size={14}
                            className="text-white/30 group-hover:text-primary group-hover:translate-x-1 transition-all"
                          />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
                {results!.players.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 border-b border-white/5 bg-white/[0.02]">
                      PLAYERS
                    </p>
                    {results!.players.map(player => (
                      <motion.div key={player.id} variants={fadeUp}>
                        <Link
                          to={`/players/${player.id}`}
                          onClick={() => onOpenChange(false)}
                          className="group flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-black text-primary flex-shrink-0">
                            {player.nickname.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black group-hover:text-primary transition-colors">
                              {player.nickname}
                            </p>
                            {player.team_name && (
                              <p className="text-xs text-white/40 truncate">{player.team_name}</p>
                            )}
                          </div>
                          <ChevronRight
                            size={14}
                            className="text-white/30 group-hover:text-primary group-hover:translate-x-1 transition-all"
                          />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {!loading && query.trim() && !hasResults && (
              <p className="mt-4 text-center text-sm text-white/40">暂无结果</p>
            )}
            </motion.div>

          <Dialog.Close asChild>
            <motion.button
              className="mt-8 flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.14 }}
            >
              <X size={12} />
              关闭（ESC）
            </motion.button>
          </Dialog.Close>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
