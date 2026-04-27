import type { ContentItem, Platform } from '../engine/types'

const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p/w500'

// API key is read from env — replace with your key or proxy endpoint
const API_KEY = import.meta.env.VITE_TMDB_KEY ?? 'demo'

async function tmdb(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('language', 'en-US')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

function mapMovie(raw: any, platform: Platform = 'netflix'): ContentItem {
  return {
    id: `tmdb-movie-${raw.id}`,
    externalId: String(raw.id),
    platform,
    contentType: 'movie',
    title: raw.title ?? raw.original_title,
    subtitle: raw.director,
    description: raw.overview,
    imageUrl: raw.poster_path ? `${IMG_BASE}${raw.poster_path}` : '',
    year: raw.release_date ? parseInt(raw.release_date.slice(0, 4)) : undefined,
    rating: raw.vote_average,
    voteCount: raw.vote_count,
    genres: raw.genres?.map((g: any) => g.name.toLowerCase()) ?? raw.genre_ids ?? [],
    popularity: raw.popularity ? Math.min(raw.popularity, 100) : undefined,
    language: raw.original_language,
    durationMinutes: raw.runtime,
    deepLink: `nflx://www.netflix.com/title/${raw.id}`,
    webUrl: `https://www.netflix.com/title/${raw.id}`,
  }
}

function mapTV(raw: any, platform: Platform = 'netflix'): ContentItem {
  return {
    id: `tmdb-tv-${raw.id}`,
    externalId: String(raw.id),
    platform,
    contentType: 'tv',
    title: raw.name ?? raw.original_name,
    description: raw.overview,
    imageUrl: raw.poster_path ? `${IMG_BASE}${raw.poster_path}` : '',
    year: raw.first_air_date ? parseInt(raw.first_air_date.slice(0, 4)) : undefined,
    rating: raw.vote_average,
    voteCount: raw.vote_count,
    genres: raw.genres?.map((g: any) => g.name.toLowerCase()) ?? [],
    popularity: raw.popularity ? Math.min(raw.popularity, 100) : undefined,
    language: raw.original_language,
    durationMinutes: raw.episode_run_time?.[0],
    deepLink: `nflx://www.netflix.com/title/${raw.id}`,
    webUrl: `https://www.netflix.com/title/${raw.id}`,
  }
}

// ── Public catalog fetchers ────────────────────────────────────────────────

export async function fetchTrending(type: 'movie' | 'tv' | 'all' = 'all'): Promise<ContentItem[]> {
  const data = await tmdb(`/trending/${type}/week`)
  return data.results.map((r: any) => r.media_type === 'tv' ? mapTV(r) : mapMovie(r))
}

export async function fetchTopRated(type: 'movie' | 'tv' = 'movie'): Promise<ContentItem[]> {
  const data = await tmdb(`/${type}/top_rated`)
  return data.results.map((r: any) => type === 'tv' ? mapTV(r) : mapMovie(r))
}

export async function fetchPopular(type: 'movie' | 'tv' = 'movie'): Promise<ContentItem[]> {
  const data = await tmdb(`/${type}/popular`)
  return data.results.map((r: any) => type === 'tv' ? mapTV(r) : mapMovie(r))
}

export async function fetchNowPlaying(): Promise<ContentItem[]> {
  const data = await tmdb('/movie/now_playing')
  return data.results.map(mapMovie)
}

export async function fetchByGenre(genreId: number, type: 'movie' | 'tv' = 'movie'): Promise<ContentItem[]> {
  const data = await tmdb(`/discover/${type}`, {
    with_genres: String(genreId),
    sort_by: 'vote_average.desc',
    'vote_count.gte': '200',
  })
  return data.results.map((r: any) => type === 'tv' ? mapTV(r) : mapMovie(r))
}

export async function fetchSimilar(tmdbId: string, type: 'movie' | 'tv' = 'movie'): Promise<ContentItem[]> {
  const data = await tmdb(`/${type}/${tmdbId}/similar`)
  return data.results.map((r: any) => type === 'tv' ? mapTV(r) : mapMovie(r))
}

export async function searchContent(query: string): Promise<ContentItem[]> {
  const data = await tmdb('/search/multi', { query })
  return data.results
    .filter((r: any) => r.media_type !== 'person')
    .map((r: any) => r.media_type === 'tv' ? mapTV(r) : mapMovie(r))
    .slice(0, 10)
}

// TMDB genre IDs for reference
export const TMDB_GENRES = {
  action: 28, adventure: 12, animation: 16, comedy: 35,
  crime: 80, documentary: 99, drama: 18, family: 10751,
  fantasy: 14, history: 36, horror: 27, music: 10402,
  mystery: 9648, romance: 10749, 'sci-fi': 878, thriller: 53,
  western: 37,
}
