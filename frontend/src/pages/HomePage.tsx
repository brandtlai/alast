// frontend/src/pages/HomePage.tsx
import TournamentHubHero from '../components/tournament/TournamentHubHero'
import TabPills, { useActiveTab } from '../components/tournament/TabPills'
import OverviewTab from '../components/tournament/tabs/OverviewTab'
import GroupStageTab from '../components/tournament/tabs/GroupStageTab'
import BracketTab from '../components/tournament/tabs/BracketTab'
import ResultsTab from '../components/tournament/tabs/ResultsTab'

export default function HomePage() {
  const [active] = useActiveTab()

  return (
    <div>
      <TournamentHubHero />
      <TabPills />
      <div className="max-w-7xl mx-auto px-6 py-10">
        {active === 'overview' && <OverviewTab />}
        {active === 'groups'   && <GroupStageTab />}
        {active === 'bracket'  && <BracketTab />}
        {active === 'results'  && <ResultsTab />}
      </div>
    </div>
  )
}
