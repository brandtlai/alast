# ALAST Review Hub — Design Spec

**Date**: 2026-04-25
**Status**: Approved (brainstorm phase). Awaiting user review of written spec → writing-plans.
**Repo**: alast.kaumi.org（`/Users/brandt/alast`）
**Phasing**: A → C → B → D（Tournament hub → Data pipeline → MatchDetail L2 → Stats）

---

## 0. 背景与定位

### 0.1 Project

ALAST Premier 2026 是阿里巴巴 + 蚂蚁集团 CS 兴趣派内部赛事，年度举办（已有过往两次，本届为第三届），赛制 **Swiss 3 轮 + 16 队双败淘汰**。站点 `alast.kaumi.org` 现状：

- Backend: Hono + Node + PostgreSQL（端口 3001）
- Frontend: React 18 + Vite + Tailwind v4 SPA（深蓝黑底 #050714 + 橙金 #FF8A00 主色 + 电青 #00D1FF accent）
- 已有路由：`/`（HomePage 含奖杯 hero）、`/teams`、`/players`、`/matches`、`/news`、`/stats`、`/about`
- 已有 schema：`tournaments / teams / players / matches / match_maps / player_match_stats / news / admins / csdm_imports / media`
- 已有 import：`/api/admin/import/preview` + `/confirm`，吃 CSDM **摘要**格式 JSON（仅汇总 stats）

### 0.2 站点定位（关键决策）

**赛后 review 站点**，不是直播伴侣。用户主要在**事后**回顾比赛进程和数据。
→ 跳过实时向 widget（直播频道、倒计时、live 推送）；强化回顾向（scoreboard 深度、回合时间线、经济曲线、Stats 排行）。

### 0.3 数据源 — `match_data/` JSON

14 张文件 = 14 张地图（不是 14 场 BO）。来源：完美世界 GOTV demo 经 CSDM 解析。每个文件顶层 49 键，比现 import 认的 CSDM 摘要丰富一个数量级：

- 元信息（mapName / date / duration / tickrate / winnerSide / scoreFirstHalf / scoreSecondHalf）
- 球员 10 人 × 65+ 字段（hltvRating2, kast, ADR, KD, HS%, mvpCount, firstKill, 1K-5K, vs1-5 won/lost, tradeKill, wallbangKill, noScopeKill, utilityDamage, avatar URL, crosshairShareCode）
- Rounds 数组（~20-24）：每回合经济（econType / startMoney / spent / equipmentValue）+ 双方半场分 + endReason + winner
- Kills（~137/图）：每杀 weapon / headshot / trade / smoke / airborne 标志 + distance + 坐标 X/Y/Z（**L2 不存坐标**）
- Damages、Shots、Blinds、Clutches（~21/图）、Bombs（plant/defuse/explode）、Grenades（~399/图）、PlayersEconomies、ChatMessages

**做不到**：玩家 tick 级移动路径（`playerPositions=[]`）；BO 系列归并需 admin 人工指认。

### 0.4 视觉锚

参考 BLAST Premier Open Rotterdam 2026 页面：深紫渐变底 + 黄色 CTA accent + 数字胶囊 + 极细分隔 + 信息密集右栏。本设计采纳 **双层 token 体系**：brand 层（橙金）保留作 hero/品牌；data 层（BLAST 风深紫灰白）应用于信息密集区。

---

## 1. 总体规划与 IA

### 1.1 阶段执行序

**A → C → B → D**：A 立赛事 hub 视觉骨架 → C 扩 schema + 重写 import 让数据进得来 → B 升级 MatchDetail 用 rich 数据 → D 做 Stats 子页。

### 1.2 路由 IA

| 路由 | 内容 |
|---|---|
| `/` | **TournamentHub** = 紧凑 hero + 4 tab（Overview / Group Stage / Bracket / Results）+ 右栏 |
| `/teams`, `/players`, `/news`, `/about` | 保留不动 |
| `/matches/:id` | 升级（B 阶段）：scoreboard + 回合时间线 + 经济曲线 + 高光 |
| `/stats` | 升级（D 阶段）：赛事排行 + Tier 切片 |
| `/draft`（新增） | 选手 5 等级 Tier 公示 + 选马顺序可视化 |

