# Playoff Bracket Reference

This document converts the provided playoff screenshot into copyable frontend reference material for an esports site.

The target UI is a double-elimination playoff bracket with an upper bracket, a lower bracket, and a grand final.

## UI Breakdown

```txt
Page title:
- Playoffs

Top action:
- Show schedule button

Tournament format:
- Double elimination
- Upper bracket winners continue in the upper bracket
- Upper bracket losers drop into the lower bracket
- Lower bracket losers are eliminated
- Upper bracket final winner advances to the grand final
- Lower bracket final winner advances to the grand final

Visual structure:
- Horizontal bracket layout
- Each column represents one round
- Round headers use a muted gray background
- Match cards use a light gray background with thin borders
- Each match card has two team rows
- Each team row shows logo, team name, and score
- Winning team row uses bold team name
- Scores are aligned to the right
- Connector lines show progression between matches
- Small info icon can open match details
```

## Round Layout

```txt
Upper Bracket Quarterfinals
├── Xtreme Gaming 2 - 0 Tundra Esports
├── PVISION 2 - 0 HEROIC
├── Team Tidebound 0 - 2 Team Falcons
└── BB Team 2 - 1 Nigma Galaxy

Upper Bracket Semifinals
├── Xtreme Gaming 0 - 2 PVISION
└── Team Falcons 2 - 1 BB Team

Upper Bracket Final
└── PVISION 1 - 2 Team Falcons

Lower Bracket Round 1
├── Tundra Esports 0 - 2 HEROIC
└── Team Tidebound 0 - 2 Nigma Galaxy

Lower Bracket Quarterfinals
├── BB Team 2 - 1 HEROIC
└── Xtreme Gaming 2 - 0 Nigma Galaxy

Lower Bracket Semifinal
└── BB Team 0 - 2 Xtreme Gaming

Lower Bracket Final
└── PVISION 1 - 2 Xtreme Gaming

Grand Final
└── Team Falcons 3 - 2 Xtreme Gaming
```

## Suggested TypeScript Types

```ts
type BracketType = "upper" | "lower" | "final";

type MatchFormat = "BO1" | "BO3" | "BO5";

interface BracketTeam {
  id: string;
  name: string;
  score: number;
  winner: boolean;
  logoUrl?: string;
}

interface BracketMatch {
  id: string;
  format?: MatchFormat;
  teams: [BracketTeam, BracketTeam];
  nextMatchId?: string;
  loserNextMatchId?: string;
}

interface BracketRound {
  id: string;
  name: string;
  bracket: BracketType;
  matches: BracketMatch[];
}

interface PlayoffBracket {
  type: "double-elimination";
  title: string;
  rounds: BracketRound[];
}
```

## Example Bracket Data

