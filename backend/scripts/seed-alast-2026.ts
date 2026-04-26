/**
 * One-time seed script: ALAST Premier 2026 tournament data
 * Run: npx tsx scripts/seed-alast-2026.ts
 */
import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const q = (text: string, params?: unknown[]) => pool.query(text, params)

// ─── Tournament ────────────────────────────────────────────────────────────────
const TOURNAMENT = {
  name: 'ALAST Premier 2026',
  season: '2026',
  year: 2026,
  prize_pool: '实体奖杯 + 周边',
  venue: '线上 / 内部',
  start_date: '2026-04-06',
  end_date: '2026-06-30',
}

// ─── Teams + rosters ──────────────────────────────────────────────────────────
// Each player: [nickname (game ID), real_name (花名)]
type Player = [string, string]
interface TeamData { name: string; players: Player[] }

const TEAMS: TeamData[] = [
  {
    name: '包包的',
    players: [
      ['NJU', '泽迁'],
      ['幸运丶', '清藤'],
      ['龙卷风不睡觉', '醒十'],
      ['ArcTra1', '陌珵'],
      ['Nani.僧ple', '扫地僧'],
    ],
  },
  {
    name: '川姐你说对不队',
    players: [
      ["抖音【\u2018那好\u2019】", '葵宝'],
      ['郜师傅', '郜师傅'],
      ['冬青青的狗', '小剑'],
      ['西辞', '西辞'],
      ['在逃人机11', '惜川'],
    ],
  },
  {
    name: '一路预瞄定吃闪队',
    players: [
      ['CS2欧皇集团', '闪花'],
      ['L0to7e', '陆楠'],
      ['y11t', '外一'],
      ['快寄把憋跑打了', '叮铃'],
      ['不明AOE', '浴血'],
    ],
  },
  {
    name: '蓝色小药丸',
    players: [
      ['EVERland', '凌渝'],
      ['你钓不钓我钓', '惜星'],
      ['Kaumi', '澄森'],
      ['FakeClan.S1mple', '北岸'],
      ['你见过我的p90嘛？', '黑怕'],
    ],
  },
  {
    name: '冠军',
    players: [
      ['353011762', '单糖'],
      ['枪枪打不中的鲁克', '鲁克'],
      ['慢火老汤DEv1ce', '莫茨'],
      ['ig的emo genius本人', '寒硭'],
      ['潜心修炼的噜噜侠', '铭致'],
    ],
  },
  {
    name: '没有人会一直等你除了老六',
    players: [
      ['.早川.', '早钏'],
      ['阿里道具王jeff420', '咻胖'],
      ['CS要笑着玩', '帅宇'],
      ['池北', '池北'],
      ['Meibe', 'Meibe'],
    ],
  },
  {
    name: '达哥说的对不队',
    players: [
      ['如风过境', '雷扬'],
      ['你困不困我困', '达哥'],
      ['你的网友chn', '漩云'],
      ['我的牙签久经沙场', '润孜'],
      ['J斯特醋醋', '郁璠'],
    ],
  },
  {
    name: '105 Thieves',
    players: [
      ['choi', '熙俊'],
      ['FakeClan.Rain', '煌羽'],
      ['TinyKanja430', '向云'],
      ['小馬哥OvO', '仲越'],
      ['ATIpiu', '润淼'],
    ],
  },
  {
    name: '英特尔首席科学家',
    players: [
      ["ofc it's Ted", 'Ted'],
      ['Simaris', '自理'],
      ['别自闭都', '儒义'],
      ['汉东省宮安厅长祁同伟_', '祁同伟'],
      ['frozennnnn', '朝率'],
    ],
  },
  {
    name: '痱子可烂',
    players: [
      ['Captain⚡️⚡️', '减白'],
      ['人狠话不多', '路桥'],
      ['Iot丨矛盾体 / thexiu', '北循'],
      ['吾德吉霸榜应', '北杏'],
      ['火舞旋不出风', '春风'],
    ],
  },
  {
    name: 'NTR',
    players: [
      ['真的爆丸', '洛霖'],
      ['KanaMomonogi', '而越'],
      ['颜哥来了', '热颜'],
      ['打不过我不难受么', '维泽'],
      ['eGGBroKer', '尘颜'],
    ],
  },
  {
    name: 'CountryLove',
    players: [
      ['渐渐绵绵、es', '轶森'],
      ['Fl@sh', '渔叮'],
      ['八十岁天才老头', '听风'],
      ['电竞少女谢广坤', '航逸'],
      ['易小棠', '小棠'],
    ],
  },
  {
    name: '干拉八条街',
    players: [
      ['来自彼方的凶星', '超会心'],
      ['它根本拼不过卡斯瑞托', '萧原'],
      ['Sazan_Pi', '夜峣'],
      ['蒟蒻喵', '蒟鶸'],
      ['Gnest_Imp', '思颀'],
    ],
  },
  {
    name: 'ShenT1Go',
    players: [
      ['yusheng打不中头', '隽琛'],
      ['Flet4', '可寒'],
      ['TYLOO_计伯长', '朝克'],
      ['上班后DJMAX', '荒屿'],
      ['噶及滚', '子豪'],
    ],
  },
  {
    name: 'vitALIty',
    players: [
      ['jaycedd', '杰浠'],
      ['妹狸猫', '妹狸猫'],
      ['狗将军66', '柯六'],
      ['唐老大', '向皖'],
      ['丶不知左右', '麻耶'],
    ],
  },
]

