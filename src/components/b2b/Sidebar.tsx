import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  CheckSquare,
  Mail,
  Package,
  Building2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { to: '/b2b', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/b2b/deals', label: 'Deal Pipeline', icon: TrendingUp },
  { to: '/b2b/proposals', label: 'Proposals', icon: FileText, badge: '3' },
  { to: '/b2b/approvals', label: 'Approvals', icon: CheckSquare, badge: '2', badgeVariant: 'destructive' as const },
  { to: '/b2b/outreach', label: 'AI Outreach', icon: Mail, ai: true },
  { to: '/b2b/catalog', label: 'Product Catalog', icon: Package },
  { to: '/b2b/companies', label: 'Companies', icon: Building2 },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col border-r border-slate-800">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">DealForge</div>
            <div className="text-xs text-slate-400">B2B Offering Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-3">
          Workspace
        </div>
        {NAV_ITEMS.map(({ to, label, icon: Icon, badge, badgeVariant, ai, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {ai && (
              <span className="text-xs bg-violet-600/30 text-violet-300 px-1.5 py-0.5 rounded font-medium">
                AI
              </span>
            )}
            {badge && (
              <Badge
                variant={badgeVariant ?? 'secondary'}
                className={cn(
                  'text-xs h-5 min-w-5 flex items-center justify-center',
                  !badgeVariant && 'bg-slate-700 text-slate-300'
                )}
              >
                {badge}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User / AI status */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold">
            AM
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Alex Morgan</div>
            <div className="text-xs text-slate-400 truncate">alex@company.com</div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </aside>
  );
}
