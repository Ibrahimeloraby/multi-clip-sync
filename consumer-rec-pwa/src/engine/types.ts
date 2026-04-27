// ── Content types ──────────────────────────────────────────────────────────

export type ContentType = 'movie' | 'tv' | 'music' | 'podcast' | 'book' | 'product'

export type Platform = 'netflix' | 'disney' | 'prime' | 'hbo' | 'spotify' | 'youtube' | 'apple_music' | 'amazon_shop'

export interface ContentItem {
  id: string
  externalId: string        // TMDB / Spotify / ASIN id
  platform: Platform
  contentType: ContentType
  title: string
  subtitle?: string         // artist, director, brand
  description?: string
  imageUrl: string
  year?: number
  rating?: number           // 0–10
  voteCount?: number
  genres?: string[]
  tags?: string[]
  durationMinutes?: number
  popularity?: number       // 0–100 platform popularity score
  language?: string
  country?: string
  deepLink: string          // opens directly in native app
  webUrl?: string
  isHidden?: boolean        // low popularity flag
}

// ── User interaction ───────────────────────────────────────────────────────

export type InteractionType = 'view' | 'click' | 'watch' | 'finish' | 'skip' | 'like' | 'dislike' | 'save' | 'share' | 'purchase'

export interface UserInteraction {
  itemId: string
  type: InteractionType
  value?: number            // rating 1-5 or watch % complete
  timestamp: number
  algorithmUsed?: AlgorithmId
}

export interface UserProfile {
  id: string
  connectedPlatforms: Platform[]
  interactions: UserInteraction[]
  likedGenres: string[]
  dislikedGenres: string[]
  preferredLanguages: string[]
  preferredContentTypes: ContentType[]
  lastMood?: MoodId
  lastAlgorithm?: AlgorithmId
  createdAt: number
}

// ── Algorithm definitions ──────────────────────────────────────────────────

export type AlgorithmId =
  | 'surprise_me'
  | 'hidden_gems'
  | 'trending_now'
  | 'more_like_this'
  | 'my_taste'
  | 'quick_wins'
  | 'mood_match'
  | 'deep_dive'
  | 'all_time_greats'
  | 'new_and_rising'
  | 'crowd_favourite'
  | 'comfort_rewatch'
  | 'world_content'
  | 'right_now'
  | 'the_wildcard'

export type AlgorithmCategory = 'discover' | 'popular' | 'personal' | 'context'

export type MoodId = 'chill' | 'excited' | 'nostalgic' | 'focused' | 'social' | 'dark' | 'uplifted' | 'curious'

export interface MoodOption {
  id: MoodId
  emoji: string
  label: string
  genres: string[]
  keywords: string[]
}

export interface AlgorithmDefinition {
  id: AlgorithmId
  emoji: string
  name: string
  tagline: string               // One bold line — the hook
  description: string           // 2 sentences — what the user actually gets
  howItWorks: string            // Simple plain-English AI explanation
  category: AlgorithmCategory
  categoryLabel: string
  gradient: string              // Tailwind gradient classes for the card
  accentColor: string           // hex for glow effects
  vibes: string[]               // mood tags shown as pills
  requiresSeed: boolean         // needs user to pick a seed item
  requiresMood: boolean         // needs mood selection
  requiresDuration: boolean     // needs time input
  bestFor: ContentType[]
  badgeText?: string            // e.g. "New" "Popular"
  explorationLevel: 1 | 2 | 3  // 1=safe 2=balanced 3=adventurous
}

export interface AlgorithmInput {
  algorithmId: AlgorithmId
  user: UserProfile
  seedItemId?: string
  mood?: MoodId
  durationMinutes?: number
  contentTypes: ContentType[]
  platforms: Platform[]
  limit: number
}

export interface ScoredItem {
  item: ContentItem
  score: number
  reason: string              // human-readable explanation shown under the card
  algorithmId: AlgorithmId
}
