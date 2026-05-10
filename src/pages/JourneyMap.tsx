import React, { useState } from 'react'
import { BarChart2, TrendingDown, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sankey, Tooltip, ResponsiveContainer, Rectangle } from 'recharts'
import { mockJourneyNodes, mockJourneyLinks, mockTopPaths } from '@/lib/mockData'

const CHANNELS = ['all', 'web', 'mobile', 'email', 'in_store', 'call_center']
const TIME_RANGES = [
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'Last 180 days', value: '180' },
]

const DROP_OFFS = [
  { step: 'Homepage → Abandonment', rate: 0.276, count: 1580 },
  { step: 'Add to Cart → Abandonment', rate: 0.427, count: 820 },
  { step: 'Checkout → Abandonment', rate: 0.291, count: 320 },
  { step: 'Product View → Abandonment', rate: 0.275, count: 1150 },
]

const NODE_COLORS = [
  '#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4',
  '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#84cc16',
]

// Custom Sankey node renderer
function CustomSankeyNode({ x, y, width, height, index, payload }: {
  x: number; y: number; width: number; height: number; index: number; payload: { name: string; value: number }
}) {
  return (
    <g>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={NODE_COLORS[index % NODE_COLORS.length]}
        fillOpacity={0.85}
        radius={3}
      />
      <text
        x={x + width + 6}
        y={y + height / 2}
        fill="#d1d5db"
        fontSize={10}
        fontFamily="sans-serif"
        textAnchor="start"
        dominantBaseline="middle"
      >
        {payload.name}
      </text>
      <text
        x={x + width + 6}
        y={y + height / 2 + 12}
        fill="#6b7280"
        fontSize={9}
        fontFamily="sans-serif"
        textAnchor="start"
        dominantBaseline="middle"
      >
        {payload.value?.toLocaleString()}
      </text>
    </g>
  )
}

export default function JourneyMap() {
  const [channel, setChannel] = useState('all')
  const [timeRange, setTimeRange] = useState('90')

  const sankeyData = {
    nodes: mockJourneyNodes.map((n) => ({ ...n })),
    links: mockJourneyLinks.map((l) => ({ ...l })),
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Journey Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visualize how customers move through your touchpoints</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-gray-300 text-sm h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {CHANNELS.map((ch) => (
                <SelectItem key={ch} value={ch} className="text-gray-300 text-sm capitalize">
                  {ch === 'all' ? 'All Channels' : ch.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-gray-300 text-sm h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {TIME_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-gray-300 text-sm">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Visitors', value: '5,420', change: '+12%' },
          { label: 'Conversion Rate', value: '14.4%', change: '+1.2pp' },
          { label: 'Avg Session Depth', value: '3.2 steps', change: '-0.3' },
          { label: 'Cart Abandonment', value: '42.7%', change: '-2.1pp' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-gray-900 border-gray-800 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
            <p className="text-xl font-bold text-white mt-1">{stat.value}</p>
            <p className="text-xs text-indigo-400 mt-0.5">{stat.change} vs prev period</p>
          </Card>
        ))}
      </div>

      {/* Sankey Chart */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-200">Customer Flow Visualization</h2>
          <Badge className="text-xs bg-gray-800 text-gray-400 border border-gray-700">
            {channel === 'all' ? 'All channels' : channel.replace('_', ' ')} · Last {timeRange}d
          </Badge>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              nodeWidth={10}
              nodePadding={24}
              margin={{ top: 10, right: 160, bottom: 10, left: 10 }}
              node={<CustomSankeyNode x={0} y={0} width={10} height={10} index={0} payload={{ name: '', value: 0 }} />}
              link={{ stroke: '#4f46e5', strokeOpacity: 0.3, fill: 'none' }}
            >
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px', color: '#e5e7eb' }}
                formatter={(value: number, name: string) => [value.toLocaleString(), name]}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Bottom: Top paths + Drop-offs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top paths */}
        <Card className="bg-gray-900 border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Top Customer Paths</h2>
          <div className="space-y-3">
            {mockTopPaths.map((path, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    {path.path.split(' → ').map((step, i, arr) => (
                      <React.Fragment key={i}>
                        <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-300">{step}</span>
                        {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(path.count / mockTopPaths[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-20 text-right">
                    {path.count.toLocaleString()} ({(path.conversionRate * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Drop-off Analysis */}
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-gray-200">Drop-off Analysis</h2>
          </div>
          <div className="space-y-4">
            {DROP_OFFS.sort((a, b) => b.rate - a.rate).map((dropoff) => (
              <div key={dropoff.step}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-400">{dropoff.step}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-semibold">{(dropoff.rate * 100).toFixed(0)}% drop</span>
                    <span className="text-gray-600">{dropoff.count.toLocaleString()} users</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                    style={{ width: `${dropoff.rate * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-red-950/20 border border-red-800/40 rounded-xl">
            <p className="text-xs text-red-300 font-medium">Key Opportunity</p>
            <p className="text-xs text-gray-400 mt-1">
              Reducing Add to Cart abandonment by 10% would recover ~{Math.round(DROP_OFFS[1].count * 0.1).toLocaleString()} conversions per period.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
