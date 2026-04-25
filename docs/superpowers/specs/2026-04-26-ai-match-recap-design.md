# AI 比赛赛报生成 — 设计文档

**Date**: 2026-04-26
**Status**: Spec — awaiting implementation plan
**Owner**: ALAST

## 背景与目标

ALAST 站点定位是「赛后 review」（不是直播伴侣）。目前 `news` 表已有 `match_id` 外键和 `战报` 分类，14 场已导入比赛拥有完整的细粒度数据（`match_rounds` / `match_kills` / `match_clutches` / `player_round_economies`），但：

- 没有任何文字解读把这些数据串成故事
- news 详情页和 match 详情页之间没有互相跳转
- match_data/ 里 CSDM JSON 提供的数据丰富度远超目前页面利用率

目标：为每一场已完赛的比赛生成一篇有个性的散文式赛报，模仿斗鱼解说「玩机器」的风格，并在 news 与 match 两侧建立互链闭环。

## 风格定位

模仿对象：斗鱼 CS2 解说 **玩机器（Machine / 6657 / 洋马骑士）**。

**人设关键词**：海归解说 / 中英混杂自如 / 不带脏字、擅成语 / 抽象+段子+煽情三合一 / 善于预判弹幕节奏 / 感情渲染强 / 善用比喻、谐音、俏皮话 / 喜欢自嘲。

**风格信号**（神不用形，避免直接照抄字面）：
- 引诗（中二/煽情场合）
- 自创网络梗昵称
- 「我知道你们要说……」之类的弹幕节奏预判
- 战术分析 + 段子 + 高潮渲染三合一切换

**法律边界**：稿件用中性 byline 「ALAST 解说团」发布；产品所有可见位置（标题、author、列表 badge）**不出现「玩机器」三个字**；只在每篇文章末尾的免责声明里出现一次：

> _本文由 AI 模仿「玩机器」解说风格生成，仅为致敬，与本人无关。_

## 总体架构

```
┌─ backend/scripts/generate-news.ts ─┐
│ (一次性 backfill 14 场)             │
└──────────────┬──────────────────────┘
               ▼
┌─ backend/src/lib/news-generation/ ─┐
│   facts.ts    extractMatchFacts()  │  ← 从 7 张 DB 表重建事实骨架
│   prompt.ts   buildPrompt()        │  ← 风格 system prompt（含 cache）
│   generate.ts generateArticle()    │  ← Claude API 调用 + JSON 解析 + 重试
│   anthropic.ts  Anthropic client   │
└──────────────┬──────────────────────┘
               ▲
┌─ POST /api/admin/news/generate ────┐
│   { match_id, force? } → 草稿 news │
└────────────────────────────────────┘
```

两个入口共用同一套生成函数；事实抽取层是纯函数（除 DB 查询外无副作用），LLM 调用层做一层薄封装。

## 1. 事实抽取层（`backend/src/lib/news-generation/facts.ts`）

签名：`extractMatchFacts(matchId: string): Promise<MatchFacts>`

**数据来源**：完全从 DB 重建（不依赖 `match_data/` 文件，admin 按钮在 prod 也能跑）。涉及表：

`matches` · `match_maps` · `player_match_stats` · `match_rounds` · `match_kills` · `match_clutches` · `player_round_economies` · `teams` · `players` · `tournaments`

**返回结构**（结构化、可序列化、信息密度高，不带任何叙述意图）：

