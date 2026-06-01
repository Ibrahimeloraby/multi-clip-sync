import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { departmentConfig, mockKnowledgeItems } from '@/data/mockData';
import KnowledgeCard from '@/components/hub/KnowledgeCard';
import type { Department } from '@/types/knowledge';

const departments: Department[] = [
  'marketing', 'sales', 'finance', 'hr', 'operations',
  'procurement', 'compliance', 'risk', 'board', 'it',
];

const totalLearnings = Object.values(departmentConfig).reduce((s, d) => s + d.learningCount, 0);
const totalAgent = Object.values(departmentConfig).reduce((s, d) => s + d.agentCount, 0);

export default function Dashboard() {
  const navigate = useNavigate();
  const recent = mockKnowledgeItems.slice(0, 4);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Learnings" value={totalLearnings.toLocaleString()} sub="across all departments" color="from-violet-500 to-indigo-600" />
        <StatCard label="Agent Actions" value={totalAgent.toLocaleString()} sub="flagged for follow-up" color="from-emerald-500 to-teal-600" />
        <StatCard label="Active Sources" value="7" sub="of 9 connected" color="from-blue-500 to-cyan-600" />
        <StatCard label="Contributors" value="84" sub="employees tagging" color="from-orange-500 to-amber-600" />
      </div>

      {/* Tagging rule callout */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <span className="text-3xl">🏷️</span>
          <div>
            <h2 className="font-semibold text-slate-900 mb-1">How to feed the brain</h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              In <strong>any</strong> meeting chat, Slack message, email, or document — add{' '}
              <code className="bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded font-mono text-xs">#learning</code>{' '}
              to share a knowledge insight, or{' '}
              <code className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono text-xs">#agent</code>{' '}
              to flag something that needs an action or recommendation. That's it — the AI handles the rest.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Department grid */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Departments</h2>
            <span className="text-xs text-slate-500">Click to explore</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {departments.map(dept => {
              const cfg = departmentConfig[dept];
              return (
                <button
                  key={dept}
                  onClick={() => navigate(`/hub/dept/${dept}`)}
                  className={`text-left p-4 rounded-xl border-2 hover:shadow-md transition-all ${cfg.bgColor}`}
                >
                  <div className="text-2xl mb-2">{cfg.icon}</div>
                  <p className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cfg.learningCount} learnings
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDistanceToNow(cfg.lastActivity, { addSuffix: true })}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-4">Recent Learnings</h2>
          <div className="space-y-3">
            {recent.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-400">{departmentConfig[item.department].icon}</span>
                  <span className={`text-xs font-medium ${departmentConfig[item.department].color}`}>
                    {departmentConfig[item.department].label}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    item.tag === '#agent'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>{item.tag}</span>
                </div>
                <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">{item.summary}</p>
                <p className="text-xs text-slate-400 mt-1">{item.author} · {formatDistanceToNow(item.timestamp, { addSuffix: true })}</p>
              </div>
            ))}
            <button
              onClick={() => navigate('/hub/feed')}
              className="w-full text-center text-xs text-violet-600 font-medium py-2 hover:text-violet-800 transition-colors"
            >
              View all learnings →
            </button>
          </div>
        </div>
      </div>

      {/* Top tagged items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">This Week's Key Learnings</h2>
          <button onClick={() => navigate('/hub/feed')} className="text-xs text-violet-600 hover:text-violet-800 font-medium">
            View all →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockKnowledgeItems.slice(0, 4).map(item => (
            <KnowledgeCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className={`text-2xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}</div>
      <div className="text-sm font-medium text-slate-700 mt-0.5">{label}</div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}
