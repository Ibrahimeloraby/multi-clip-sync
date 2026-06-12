import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { departmentConfig } from '@/data/mockData';
import { useKnowledgeStats } from '@/hooks/useKnowledgeItems';
import type { Department } from '@/types/knowledge';

const departments: Department[] = [
  'marketing','sales','finance','hr','operations',
  'procurement','compliance','risk','board','it',
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { data: stats } = useKnowledgeStats();

  const session = (() => {
    try { return JSON.parse(localStorage.getItem('hub_session') ?? '{}'); }
    catch { return {}; }
  })();

  const initials = session.email
    ? session.email.split('@')[0].slice(0, 2).toUpperCase()
    : 'IE';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-slate-900 flex flex-col transition-all duration-200 shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm">🧠</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">KnowledgeHub</p>
              <p className="text-slate-400 text-xs truncate">Corporate AI Brain</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="ml-auto text-slate-400 hover:text-white transition-colors shrink-0 text-xs"
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          <NavItem to="/hub" icon="🏠" label="Dashboard" collapsed={collapsed} end />
          <NavItem to="/hub/chat" icon="🧠" label="AI Brain" collapsed={collapsed} highlight />
          <NavItem to="/hub/feed" icon="📡" label="Live Feed" collapsed={collapsed} />
          <NavItem to="/hub/sources" icon="🔌" label="Sources" collapsed={collapsed} />
          <NavItem to="/hub/admin" icon="⚙️" label="Admin" collapsed={collapsed} />

          {!collapsed && (
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-2 pt-4 pb-1">
              Departments
            </p>
          )}
          {collapsed && <div className="border-t border-slate-700 my-2" />}

          {departments.map(dept => {
            const cfg = departmentConfig[dept];
            return (
              <NavItem
                key={dept}
                to={`/hub/dept/${dept}`}
                icon={cfg.icon}
                label={cfg.label}
                badge={cfg.learningCount}
                collapsed={collapsed}
              />
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-medium truncate">{session.email ?? 'Admin'}</p>
                <p className="text-slate-400 text-xs">Admin</p>
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold mx-auto">
              {initials}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <BreadcrumbTitle path={location.pathname} />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-700 font-medium">Live sync</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {(stats?.total ?? 1024).toLocaleString()} tagged learnings
            </div>
            {stats?.pendingCount ? (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                <span className="text-xs text-amber-700 font-medium">{stats.pendingCount} pending</span>
              </div>
            ) : null}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  to, icon, label, badge, collapsed, highlight, end,
}: {
  to: string; icon: string; label: string; badge?: number;
  collapsed?: boolean; highlight?: boolean; end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-violet-600 text-white'
            : highlight
            ? 'text-violet-300 hover:bg-slate-800 hover:text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      <span className="text-base shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && (
            <span className="text-xs text-slate-500 font-medium tabular-nums">{badge}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

const pathLabels: Record<string, string> = {
  hub: 'Dashboard', chat: 'AI Brain', feed: 'Live Feed', sources: 'Data Sources', admin: 'Admin Panel',
  ...Object.fromEntries(Object.entries(departmentConfig).map(([k, v]) => [k, v.label])),
};

function BreadcrumbTitle({ path }: { path: string }) {
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  const label = pathLabels[last] ?? last;
  return (
    <h1 className="text-slate-900 font-semibold text-sm capitalize">{label}</h1>
  );
}