### 1.3 单赛事强假设

站点首页绑定的 tournament 通过 backend `/api/tournaments/current` 端点决定（DB 中标记 `is_current=true` 的那一行），不做用户切换 UI。**未来多届支持**留扩展点：把 hub 抽成 `<TournamentHub tournamentId={...} />` 组件，外层根据路由参数注入 tournament_id。

---

## 2. A 阶段：TournamentHub 页面

### 2.1 顶部紧凑 Hero

把现 HomePage 全屏奖杯 hero 缩成 ~360px 高的 header band：
- 左：`[ALAST PREMIER]` 小标 → `PREMIER 2026` gold-gradient 标题 → 三段 INFO（当前阶段 / 队数 / 奖金池）
- 右：奖杯 ~180px，浮动动画保留
- 蓝光 + 顶部光柱微缩保留

### 2.2 4 Tab Pills（紧贴 hero 下方）

Overview | Group Stage | Bracket | Results

URL 状态保持：`?tab=overview|groups|bracket|results`，默认 overview。

### 2.3 Overview Tab

**中央：按轮次分组的比赛流**
- 分组 = 赛事轮次（"小组赛 R1" / "胜者组 QF" / "败者组 R3" / "总决赛 GF"），每组 header 显示日期范围
- 行布局：时间 + bracket 标 + 队A 队徽 + 队A 名 + 比分胶囊 + 队B 名 + 队B 队徽 + BO 标
- 行点击 → `/matches/:id`
- 状态：`upcoming`（灰）/ `live`（红 dot）/ `finished`（实数比分）
- 默认时间倒序（最新在最上）
- 底部：**最新资讯 mini-strip**（最多 3 张新闻卡，无内容时整段隐藏 — 因新闻供给少）

**右栏（自上而下 5 张卡 + 1 链接）：**
1. **Stage Card** — 大字"小组赛 R3 / 共 7 阶段" + 进度条
2. **Stage Timeline** — 报名 → 选马 → 小组赛 R1/R2/R3 → UB/LB 各轮 → GF，已过的打勾绿色
3. **MVP / Top Fragger mini** — 赛事末段填充；前期空状态文案"待赛事进行中后填充"
4. **Rules & Resources** — 规则书链接 / 报名表归档 / About 页
5. **FAQ** — 5–8 条规则文档摘录（选马规则、替补、Tier 评分、申诉等）
6. **链接** — `/draft` 页（Tier 公示 + 选马顺序）

### 2.4 Group Stage Tab

**A. Standings 表（Swiss 标准）**

| Rank | Team | W-L | Buchholz | RD | Status |
|---|---|---|---|---|---|

- Buchholz = 对手累计胜场（实时 SQL view 计算）
- RD = 净回合数
- Status = "晋级胜者组" / "进入败者组" / "待赛"

**B. Round-by-round 抽签 + 结果**

三个折叠面板（R1 / R2 / R3）。点开看那一轮所有对阵和结果。尚未抽签时显示"待小组赛 R{N-1} 结束后抽签"。

### 2.5 Bracket Tab

双败 16 队**简化卡片版**（不画 SVG 树图）：
- 横向 3 列：**胜者组 / 败者组 / 总决赛**
- 每列内纵向堆叠该 stream 各 round 的 match 卡（UB R1 4 场 / R2 2 场 / Final 1 场；LB R1 4 场 / R2 4 场 / R3 2 场 / R4 2 场 / Final 1 场；GF 1 场）
- 卡片点击 → `/matches/:id`
- 视觉：当前 round 用更亮的边框；已结束的卡片队伍用胜者高亮

### 2.6 Results Tab

扁平时间倒序的全部已结束比赛列表。复用 Overview 的 `<MatchRow>` 组件。可选筛选 chip：全部 / 小组赛 / 胜者组 / 败者组 / 决赛。

### 2.7 `/draft` 独立页

不在 hub 里铺开。Navbar 加 "Draft" 入口：
- 选手 5 等级 grid（特/上/中/下/赠品 各一行），每个选手卡 = avatar + 昵称 + 队伍 + 选马顺位
- 选马顺序可视化（4 轮 S 型蛇形）

