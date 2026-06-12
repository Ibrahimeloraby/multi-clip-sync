import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useKnowledgeItems, useKnowledgeStats, useUpdateItemStatus, useAddKnowledgeItem } from '@/hooks/useKnowledgeItems';
import { useConnectedSources, useUpdateSourceStatus } from '@/hooks/useConnectedSources';
import { departmentConfig } from '@/data/mockData';
import SourceBadge from '@/components/hub/SourceBadge';
import KnowledgeCard from '@/components/hub/KnowledgeCard';
import type { Department, TagType, SourceType } from '@/types/knowledge';

type Tab = 'overview' | 'sources' | 'users' | 'content' | 'simulator';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Overview',       icon: '📊' },
  { id: 'sources',    label: 'Sources',         icon: '🔌' },
  { id: 'content',    label: 'Content Review',  icon: '🔍' },
  { id: 'users',      label: 'Users & Roles',   icon: '👥' },
  { id: 'simulator',  label: 'Tag Simulator',   icon: '🏷️' },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xl">⚙️</div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Admin Panel</h1>
          <p className="text-xs text-slate-500">Manage sources, review content, configure access</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'overview'   && <OverviewTab />}
      {tab === 'sources'    && <SourcesTab />}
      {tab === 'content'    && <ContentTab />}
      {tab === 'users'      && <UsersTab />}
      {tab === 'simulator'  && <SimulatorTab />}
    </div>
  );
}