```ts
export const playoffBracket = {
  type: "double-elimination",
  title: "Playoffs",
  rounds: [
    {
      id: "upper-qf",
      name: "Upper Bracket Quarterfinals",
      bracket: "upper",
      matches: [
        {
          id: "u-qf-1",
          format: "BO3",
          nextMatchId: "u-sf-1",
          loserNextMatchId: "l-r1-1",
          teams: [
            {
              id: "xtreme",
              name: "Xtreme Gaming",
              score: 2,
              winner: true,
              logoUrl: "/teams/xtreme.png"
            },
            {
              id: "tundra",
              name: "Tundra Esports",
              score: 0,
              winner: false,
              logoUrl: "/teams/tundra.png"
            }
          ]
        },
        {
          id: "u-qf-2",
          format: "BO3",
          nextMatchId: "u-sf-1",
          loserNextMatchId: "l-r1-1",
          teams: [
            {
              id: "pvision",
              name: "PVISION",
              score: 2,
              winner: true,
              logoUrl: "/teams/pvision.png"
            },
            {
              id: "heroic",
              name: "HEROIC",
              score: 0,
              winner: false,
              logoUrl: "/teams/heroic.png"
            }
          ]
        },
        {
          id: "u-qf-3",
          format: "BO3",
          nextMatchId: "u-sf-2",
          loserNextMatchId: "l-r1-2",
          teams: [
            {
              id: "tidebound",
              name: "Team Tidebound",
              score: 0,
              winner: false,
              logoUrl: "/teams/tidebound.png"
            },
            {
              id: "falcons",
              name: "Team Falcons",
              score: 2,
              winner: true,
              logoUrl: "/teams/falcons.png"
            }
          ]
        },
        {
          id: "u-qf-4",
          format: "BO3",
          nextMatchId: "u-sf-2",
          loserNextMatchId: "l-r1-2",
          teams: [
            {
              id: "bb",
              name: "BB Team",
              score: 2,
              winner: true,
              logoUrl: "/teams/bb.png"
            },
            {
              id: "nigma",
              name: "Nigma Galaxy",
              score: 1,
              winner: false,
              logoUrl: "/teams/nigma.png"
            }
          ]
        }
      ]
    },
    {
      id: "upper-sf",
      name: "Upper Bracket Semifinals",
      bracket: "upper",
      matches: [
        {
          id: "u-sf-1",
          format: "BO3",
          nextMatchId: "u-final",
          loserNextMatchId: "l-sf",
          teams: [
            {
              id: "xtreme",
              name: "Xtreme Gaming",
              score: 0,
              winner: false,
              logoUrl: "/teams/xtreme.png"
            },
            {
              id: "pvision",
              name: "PVISION",
              score: 2,
              winner: true,
              logoUrl: "/teams/pvision.png"
            }
          ]
        },
        {
          id: "u-sf-2",
          format: "BO3",
          nextMatchId: "u-final",
          loserNextMatchId: "l-qf-1",
          teams: [
            {
              id: "falcons",
              name: "Team Falcons",
              score: 2,
              winner: true,
              logoUrl: "/teams/falcons.png"
            },
            {
              id: "bb",
              name: "BB Team",
              score: 1,
              winner: false,
              logoUrl: "/teams/bb.png"
            }
          ]
        }
      ]
    },
    {
      id: "upper-final",
      name: "Upper Bracket Final",
      bracket: "upper",
      matches: [
        {
          id: "u-final",
          format: "BO3",
          nextMatchId: "grand-final",
          loserNextMatchId: "lower-final",
          teams: [
            {
              id: "pvision",
              name: "PVISION",
              score: 1,
              winner: false,
              logoUrl: "/teams/pvision.png"
            },
            {
              id: "falcons",
              name: "Team Falcons",
              score: 2,
              winner: true,
              logoUrl: "/teams/falcons.png"
            }
          ]
        }
      ]
    },
    {
      id: "lower-r1",
      name: "Lower Bracket Round 1",
      bracket: "lower",
      matches: [
        {
          id: "l-r1-1",
          format: "BO3",
          nextMatchId: "l-qf-1",
          teams: [
            {
              id: "tundra",
              name: "Tundra Esports",
              score: 0,
              winner: false,
              logoUrl: "/teams/tundra.png"
            },
            {
              id: "heroic",
              name: "HEROIC",
              score: 2,
              winner: true,
              logoUrl: "/teams/heroic.png"
            }
          ]
        },
        {
          id: "l-r1-2",
          format: "BO3",
          nextMatchId: "l-qf-2",
          teams: [
            {
              id: "tidebound",
              name: "Team Tidebound",
              score: 0,
              winner: false,
              logoUrl: "/teams/tidebound.png"
            },
            {
              id: "nigma",
              name: "Nigma Galaxy",
              score: 2,
              winner: true,
              logoUrl: "/teams/nigma.png"
            }
          ]
        }
      ]
    },
    {
      id: "lower-qf",
      name: "Lower Bracket Quarterfinals",
      bracket: "lower",
      matches: [
        {
          id: "l-qf-1",
          format: "BO3",
          nextMatchId: "l-sf",
          teams: [
            {
              id: "bb",
              name: "BB Team",
              score: 2,
              winner: true,
              logoUrl: "/teams/bb.png"
            },
            {
              id: "heroic",
              name: "HEROIC",
              score: 1,
              winner: false,
              logoUrl: "/teams/heroic.png"
            }
          ]
        },
        {
          id: "l-qf-2",
          format: "BO3",
          nextMatchId: "l-sf",
          teams: [
            {
              id: "xtreme",
              name: "Xtreme Gaming",
              score: 2,
              winner: true,
              logoUrl: "/teams/xtreme.png"
            },
            {
              id: "nigma",
              name: "Nigma Galaxy",
              score: 0,
              winner: false,
              logoUrl: "/teams/nigma.png"
            }
          ]
        }
      ]
    },
    {
      id: "lower-sf",
      name: "Lower Bracket Semifinal",
      bracket: "lower",
      matches: [
        {
          id: "l-sf",
          format: "BO3",
          nextMatchId: "lower-final",
          teams: [
            {
              id: "bb",
              name: "BB Team",
              score: 0,
              winner: false,
              logoUrl: "/teams/bb.png"
            },
            {
              id: "xtreme",
              name: "Xtreme Gaming",
              score: 2,
              winner: true,
              logoUrl: "/teams/xtreme.png"
            }
          ]
        }
      ]
    },
    {
      id: "lower-final",
      name: "Lower Bracket Final",
      bracket: "lower",
      matches: [
        {
          id: "lower-final",
          format: "BO3",
          nextMatchId: "grand-final",
          teams: [
            {
              id: "pvision",
              name: "PVISION",
              score: 1,
              winner: false,
              logoUrl: "/teams/pvision.png"
            },
            {
              id: "xtreme",
              name: "Xtreme Gaming",
              score: 2,
              winner: true,
              logoUrl: "/teams/xtreme.png"
            }
          ]
        }
      ]
    },
    {
      id: "grand-final",
      name: "Grand Final",
      bracket: "final",
      matches: [
        {
          id: "grand-final",
          format: "BO5",
          teams: [
            {
              id: "falcons",
              name: "Team Falcons",
              score: 3,
              winner: true,
              logoUrl: "/teams/falcons.png"
            },
            {
              id: "xtreme",
              name: "Xtreme Gaming",
              score: 2,
              winner: false,
              logoUrl: "/teams/xtreme.png"
            }
          ]
        }
      ]
    }
  ]
} satisfies PlayoffBracket;
```

