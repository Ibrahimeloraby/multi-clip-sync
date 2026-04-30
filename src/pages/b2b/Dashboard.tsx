import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, FileText, CheckSquare, Mail,
  DollarSign, Clock, Target, ArrowUpRight,
  Sparkles, Bell, Plus,
} from 'lucide-react';
import { DASHBOARD_METRICS, MOCK_ACTIVITIES, MOCK_DEALS, MOCK_COMPANIES } from '@/lib/b2b-data';
import { formatDistanceToNow } from 'date-fns';

const ACTIVITY_ICONS = {
  deal_created: <TrendingUp className="w-4 h-4 text-blue-500" />,
  proposal_sent: <FileText className="w-4 h-4 text-violet-500" />,
  approval_granted: <CheckSquare className="w-4 h-4 text-green-500" />,
  approval_rejected: <CheckSquare className="w-4 h-4 text-red-500" />,
  deal_closed: <Target className="w-4 h-4 text-green-600" />,
  outreach_replied: <Mail className="w-4 h-4 text-orange-500" />,
  proposal_viewed: <FileText className="w-4 h-4 text-blue-400" />,
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: 'bg-slate-400',
  qualified: 'bg-blue-500',
  proposal: 'bg-violet-500',
  negotiation: 'bg-amber-500',
  closed_won: 'bg-green-500',
  closed_lost: 'bg-red-400',
};

const STAGE_LABELS: Record<string, string> = {
  prospecting: 'Prospecting',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function Dashboard() {
  const m = DASHBOARD_METRICS;
  const activeDeals = MOCK_DEALS.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Good morning, Alex</h1>
          <p className="text-slate-500 mt-1">Here's your B2B pipeline overview for today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">2</span>
          </Button>
          <Link to="/b2b/deals">
            <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
              <Plus className="w-4 h-4" />
              New Deal
            </Button>
          </Link>
        </div>
      </div>

      {/* AI Insight Banner */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white flex items-start gap-3">
        <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold text-sm mb-1">AI Pipeline Insight</div>
          <p className="text-violet-100 text-sm">
            Apex Logistics viewed your proposal yesterday. Their CFO approval is the last step — nudge now to maintain momentum. Meridian Finance renewal is 90% likely to close this week.
          </p>
        </div>
        <Link to="/b2b/proposals">
          <Button size="sm" variant="secondary" className="ml-auto whitespace-nowrap text-violet-700 bg-white hover:bg-violet-50">
            View Proposals
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={<DollarSign className="w-5 h-5 text-violet-600" />}
          label="Pipeline Value"
          value={fmt(m.totalPipelineValue)}
          sub="+12% vs last quarter"
          trend="up"
        />
        <MetricCard
          icon={<Target className="w-5 h-5 text-green-600" />}
          label="Win Rate"
          value={`${m.winRate}%`}
          sub="Above industry avg"
          trend="up"
        />
        <MetricCard
          icon={<CheckSquare className="w-5 h-5 text-amber-600" />}
          label="Pending Approvals"
          value={String(m.pendingApprovals)}
          sub="Action required"
          trend="warn"
          linkTo="/b2b/approvals"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          label="Avg Deal Cycle"
          value={`${m.avgDealCycle}d`}
          sub="-8 days vs last quarter"
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Deals */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Active Deals</h2>
            <Link to="/b2b/deals">
              <Button variant="ghost" size="sm" className="gap-1 text-slate-500">
                View all <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {activeDeals.map(deal => {
              const company = MOCK_COMPANIES.find(c => c.id === deal.companyId);
              return (
                <Link key={deal.id} to="/b2b/deals">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                            {company?.logo}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-slate-900">{deal.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{deal.nextAction}</div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold text-sm">{fmt(deal.value)}</div>
                          <Badge
                            variant="secondary"
                            className={`text-xs mt-1 text-white ${STAGE_COLORS[deal.stage]}`}
                          >
                            {STAGE_LABELS[deal.stage]}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>AI Score: {deal.aiScore}/100</span>
                          <span>{deal.probability}% probability</span>
                        </div>
                        <Progress value={deal.aiScore} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <Card className="border-slate-200">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {MOCK_ACTIVITIES.map(a => (
                  <div key={a.id} className="flex gap-3 px-4 py-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {ACTIVITY_ICONS[a.type]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800">{a.title}</div>
                      <div className="text-xs text-slate-500 truncate">{a.description}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'warn';
  linkTo?: string;
}

function MetricCard({ icon, label, value, sub, trend, linkTo }: MetricCardProps) {
  const inner = (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-slate-100 rounded-lg">{icon}</div>
          {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-500" />}
          {trend === 'warn' && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
        </div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500 mt-1">{label}</div>
        <div className={`text-xs mt-1 font-medium ${trend === 'up' ? 'text-green-600' : trend === 'warn' ? 'text-amber-600' : 'text-red-500'}`}>
          {sub}
        </div>
      </CardContent>
    </Card>
  );

  return linkTo ? <Link to={linkTo}>{inner}</Link> : inner;
}
