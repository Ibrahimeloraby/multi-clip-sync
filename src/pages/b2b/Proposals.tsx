import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText, Plus, Sparkles, Send, Eye, CheckCircle,
  XCircle, Clock, ChevronRight, Loader2, Copy,
} from 'lucide-react';
import { MOCK_PROPOSALS, MOCK_COMPANIES, MOCK_DEALS, MOCK_PRODUCTS } from '@/lib/b2b-data';
import type { Proposal, ProposalStatus } from '@/lib/b2b-types';
import { generateProposalSummary } from '@/lib/ai-service';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: <FileText className="w-3 h-3" /> },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: <Send className="w-3 h-3" /> },
  viewed: { label: 'Viewed', color: 'bg-violet-100 text-violet-700', icon: <Eye className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selected, setSelected] = useState<Proposal | null>(null);

  function markSent(id: string) {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'sent', sentAt: new Date().toISOString() } : p));
    toast.success('Proposal marked as sent');
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-violet-600" />
            Proposals
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {proposals.length} proposals · {proposals.filter(p => p.status === 'sent' || p.status === 'viewed').length} awaiting response
          </p>
        </div>
        <Button onClick={() => setShowGenerator(true)} className="gap-2 bg-violet-600 hover:bg-violet-700">
          <Sparkles className="w-4 h-4" />
          AI Generate Proposal
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Sent', value: proposals.filter(p => p.status !== 'draft').length, color: 'text-blue-600' },
          { label: 'Viewed', value: proposals.filter(p => p.status === 'viewed').length, color: 'text-violet-600' },
          { label: 'Approved', value: proposals.filter(p => p.status === 'approved').length, color: 'text-green-600' },
          { label: 'Pending Approval', value: proposals.reduce((s, p) => s + p.approvalSteps.filter(a => a.status === 'pending').length, 0), color: 'text-amber-600' },
        ].map(stat => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="p-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {proposals.map(proposal => {
          const company = MOCK_COMPANIES.find(c => c.id === proposal.companyId);
          const status = STATUS_CONFIG[proposal.status];
          const approvedSteps = proposal.approvalSteps.filter(a => a.status === 'approved').length;
          const totalSteps = proposal.approvalSteps.length;

          return (
            <Card
              key={proposal.id}
              className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelected(proposal)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                      {company?.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">{proposal.title}</h3>
                        <Badge className={`text-xs flex items-center gap-1 flex-shrink-0 ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                        {proposal.executiveSummary}
                      </p>

                      {/* Approval Progress */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>Approval: {approvedSteps}/{totalSteps}</span>
                        </div>
                        <Progress value={(approvedSteps / Math.max(totalSteps, 1)) * 100} className="h-1.5 w-24" />
                        <div className="flex -space-x-1">
                          {proposal.approvalSteps.map(step => (
                            <div
                              key={step.id}
                              title={`${step.approverName} — ${step.status}`}
                              className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold
                                ${step.status === 'approved' ? 'bg-green-500' : step.status === 'rejected' ? 'bg-red-500' : 'bg-slate-300'}`}
                            >
                              {step.approverName[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-slate-900">{fmt(proposal.totalValue)}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Valid until {proposal.validUntil}
                    </div>
                    {proposal.sentAt && (
                      <div className="text-xs text-slate-400">
                        Sent {formatDistanceToNow(new Date(proposal.sentAt), { addSuffix: true })}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3 justify-end">
                      {proposal.status === 'draft' && (
                        <Button
                          size="sm"
                          className="bg-violet-600 hover:bg-violet-700 gap-1"
                          onClick={e => { e.stopPropagation(); markSent(proposal.id); }}
                        >
                          <Send className="w-3 h-3" /> Send
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={e => { e.stopPropagation(); setSelected(proposal); }}
                        className="gap-1"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Proposal Detail Modal */}
      {selected && (
        <ProposalDetailModal
          proposal={selected}
          onClose={() => setSelected(null)}
          onApprove={(pid, sid) => {
            setProposals(prev => prev.map(p =>
              p.id === pid
                ? {
                  ...p,
                  approvalSteps: p.approvalSteps.map(s =>
                    s.id === sid ? { ...s, status: 'approved', decidedAt: new Date().toISOString() } : s
                  )
                }
                : p
            ));
            toast.success('Step approved');
          }}
        />
      )}

      {/* AI Proposal Generator */}
      {showGenerator && (
        <AIProposalGenerator
          onClose={() => setShowGenerator(false)}
          onCreate={p => {
            setProposals(prev => [p, ...prev]);
            setShowGenerator(false);
            toast.success('Proposal created with AI!');
          }}
        />
      )}
    </div>
  );
}

function ProposalDetailModal({
  proposal, onClose, onApprove,
}: {
  proposal: Proposal;
  onClose: () => void;
  onApprove: (pid: string, sid: string) => void;
}) {
  const company = MOCK_COMPANIES.find(c => c.id === proposal.companyId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposal.title}</DialogTitle>
          <DialogDescription>{company?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Executive Summary */}
          <div className="bg-violet-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Executive Summary
            </div>
            <p className="text-sm text-slate-700">{proposal.executiveSummary}</p>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Line Items</h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2">Product</th>
                    <th className="text-right px-4 py-2">Qty</th>
                    <th className="text-right px-4 py-2">Unit</th>
                    <th className="text-right px-4 py-2">Discount</th>
                    <th className="text-right px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proposal.lineItems.map(li => (
                    <tr key={li.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{li.productName}</div>
                        <div className="text-xs text-slate-400">{li.description}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{li.quantity}</td>
                      <td className="px-4 py-3 text-right">${li.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{li.discount}%</td>
                      <td className="px-4 py-3 text-right font-semibold">${li.total.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50">
                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-700">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-lg">${proposal.totalValue.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Approval Chain */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Approval Chain</h3>
            <div className="space-y-3">
              {proposal.approvalSteps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white
                    bg-slate-300
                    data-[approved=true]:bg-green-500
                    data-[rejected=true]:bg-red-500"
                    style={{
                      background: step.status === 'approved' ? '#22c55e' : step.status === 'rejected' ? '#ef4444' : '#94a3b8'
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{step.approverName}</div>
                    <div className="text-xs text-slate-400">{step.approverRole}</div>
                  </div>
                  <div className="text-right">
                    {step.status === 'pending' ? (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 gap-1 h-7"
                        onClick={() => onApprove(proposal.id, step.id)}
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </Button>
                    ) : (
                      <Badge className={step.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {step.status === 'approved' ? 'Approved' : 'Rejected'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AIProposalGenerator({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Proposal) => void }) {
  const [companyId, setCompanyId] = useState('');
  const [dealId, setDealId] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [step, setStep] = useState<'form' | 'preview'>('form');

  const company = MOCK_COMPANIES.find(c => c.id === companyId);
  const deal = MOCK_DEALS.find(d => d.id === dealId);

  async function generate() {
    if (!company || !deal) return;
    setLoading(true);
    try {
      const summary = await generateProposalSummary({
        companyName: company.name,
        industry: company.industry,
        contactName: company.contactName,
        contactTitle: company.contactTitle,
        products: MOCK_PRODUCTS.filter(p => deal.productIds.includes(p.id)).map(p => p.name),
        totalValue: deal.value,
        dealNotes: deal.notes,
      });
      setGeneratedSummary(summary);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  }

  function create() {
    if (!company || !deal) return;
    const products = MOCK_PRODUCTS.filter(p => deal.productIds.includes(p.id));
    const newProposal: Proposal = {
      id: `pr${Date.now()}`,
      dealId: deal.id,
      companyId: company.id,
      title: `${products[0]?.name ?? 'Proposal'} — ${company.name}`,
      status: 'draft',
      executiveSummary: generatedSummary,
      content: '',
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      totalValue: deal.value,
      currency: 'USD',
      lineItems: products.map((p, i) => ({
        id: `li${Date.now()}_${i}`,
        productId: p.id,
        productName: p.name,
        description: p.description.substring(0, 60),
        quantity: 1,
        unitPrice: p.price,
        discount: 0,
        total: p.price,
      })),
      approvalSteps: [
        { id: `as${Date.now()}_1`, approverName: 'Sales Director', approverEmail: 'sales@company.com', approverRole: 'Sales Director', status: 'pending', comment: '', decidedAt: null, order: 1 },
        { id: `as${Date.now()}_2`, approverName: 'VP Revenue', approverEmail: 'vp@company.com', approverRole: 'VP Revenue', status: 'pending', comment: '', decidedAt: null, order: 2 },
      ],
      currentApprovalStep: 0,
      createdAt: new Date().toISOString(),
      sentAt: null,
      viewedAt: null,
    };
    onCreate(newProposal);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            AI Proposal Generator
          </DialogTitle>
          <DialogDescription>
            Let AI craft a personalized executive summary and proposal structure
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4 mt-2">
            <div>
              <Label>Target Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {MOCK_COMPANIES.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.industry})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Associated Deal</Label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger><SelectValue placeholder="Select deal" /></SelectTrigger>
                <SelectContent>
                  {MOCK_DEALS.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {company && (
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                <div><span className="font-medium">Contact:</span> {company.contactName}, {company.contactTitle}</div>
                <div><span className="font-medium">Industry:</span> {company.industry}</div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={generate}
                disabled={!companyId || !dealId || loading}
                className="gap-2 bg-violet-600 hover:bg-violet-700"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="bg-violet-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-violet-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI-Generated Executive Summary
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 text-xs"
                  onClick={() => { navigator.clipboard.writeText(generatedSummary); toast.success('Copied!'); }}
                >
                  <Copy className="w-3 h-3" /> Copy
                </Button>
              </div>
              <Textarea
                value={generatedSummary}
                onChange={e => setGeneratedSummary(e.target.value)}
                rows={6}
                className="text-sm bg-white"
              />
            </div>
            <p className="text-xs text-slate-500">
              You can edit the summary above. Line items and approval chain will be auto-populated from the deal.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('form')}>Back</Button>
              <Button onClick={create} className="gap-2 bg-violet-600 hover:bg-violet-700">
                <FileText className="w-4 h-4" /> Create Proposal
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