```ts
type MatchFacts = {
  match: {
    stage: string | null
    scheduled_at: string | null
    best_of: number
    final_score: string  // '2-1'
  }
  teams: {
    a: { name: string; region: string | null }
    b: { name: string; region: string | null }
  }
  maps: Array<{
    name: string                           // 'de_ancient'
    order: number
    score_a: number
    score_b: number
    winner_team: 'a' | 'b' | null
    duration_seconds: number | null
    half_scores: {
      first_half: string                   // '8-4'
      second_half: string                  // '5-3'
      ot?: string                          // '1-0' 等
    }
    economy_summary: {
      eco_wins_a: number; eco_wins_b: number
      force_wins_a: number; force_wins_b: number
      pistol_wins: { a: number; b: number }
    }
    pivotal_rounds: Array<{
      round_number: number
      narrative_tag: PivotalTag
      detail: Record<string, unknown>      // 因 tag 而异
    }>
    clutches: Array<{
      player_nickname: string
      situation: string                    // '1v3'
      won: boolean
      weapon: string | null
      round: number
    }>
    standout_players: Array<{
      player_nickname: string
      team: 'a' | 'b'
      kills: number; deaths: number; assists: number
      adr: number; hs_pct: number
      first_kills: number; first_deaths: number
      rating: number
    }>
    notable_kills: Array<{
      round: number
      killer: string; victim: string
      weapon: string
      tag: NotableKillTag
      detail: Record<string, unknown>
    }>
  }>
  match_mvp: {
    player_nickname: string
    team: 'a' | 'b'
    why: string                            // 程序生成的一句客观依据
  } | null
  storylines: Storyline[]                  // 钩子提示，prompt 里告知非强制
}
```

### 戏剧性识别规则（关键 — 决定稿子有没有抓到点）

**`PivotalTag`** 枚举与判定：

| Tag | 触发条件 |
|---|---|
| `eco_upset` | 一队 economy_type ∈ {`eco`, `semi_eco`} 但赢了对面 `full_buy` |
| `force_clutch` | 一队 economy_type = `force` 且赢回合且最后一名玩家活下来 |
| `pistol_loss_recovery` | 输了上半 / 下半 pistol 但仍赢下整图 |
| `comeback_streak` | 单半连输 ≥3 回合后立刻连赢 ≥4 回合 |
| `ot_thriller` | 进入 OT 且 OT 内分差 ≤2 |
| `last_round_decided` | 决胜图最后一回合分差 1，从 12-12 拉到 13-12 |
| `ace_round` | 单回合单选手 5 杀 |
| `quad_round` | 单回合单选手 4 杀且非 ace |

抽取上限：每图最多 5 条 `pivotal_rounds`（按 tag 优先级排序：`ot_thriller` > `last_round_decided` > `ace_round` > `eco_upset` > 其他）。

**`NotableKillTag`** 枚举：`no_scope_awp` · `through_smoke` · `long_distance_awp`(distance > 2500) · `flash_assisted_pickoff`（is_assisted_flash + first kill of round）· `quad_in_round` · `ace_in_round`

抽取上限：每图最多 8 条 `notable_kills`，去重（同一回合的 ace 内的 5 杀只算一条）。

**`Storyline`** 字符串枚举（程序自动识别的几条「叙事钩子」给 LLM 优先级提示，**不强制**）：

- `team_b_dropped_first_half_then_collapsed` — 上半领先 ≥4 回合但下半被翻
- `player_X_carried_with_N_clutches` — 某选手 ≥2 个 clutch 赢
- `map_N_ot_thriller` — 第 N 图进 OT
- `awp_dominance_player_X` — 某选手 awp 击杀 ≥10 且 hs_pct 高
- `pistol_double_loss_team_Y` — 某队上下半 pistol 都输
- `comeback_from_X_Y_deficit` — 整场比分曾落后 ≥4 但翻盘

**`match_mvp`** 选取：rating 最高且 ≥1.2 的选手；并列时取胜方那位；`why` 字段拼一句客观的「rating 1.42 + 2 clutches + 28 frags」。

**确定性保证**：同一场比赛的 `MatchFacts` 永远一致 —— 所有阈值常量、规则都在 `facts.ts` 顶部；不调用 LLM，不依赖时间。

## 2. LLM 解说层（`prompt.ts` + `generate.ts`）

### 模型与参数

- **Model**: `claude-sonnet-4-6`（中文长文 + 玩机器风格表现力的最佳成本/质量点）
- **Temperature**: `0.8`
- **Max tokens**: `2500`（覆盖 1200 中文 + JSON overhead）

### Prompt 结构（system + user 两段）

**System message**（带 `cache_control: { type: 'ephemeral' }`，命中后省 ~90% input cost）：

