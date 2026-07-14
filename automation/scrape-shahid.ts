/**
 * Shahid MBC Full Library Scraper — Wayback Machine edition
 *
 * Cloudflare hard-blocks all cloud IPs from accessing shahid.mbc.net directly.
 * Solution: The Internet Archive (archive.org) has snapshots of Shahid pages
 * with __NEXT_DATA__ embedded by Next.js SSR. archive.org doesn't block cloud IPs.
 *
 * Three phases:
 *  1. Direct API  — kept as a first-pass; always returns 403 from cloud IPs
 *  2. Wayback pages — fetches multi-year snapshots of section listing pages
 *  3. Wayback CDX  — enumerates all individual content URLs ever archived,
 *                    fetches their detail pages for richer metadata + images
 */

import * as fs   from 'fs';
import * as path from 'path';
import { URL }   from 'url';

// ── Config ─────────────────────────────────────────────────────────────────

const BASE        = 'https://shahid.mbc.net';
const OUTPUT_DIR  = path.join(process.cwd(), 'automation', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'shahid-data.json');
const DEBUG_FILE  = path.join(OUTPUT_DIR, 'scrape-debug.json');
const WAYBACK     = 'https://web.archive.org';

// Listing pages — fetch multiple yearly snapshots to get a broad catalog
const LISTING_PAGES = [
  `${BASE}/en`,
  `${BASE}/en/series`,
  `${BASE}/en/movies`,
  `${BASE}/en/programs`,
  `${BASE}/en/kids`,
  `${BASE}/en/trending`,
  `${BASE}/en/free`,
  `${BASE}/en/landingpages/turkishseries`,
  `${BASE}/en/ramadan2026`,
  `${BASE}/en/ramadan2025`,
  `${BASE}/en/ramadan2024`,
  `${BASE}/ar/series`,
  `${BASE}/ar/movies`,
  `${BASE}/ar/programs`,
  `${BASE}/ar/kids`,
  `${BASE}/ar/trending`,
];

// Years to sample — gives content from different catalog eras
const SNAPSHOT_YEARS = ['2026', '2025', '2024', '2023', '2022'];

// Direct API paths (always 403 from cloud but keeps the code path alive)
const API_PATHS = [
  '/api/v2/page/home?language=en',
  '/api/v2/page/series?language=en&limit=48',
  '/api/v2/page/movies?language=en&limit=48',
  '/api/v2/content/series?language=en&page=1&limit=48',
  '/api/v2/content/series?language=en&page=2&limit=48',
  '/api/v2/content/movies?language=en&page=1&limit=48',
  '/api/v2/content/trending?language=en&page=1&limit=48',
];

// Broad CDX patterns for individual content detail pages
const CDX_PATTERNS = [
  // Series detail pages  (e.g. /en/series/al-hayba/12345/season1)
  'shahid.mbc.net/en/series/*/*',
  // Movie detail pages   (e.g. /en/movie/some-movie/12345)
  'shahid.mbc.net/en/movie/*/*',
  // Program detail pages (e.g. /en/program/some-show/12345)
  'shahid.mbc.net/en/program/*/*',
  // Arabic equivalents
  'shahid.mbc.net/ar/series/*/*',
  'shahid.mbc.net/ar/movie/*/*',
];

// ── Types ──────────────────────────────────────────────────────────────────

export interface ContentItem {
  id:          string;
  title:       string;
  titleAr:     string;
  type:        string;
  genres:      string[];
  moods:       string[];
  keywords:    string[];
  year?:       number;
  rating?:     string;
  episodes?:   number;
  seasons?:    number;
  duration?:   number;
  poster:      string;
  hero:        string;
  description: string;
  isNew?:      boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  language?:   string;
  country?:    string;
  source:      string;
}

interface DebugEntry {
  url:      string;
  method:   string;
  status:   number;
  snapshot: string;
  items:    number;
  error?:   string;
}

