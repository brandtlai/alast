import 'dotenv/config'
import { pool } from '../src/db.js'

async function main() {
  const { rows } = await pool.query(`
    SELECT tpa.pick_order, tpa.tier, tpa.is_captain, p.nickname
    FROM tournament_player_assignment tpa
    JOIN players p ON p.id = tpa.player_id
    WHERE tpa.tournament_id = (SELECT id FROM tournaments WHERE is_current = true LIMIT 1)
    ORDER BY tpa.pick_order
  `)

  // Expected data: [pick_order, tier, is_captain, csvNick]
  const expected = [
    [1,'S',true,'NJU'],[2,'S',true,"抖音【\u2018那好\u2019】"],[3,'S',true,'CS2欧皇集团'],
    [4,'S',true,'EVERland'],[5,'S',true,'353011762'],[6,'S',true,'.早川.'],
    [7,'S',true,'如风过境'],[8,'S',true,'choi'],[9,'S',true,"ofc it's Ted"],
    [10,'S',true,'Captain⚡️⚡️'],[11,'S',true,'真的爆丸'],[12,'S',true,'渐渐绵绵、es'],
    [13,'S',true,'来自彼方的凶星'],[14,'S',true,'yusheng打不中头'],[15,'S',true,'jaycedd'],
    [16,'A',false,'妹狸猫'],[17,'A',false,'Fl@sh'],[18,'A',false,'FakeClan.Rain'],
    [19,'A',false,'它根本拼不过卡斯瑞托'],[20,'A',false,'KanaMomonogi'],
    [21,'A',false,'Flet4'],[22,'A',false,'人狠话不多'],[23,'A',false,'L0to7e'],
    [24,'A',false,'枪枪打不中的鲁克'],[25,'A',false,'你困不困我困'],
    [26,'A',false,'别自闭都'],[27,'A',false,'Simaris'],[28,'A',false,'郜师傅'],
    [29,'A',false,'幸运丶'],[30,'A',false,'阿里道具王jeff420'],
    [31,'B',false,'TYLOO_计伯长'],[32,'B',false,'Kaumi'],[33,'B',false,'你的网友chn'],
    [34,'B',false,'上班后DJMAX'],[35,'B',false,'TinyKanja430'],[36,'B',false,'狗将军66'],
    [37,'B',false,'y11t'],[38,'B',false,'你钓不钓我钓'],[39,'B',false,'CS要笑着玩'],
    [40,'B',false,'Sazan_Pi'],[41,'B',false,'Iot丨矛盾体 / thexiu'],[42,'B',false,'八十岁天才老头'],
    [43,'B',false,'龙卷风不睡觉'],[44,'B',false,'慢火老汤DEv1ce'],[45,'B',false,'冬青青的狗'],
    [46,'C+',false,'电竞少女谢广坤'],[47,'C+',false,'快寄把憋跑打了'],[48,'C+',false,'吾德吉霸榜应'],
    [49,'C+',false,'蒟蒻喵'],[50,'C+',false,'ArcTra1'],[51,'C+',false,'颜哥来了'],
    [52,'C+',false,'ig的emo genius本人'],[53,'C+',false,'小馬哥OvO'],[54,'C+',false,'西辞'],
    [55,'C+',false,'汉东省宮安厅长祁同伟_'],[56,'C+',false,'我的牙签久经沙场'],[57,'C+',false,'唐老大'],
    [58,'C+',false,'池北'],[59,'C+',false,'FakeClan.S1mple'],[60,'C+',false,'打不过我不难受么'],
    [61,'D',false,'Gnest_Imp'],[62,'D',false,'ATIpiu'],[63,'D',false,'frozennnnn'],
    [64,'D',false,'你见过我的p90嘛？'],[65,'D',false,'噶及滚'],[66,'D',false,'潜心修炼的噜噜侠'],
    [67,'D',false,'Meibe'],[68,'D',false,'在逃人机11'],[69,'D',false,'不明AOE'],
    [70,'D',false,'eGGBroKer'],[71,'D',false,'J斯特醋醋'],[72,'D',false,'火舞旋不出风'],
    [73,'D',false,'Nani.僧ple'],[74,'D',false,'丶不知左右'],[75,'D',false,'易小棠'],
  ] as const

  console.log(`DB has ${rows.length} entries\n`)
  console.log('Pick | Tier | Cap | DB nickname')
  console.log('-----|------|-----|------------')

  let ok = 0, issues = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const [expPick, expTier, expCap, expNick] = expected[i] ?? []
    const pickOk = r.pick_order === expPick
    const tierOk = r.tier === expTier
    const capOk = r.is_captain === expCap
    const allOk = pickOk && tierOk && capOk
    if (!allOk) {
      issues++
      console.log(`${String(r.pick_order).padStart(4)} | ${r.tier.padEnd(4)} | ${r.is_captain?'Y':'N'}   | ${r.nickname}  ← EXPECTED pick=${expPick} tier=${expTier} cap=${expCap?'Y':'N'} nick="${expNick}"`)
    } else {
      ok++
      console.log(`${String(r.pick_order).padStart(4)} | ${r.tier.padEnd(4)} | ${r.is_captain?'Y':'N'}   | ${r.nickname}`)
    }
  }
  console.log(`\n✓ ${ok} OK  ✗ ${issues} issues`)
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