包含三块：
1. **人设描述**：来自风格定位章节的关键词 + 招牌信号
2. **风格约束**：
   - 中英混杂自如，但 CS 术语要准（eco / force / retake / clutch / ninja / anti-eco / save / trade / opening duel）
   - 擅成语、不带脏字、能突然引诗（仅煽情时刻）
   - 抽象+段子+煽情三合一切换，**不要每句都抖梗**
   - 偶尔自嘲、偶尔预判读者反应（"我知道你们要说……"）
   - 避免直接复制特定主播的具名口头禅 —— 用神不用形
3. **写作约束**：
   - 800-1200 字
   - **散文式，禁止小标题、禁止四段式模板、禁止罗列式 bullet**
   - 必须落地到具体数据（比分 / 选手名 / 回合号 / 武器）
   - 每篇要有自己的角度，不要每篇都从「BO3 比分」开篇
   - 第一人称口吻
   - 不要冒称真人，不要署名为某位真实主播
4. **输出格式约束**：直接返回 JSON `{ title, summary, content }`
   - `title` ≤30 字
   - `summary` ≤120 字、独立成段、不要重复正文开头
   - `content` 为 markdown 字符串

**User message**：

```
这是一场 ALAST Premier 2026 比赛的事实包，请按 system 的要求写一篇赛报：

<MatchFacts JSON pretty-printed>
```

### 调用与重试

- API 5xx / 超时：指数退避 retry 2 次（1s / 4s）
- JSON 解析失败：retry 1 次（追加「请只返回 JSON，无任何前后缀」）
- `title > 30` / `summary > 120`：不 retry，截断保留，记到 `generation_meta.warnings`
- 全部失败：抛 `LLMError` / `LLMParseError`

### Anthropic client

`backend/src/lib/anthropic.ts` —— 单例 `Anthropic` 客户端，从 `process.env.ANTHROPIC_API_KEY` 读 key，启动期校验缺失。

## 3. Schema 变更

新 migration `backend/src/migrations/008_ai_generated_news.sql`：

```sql
ALTER TABLE news
  ADD COLUMN ai_generated    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN generation_meta JSONB;
-- generation_meta = {
--   model: string,
--   prompt_version: string,        // 'v1' 起，prompt 改一次 +1
--   generated_at: ISO 8601,
--   facts_hash: string,            // sha256(canonical-JSON of MatchFacts)
--   retry_count: number,
--   warnings: string[]
-- }

CREATE INDEX IF NOT EXISTS idx_news_ai_generated ON news(ai_generated);
```

零破坏性：现有 news 行 `ai_generated` 默认 false、`generation_meta` 默认 NULL，前端逻辑不受影响。

`author` 列固定写 `'ALAST 解说团'`；`category` 用现有 `战报`；slug 走现有 `slugify()`。

## 4. 入口

### Backfill 脚本：`backend/scripts/generate-news.ts`

```
npx tsx scripts/generate-news.ts                 # 跑所有 finished match，跳过已生成
npx tsx scripts/generate-news.ts --force         # 覆盖已有 AI 草稿
npx tsx scripts/generate-news.ts <match-id>      # 单场（仍尊重 --force）
```

行为：
- 默认 `SELECT id FROM matches WHERE status='finished' ORDER BY scheduled_at`
- 每场：查现有 AI news（`ai_generated=true AND match_id=…`）→ 有就跳过（除非 `--force`）→ `extractFacts` → `generate` → INSERT（无现有行）或 UPDATE（`force=true` 且已有行；保留 `id` / `slug` / `published_at`，仅覆盖 `title` / `summary` / `content` / `generation_meta`）
- **`published_at = NULL`**（草稿态，由 admin 在 admin news 列表里 review + bulk publish）
- 单场失败不阻断后续；最后打印 `failed: [(match_id, reason)…]` 汇总
- 退出码：0 全成功；1 有失败但有成功；2 全失败 / 配置错误

### Admin endpoint：`POST /api/admin/news/generate`

挂在 `backend/src/routes/admin/news.ts`：

