# Trophy Hero + 「炫酷明亮」视觉升级 — 设计文档

**Date**: 2026-04-26
**Status**: Spec — awaiting implementation plan
**Owner**: ALAST
**Supersedes**: `2026-04-26-alast-premier-visual-redesign-design.md`（quiet/restrained 方向，反向决策）

---

## 背景与目标

ALAST Premier 2026 首页目前缺少「一上来就抓眼」的视觉锚点；整站氛围偏暗、偏闷，esports 能量感不足。本次升级把方向定为「炫酷 + 明亮 + 高能 esports」，反掉昨天那份编辑式 quiet redesign spec。

核心目标：
1. **首页强入场**：访客进首页第一秒被奖杯入场动画抓住眼球
2. **全局动效统一**：其他页面共用一套有 esports 感的动效语言（不必同样强烈，但语汇一致）
3. **新增第二品牌色**：紫粉霓虹做语义对照色（输/低位/LIVE），与现有橙金（赢/上位）形成 rank 语义轴

不在本次 scope：字体系统改造（昨天那份 spec 的 Source Han Serif / Georgia / Fira Code 三家族字体方案不做）、backend、admin 流程、chart 配色重做。

## 1. Color tokens + 语义轴

### 1.1 新增 CSS 变量

加在 `frontend/src/index.css` 的 `@theme` 块：

```css
--color-neon-pink-from: #FF2BD6;
--color-neon-pink-to:   #B026FF;
--color-neon-pink:      #FF2BD6;  /* 单色场合 */
```

### 1.2 强制语义映射

| 语义 | 颜色 | 应用位置 |
|---|---|---|
| Winner / 上位 / Top rank | 橙金渐变（FFD700→FF8A00） | 比分赢方、leaderboard #1-3、tier S/A、MVP、晋级胜者组 |
| Loser / 下位 / Bottom rank | 紫粉渐变（FF2BD6→B026FF） | 比分输方、leaderboard 末位、tier D/C+、被淘汰 |
| Neutral / 未定 | 白 50-70% | upcoming 比赛、待赛、leaderboard 中段、tier B |
| Status: LIVE | 紫粉 + 脉冲 | StatusBadge `live` |
| Data 对比色（图表） | cyan #00D1FF（保持不动） | 经济图、雷达图次轴 |

**一致性原则**：rank 语义轴在比分、选马（tier）、战绩、数据排名所有出现位置一脉相承。winner=金 / loser=粉 不可被某个组件单独打破。

## 2. 奖杯入场（B 方案 · SVG mask 多层动效）

### 2.1 触发

```ts
if (!sessionStorage.getItem('alast.trophyShown')) {
  // 播完整入场
  sessionStorage.setItem('alast.trophyShown', '1')
} else {
  // 直接 settle 到 idle
}
```

每会话首次进首页播一次；`reduce-motion` 跳到 settled 终态。

### 2.2 节拍（总 ~1.6s）

| 时间窗 | 事件 |
|---|---|
| 0 – 0.2s | 屏中央金色种子点 pop-in（6px → 透明） |
| 0.2 – 0.6s | 奖杯 mask scale 0.6→1.0 + opacity 0→1 + 金色 sheen 横扫一次 |
| 0.6 – 0.8s | 背景径向辉光 burst（峰值 200ms 后衰退）+ 8-12 颗火花从奖杯径向飞散 |
| 0.8 – 1.2s | 奖杯收到 hero 位置（轻微回弹 ease-out-quart） |
| 1.2 – 1.6s | `ALAST PREMIER 2026` 字样自下淡入 + 金色渐变扫一次 |
| 1.6s+ | idle：奖杯 7° 钟摆 6.5s loop + drop-shadow 呼吸 5.5s loop |

### 2.3 实现

**新组件** `frontend/src/components/TrophyHeroEntry.tsx`：

- 复用现有 `/trophy.png` 资产 + `WebkitMaskImage` 技巧（已在 `TrophySymbol` 验证）
- 编排用 framer-motion 的 `motion.div` 序列；火花用 stagger（30-50ms 间隔，随机方向 + 减速）
- 接受 `playEntry: boolean` prop；由父组件读 sessionStorage 决定
- reduce-motion：直接渲染终态，不挂任何 keyframes

