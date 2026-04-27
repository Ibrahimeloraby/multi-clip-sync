import { useSearchParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, Settings2 } from 'lucide-react'
import { ALGORITHM_MAP } from '../engine/registry'
import { scoreItems } from '../engine/scoring'
import { ContentCard } from '../components/ContentCard'
import { useUserStore } from '../store/userStore'
import { fetchTrending, fetchTopRated, fetchPopular, fetchNowPlaying } from '../integrations/tmdb'
import type { ScoredItem, AlgorithmId, MoodId } from '../engine/types'
import { cn } from '../lib/utils'

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden">
      <div className="aspect-[2/3] bg-surface-raised animate-shimmer bg-gradient-to-r from-surface-raised via-surface-border to-surface-raised bg-[length:200%_100%]" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-surface-raised rounded animate-shimmer bg-gradient-to-r from-surface-raised via-surface-border to-surface-raised bg-[length:200%_100%]" />
        <div className="h-3 bg-surface-raised rounded w-2/3 animate-shimmer bg-gradient-to-r from-surface-raised via-surface-border to-surface-raised bg-[length:200%_100%]" />
      </div>
    </div>
  )
}

export default function Results() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { profile, recordInteraction } = useUserStore()

  const algorithmId = params.get('algorithm') as AlgorithmId
  const moodParam = params.get('mood') as MoodId | null
  const durationParam = params.get('duration') ? parseInt(params.get('duration')!) : undefined

  const alg = ALGORITHM_MAP[algorithmId]
  const [results, setResults] = useState<ScoredItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!alg || !profile) return
    setLoading(true)

    async function load() {
      try {
        // Fetch content from TMDB based on algorithm type
        let rawItems = []

        if (algorithmId === 'trending_now' || algorithmId === 'new_and_rising') {
          rawItems = await fetchTrending('all')
        } else if (algorithmId === 'all_time_greats' || algorithmId === 'crowd_favourite') {
          const [movies, tv] = await Promise.all([fetchTopRated('movie'), fetchTopRated('tv')])
          rawItems = [...movies, ...tv]
        } else if (algorithmId === 'right_now') {
          const [movies, tv] = await Promise.all([fetchPopular('movie'), fetchPopular('tv')])
          rawItems = [...movies, ...tv]
        } else {
          const [trending, popular] = await Promise.all([fetchTrending('all'), fetchPopular('movie')])
          rawItems = [...trending, ...popular]
        }

        // Deduplicate
        const seen = new Set<string>()
        const unique = rawItems.filter(item => {
          if (seen.has(item.id)) return false
          seen.add(item.id)
          return true
        })

        const scored = scoreItems(unique, profile, algorithmId, {
          mood: moodParam ?? undefined,
          durationMinutes: durationParam,
          limit: 20,
        })

        setResults(scored)
      } catch (err) {
        console.error('Failed to load recommendations', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [algorithmId, moodParam, durationParam, profile?.id, refreshKey])

  if (!alg) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-surface pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-surface-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl hover:bg-surface-raised transition-colors text-white/50 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{alg.emoji}</span>
              <h1 className="font-bold text-white text-base truncate">{alg.name}</h1>
              {moodParam && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-light shrink-0">
                  {moodParam}
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 truncate">{alg.tagline}</p>
          </div>

          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 rounded-xl hover:bg-surface-raised transition-colors text-white/50 hover:text-white"
            title="Refresh picks"
          >
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </button>

          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl hover:bg-surface-raised transition-colors text-white/50 hover:text-white"
            title="Change algorithm"
          >
            <Settings2 size={16} />
          </button>
        </div>

        {/* Algorithm explanation bar */}
        <div className={cn('h-0.5 bg-gradient-to-r', alg.gradient)} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* How it works pill */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 rounded-xl bg-surface-card border border-surface-border"
        >
          <p className="text-xs text-white/45 leading-relaxed">
            <span className="text-white/60 font-medium">What you're getting: </span>
            {alg.description}
          </p>
        </motion.div>

        {/* Results count */}
        {!loading && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-sm text-white/30 mb-4"
          >
            {results.length} picks for you
            {durationParam && ` · under ${durationParam} minutes`}
          </motion.p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array(6).fill(null).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🤔</div>
            <p className="text-white/50 mb-2">Not enough data yet for this algorithm</p>
            <p className="text-sm text-white/30">Interact with more content to improve results</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90"
            >
              Try a different algorithm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 tv:grid-cols-5 tv:gap-6">
            {results.map((item, i) => (
              <ContentCard
                key={item.item.id}
                item={item}
                index={i}
                onInteract={(itemId, type) => {
                  recordInteraction({ itemId, type: type as any, timestamp: Date.now(), algorithmUsed: algorithmId })
                }}
              />
            ))}
          </div>
        )}

        {/* Change algorithm nudge */}
        {!loading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-white/30 mb-3">Not the right vibe?</p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl border border-surface-border text-sm text-white/50 hover:text-white hover:border-surface-raised transition-all"
            >
              Switch algorithm →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