```
POST /api/admin/news/generate
body:    { match_id: string, force?: boolean }
auth:    Bearer JWT (现有 admin middleware)
returns:
  200 { success: true, data: { news: NewsRow } }   // 已存在且 !force
  201 { success: true, data: { news: NewsRow } }   // 新生成
  400 NO_MATCH_DATA              // match 不存在 / 未 finished / 无 match_maps
  502 LLM_ERROR | LLM_PARSE_ERROR
```

幂等：相同 `match_id` 多次调用、`force=false` 时返回同一行；`force=true` 时覆盖 `title/summary/content/generation_meta`，**保留 `id` 和 `published_at` 状态**（避免误把已发布的稿子打回草稿）。

落库同样默认 `published_at = NULL`；admin 自己改完按 publish。

## 5. 前端互链 UX

### 5.1 MatchDetailPage 底部「赛后解读」专栏

文件：`frontend/src/pages/MatchDetailPage.tsx`，位置在 Highlights section **之后**。

- 新 hook `useMatchNews(matchId)` in `frontend/src/api/matches.ts`，调 `GET /api/matches/:id/news`
- 卡片样式：`surface-sheen`，标题 **`🎤 赛后解读`**（不出现「玩机器」字样），下面：
  - `article.title`（大号）
  - `article.summary`（中号 opacity-60）
  - 「阅读全文 →」链接 → `/news/:slug`
- 没有关联 published news 时整个 section 不渲染（不暴露未生成 / 草稿态）
- 复用 `panelReveal` motion 与现有 section 一致

### 5.2 NewsDetailPage 顶部比赛卡 + 底部 disclaimer + 底部 CTA

文件：`frontend/src/pages/NewsDetailPage.tsx`

- **顶部比赛卡**（`article.match_id` 存在时渲染）：在 `← 返回新闻` 下面
  - `useMatch(article.match_id)` 拉数据
  - 紧凑一行：两队 logo + 名 + 比分 + 阶段（用现有 `TeamLogo` 缩到 32-40px）
  - 整张卡 `<Link to={'/matches/' + match.id}>`，hover 高亮
- **不在顶部渲染 AI disclaimer**
- **底部**（按顺序，全部在 markdown content 之后）：
  1. `article.ai_generated === true` 时：免责说明独立段，`text-xs opacity-40 italic`，文案：
     > _本文由 AI 模仿「玩机器」解说风格生成，仅为致敬，与本人无关。_
  2. 居中按钮 `📊 查看完整比赛数据 →` → `/matches/:id`，配色 `--color-accent`

### 5.3 NewsPage 列表卡片

文件：`frontend/src/pages/NewsPage.tsx`

- 卡片副标题位置：如果 `news.match` 嵌套字段存在，加一行 mini「队 A vs 队 B · 比分」
- 不出现「玩机器」字样

### 5.4 MatchesPage 列表卡片

文件：`frontend/src/pages/MatchesPage.tsx`

- 每张比赛卡右上角：`news_slug` 存在时渲染 🎤 icon，`title="查看赛报"`
- 点击跳 `/news/:news_slug`（不是 match）
- 不出现「玩机器」字样

### 后端配套接口

| 路径 | 改动 |
|---|---|
| `GET /api/matches/:id/news` | **新增**，返回 `NewsRow[]`（`published_at IS NOT NULL AND match_id=:id`） |
| `GET /api/news` | 扩展 response：每条多带 `match: { id, score, team_a_name, team_b_name, team_a_logo, team_b_logo } \| null`（LEFT JOIN） |
| `GET /api/matches` | 扩展 response：每条多带 `news_slug: string \| null`（LEFT JOIN，仅取 `published_at IS NOT NULL` 的；同一 match 多条时取最新 `published_at`） |

## 6. 错误处理

| 场景 | 处理 |
|---|---|
| LLM 5xx / 超时 | 指数退避 retry 2 次（1s / 4s） |
| LLM 返回非 JSON | retry 1 次（追加 JSON-only 提示），仍失败抛 `LLMParseError` |
| `title > 30` / `summary > 120` | 截断保留，记 `generation_meta.warnings` |
| match 不存在 / 未 finished / 无 match_maps | admin: `400 NO_MATCH_DATA`；脚本：跳过并日志 |
| 已存在 AI news 且 `force=false` | admin: `200` + 现有 row（idempotent）；脚本：跳过 |
| `ANTHROPIC_API_KEY` 缺失 | 启动校验，缺即抛错 |
| Backfill 中途单场失败 | 不阻断后续；末尾打印失败汇总 |