挂在 `frontend/src/components/tournament/TournamentHubHero.tsx` 的 hero 块内，替换当前的静态 trophy 占位。

## 3. 环境氛围（金色慢飘粒子）

**新组件** `frontend/src/components/AmbientParticles.tsx`：

- 14 颗粒子，每颗 1-3px，颜色从 `[#FFD700, #FFB800, #FF8A00]` 随机
- 透明度 0.15-0.35
- 缓慢上飘：每颗独立 30-60s loop（速度随机化避免同步）
- 横向 ±20px 微摆
- z-index 在 background 之上、内容之下
- reduce-motion 隐藏整层

**挂载位置**：仅 `/`（OverviewTab 所在 hero 区域）+ 战队详情页 hero 区域；其他数据密集页（stats / matches / players）不挂，避免视觉噪声。

## 4. 全局动效语言

### 4.1 保留（不动）

`pageReveal` / `fadeUp` / `panelReveal` / `softHover` / `pressTap` —— 现有 `frontend/src/lib/motion.ts` 中已实现。

### 4.2 新增 4 条 variants

加在 `frontend/src/lib/motion.ts`：

| Variant | 用途 | 触发位置 |
|---|---|---|
| `rankReveal` | 数字入场 spring + 1 帧渐变扫过（颜色按 winner/loser） | MatchRow 比分、Scoreboard 总分、Leaderboard rank cell、TierBadge |
| `glowPulse` | 持续 6-8s 呼吸，box-shadow 颜色按 rank 语义 | MVP 卡、当前 stage timeline 节点、LIVE 行 |
| `headingMask` | H1/Hero 标题入场 mask reveal（左→右），替代纯 fade | 各页面顶部 H1（赛程/数据中心/新闻/战队/选手）|
| `scoreFlip` | 比分数字翻转入场（仅 finished match 静态调用，未来直播可复用） | MatchRow 比分、MatchDetailPage 总分 |

每条都带 reduce-motion 兜底（直接渲染终态）。

### 4.3 关键点

- `rankReveal` 是新增 variants 中**唯一与语义轴耦合**的 —— 接受 `outcome: 'win' | 'loss' | 'neutral'` 参数决定渐变颜色
- `glowPulse` 同样接受 `tone: 'win' | 'loss' | 'neutral'`，box-shadow 颜色对应

## 5. Reduced-motion 回退

- Trophy entry：跳到 Frame 3 终态（奖杯居中 + 标题已显示，无入场过程）
- Ambient particles：整层不渲染
- `glowPulse` / `headingMask` / 钟摆 / 呼吸：全部禁用
- `rankReveal` / `scoreFlip`：跳过 spring + gradient sweep，直接渲染终态颜色（语义颜色保留，仅去掉动效过程）
- 现有 `@media (prefers-reduced-motion: reduce)` CSS 全局兜底（已有，沿用）

新加的 keyframes（`sparkBurst` / `particleDrift` / `glowPulse`）必须落入这块 media query 的禁用列表。

## 6. Schema 变更

**无**。本次纯前端视觉改动。

## 7. 实现 surface

| 文件 | 改动类型 | 改动 |
|---|---|---|
| `frontend/src/index.css` | edit | + 紫粉 tokens；+ `sparkBurst` `particleDrift` `glowPulse` keyframes；reduce-motion media query 添加新 keyframes 禁用 |
| `frontend/src/lib/motion.ts` | edit | + `rankReveal` `glowPulse` `headingMask` `scoreFlip` variants（每个支持 `outcome`/`tone` 参数） |
| `frontend/src/components/TrophyHeroEntry.tsx` | **new** | 奖杯入场编排组件；接受 `playEntry: boolean` prop；reduce-motion 直接渲染终态 |
| `frontend/src/components/AmbientParticles.tsx` | **new** | 慢飘粒子层组件；CSS-only 也可（不需 framer-motion） |
| `frontend/src/components/tournament/TournamentHubHero.tsx` | edit | 集成 `TrophyHeroEntry` + `AmbientParticles`；从 sessionStorage 读 `alast.trophyShown` |
| `frontend/src/components/StatusBadge.tsx` | edit | LIVE 状态改用 `--color-neon-pink` + 脉冲 |
| `frontend/src/components/match/Scoreboard.tsx` | edit | 队伍总分按 winner / loser 应用 rank 渐变 |
| `frontend/src/components/tournament/MatchRow.tsx` | edit | 比分按 winner / loser 应用 rank 渐变；finished 状态调用 `rankReveal` |
| `frontend/src/pages/MatchesPage.tsx` | edit | 比赛卡比分用 rank 颜色；移除现有 `text-primary` / `text-white/30` 二元 class，统一走 rank 语义 |
| `frontend/src/pages/MatchDetailPage.tsx` | edit | hero 总分按 winner / loser；保持现有 `gold-gradient`（赢方）+ 新加 `pink-gradient`（输方） |
| `frontend/src/pages/StatsPage.tsx` | edit | tier 色阶：S=金 / A=橙 / B=白 / C+=灰 / D=紫粉；leaderboard #1-3 = 金色 rank（已有），末位 +紫粉 |
| `frontend/src/pages/TeamDetailPage.tsx` | edit | recent results 中比分应用 rank 颜色 |
| `frontend/src/pages/PlayerDetailPage.tsx` | edit | tier 徽章应用色阶 |
| `frontend/src/components/tournament/TournamentHubHero.tsx`（同上） + `frontend/src/pages/TeamDetailPage.tsx`（同上） | mount point | `AmbientParticles` 内嵌进这两个 hero 区域；不挂在 Layout 全局，避免数据页噪声 |

