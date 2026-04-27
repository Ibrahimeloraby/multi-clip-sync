import type { ContentItem, UserProfile, ScoredItem, AlgorithmId, MoodId } from './types'
import { MOODS } from './registry'
import * as math from './math'

// ── Core scoring pipeline ──────────────────────────────────────────────────

export function scoreItems(
  items: ContentItem[],
  user: UserProfile,
  algorithmId: AlgorithmId,
  opts: {
    seedItem?: ContentItem
    mood?: MoodId
    durationMinutes?: number
    limit?: number
  } = {}
): ScoredItem[] {
  const scoreFn = ALGORITHM_SCORERS[algorithmId]
  if (!scoreFn) return []

  const scored = items
    .map(item => scoreFn(item, user, opts))
    .filter(Boolean) as ScoredItem[]

  // Deduplicate + sort
  const seen = new Set<string>()
  const unique = scored.filter(s => {
    if (seen.has(s.item.id)) return false
    seen.add(s.item.id)
    return true
  })

  unique.sort((a, b) => b.score - a.score)

  // MMR diversity pass — prevents near-identical items clustering at top
  return math.mmrRerank(unique, 0.25, opts.limit ?? 20)
}

// ── Per-algorithm scorer functions ────────────────────────────────────────

type ScorerFn = (
  item: ContentItem,
  user: UserProfile,
  opts: { seedItem?: ContentItem; mood?: MoodId; durationMinutes?: number }
) => ScoredItem | null