## 7. 测试

`backend/tests/news-generation.test.ts`：

- `extractMatchFacts` 单元（核心）：用 `tests/setup.ts` 的 `resetTables` 灌一场已知比赛进 DB，断言：
  - `pivotal_rounds` 抓到 `eco_upset` / `ace_round` / `last_round_decided`
  - `clutches` 数量与 DB 一致
  - `storylines` 含 `comeback_from_X_Y_deficit`（构造对应数据）
  - `match_mvp` 选取正确
  - 边界：单图比赛、OT、平局回合不崩
- `buildPrompt` 单元：断言 system 串包含「禁止小标题」「禁止四段式」「字数 800-1200」「不要冒称真人」等关键约束
- `generateArticle` 单元：`vi.mock('../src/lib/anthropic.js')` 桩掉 SDK 返回固定 JSON，断言：
  - 落库行字段正确（`ai_generated=true`、`author='ALAST 解说团'`、`category='战报'`、`published_at=NULL`）
  - `generation_meta.facts_hash` 写对
  - retry 行为：第一次 throw，第二次成功，最终成功
  - JSON 解析失败的 retry 路径
  - idempotent：相同 match_id `force=false` 第二次返回同一行不重生成
- Admin endpoint 集成：`POST /api/admin/news/generate` 走完整流程（mock LLM），验证：
  - 鉴权：无 token 401
  - 参数校验：缺 `match_id` 400
  - `NO_MATCH_DATA` 路径
  - `force=true` 保留 `id` 和 `published_at`
- **不写**：LLM 内容质量测试（不可重复，无意义） —— 内容质量靠 backfill 跑完后人工 review

## 不做（YAGNI）

- 不做 prompt 多版本管理 / A/B 框架（`generation_meta.prompt_version` 只是字符串记录，没有运行时分支）
- 不做生成结果版本历史（`facts_hash` 已经够 detect drift）
- 不做内容审核 hook（草稿态本身就是审核）
- 不做自动定时任务、不耦合到 CSDM import 路径
- 不做多语言（中文站）
- 不做用户端「重新生成」按钮（admin 端就够，避免被 abuse）

## 实施顺序提示（不是 plan，仅供 plan 阶段参考）

1. Migration 008 + Anthropic client + facts.ts
2. prompt.ts + generate.ts + 单元测试（mock LLM）
3. Backfill 脚本 + 跑一次 review 内容质量、调 prompt
4. Admin endpoint + 集成测试
5. 后端配套接口（matches/news 扩展 + 新增 `/matches/:id/news`）
6. 前端四个落点（顺序：MatchDetailPage 专栏 → NewsDetailPage 顶部卡 + 底部 disclaimer/CTA → NewsPage 列表 → MatchesPage 列表）

## 决策记录

| 决策 | 选项 | 理由 |
|---|---|---|
| 风格 | 玩机器（神不用形） | 用户指定 |
| 生成机制 | 数据骨架 + LLM 改写 | 事实风险压最低，CSDM JSON 信息密度足够 |
| 触发 | 一次性 backfill + admin 按钮 | 14 场规模可控；不耦合 import 流程避免脆性传导 |
| 篇幅/结构 | 800-1200 散文式，非结构化 | 玩机器风格切换需要篇幅；模板化会出戏 |
| 数据源 | 全 DB 重建（不读文件） | admin 在 prod 也能跑；migration 006 已经存了所需细粒度 |
| 互链 UX | match 底专栏 / news 顶卡 + 底 CTA | 数据→故事→数据闭环，符合「赛后 review」定位 |
| Byline | `ALAST 解说团` | 产品表面零「玩机器」字样，仅末尾免责出现一次 |
| 模型 | `claude-sonnet-4-6` | 中文长文性价比；Haiku 表现力不够，Opus 浪费 |