**不动**：backend、charts 颜色、字体、ScrollBar、admin 路由、其他 brand utility（`gold-gradient` 留作 winner 渐变 alias，新增 `pink-gradient` utility class 作 loser 渐变 alias）

## 8. 测试 / 验证

- `cd frontend && npm run build` 通过
- 手动 viewport 检查：
  - 桌面 + 移动两套尺寸
  - 首页第一次进 / 刷新（应不重播）/ 新会话（应重播）
  - reduce-motion 偏好下首页应直接显示终态、无粒子、无呼吸
  - 比分 winner / loser 颜色在 MatchesPage / MatchDetailPage / TeamDetailPage / Scoreboard 一致
  - LIVE 状态在所有出现位置都是紫粉脉冲
- 不写 visual regression 测试（动效手测，写 snapshot 收益不大）

## 9. 不做（YAGNI）

- 不做 3D 奖杯（A 方案）/ 不做 ticker（C 方案）—— 留作未来升级路径
- 不重做字体系统（昨天 spec 那套 Source Han Serif / Georgia / Fira Code 不做）
- 不做 chart 配色重新染色（cyan 保持）
- 不做 light mode（继续 dark only）
- 不做 admin 端任何视觉改动
- 不做 sound effect（首页入场不配音）
- 不做 prefer-color-scheme 自适配
- 不做用户层「重播入场」按钮

## 10. 决策记录

| 决策 | 选项 | 理由 |
|---|---|---|
| 总方向 | 反掉 quiet redesign / 走 esports 高能 | 用户明确「更炫酷更明亮」 |
| 奖杯入场方式 | B（SVG mask 层叠动效）not A（3D）/ C（电视风） | 轻量 + 复用现有资产 + 留升级余地 |
| 入场触发 | sessionStorage once-per-session | 平衡仪式感和访问骚扰 |
| 第二品牌色 | P2 紫粉 #FF2BD6→#B026FF | 与橙金高对比但不打架 |
| 紫粉用法 | LIVE + winner/loser + tier 色阶 + MVP | 紫粉=下位的语义轴必须统一 |
| 环境氛围 | 慢飘金色粒子（仅首页 + 战队 hero）| 给「明亮感」但不污染数据页 |
| 字体改造 | 不做 | 超出本次 scope，留作独立 spec |
| 范围 | 仅前端视觉 + 交互 | 不动 backend / schema |

## 11. 实施顺序提示（不是 plan，仅供 plan 阶段参考）

1. CSS tokens + keyframes（index.css）
2. motion.ts 新 variants
3. AmbientParticles 组件 + Layout 路由集成
4. TrophyHeroEntry 组件 + TournamentHubHero 集成
5. StatusBadge LIVE 紫粉化
6. rank 语义铺到所有比分位置（Scoreboard / MatchRow / MatchesPage / MatchDetailPage / TeamDetailPage）
7. tier 色阶铺到 StatsPage / PlayerDetailPage
8. headingMask 应用到各页 H1
9. 桌面 + 移动 + reduce-motion 三道手测
