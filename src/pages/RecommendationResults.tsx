import { useParams, useNavigate } from 'react-router-dom';
import { useTasteProfile } from '@/hooks/useTasteProfile';
import {
  getRecommendations, getProfileSummary,
  ScoredItem, Vertical,
} from '@/lib/tasteEngine';

// ── Vertical config ─────────────────────────────────────────────────────────
const VERTICAL_META: Record<Vertical, { label: string; emoji: string; accent: string; accentBg: string; accentBorder: string }> = {
  watches: {
    label: 'Luxury Watches', emoji: '⌚',
    accent: 'text-amber-400', accentBg: 'bg-amber-500/10', accentBorder: 'border-amber-500/30',
  },
  perfumes: {
    label: 'Fragrances', emoji: '🌹',
    accent: 'text-rose-400', accentBg: 'bg-rose-500/10', accentBorder: 'border-rose-500/30',
  },
  travel: {
    label: 'Travel', emoji: '✈️',
    accent: 'text-cyan-400', accentBg: 'bg-cyan-500/10', accentBorder: 'border-cyan-500/30',
  },
  electronics: {
    label: 'Electronics', emoji: '⚡',
    accent: 'text-blue-400', accentBg: 'bg-blue-500/10', accentBorder: 'border-blue-500/30',
  },
};

const VERTICALS: Vertical[] = ['watches', 'perfumes', 'travel', 'electronics'];

// ── Match ring ───────────────────────────────────────────────────────────────
function MatchBadge({ score, accent }: { score: number; accent: string }) {
  const color = score >= 90 ? 'text-emerald-400' : score >= 80 ? 'text-amber-400' : accent;
  return (
    <div className={`text-right`}>
      <div className={`text-2xl font-bold leading-none ${color}`}>{score}%</div>
      <div className="text-zinc-600 text-[10px] mt-0.5">match</div>
    </div>
  );
}

// ── Watch card details ───────────────────────────────────────────────────────
function WatchDetails({ item }: { item: ScoredItem }) {
  if (!item.watches) return null;
  const { investmentGrade, wearOccasion, movementType, resaleStrength } = item.watches;
  const gradeColor = investmentGrade === 'A+' ? 'text-emerald-400' : investmentGrade === 'A' ? 'text-amber-400' : 'text-zinc-300';
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Chip label={`Grade ${investmentGrade}`} className={`${gradeColor} border-current/30 bg-current/10`} />
        <Chip label={wearOccasion} />
      </div>
      <div className="text-zinc-500 text-xs">{movementType}</div>
      <div className="text-zinc-400 text-xs flex items-center gap-1">
        <span className="text-emerald-500">↑</span> {resaleStrength}
      </div>
    </div>
  );
}

// ── Perfume card details ─────────────────────────────────────────────────────
function PerfumeDetails({ item }: { item: ScoredItem }) {
  if (!item.perfumes) return null;
  const { notes, bestMoments, longevity, sillage, gender } = item.perfumes;
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1">
        <Chip label={gender} />
        <Chip label={sillage} />
        <Chip label={`Longevity ${longevity}/10`} />
      </div>
      <div className="text-[10px] text-zinc-500 leading-relaxed">
        <span className="text-zinc-600">Top: </span>{notes.top.join(', ')}
        {' · '}
        <span className="text-zinc-600">Heart: </span>{notes.heart.join(', ')}
      </div>
      <div className="flex flex-wrap gap-1">
        {bestMoments.map(m => (
          <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">{m}</span>
        ))}
      </div>
    </div>
  );
}

// ── Travel card details ──────────────────────────────────────────────────────
function TravelDetails({ item }: { item: ScoredItem }) {
  if (!item.travel) return null;
  const { hiddenGemScore, energyLevel, bestFor, thingsToSkip, bestTimeToVisit } = item.travel;
  const gemColor = hiddenGemScore >= 7 ? 'text-emerald-400' : hiddenGemScore >= 5 ? 'text-amber-400' : 'text-zinc-400';
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Chip label={`${energyLevel} energy`} />
        <span className={`text-xs font-medium ${gemColor}`}>Hidden gem {hiddenGemScore}/10</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {bestFor.slice(0, 3).map(f => (
          <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{f}</span>
        ))}
      </div>
      <div className="text-[10px] text-zinc-500 leading-relaxed">
        <span className="text-zinc-600">Skip: </span>{thingsToSkip}
      </div>
      <div className="text-[10px] text-zinc-500">
        <span className="text-zinc-600">Best time: </span>{bestTimeToVisit}
      </div>
    </div>
  );
}