---

## 3. C 阶段：数据 schema 扩展 + Import 重构

### 3.1 现有 schema 补丁

```sql
-- 002_bracket_structure.sql
ALTER TABLE matches
  ADD COLUMN bracket_kind TEXT CHECK (bracket_kind IN ('swiss','ub','lb','gf')),
  ADD COLUMN bracket_round INTEGER,
  ADD COLUMN best_of INTEGER NOT NULL DEFAULT 1;

-- tournaments 标记当届
ALTER TABLE tournaments
  ADD COLUMN is_current BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX idx_tournaments_current ON tournaments(is_current) WHERE is_current = TRUE;
```

`matches.stage TEXT` 保留作 display label（自由文本），结构化数据走 `bracket_kind` + `bracket_round`。

### 3.2 新增表

| 表 | 列 | 用途 |
|---|---|---|
| `tournament_player_assignment` | `(tournament_id, player_id, tier ENUM('S','A','B','C+','D'), pick_order INT, is_captain BOOL)` | 赛事级 tier；不污染 `players` |
| `player_steam_aliases` | `(id, player_id, steam_id UNIQUE, note, created_at)` | 处理选手换号打 |
| `match_substitutes` | `(match_id, player_id, lender_team_id, borrower_team_id)` | scoreboard "SUB" 角标 |
| `match_rounds` | `(id, match_map_id, round_number, winner_side, winner_team_id, end_reason, duration_ms, team_a_side, team_b_side, team_a_score, team_b_score, team_a_economy_type, team_b_economy_type, team_a_money_spent, team_b_money_spent, team_a_equipment_value, team_b_equipment_value, start_tick, end_tick)` | 每回合摘要（驱动时间线 + 经济曲线） |
| `match_kills` | `(id, match_map_id, round_number, tick, frame, weapon_name, weapon_type, is_headshot, is_trade_kill, is_through_smoke, is_no_scope, killer_player_id, victim_player_id, assister_player_id NULL, is_assisted_flash, killer_side, victim_side)` | 每杀精简版（**L2 不存坐标**） |
| `match_clutches` | `(id, match_map_id, round_number, player_id, opponent_count, won, kill_count, has_survived)` | 1vN 残局 |
| `player_round_economies` | `(id, match_map_id, round_number, player_id, side, equipment_value, money_spent, start_money, type)` | 每人每回合经济 |

后续要升 L3（坐标热力图）只需：
- `match_kills` 加 `killer_x/y/z, victim_x/y/z`
- 新增 `match_grenades(round, type, thrower, x/y/z)`、`match_bombs(round, planter, x/y/z, site, action)`

### 3.3 Standings 视图（Swiss 排名 derived）

```sql
-- 007_swiss_standings_view.sql
CREATE VIEW tournament_swiss_standings AS
WITH team_results AS (
  SELECT m.tournament_id, m.team_a_id AS team_id, m.id AS match_id,
         (m.maps_won_a > m.maps_won_b)::INT AS won,
         m.maps_won_a - m.maps_won_b AS map_diff,
         /* round_diff 需要 join match_maps 算 */
         ...
  FROM matches m
  WHERE m.bracket_kind = 'swiss' AND m.status = 'finished'
  UNION ALL
  SELECT ... -- team_b_id 镜像
),
team_wins AS (
  SELECT tournament_id, team_id, SUM(won) AS wins, SUM(1-won) AS losses
  FROM team_results GROUP BY tournament_id, team_id
)
SELECT tr.tournament_id, tr.team_id,
       tw.wins, tw.losses,
       (SELECT SUM(opp.wins)
        FROM team_results tr2
        JOIN team_wins opp ON opp.team_id = tr2.opponent_id AND opp.tournament_id = tr.tournament_id
        WHERE tr2.team_id = tr.team_id) AS buchholz,
       SUM(tr.round_diff) AS round_diff
FROM team_results tr
JOIN team_wins tw ON tw.team_id = tr.team_id AND tw.tournament_id = tr.tournament_id
GROUP BY ...;
```

具体 SQL 在 plan 里细化（涉及 match_maps 抽 round 分）。**不物化**，每次查询实时算（数据量小，最多 16 队 × 3 轮）。

