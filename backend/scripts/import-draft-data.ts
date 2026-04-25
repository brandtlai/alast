import 'dotenv/config'
import { pool } from '../src/db.js'

// Full 75-player dataset with snake-draft pick_order pre-computed from section 2.
// Pick order formula (snake draft):
//   S  (round 1, forward):  global = rank  (1-15)
//   A  (round 2, reverse):  global = 31 - captain_S_rank
//   B  (round 3, forward):  global = 30 + captain_S_rank
//   C+ (round 4, reverse):  global = 61 - captain_S_rank
//   D  (round 5, forward):  global = 60 + captain_S_rank
const PLAYERS: { rank: number; csvNick: string; tier: string; pick: number; captain: boolean }[] = [
  // S-tier (captains, picks 1-15)
  { rank:  1, csvNick: 'NJU',                      tier: 'S', pick:  1, captain: true },
  { rank:  2, csvNick: '抖音【\u2018那好\u2019】',  tier: 'S', pick:  2, captain: true },
  { rank:  3, csvNick: 'CS2欧皇集团',               tier: 'S', pick:  3, captain: true },
  { rank:  4, csvNick: 'EVERland',                  tier: 'S', pick:  4, captain: true },
  { rank:  5, csvNick: '353011762',                 tier: 'S', pick:  5, captain: true },
  { rank:  6, csvNick: '.早川.',                    tier: 'S', pick:  6, captain: true },
  { rank:  7, csvNick: '如风过境',                  tier: 'S', pick:  7, captain: true },
  { rank:  8, csvNick: 'choi',                      tier: 'S', pick:  8, captain: true },
  { rank:  9, csvNick: "ofc it's Ted",              tier: 'S', pick:  9, captain: true },
  { rank: 10, csvNick: 'Captain⚡️⚡️',              tier: 'S', pick: 10, captain: true },
  { rank: 11, csvNick: '真的爆丸',                  tier: 'S', pick: 11, captain: true },
  { rank: 12, csvNick: '渐渐绵绵、es',              tier: 'S', pick: 12, captain: true },
  { rank: 13, csvNick: '来自彼方的凶星',            tier: 'S', pick: 13, captain: true },
  { rank: 14, csvNick: 'yusheng打不中头',           tier: 'S', pick: 14, captain: true },
  { rank: 15, csvNick: 'jaycedd',                   tier: 'S', pick: 15, captain: true },
  // A-tier (round 2 snake, picks 16-30)
  { rank: 16, csvNick: '妹狸猫',                    tier: 'A', pick: 16, captain: false }, // jaycedd(P15)→31-15=16
  { rank: 17, csvNick: 'Fl@sh',                     tier: 'A', pick: 17, captain: false }, // yusheng(P14)→17
  { rank: 18, csvNick: 'FakeClan.Rain',             tier: 'A', pick: 18, captain: false }, // 来自彼方(P13)→18
  { rank: 19, csvNick: 'L0to7e',                    tier: 'A', pick: 23, captain: false }, // choi(P8)→23
  { rank: 20, csvNick: '枪枪打不中的鲁克',          tier: 'A', pick: 24, captain: false }, // 如风过境(P7)→24
  { rank: 21, csvNick: '人狠话不多',                tier: 'A', pick: 22, captain: false }, // ofc Ted(P9)→22
  { rank: 22, csvNick: 'KanaMomonogi',              tier: 'A', pick: 20, captain: false }, // 真的爆丸(P11)→20
  { rank: 23, csvNick: '它根本拼不过卡斯瑞托',      tier: 'A', pick: 19, captain: false }, // 渐渐绵绵(P12)→19
  { rank: 24, csvNick: 'Flet4',                     tier: 'A', pick: 21, captain: false }, // Captain⚡(P10)→21
  { rank: 25, csvNick: '幸运丶',                    tier: 'A', pick: 29, captain: false }, // 抖音(P2)→29
  { rank: 26, csvNick: '郜师傅',                    tier: 'A', pick: 28, captain: false }, // CS2欧皇(P3)→28
  { rank: 27, csvNick: '阿里道具王jeff420',         tier: 'A', pick: 30, captain: false }, // NJU(P1)→30
  { rank: 28, csvNick: '你困不困我困',              tier: 'A', pick: 25, captain: false }, // .早川.(P6)→25
  { rank: 29, csvNick: '别自闭都',                  tier: 'A', pick: 26, captain: false }, // 353011762(P5)→26
  { rank: 30, csvNick: 'Simaris',                   tier: 'A', pick: 27, captain: false }, // EVERland(P4)→27
  // B-tier (round 3 forward, picks 31-45)
  { rank: 31, csvNick: 'y11t',                      tier: 'B', pick: 37, captain: false }, // 如风过境(P7)→37
  { rank: 32, csvNick: 'CS要笑着玩',                tier: 'B', pick: 39, captain: false }, // ofc Ted(P9)→39
  { rank: 33, csvNick: '你钓不钓我钓',              tier: 'B', pick: 38, captain: false }, // choi(P8)→38
  { rank: 34, csvNick: '你的网友chn',               tier: 'B', pick: 33, captain: false }, // CS2欧皇(P3)→33
  { rank: 35, csvNick: 'TYLOO_计伯长',              tier: 'B', pick: 31, captain: false }, // NJU(P1)→31
  { rank: 36, csvNick: 'Kaumi',                     tier: 'B', pick: 32, captain: false }, // 抖音(P2)→32
  { rank: 37, csvNick: '上班后DJMAX',               tier: 'B', pick: 34, captain: false }, // EVERland(P4)→34
  { rank: 38, csvNick: '狗将军66',                  tier: 'B', pick: 36, captain: false }, // .早川.(P6)→36
  { rank: 39, csvNick: 'TinyKanja430',              tier: 'B', pick: 35, captain: false }, // 353011762(P5)→35
  { rank: 40, csvNick: '冬青青的狗',                tier: 'B', pick: 45, captain: false }, // jaycedd(P15)→45
  { rank: 41, csvNick: '龙卷风不睡觉',              tier: 'B', pick: 43, captain: false }, // 来自彼方(P13)→43
  { rank: 42, csvNick: '慢火老汤DEv1ce',            tier: 'B', pick: 44, captain: false }, // yusheng(P14)→44
  { rank: 43, csvNick: 'Sazan_Pi',                  tier: 'B', pick: 40, captain: false }, // Captain⚡(P10)→40
  { rank: 44, csvNick: 'Iot丨矛盾体 / thexiu',     tier: 'B', pick: 41, captain: false }, // 真的爆丸(P11)→41
  { rank: 45, csvNick: '八十岁天才老头',            tier: 'B', pick: 42, captain: false }, // 渐渐绵绵(P12)→42
  // C+-tier (round 4 snake reverse, picks 46-60)
  { rank: 46, csvNick: '蒟蒻喵',                    tier: 'C+', pick: 49, captain: false }, // 渐渐绵绵(P12)→61-12=49
  { rank: 47, csvNick: 'ArcTra1',                   tier: 'C+', pick: 50, captain: false }, // 真的爆丸(P11)→50
  { rank: 48, csvNick: '颜哥来了',                  tier: 'C+', pick: 51, captain: false }, // Captain⚡(P10)→51
  { rank: 49, csvNick: '吾德吉霸榜应',              tier: 'C+', pick: 48, captain: false }, // 来自彼方(P13)→48
  { rank: 50, csvNick: '快寄把憋跑打了',            tier: 'C+', pick: 47, captain: false }, // yusheng(P14)→47
  { rank: 51, csvNick: '电竞少女谢广坤',            tier: 'C+', pick: 46, captain: false }, // jaycedd(P15)→46
  { rank: 52, csvNick: '池北',                      tier: 'C+', pick: 58, captain: false }, // CS2欧皇(P3)→58
  { rank: 53, csvNick: '打不过我不难受么',          tier: 'C+', pick: 60, captain: false }, // NJU(P1)→60
  { rank: 54, csvNick: 'FakeClan.S1mple',          tier: 'C+', pick: 59, captain: false }, // 抖音(P2)→59
  { rank: 55, csvNick: '汉东省宮安厅长祁同伟_',    tier: 'C+', pick: 55, captain: false }, // .早川.(P6)→55
  { rank: 56, csvNick: '我的牙签久经沙场',          tier: 'C+', pick: 56, captain: false }, // 353011762(P5)→56
  { rank: 57, csvNick: '唐老大',                    tier: 'C+', pick: 57, captain: false }, // EVERland(P4)→57
  { rank: 58, csvNick: 'ig的emo genius本人',        tier: 'C+', pick: 52, captain: false }, // ofc Ted(P9)→52
  { rank: 59, csvNick: '小馬哥OvO',                 tier: 'C+', pick: 53, captain: false }, // choi(P8)→53
  { rank: 60, csvNick: '西辞',                      tier: 'C+', pick: 54, captain: false }, // 如风过境(P7)→54
  // D-tier (round 5 forward, picks 61-75)
  { rank: 61, csvNick: '噶及滚',                    tier: 'D', pick: 65, captain: false }, // 353011762(P5)→60+5=65
  { rank: 62, csvNick: '你见过我的p90嘛？',         tier: 'D', pick: 64, captain: false }, // EVERland(P4)→64
  { rank: 63, csvNick: '潜心修炼的噜噜侠',          tier: 'D', pick: 66, captain: false }, // .早川.(P6)→66
  { rank: 64, csvNick: '火舞旋不出风',              tier: 'D', pick: 72, captain: false }, // 渐渐绵绵(P12)→72
  { rank: 65, csvNick: 'eGGBroKer',                 tier: 'D', pick: 70, captain: false }, // Captain⚡(P10)→70
  { rank: 66, csvNick: 'J斯特醋醋',                 tier: 'D', pick: 71, captain: false }, // 真的爆丸(P11)→71
  { rank: 67, csvNick: '丶不知左右',                tier: 'D', pick: 74, captain: false }, // yusheng(P14)→74
  { rank: 68, csvNick: '易小棠',                    tier: 'D', pick: 75, captain: false }, // jaycedd(P15)→75
  { rank: 69, csvNick: 'Nani.僧ple',                tier: 'D', pick: 73, captain: false }, // 来自彼方(P13)→73
  { rank: 70, csvNick: '不明AOE',                   tier: 'D', pick: 69, captain: false }, // ofc Ted(P9)→69
  { rank: 71, csvNick: '在逃人机11',                tier: 'D', pick: 68, captain: false }, // choi(P8)→68
  { rank: 72, csvNick: 'Meibe',                     tier: 'D', pick: 67, captain: false }, // 如风过境(P7)→67
  { rank: 73, csvNick: 'ATIpiu',                    tier: 'D', pick: 62, captain: false }, // 抖音(P2)→62
  { rank: 74, csvNick: 'Gnest_Imp',                 tier: 'D', pick: 61, captain: false }, // NJU(P1)→61
  { rank: 75, csvNick: 'frozennnnn',                tier: 'D', pick: 63, captain: false }, // CS2欧皇(P3)→63
]