## Suggested Component Tree

```txt
PlayoffPage
├── PageHeader
│   ├── Title
│   └── ShowScheduleButton
├── DoubleEliminationBracket
│   ├── BracketGrid
│   │   ├── BracketRound
│   │   │   └── MatchCard
│   │   │       ├── TeamRow
│   │   │       └── MatchInfoButton
│   │   └── ConnectorLayer
│   └── MatchDetailPopover
└── ScheduleDrawer
```

## React Rendering Skeleton

```tsx
import clsx from "clsx";

interface PlayoffBracketViewProps {
  bracket: PlayoffBracket;
}

export function PlayoffBracketView({ bracket }: PlayoffBracketViewProps) {
  return (
    <section className="playoff-page">
      <header className="playoff-header">
        <h1>{bracket.title}</h1>
        <button className="schedule-button" type="button">
          Show schedule
        </button>
      </header>

      <div className="bracket-scroll">
        <div className="bracket-grid">
          {bracket.rounds.map((round) => (
            <section
              className={clsx("bracket-round", `bracket-round-${round.bracket}`)}
              key={round.id}
            >
              <h2 className="round-title">{round.name}</h2>

              <div className="match-stack">
                {round.matches.map((match) => (
                  <MatchCard match={match} key={match.id} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  return (
    <article className="match-card">
      {match.teams.map((team) => (
        <div className={clsx("team-row", team.winner && "team-row-winner")} key={team.id}>
          <img className="team-logo" src={team.logoUrl} alt="" />
          <span className="team-name">{team.name}</span>
          <span className="team-score">{team.score}</span>
        </div>
      ))}

      <button className="match-info-button" type="button" aria-label="View match details">
        i
      </button>
    </article>
  );
}
```