// ── Utilities ──────────────────────────────────────────────────────────────

const sleep     = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const ensureDir = (d: string)  => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
};

const API_HEADERS: Record<string, string> = {
  'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept':        'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':       `${BASE}/en/`,
  'x-app-version': '10.0.0',
  'x-platform':    'web',
};

async function fetchText(url: string, headers: Record<string, string>, ms = 35000): Promise<{ status: number; text: string; finalUrl: string }> {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), ms);
  try {
    const res  = await fetch(url, { headers, signal: ctrl.signal, redirect: 'follow' });
    const text = await res.text();
    return { status: res.status, text, finalUrl: res.url };
  } catch {
    return { status: 0, text: '', finalUrl: url };
  } finally {
    clearTimeout(tid);
  }
}

async function fetchJson(url: string, headers: Record<string, string>, ms = 20000): Promise<{ status: number; body: unknown }> {
  const { status, text } = await fetchText(url, headers, ms);
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* keep null */ }
  return { status, body };
}

// ── Noise filter ───────────────────────────────────────────────────────────

// Short numeric IDs (< 8 digits) are genre tags, subscription tiers, etc.
// Hex UUIDs (e.g. 6811d444a0e845001662) are page configuration blobs.
// Real content has 6+ digit numeric IDs with a description OR an image.
const NOISE_TITLES = new Set([
  'action','drama','comedy','romance','thriller','horror','adventure','mystery',
  'animation','fantasy','documentary','reality','romance','sci-fi','sci fi',
  'historical','kids','children','family','vip','free','trending','new',
  'arabic','egyptian','turkish','indian','series','movies','programs','kids',
  'trailers','clips','episodes','promos','from the set','behind the scenes',
  'الحلقات','إعلانات ترويجية','من وراء المشهد','مقاطع','برومو',
  'أكشن','دراما','كوميدي','رومانسي','إثارة','رعب','مغامرة','غموض',
]);

function isRealContent(id: string, title: string, o: Record<string, unknown>): boolean {
  // Hex UUID → page config object
  if (/^[0-9a-f]{16,}$/i.test(id) && !/^\d+$/.test(id)) return false;
  // Pure numeric but very short → genre/category tag
  if (/^\d+$/.test(id) && id.length < 5) return false;
  // Title is a known noise word
  if (NOISE_TITLES.has(title.toLowerCase().trim())) return false;
  // No title at all
  if (!title.trim()) return false;
  // Must have at least one signal of being real video content
  const hasDescription = typeof o.description === 'string' && (o.description as string).length > 20;
  const hasYear        = typeof o.year === 'number' || typeof o.releaseYear === 'number';
  const hasDuration    = typeof o.duration === 'number' && (o.duration as number) > 0;
  const hasEpisodes    = typeof o.totalEpisodes === 'number' || typeof o.episodeCount === 'number';
  const hasSeasons     = typeof o.seasonCount === 'number';
  const longNumericId  = /^\d{6,}$/.test(id);  // real Shahid IDs are 6-15 digits
  return hasDescription || hasYear || hasDuration || hasEpisodes || hasSeasons || longNumericId;
}

// ── Content model ──────────────────────────────────────────────────────────

