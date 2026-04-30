import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckSquare, CheckCircle, XCircle, Clock, ChevronRight,
  AlertCircle, User, FileText, Shield,
} from 'lucide-react';
import { MOCK_PROPOSALS, MOCK_COMPANIES } from '@/lib/b2b-data';
import type { Proposal, ApprovalStep } from '@/lib/b2b-types';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PendingApproval {
  proposal: Proposal;
  step: ApprovalStep;
  companyName: string;
}

export default function Approvals() {
  const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS);
  const [reviewTarget, setReviewTarget] = useState<PendingApproval | null>(null);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const pending: PendingApproval[] = proposals.flatMap(p =>
    p.approvalSteps
      .filter(s => s.status === 'pending')
      .map(s => ({
        proposal: p,
        step: s,
        companyName: MOCK_COMPANIES.find(c => c.id === p.companyId)?.name ?? '',
      }))
  );

  const completed = proposals.flatMap(p =>
    p.approvalSteps
      .filter(s => s.status !== 'pending')
      .map(s => ({
        proposal: p,
        step: s,
        companyName: MOCK_COMPANIES.find(c => c.id === p.companyId)?.name ?? '',
      }))
  );

  function decide(action: 'approve' | 'reject') {
    if (!reviewTarget) return;
    const { proposal, step } = reviewTarget;
    setProposals(prev =>
      prev.map(p =>
        p.id === proposal.id
          ? {
            ...p,
            approvalSteps: p.approvalSteps.map(s =>
              s.id === step.id
                ? { ...s, status: action === 'approve' ? 'approved' : 'rejected', comment, decidedAt: new Date().toISOString() }
                : s
            ),
            status: action === 'reject' ? 'rejected' : p.status,
          }
          : p
      )
    );
    toast.success(action === 'approve' ? 'Approved successfully' : 'Rejected with comment');
    setReviewTarget(null);
    setComment('');
    setActionType(null);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-violet-600" />
            Approval Workflows
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {pending.length} pending · {completed.length} completed
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold text-amber-700">{pending.length}</div>
              <div className="text-xs text-amber-600">Awaiting Your Action</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-green-700">{completed.filter(c => c.step.status === 'approved').length}</div>
              <div className="text-xs text-green-600">Approved This Month</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <div>
              <div className="text-2xl font-bold text-red-600">{completed.filter(c => c.step.status === 'rejected').length}</div>
              <div className="text-xs text-red-500">Rejected This Month</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending Approvals
          </h2>
          <div className="space-y-3">
            {pending.map(({ proposal, step, companyName }) => (
              <Card key={`${proposal.id}-${step.id}`} className="border-amber-200 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{proposal.title}</div>
                        <div className="text-sm text-slate-500 mt-0.5">{companyName}</div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Approver: {step.approverName}
                          </span>
                          <span>·</span>
                          <span>Step {step.order} of {proposal.approvalSteps.length}</span>
                          <span>·</span>
                          <span className="font-medium text-slate-600">${proposal.totalValue.toLocaleString()}</span>
                        </div>
                        {/* Workflow visualization */}
                        <div className="flex items-center gap-2 mt-3">
                          {proposal.approvalSteps.map((s, i) => (
                            <div key={s.id} className="flex items-center gap-2">
                              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                ${s.status === 'approved' ? 'bg-green-100 text-green-700' :
                                  s.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  s.id === step.id ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400' :
                                  'bg-slate-100 text-slate-400'}`}
                              >
                                {s.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                                 s.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                                 <Clock className="w-3 h-3" />}
                                {s.approverName.split(' ')[0]}
                              </div>
                              {i < proposal.approvalSteps.length - 1 && (
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => { setReviewTarget({ proposal, step, companyName }); setActionType('reject'); }}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700"
                        onClick={() => { setReviewTarget({ proposal, step, companyName }); setActionType('approve'); }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      <div>
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" />
          Completed
        </h2>
        {completed.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No completed approvals yet</div>
        ) : (
          <div className="space-y-2">
            {completed.map(({ proposal, step, companyName }) => (
              <div key={`${proposal.id}-${step.id}`} className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center
                    ${step.status === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}
                  >
                    {step.status === 'approved'
                      ? <CheckCircle className="w-4 h-4 text-green-600" />
                      : <XCircle className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{proposal.title}</div>
                    <div className="text-xs text-slate-400">{step.approverName} · {companyName}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={step.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {step.status === 'approved' ? 'Approved' : 'Rejected'}
                  </Badge>
                  {step.decidedAt && (
                    <div className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(step.decidedAt), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewTarget && actionType && (
        <Dialog open onOpenChange={() => { setReviewTarget(null); setComment(''); setActionType(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionType === 'approve'
                  ? <><CheckCircle className="w-5 h-5 text-green-600" /> Approve Proposal</>
                  : <><XCircle className="w-5 h-5 text-red-500" /> Reject Proposal</>
                }
              </DialogTitle>
              <DialogDescription>
                {reviewTarget.proposal.title} · {reviewTarget.companyName}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                <strong>Amount:</strong> ${reviewTarget.proposal.totalValue.toLocaleString()}<br />
                <strong>Approver step:</strong> {reviewTarget.step.approverName}
              </div>
              <div>
                <Label>Comment {actionType === 'reject' ? '(required)' : '(optional)'}</Label>
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={actionType === 'approve' ? 'Add a note...' : 'Reason for rejection...'}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setReviewTarget(null); setComment(''); setActionType(null); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => decide(actionType)}
                  disabled={actionType === 'reject' && !comment.trim()}
                  className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
