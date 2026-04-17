import { PLATFORMS } from "@/lib/platforms";
import type { ContentItem } from "@/agent/types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// TMDB genre IDs mapped to each mood
const MOOD_GENRES: Record<string, { movie: number[]; tv: number[] }> = {
  excited:          { movie: [28, 12, 878, 53],       tv: [10759, 10765, 10768] },
  happy:            { movie: [35, 10751, 10402, 16],  tv: [35, 10751, 16] },
  "slow burn":      { movie: [18, 9648, 10749],       tv: [18, 9648] },
  mystery:          { movie: [9648, 80, 53],           tv: [9648, 80, 18] },
  thriller:         { movie: [53, 80, 27, 9648],       tv: [80, 9648, 18] },
  dramatic:         { movie: [18, 36, 10752, 10749],  tv: [18, 10768, 10759] },
  "romantic comedy":{ movie: [10749, 35],             tv: [10749, 35] },
  comedy:           { movie: [35, 16, 10751],         tv: [35, 16] },
  action:           { movie: [28, 12, 80, 10752],     tv: [10759, 10768, 80] },
  horror:           { movie: [27, 53],                tv: [27, 9648, 18] },
};

function getMoodGenres(mood: string, type: "movie" | "tv"): number[] {
  return MOOD_GENRES[mood.toLowerCase()]?.[type] ?? [18];
}

export function getPosterUrl(path: string | null, size = "w342"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size = "w780"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

interface TMDBMovieResult {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
}

interface TMDBTVResult {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  genre_ids: number[];
}

interface TMDBGenre {
  id: number;
  name: string;
}

// Fetch genre list (cached at module level)
let movieGenres: TMDBGenre[] = [];
let tvGenres: TMDBGenre[] = [];

async function loadGenres(apiKey: string): Promise<void> {
  if (movieGenres.length && tvGenres.length) return;
  const [m, t] = await Promise.all([
    fetch(`${TMDB_BASE}/genre/movie/list?api_key=${apiKey}`).then((r) => r.json()),
    fetch(`${TMDB_BASE}/genre/tv/list?api_key=${apiKey}`).then((r) => r.json()),
  ]);
  movieGenres = m.genres ?? [];
  tvGenres = t.genres ?? [];
}

function resolveGenres(ids: number[], type: "movie" | "tv"): string[] {
  const list = type === "movie" ? movieGenres : tvGenres;
  return ids.map((id) => list.find((g) => g.id === id)?.name).filter(Boolean) as string[];
}

async function discoverTMDB(
  mood: string,
  type: "movie" | "tv",
  apiKey: string,
  page = 1
): Promise<(TMDBMovieResult | TMDBTVResult)[]> {
  const genres = getMoodGenres(mood, type);
  const params = new URLSearchParams({
    api_key: apiKey,
    with_genres: genres.join(","),
    sort_by: "popularity.desc",
    "vote_count.gte": "100",
    "vote_average.gte": "5",
    page: String(page),
  });
  const endpoint = type === "movie" ? "discover/movie" : "discover/tv";
  const res = await fetch(`${TMDB_BASE}/${endpoint}?${params}`);
  if (!res.ok) throw new Error(`TMDB ${type} discover failed: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

async function getWatchProviders(
  tmdbId: number,
  type: "movie" | "tv",
  apiKey: string,
  region: string
): Promise<number[]> {
  try {
    const res = await fetch(
      `${TMDB_BASE}/${type}/${tmdbId}/watch/providers?api_key=${apiKey}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const regionData = data.results?.[region];
    if (!regionData) return [];
    // Combine flatrate (subscription) and free providers
    const providers = [
      ...(regionData.flatrate ?? []),
      ...(regionData.free ?? []),
      ...(regionData.ads ?? []),
    ];
    return [...new Set(providers.map((p: { provider_id: number }) => p.provider_id))];
  } catch {
    return [];
  }
}

export async function fetchContentForMood(
  mood: string,
  activePlatformIds: string[],
  region: string,
  apiKey: string
): Promise<ContentItem[]> {
  await loadGenres(apiKey);

  const userTmdbProviderIds = activePlatformIds
    .map((id) => PLATFORMS.find((p) => p.id === id)?.tmdbProviderId)
    .filter((id): id is number => id !== undefined);

  // Fetch movies and TV shows in parallel (2 pages each)
  const [moviesP1, moviesP2, tvP1, tvP2] = await Promise.all([
    discoverTMDB(mood, "movie", apiKey, 1),
    discoverTMDB(mood, "movie", apiKey, 2),
    discoverTMDB(mood, "tv", apiKey, 1),
    discoverTMDB(mood, "tv", apiKey, 2),
  ]);

  const movies = [...moviesP1, ...moviesP2] as TMDBMovieResult[];
  const tvShows = [...tvP1, ...tvP2] as TMDBTVResult[];

  // Check provider availability for each item (batch, limit concurrent requests)
  const processItem = async (
    item: TMDBMovieResult | TMDBTVResult,
    type: "movie" | "tv"
  ): Promise<ContentItem | null> => {
    const isMovie = type === "movie";
    const movie = item as TMDBMovieResult;
    const tv = item as TMDBTVResult;

    // Skip if watch providers check not needed (no platforms connected)
    let availablePlatforms: Array<{ id: string; name: string }> = [];
    if (userTmdbProviderIds.length > 0) {
      const providerIds = await getWatchProviders(item.id, type, apiKey, region);
      const matchingIds = providerIds.filter((id) => userTmdbProviderIds.includes(id));
      if (matchingIds.length === 0) return null;
      availablePlatforms = matchingIds
        .map((tmdbId) => {
          const platform = PLATFORMS.find((p) => p.tmdbProviderId === tmdbId);
          return platform ? { id: platform.id, name: platform.name } : null;
        })
        .filter((p): p is { id: string; name: string } => p !== null);
    }

    return {
      tmdb_id: item.id,
      content_type: type,
      title: isMovie ? movie.title : tv.name,
      overview: item.overview,
      poster_path: item.poster_path,
      release_date: isMovie ? movie.release_date : tv.first_air_date,
      vote_average: item.vote_average,
      genres: resolveGenres(item.genre_ids, type),
      available_platforms: availablePlatforms,
    };
  };

  // Process in batches of 8 to avoid rate limiting
  const allItems = [
    ...movies.slice(0, 20).map((m) => ({ item: m, type: "movie" as const })),
    ...tvShows.slice(0, 20).map((t) => ({ item: t, type: "tv" as const })),
  ];

  const results: ContentItem[] = [];
  const batchSize = 8;

  for (let i = 0; i < allItems.length; i += batchSize) {
    const batch = allItems.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(({ item, type }) => processItem(item, type))
    );
    results.push(...batchResults.filter((r): r is ContentItem => r !== null));
  }

  return results;
}
