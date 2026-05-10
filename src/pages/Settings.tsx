import React, { useState } from 'react'
import { Copy, Eye, EyeOff, Plus, Trash2, Shield, Database, Users, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'analyst' | 'member'
  joinedAt: string
}

const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Alex Chen', email: 'alex@acme.com', role: 'owner', joinedAt: '2024-01-15' },
  { id: '2', name: 'Maria Garcia', email: 'maria@acme.com', role: 'admin', joinedAt: '2024-02-01' },
  { id: '3', name: 'Sam Johnson', email: 'sam@acme.com', role: 'analyst', joinedAt: '2024-03-10' },
]

const INDUSTRIES = [
  'E-commerce', 'SaaS', 'Retail', 'Financial Services', 'Healthcare',
  'Media & Entertainment', 'Marketplace', 'Travel & Hospitality', 'Other',
]

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-indigo-950/50 text-indigo-400 border-indigo-800',
  admin: 'bg-blue-950/50 text-blue-400 border-blue-800',
  analyst: 'bg-emerald-950/50 text-emerald-400 border-emerald-800',
  member: 'bg-gray-800 text-gray-400 border-gray-700',
}

export default function Settings() {
  const [orgName, setOrgName] = useState('Acme Commerce Inc.')
  const [industry, setIndustry] = useState('E-commerce')
  const [members, setMembers] = useState<TeamMember[]>(TEAM_MEMBERS)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey] = useState('cjp_live_sk_xxxxxxxxxxxxxxxxxxxxxxxx')
  const [retentionDays, setRetentionDays] = useState('365')
  const [privacy, setPrivacy] = useState({
    gdprErasure: true,
    ccpaOptOut: true,
    piiMasking: false,
    anonymizeIP: true,
    cookieConsent: true,
  })
  const [notifications, setNotifications] = useState({
    weeklyDigest: true,
    churnAlerts: true,
    newSegments: false,
    apiUsage: true,
  })

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey)
    toast.success('API key copied to clipboard')
  }

  const inviteMember = () => {
    if (!newMemberEmail) return
    const newMember: TeamMember = {
      id: String(Date.now()),
      name: newMemberEmail.split('@')[0],
      email: newMemberEmail,
      role: 'member',
      joinedAt: new Date().toISOString().slice(0, 10),
    }
    setMembers((prev) => [...prev, newMember])
    setNewMemberEmail('')
    toast.success(`Invitation sent to ${newMemberEmail}`)
  }

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const changeRole = (id: string, role: TeamMember['role']) => {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role } : m))
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your organization, team, and platform preferences</p>
      </div>

      <Tabs defaultValue="org">
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="org" className="gap-1.5 text-sm data-[state=active]:bg-gray-700"><Database className="w-3.5 h-3.5" /> Organization</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 text-sm data-[state=active]:bg-gray-700"><Users className="w-3.5 h-3.5" /> Team</TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5 text-sm data-[state=active]:bg-gray-700"><Shield className="w-3.5 h-3.5" /> API Keys</TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1.5 text-sm data-[state=active]:bg-gray-700"><Shield className="w-3.5 h-3.5" /> Privacy</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-sm data-[state=active]:bg-gray-700"><Bell className="w-3.5 h-3.5" /> Notifications</TabsTrigger>
        </TabsList>

        {/* Organization */}
        <TabsContent value="org" className="mt-4">
          <Card className="bg-gray-900 border-gray-800 p-5 space-y-5">
            <div>
              <Label className="text-xs text-gray-400 mb-1.5 block">Organization Name</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="bg-gray-800 border-gray-700 text-gray-100 max-w-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1.5 block">Industry Vertical</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300 max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind} className="text-gray-300">{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator className="bg-gray-800" />
            <div>
              <Label className="text-xs text-gray-400 mb-1.5 block">Data Retention (days)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-gray-100 w-32"
                />
                <span className="text-xs text-gray-500">Customer events older than {retentionDays} days will be deleted.</span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-sm" onClick={() => toast.success('Settings saved')}>
                Save Changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team" className="mt-4 space-y-4">
          <Card className="bg-gray-900 border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">Team Members ({members.length})</h3>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-white">{member.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <Select
                    value={member.role}
                    disabled={member.role === 'owner'}
                    onValueChange={(v) => changeRole(member.id, v as TeamMember['role'])}
                  >
                    <SelectTrigger className="w-28 h-7 bg-gray-800 border-gray-700 text-gray-300 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {['owner', 'admin', 'analyst', 'member'].map((r) => (
                        <SelectItem key={r} value={r} className="text-gray-300 text-xs capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge className={`text-xs border ${ROLE_COLORS[member.role]}`}>{member.role}</Badge>
                  {member.role !== 'owner' && (
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-gray-600 hover:text-red-400" onClick={() => removeMember(member.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Separator className="bg-gray-800 my-4" />
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Invite by email..."
                className="bg-gray-800 border-gray-700 text-gray-100 text-sm flex-1"
              />
              <Button onClick={inviteMember} disabled={!newMemberEmail} className="bg-indigo-600 hover:bg-indigo-700 text-sm gap-1.5">
                <Plus className="w-4 h-4" /> Invite
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api" className="mt-4">
          <Card className="bg-gray-900 border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-200">Event Ingestion API Key</h3>
            <p className="text-xs text-gray-500">Use this key to send events from your application to the platform.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                <code className="text-xs text-emerald-400 font-mono flex-1 truncate">
                  {showApiKey ? apiKey : apiKey.slice(0, 12) + '•'.repeat(24)}
                </code>
                <button onClick={() => setShowApiKey(!showApiKey)} className="text-gray-600 hover:text-gray-400">
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <Button variant="outline" className="border-gray-700 text-gray-300 gap-1.5 text-sm" onClick={copyApiKey}>
                <Copy className="w-3.5 h-3.5" /> Copy
              </Button>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-2 font-semibold">Example usage</p>
              <pre className="text-xs text-emerald-300 font-mono overflow-x-auto">
{`curl -X POST https://api.journeyai.io/events \\
  -H "Authorization: Bearer ${apiKey.slice(0, 16)}..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_id": "cust_123",
    "event_type": "purchase",
    "channel": "web",
    "revenue": 89.99,
    "occurred_at": "2026-05-10T12:00:00Z"
  }'`}
              </pre>
            </div>
          </Card>
        </TabsContent>

        {/* Privacy */}
        <TabsContent value="privacy" className="mt-4">
          <Card className="bg-gray-900 border-gray-800 p-5 space-y-5">
            <h3 className="text-sm font-semibold text-gray-200">Privacy & Compliance</h3>
            {[
              { key: 'gdprErasure', label: 'GDPR Right to Erasure', desc: 'Allow data erasure requests via API. Permanently removes all PII for a customer.' },
              { key: 'ccpaOptOut', label: 'CCPA Opt-Out', desc: 'Honor California Consumer Privacy Act opt-out signals. Stops data collection for opted-out users.' },
              { key: 'piiMasking', label: 'PII Masking', desc: 'Mask email addresses and names in the dashboard. Only org admins can see raw PII.' },
              { key: 'anonymizeIP', label: 'Anonymize IP Addresses', desc: 'Truncate IP addresses before storage (last octet set to 0).' },
              { key: 'cookieConsent', label: 'Respect Cookie Consent', desc: 'Only track events after explicit cookie consent. Requires SDK integration.' },
            ].map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-200">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <Switch
                  checked={privacy[item.key as keyof typeof privacy]}
                  onCheckedChange={(v) => setPrivacy((p) => ({ ...p, [item.key]: v }))}
                  className="data-[state=checked]:bg-indigo-600 flex-shrink-0 mt-0.5"
                />
              </div>
            ))}
            <Separator className="bg-gray-800" />
            <div className="flex justify-end">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-sm" onClick={() => toast.success('Privacy settings saved')}>
                Save Privacy Settings
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <Card className="bg-gray-900 border-gray-800 p-5 space-y-5">
            <h3 className="text-sm font-semibold text-gray-200">Notification Preferences</h3>
            {[
              { key: 'weeklyDigest', label: 'Weekly Digest Email', desc: 'Receive a weekly summary of KPIs and important changes.' },
              { key: 'churnAlerts', label: 'Churn Alert Emails', desc: 'Get notified when churn rate crosses configured thresholds.' },
              { key: 'newSegments', label: 'New AI Segment Discoveries', desc: 'Notify when the AI agent identifies a new meaningful customer segment.' },
              { key: 'apiUsage', label: 'API Usage Warnings', desc: 'Receive warnings when API usage approaches plan limits.' },
            ].map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-200">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <Switch
                  checked={notifications[item.key as keyof typeof notifications]}
                  onCheckedChange={(v) => setNotifications((n) => ({ ...n, [item.key]: v }))}
                  className="data-[state=checked]:bg-indigo-600 flex-shrink-0 mt-0.5"
                />
              </div>
            ))}
            <Separator className="bg-gray-800" />
            <div className="flex justify-end">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-sm" onClick={() => toast.success('Notification settings saved')}>
                Save Notification Settings
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
