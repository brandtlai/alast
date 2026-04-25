import ReactECharts from 'echarts-for-react'
import type { TierComparison } from '../../types'

interface Props {
  data: TierComparison[]
}

const TIER_LABELS: Record<string, string> = {
  S: '特等马', A: '上等马', B: '中等马', 'C+': '下等马', D: '赠品马',
}

export default function TierChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-md border py-8 text-center text-xs text-white/30"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        Tier 数据需至少一场已完赛且有 tier 指定的选手
      </div>
    )
  }

  const tiers = data.map(d => `${d.tier}\n${TIER_LABELS[d.tier] ?? ''}`)
  const ratings = data.map(d => parseFloat(d.avg_rating ?? '0'))
  const adrs = data.map(d => parseFloat(d.avg_adr ?? '0'))
  const playerCounts = data.map(d => d.players)

  const axisStyle = {
    axisLabel: { color: 'rgba(255,255,255,0.40)', fontSize: 10 },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.10)' } },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0A0F2D',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
      formatter: (params: Array<{ seriesName: string; value: number; dataIndex: number }>) => {
        const idx = params[0]?.dataIndex
        return `<b>Tier ${data[idx]?.tier}</b> (${playerCounts[idx]} 人)<br>` +
               params.map(p => `${p.seriesName}: ${p.value}`).join('<br>')
      }
    },
    legend: {
      data: ['Avg Rating', 'Avg ADR'],
      textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
      top: 4,
    },
    grid: { left: 55, right: 55, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: tiers,
      ...axisStyle,
      axisLabel: { ...axisStyle.axisLabel, lineHeight: 16 },
    },
    yAxis: [
      { type: 'value', name: 'Rating', nameTextStyle: { color: 'rgba(255,255,255,0.3)', fontSize: 10 }, ...axisStyle, min: 0, max: 2 },
      { type: 'value', name: 'ADR', nameTextStyle: { color: 'rgba(255,255,255,0.3)', fontSize: 10 }, ...axisStyle, min: 0 },
    ],
    series: [
      {
        name: 'Avg Rating',
        type: 'bar',
        yAxisIndex: 0,
        data: ratings,
        itemStyle: { color: 'rgba(0,209,255,0.75)' },
        barMaxWidth: 28,
        label: {
          show: true, position: 'top', color: 'rgba(255,255,255,0.5)', fontSize: 10,
          formatter: ({ value }: { value: number }) => value.toFixed(2),
        },
      },
      {
        name: 'Avg ADR',
        type: 'bar',
        yAxisIndex: 1,
        data: adrs,
        itemStyle: { color: 'rgba(255,138,0,0.75)' },
        barMaxWidth: 28,
        label: {
          show: true, position: 'top', color: 'rgba(255,255,255,0.5)', fontSize: 10,
          formatter: ({ value }: { value: number }) => value.toFixed(1),
        },
      },
    ],
  }

  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-4 pt-4 mb-1">
        Tier 等级对比 — Avg Rating &amp; ADR
      </p>
      <ReactECharts option={option} style={{ height: '220px' }} opts={{ renderer: 'svg' }} />
    </div>
  )
}