const ALGORITHM_SCORERS: Record<AlgorithmId, ScorerFn> = {

  surprise_me(item, user, _opts) {
    const tasteScore = math.tasteAffinity(item, user)
    const novelty = 1 - math.familiarity(item, user)
    // High taste + high novelty = good surprise
    const score = 0.55 * tasteScore + 0.45 * novelty
    if (score < 0.3) return null
    return {
      item, score, reason: 'Matches your taste but takes you somewhere new', algorithmId: 'surprise_me'
    }
  },

  hidden_gems(item, user, _opts) {
    if ((item.popularity ?? 100) > 25) return null  // exclude mainstream
    if ((item.voteCount ?? 0) < 20) return null      // need enough ratings
    const tasteScore = math.tasteAffinity(item, user)
    const qualityScore = math.wilsonScore(item.rating ?? 0, item.voteCount ?? 0)
    const obscurityBonus = 1 - ((item.popularity ?? 25) / 100)
    const score = 0.45 * tasteScore + 0.35 * qualityScore + 0.20 * obscurityBonus
    if (score < 0.25) return null
    return {
      item, score,
      reason: `Rated ${item.rating?.toFixed(1)} by ${item.voteCount?.toLocaleString()} viewers — almost nobody has heard of it`,
      algorithmId: 'hidden_gems'
    }
  },

  trending_now(item, user, _opts) {
    const tasteScore = math.tasteAffinity(item, user)
    const trendScore = math.trendingScore(item)
    if (trendScore < 0.1) return null
    const score = 0.5 * trendScore + 0.5 * tasteScore
    return {
      item, score,
      reason: 'Gaining traction this week and matches your taste',
      algorithmId: 'trending_now'
    }
  },

  more_like_this(item, user, { seedItem }) {
    if (!seedItem || item.id === seedItem.id) return null
    const similarity = math.contentSimilarity(item, seedItem)
    if (similarity < 0.2) return null
    return {
      item, score: similarity,
      reason: `Similar tone and feel to "${seedItem.title}"`,
      algorithmId: 'more_like_this'
    }
  },

  my_taste(item, user, _opts) {
    const score = math.collaborativeScore(item, user)
    if (score < 0.2) return null
    return {
      item, score,
      reason: 'People with your exact taste pattern loved this',
      algorithmId: 'my_taste'
    }
  },

  quick_wins(item, user, _opts) {
    const confidence = math.predictionConfidence(item, user)
    const taste = math.tasteAffinity(item, user)
    // Only surface items where confidence AND taste are both high
    if (confidence < 0.6 || taste < 0.5) return null
    const score = 0.5 * confidence + 0.5 * taste
    return {
      item, score,
      reason: 'The algorithm is highly confident you\'ll enjoy this',
      algorithmId: 'quick_wins'
    }
  },

  mood_match(item, user, { mood }) {
    if (!mood) return null
    const moodOption = MOODS.find(m => m.id === mood)
    if (!moodOption) return null
    const moodFit = math.moodFitScore(item, moodOption)
    const taste = math.tasteAffinity(item, user)
    if (moodFit < 0.3) return null
    const score = 0.6 * moodFit + 0.4 * taste
    return {
      item, score,
      reason: `Matches your ${moodOption.label.toLowerCase()} mood`,
      algorithmId: 'mood_match'
    }
  },

  deep_dive(item, user, _opts) {
    // Score highest for genres/artists user has only lightly sampled (1-3 items)
    const genreExploration = math.genreExplorationScore(item, user)
    const quality = math.wilsonScore(item.rating ?? 0, item.voteCount ?? 0)
    if (genreExploration < 0.3) return null
    const score = 0.6 * genreExploration + 0.4 * quality
    return {
      item, score,
      reason: `A great entry point into ${item.genres?.[0] ?? 'a new territory'} for you`,
      algorithmId: 'deep_dive'
    }
  },

  all_time_greats(item, user, _opts) {
    if ((item.year ?? 2024) > new Date().getFullYear() - 3) return null // must be 3+ years old
    if ((item.voteCount ?? 0) < 500) return null
    const timelessScore = math.timelessScore(item)
    const taste = math.tasteAffinity(item, user)
    if (timelessScore < 0.6) return null
    const score = 0.6 * timelessScore + 0.4 * taste
    return {
      item, score,
      reason: `Sustained ${item.rating?.toFixed(1)}/10 rating over ${new Date().getFullYear() - (item.year ?? 2010)}+ years`,
      algorithmId: 'all_time_greats'
    }
  },

  new_and_rising(item, user, _opts) {
    const ageMonths = math.ageInMonths(item)
    if (ageMonths > 3 || ageMonths < 0) return null
    const taste = math.tasteAffinity(item, user)
    const velocity = math.trendingScore(item)
    if (velocity < 0.15) return null
    const score = 0.4 * velocity + 0.4 * taste + 0.2 * math.wilsonScore(item.rating ?? 0, item.voteCount ?? 0)
    return {
      item, score,
      reason: `Released ${Math.round(ageMonths * 4)} weeks ago and already gaining real momentum`,
      algorithmId: 'new_and_rising'
    }
  },

  crowd_favourite(item, user, _opts) {
    const crowdScore = math.wilsonScore(item.rating ?? 0, item.voteCount ?? 0)
    const taste = math.tasteAffinity(item, user)
    if (crowdScore < 0.55 || (item.voteCount ?? 0) < 100) return null
    const score = 0.65 * crowdScore + 0.35 * taste
    return {
      item, score,
      reason: `${item.voteCount?.toLocaleString()} genuine reviews back this up`,
      algorithmId: 'crowd_favourite'
    }
  },

  comfort_rewatch(item, user, _opts) {
    // Maximum exploitation — only the safest, most certain predictions
    const taste = math.tasteAffinity(item, user)
    const genreMatch = math.genreMatchScore(item, user)
    if (taste < 0.65 || genreMatch < 0.5) return null
    const score = 0.7 * taste + 0.3 * genreMatch
    return {
      item, score,
      reason: 'Strongly aligned with your proven taste — a near-certain hit',
      algorithmId: 'comfort_rewatch'
    }
  },

  world_content(item, user, _opts) {
    const userLanguages = user.preferredLanguages ?? ['en']
    // Exclude user's own language content
    if (userLanguages.includes(item.language ?? 'en')) return null
    const taste = math.tasteAffinity(item, user)
    const quality = math.wilsonScore(item.rating ?? 0, item.voteCount ?? 0)
    if (taste < 0.25 || quality < 0.4) return null
    const score = 0.5 * taste + 0.5 * quality
    return {
      item, score,
      reason: `From ${item.country ?? 'abroad'} — the same feel you love, from somewhere new`,
      algorithmId: 'world_content'
    }
  },

  right_now(item, user, { durationMinutes }) {
    if (!durationMinutes || !item.durationMinutes) return null
    const diff = Math.abs(item.durationMinutes - durationMinutes)
    if (diff > 12) return null  // ±12 min tolerance
    const taste = math.tasteAffinity(item, user)
    const fitBonus = 1 - diff / 12
    const score = 0.7 * taste + 0.3 * fitBonus
    return {
      item, score,
      reason: `${item.durationMinutes} min — fits perfectly in your window`,
      algorithmId: 'right_now'
    }
  },

  the_wildcard(item, user, _opts) {
    // Invert the taste score — we want items farthest from normal preferences
    const antiTaste = 1 - math.tasteAffinity(item, user)
    const quality = math.wilsonScore(item.rating ?? 0, item.voteCount ?? 0)
    if (antiTaste < 0.6 || quality < 0.5) return null  // must still be high quality
    const score = 0.5 * antiTaste + 0.5 * quality
    return {
      item, score,
      reason: 'Completely outside your usual territory — deliberately so',
      algorithmId: 'the_wildcard'
    }
  },
}