### 3.4 Import 重构（D 模式）

**B 主线** — `/admin/matches/:id/upload-demos`
1. Admin 在 `/admin/matches` 页面先建 match 行（`tournament_id + bracket_kind + bracket_round + team_a_id + team_b_id + best_of`），状态 `upcoming`
2. 比赛打完 → 该 match 详情页 "上传比赛 demos"
3. 拖入 N 张 JSON，系统按 `date` 升序排，admin 可拖拽改 `map_order`
4. **Preview 步**（每张 JSON）：
   - 元信息卡（mapName / 双方比分 / 半场分 / 时长 / winnerName）
   - 选手匹配状态（10 行 × `{steamId, name, identity: matched|aliased|new, sub_warning: bool}`）—— identity 三选一表示选手身份归属，`sub_warning` 是正交标志，可与 matched/aliased 并存
   - 替补提示：当 identity ≠ new 且 `players.team_id` ≠ 当场标记的 team 时 `sub_warning=true`
5. **Confirm 步** — 写库（一个事务）：
   - `match_maps`（绑到 admin 选定的 match_id，map_order 由排序定）
   - `player_match_stats`（rich 字段全填）
   - `match_rounds` × N
   - `match_kills` × N
   - `match_clutches` × N
   - `player_round_economies` × N
   - 必要时 `match_substitutes` / 新 `players` 行 / 新 `player_steam_aliases` 行
   - `csdm_imports.status = 'confirmed'`，原始 raw_json 留作审计

**A 兜底** — `/admin/import/demo`
- 同 preview/confirm 二步，但 preview 多一步：先选「绑到现有 match」/「新建 match」

**Idempotency**：导入前 lookup `csdm_imports.checksum`（用 JSON 顶层 `checksum` 字段 + match_id 联合唯一约束），命中则报错"已导入"。该列在现 `csdm_imports` 表上不存在，**migration 002 须同时给 `csdm_imports` 加 `checksum TEXT` 列**并建 `UNIQUE(match_id, checksum)`。

### 3.5 选手匹配（强化版 A 策略）

**主键查找顺序**：
1. `players.steam_id` 命中 → 用该 player_id
2. `player_steam_aliases.steam_id` 命中 → 用对应 player_id
3. 都未命中 → preview 列为"新选手"

**未命中三选一**（admin 在 preview 页就地操作）：
- **新建选手**：填昵称、国家、角色、当前队伍、当前赛事 tier → confirm 时 INSERT `players` + `tournament_player_assignment`
- **绑为现有选手的替号**：选 player → INSERT `player_steam_aliases(player_id, steam_id)`
- **跳过**：不导入该选手的 stats（外队 / 非赛事选手）

**替补识别**：matched 选手在该场 JSON 中所属队（teamA.name 或 teamB.name 匹配的 team_id）≠ `players.team_id` 时，preview 弹"可能替补"提示，admin：
- 登记替补 → 写 `match_substitutes(match_id, player_id, lender_team_id, borrower_team_id)`
- 误判 → 不写

**关键约束**：`player_match_stats.team_id` 永远 = 当场打的队（与 `players.team_id` 解耦），天然支持替补 / 转会 / 友情打外队。

### 3.6 新 backend API

```
GET  /api/tournaments/current               # 当届 tournament（is_current=true 的行）
GET  /api/tournaments/:id/standings         # Swiss 排名（含 Buchholz/RD）
GET  /api/tournaments/:id/bracket           # 比赛按 bracket_kind/round 分组
GET  /api/tournaments/:id/draft             # 选手 + tier + pick_order
GET  /api/matches/:id/maps                  # 该 match 的 maps 列表
GET  /api/matches/:id/maps/:mapId/stats     # scoreboard（10 行）
GET  /api/matches/:id/maps/:mapId/rounds    # 回合时间线
GET  /api/matches/:id/maps/:mapId/economy   # 经济曲线
GET  /api/matches/:id/maps/:mapId/highlights # multikills + clutches + top frags
POST /api/admin/import/demo/preview
POST /api/admin/import/demo/confirm
POST /api/admin/players/:id/aliases
POST /api/admin/matches/:id/substitutes
```

