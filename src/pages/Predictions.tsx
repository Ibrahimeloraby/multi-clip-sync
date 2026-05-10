import React, { useState } from 'react'
import { Download, TrendingDown, Calendar, DollarSign, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { ChurnRiskBadge } from '@/components/predictions/ChurnRiskBadge'
import { mockPredictions, mockCustomers } from '@/lib/mockData'
import type { ChurnRiskLevel } from '@/lib/ml/churn'

function downloadCSV() {
  const headers = ['Name', 'Email', 'Churn Risk', 'Churn Score', 'Churn Date', 'Pred CLV', 'Revenue at Risk', 'Action']
  const rows = mockPredictions.map((p) => [
    p.customerName, p.customerEmail, p.churnRisk, p.churnScore.toFixed(3),
    p.predictedChurnDate ? new Date(p.predictedChurnDate).toLocaleDateString() : '',
    p.predictedCLV, p.revenueAtRisk, p.recommendedAction,
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'churn_predictions.csv'; a.click()
  URL.revokeObjectURL(url)
}

const CLV_BUCKETS = [
  { range: '$0–$500', min: 0, max: 500 },
  { range: '$500–$1k', min: 500, max: 1000 },
  { range: '$1k–$2k', min: 1000, max: 2000 },
  { range: '$2k–$5k', min: 2000, max: 5000 },
  { range: '$5k+', min: 5000, max: Infinity },
]

export default function Predictions() {
  const [riskFilter, setRiskFilter] = useState('all')

  const filtered = mockPredictions.filter((p) =>
    riskFilter === 'all' || p.churnRisk === riskFilter
  )

  const clvData = CLV_BUCKETS.map((bucket) => ({
    range: bucket.range,
    count: mockCustomers.filter((c) => c.clvScore >= bucket.min && c.clvScore < bucket.max).length,
  }))

  const totalRevenueAtRisk = filtered.reduce((s, p) => s + p.revenueAtRisk, 0)
  const criticalCount = filtered.filter((p) => p.churnRisk === 'critical').length
  const highCount = filtered.filter((p) => p.churnRisk === 'high').length

  const winBackCandidates = mockPredictions
    .filter((p) => p.churnScore >= 0.5 && p.revenueAtRisk >= 500)
    .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)
    .slice(0, 8)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Predictions</h1>
          <p className="text-sm text-gray-500 mt-0.5">ML-powered churn predictions and win-back opportunities</p>
        </div>
        <Button variant="outline" className="border-gray-700 text-gray-300 gap-2 text-sm" onClick={downloadCSV}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue at Risk', value: `$${totalRevenueAtRisk.toLocaleString()}`, icon: DollarSign, color: 'text-red-400', bg: 'bg-red-950/30 border-red-800/40' },
          { label: 'Critical Risk', value: criticalCount.toString(), icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-950/30 border-red-800/40' },
          { label: 'High Risk', value: highCount.toString(), icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-950/30 border-orange-800/40' },
          { label: 'Win-back Candidates', value: winBackCandidates.length.toString(), icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-950/30 border-indigo-800/40' },
        ].map((stat) => (
          <Card key={stat.label} className={`border p-4 ${stat.bg} bg-opacity-50`}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Churn Risk List */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900 border-gray-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-200">Churn Risk List</h2>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-gray-300 text-xs h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-gray-300 text-xs">All Risk Levels</SelectItem>
                  <SelectItem value="critical" className="text-red-400 text-xs">Critical</SelectItem>
                  <SelectItem value="high" className="text-orange-400 text-xs">High</SelectItem>
                  <SelectItem value="medium" className="text-yellow-400 text-xs">Medium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="divide-y divide-gray-800">
              {filtered.map((pred) => (
                <div key={pred.customerId} className="flex items-start gap-4 p-4 hover:bg-gray-800/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-white">{pred.customerName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-200">{pred.customerName}</p>
                      <ChurnRiskBadge level={pred.churnRisk as ChurnRiskLevel} score={pred.churnScore} size="sm" />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{pred.customerEmail}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                      {pred.predictedChurnDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Churn by {new Date(pred.predictedChurnDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${pred.revenueAtRisk.toLocaleString()} at risk
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge
                      className={`text-xs border font-normal ${
                        pred.urgency === 'immediate' ? 'bg-red-950/50 text-red-400 border-red-800' :
                        pred.urgency === 'this_week' ? 'bg-orange-950/50 text-orange-400 border-orange-800' :
                        'bg-gray-800 text-gray-400 border-gray-700'
                      }`}
                    >
                      {pred.urgency.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Side panels */}
        <div className="space-y-4">
          {/* CLV Distribution */}
          <Card className="bg-gray-900 border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">CLV Distribution</h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clvData} margin={{ left: -20 }}>
                  <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '11px', color: '#e5e7eb' }}
                    formatter={(v: number) => [v, 'Customers']}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {clvData.map((_, i) => (
                      <Cell key={i} fill={['#374151', '#4b5563', '#6366f1', '#8b5cf6', '#a78bfa'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Win-back Candidates */}
          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-gray-200">Win-back Candidates</h2>
            </div>
            <div className="space-y-2">
              {winBackCandidates.map((pred) => (
                <div key={pred.customerId} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-gray-300">{pred.customerName[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-300 truncate">{pred.customerName}</p>
                      <p className="text-xs text-gray-600">{pred.urgency.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold flex-shrink-0">
                    ${pred.revenueAtRisk.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-gray-500 h-7">
              Export win-back list
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
