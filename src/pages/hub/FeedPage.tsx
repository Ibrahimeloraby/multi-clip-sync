import { useState } from 'react';
import { mockKnowledgeItems, departmentConfig } from '@/data/mockData';
import KnowledgeCard from '@/components/hub/KnowledgeCard';
import type { Department, TagType, SourceType } from '@/types/knowledge';

const allDepts: Department[] = [
  'marketing','sales','finance','hr','operations',
  'procurement','compliance','risk','board','it',
];

export default function FeedPage() {
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<TagType | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = mockKnowledgeItems.filter(item => {
    if (deptFilter !== 'all' && item.department !== deptFilter) return false;
    if (tagFilter !== 'all' && item.tag !== tagFilter) return false;
    if (search && !item.content.toLowerCase().includes(search.toLowerCase()) &&
        !item.summary.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Live Knowledge Feed</h1>
          <p className="text-xs text-slate-500 mt-0.5">All content tagged with #learning or #agent across your organisation</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-700 font-medium">Live</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <input
          type="text"
          placeholder="Search learnings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
        />
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium self-center">Tag:</span>
          {(['all', '#learning', '#agent'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                tagFilter === t
                  ? t === '#agent' ? 'bg-violet-600 text-white' : t === '#learning' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'all' ? 'All Tags' : t}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium self-center">Dept:</span>
          <button
            onClick={() => setDeptFilter('all')}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${deptFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All
          </button>
          {allDepts.map(d => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${deptFilter === d ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {departmentConfig[d].icon} {departmentConfig[d].label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} items matching filters</p>

      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map(item => <KnowledgeCard key={item.id} item={item} />)
        ) : (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">No learnings match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
