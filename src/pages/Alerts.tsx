import React, { useState } from 'react'
import { Plus, Bell, BellOff, Trash2, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { mockAlerts, type MockAlert } from '@/lib/mockData'

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', icon: XCircle, className: 'bg-red-950/50 text-red-400 border-red-800' },
  high: { label: 'High', icon: AlertTriangle, className: 'bg-orange-950/50 text-orange-400 border-orange-800' },
  medium: { label: 'Medium', icon: Info, className: 'bg-yellow-950/50 text-yellow-400 border-yellow-800' },
  low: { label: 'Low', icon: CheckCircle, className: 'bg-emerald-950/50 text-emerald-400 border-emerald-800' },
}

const METRICS = [
  { value: 'churn_rate', label: 'Churn Rate' },
  { value: 'revenue', label: 'Monthly Revenue ($)' },
  { value: 'active_customers', label: 'Active Customers (30d)' },
  { value: 'new_customers', label: 'New Customers' },
  { value: 'avg_clv', label: 'Average CLV ($)' },
  { value: 'win_back_rate', label: 'Win-back Rate' },
]

const ALERT_HISTORY = [
  { alertName: 'High Churn Rate Alert', triggeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), value: 0.032, threshold: 0.030, severity: 'critical' },
  { alertName: 'New Customer Growth', triggeredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), value: 47, threshold: 50, severity: 'medium' },
  { alertName: 'High Churn Rate Alert', triggeredAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), value: 0.031, threshold: 0.030, severity: 'critical' },
]

interface CreateAlertForm {
  name: string
  metric: string
  operator: string
  threshold: string
  severity: string
  emailTarget: string
  webhookUrl: string
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<MockAlert[]>(mockAlerts)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateAlertForm>({
    name: '', metric: 'churn_rate', operator: 'gt', threshold: '',
    severity: 'medium', emailTarget: '', webhookUrl: '',
  })

  const toggleAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, isActive: !a.isActive } : a))
  }

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const createAlert = () => {
    if (!form.name || !form.threshold) return
    const newAlert: MockAlert = {
      id: `alert-${Date.now()}`,
      name: form.name,
      metric: form.metric,
      operator: form.operator,
      threshold: parseFloat(form.threshold),
      severity: form.severity,
      isActive: true,
      triggeredCount: 0,
      lastValue: 0,
    }
    setAlerts((prev) => [...prev, newAlert])
    setShowCreate(false)
    setForm({ name: '', metric: 'churn_rate', operator: 'gt', threshold: '', severity: 'medium', emailTarget: '', webhookUrl: '' })
  }

  const formatMetricValue = (alert: MockAlert) => {
    if (alert.metric === 'churn_rate' || alert.metric === 'win_back_rate') {
      return `${(alert.lastValue * 100).toFixed(1)}%`
    }
    return alert.lastValue.toLocaleString()
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor KPIs and get notified when thresholds are crossed</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 text-sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Create Alert
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Alerts', value: alerts.length },
          { label: 'Active', value: alerts.filter((a) => a.isActive).length },
          { label: 'Triggered Today', value: alerts.filter((a) => a.lastTriggeredAt && new Date(a.lastTriggeredAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length },
          { label: 'Critical', value: alerts.filter((a) => a.severity === 'critical' && a.isActive).length },
        ].map((s) => (
          <Card key={s.label} className="bg-gray-900 border-gray-800 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Configured Alerts</h2>
        {alerts.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG]
          const SeverityIcon = config.icon
          return (
            <Card key={alert.id} className={`bg-gray-900 border-gray-800 p-4 ${!alert.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg border flex-shrink-0 ${config.className}`}>
                  <SeverityIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-200">{alert.name}</h3>
                    <Badge className={`text-xs border ${config.className}`}>{config.label}</Badge>
                    {!alert.isActive && <Badge className="text-xs bg-gray-800 text-gray-500 border border-gray-700">Paused</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {METRICS.find((m) => m.value === alert.metric)?.label ?? alert.metric}
                    {' '}{alert.operator === 'gt' ? '>' : alert.operator === 'lt' ? '<' : alert.operator === 'gte' ? '≥' : '≤'}{' '}
                    {alert.metric.includes('rate') ? `${(alert.threshold * 100).toFixed(1)}%` : alert.threshold.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-600">
                    <span>Triggered {alert.triggeredCount}x total</span>
                    {alert.lastTriggeredAt && (
                      <span>Last: {new Date(alert.lastTriggeredAt).toLocaleDateString()}</span>
                    )}
                    <span>Current value: {formatMetricValue(alert)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={alert.isActive}
                    onCheckedChange={() => toggleAlert(alert.id)}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-gray-600 hover:text-red-400" onClick={() => deleteAlert(alert.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Alert History */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Alert History</h2>
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-600 uppercase">
                <th className="text-left px-4 py-3">Alert</th>
                <th className="text-left px-4 py-3">Triggered At</th>
                <th className="text-right px-4 py-3">Value</th>
                <th className="text-right px-4 py-3">Threshold</th>
                <th className="text-left px-4 py-3">Severity</th>
              </tr>
            </thead>
            <tbody>
              {ALERT_HISTORY.map((entry, i) => {
                const config = SEVERITY_CONFIG[entry.severity as keyof typeof SEVERITY_CONFIG]
                return (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-300">{entry.alertName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{entry.triggeredAt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm text-red-400 font-semibold">
                      {typeof entry.value === 'number' && entry.value < 1 ? `${(entry.value * 100).toFixed(1)}%` : entry.value}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {typeof entry.threshold === 'number' && entry.threshold < 1 ? `${(entry.threshold * 100).toFixed(1)}%` : entry.threshold}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs border ${config.className}`}>{config.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Create Alert Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-400 mb-1.5 block">Alert Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. High Churn Rate Alert"
                className="bg-gray-800 border-gray-700 text-gray-100 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-400 mb-1.5 block">Metric</Label>
                <Select value={form.metric} onValueChange={(v) => setForm((f) => ({ ...f, metric: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {METRICS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-gray-300 text-sm">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-400 mb-1.5 block">Operator</Label>
                <Select value={form.operator} onValueChange={(v) => setForm((f) => ({ ...f, operator: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="gt" className="text-gray-300 text-sm">Greater than (&gt;)</SelectItem>
                    <SelectItem value="gte" className="text-gray-300 text-sm">Greater than or equal (≥)</SelectItem>
                    <SelectItem value="lt" className="text-gray-300 text-sm">Less than (&lt;)</SelectItem>
                    <SelectItem value="lte" className="text-gray-300 text-sm">Less than or equal (≤)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-400 mb-1.5 block">Threshold Value</Label>
                <Input
                  type="number"
                  value={form.threshold}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                  placeholder={form.metric.includes('rate') ? '0.03 (= 3%)' : '50000'}
                  className="bg-gray-800 border-gray-700 text-gray-100 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400 mb-1.5 block">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-gray-300 text-sm">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1.5 block">Notification Email</Label>
              <Input
                type="email"
                value={form.emailTarget}
                onChange={(e) => setForm((f) => ({ ...f, emailTarget: e.target.value }))}
                placeholder="alerts@yourcompany.com"
                className="bg-gray-800 border-gray-700 text-gray-100 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1.5 block">Webhook URL (optional)</Label>
              <Input
                value={form.webhookUrl}
                onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                placeholder="https://hooks.slack.com/..."
                className="bg-gray-800 border-gray-700 text-gray-100 text-sm"
              />
            </div>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={createAlert}
              disabled={!form.name || !form.threshold}
            >
              Create Alert
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