function inferMoods(genres: string[], kws: string[]): string[] {
  const all = [...genres, ...kws].map(s => s.toLowerCase());
  const m: string[] = [];
  if (all.some(s => /comedy|funny|humor|sitcom/.test(s)))           m.push('funny', 'lighthearted');
  if (all.some(s => /romance|romantic|love/.test(s)))               m.push('romantic');
  if (all.some(s => /action|adventure/.test(s)))                    m.push('exciting', 'adventurous');
  if (all.some(s => /thrill|suspense/.test(s)))                     m.push('thrilling', 'tense');
  if (all.some(s => /horror|scary|supernatural|ghost/.test(s)))     m.push('scary', 'thrilling');
  if (all.some(s => /drama|emotional/.test(s)))                     m.push('emotional', 'dramatic');
  if (all.some(s => /histor|period|epic/.test(s)))                  m.push('epic', 'inspiring');
  if (all.some(s => /mystery|crime|detective/.test(s)))             m.push('mysterious', 'tense');
  if (all.some(s => /family|kids|children|anim/.test(s)))           m.push('family', 'heartwarming');
  if (all.some(s => /sci.fi|fantasy|future/.test(s)))               m.push('epic', 'thought-provoking');
  if (all.some(s => /music|singing|talent|compet/.test(s)))         m.push('inspiring', 'musical');
  if (all.some(s => /social|society|issue/.test(s)))                m.push('thought-provoking', 'dramatic');
  if (all.some(s => /war|battle|military/.test(s)))                 m.push('epic', 'dramatic');
  return [...new Set(m)];
}

function normalizeType(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('movie') || s.includes('film'))                    return 'movie';
  if (s.includes('series') || s.includes('show') || s.includes('drama')) return 'series';
  if (s.includes('program') || s.includes('talk'))                  return 'program';
  if (s.includes('kid') || s.includes('child') || s.includes('anim')) return 'kids';
  if (s.includes('channel') || s.includes('live'))                  return 'live';
  return s || 'series';
}

function unwayback(url: string): string {
  // Strip Wayback Machine wrapper:  .../web/20250101000000/https://imgcdn.shahid... → https://imgcdn.shahid...
  const m = url.match(/web\.archive\.org\/web\/\d+[^/]*\/(https?:\/\/[^\s"'<>]+)/);
  return m ? m[1] : url;
}

function extractImage(o: Record<string, unknown>): string {
  // Shahid-specific field names observed in their API/Next.js data
  const keys = [
    'imageMain','imagePoster','imageAlt','imageHero','imageSquare','imageThumb',
    'thumbnailVerticalUrl','thumbnailHorizontalUrl','thumbnailVertical','thumbnailHorizontal',
    'thumbnailUrl','imageUrl','posterUrl','coverUrl','thumbnail','image','poster',
    'coverImage','horizontalImage','verticalImage','squareImage','smallImage','mediumImage',
    // Nested image objects
    'images','photos','media',
  ];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.startsWith('http') && v.length > 10) return unwayback(v);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      // e.g. { main: "https://...", thumb: "https://..." }
      for (const vv of Object.values(v as Record<string, unknown>)) {
        if (typeof vv === 'string' && vv.startsWith('http')) return unwayback(vv);
      }
    }
  }
  return '';
}

function extractHero(o: Record<string, unknown>, fallback: string): string {
  const keys = ['imageHero','heroImage','bannerImage','landscapeImage','horizontalImage',
                 'backgroundImage','wideImage','coverWide','thumbnailHorizontal','thumbnailHorizontalUrl'];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.startsWith('http')) return unwayback(v);
    if (v && typeof v === 'object') {
      for (const vv of Object.values(v as Record<string, unknown>)) {
        if (typeof vv === 'string' && vv.startsWith('http')) return unwayback(vv);
      }
    }
  }
  return fallback;
}