所有响应走 `ApiResponse<T>` envelope（`ok()` / `err()`）。

### 3.7 迁移文件序

```
002_bracket_structure.sql       # matches 加 bracket_kind/bracket_round/best_of + tournaments.is_current + csdm_imports.checksum + UNIQUE(match_id, checksum)
003_tournament_player_tier.sql  # 选手赛事级 tier
004_player_steam_aliases.sql    # 别号
005_match_substitutes.sql       # 替补
006_match_rich_events.sql       # rounds/kills/clutches/economies
007_swiss_standings_view.sql    # standings 视图
```

每文件单独事务，沿用现 `migrate.ts` 流。

---

## 4. B 阶段：MatchDetail L2 升级

### 4.1 页面信息层级（长滚单页，不分 tab）

**A. Match Header**
> 双队队徽 + 名 + BO 比分（gold-gradient）+ 阶段标 + 日期 + duration（"BO3 · 2h 14m · 2026-04-13 14:30"）

**B. Map Picker**
> 横向 chip 切换 map（"de_ancient · 13-7" / "de_inferno · 13-9" / "de_mirage · 待赛"）。默认选第 1 张已打的图。

**C. Per-Map Scoreboard**
> 10 行 × 列：Player / K / A / D / +/- / HS% / KAST / ADR / Rating
> 上 5 行队 A，下 5 行队 B，半场分写在中间："T 9-3 → CT 4-9"
> 角标：MVP（mvpCount 最高）/ SUB（替补）
> 行点击 → `/players/:id`

**D. 回合时间线（"Round Timeline"）**
> 横向 24 格条，每格 = 一回合，底色按 winner side（CT 蓝 / T 黄）
> 三行图标对齐：bomb plant/defuse、半场分割线、endReason emoji（💣 ✂️ 💀 ⏱）
> Hover 单回合 → mini-card：比分变化、双方经济类型、kill 顺序（最多 5 行 "A → B (AK-47, HS)"）、duration

**E. 经济曲线（"Economy"）**
> ECharts 双线图：x = round number，y = team equipment value
> 两条线（队 A 橙 / 队 B 蓝），背景按 winner side 着色
> 副图小柱状 = 双方 money_spent 对比
> 数据来自 `match_rounds.team_*_equipment_value` / `team_*_money_spent`

**F. 高光列表**
> 三栏卡片：Multi-kills（4K/5K，从 `player_match_stats`）/ Clutches（按 opponent_count 倒序）/ Top Frags（前 3 名按 rating）

### 4.2 数据来源

| 组件 | API endpoint | 来源表 |
|---|---|---|
| Match Header | `GET /api/matches/:id` | `matches` |
| Map Picker | `GET /api/matches/:id/maps` | `match_maps` |
| Scoreboard | `GET /api/matches/:id/maps/:mapId/stats` | `player_match_stats` + `players` + `match_substitutes` |
| 回合时间线 | `GET /api/matches/:id/maps/:mapId/rounds` | `match_rounds` + 该回合的 `match_kills` |
| 经济曲线 | `GET /api/matches/:id/maps/:mapId/economy` | `match_rounds` |
| 高光列表 | `GET /api/matches/:id/maps/:mapId/highlights` | `match_clutches` + `player_match_stats` |

每 endpoint 走 `react-query` cache，map 切换时各组件独立 refetch。

### 4.3 视觉

- 整页用 data 层 token；仅 Match Header 比分用 brand 层 gold-gradient
- 时间线 CT 蓝 = `--color-accent`；T 黄 = #FFD700
- 经济曲线两队配色：队 A = primary 橙；队 B = accent 蓝

---

## 5. D 阶段：Stats 子页

### 5.1 页面结构

**Header**：当届赛事名 + 总场数 / 总击杀 / 总爆头率三段元数据卡

**Filter Bar**：
- 阶段：全部 / 小组赛 / 胜者组 / 败者组 / 总决赛
- 地图：全部 / de_ancient / de_inferno / ...（动态从已 import maps）
- Tier：全部 / 特等马 / 上等马 / 中等马 / 下等马 / 赠品马（**ALAST 独有**）
- 最小场次：≥3 / ≥5 / ≥10

