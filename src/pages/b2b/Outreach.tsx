import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mail, Sparkles, Plus, Send, Eye, MessageSquare,
  Loader2, Copy, RefreshCw, CheckCircle, Clock,
} from 'lucide-react';
import { MOCK_OUTREACH, MOCK_COMPANIES } from '@/lib/b2b-data';
import type { OutreachMessage, OutreachStatus } from '@/lib/b2b-types';
import { generateOutreachMessage } from '@/lib/ai-service';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG: Record<OutreachStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: <Mail className="w-3 h-3" /> },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: <Send className="w-3 h-3" /> },
  opened: { label: 'Opened', color: 'bg-violet-100 text-violet-700', icon: <Eye className="w-3 h-3" /> },
  replied: { label: 'Replied', color: 'bg-green-100 text-green-700', icon: <MessageSquare className="w-3 h-3" /> },
  bounced: { label: 'Bounced', color: 'bg-red-100 text-red-700', icon: <Mail className="w-3 h-3" /> },
};

type Tone = 'formal' | 'consultative' | 'friendly' | 'urgent';

export default function Outreach() {
  const [messages, setMessages] = useState<OutreachMessage[]>(MOCK_OUTREACH);
  const [companyId, setCompanyId] = useState('');
  const [tone, setTone] = useState<Tone>('consultative');
  const [context, setContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ subject: string; body: string } | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  const company = MOCK_COMPANIES.find(c => c.id === companyId);

  async function generate() {
    if (!company) return;
    setGenerating(true);
    try {
      const result = await generateOutreachMessage({
        companyName: company.name,
        industry: company.industry,
        contactName: company.contactName,
        contactTitle: company.contactTitle,
        tone,
        context,
        productName: 'B2B Offering Platform',
      });
      setGenerated(result);
      setEditSubject(result.subject);
      setEditBody(result.body);
    } finally {
      setGenerating(false);
    }
  }

  function saveAsDraft() {
    if (!company) return;
    const msg: OutreachMessage = {
      id: `o${Date.now()}`,
      companyId: company.id,
      dealId: null,
      subject: editSubject,
      body: editBody,
      tone,
      status: 'draft',
      createdAt: new Date().toISOString(),
      sentAt: null,
      openedAt: null,
      repliedAt: null,
    };
    setMessages(prev => [msg, ...prev]);
    toast.success('Saved as draft');
    resetCompose();
  }

  function send() {
    if (!company) return;
    const msg: OutreachMessage = {
      id: `o${Date.now()}`,
      companyId: company.id,
      dealId: null,
      subject: editSubject,
      body: editBody,
      tone,
      status: 'sent',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      openedAt: null,
      repliedAt: null,
    };
    setMessages(prev => [msg, ...prev]);
    toast.success(`Outreach sent to ${company.contactName} at ${company.name}`);
    resetCompose();
  }

  function resetCompose() {
    setCompanyId('');
    setTone('consultative');
    setContext('');
    setGenerated(null);
    setEditSubject('');
    setEditBody('');
    setShowCompose(false);
  }

  const stats = {
    sent: messages.filter(m => m.status !== 'draft').length,
    opened: messages.filter(m => m.status === 'opened' || m.status === 'replied').length,
    replied: messages.filter(m => m.status === 'replied').length,
    openRate: messages.length
      ? Math.round((messages.filter(m => m.status === 'opened' || m.status === 'replied').length / Math.max(messages.filter(m => m.status !== 'draft').length, 1)) * 100)
      : 0,
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-violet-600" />
            AI Outreach
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Personalized B2B outreach powered by Claude AI
          </p>
        </div>
        <Button onClick={() => setShowCompose(true)} className="gap-2 bg-violet-600 hover:bg-violet-700">
          <Sparkles className="w-4 h-4" /> Compose with AI
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Sent', value: stats.sent, icon: <Send className="w-4 h-4 text-blue-500" />, color: 'text-blue-600' },
          { label: 'Opened', value: stats.opened, icon: <Eye className="w-4 h-4 text-violet-500" />, color: 'text-violet-600' },
          { label: 'Replied', value: stats.replied, icon: <MessageSquare className="w-4 h-4 text-green-500" />, color: 'text-green-600' },
          { label: 'Open Rate', value: `${stats.openRate}%`, icon: <CheckCircle className="w-4 h-4 text-amber-500" />, color: 'text-amber-600' },
        ].map(s => (
          <Card key={s.label} className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              {s.icon}
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Compose Panel */}
        {showCompose && (
          <div className="lg:col-span-3">
            <Card className="border-violet-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                  <h2 className="font-semibold text-slate-900">AI Compose</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Target Company</Label>
                    <Select value={companyId} onValueChange={setCompanyId}>
                      <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                      <SelectContent>
                        {MOCK_COMPANIES.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} — {c.contactName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={v => setTone(v as Tone)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="consultative">Consultative</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Context / Pain Points</Label>
                    <Textarea
                      value={context}
                      onChange={e => setContext(e.target.value)}
                      placeholder="e.g. struggling with manual approval delays, recently expanded..."
                      rows={2}
                    />
                  </div>

                  <Button
                    onClick={generate}
                    disabled={!companyId || generating}
                    className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
                  >
                    {generating
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                      : <><Sparkles className="w-4 h-4" /> Generate Message</>
                    }
                  </Button>

                  {generated && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <Label className="text-violet-700">Generated Message</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={generate}
                          disabled={generating}
                          className="h-7 gap-1 text-xs text-violet-600"
                        >
                          <RefreshCw className="w-3 h-3" /> Regenerate
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Subject</Label>
                        <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Body</Label>
                        <Textarea
                          value={editBody}
                          onChange={e => setEditBody(e.target.value)}
                          rows={8}
                          className="mt-1 text-sm font-mono"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => { navigator.clipboard.writeText(`Subject: ${editSubject}\n\n${editBody}`); toast.success('Copied!'); }}
                          className="gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </Button>
                        <Button variant="outline" onClick={saveAsDraft} className="gap-1">
                          Save Draft
                        </Button>
                        <Button onClick={send} className="gap-1 bg-violet-600 hover:bg-violet-700 flex-1">
                          <Send className="w-3.5 h-3.5" /> Send
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Message History */}
        <div className={showCompose ? 'lg:col-span-2' : 'lg:col-span-5'}>
          <h2 className="font-semibold text-slate-900 mb-4">Message History</h2>
          <div className="space-y-3">
            {messages.map(msg => {
              const co = MOCK_COMPANIES.find(c => c.id === msg.companyId);
              const status = STATUS_CONFIG[msg.status];
              return (
                <Card key={msg.id} className="border-slate-200 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {co?.logo}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">{co?.name}</div>
                          <div className="text-xs text-slate-400">{co?.contactName}</div>
                        </div>
                      </div>
                      <Badge className={`text-xs flex items-center gap-1 ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-slate-700 mb-1 truncate">{msg.subject}</div>
                    <div className="text-xs text-slate-400 line-clamp-2">{msg.body}</div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </div>
                      {msg.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs gap-1"
                          onClick={() => {
                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m));
                            toast.success('Sent!');
                          }}
                        >
                          <Send className="w-2.5 h-2.5" /> Send
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {messages.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                No outreach messages yet. Use AI Compose to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
