/**
 * Shahid MBC Full Library Scraper
 *
 * Strategy:
 *  1. Wayback Machine (archive.org) — fetches archived Shahid pages and
 *     extracts the __NEXT_DATA__ JSON that Next.js embeds in every HTML page.
 *     archive.org doesn't block cloud IPs and preserves server-rendered data.
 *  2. Direct REST API — tries known Shahid API endpoints. Returns 403 from
 *     cloud IPs but kept as a first-pass attempt.
 *
 * Run locally:   npx tsx automation/scrape-shahid.ts
 * Run on CI:     GitHub Actions workflow (.github/workflows/scrape-shahid.yml)
 */

import * as fs   from 'fs';
import * as path from 'path';
import { URL }   from 'url';

// ── Config ─────────────────────────────────────────────────────────────────

const BASE       = 'https://shahid.mbc.net';
const OUTPUT_DIR = path.join(process.cwd(), 'automation', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'shahid-data.json');
const DEBUG_FILE  = path.join(OUTPUT_DIR, 'scrape-debug.json');
const WAYBACK     = 'https://web.archive.org';

// Shahid pages to retrieve from the Wayback Machine
const SHAHID_PAGES = [
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
  `${BASE}/ar/series`,
  `${BASE}/ar/movies`,
  `${BASE}/ar/programs`,
  `${BASE}/ar/kids`,
];

// Direct API paths (attempted first — usually 403 from cloud IPs)
const API_PATHS = [
  '/api/v2/page/home?language=en',
  '/api/v2/page/series?language=en&limit=48',
  '/api/v2/page/movies?language=en&limit=48',
  '/api/v2/page/kids?language=en&limit=48',
  '/api/v2/content/series?language=en&page=1&limit=48',
  '/api/v2/content/series?language=en&page=2&limit=48',
  '/api/v2/content/series?language=en&page=3&limit=48',
  '/api/v2/content/movies?language=en&page=1&limit=48',
  '/api/v2/content/movies?language=en&page=2&limit=48',
  '/api/v2/content/kids?language=en&page=1&limit=48',
  '/api/v2/content/trending?language=en&page=1&limit=48',
  '/api/v2/content/free?language=en&page=1&limit=48',
  '/api/v2/content/new?language=en&page=1&limit=48',
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
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
  'Connection':      'keep-alive',
  'Cache-Control':   'no-cache',
};

const API_HEADERS: Record<string, string> = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept':          'application/json, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         `${BASE}/en/`,
  'Origin':          BASE,
  'x-app-version':   '10.0.0',
  'x-platform':      'web',
};

async function fetchText(url: string, headers: Record<string, string>, timeoutMs = 30000): Promise<{ status: number; text: string; finalUrl: string }> {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, redirect: 'follow' });
    const text = await res.text();
    return { status: res.status, text, finalUrl: res.url };
  } catch (e: unknown) {
    return { status: 0, text: '', finalUrl: url };
  } finally {
    clearTimeout(tid);
  }
}

async function fetchJson(url: string, headers: Record<string, string>, timeoutMs = 20000): Promise<{ status: number; body: unknown; finalUrl: string }> {
  const { status, text, finalUrl } = await fetchText(url, headers, timeoutMs);
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* keep null */ }
  return { status, body, finalUrl };
}

// ── Content model helpers ──────────────────────────────────────────────────

function inferMoods(genres: string[], keywords: string[]): string[] {
  const all = [...genres, ...keywords].map(s => s.toLowerCase());
  const m: string[] = [];
  if (all.some(s => /comedy|funny|humor|sitcom/.test(s)))             m.push('funny', 'lighthearted');
  if (all.some(s => /romance|romantic|love/.test(s)))                 m.push('romantic');
  if (all.some(s => /action|adventure/.test(s)))                      m.push('exciting', 'adventurous');
  if (all.some(s => /thrill|suspense/.test(s)))                       m.push('thrilling', 'tense');
  if (all.some(s => /horror|scary|supernatural|ghost/.test(s)))       m.push('scary', 'thrilling');
  if (all.some(s => /drama|emotional/.test(s)))                       m.push('emotional', 'dramatic');
  if (all.some(s => /histor|period|epic/.test(s)))                    m.push('epic', 'inspiring');
  if (all.some(s => /mystery|crime|detective/.test(s)))               m.push('mysterious', 'tense');
  if (all.some(s => /family|kids|children|anim/.test(s)))             m.push('family', 'heartwarming');
  if (all.some(s => /sci.fi|fantasy|future/.test(s)))                 m.push('epic', 'thought-provoking');
  if (all.some(s => /music|singing|talent|compet/.test(s)))           m.push('inspiring', 'musical');
  if (all.some(s => /social|society|issue/.test(s)))                  m.push('thought-provoking', 'dramatic');
  if (all.some(s => /war|battle|military/.test(s)))                   m.push('epic', 'dramatic');
  return [...new Set(m)];
}