**主排行表（可切指标 chip）**：
- Rating 2.0 / ADR / KAST% / HS% / K-D / First Kills / Multikills (≥3K) / Clutches won

每张排行 Top 20，列：rank / 选手（avatar + 队徽）/ 该指标值 / 场次 / Tier 角标。

### 5.2 ALAST 独有切片：Tier 间对比

横向小图（5 个柱）—— 各 Tier 平均 Rating / ADR。视觉验证"5 等级是否真分得开"。**这是赛事运营关心的数据**（评分体系是否公平），不是 HLTV 那种纯比赛分析。

### 5.3 数据来源

```
GET /api/stats/leaderboard?tournament_id=:id&stage=:s&map=:m&tier=:t&stat=:k&min_maps=:n
GET /api/stats/tier-comparison?tournament_id=:id&stat=:k
GET /api/stats/tournament-summary?tournament_id=:id
```

聚合查询全在 SQL 端做，前端只展示。

---

## 6. 视觉 token、组件复用、测试

### 6.1 双层 token 体系

`frontend/src/index.css` `@theme` 增 5 个 data 层 token：

```css
@theme {
  /* brand 层（保留） */
  --color-background, --color-primary (#FF8A00), --color-gold, --color-accent (#00D1FF), ...

  /* 新增 data 层（BLAST 风信息密集区） */
  --color-data-surface:    #0E1428;
  --color-data-row:        rgba(255,255,255,0.02);
  --color-data-divider:    rgba(255,255,255,0.06);
  --color-data-chip:       #1A2342;
  --color-data-text-muted: rgba(255,255,255,0.45);
}
```

**使用规约**：
- Hub Hero / Trophy / 主 CTA → brand 层
- Tab 内 match row / scoreboard / 右栏 card / 时间线 / 经济图轴 → data 层
- 跨用允许：highlight 数字（比分、rating top 1、当前阶段大字）用 brand 层 gold-gradient

### 6.2 组件沉淀

A 阶段：`<MatchRow variant="overview|results|bracket-card">`（三 variant）、`<StagePill>`、`<Card brand|data>`、`<RightRail>` 容器、5 个 widget 子组件

B 阶段加：`<RoundTimeline>`、`<EconomyChart>`、`<PlayerCell>`（avatar + 队徽 + 名）

D 阶段复用 `<PlayerCell>`。

### 6.3 测试

**Backend (vitest)**：
- 沿用 `app.request(...)` + `resetTables(...)` 模式
- 新 endpoint 各写 1 happy path + 1-2 edge case
- 新 import flow（`/demo/preview` + `/demo/confirm`）用 `match_data/3543734800_*.json` 当 fixture，覆盖：steamId 命中 / 别号命中 / 替补识别 / 新选手 / 重复 import idempotency
- Standings view 专门测试（造 4 队 × 3 轮 swiss 数据，验证 Buchholz + RD）
- 新增 `tests/`：`import-demo.test.ts` / `standings.test.ts` / `bracket.test.ts` / `match-detail.test.ts` / `stats-leaderboard.test.ts`

**Frontend**：
- 现仓库无前端测试，**不引入新框架**（YAGNI）
- 通过 `npm run dev` 手测验证 UI（用户已用 alast.kaumi.org 同步开发）
- 关键交互（Tab 切换、Map Picker、回合 hover）写入本 spec 作 acceptance checklist（见 §8）

### 6.4 部署 / 兼容性

- Schema 变更全是 `ADD COLUMN` 或新表，**无破坏性迁移**
- 现有 `csdm_imports` / `player_match_stats` 等行不动
- 现有路由不动，新路由叠加
- 部署照旧：`npm run build` → PM2 reload；frontend `npm run build` 静态产物

### 6.5 不做的事（YAGNI 边界）

- ❌ Bracket SVG 树图 → 用卡片列表替代
- ❌ 坐标热力图 → 推迟到 L3，本期 `match_kills` 不存坐标
- ❌ 实时 live 比分推送 → review 站定位
- ❌ 多届赛事切换 UI → 硬绑当届，组件留扩展点
- ❌ 玩家移动路径回放 → 数据源没有 tick 流（`playerPositions=[]`）
- ❌ 武器分布矩阵 / 闪光对子矩阵 → L4 装饰，不在范围
- ❌ 前端测试框架 → 不在范围
- ❌ 直播伴侣类 widget → 用户明确否决