function buildItem(o: Record<string, unknown>, source: string): ContentItem | null {
  const id      = String(o.id ?? o.contentId ?? o.seriesId ?? o.movieId ?? o.programId ?? o.channelId ?? '');
  const title   = String(o.title ?? o.titleEn ?? o.name ?? o.nameEn ?? '');
  const titleAr = String(o.titleAr ?? o.nameAr ?? o.arabicTitle ?? o.titleAR ?? o.titleArab ?? '');

  if (!isRealContent(id, title || titleAr, o)) return null;

  const rawGenres = (
    Array.isArray(o.genres)     ? o.genres :
    Array.isArray(o.genre)      ? o.genre  :
    Array.isArray(o.categories) ? o.categories : []
  ).map((g: unknown) =>
    typeof g === 'string' ? g : String((g as Record<string,unknown>)?.name ?? (g as Record<string,unknown>)?.title ?? '')
  ).filter(Boolean) as string[];

  // Filter genre-only entries from genres list (keep real ones)
  const genres = rawGenres.filter(g => g.length > 2 && !(/^\d+$/.test(g)));

  const keywords = (Array.isArray(o.tags) ? o.tags : Array.isArray(o.keywords) ? o.keywords : [])
    .map(String).filter(Boolean);

  let poster = extractImage(o);
  if (!poster) {
    // Generate a visually distinct placeholder per title
    const seed = encodeURIComponent((title || titleAr).slice(0, 15));
    poster = `https://placehold.co/300x450/0f172a/3B82F6?text=${seed}`;
  }
  const hero = extractHero(o, poster);

  return {
    id, title, titleAr,
    type:        normalizeType(o.type ?? o.contentType ?? o.videoType ?? o.programType),
    genres,
    moods:       inferMoods(genres, keywords),
    keywords,
    year:        typeof o.year === 'number' ? o.year : typeof o.releaseYear === 'number' ? o.releaseYear : undefined,
    rating:      String(o.ageRating ?? o.contentRating ?? o.rating ?? ''),
    episodes:    typeof o.totalEpisodes === 'number' ? o.totalEpisodes : typeof o.episodeCount === 'number' ? o.episodeCount : undefined,
    seasons:     typeof o.seasonCount === 'number' ? o.seasonCount : undefined,
    duration:    typeof o.duration === 'number' ? o.duration : undefined,
    poster, hero,
    description: String(o.description ?? o.synopsis ?? o.shortDescription ?? o.longDescription ?? ''),
    isNew:       !!(o.isNew ?? o.new),
    isTrending:  !!(o.isTrending ?? o.trending),
    isFeatured:  !!(o.isFeatured ?? o.featured),
    language:    String(o.language ?? o.audioLanguage ?? o.mainLanguage ?? ''),
    country:     String(o.country ?? o.countryOfOrigin ?? o.productionCountry ?? ''),
    source,
  };
}

function walkExtract(obj: unknown, source: string, out: ContentItem[], depth = 0) {
  if (depth > 30 || !obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const v of obj) walkExtract(v, source, out, depth + 1);
    return;
  }
  const o = obj as Record<string, unknown>;
  if (o.id && (o.title || o.titleEn || o.name || o.titleAr || o.nameAr)) {
    const item = buildItem(o, source);
    if (item) out.push(item);
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object') walkExtract(v, source, out, depth + 1);
  }
}

function deduplicate(items: ContentItem[]): ContentItem[] {
  const map = new Map<string, ContentItem>();
  for (const item of items) {
    const key = item.id || `${item.title}::${item.titleAr}::${item.type}`;
    const ex  = map.get(key);
    if (!ex) { map.set(key, item); continue; }
    const merged = { ...ex };
    for (const k of Object.keys(item) as (keyof ContentItem)[]) {
      const v = item[k];
      if (!v) continue;
      if (Array.isArray(v) && Array.isArray(merged[k])) {
        (merged[k] as string[]) = [...new Set([...(merged[k] as string[]), ...(v as string[])])];
      } else if (!merged[k]) {
        (merged as Record<string, unknown>)[k] = v;
      }
    }
    // Prefer real poster over placeholder
    if (item.poster && !item.poster.includes('placehold.co') && ex.poster.includes('placehold.co')) {
      merged.poster = item.poster;
    }
    map.set(key, merged);
  }
  return [...map.values()];
}

