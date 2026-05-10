import React, { useState } from 'react'
import { Plus, Sparkles, Users, TrendingDown, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SegmentBuilder } from '@/components/segments/SegmentBuilder'
import { mockSegments, type MockSegment } from '@/lib/mockData'
import { mockKPISnapshots } from '@/lib/mockData'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'

const SEGMENT_COLORS = ['#6366f1', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#3b82f6', '#ec4899', '#0891b2']

// Simple SVG Venn diagram (2-circle overlap)
function VennDiagram({ segments }: { segments: MockSegment[] }) {
  const top3 = segments.slice(0, 3)
  return (
    <svg viewBox="0 0 300 200" className="w-full h-40">
      {/* Circle 1 */}
      {top3[0] && (
        <circle cx="105" cy="100" r="70" fill={top3[0].color} fillOpacity={0.2} stroke={top3[0].color} strokeOpacity={0.5} strokeWidth="1.5" />
      )}
      {/* Circle 2 */}
      {top3[1] && (
        <circle cx="155" cy="100" r="70" fill={top3[1].color} fillOpacity={0.2} stroke={top3[1].color} strokeOpacity={0.5} strokeWidth="1.5" />
      )}
      {/* Circle 3 */}
      {top3[2] && (
        <circle cx="200" cy="80" r="55" fill={top3[2].color} fillOpacity={0.2} stroke={top3[2].color} strokeOpacity={0.5} strokeWidth="1.5" />
      )}
      {/* Labels */}
      {top3.map((s, i) => {
        const positions = [{ x: 78, y: 100 }, { x: 182, y: 100 }, { x: 200, y: 80 }]
        const pos = positions[i]
        return (
          <text key={s.id} x={pos.x} y={pos.y} textAnchor="middle" fill={s.color} fontSize="9" fontWeight="600">
            {s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name}
          </text>
        )
      })}
    </svg>
  )
}

export default function Segments() {
  const [segments, setSegments] = useState<MockSegment[]>(mockSegments)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingSegment, setEditingSegment] = useState<MockSegment | null>(null)
  const [generatingAI, setGeneratingAI] = useState(false)

  const handleCreateSegment = (name: string) => {
    const newSeg: MockSegment = {
      id: `seg-${Date.now()}`,
      name,
      description: 'User-defined segment',
      segmentType: 'manual',
      memberCount: Math.floor(Math.random() * 30 + 5),
      avgCLV: Math.floor(Math.random() * 2000 + 200),
      churnRate: Math.random() * 0.5,
      color: SEGMENT_COLORS[segments.length % SEGMENT_COLORS.length],
    }
    setSegments((prev) => [...prev, newSeg])
    setShowBuilder(false)
  }

  const handleGenerateAI = async () => {
    setGeneratingAI(true)
    await new Promise((r) => setTimeout(r, 2500))
    const aiSegments: MockSegment[] = [
      {
        id: `ai-seg-${Date.now()}-1`,
        name: 'High-Value Multi-Channel',
        description: 'AI-identified: high CLV customers using 3+ channels',
        segmentType: 'ai_generated',
        memberCount: 14,
        avgCLV: 3240,
        churnRate: 0.08,
        color: '#6366f1',
      },
      {
        id: `ai-seg-${Date.now()}-2`,
        name: 'Price-Sensitive Occasional',
        description: 'AI-identified: low AOV, infrequent buyers, discount-responsive',
        segmentType: 'ai_generated',
        memberCount: 22,
        avgCLV: 380,
        churnRate: 0.45,
        color: '#f59e0b',
      },
    ]
    setSegments((prev) => [...prev, ...aiSegments])
    setGeneratingAI(false)
  }

  const handleDelete = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id))
  }

  const chartData = segments.map((s) => ({
    name: s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
    avgCLV: s.avgCLV,
    churnRate: (s.churnRate * 100).toFixed(1),
    members: s.memberCount,
    color: s.color,
  }))

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Segments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{segments.length} segments · {segments.reduce((s, seg) => s + seg.memberCount, 0)} total memberships</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 gap-2 text-sm"
            onClick={handleGenerateAI}
            disabled={generatingAI}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            {generatingAI ? 'Generating…' : 'Generate AI Segments'}
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 text-sm" onClick={() => setShowBuilder(true)}>
            <Plus className="w-4 h-4" />
            New Segment
          </Button>
        </div>
      </div>

      {/* Segment Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {segments.map((seg) => (
          <Card key={seg.id} className="bg-gray-900 border-gray-800 p-4 hover:border-gray-700 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                <h3 className="text-sm font-semibold text-gray-200 leading-tight">{seg.name}</h3>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="w-6 h-6 text-gray-600 hover:text-gray-300" onClick={() => setEditingSegment(seg)}>
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="w-6 h-6 text-gray-600 hover:text-red-400" onClick={() => handleDelete(seg.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Badge className="text-xs bg-gray-800 text-gray-400 border border-gray-700 font-normal">
                {seg.segmentType.replace('_', ' ')}
              </Badge>
            </div>

            {seg.description && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{seg.description}</p>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-gray-300">
                  <Users className="w-3 h-3 text-gray-600" />
                  <span className="text-sm font-semibold">{seg.memberCount}</span>
                </div>
                <p className="text-xs text-gray-600">Members</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-400">${seg.avgCLV.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Avg CLV</p>
              </div>
              <div>
                <p className={`text-sm font-semibold ${seg.churnRate > 0.4 ? 'text-red-400' : seg.churnRate > 0.2 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {(seg.churnRate * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-600">Churn</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-800">
              <div className="h-1 bg-gray-800 rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(seg.churnRate * 100).toFixed(0)}%`, background: seg.color }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CLV by Segment */}
        <Card className="bg-gray-900 border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Average CLV by Segment</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20 }}>
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} width={96} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '11px', color: '#e5e7eb' }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Avg CLV']}
                />
                <Bar dataKey="avgCLV" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Segment Overlap Venn */}
        <Card className="bg-gray-900 border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-2">Segment Overlap</h2>
          <p className="text-xs text-gray-600 mb-2">Top 3 segments by member count</p>
          <VennDiagram segments={[...segments].sort((a, b) => b.memberCount - a.memberCount)} />
          <div className="flex flex-wrap gap-2 mt-2">
            {segments.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Create Segment Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Segment</DialogTitle>
          </DialogHeader>
          <SegmentBuilder onSave={(name) => handleCreateSegment(name)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
