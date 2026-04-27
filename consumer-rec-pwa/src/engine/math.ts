import type { ContentItem, UserProfile, ScoredItem } from './types'

// ── Wilson Lower Bound Score ───────────────────────────────────────────────
// Bayesian confidence interval for a 0-10 rating scale normalised to [0,1]
export function wilsonScore(rating: number, voteCount: number, z = 1.96): number {
  if (voteCount === 0) return 0
  const p = rating / 10
  const n = voteCount
  const denom = 1 + (z * z) / n
  const centre = p + (z * z) / (2 * n)
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return Math.max(0, (centre - margin) / denom)
}

// ── Time decay (exponential, 24h half-life) ────────────────────────────────
export function timeDecay(timestamp: number, halfLifeHours = 24): number {
  const hoursAgo = (Date.now() - timestamp) / 3_600_000
  return Math.exp(-(Math.log(2) / halfLifeHours) * hoursAgo)
}

// ── Trending score ─────────────────────────────────────────────────────────
export function trendingScore(item: ContentItem): number {
  const quality = wilsonScore(item.rating ?? 5, item.voteCount ?? 0)
  const decay = timeDecay(item.year
    ? new Date(item.year, 0).getTime()
    : Date.now(), 24 * 30)
  const velocity = Math.min((item.popularity ?? 0) / 100, 1)
  return 0.4 * quality + 0.35 * decay + 0.25 * velocity
}

// ── Content similarity (TF-IDF proxy using genre/tag overlap) ─────────────
export function contentSimilarity(a: ContentItem, b: ContentItem): number {
  const aSet = new Set([...(a.genres ?? []), ...(a.tags ?? [])])
  const bSet = new Set([...(b.genres ?? []), ...(b.tags ?? [])])
  const intersection = [...aSet].filter(x => bSet.has(x)).length
  const union = new Set([...aSet, ...bSet]).size
  const jaccardScore = union === 0 ? 0 : intersection / union

  // Bonus for same language
  const langBonus = a.language === b.language ? 0.1 : 0
  // Bonus for similar rating tier
  const ratingDiff = Math.abs((a.rating ?? 5) - (b.rating ?? 5))
  const ratingBonus = ratingDiff < 1 ? 0.1 : 0

  return Math.min(jaccardScore + langBonus + ratingBonus, 1)
}

// ── Taste affinity ─────────────────────────────────────────────────────────
// How well does this item match what the user has historically liked?
export function tasteAffinity(item: ContentItem, user: UserProfile): number {
  const liked = user.interactions.filter(i => ['like', 'finish', 'save'].includes(i.type))
  const disliked = user.interactions.filter(i => ['dislike', 'skip'].includes(i.type))

  if (liked.length === 0) {
    // Cold user — use genre preferences if set
    const prefMatch = user.likedGenres.filter(g => (item.genres ?? []).includes(g)).length
    return prefMatch > 0 ? 0.5 + prefMatch * 0.1 : 0.3
  }

  const genreMatch = genreMatchScore(item, user)
  const langMatch = user.preferredLanguages.includes(item.language ?? 'en') ? 0.1 : 0
  const typeMatch = user.preferredContentTypes.includes(item.contentType) ? 0.1 : 0

  return Math.min(0.8 * genreMatch + langMatch + typeMatch, 1)
}

// ── Genre match ────────────────────────────────────────────────────────────
export function genreMatchScore(item: ContentItem, user: UserProfile): number {
  const likedGenres = new Set(user.likedGenres)
  const dislikedGenres = new Set(user.dislikedGenres)
  const itemGenres = item.genres ?? []
  if (itemGenres.length === 0) return 0.4 // neutral for untagged
  const liked = itemGenres.filter(g => likedGenres.has(g)).length
  const disliked = itemGenres.filter(g => dislikedGenres.has(g)).length
  if (disliked > 0) return 0
  return Math.min(liked / itemGenres.length + 0.2, 1)
}

