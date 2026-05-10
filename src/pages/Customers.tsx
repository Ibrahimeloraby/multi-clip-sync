import React, { useState, useMemo } from 'react'
import { Search, Filter, Download, X, Globe, Smartphone, Mail, Store, Phone, ChevronRight, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChurnRiskBadge } from '@/components/predictions/ChurnRiskBadge'
import { CustomerTimeline } from '@/components/customers/CustomerTimeline'
import { mockCustomers, mockEvents, mockSegments, type MockCustomer } from '@/lib/mockData'
import type { ChurnRiskLevel } from '@/lib/ml/churn'
import { cn } from '@/lib/utils'

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  web: Globe,
  mobile: Smartphone,
  email: Mail,
  in_store: Store,
  call_center: Phone,
}

const PAGE_SIZE = 20

function getChurnRisk(score: number): ChurnRiskLevel {
  if (score >= 0.8) return 'critical'
  if (score >= 0.6) return 'high'
  if (score >= 0.35) return 'medium'
  return 'low'
}

function downloadCSV(customers: MockCustomer[]) {
  const headers = ['Name', 'Email', 'Country', 'Total Revenue', 'Transactions', 'Churn Score', 'CLV', 'RFM Segment', 'Last Seen']
  const rows = customers.map((c) => [
    c.name, c.email, c.country, c.totalRevenue, c.transactionCount,
    c.churnScore, c.clvScore, c.rfmSegment, new Date(c.lastSeenAt).toLocaleDateString()
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'customers.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function Customers() {
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState<MockCustomer | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return mockCustomers.filter((c) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
      const matchSegment = segmentFilter === 'all' || c.rfmSegment === segmentFilter
      const matchRisk = riskFilter === 'all' || getChurnRisk(c.churnScore) === riskFilter
      const matchChannel = channelFilter === 'all' || c.channel === channelFilter
      return matchSearch && matchSegment && matchRisk && matchChannel
    })
  }, [search, segmentFilter, riskFilter, channelFilter])

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const customerEvents = selectedCustomer ? mockEvents.filter((e) => e.customerId === selectedCustomer.id) : []
  const customerSegments = selectedCustomer
    ? mockSegments.filter((s) => s.memberIds?.includes(selectedCustomer.id))
    : []

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{mockCustomers.length.toLocaleString()} total customers</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 text-xs gap-1.5">
              <Users className="w-3.5 h-3.5" /> Add {selected.size} to segment
            </Button>
          )}
          <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 text-xs gap-1.5" onClick={() => downloadCSV(filtered)}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by name or email..."
            className="pl-9 bg-gray-800 border-gray-700 text-gray-200 text-sm h-8 placeholder:text-gray-600"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setPage(0) }}>
          <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-gray-300 text-xs h-8">
            <Filter className="w-3 h-3 mr-1.5 text-gray-500" />
            <SelectValue placeholder="Churn Risk" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all" className="text-gray-300 text-xs">All Risk Levels</SelectItem>
            <SelectItem value="critical" className="text-red-400 text-xs">Critical</SelectItem>
            <SelectItem value="high" className="text-orange-400 text-xs">High</SelectItem>
            <SelectItem value="medium" className="text-yellow-400 text-xs">Medium</SelectItem>
            <SelectItem value="low" className="text-emerald-400 text-xs">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setPage(0) }}>
          <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-gray-300 text-xs h-8">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all" className="text-gray-300 text-xs">All Channels</SelectItem>
            {['web', 'mobile', 'email', 'in_store', 'call_center'].map((ch) => (
              <SelectItem key={ch} value={ch} className="text-gray-300 text-xs">{ch.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || segmentFilter !== 'all' || riskFilter !== 'all' || channelFilter !== 'all') && (
          <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-8" onClick={() => {
            setSearch(''); setSegmentFilter('all'); setRiskFilter('all'); setChannelFilter('all'); setPage(0)
          }}>
            Clear filters
          </Button>
        )}

        <span className="text-xs text-gray-600 ml-auto">{filtered.length} customers</span>
      </div>

      {/* Table */}
      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    className="rounded border-gray-600 bg-gray-800 text-indigo-500"
                    checked={selected.size === paginated.length && paginated.length > 0}
                    onChange={() => {
                      if (selected.size === paginated.length) setSelected(new Set())
                      else setSelected(new Set(paginated.map((c) => c.id)))
                    }}
                  />
                </th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Channel</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Revenue</th>
                <th className="text-right px-4 py-3 hidden lg:table-cell">CLV</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">RFM Segment</th>
                <th className="text-left px-4 py-3">Churn Risk</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Last Seen</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((customer) => {
                const ChannelIcon = CHANNEL_ICONS[customer.channel] ?? Globe
                const risk = getChurnRisk(customer.churnScore)
                const daysDiff = customer.daysSinceLastEvent

                return (
                  <tr
                    key={customer.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer group transition-colors"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-600 bg-gray-800 text-indigo-500"
                        checked={selected.has(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-white">{customer.name[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">{customer.name}</p>
                          <p className="text-xs text-gray-600 truncate">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <ChannelIcon className="w-3.5 h-3.5" />
                        <span className="capitalize">{customer.channel.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-sm text-gray-200">${customer.totalRevenue.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="text-sm text-gray-400">${customer.clvScore.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Badge className="text-xs bg-gray-800 text-gray-400 border border-gray-700 font-normal">
                        {customer.rfmSegment}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <ChurnRiskBadge level={risk} score={customer.churnScore} size="sm" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn('text-xs', daysDiff > 90 ? 'text-red-400' : daysDiff > 30 ? 'text-orange-400' : 'text-gray-500')}>
                        {daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Yesterday' : `${daysDiff}d ago`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
          <span className="text-xs text-gray-600">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Customer 360 Sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent className="bg-gray-900 border-gray-800 text-gray-100 w-full sm:max-w-xl overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-white">Customer 360</SheetTitle>
              </SheetHeader>
              <div className="space-y-5">
                {/* Profile header */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-white">{selectedCustomer.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white">{selectedCustomer.name}</h3>
                    <p className="text-sm text-gray-400">{selectedCustomer.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className="text-xs bg-gray-800 text-gray-400 border border-gray-700">{selectedCustomer.city}, {selectedCustomer.country}</Badge>
                      <ChurnRiskBadge level={getChurnRisk(selectedCustomer.churnScore)} score={selectedCustomer.churnScore} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Churn Score', value: `${(selectedCustomer.churnScore * 100).toFixed(0)}%`, color: selectedCustomer.churnScore > 0.6 ? 'text-red-400' : 'text-emerald-400' },
                    { label: 'Pred. CLV', value: `$${selectedCustomer.clvScore.toLocaleString()}`, color: 'text-indigo-400' },
                    { label: 'Revenue', value: `$${selectedCustomer.totalRevenue.toLocaleString()}`, color: 'text-gray-200' },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Churn score bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
                    <span>Churn Risk</span>
                    <span>{(selectedCustomer.churnScore * 100).toFixed(0)}%</span>
                  </div>
                  <Progress
                    value={selectedCustomer.churnScore * 100}
                    className="h-2 bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-red-500"
                  />
                </div>

                {/* RFM */}
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-2">RFM Profile</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <div className="text-xl font-bold text-indigo-400">{selectedCustomer.rfmRecency}</div>
                      <div className="text-xs text-gray-600">Recency</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-indigo-400">{selectedCustomer.rfmFrequency}</div>
                      <div className="text-xs text-gray-600">Frequency</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-indigo-400">{selectedCustomer.rfmMonetary}</div>
                      <div className="text-xs text-gray-600">Monetary</div>
                    </div>
                    <div className="text-center">
                      <Badge className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-800">{selectedCustomer.rfmSegment}</Badge>
                    </div>
                  </div>
                </div>

                {/* Segments */}
                {customerSegments.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Segment Memberships</p>
                    <div className="flex gap-2 flex-wrap">
                      {customerSegments.map((s) => (
                        <Badge key={s.id} className="text-xs" style={{ backgroundColor: `${s.color}20`, color: s.color, border: `1px solid ${s.color}50` }}>
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabs: Timeline / Details */}
                <Tabs defaultValue="timeline">
                  <TabsList className="bg-gray-800 border border-gray-700 h-8">
                    <TabsTrigger value="timeline" className="text-xs h-6">Event Timeline ({customerEvents.length})</TabsTrigger>
                    <TabsTrigger value="details" className="text-xs h-6">Details</TabsTrigger>
                  </TabsList>
                  <TabsContent value="timeline" className="mt-3">
                    <CustomerTimeline events={customerEvents} pageSize={15} />
                  </TabsContent>
                  <TabsContent value="details" className="mt-3 space-y-2">
                    {[
                      ['First seen', new Date(selectedCustomer.firstSeenAt).toLocaleDateString()],
                      ['Last seen', new Date(selectedCustomer.lastSeenAt).toLocaleDateString()],
                      ['Primary channel', selectedCustomer.channel.replace('_', ' ')],
                      ['Total transactions', selectedCustomer.transactionCount],
                      ['Avg order value', `$${(selectedCustomer.totalRevenue / selectedCustomer.transactionCount).toFixed(2)}`],
                      ['Industry', String(selectedCustomer.attributes.industry ?? 'N/A')],
                      ['Tier', String(selectedCustomer.attributes.tier ?? 'N/A')],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="flex justify-between text-sm py-1 border-b border-gray-800">
                        <span className="text-gray-500">{k}</span>
                        <span className="text-gray-300 capitalize">{String(v)}</span>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