// ── Electronics card details ─────────────────────────────────────────────────
function ElectronicsDetails({ item }: { item: ScoredItem }) {
  if (!item.electronics) return null;
  const { category, featuresYouWill, featuresYouWont, buyerRegretRisk, threeYearCost, upgradeIn } = item.electronics;
  const riskColor = buyerRegretRisk === 'Low' ? 'text-emerald-400' : buyerRegretRisk === 'Medium' ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Chip label={category} />
        <span className={`text-xs font-medium ${riskColor}`}>Regret risk: {buyerRegretRisk}</span>
      </div>
      <div>
        <div className="text-[10px] text-zinc-600 mb-1">You'll use</div>
        <div className="flex flex-wrap gap-1">
          {featuresYouWill.slice(0, 3).map(f => (
            <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{f}</span>
          ))}
        </div>
      </div>
      <div className="text-[10px] text-zinc-500">
        <span className="text-zinc-600">3-year cost: </span>{threeYearCost}
        {' · '}
        <span className="text-zinc-600">Upgrade in: </span>{upgradeIn}
      </div>
    </div>
  );
}

function Chip({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 ${className}`}>
      {label}
    </span>
  );
}

// ── Result card ──────────────────────────────────────────────────────────────
function ResultCard({ item, vertical, featured = false }: { item: ScoredItem; vertical: Vertical; featured?: boolean }) {
  const meta = VERTICAL_META[vertical];
  return (
    <div className={`rounded-2xl border overflow-hidden bg-gradient-to-br ${item.gradient} ${featured ? 'border-zinc-600' : 'border-zinc-800'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 pr-4">
            {featured && (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase mb-2 ${meta.accentBg} ${meta.accent} border ${meta.accentBorder}`}>
                ✦ Your Best Match
              </div>
            )}
            <div className={`text-xs font-medium mb-0.5 ${meta.accent}`}>{item.brand}</div>
            <h3 className={`font-bold text-white leading-tight ${featured ? 'text-xl' : 'text-base'}`}>{item.name}</h3>
          </div>
          <MatchBadge score={item.matchScore} accent={meta.accent} />
        </div>

        <div className="text-zinc-400 text-xs italic mb-1">{item.tagline}</div>
        {featured && (
          <p className="text-zinc-500 text-xs leading-relaxed mt-1 mb-2">{item.description}</p>
        )}

        <div className="mt-2 text-zinc-300 text-sm font-semibold">{item.priceDisplay}</div>

        {/* Personalized why */}
        <div className="mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <div className="text-[10px] text-zinc-600 mb-0.5 uppercase tracking-widest">Why for you</div>
          <div className="text-zinc-300 text-xs">{item.whyYou}</div>
        </div>

        {/* Vertical-specific details */}
        {vertical === 'watches' && <WatchDetails item={item} />}
        {vertical === 'perfumes' && <PerfumeDetails item={item} />}
        {vertical === 'travel' && <TravelDetails item={item} />}
        {vertical === 'electronics' && <ElectronicsDetails item={item} />}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RecommendationResults() {
  const { vertical } = useParams<{ vertical: string }>();
  const navigate = useNavigate();
  const { profile, clearProfile } = useTasteProfile();

  const v = (vertical as Vertical) || 'watches';
  const meta = VERTICAL_META[v] || VERTICAL_META.watches;

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-white mb-2">No taste profile yet</h2>
        <p className="text-zinc-400 text-sm mb-6">Take the 10-question quiz to get your matched results.</p>
        <button
          onClick={() => navigate(`/recommendations/quiz?vertical=${v}`)}
          className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
        >
          Build my profile →
        </button>
      </div>
    );
  }

  const results = getRecommendations(profile, v);
  const profileSummary = getProfileSummary(profile);
  const [top, ...rest] = results;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/recommendations')} className="text-zinc-500 hover:text-zinc-300 text-sm">
          ← Home
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.emoji}</span>
          <span className={`font-semibold text-sm ${meta.accent}`}>{meta.label}</span>
        </div>
        <button onClick={() => navigate(`/recommendations/quiz?vertical=${v}`)} className="text-zinc-600 hover:text-zinc-400 text-xs">
          Retake
        </button>
      </div>

      {/* Profile summary */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {profileSummary.map(tag => (
            <span key={tag} className={`text-[10px] px-2.5 py-1 rounded-full border ${meta.accentBg} ${meta.accent} ${meta.accentBorder}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Vertical switcher */}
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {VERTICALS.map(vert => {
            const m = VERTICAL_META[vert];
            const isActive = vert === v;
            return (
              <button
                key={vert}
                onClick={() => navigate(`/recommendations/${vert}`)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  isActive
                    ? `${m.accentBg} ${m.accent} ${m.accentBorder}`
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {m.emoji} {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pb-28 space-y-4 max-w-lg mx-auto">
        {/* Top match */}
        {top && <ResultCard item={top} vertical={v} featured />}

        {/* Divider */}
        {rest.length > 0 && (
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-zinc-900" />
            <span className="text-zinc-600 text-xs">Also matched for you</span>
            <div className="flex-1 h-px bg-zinc-900" />
          </div>
        )}

        {/* Rest */}
        {rest.map(item => (
          <ResultCard key={item.id} item={item} vertical={v} />
        ))}

        {/* Reset */}
        <div className="pt-4 text-center">
          <button
            onClick={() => { clearProfile(); navigate('/recommendations'); }}
            className="text-zinc-600 hover:text-zinc-400 text-xs underline underline-offset-2"
          >
            Clear taste profile & start over
          </button>
        </div>
      </div>
    </div>
  );
}