function extractFromHtml(html: string, source: string, out: ContentItem[]) {
  // 1. __NEXT_DATA__ (richest source — Next.js SSR embeds all page props)
  const nd = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nd?.[1]) {
    try { walkExtract(JSON.parse(nd[1]), `next-data:${source}`, out); } catch { /* bad JSON */ }
  }

  // 2. JSON-LD structured data
  for (const m of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { walkExtract(JSON.parse(m[1]), `json-ld:${source}`, out); } catch { /* skip */ }
  }

  // 3. window.__STATE__ / REDUX_STATE
  for (const m of html.matchAll(/(?:window\.__(?:STATE|REDUX_STATE|INITIAL_STATE)__|__PRELOADED_STATE__)\s*=\s*(\{[\s\S]{100,}?\});?\s*(?:<\/script>)/g)) {
    try { walkExtract(JSON.parse(m[1]), `window-state:${source}`, out); } catch { /* skip */ }
  }
}

// ── Phase 1: Direct API ────────────────────────────────────────────────────

async function runDirectApi(debug: DebugEntry[]): Promise<ContentItem[]> {
  console.log('\n─── Phase 1: Direct API ───');
  const items: ContentItem[] = [];
  for (const p of API_PATHS) {
    const url = `${BASE}${p}`;
    const { status, body } = await fetchJson(url, API_HEADERS);
    const ex: ContentItem[] = [];
    if (status === 200 && body) walkExtract(body, `api:${p}`, ex);
    process.stdout.write(`  ${status}  ${p.split('?')[0].padEnd(35)} items: ${ex.length}\n`);
    debug.push({ url, method: 'direct-api', status, snapshot: url, items: ex.length });
    items.push(...ex);
    await sleep(200);
  }
  console.log(`  → subtotal ${items.length}`);
  return items;
}

// ── Phase 2: Wayback listing pages ────────────────────────────────────────

async function getSnapshotTimestamp(url: string, year: string): Promise<string | null> {
  // CDX API: find the closest snapshot to Jan 1 of the given year
  const cdx = `${WAYBACK}/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=1&filter=statuscode:200&fl=timestamp&from=${year}0101&to=${year}1231&order=desc`;
  const { status, body } = await fetchJson(cdx, { 'User-Agent': 'Mozilla/5.0' }, 12000);
  if (status !== 200 || !Array.isArray(body) || (body as unknown[]).length < 2) return null;
  return (body as string[][])[1]?.[0] ?? null;
}

async function runWaybackListings(debug: DebugEntry[]): Promise<ContentItem[]> {
  console.log('\n─── Phase 2: Wayback listing pages (multi-year) ───');
  const items: ContentItem[] = [];

  for (const pageUrl of LISTING_PAGES) {
    const label = new URL(pageUrl).pathname;

    for (const year of SNAPSHOT_YEARS) {
      // Try to find a snapshot from this year
      const ts = await getSnapshotTimestamp(pageUrl, year);
      if (!ts) { process.stdout.write(`  ${year}  ${label.padEnd(35)} → no snapshot\n`); continue; }

      const archiveUrl = `${WAYBACK}/web/${ts}if_/${pageUrl}`;
      const { status, text } = await fetchText(archiveUrl, BROWSER_HEADERS);

      const pageItems: ContentItem[] = [];
      if (status === 200 && text.length > 500) {
        extractFromHtml(text, `${label}@${year}`, pageItems);
      }
      process.stdout.write(`  ${year}  ${label.padEnd(35)} → ${status}  items: ${pageItems.length}  (snap: ${ts})\n`);
      debug.push({ url: pageUrl, method: `wayback-${year}`, status, snapshot: ts, items: pageItems.length });
      items.push(...pageItems);
      await sleep(1500); // polite to archive.org
    }
  }

  console.log(`  → subtotal ${items.length} (before dedup)`);
  return items;
}

// ── Phase 3: Wayback CDX individual content pages ─────────────────────────