// For duplicate nicknames in DB, pin to specific player_id (chosen by exact case match or steamId presence)
const FORCED_IDS: Record<string, string> = {
  "ofc it's Ted":    'f8183572-0583-4175-ba71-673eaadc3fc8',
  'Captain⚡️⚡️':    'd0fea33e-2dd0-4dcc-b78d-1dd843c8cdd0',
  '渐渐绵绵、es':     '2ad7cd11-b5c4-49b6-8f8d-bfc5eec43dc7',
  '别自闭都':         '82ba04a7-346e-43de-8992-3159db9f9523',
  'ig的emo genius本人': 'e5c75b64-0e3c-4d55-a455-1b6c6e8395ae',
  '你见过我的p90嘛？': 'ef4ed3e2-6c8e-478d-822c-d1438c87a870',
  'Meibe':            'c189519a-7d7b-48c4-a944-74df39cc0b3d',
  '西辞':             '9a549ef3-563f-4a34-818a-63da304a4df8',
  'yusheng打不中头':  '264b0236-f50c-4176-8fb4-814036718a69',
  // CSV uses '那好' but DB has same string; just in case encoding differs, also alias Dyin variant
  '抖音【\u2018那好\u2019】': '81c289fc-0edd-4909-9f1d-fcd1c5aa2c33',
}

