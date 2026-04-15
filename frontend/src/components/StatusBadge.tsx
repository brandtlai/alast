interface Props {
  status: 'upcoming' | 'live' | 'finished'
}

export default function StatusBadge({ status }: Props) {
  if (status === 'live') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-red-500/20 border border-red-500/30">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-red-400">LIVE</span>
      </div>
    )
  }
  if (status === 'upcoming') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-sm bg-accent/10 border border-accent/20 text-[10px] font-black uppercase tracking-widest text-accent/80">
        即将开始
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
      已结束
    </span>
  )
}
