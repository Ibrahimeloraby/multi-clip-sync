import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Sparkles, Plus, TrendingUp, MoreHorizontal, Calendar, User } from 'lucide-react';
import { MOCK_DEALS, MOCK_COMPANIES } from '@/lib/b2b-data';
import type { Deal, DealStage } from '@/lib/b2b-types';
import { toast } from 'sonner';

const STAGES: { id: DealStage; label: string; color: string; bg: string }[] = [
  { id: 'prospecting', label: 'Prospecting', color: 'text-slate-600', bg: 'bg-slate-100' },
  { id: 'qualified', label: 'Qualified', color: 'text-blue-700', bg: 'bg-blue-50' },
  { id: 'proposal', label: 'Proposal Sent', color: 'text-violet-700', bg: 'bg-violet-50' },
  { id: 'negotiation', label: 'Negotiation', color: 'text-amber-700', bg: 'bg-amber-50' },
  { id: 'closed_won', label: 'Closed Won', color: 'text-green-700', bg: 'bg-green-50' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'text-red-700', bg: 'bg-red-50' },
];

const SCORE_COLOR = (s: number) =>
  s >= 70 ? 'text-green-600' : s >= 40 ? 'text-amber-600' : 'text-red-500';

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
  const [selected, setSelected] = useState<Deal | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<DealStage | null>(null);

  const dealsByStage = (stage: DealStage) => deals.filter(d => d.stage === stage);

  const stageValue = (stage: DealStage) =>
    dealsByStage(stage).reduce((s, d) => s + d.value, 0);

  function handleDrop(stage: DealStage) {
    if (!dragging) return;
    setDeals(prev =>
      prev.map(d => d.id === dragging ? { ...d, stage, updatedAt: new Date().toISOString() } : d)
    );
    toast.success(`Deal moved to ${STAGES.find(s => s.id === stage)?.label}`);
    setDragging(null);
    setDragOver(null);
  }

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-violet-600" />
            Deal Pipeline
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {deals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost').length} active deals ·{' '}
            {fmt(deals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost').reduce((s, d) => s + d.value, 0))} pipeline
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2 bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4" /> New Deal
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {STAGES.map(stage => (
          <div
            key={stage.id}
            className={`flex-shrink-0 w-72 rounded-xl transition-colors ${dragOver === stage.id ? 'ring-2 ring-violet-400 bg-violet-50' : 'bg-slate-100'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(stage.id)}
          >
            {/* Column header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 font-medium text-slate-600 shadow-sm">
                  {dealsByStage(stage.id).length}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">{fmt(stageValue(stage.id))}</span>
            </div>

            {/* Cards */}
            <div className="px-3 pb-3 space-y-2 min-h-24">
              {dealsByStage(stage.id).map(deal => {
                const company = MOCK_COMPANIES.find(c => c.id === deal.companyId);
                return (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => setDragging(deal.id)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    onClick={() => setSelected(deal)}
                    className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-all border border-slate-200 ${dragging === deal.id ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {company?.logo}
                        </div>
                        <div className="text-xs text-slate-500">{company?.name}</div>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-sm font-medium text-slate-800 mb-2 leading-tight">{deal.title}</div>
                    <div className="text-base font-bold text-slate-900 mb-2">{fmt(deal.value)}</div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className={`font-semibold ${SCORE_COLOR(deal.aiScore)}`}>AI: {deal.aiScore}</span>
                      <span>{deal.probability}%</span>
                    </div>
                    <Progress value={deal.probability} className="h-1 mb-2" />
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span className="truncate">{deal.nextAction}</span>
                    </div>
                  </div>
                );
              })}

              {dealsByStage(stage.id).length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  Drop deals here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Deal Detail Modal */}
      {selected && (
        <DealDetailModal deal={selected} onClose={() => setSelected(null)} />
      )}

      {/* New Deal Modal */}
      {showNew && (
        <NewDealModal
          onClose={() => setShowNew(false)}
          onCreate={deal => {
            setDeals(prev => [...prev, deal]);
            setShowNew(false);
            toast.success('Deal created successfully');
          }}
        />
      )}
    </div>
  );
}

function DealDetailModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const company = MOCK_COMPANIES.find(c => c.id === deal.companyId);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold">
              {company?.logo}
            </div>
            {deal.title}
          </DialogTitle>
          <DialogDescription>{company?.name} · {company?.industry}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Deal Value</div>
              <div className="text-xl font-bold">${deal.value.toLocaleString()}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Win Probability</div>
              <div className="text-xl font-bold">{deal.probability}%</div>
            </div>
          </div>

          <div className="bg-violet-50 rounded-lg p-3 flex gap-2">
            <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-violet-700 mb-1">AI Insight</div>
              <div className="text-xs text-violet-800">{deal.aiInsight}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Owner
            </div>
            <div className="text-sm">{deal.ownerName}</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Next Action
            </div>
            <div className="text-sm">{deal.nextAction}</div>
            <div className="text-xs text-slate-400">{deal.nextActionDate}</div>
          </div>

          {deal.notes && (
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">Notes</div>
              <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{deal.notes}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewDealModal({ onClose, onCreate }: { onClose: () => void; onCreate: (d: Deal) => void }) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const newDeal: Deal = {
      id: `d${Date.now()}`,
      title,
      companyId: company || 'c1',
      value: parseInt(value) || 0,
      currency: 'USD',
      stage: 'prospecting',
      probability: 20,
      ownerId: 'u1',
      ownerName: 'Alex Morgan',
      productIds: [],
      notes,
      nextAction: 'Initial discovery call',
      nextActionDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedAt: null,
      aiScore: 20,
      aiInsight: 'New deal — gather more information to improve AI scoring.',
    };
    onCreate(newDeal);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
          <DialogDescription>Add a new deal to your pipeline</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div>
            <Label>Deal Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Company — Product/Service" required />
          </div>
          <div>
            <Label>Company</Label>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {MOCK_COMPANIES.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Deal Value ($)</Label>
            <Input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 50000" required />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context, next steps..." rows={3} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700">Create Deal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