async function runWaybackCdxBulk(debug: DebugEntry[]): Promise<ContentItem[]> {
  console.log('\n─── Phase 3: Wayback CDX individual content pages ───');
  const items: ContentItem[] = [];

  for (const pattern of CDX_PATTERNS) {
    // Get up to 300 unique content URLs archived for this pattern
    const cdxUrl = `${WAYBACK}/cdx/search/cdx?url=${encodeURIComponent(pattern)}&output=json` +
                   `&fl=original,timestamp&filter=statuscode:200&collapse=urlkey&limit=300&order=desc`;
    const { status, body } = await fetchJson(cdxUrl, { 'User-Agent': 'Mozilla/5.0' }, 20000);

    if (status !== 200 || !Array.isArray(body) || (body as unknown[]).length < 2) {
      console.log(`  CDX ${pattern}: ${status} (no results)`);
      debug.push({ url: pattern, method: 'cdx-enum', status, snapshot: '', items: 0 });
      continue;
    }

    const rows = (body as string[][]).slice(1); // skip header row
    console.log(`  CDX ${pattern}: found ${rows.length} URLs`);

    // Fetch up to 50 individual content pages per pattern
    let fetched = 0;
    for (const [origUrl, ts] of rows.slice(0, 50)) {
      const archiveUrl = `${WAYBACK}/web/${ts}if_/${origUrl}`;
      const { status: s, text } = await fetchText(archiveUrl, BROWSER_HEADERS, 25000);
      const pageItems: ContentItem[] = [];
      if (s === 200 && text.length > 500) extractFromHtml(text, origUrl, pageItems);
      if (pageItems.length > 0) {
        console.log(`    +${pageItems.length}  ${origUrl.slice(-60)}`);
        items.push(...pageItems);
        debug.push({ url: origUrl, method: 'cdx-page', status: s, snapshot: ts, items: pageItems.length });
      }
      fetched++;
      await sleep(800);
    }
    console.log(`  Pattern done — fetched ${fetched} pages`);
    await sleep(1000);
  }

  console.log(`  → subtotal ${items.length} (before dedup)`);
  return items;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('      Shahid MBC Library Scraper — Wayback Edition v2');
  console.log(`      ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  ensureDir(OUTPUT_DIR);

  // Write sentinel immediately so downstream steps never fail
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    scrapedAt: new Date().toISOString(), totalItems: 0,
    byType: {}, genres: [], countries: [], apiEndpoints: [], items: [],
  }, null, 2));

  const debug: DebugEntry[] = [];
  const all:   ContentItem[] = [];

  all.push(...await runDirectApi(debug));
  all.push(...await runWaybackListings(debug));
  all.push(...await runWaybackCdxBulk(debug));

  const items = deduplicate(all);
  console.log(`\n  Final unique items: ${items.length}`);

  const byType:    Record<string, number> = {};
  const genreSet   = new Set<string>();
  const countrySet = new Set<string>();
  for (const i of items) {
    byType[i.type] = (byType[i.type] ?? 0) + 1;
    i.genres.forEach(g => g && genreSet.add(g));
    if (i.country) countrySet.add(i.country);
  }

  const output = {
    scrapedAt:    new Date().toISOString(),
    totalItems:   items.length,
    byType,
    genres:       [...genreSet].sort(),
    countries:    [...countrySet].sort(),
    apiEndpoints: [...new Set(debug.filter(d => d.method === 'direct-api').map(d => d.url))],
    items,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  fs.writeFileSync(DEBUG_FILE,  JSON.stringify(debug,  null, 2));

  console.log('\n═══════════════════ RESULTS ════════════════════════════════');
  console.log(`  Total items : ${output.totalItems}`);
  console.log(`  By type     :`, byType);
  console.log(`  Genres      : ${output.genres.length}`);
  if (items.length > 0) {
    console.log('\n  Sample titles:');
    items.slice(0, 25).forEach(i =>
      console.log(`    [${i.type.padEnd(8)}] ${(i.title || i.titleAr).slice(0, 55)}`)
    );
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
