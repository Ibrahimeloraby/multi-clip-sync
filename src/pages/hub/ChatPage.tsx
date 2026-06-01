import { useState, useRef, useEffect } from 'react';
import { departmentConfig, mockChatHistory, mockKnowledgeItems } from '@/data/mockData';
import { mockConnectedSources } from '@/data/mockData';
import SourceBadge from '@/components/hub/SourceBadge';
import type { ChatMessage, Department } from '@/types/knowledge';
import { formatDistanceToNow } from 'date-fns';

const departmentOptions: { value: Department | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All Departments', icon: '🌐' },
  ...(['marketing','sales','finance','hr','operations','procurement','compliance','risk','board','it'] as Department[])
    .map(d => ({ value: d, label: departmentConfig[d].label, icon: departmentConfig[d].icon })),
];

const suggestedPrompts = [
  'What are the biggest risks we face right now?',
  'Summarise this week\'s key decisions',
  'What operational improvements are in progress?',
  'What\'s the status of the cloud migration?',
  'Show me Finance\'s latest learnings',
  'What customer issues need urgent attention?',
];

const agentResponses: Record<string, string> = {
  default: `I've searched across all tagged learnings and here's what I found:\n\nBased on **{count} tagged items** across your connected sources, the most relevant insight is:\n\n> "{summary}"\n\n**Source:** {source} · Tagged by {author}\n\nWould you like me to dig deeper into any specific department or time period?`,
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatHistory);
  const [input, setInput] = useState('');
  const [scope, setScope] = useState<Department | 'all'>('all');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      department: scope,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const relevant = mockKnowledgeItems.filter(i => scope === 'all' || i.department === scope);
      const sample = relevant[Math.floor(Math.random() * relevant.length)] ?? mockKnowledgeItems[0];
      const response: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: buildResponse(text, relevant.length, sample),
        timestamp: new Date(),
        department: scope,
        sources: relevant.slice(0, 3).map(i => ({
          title: i.meetingTitle ?? i.citations[0] ?? 'Tagged item',
          source: i.source,
          department: i.department,
        })),
      };
      setIsTyping(false);
      setMessages(prev => [...prev, response]);
    }, 1400);
  }

  return (
    <div className="flex h-full">
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Scope bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Scope:</span>
          <div className="flex gap-1.5 flex-wrap">
            {departmentOptions.slice(0, 6).map(opt => (
              <button
                key={opt.value}
                onClick={() => setScope(opt.value)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
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
                Query across all your tagged company knowledge. Scope to a department or search everything.
              </p>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {isTyping && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm shrink-0">🧠</div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length <= 2 && (
          <div className="px-6 pb-3">
            <p className="text-xs text-slate-400 mb-2">Suggested questions</p>
            <div className="flex gap-2 flex-wrap">
              {suggestedPrompts.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-violet-300 hover:text-violet-700 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-slate-200 px-6 py-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
              <textarea
                className="w-full bg-transparent text-sm text-slate-900 resize-none outline-none placeholder:text-slate-400"
                placeholder={`Ask anything across ${scope === 'all' ? 'all departments' : departmentConfig[scope].label}…`}
                rows={2}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="bg-violet-600 text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Only queries data tagged with #learning or #agent · Sources are cited in every response</p>
        </div>
      </div>

      {/* Right panel — source stats */}
      <aside className="w-64 bg-white border-l border-slate-200 p-4 hidden xl:block overflow-y-auto">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Live Sources</h3>
        <div className="space-y-2">
          {mockConnectedSources.filter(s => s.status === 'connected').map(s => (
            <div key={s.id} className="flex items-center justify-between">
              <SourceBadge source={s.type} />
              <span className="text-xs text-slate-500 font-medium tabular-nums">{s.itemsTagged}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 p-3 bg-violet-50 border border-violet-100 rounded-xl">
          <p className="text-xs font-semibold text-violet-800 mb-1">Tagging Rule</p>
          <p className="text-xs text-violet-600 leading-relaxed">
            The AI only reads content tagged with{' '}
            <code className="bg-violet-100 rounded px-1 font-mono">#learning</code> or{' '}
            <code className="bg-violet-100 rounded px-1 font-mono">#agent</code>. Everything else stays private.
          </p>
        </div>
      </aside>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
        isUser ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
      }`}>
        {isUser ? 'IE' : '🧠'}
      </div>
      <div className={`max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-violet-600 text-white rounded-tr-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
        }`}>
          <MessageContent content={msg.content} />
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            <span className="text-xs text-slate-400">Sources:</span>
            {msg.sources.map((s, i) => (
              <SourceBadge key={i} source={s.source} />
            ))}
          </div>
        )}
        <span className="text-xs text-slate-400 px-1">{formatDistanceToNow(msg.timestamp, { addSuffix: true })}</span>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold">{line.replace(/\*\*/g, '')}</p>;
        }
        if (line.startsWith('> ')) {
          return <blockquote key={i} className="border-l-2 border-violet-300 pl-3 text-slate-600 italic">{line.slice(2)}</blockquote>;
        }
        const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} />;
      })}
    </div>
  );
}

function buildResponse(query: string, count: number, sample: ReturnType<typeof mockKnowledgeItems[0]['summary']['toString']> | any): string {
  const q = query.toLowerCase();
  if (q.includes('risk')) {
    return `Based on **${count} tagged learnings**, here are the active risks surfaced:\n\n**1. Cyber Vendor Gap (Risk)** — Two critical vendors lack SOC2 certification (£800K spend). 90-day window.\n\n**2. Engineering Attrition (HR)** — 14% attrition rate, 3-year high. Benchmarking due June 15.\n\n**3. GDPR Compliance (Compliance)** — Lead scoring model may breach Article 22. Legal review started.\n\n**4. Series B Milestone (Board)** — ARR must reach £8M by December. Monitor monthly.`;
  }
  if (q.includes('decision') || q.includes('week')) {
    return `Here are the key decisions tagged this week across all departments:\n\n**Marketing** — Shift 30% paid social budget from Meta to LinkedIn (18% better CPL)\n\n**Finance** — Recommend reallocation of Q1 HC underspend to H2 cloud infrastructure\n\n**Operations** — Approve full rollout of warehouse routing algo to all 8 sites (est. £1.4M saving)\n\n**Board** — £15M Series B extension approved with ARR milestone condition`;
  }
  if (q.includes('cloud') || q.includes('migration') || q.includes('it')) {
    return `**IT & Cloud Migration Status** (from tagged IT learnings):\n\nAWS migration is **6 of 9 core services complete**. Remaining 3 are blocked on legacy Oracle DB dependencies.\n\n> Estimated 6-week effort to refactor Oracle dependencies — IT team\n\n**Cost optimisation dashboard** is now live in Power BI. Cloud spend tracking is active.`;
  }
  return `I searched **${count} tagged items** for "${query}" and found the most relevant insight:\n\n> "${typeof sample === 'object' ? sample.summary : sample}"\n\nTagged by ${typeof sample === 'object' ? sample.author : 'team'} in ${typeof sample === 'object' ? departmentConfig[sample.department].label : 'a department'}.\n\nWould you like me to dig deeper into any specific area or time range?`;
}
