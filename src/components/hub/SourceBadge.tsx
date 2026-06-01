import type { SourceType } from '@/types/knowledge';

const config: Record<SourceType, { label: string; color: string; icon: string }> = {
  teams:      { label: 'Teams',      color: 'bg-purple-100 text-purple-700 border-purple-200',   icon: '💬' },
  zoom:       { label: 'Zoom',       color: 'bg-blue-100 text-blue-700 border-blue-200',         icon: '🎥' },
  slack:      { label: 'Slack',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',   icon: '⚡' },
  email:      { label: 'Email',      color: 'bg-gray-100 text-gray-700 border-gray-200',         icon: '✉️' },
  pdf:        { label: 'Document',   color: 'bg-red-100 text-red-700 border-red-200',            icon: '📄' },
  powerbi:    { label: 'Power BI',   color: 'bg-orange-100 text-orange-700 border-orange-200',   icon: '📊' },
  sharepoint: { label: 'SharePoint', color: 'bg-teal-100 text-teal-700 border-teal-200',         icon: '🗂️' },
  confluence: { label: 'Confluence', color: 'bg-indigo-100 text-indigo-700 border-indigo-200',   icon: '📝' },
  jira:       { label: 'Jira',       color: 'bg-sky-100 text-sky-700 border-sky-200',            icon: '🎯' },
};

export default function SourceBadge({ source }: { source: SourceType }) {
  const { label, color, icon } = config[source];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}
