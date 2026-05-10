import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bot, TrendingDown, Users, ArrowRight, Zap } from 'lucide-react'
import { KPICard } from '@/components/kpi/KPICard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { mockKPISnapshots, mockSegments, mockCustomers } from '@/lib/mockData'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const DATE_RANGES = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Year to date', value: 'ytd' },
]

const AGENT_INSIGHTS = [
  {
    id: '1',
    summary: 'Churn rate increased 0.8% in the At Risk segment vs last month',
    action: 'View At Risk segment',
    severity: 'high',
    time: '2h ago',
  },
  {
    id: '2',
    summary: 'Champions segment drove 42% of total revenue in the last 30 days',
    action: 'View Champions',
    severity: 'info',
    time: '5h ago',
  },
  {
    id: '3',
    summary: '11 high-value customers haven\'t purchased in 60+ days — CLV at risk: $35,200',
    action: 'Start win-back campaign',
    severity: 'critical',
    time: '1d ago',
  },
  {
    id: '4',
    summary: 'Mobile-first customers have 18% lower churn than web-only users',
    action: 'View mobile segment',
    severity: 'info',
    time: '2d ago',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState('30d')

  const latest = mockKPISnapshots[mockKPISnapshots.length - 1]
  const previous = mockKPISnapshots[mockKPISnapshots.length - 2]

  const sparkData = (key: keyof typeof latest) =>
    mockKPISnapshots.slice(-8).map((s) => ({ value: Number(s[key]) }))

  const pct = (a: number, b: number) => b > 0 ? ((a - b) / b) * 100 : 0

  const highChurnSegments = mockSegments
    .filter((s) => s.churnRate > 0.3)
    .sort((a, b) => b.churnRate - a.churnRate)
    .slice(0, 3)

  const topChurnCustomers = mockCustomers
    .filter((c) => c.churnScore >= 0.7)
    .sort((a, b) => b.churnScore - a.churnScore)
    .slice(0, 5)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Intelligence Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time overview of your customer health and KPIs</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-gray-300 text-sm h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-gray-300 text-sm">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => navigate('/agent')}
            className="bg-indigo-600 hover:bg-indigo-700 h-8 text-sm gap-2"
          >
            <Bot className="w-4 h-4" />
            Ask Agent
          </Button>
        </div>
      </div>

      {/* Churn Alert Banner */}
      {highChurnSegments.length > 0 && (
        <div className="flex items-center gap-3 bg-red-950/30 border border-red-800/50 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-300 font-medium">
              {highChurnSegments.length} segment{highChurnSegments.length > 1 ? 's' : ''} have elevated churn risk
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              {highChurnSegments.map((s) => `${s.name} (${(s.churnRate * 100).toFixed(0)}%)`).join(' · ')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 text-xs flex-shrink-0"
            onClick={() => navigate('/predictions')}
          >
            View predictions <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Customers"
          value={latest.totalCustomers}
          format="number"
          changePct={pct(latest.totalCustomers, previous.totalCustomers)}
          sparkData={sparkData('totalCustomers')}
          subtitle={`${latest.activeCustomers30d.toLocaleString()} active (30d)`}
        />
        <KPICard
          title="MoM Growth"
          value={latest.momGrowthRate}
          format="percent"
          changePct={pct(latest.momGrowthRate, previous.momGrowthRate)}
          sparkData={sparkData('momGrowthRate')}
        />
        <KPICard
          title="Churn Rate"
          value={latest.churnRate}
          format="percent"
          changePct={pct(latest.churnRate, previous.churnRate)}
          sparkData={sparkData('churnRate')}
          invertChange
          subtitle={`${latest.churnedCustomers} churned`}
        />
        <KPICard
          title="Avg CLV"
          value={latest.avgCLV}
          format="currency"
          changePct={pct(latest.avgCLV, previous.avgCLV)}
          sparkData={sparkData('avgCLV')}
        />
        <KPICard
          title="Monthly Revenue"
          value={latest.totalRevenue}
          format="currency"
          changePct={pct(latest.totalRevenue, previous.totalRevenue)}
          sparkData={sparkData('totalRevenue')}
        />
        <KPICard
          title="Win-back Rate"
          value={latest.winBackRate}
          format="percent"
          changePct={pct(latest.winBackRate, previous.winBackRate)}
          sparkData={sparkData('winBackRate')}
        />
      </div>

      {/* Bottom row: Insights + Churn Watch + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights Feed */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-gray-200">Recent AI Insights</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-6" onClick={() => navigate('/agent')}>
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {AGENT_INSIGHTS.map((insight) => (
                <div key={insight.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-xl hover:bg-gray-800/80 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                    insight.severity === 'critical' ? 'bg-red-400' :
                    insight.severity === 'high' ? 'bg-orange-400' : 'bg-indigo-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">{insight.summary}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                        {insight.action} →
                      </button>
                      <span className="text-xs text-gray-600">{insight.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Actions + Churn Watch */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="bg-gray-900 border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start border-gray-700 text-gray-300 hover:border-indigo-600/50 text-sm h-9 gap-2"
                onClick={() => navigate('/agent')}
              >
                <Bot className="w-4 h-4 text-indigo-400" />
                Ask AI Agent
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-gray-700 text-gray-300 hover:border-indigo-600/50 text-sm h-9 gap-2"
                onClick={() => navigate('/predictions')}
              >
                <TrendingDown className="w-4 h-4 text-red-400" />
                View Churn List
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-gray-700 text-gray-300 hover:border-indigo-600/50 text-sm h-9 gap-2"
                onClick={() => navigate('/segments')}
              >
                <Users className="w-4 h-4 text-emerald-400" />
                Create Segment
              </Button>
            </div>
          </Card>

          {/* At-Risk Watch */}
          <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-200">Churn Watch</h2>
              <Badge className="text-xs bg-red-950/60 text-red-400 border border-red-800">
                {topChurnCustomers.length} critical
              </Badge>
            </div>
            <div className="space-y-2">
              {topChurnCustomers.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-gray-300 font-semibold">{c.name[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-300 truncate">{c.name}</p>
                      <p className="text-xs text-gray-600">${c.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="text-xs text-red-400 font-semibold">{(c.churnScore * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs text-gray-500 h-7"
              onClick={() => navigate('/predictions')}
            >
              View all at-risk customers
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
