import { formatDistanceToNow } from 'date-fns';
import { useConnectedSources, useUpdateSourceStatus } from '@/hooks/useConnectedSources';
import SourceBadge from '@/components/hub/SourceBadge';

export default function SourcesPage() {
  const { data: sources, isLoading } = useConnectedSources();
  const updateStatus = useUpdateSourceStatus();

  const connected = (sources ?? []).filter(s => s.status === 'connected');
  const totalTagged = connected.reduce((s, c) => s + c.itemsTagged, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Data Sources</h1>
        <p className="text-xs text-slate-500 mt-0.5">Connect your tools and use #learning or #agent to feed the brain</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{connected.length}</div>
          <div className="text-xs text-slate-500">Sources Active</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-violet-600">{totalTagged.toLocaleString()}</div>
          <div className="text-xs text-slate-500">Items Tagged</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-700">84</div>
          <div className="text-xs text-slate-500">Contributors</div>
        </div>
      </div>

      {/* Golden rule */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-2">The Golden Rule</h2>
        <p className="text-violet-100 text-sm leading-relaxed max-w-2xl">
          The AI brain <strong>only reads</strong> what is explicitly tagged. This keeps knowledge clean, prevents noise, and ensures privacy. Train your team: if it's worth remembering as a company — tag it.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <code className="text-emerald-300 font-mono font-bold text-sm">#learning</code>
            <p className="text-white/80 text-xs mt-1.5 leading-relaxed">A decision, finding, or insight worth remembering. Stored and indexed under the relevant department.</p>
            <p className="text-violet-200 text-xs mt-2 italic">"LinkedIn CPL dropped 18% after retargeting. #learning"</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <code className="text-violet-300 font-mono font-bold text-sm">#agent</code>
            <p className="text-white/80 text-xs mt-1.5 leading-relaxed">Something needing a recommendation, action, or follow-up from the AI agent.</p>
            <p className="text-violet-200 text-xs mt-2 italic">"Lost Nordex deal due to SAP gap — need playbook. #agent"</p>
          </div>
        </div>
      </div>

      {/* Sources */}
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-900 text-sm">Connected Sources</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          (sources ?? []).map(source => {
            const statusCfg = {
              connected:    { label: 'Connected',    dot: 'bg-emerald-500', badge: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
              pending:      { label: 'Pending',      dot: 'bg-amber-500',   badge: 'text-amber-700 border-amber-200 bg-amber-50' },
              disconnected: { label: 'Disconnected', dot: 'bg-slate-300',   badge: 'text-slate-500 border-slate-200 bg-slate-50' },
            }[source.status];

            return (
              <div key={source.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4">
                <div className="shrink-0 mt-0.5"><SourceBadge source={source.type} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-slate-900 text-sm">{source.label}</span>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-2">
                    <p className="text-xs text-slate-500 font-medium mb-0.5">How to tag in {source.label}</p>
                    <p className="text-xs text-slate-700">{source.tagInstruction}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {source.status === 'connected' ? (
                    <>
                      <p className="text-lg font-bold text-slate-900">{source.itemsTagged.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">tagged items</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {source.lastSync && source.lastSync.getTime() > 0
                          ? `Synced ${formatDistanceToNow(source.lastSync, { addSuffix: true })}`
                          : 'Never synced'}
                      </p>
                    </>
                  ) : (
                    <button
                      onClick={() => updateStatus.mutate({ id: source.id, status: 'connected' })}
                      disabled={updateStatus.isPending}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-50 transition-colors"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