// ─── OVERVIEW ───────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats } = useKnowledgeStats();
  const { data: sources } = useConnectedSources();
  const { data: pending } = useKnowledgeItems({ status: 'pending' });

  const connectedCount = sources?.filter(s => s.status === 'connected').length ?? 0;
  const departments = Object.entries(departmentConfig);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Learnings', value: stats?.total ?? '—', color: 'text-violet-600', icon: '🧠' },
          { label: 'Agent Actions', value: stats?.agentCount ?? '—', color: 'text-emerald-600', icon: '⚡' },
          { label: 'Pending Review', value: stats?.pendingCount ?? '—', color: 'text-amber-600', icon: '🔍' },
          { label: 'Active Sources', value: connectedCount, color: 'text-blue-600', icon: '🔌' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>{s.icon}</span>
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {pending && pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-sm font-semibold text-amber-800">{pending.length} items pending review</p>
          </div>
          <div className="space-y-3">
            {pending.map(item => <KnowledgeCard key={item.id} item={item} />)}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-slate-900 text-sm mb-3">Department Health</h3>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Department</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Learnings</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Agent Actions</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map(([key, cfg]) => (
                <tr key={key} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-2 font-medium ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700 font-medium">{cfg.learningCount}</td>
                  <td className="px-4 py-2.5 text-right text-violet-600 font-medium">{cfg.agentCount}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400 text-xs">
                    {formatDistanceToNow(cfg.lastActivity, { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── SOURCES ─────────────────────────────────────────────────────────────────

function SourcesTab() {
  const { data: sources, isLoading } = useConnectedSources();
  const updateStatus = useUpdateSourceStatus();

  if (isLoading) return <div className="text-center py-8 text-slate-400 text-sm">Loading sources…</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Connect your data sources below. Once connected, employees can tag any content with
        <code className="bg-slate-100 rounded px-1 mx-1 font-mono">#learning</code> or
        <code className="bg-slate-100 rounded px-1 font-mono">#agent</code> to feed the knowledge hub.
      </p>
      {(sources ?? []).map(source => {
        const statusCfg = {
          connected:    { label: 'Connected',    dot: 'bg-emerald-500', badge: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
          pending:      { label: 'Pending',      dot: 'bg-amber-500',   badge: 'text-amber-700 border-amber-200 bg-amber-50' },
          disconnected: { label: 'Disconnected', dot: 'bg-slate-300',   badge: 'text-slate-500 border-slate-200 bg-slate-50' },
        }[source.status];

        return (
          <div key={source.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4">
            <div className="shrink-0 mt-0.5"><SourceBadge source={source.type} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-medium text-slate-900 text-sm">{source.label}</span>
                <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
                {source.status === 'connected' && (
                  <span className="text-xs text-slate-400">{source.itemsTagged.toLocaleString()} tagged · synced {formatDistanceToNow(source.lastSync, { addSuffix: true })}</span>
                )}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-500 font-medium mb-0.5">Employee instruction</p>
                <p className="text-xs text-slate-700">{source.tagInstruction}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {source.status !== 'connected' ? (
                <button
                  onClick={() => updateStatus.mutate({ id: source.id, status: 'connected' })}
                  disabled={updateStatus.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-50 transition-colors"
                >
                  Connect
                </button>
              ) : (
                <button
                  onClick={() => updateStatus.mutate({ id: source.id, status: 'disconnected' })}
                  disabled={updateStatus.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CONTENT REVIEW ──────────────────────────────────────────────────────────

function ContentTab() {
  const { data: pending } = useKnowledgeItems({ status: 'pending' });
  const { data: rejected } = useKnowledgeItems({ status: 'rejected' });
  const updateStatus = useUpdateItemStatus();
  const [view, setView] = useState<'pending' | 'rejected'>('pending');

  const items = view === 'pending' ? pending : rejected;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setView('pending')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${view === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Pending Review ({pending?.length ?? 0})
        </button>
        <button
          onClick={() => setView('rejected')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${view === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Rejected ({rejected?.length ?? 0})
        </button>
      </div>

      {!items?.length ? (
        <div className="text-center py-12 bg-white border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400 text-sm">
            {view === 'pending' ? 'No items pending review' : 'No rejected items'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id}>
              <KnowledgeCard item={item} />
              <div className="flex gap-2 mt-2 justify-end">
                {view === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus.mutate({ id: item.id, status: 'rejected' })}
                      disabled={updateStatus.isPending}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => updateStatus.mutate({ id: item.id, status: 'active' })}
                      disabled={updateStatus.isPending}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                  </>
                )}
                {view === 'rejected' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: item.id, status: 'active' })}
                    disabled={updateStatus.isPending}
                    className="text-xs px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 font-medium disabled:opacity-50 transition-colors"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── USERS ───────────────────────────────────────────────────────────────────

const mockUsers = [
  { email: 'sarah.chen@company.com',    name: 'Sarah Chen',     dept: 'marketing',   role: 'contributor' },
  { email: 'james.okafor@company.com',  name: 'James Okafor',   dept: 'sales',       role: 'contributor' },
  { email: 'priya.nair@company.com',    name: 'Priya Nair',     dept: 'finance',     role: 'contributor' },
  { email: 'maya.patel@company.com',    name: 'Maya Patel',     dept: 'hr',          role: 'contributor' },
  { email: 'tom.richards@company.com',  name: 'Tom Richards',   dept: 'operations',  role: 'contributor' },
  { email: 'aisha.m@company.com',       name: 'Aisha Mohammed', dept: 'procurement', role: 'contributor' },
  { email: 'rachel.f@company.com',      name: 'Rachel Foster',  dept: 'compliance',  role: 'admin' },
  { email: 'daniel.wu@company.com',     name: 'Daniel Wu',      dept: 'risk',        role: 'contributor' },
  { email: 'kevin.t@company.com',       name: 'Kevin Torres',   dept: 'it',          role: 'contributor' },
  { email: 'admin@company.com',         name: 'Admin',          dept: null,          role: 'admin' },
];

function UsersTab() {
  const [users, setUsers] = useState(mockUsers);

  function updateRole(email: string, role: string) {
    setUsers(prev => prev.map(u => u.email === email ? { ...u, role } : u));
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Assign roles to control what each user can contribute and access. <strong>Admin</strong> can manage sources and review content. <strong>Contributor</strong> can tag items. <strong>Viewer</strong> can only read.
      </p>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">User</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Department</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => {
              const dept = user.dept ? departmentConfig[user.dept] : null;
              return (
                <tr key={user.email} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold">
                        {user.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-xs">{user.name}</p>
                        <p className="text-slate-400 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {dept ? (
                      <span className={`text-xs font-medium ${dept.color}`}>{dept.icon} {dept.label}</span>
                    ) : (
                      <span className="text-xs text-slate-400">All</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={e => updateRole(user.email, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-violet-400"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="contributor">Contributor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TAG SIMULATOR ───────────────────────────────────────────────────────────

const departments: Department[] = ['marketing','sales','finance','hr','operations','procurement','compliance','risk','board','it'];
const sources: SourceType[] = ['teams','zoom','slack','email','pdf','powerbi','sharepoint','confluence','jira'];

function SimulatorTab() {
  const addItem = useAddKnowledgeItem();
  const [form, setForm] = useState({
    content: '',
    tag: '#learning' as TagType,
    source: 'slack' as SourceType,
    department: 'marketing' as Department,
    author: '',
  });
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim() || !form.author.trim()) return;

    await addItem.mutateAsync({
      content: form.content,
      summary: form.content.slice(0, 140),
      tag: form.tag,
      source: form.source,
      department: form.department,
      author: form.author,
      citations: [`${form.source.charAt(0).toUpperCase() + form.source.slice(1)}: Manual entry`],
      keyTopics: [],
    });

    setSuccess(true);
    setForm(f => ({ ...f, content: '', author: '' }));
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <h3 className="font-semibold text-violet-900 mb-1">Tag Simulator</h3>
        <p className="text-xs text-violet-700 leading-relaxed">
          Simulate what happens when an employee tags content in any connected source. This creates a real knowledge item in the database that the AI brain can query immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1.5">Tag</label>
            <div className="flex gap-2">
              {(['#learning', '#agent'] as TagType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tag: t }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                    form.tag === t
                      ? t === '#agent' ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1.5">Source</label>
            <select
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value as SourceType }))}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-violet-400"
            >
              {sources.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1.5">Department</label>
          <select
            value={form.department}
            onChange={e => setForm(f => ({ ...f, department: e.target.value as Department }))}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-violet-400"
          >
            {departments.map(d => (
              <option key={d} value={d}>{departmentConfig[d].icon} {departmentConfig[d].label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1.5">Tagged by</label>
          <input
            type="text"
            value={form.author}
            onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
            placeholder="Your name"
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1.5">Content with tag</label>
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder={`e.g. "We decided to switch our cloud provider to AWS. Migration starts Q3. ${form.tag}"`}
            rows={4}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-400 transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={addItem.isPending || !form.content.trim() || !form.author.trim()}
          className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {addItem.isPending ? 'Adding to brain…' : `Add to Knowledge Hub as ${form.tag}`}
        </button>

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <p className="text-emerald-700 text-sm font-medium">Added to the knowledge hub. AI brain can now query it.</p>
          </div>
        )}
      </form>
    </div>
  );
}