## CSS Reference

```css
.playoff-page {
  min-height: 100%;
  background: #f7f7f9;
  color: #222;
  padding: 24px;
}

.playoff-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;
}

.playoff-header h1 {
  margin: 0;
  color: #5a0808;
  font-size: 34px;
  font-weight: 500;
  line-height: 1.1;
}

.schedule-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid #b9b9b9;
  border-radius: 8px;
  background: #fff;
  color: #3a3a3a;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}

.bracket-scroll {
  overflow-x: auto;
  padding-bottom: 24px;
}

.bracket-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, 280px);
  grid-auto-flow: column;
  column-gap: 32px;
  min-width: 1520px;
  align-items: start;
}

.bracket-round {
  display: grid;
  gap: 16px;
}

.round-title {
  width: 100%;
  min-height: 34px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #aaa;
  border-radius: 2px;
  background: #cfcfcf;
  color: #202020;
  font-size: 18px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.match-stack {
  display: grid;
  gap: 22px;
}

.match-card {
  position: relative;
  width: 280px;
  background: #f2f2f2;
  border: 1px solid #aaa;
  border-radius: 2px;
  overflow: visible;
}

.team-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 36px;
  align-items: center;
  min-height: 38px;
  border-bottom: 1px solid #b9b9b9;
}

.team-row:last-of-type {
  border-bottom: 0;
}

.team-row-winner .team-name {
  font-weight: 700;
}

.team-logo {
  width: 30px;
  height: 30px;
  margin-left: 8px;
  object-fit: contain;
}

.team-name {
  min-width: 0;
  overflow: hidden;
  color: #222;
  font-size: 16px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-score {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid #b9b9b9;
  color: #222;
  font-size: 16px;
  font-weight: 600;
}

.match-info-button {
  position: absolute;
  right: 28px;
  top: 50%;
  width: 20px;
  height: 20px;
  transform: translateY(-50%);
  border: 0;
  border-radius: 50%;
  background: #6e6e6e;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .playoff-page {
    padding: 16px;
  }

  .playoff-header h1 {
    font-size: 28px;
  }

  .bracket-grid {
    grid-template-columns: repeat(5, 260px);
    column-gap: 24px;
    min-width: 1400px;
  }

  .match-card {
    width: 260px;
  }
}
```

## Connector Line Notes

```txt
Implementation options:

1. SVG overlay
   - Place a full-size absolute SVG layer above or below the bracket grid.
   - Measure match card positions with refs.
   - Draw orthogonal paths between source match and target match.
   - Best for dynamic data and responsive layouts.

2. CSS pseudo-elements
   - Use ::before and ::after for simple static brackets.
   - Fast to implement, but harder to maintain when matches are dynamic.

3. Canvas overlay
   - Useful if rendering very large brackets.
   - Less ergonomic for hover and accessibility.

Recommended:
- Use SVG overlay for a production CS site.
- Store match progression with nextMatchId and loserNextMatchId.
- Calculate connector paths after layout using ResizeObserver.
```

## CS Site Adaptation

```txt
Replace the sample Dota teams with CS teams:
- Use BO3 for most playoff rounds
- Use BO5 for the grand final if needed
- Add map scores in the match detail popover
- Add match status: scheduled, live, completed
- Add start time and stream/VOD link
- Add seed labels if the tournament has seeded teams
```

```ts
interface CsMatchDetails {
  status: "scheduled" | "live" | "completed";
  startsAt?: string;
  vodUrl?: string;
  streamUrl?: string;
  maps?: Array<{
    name: string;
    teamOneScore: number;
    teamTwoScore: number;
    winnerTeamId?: string;
  }>;
}
```
