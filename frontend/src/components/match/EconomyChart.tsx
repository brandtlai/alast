import ReactECharts from 'echarts-for-react'
import type { EconomyRound } from '../../types'

interface Props {
  rounds: EconomyRound[]
  teamAName: string
  teamBName: string
}

export default function EconomyChart({ rounds, teamAName, teamBName }: Props) {
  if (rounds.length === 0) {
    return (
      <div className="rounded-md border py-8 text-center text-xs text-white/30"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        经济数据待导入
      </div>
    )
  }

  const labels = rounds.map(r => String(r.round_number))

  const markAreaData = rounds.map(r => [
    {
      xAxis: String(r.round_number),
      itemStyle: {
        color: r.winner_side === 3
          ? 'rgba(0,209,255,0.05)'
          : r.winner_side === 2
            ? 'rgba(255,215,0,0.05)'
            : 'rgba(255,255,255,0.02)',
      },
    },
    { xAxis: String(r.round_number) },
  ])

  const axisStyle = {
    axisLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
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
        const r = rounds[params[0]?.dataIndex]
        if (!r) return ''
        return `<b>Round ${r.round_number}</b><br>${params.map(p => `${p.seriesName}: $${p.value?.toLocaleString()}`).join('<br>')}`
      }
    },
    legend: {
      data: [teamAName, teamBName],
      textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
      top: 4,
    },
    grid: [
      { left: 55, right: 12, top: 36, bottom: '40%' },
      { left: 55, right: 12, top: '65%', bottom: 28 },
    ],
    xAxis: [
      { gridIndex: 0, type: 'category', data: labels, ...axisStyle },
      { gridIndex: 1, type: 'category', data: labels, show: false },
    ],
    yAxis: [
      {
        gridIndex: 0, type: 'value', ...axisStyle,
        axisLabel: {
          ...axisStyle.axisLabel,
          formatter: (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
        },
      },
      {
        gridIndex: 1, type: 'value', ...axisStyle,
        axisLabel: {
          ...axisStyle.axisLabel,
          formatter: (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
        },
      },
    ],
    series: [
      {
        name: teamAName,
        type: 'line',
        xAxisIndex: 0, yAxisIndex: 0,
        data: rounds.map(r => r.team_a_equipment_value ?? 0),
        lineStyle: { color: '#FF8A00', width: 2 },
        itemStyle: { color: '#FF8A00' },
        smooth: true,
        symbol: 'none',
        markArea: { silent: true, data: markAreaData },
      },
      {
        name: teamBName,
        type: 'line',
        xAxisIndex: 0, yAxisIndex: 0,
        data: rounds.map(r => r.team_b_equipment_value ?? 0),
        lineStyle: { color: '#00D1FF', width: 2 },
        itemStyle: { color: '#00D1FF' },
        smooth: true,
        symbol: 'none',
      },
      {
        name: teamAName + ' 花费',
        type: 'bar',
        xAxisIndex: 1, yAxisIndex: 1,
        data: rounds.map(r => r.team_a_money_spent ?? 0),
        itemStyle: { color: 'rgba(255,138,0,0.7)' },
        barMaxWidth: 10,
        stack: 'money',
      },
      {
        name: teamBName + ' 花费',
        type: 'bar',
        xAxisIndex: 1, yAxisIndex: 1,
        data: rounds.map(r => r.team_b_money_spent ?? 0),
        itemStyle: { color: 'rgba(0,209,255,0.7)' },
        barMaxWidth: 10,
        stack: 'money',
      },
    ],
  }

  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-4 pt-4 mb-1">Economy</p>
      <ReactECharts option={option} style={{ height: '280px' }} opts={{ renderer: 'svg' }} />
    </div>
  )
}
