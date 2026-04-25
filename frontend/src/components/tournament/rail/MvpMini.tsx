import { Trophy } from 'lucide-react'
import { RailCard } from './RightRail'

export default function MvpMini() {
  return (
    <RailCard title="MVP / Top Fragger">
      <div className="flex items-center gap-3 py-2 text-white/40">
        <Trophy size={20} className="text-white/20" />
        <p className="text-xs">待赛事进行中后填充</p>
      </div>
    </RailCard>
  )
}