// ── Collaborative score (simplified cosine similarity proxy) ──────────────
export function collaborativeScore(item: ContentItem, user: UserProfile): number {
  // Without a full matrix, we use genre + quality as a proxy
  const genreMatch = genreMatchScore(item, user)
  const quality = wilsonScore(item.rating ?? 5, item.voteCount ?? 0)
  return 0.6 * genreMatch + 0.4 * quality
}

// ── Prediction confidence ──────────────────────────────────────────────────
// Higher when the user has more history AND the item has more votes
export function predictionConfidence(item: ContentItem, user: UserProfile): number {
  const userHistoryWeight = Math.min(user.interactions.length / 50, 1)
  const itemVoteWeight = Math.min((item.voteCount ?? 0) / 1000, 1)
  const genreMatch = genreMatchScore(item, user)
  return 0.4 * userHistoryWeight + 0.3 * itemVoteWeight + 0.3 * genreMatch
}

// ── Mood fit ───────────────────────────────────────────────────────────────
export function moodFitScore(item: ContentItem, mood: { genres: string[]; keywords: string[] }): number {
  const moodGenres = new Set(mood.genres)
  const itemGenres = item.genres ?? []
  const genreOverlap = itemGenres.filter(g => moodGenres.has(g)).length / Math.max(itemGenres.length, 1)

  const tagText = [...(item.tags ?? []), item.description ?? ''].join(' ').toLowerCase()
  const keywordMatches = mood.keywords.filter(k => tagText.includes(k)).length
  const keywordScore = Math.min(keywordMatches / mood.keywords.length, 1)

  return 0.6 * genreOverlap + 0.4 * keywordScore
}

// ── Genre exploration score ────────────────────────────────────────────────
// High score for genres user has barely touched (1-3 items)
export function genreExplorationScore(item: ContentItem, user: UserProfile): number {
  const genreCounts: Record<string, number> = {}
  user.interactions.forEach(i => {
    // In a real app, we'd look up the item's genres from a store
    // Here we use a simple proxy
    genreCounts['_total'] = (genreCounts['_total'] ?? 0) + 1
  })

  const itemGenres = item.genres ?? []
  if (itemGenres.length === 0) return 0.3

  // Prefer items where user has 1-5 interactions in that genre
  const genreMatch = genreMatchScore(item, user)
  const lightExplorer = genreMatch > 0.1 && genreMatch < 0.5
  return lightExplorer ? 0.4 + genreMatch : genreMatch * 0.3
}

// ── Timeless score ─────────────────────────────────────────────────────────
export function timelessScore(item: ContentItem): number {
  const ageYears = new Date().getFullYear() - (item.year ?? 2020)
  const ageFactor = Math.min(ageYears / 10, 1) // older = more timeless
  const quality = wilsonScore(item.rating ?? 5, item.voteCount ?? 0)
  return 0.5 * quality + 0.5 * ageFactor
}

// ── Familiarity (how well does user know this?) ────────────────────────────
export function familiarity(item: ContentItem, user: UserProfile): number {
  const interacted = user.interactions.some(i => i.itemId === item.id)
  if (interacted) return 1
  const genreMatch = genreMatchScore(item, user)
  return genreMatch * 0.5
}

// ── Age in months ──────────────────────────────────────────────────────────
export function ageInMonths(item: ContentItem): number {
  if (!item.year) return 999
  const yearStart = new Date(item.year, 0).getTime()
  return (Date.now() - yearStart) / (1000 * 60 * 60 * 24 * 30)
}

// ── MMR Reranking ──────────────────────────────────────────────────────────
// Maximal Marginal Relevance — balances relevance with diversity
export function mmrRerank(items: ScoredItem[], lambda: number, topK: number): ScoredItem[] {
  if (items.length <= topK) return items
  const selected: ScoredItem[] = []
  const remaining = [...items]

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = 0
    let bestMmr = -Infinity

    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].score
      const maxSim = selected.length === 0 ? 0 : Math.max(
        ...selected.map(s => contentSimilarity(remaining[i].item, s.item))
      )
      const mmr = lambda * relevance - (1 - lambda) * maxSim
      if (mmr > bestMmr) { bestMmr = mmr; bestIdx = i }
    }

    selected.push(remaining[bestIdx])
    remaining.splice(bestIdx, 1)
  }

  return selected
}
