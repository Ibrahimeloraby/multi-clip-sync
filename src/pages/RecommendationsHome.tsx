import { useNavigate } from 'react-router-dom';
import { useTasteProfile } from '@/hooks/useTasteProfile';
import { Vertical } from '@/lib/tasteEngine';

const verticals: {
  id: Vertical;
  name: string;
  subtitle: string;
  gradient: string;
  border: string;
  accent: string;
  badge: string;
  emoji: string;
  uniqueValue: string[];
}[] = [
  {
    id: 'watches',
    name: 'Luxury Watches',
    subtitle: 'From entry Rolex to ultra-rare independent',
    gradient: 'from-amber-950/60 to-slate-950',
    border: 'border-amber-900/40 hover:border-amber-500/60',
    accent: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emoji: '⌚',
    uniqueValue: ['Investment grade ratings', 'Resale strength index', 'Personalized wear context'],
  },
  {
    id: 'perfumes',
    name: 'Fragrances',
    subtitle: 'Niche houses to iconic maisons',
    gradient: 'from-rose-950/60 to-slate-950',
    border: 'border-rose-900/40 hover:border-rose-500/60',
    accent: 'text-rose-400',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    emoji: '🌹',
    uniqueValue: ['Note-by-note plain English', 'Best moments to wear', 'Sillage & longevity decoded'],
  },
  {
    id: 'travel',
    name: 'Travel',
    subtitle: 'Hidden gems to iconic destinations',
    gradient: 'from-cyan-950/60 to-slate-950',
    border: 'border-cyan-900/40 hover:border-cyan-500/60',
    accent: 'text-cyan-400',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    emoji: '✈️',
    uniqueValue: ['Hidden gem score', 'What to skip (tourist traps)', 'Best time for your energy'],
  },
  {
    id: 'electronics',
    name: 'Electronics',
    subtitle: 'Smartphones to professional gear',
    gradient: 'from-blue-950/60 to-slate-950',
    border: 'border-blue-900/40 hover:border-blue-500/60',
    accent: 'text-blue-400',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emoji: '⚡',
    uniqueValue: ['Features you\'ll actually use', 'Buyer regret risk score', '3-year true cost'],
  },
];

export default function RecommendationsHome() {
  const navigate = useNavigate();
  const { profile } = useTasteProfile();

  const handleVerticalClick = (id: Vertical) => {
    if (profile) {
      navigate(`/recommendations/${id}`);
    } else {
      navigate(`/recommendations/quiz?vertical=${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6 tracking-widest uppercase">
          Taste Engine
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
          Your Taste.<br />Your Results.
        </h1>
        <p className="text-zinc-400 text-base max-w-xs mx-auto leading-relaxed">
          Answer 10 questions once. Get precision-matched recommendations across every category — for life.
        </p>
        {profile ? (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Your taste profile is active
            <button
              onClick={() => navigate('/recommendations/quiz')}
              className="ml-2 text-zinc-500 hover:text-zinc-300 text-xs underline underline-offset-2"
            >
              Retake
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/recommendations/quiz')}
            className="mt-6 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
          >
            Build my taste profile →
          </button>
        )}
      </div>

      {/* Verticals */}
      <div className="px-4 pb-24 space-y-3 max-w-lg mx-auto">
        {verticals.map((v) => (
          <button
            key={v.id}
            onClick={() => handleVerticalClick(v.id)}
            className={`w-full text-left rounded-2xl border bg-gradient-to-br ${v.gradient} ${v.border} p-5 transition-all duration-200 active:scale-[0.98]`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{v.emoji}</span>
                  <span className={`text-lg font-semibold ${v.accent}`}>{v.name}</span>
                </div>
                <p className="text-zinc-400 text-sm">{v.subtitle}</p>
              </div>
              <span className="text-zinc-600 text-xl mt-1">›</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {v.uniqueValue.map((val) => (
                <span key={val} className={`text-[10px] px-2 py-0.5 rounded-full border ${v.badge}`}>
                  {val}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Footer note */}
      <div className="pb-8 text-center px-6">
        <p className="text-zinc-600 text-xs leading-relaxed max-w-xs mx-auto">
          Your profile is stored locally on your device. We never share your data.
        </p>
      </div>
    </div>
  );
}