// ─── Match schedule ───────────────────────────────────────────────────────────
// [team_a, team_b, stage, scheduled_at, status, score_a, score_b]
// score_a/score_b = round scores on the single map (BO1 Swiss)
type MatchRow = {
  a: string; b: string; stage: string
  at: string; status: 'finished' | 'upcoming'
  sa?: number; sb?: number  // map round scores (finished only)
}

const MATCHES: MatchRow[] = [
  // ── R1 (all finished) ──────────────────────────────────────────────────
  { a: '包包的',           b: 'vitALIty',                       stage: '小组赛 R1', at: '2026-04-10T22:00:00+08:00', status: 'finished', sa: 13, sb: 7  },
  { a: '川姐你说对不队',   b: 'ShenT1Go',                       stage: '小组赛 R1', at: '2026-04-12T20:00:00+08:00', status: 'finished', sa:  7, sb: 13 },
  { a: '一路预瞄定吃闪队', b: '干拉八条街',                     stage: '小组赛 R1', at: '2026-04-14T21:30:00+08:00', status: 'finished', sa:  5, sb: 13 },
  { a: '蓝色小药丸',       b: 'CountryLove',                    stage: '小组赛 R1', at: '2026-04-12T22:30:00+08:00', status: 'finished', sa: 13, sb: 10 },
  { a: '冠军',             b: 'NTR',                            stage: '小组赛 R1', at: '2026-04-12T22:00:00+08:00', status: 'finished', sa:  6, sb: 13 },
  { a: '达哥说的对不队',   b: '痱子可烂',                       stage: '小组赛 R1', at: '2026-04-13T22:30:00+08:00', status: 'finished', sa: 11, sb: 13 },
  { a: '105 Thieves',      b: '英特尔首席科学家',               stage: '小组赛 R1', at: '2026-04-12T21:00:00+08:00', status: 'finished', sa: 10, sb: 13 },
  // ── R2 (all finished) ──────────────────────────────────────────────────
  { a: '干拉八条街',       b: '蓝色小药丸',                     stage: '小组赛 R2', at: '2026-04-21T22:30:00+08:00', status: 'finished', sa: 13, sb: 16 },
  { a: 'NTR',              b: '没有人会一直等你除了老六',       stage: '小组赛 R2', at: '2026-04-20T22:00:00+08:00', status: 'finished', sa: 13, sb: 10 },
  { a: '包包的',           b: '痱子可烂',                       stage: '小组赛 R2', at: '2026-04-17T22:30:00+08:00', status: 'finished', sa: 13, sb:  6 },
  { a: 'ShenT1Go',         b: '英特尔首席科学家',               stage: '小组赛 R2', at: '2026-04-19T21:00:00+08:00', status: 'finished', sa:  6, sb: 13 },
  { a: '达哥说的对不队',   b: '川姐你说对不队',                 stage: '小组赛 R2', at: '2026-04-20T22:30:00+08:00', status: 'finished', sa: 10, sb: 13 },
  { a: 'CountryLove',      b: '冠军',                           stage: '小组赛 R2', at: '2026-04-22T22:00:00+08:00', status: 'finished', sa: 13, sb:  1 },
  { a: '105 Thieves',      b: '一路预瞄定吃闪队',               stage: '小组赛 R2', at: '2026-04-20T21:30:00+08:00', status: 'finished', sa:  1, sb: 13 },
  // ── R3 (upcoming — results not yet recorded) ───────────────────────────
  { a: '英特尔首席科学家', b: '包包的',                         stage: '小组赛 R3', at: '2026-04-24T21:00:00+08:00', status: 'upcoming' },
  { a: '一路预瞄定吃闪队', b: '没有人会一直等你除了老六',       stage: '小组赛 R3', at: '2026-04-25T22:00:00+08:00', status: 'upcoming' },
  { a: '105 Thieves',      b: '达哥说的对不队',                 stage: '小组赛 R3', at: '2026-04-26T20:00:00+08:00', status: 'upcoming' },
  { a: 'NTR',              b: '蓝色小药丸',                     stage: '小组赛 R3', at: '2026-04-26T22:00:00+08:00', status: 'upcoming' },
  { a: 'ShenT1Go',         b: 'vitALIty',                       stage: '小组赛 R3', at: '2026-04-26T21:00:00+08:00', status: 'upcoming' },
  { a: '痱子可烂',         b: 'CountryLove',                    stage: '小组赛 R3', at: '2026-04-26T21:30:00+08:00', status: 'upcoming' },
  { a: '川姐你说对不队',   b: '干拉八条街',                     stage: '小组赛 R3', at: '2026-04-27T22:00:00+08:00', status: 'upcoming' },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Seeding ALAST Premier 2026...\n')

  // 1. Tournament
  const { rows: [tournament] } = await q(
    `INSERT INTO tournaments (name, season, year, prize_pool, venue, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [TOURNAMENT.name, TOURNAMENT.season, TOURNAMENT.year, TOURNAMENT.prize_pool,
     TOURNAMENT.venue, TOURNAMENT.start_date, TOURNAMENT.end_date]
  )
  if (!tournament) {
    console.log('Tournament already exists — aborting to avoid duplicates.')
    await pool.end()
    return
  }
  console.log(`✓ Tournament: ${tournament.name} (${tournament.id})`)

  // 2. Teams + players
  const teamIdByName = new Map<string, string>()

  for (const td of TEAMS) {
    const { rows: [team] } = await q(
      `INSERT INTO teams (name) VALUES ($1) RETURNING id, name`,
      [td.name]
    )
    teamIdByName.set(td.name, team.id)
    console.log(`  ✓ Team: ${team.name}`)

    for (const [nickname, real_name] of td.players) {
      await q(
        `INSERT INTO players (nickname, real_name, team_id) VALUES ($1,$2,$3)`,
        [nickname, real_name, team.id]
      )
    }
  }
  console.log(`\n✓ ${TEAMS.length} teams + ${TEAMS.length * 5} players created`)

  // 3. Matches
  let created = 0
  for (const m of MATCHES) {
    const teamA = teamIdByName.get(m.a)
    const teamB = teamIdByName.get(m.b)
    if (!teamA || !teamB) {
      console.warn(`  ⚠ Unknown team: ${m.a} or ${m.b}`)
      continue
    }

    const mapsWonA = m.status === 'finished' ? (m.sa! > m.sb! ? 1 : 0) : 0
    const mapsWonB = m.status === 'finished' ? (m.sb! > m.sa! ? 1 : 0) : 0
    const finishedAt = m.status === 'finished' ? m.at : null

    const { rows: [match] } = await q(
      `INSERT INTO matches (tournament_id, team_a_id, team_b_id, maps_won_a, maps_won_b,
         status, stage, scheduled_at, finished_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [tournament.id, teamA, teamB, mapsWonA, mapsWonB,
       m.status, m.stage, m.at, finishedAt]
    )

    // Create match_map with round score for finished matches
    if (m.status === 'finished') {
      const winnerId = m.sa! > m.sb! ? teamA : teamB
      await q(
        `INSERT INTO match_maps (match_id, map_name, map_order, score_a, score_b, winner_team_id)
         VALUES ($1,'unknown',1,$2,$3,$4)`,
        [match.id, m.sa, m.sb, winnerId]
      )
    }
    created++
  }
  console.log(`✓ ${created} matches created (${MATCHES.filter(m => m.status === 'finished').length} finished, ${MATCHES.filter(m => m.status === 'upcoming').length} upcoming)\n`)
  console.log('Seed complete.')
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
