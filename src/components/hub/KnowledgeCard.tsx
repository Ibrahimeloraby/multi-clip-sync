import { formatDistanceToNow } from 'date-fns';
import type { KnowledgeItem } from '@/types/knowledge';
import { departmentConfig } from '@/data/mockData';
import SourceBadge from './SourceBadge';

export default function KnowledgeCard({ item }: { item: KnowledgeItem }) {
  const dept = departmentConfig[item.department];
  const isAgent = item.tag === '#agent';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={item.source} />
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${dept.bgColor} ${dept.color}`}>
            {dept.icon} {dept.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
            isAgent
              ? 'bg-violet-100 text-violet-700 border-violet-200'
              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
          }`}>
            {item.tag}
          </span>
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
          {formatDistanceToNow(item.timestamp, { addSuffix: true })}
        </span>
      </div>

      {item.meetingTitle && (
        <p className="text-xs font-medium text-slate-500 mb-1">{item.meetingTitle}</p>
      )}

      <p className="text-sm text-slate-800 font-medium mb-2 leading-snug">{item.summary}</p>
      <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{item.content}</p>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs">
            {item.author[0]}
          </div>
          <span className="text-xs text-slate-500">{item.author}</span>
        </div>
        <div className="flex gap-1 flex-wrap justify-end">
          {item.keyTopics.slice(0, 3).map(t => (
            <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