// CSV rank-64 has long nickname — prefix-match to DB's shorter version
const PREFIX_MATCHES: Record<string, string> = {
  '火舞旋不出风': 'd6fdfa28-88b5-404a-bce2-fe53ed11fb06',
}

async function main() {
  const { rows: tRows } = await pool.query(
    'SELECT id FROM tournaments WHERE is_current = true LIMIT 1'
  )
  if (!tRows.length) throw new Error('No current tournament found')
  const tournamentId = tRows[0].id
  console.log('Tournament:', tournamentId)

  const { rows: players } = await pool.query('SELECT id, nickname FROM players')
  const nickToId = new Map<string, string>()
  for (const p of players) nickToId.set(p.nickname, p.id)

  // Clear existing assignments for this tournament
  const { rowCount: deleted } = await pool.query(
    'DELETE FROM tournament_player_assignment WHERE tournament_id = $1', [tournamentId]
  )
  console.log(`Cleared ${deleted} existing assignments`)

  let inserted = 0
  const unmatched: string[] = []

  for (const p of PLAYERS) {
    let playerId: string | undefined

    // 1. Forced ID map (ambiguous duplicates)
    if (FORCED_IDS[p.csvNick]) {
      playerId = FORCED_IDS[p.csvNick]
    }
    // 2. Exact nickname lookup
    else if (nickToId.has(p.csvNick)) {
      playerId = nickToId.get(p.csvNick)
    }
    // 3. Prefix match (handles long CSV nicknames vs shorter DB entries)
    else {
      for (const [prefix, id] of Object.entries(PREFIX_MATCHES)) {
        if (p.csvNick.startsWith(prefix)) { playerId = id; break }
      }
    }

    if (!playerId) {
      unmatched.push(`rank ${p.rank}: "${p.csvNick}"`)
      continue
    }

    await pool.query(
      `INSERT INTO tournament_player_assignment
         (tournament_id, player_id, tier, pick_order, is_captain)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [tournamentId, playerId, p.tier, p.pick, p.captain]
    )
    inserted++
    console.log(`  [${String(p.rank).padStart(2)}] ${p.tier} pick=${p.pick} ${p.captain ? '(captain)' : '          '} ${p.csvNick}`)
  }

  console.log(`\nInserted: ${inserted}/75`)
  if (unmatched.length) {
    console.warn('\nUnmatched players:')
    for (const u of unmatched) console.warn(' -', u)
  }

  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
