import { useState, useRef, useEffect } from 'react';
import { departmentConfig } from '@/data/mockData';
import { useConnectedSources } from '@/hooks/useConnectedSources';
import { useHubChat } from '@/hooks/useHubChat';
import SourceBadge from '@/components/hub/SourceBadge';
import type { Department } from '@/types/knowledge';

const departmentScopes: { value: Department | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '🌐' },
  ...(['marketing','sales','finance','hr','operations','procurement','compliance','risk','board','it'] as Department[])
    .map(d => ({ value: d, label: departmentConfig[d].label, icon: departmentConfig[d].icon })),
];

const suggestedPrompts = [
  'What are the biggest risks right now?',
  'Summarise this week\'s key decisions',
  'What operational improvements are in progress?',
  'What\'s the cloud migration status?',
  'Show me the latest Finance learnings',
  'What customer issues need urgent attention?',
];

export default function ChatPage() {
  const [scope, setScope] = useState<Department | 'all'>('all');
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage } = useHubChat(scope);
  const { data: sources } = useConnectedSources();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function handleSend(text: string) {
    if (!text.trim() || isLoading) return;
    sendMessage(text, scope);
    setInput('');
  }

  return (
    <div className="flex h-full">
      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scope bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-3 overflow-x-auto shrink-0">
          <span className="text-xs text-slate-500 font-medium shrink-0">Scope:</span>
          <div className="flex gap-1.5">
            {departmentScopes.slice(0, 7).map(opt => (
              <button
                key={opt.value}
                onClick={() => setScope(opt.value)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
                  scope === opt.value
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-3xl mx-auto mb-4">🧠</div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Ask the AI Brain</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Query across all tagged company knowledge. Scope to a department or ask across everything.
              </p>
            </div>
          )}

          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                  isUser ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
                }`}>
                  {isUser ? '👤' : '🧠'}
                </div>
                <div className={`max-w-2xl flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}>
                    <FormattedContent content={msg.content} isUser={isUser} />
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                      <span className="text-xs text-slate-400 self-center">Sources:</span>
                      {msg.sources.map((s, i) => <SourceBadge key={i} source={s.source} />)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm shrink-0">🧠</div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                  ))}
                  <span className="text-xs text-slate-400 ml-1">Searching tagged knowledge…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length === 0 && (
          <div className="px-6 pb-3 shrink-0">
            <p className="text-xs text-slate-400 mb-2">Try asking:</p>
            <div className="flex gap-2 flex-wrap">
              {suggestedPrompts.map(p => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-violet-300 hover:text-violet-700 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 shrink-0">
          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
              <textarea
                className="w-full bg-transparent text-sm text-slate-900 resize-none outline-none placeholder:text-slate-400"
                placeholder={`Ask anything across ${scope === 'all' ? 'all departments' : departmentConfig[scope as Department].label}…`}
                rows={2}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
              />
            </div>
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isLoading}
              className="bg-violet-600 text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Only reads content tagged <code className="bg-slate-100 rounded px-1 font-mono">#learning</code> or <code className="bg-slate-100 rounded px-1 font-mono">#agent</code> · Every response cites its sources
          </p>
        </div>
      </div>

      {/* Right panel */}
      <aside className="w-64 bg-white border-l border-slate-200 p-4 hidden xl:flex flex-col gap-4 overflow-y-auto shrink-0">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Sources</h3>
          <div className="space-y-2">
            {(sources ?? []).filter(s => s.status === 'connected').map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <SourceBadge source={s.type} />
                <span className="text-xs text-slate-500 font-medium tabular-nums">{s.itemsTagged.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
          <p className="text-xs font-semibold text-violet-800 mb-1">Tagging Rule</p>
          <p className="text-xs text-violet-600 leading-relaxed">
            The AI only reads content your team explicitly tags with{' '}
            <code className="bg-violet-100 rounded px-1 font-mono">#learning</code> or{' '}
            <code className="bg-violet-100 rounded px-1 font-mono">#agent</code>. Everything else remains private.
          </p>
        </div>
      </aside>
    </div>
  );
}

function FormattedContent({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith('> ')) {
          return (
            <blockquote key={i} className={`border-l-2 pl-3 italic text-sm ${isUser ? 'border-violet-300 text-violet-100' : 'border-violet-300 text-slate-600'}`}>
              {line.slice(2)}
            </blockquote>
          );
        }
        const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}
