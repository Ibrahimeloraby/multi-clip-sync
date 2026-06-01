import { useParams, useNavigate } from 'react-router-dom';
import { departmentConfig, mockKnowledgeItems } from '@/data/mockData';
import KnowledgeCard from '@/components/hub/KnowledgeCard';
import type { Department } from '@/types/knowledge';
import { formatDistanceToNow } from 'date-fns';

export default function DepartmentPage() {
  const { dept } = useParams<{ dept: string }>();
  const navigate = useNavigate();
  const cfg = dept ? departmentConfig[dept] : null;

  if (!cfg) return (
    <div className="p-8 text-center text-slate-500">Department not found</div>
  );

  const items = mockKnowledgeItems.filter(i => i.department === dept);
  const learnings = items.filter(i => i.tag === '#learning');
  const agentItems = items.filter(i => i.tag === '#agent');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-2xl border-2 p-6 ${cfg.bgColor}`}>
        <div className="flex items-center gap-4">
          <div className="text-5xl">{cfg.icon}</div>
          <div>
            <h1 className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Last activity {formatDistanceToNow(cfg.lastActivity, { addSuffix: true })}
            </p>
          </div>
          <button
            onClick={() => navigate('/hub/chat', { state: { dept } })}
            className="ml-auto bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            🧠 Ask AI about {cfg.label}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5">
          <div className="bg-white/70 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${cfg.color}`}>{cfg.learningCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total Learnings</div>
          </div>
          <div className="bg-white/70 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-violet-600">{cfg.agentCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Agent Actions</div>
          </div>
          <div className="bg-white/70 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-700">{cfg.topTopics.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Key Topics</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {cfg.topTopics.map(t => (
            <span key={t} className="text-xs bg-white/80 border border-white/60 px-3 py-1 rounded-full text-slate-600 font-medium">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Agent action items */}
      {agentItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Agent Actions — Needs Follow-up</h2>
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">{agentItems.length}</span>
          </div>
          <div className="space-y-3">
            {agentItems.map(item => <KnowledgeCard key={item.id} item={item} />)}
          </div>
        </div>
      )}

      {/* Learnings */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h2 className="font-semibold text-slate-900 text-sm">Learnings</h2>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            {learnings.length > 0 ? learnings.length : cfg.learningCount}
          </span>
        </div>

        {learnings.length > 0 ? (
          <div className="space-y-3">
            {learnings.map(item => <KnowledgeCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-400 text-sm">
              {cfg.learningCount} learnings indexed — showing recent demo items above.
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Tag messages with <code className="bg-slate-100 px-1 rounded font-mono">#learning</code> in any connected source to populate this feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
