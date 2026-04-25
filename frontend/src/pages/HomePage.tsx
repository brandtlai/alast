// frontend/src/pages/HomePage.tsx
import TournamentHubHero from '../components/tournament/TournamentHubHero'
import TabPills, { useActiveTab } from '../components/tournament/TabPills'

export default function HomePage() {
  const [active] = useActiveTab()

  return (
    <div>
      <TournamentHubHero />
      <TabPills />
      <div className="max-w-7xl mx-auto px-6 py-10">
        {active === 'overview' && <div className="text-white/40 text-sm">Overview — coming in Task 7</div>}
        {active === 'groups'   && <div className="text-white/40 text-sm">Group Stage — coming in Task 14</div>}
        {active === 'bracket'  && <div className="text-white/40 text-sm">Bracket — coming in Task 15</div>}
        {active === 'results'  && <div className="text-white/40 text-sm">Results — coming in Task 16</div>}
      </div>
    </div>
  )
}