function normalizeType(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('movie') || s.includes('film'))                      return 'movie';
  if (s.includes('series') || s.includes('show') || s.includes('drama')) return 'series';
  if (s.includes('program') || s.includes('talk'))                    return 'program';
  if (s.includes('kid') || s.includes('child') || s.includes('anim')) return 'kids';
  if (s.includes('channel') || s.includes('live'))                    return 'live';
  return s || 'series';
}

function extractImage(o: Record<string, unknown>): string {
  const keys = ['thumbnailUrl','imageUrl','posterUrl','coverUrl','thumbnail','image','poster',
                 'coverImage','horizontalImage','verticalImage','squareImage','smallImage','mediumImage',
                 'imageMain','imagePoster','imageThumb'];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.startsWith('http') && !v.includes('web.archive.org')) return v;
    if (v && typeof v === 'object') {
      for (const vv of Object.values(v as Record<string, unknown>)) {
        if (typeof vv === 'string' && vv.startsWith('http') && !vv.includes('web.archive.org')) return vv;
      }
    }
  }
  return '';
}

function unwaybackUrl(url: string): string {
  // Strip Wayback Machine wrapper from archived URLs
  // e.g. https://web.archive.org/web/20250101000000/https://imgcdn.shahid.mbc.net/...
  const m = url.match(/web\.archive\.org\/web\/\d+\/(https?:\/\/[^\s"']+)/);
  return m ? m[1] : url;
}

function buildItem(o: Record<string, unknown>, source: string): ContentItem | null {
  const id      = String(o.id ?? o.contentId ?? o.seriesId ?? o.movieId ?? o.programId ?? o.channelId ?? '');
  const title   = String(o.title ?? o.titleEn ?? o.name ?? o.nameEn ?? '');
  const titleAr = String(o.titleAr ?? o.nameAr ?? o.arabicTitle ?? o.titleAR ?? '');
  if (!id && !title && !titleAr) return null;
  if ((title + titleAr).length < 2) return null;

  const rawGenres = (
    Array.isArray(o.genres)      ? o.genres :
    Array.isArray(o.genre)       ? o.genre  :
    Array.isArray(o.categories)  ? o.categories : []
  ).map((g: unknown) =>
    typeof g === 'string' ? g : String((g as Record<string,unknown>)?.name ?? (g as Record<string,unknown>)?.title ?? '')
  ).filter(Boolean) as string[];

  const keywords = (Array.isArray(o.tags) ? o.tags : Array.isArray(o.keywords) ? o.keywords : []).map(String).filter(Boolean);

  let poster = extractImage(o);
  if (poster) poster = unwaybackUrl(poster);
  if (!poster) poster = `https://placehold.co/300x450/0f172a/3B82F6?text=${encodeURIComponent((title || titleAr).slice(0, 20))}`;

  const heroKeys = ['heroImage','bannerImage','landscapeImage','horizontalImage','backgroundImage','wideImage','coverWide'];
  let hero = '';
  for (const k of heroKeys) {
    const v = o[k];
    if (typeof v === 'string' && v.startsWith('http')) { hero = unwaybackUrl(v); break; }
  }
  if (!hero) hero = poster;

  return {
    id, title, titleAr,
    type:        normalizeType(o.type ?? o.contentType ?? o.videoType ?? o.programType),
    genres:      rawGenres,
    moods:       inferMoods(rawGenres, keywords),
    keywords,
    year:        typeof o.year === 'number' ? o.year : typeof o.releaseYear === 'number' ? o.releaseYear : undefined,
    rating:      String(o.ageRating ?? o.contentRating ?? o.rating ?? ''),
    episodes:    typeof o.totalEpisodes === 'number' ? o.totalEpisodes : typeof o.episodeCount === 'number' ? o.episodeCount : undefined,
    seasons:     typeof o.seasonCount === 'number' ? o.seasonCount : undefined,
    duration:    typeof o.duration === 'number' ? o.duration : typeof o.runtime === 'number' ? o.runtime : undefined,
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
  if (depth > 25 || !obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(v => walkExtract(v, source, out, depth + 1));
    return;
  }
  const o = obj as Record<string, unknown>;
  const hasId    = o.id || o.contentId || o.seriesId || o.movieId || o.programId;
  const hasTitle = o.title || o.titleEn || o.name || o.titleAr || o.nameAr;
  if (hasId && hasTitle) {
    const item = buildItem(o, source);
    if (item) out.push(item);
  }
  Object.values(o).forEach(v => { if (v && typeof v === 'object') walkExtract(v, source, out, depth + 1); });
}

function deduplicate(items: ContentItem[]): ContentItem[] {
  const map = new Map<string, ContentItem>();
  for (const item of items) {
    const key = item.id || `${item.title}::${item.type}`;
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
    map.set(key, merged);
  }
  return [...map.values()];
}

function extractFromHtml(html: string, source: string, out: ContentItem[]) {
  // 1. __NEXT_DATA__ — richest source, embedded by Next.js SSR
  const nextMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextMatch?.[1]) {
    try { walkExtract(JSON.parse(nextMatch[1]), `next-data:${source}`, out); }
    catch { /* bad JSON */ }
  }

  // 2. JSON-LD structured data
  const jsonLdRe = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  for (const m of html.matchAll(jsonLdRe)) {
    try { walkExtract(JSON.parse(m[1]), `json-ld:${source}`, out); }
    catch { /* bad JSON */ }
  }

  // 3. Inline window.__STATE__ or similar
  const stateRe = /(?:window\.__(?:STATE|REDUX_STATE|INITIAL_STATE|APP_STATE)__|__(?:INITIAL|PRELOADED)_STATE__\s*=)\s*(\{[\s\S]{50,}?\});?\s*(?:<\/script>|window\.)/g;
  for (const m of html.matchAll(stateRe)) {
    try { walkExtract(JSON.parse(m[1]), `window-state:${source}`, out); }
    catch { /* bad JSON */ }
  }
}

// ── Phase 1: Direct API ────────────────────────────────────────────────────

async function runDirectApi(debug: DebugEntry[]): Promise<ContentItem[]> {
  console.log('\n─── Phase 1: Direct API calls ───');
  const items: ContentItem[] = [];

  for (const apiPath of API_PATHS) {
    const url = `${BASE}${apiPath}`;
    process.stdout.write(`  GET ${apiPath.split('?')[0].padEnd(35)} `);
    const { status, body, finalUrl } = await fetchJson(url, API_HEADERS);
    const extracted: ContentItem[] = [];
    if (status === 200 && body) walkExtract(body, `api:${apiPath}`, extracted);
    process.stdout.write(`→ ${status}  items: ${extracted.length}\n`);
    debug.push({ url, method: 'direct-api', status, snapshot: finalUrl, items: extracted.length });
    items.push(...extracted);
    await sleep(300);
  }

  console.log(`  API subtotal: ${items.length} raw items`);
  return items;
}

// ── Phase 2: Wayback Machine ───────────────────────────────────────────────

/**
 * Get the timestamp of the most recent successful Wayback snapshot for a URL.
 * Uses the CDX API: https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server
 */
async function getLatestSnapshot(url: string): Promise<string | null> {
  const cdxUrl = `${WAYBACK}/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=3&filter=statuscode:200&fl=timestamp&order=desc`;
  const { status, body } = await fetchJson(cdxUrl, { 'User-Agent': 'Mozilla/5.0' }, 15000);
  if (status !== 200 || !Array.isArray(body) || (body as unknown[]).length < 2) return null;
  // First row is ['timestamp'] header, second row is data
  const rows = body as string[][];
  return rows[1]?.[0] ?? null;
}

async function runWayback(debug: DebugEntry[]): Promise<ContentItem[]> {
  console.log('\n─── Phase 2: Wayback Machine (archive.org) ───');
  const items: ContentItem[] = [];

  for (const pageUrl of SHAHID_PAGES) {
    const label = new URL(pageUrl).pathname;
    process.stdout.write(`  ${label.padEnd(40)} `);

    let snapshot = '';
    let html     = '';
    let status   = 0;

    // Strategy A: direct Wayback URL without timestamp (auto-redirects to latest)
    const directUrl = `${WAYBACK}/web/${pageUrl}`;
    const directRes = await fetchText(directUrl, BROWSER_HEADERS, 35000);
    if (directRes.status === 200 && directRes.text.length > 1000) {
      html     = directRes.text;
      status   = 200;
      snapshot = directRes.finalUrl;
    } else {
      // Strategy B: look up the CDX API for the latest known snapshot
      const ts = await getLatestSnapshot(pageUrl);
      if (ts) {
        snapshot = `${WAYBACK}/web/${ts}if_/${pageUrl}`;
        const archiveRes = await fetchText(snapshot, BROWSER_HEADERS, 35000);
        html   = archiveRes.text;
        status = archiveRes.status;
      }
    }

    const pageItems: ContentItem[] = [];
    if (status === 200 && html.length > 1000) {
      extractFromHtml(html, label, pageItems);
    }

    process.stdout.write(`→ ${status}  snapshot: ${snapshot.slice(-40) || 'none'}  items: ${pageItems.length}\n`);
    debug.push({ url: pageUrl, method: 'wayback', status, snapshot, items: pageItems.length });

    items.push(...pageItems);
    await sleep(2000); // Be polite to archive.org
  }

  console.log(`  Wayback subtotal: ${items.length} raw items`);
  return items;
}

// ── Phase 3: Wayback CDX bulk listing ─────────────────────────────────────
// Enumerate all Shahid content URLs indexed by archive.org, then fetch each

async function runWaybackCdxBulk(debug: DebugEntry[]): Promise<ContentItem[]> {
  console.log('\n─── Phase 3: Wayback CDX bulk URL enumeration ───');
  const items: ContentItem[] = [];

  // Content URL patterns on Shahid
  const patterns = [
    'shahid.mbc.net/en/series/*',
    'shahid.mbc.net/en/movie/*',
    'shahid.mbc.net/en/program/*',
  ];

  for (const pattern of patterns) {
    const cdxUrl = `${WAYBACK}/cdx/search/cdx?url=${encodeURIComponent(pattern)}&output=json&fl=original,timestamp&filter=statuscode:200&collapse=urlkey&limit=200`;
    const { status, body } = await fetchJson(cdxUrl, { 'User-Agent': 'Mozilla/5.0' }, 20000);
    if (status !== 200 || !Array.isArray(body) || (body as unknown[]).length < 2) {
      console.log(`  CDX query failed for ${pattern}: ${status}`);
      continue;
    }
    const rows = (body as string[][]).slice(1); // skip header row
    console.log(`  Found ${rows.length} archived URLs for pattern ${pattern}`);

    // Fetch a sample of them (limit to 30 per pattern to keep runtime reasonable)
    const sample = rows.slice(0, 30);
    for (const [origUrl, ts] of sample) {
      const archiveUrl = `${WAYBACK}/web/${ts}if_/${origUrl}`;
      const res = await fetchText(archiveUrl, BROWSER_HEADERS, 25000);
      if (res.status === 200 && res.text.length > 500) {
        extractFromHtml(res.text, origUrl, items);
      }
      await sleep(500);
    }
    await sleep(1000);
  }

  console.log(`  CDX bulk subtotal: ${items.length} raw items`);
  return items;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('      Shahid MBC Library Scraper — Wayback Edition');
  console.log(`      ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════\n');

  ensureDir(OUTPUT_DIR);

  // Write sentinel file immediately so downstream steps never fail on missing file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    scrapedAt: new Date().toISOString(), totalItems: 0, byType: {}, genres: [], countries: [], apiEndpoints: [], items: []
  }, null, 2));

  const debug: DebugEntry[] = [];
  const all:   ContentItem[] = [];

  // Phase 1: direct API (usually 403 from cloud, but worth trying)
  all.push(...await runDirectApi(debug));

  // Phase 2: Wayback Machine page snapshots
  all.push(...await runWayback(debug));

  // Phase 3: Wayback CDX bulk enumeration of individual content pages
  all.push(...await runWaybackCdxBulk(debug));

  const items = deduplicate(all);
  console.log(`\n  Deduplicated total: ${items.length} items`);

  // Build stats
  const byType: Record<string, number>  = {};
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

  console.log('\n═══════════════════ RESULTS ══════════════════════════');
  console.log(`  Total items   : ${output.totalItems}`);
  console.log(`  By type       :`, byType);
  console.log(`  Genres        : ${output.genres.length}`);
  console.log(`  Countries     : ${output.countries.length}`);
  if (items.length > 0) {
    console.log('\n  Sample titles:');
    items.slice(0, 20).forEach(i =>
      console.log(`    [${i.type.padEnd(8)}] ${(i.title || i.titleAr).slice(0, 50)}`)
    );
  } else {
    console.log('\n  ⚠ 0 items — check debug log for Wayback snapshot details');
    const waybackEntries = debug.filter(d => d.method === 'wayback');
    waybackEntries.forEach(e =>
      console.log(`    ${e.status}  ${e.url}  snapshot: ${e.snapshot.slice(-50) || 'none'}`)
    );
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