---

## 7. 里程碑（粗估）

| 阶段 | 主要产出 | 大致工作量（idealized） |
|---|---|---|
| **A** | TournamentHub 4 tab + 右栏 + `/draft` + 双层 token | 中等 — 组件多但都是布局工作 |
| **C** | 6 个 migration + 新 import flow + 新 API endpoints + admin UI | 大 — 这是工程量最重的一段 |
| **B** | MatchDetail L2 五段（含 ECharts 经济曲线 + 时间线 hover） | 中等 |
| **D** | Stats 排行 + Tier 切片 + 筛选 bar | 小 — 主要是 SQL aggregation + 现成排行表组件 |

实施顺序：A → C → B → D。

阶段间衔接：A 阶段会 mock 部分数据（用现有 `matches`/`player_match_stats` 摘要数据驱动 Overview/Results；Group Stage / Bracket tab 在 admin 录入了 bracket_kind 后能跑）。C 阶段完成后 B 才有完整数据可用。

---

## 8. 验收 checklist（高级别）

**A 阶段**：
- [ ] `/` 加载后看到紧凑 hero + 4 tab pills；URL `?tab=...` 切换不刷新
- [ ] Overview tab 显示按轮次分组的比赛流，最新在最上；行点击 → `/matches/:id`
- [ ] Group Stage tab 显示 Swiss standings 表（W-L、Buchholz、RD）+ 三轮折叠面板
- [ ] Bracket tab 显示 3 列卡片（UB / LB / GF），不画 SVG
- [ ] Results tab 显示扁平倒序列表，筛选 chip 工作
- [ ] 右栏 5 张卡片 + `/draft` 链接齐全
- [ ] `/draft` 页 5 行 Tier grid + 选马顺序蛇形可视化

**C 阶段**：
- [ ] 6 个 migration 顺次跑通；现有数据不被破坏
- [ ] 13 个新 backend endpoint（§3.6: 9 GET + 4 POST）跑通；ApiResponse envelope 一致
- [ ] D 阶段 3 个 stats endpoint（§5.3）跑通
- [ ] B 主线 import：建 match → 上传 N JSON → preview 三种状态 → confirm 写齐 6 张表 + idempotency 报错重导
- [ ] A 兜底 import：单 JSON 上传 + 选 match 工作
- [ ] 替补识别：当 player.team_id ≠ 当场队，preview 弹提示，admin 可登记
- [ ] 选手别号：未命中 steamId 可绑现有选手作别号，下次自动认
- [ ] Standings view 在造数据上算出正确 Buchholz / RD

**B 阶段**：
- [ ] `/matches/:id` 显示 Header / Map Picker / Scoreboard / 时间线 / 经济曲线 / 高光六段
- [ ] Map Picker chip 切换不刷新页面，各组件独立 refetch
- [ ] Scoreboard 半场分正确显示 "T 9-3 → CT 4-9"
- [ ] 时间线 24 格按 winner side 着色，hover 弹 mini-card 含 5 行 kill 顺序
- [ ] 经济曲线两条线 + 副图小柱状 + 背景按 winner 着色
- [ ] 替补在 scoreboard 显示 "SUB" 角标

**D 阶段**：
- [ ] `/stats` 显示 8 指标可切排行表
- [ ] Filter Bar 四维筛选（阶段/地图/Tier/最小场次）联动正确
- [ ] Tier 对比图显示 5 柱

---

## 9. 引用

- Project memories: `~/.claude/projects/-Users-brandt-alast/memory/`（站点定位、赛制、数据源三条）
- 视觉参考：BLAST Premier Open Rotterdam 2026（用户提供的截图）
- 赛事规则文档：用户在 brainstorm 中粘贴的完整规则（第一至第四章）
- 数据源：`/Users/brandt/alast/match_data/*.json`（14 张 demo 解析 JSON）
- 现 import 流：`backend/src/routes/admin/import.ts`（CSDM 摘要格式，C 阶段被替换）
