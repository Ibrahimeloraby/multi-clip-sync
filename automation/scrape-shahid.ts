/**
 * Shahid MBC Full Library Scraper
 *
 * Strategy:
 *  1. Open each known section URL in Playwright
 *  2. Intercept ALL JSON API responses the page makes
 *  3. For grid/list pages: scroll + click "Load More" / paginate until exhausted
 *  4. For each intercepted API response: extract every content item recursively
 *  5. Also hit the Shahid REST API directly for category listings + search
 *  6. Deduplicate everything and write automation/output/shahid-data.json
 *
 * GitHub Actions: runs with full internet access, commits results back to repo.
 * Local:          set CHROMIUM_PATH env var or install `playwright` + chromium.
 */

import { chromium, Browser, BrowserContext, Page, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE = 'https://shahid.mbc.net';
const BASE_EN = `${BASE}/en`;

// Let Playwright find its own bundled Chromium on CI; only use local path if set
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined;

const OUTPUT_DIR = path.join(process.cwd(), 'automation', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'shahid-data.json');

const PAGES_TO_CRAWL = [
  { name: 'home',             url: `${BASE_EN}` },
  { name: 'series',           url: `${BASE_EN}/series` },
  { name: 'movies',           url: `${BASE_EN}/movies` },
  { name: 'programs',         url: `${BASE_EN}/programs` },
  { name: 'kids',             url: `${BASE_EN}/kids` },
  { name: 'live',             url: `${BASE_EN}/live` },
  { name: 'trending',         url: `${BASE_EN}/trending` },
  { name: 'turkish-series',   url: `${BASE_EN}/landingpages/turkishseries` },
  { name: 'explore-turkish',  url: `${BASE_EN}/exploreturkish` },
  { name: 'free',             url: `${BASE_EN}/free` },
  { name: 'ramadan-2026',     url: `${BASE_EN}/ramadan2026` },
  { name: 'ramadan-2025',     url: `${BASE_EN}/ramadan2025` },
];

// Known Shahid REST API paths (same ones the web app calls)
const API_PATHS = [
  '/api/v2/page/home?language=en&limit=48',
  '/api/v2/page/series?language=en&limit=48',
  '/api/v2/page/movies?language=en&limit=48',
  '/api/v2/page/programs?language=en&limit=48',
  '/api/v2/page/kids?language=en&limit=48',
  '/api/v2/page/trending?language=en&limit=48',
  '/api/v2/channels?language=en',
  '/api/v2/genres?language=en&type=series',
  '/api/v2/genres?language=en&type=movie',
  '/api/v2/genres?language=en&type=program',
  '/api/v2/content/series?language=en&page=1&limit=48',
  '/api/v2/content/series?language=en&page=2&limit=48',
  '/api/v2/content/series?language=en&page=3&limit=48',
  '/api/v2/content/movies?language=en&page=1&limit=48',
  '/api/v2/content/movies?language=en&page=2&limit=48',
  '/api/v2/content/movies?language=en&page=3&limit=48',
  '/api/v2/content/programs?language=en&page=1&limit=48',
  '/api/v2/content/kids?language=en&page=1&limit=48',
  '/api/v2/content/trending?language=en&page=1&limit=48',
  '/api/v2/content/free?language=en&page=1&limit=48',
  '/api/v2/content/free?language=en&page=2&limit=48',
  '/api/v2/content/new?language=en&page=1&limit=48',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentItem {
  id: string;
  title: string;
  titleAr: string;
  type: string;
  genres: string[];
  moods: string[];
  keywords: string[];
  year?: number;
  rating?: string;
  episodes?: number;
  seasons?: number;
  duration?: number;
  poster: string;
  hero: string;
  description: string;
  isNew?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  language?: string;
  country?: string;
  source?: string;
  rawApiData?: Record<string, unknown>;
}

interface ApiCapture {
  url: string;
  status: number;
  body: unknown;
}

interface ScrapedData {
  scrapedAt: string;
  totalItems: number;
  byType: Record<string, number>;
  genres: string[];
  countries: string[];
  items: ContentItem[];
  apiEndpoints: string[];
  rawApiCaptures: ApiCapture[];
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function ensureDir(d: string) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function httpGet(url: string): Promise<{ status: number; body: unknown }> {
  return new Promise(resolve => {
    const lib = url.startsWith('https') ? https : http;
    const req = (lib as typeof https).get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Referer': BASE_EN + '/',
        'Origin': BASE_EN,
        'x-app-version': '10.0.0',
        'x-platform': 'web',
      },
      rejectUnauthorized: false,
    }, res => {
      let raw = '';
      res.on('data', c => (raw += c));
      res.on('end', () => {
        let body: unknown = raw;
        try { body = JSON.parse(raw); } catch { /* keep as string */ }
        resolve({ status: res.statusCode ?? 0, body });
      });
    });
    req.on('error', e => resolve({ status: 0, body: { error: e.message } }));
    req.setTimeout(20000, () => { req.destroy(); resolve({ status: 0, body: { error: 'timeout' } }); });
  });
}

// ---------------------------------------------------------------------------
// Content extraction — recursively walks any JSON structure
// ---------------------------------------------------------------------------

const CONTENT_INDICATORS = [
  'contentId', 'seriesId', 'movieId', 'programId', 'episodeId', 'channelId',
  'contentType', 'contentUrl', 'deeplink',
];

function looksLikeContent(o: Record<string, unknown>): boolean {
  const hasId = o.id || o.contentId || o.seriesId || o.movieId || o.programId || o.channelId;
  const hasTitle = o.title || o.titleEn || o.name || o.titleAr;
  const hasIndicator = CONTENT_INDICATORS.some(k => k in o);
  return !!(hasId && (hasTitle || hasIndicator));
}

function extractImageUrl(o: Record<string, unknown>): string {
  const keys = ['thumbnailUrl', 'imageUrl', 'posterUrl', 'coverUrl', 'thumbnail', 'image',
                'poster', 'coverImage', 'horizontalImage', 'verticalImage', 'bannerImage',
                'squareImage', 'landscapeImage', 'portraitImage'];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.startsWith('http')) return v;
    if (v && typeof v === 'object') {
      const vv = v as Record<string, unknown>;
      for (const vk of Object.keys(vv)) {
        if (typeof vv[vk] === 'string' && (vv[vk] as string).startsWith('http')) return vv[vk] as string;
      }
    }
  }
  return '';
}

function normalizeType(raw: unknown): string {
  const s = String(raw || '').toLowerCase();
  if (s.includes('series') || s.includes('show') || s.includes('drama')) return 'series';
  if (s.includes('movie') || s.includes('film')) return 'movie';
  if (s.includes('program') || s.includes('programme') || s.includes('show')) return 'program';
  if (s.includes('kid') || s.includes('child') || s.includes('anim')) return 'kids';
  if (s.includes('channel') || s.includes('live')) return 'live';
  if (s.includes('episode')) return 'episode';
  return s || 'unknown';
}

function inferMoods(genres: string[], keywords: string[]): string[] {
  const all = [...genres, ...keywords].map(s => s.toLowerCase());
  const moods: string[] = [];
  if (all.some(s => /comedy|funny|comic|humor|sitcom|laugh/.test(s))) moods.push('funny', 'lighthearted');
  if (all.some(s => /romance|love|romantic/.test(s))) moods.push('romantic');
  if (all.some(s => /action|adventure|exciting/.test(s))) moods.push('exciting', 'adventurous');
  if (all.some(s => /thrill|suspense|tension/.test(s))) moods.push('thrilling', 'tense');
  if (all.some(s => /horror|scary|ghost|supernatural/.test(s))) moods.push('scary', 'thrilling');
  if (all.some(s => /drama|emotional|sad|tear/.test(s))) moods.push('emotional', 'dramatic');
  if (all.some(s => /history|historical|period|epic/.test(s))) moods.push('epic', 'inspiring');
  if (all.some(s => /mystery|crime|detective|investigate/.test(s))) moods.push('mysterious', 'tense');
  if (all.some(s => /family|kids|children|animated/.test(s))) moods.push('family', 'heartwarming');
  if (all.some(s => /sci.fi|fantasy|future|space/.test(s))) moods.push('epic', 'thought-provoking');
  if (all.some(s => /music|singing|talent|competition/.test(s))) moods.push('inspiring', 'musical');
  if (all.some(s => /inspire|motivate|biography/.test(s))) moods.push('inspiring');
  if (all.some(s => /social|society|political|issue/.test(s))) moods.push('thought-provoking', 'dramatic');
  return [...new Set(moods)];
}

function buildContentItem(o: Record<string, unknown>, source: string): ContentItem | null {
  const id = String(o.id ?? o.contentId ?? o.seriesId ?? o.movieId ?? o.programId ?? o.channelId ?? '');
  const title = String(o.title ?? o.titleEn ?? o.name ?? o.nameEn ?? '');
  const titleAr = String(o.titleAr ?? o.nameAr ?? o.arabicTitle ?? o.arabicName ?? '');
  if (!id && !title && !titleAr) return null;

  const rawGenres = (
    Array.isArray(o.genres) ? o.genres :
    Array.isArray(o.genre) ? o.genre :
    Array.isArray(o.categories) ? o.categories :
    o.genreList ? [o.genreList] : []
  ).map((g: unknown) => {
    if (typeof g === 'string') return g;
    if (g && typeof g === 'object') {
      const go = g as Record<string, unknown>;
      return String(go.name ?? go.title ?? go.nameEn ?? '');
    }
    return '';
  }).filter(Boolean) as string[];

  const keywords = (
    Array.isArray(o.tags) ? o.tags :
    Array.isArray(o.keywords) ? o.keywords :
    Array.isArray(o.actors) ? o.actors.map((a: unknown) => {
      if (typeof a === 'string') return a;
      const ao = a as Record<string, unknown>;
      return String(ao.name ?? ao.nameEn ?? '');
    }) : []
  ).map(String).filter(Boolean);

  const genres = rawGenres.length ? rawGenres : [];
  const moods = inferMoods(genres, keywords);

  const rawType = o.type ?? o.contentType ?? o.videoType ?? o.mediaType;
  const type = normalizeType(rawType);

  const imgBase = extractImageUrl(o);
  const heroBase = (() => {
    const keys = ['heroImage', 'bannerImage', 'landscapeImage', 'horizontalImage', 'coverImage', 'backgroundImage'];
    for (const k of keys) {
      const v = o[k];
      if (typeof v === 'string' && v.startsWith('http')) return v;
    }
    return imgBase;
  })();

  // Derive country from language/country fields
  const country = String(o.country ?? o.countryOfOrigin ?? o.productionCountry ?? '');
  const language = String(o.language ?? o.audioLanguage ?? o.defaultLanguage ?? '');

  return {
    id,
    title,
    titleAr,
    type,
    genres,
    moods,
    keywords,
    year: typeof o.year === 'number' ? o.year :
          typeof o.releaseYear === 'number' ? o.releaseYear :
          typeof o.productionYear === 'number' ? o.productionYear : undefined,
    rating: String(o.ageRating ?? o.contentRating ?? o.rating ?? ''),
    episodes: typeof o.totalEpisodes === 'number' ? o.totalEpisodes :
              typeof o.episodeCount === 'number' ? o.episodeCount : undefined,
    seasons: typeof o.seasonCount === 'number' ? o.seasonCount :
             typeof o.totalSeasons === 'number' ? o.totalSeasons : undefined,
    duration: typeof o.duration === 'number' ? o.duration :
              typeof o.runtime === 'number' ? o.runtime : undefined,
    poster: imgBase || `https://picsum.photos/seed/${id || title}/300/450`,
    hero: heroBase || `https://picsum.photos/seed/${(id || title) + 'h'}/1280/720`,
    description: String(o.description ?? o.synopsis ?? o.shortDescription ?? o.longDescription ?? ''),
    isNew: !!(o.isNew ?? o.new ?? (o.badges && String(o.badges).toLowerCase().includes('new'))),
    isTrending: !!(o.isTrending ?? o.trending ?? (o.badges && String(o.badges).toLowerCase().includes('trend'))),
    isFeatured: !!(o.isFeatured ?? o.featured),
    language: language || undefined,
    country: country || undefined,
    source,
  };
}

function walkAndExtract(obj: unknown, source: string, out: ContentItem[]) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(v => walkAndExtract(v, source, out)); return; }

  const o = obj as Record<string, unknown>;
  if (looksLikeContent(o)) {
    const item = buildContentItem(o, source);
    if (item) out.push(item);
    // Still recurse into nested fields that might contain related items
    for (const v of Object.values(o)) {
      if (v && typeof v === 'object') walkAndExtract(v, source, out);
    }
  } else {
    for (const v of Object.values(o)) {
      if (v && typeof v === 'object') walkAndExtract(v, source, out);
    }
  }
}

// ---------------------------------------------------------------------------
// Deduplication + enrichment
// ---------------------------------------------------------------------------

function deduplicate(items: ContentItem[]): ContentItem[] {
  const map = new Map<string, ContentItem>();
  for (const item of items) {
    const key = item.id || [item.title, item.type].join('::');
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      // Merge: prefer non-empty fields
      const merged: ContentItem = { ...existing };
      for (const k of Object.keys(item) as (keyof ContentItem)[]) {
        const v = item[k];
        if (v !== undefined && v !== '' && v !== null) {
          if (Array.isArray(v) && Array.isArray(merged[k])) {
            (merged[k] as string[]) = [...new Set([...(merged[k] as string[]), ...(v as string[])])];
          } else if (!merged[k]) {
            (merged as Record<string, unknown>)[k] = v;
          }
        }
      }
      map.set(key, merged);
    }
  }
  return [...map.values()];
}

// ---------------------------------------------------------------------------
// Browser scraper
// ---------------------------------------------------------------------------

async function launchBrowser(): Promise<{ browser: Browser; context: BrowserContext }> {
  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--ignore-certificate-errors', '--disable-extensions',
      '--disable-background-networking', '--no-first-run', '--no-zygote',
      '--disable-accelerated-2d-canvas',
    ],
  };
  if (CHROMIUM_PATH) launchOptions.executablePath = CHROMIUM_PATH;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8' },
  });
  return { browser, context };
}

async function scrapePage(
  context: BrowserContext,
  name: string,
  url: string,
  apiCaptures: ApiCapture[],
): Promise<ContentItem[]> {
  const page = await context.newPage();
  const pageItems: ContentItem[] = [];

  // Intercept all JSON responses
  page.on('response', async (res: Response) => {
    const resUrl = res.url();
    const ct = res.headers()['content-type'] ?? '';
    if (!ct.includes('application/json') && !ct.includes('text/json')) return;
    if (/analytics|gtm|doubleclick|facebook|ads|tracking|beacon|amplitude/i.test(resUrl)) return;
    try {
      let body: unknown;
      try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
      if (!body) return;
      apiCaptures.push({ url: resUrl, status: res.status(), body });
      walkAndExtract(body, `browser:${name}`, pageItems);
    } catch { /* ignore */ }
  });

  console.log(`  [browser] ${name}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  } catch { /* timeout — continue with partial data */ }

  // Auto-scroll to trigger lazy loading
  await autoScroll(page);
  await sleep(2000);

  // Click any "Load More" / "See All" / pagination buttons
  await clickLoadMore(page);
  await sleep(2000);

  // DOM extraction as fallback
  const domItems = await extractFromDom(page, name);
  pageItems.push(...domItems);

  console.log(`    captured: ${pageItems.length} items, ${apiCaptures.length} API calls`);
  await page.close().catch(() => {});
  return pageItems;
}

async function autoScroll(page: Page) {
  try {
    await page.evaluate(async () => {
      await new Promise<void>(resolve => {
        let total = 0;
        const id = setInterval(() => {
          window.scrollBy(0, 600);
          total += 600;
          if (total >= document.body.scrollHeight) { clearInterval(id); resolve(); }
        }, 150);
        setTimeout(() => { clearInterval(id); resolve(); }, 30000);
      });
    });
  } catch { /* ignore */ }
}

async function clickLoadMore(page: Page) {
  const selectors = [
    'button:has-text("Load More")', 'button:has-text("See More")',
    'button:has-text("Show More")', '[data-testid="load-more"]',
    '.load-more', '.show-more', '[class*="loadmore"]', '[class*="load-more"]',
  ];
  for (let i = 0; i < 5; i++) {
    let clicked = false;
    for (const sel of selectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          await sleep(1500);
          await autoScroll(page);
          clicked = true;
          break;
        }
      } catch { /* not found */ }
    }
    if (!clicked) break;
  }
}

async function extractFromDom(page: Page, source: string): Promise<ContentItem[]> {
  try {
    return await page.evaluate((src: string) => {
      const items: Array<{
        id: string; title: string; titleAr: string; type: string;
        poster: string; hero: string; description: string; genres: string[];
        moods: string[]; keywords: string[]; source: string;
      }> = [];
      const seen = new Set<string>();

      // Look for content cards
      const cards = document.querySelectorAll(
        '[class*="card"], [class*="tile"], [class*="item"], [class*="content"], [class*="show"], [class*="movie"]'
      );

      for (const card of cards) {
        const link = (card.tagName === 'A' ? card : card.querySelector('a')) as HTMLAnchorElement | null;
        const img = card.querySelector('img') as HTMLImageElement | null;
        const titleEl = card.querySelector('[class*="title"], h2, h3, h4, strong');
        const title = titleEl?.textContent?.trim() ?? '';
        const href = link?.href ?? '';
        const poster = img?.src ?? (img as any)?.dataset?.src ?? '';
        const key = href || title;

        if (!key || seen.has(key) || !title) continue;
        seen.add(key);

        // Extract id from URL
        const idMatch = href.match(/[/-](\d{5,})/);
        const id = idMatch?.[1] ?? title.replace(/\s+/g, '-').toLowerCase();

        // Detect type from URL or class
        const urlLower = href.toLowerCase();
        const type = urlLower.includes('/movie') ? 'movie' :
                     urlLower.includes('/series') ? 'series' :
                     urlLower.includes('/program') ? 'program' :
                     urlLower.includes('/kids') ? 'kids' : 'series';

        items.push({
          id, title, titleAr: '', type, poster, hero: poster,
          description: '', genres: [], moods: [], keywords: [], source: src,
        });
      }
      return items;
    }, source);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Direct API calls
// ---------------------------------------------------------------------------

async function callDirectApis(): Promise<{ items: ContentItem[]; captures: ApiCapture[] }> {
  const items: ContentItem[] = [];
  const captures: ApiCapture[] = [];
  console.log('\nPhase 1: Direct API calls');

  for (const apiPath of API_PATHS) {
    const url = `${BASE}${apiPath}`;
    console.log(`  GET ${url.replace(BASE, '')}`);
    const { status, body } = await httpGet(url);
    captures.push({ url, status, body });

    if (status === 200 && body) {
      const extracted: ContentItem[] = [];
      walkAndExtract(body, `api:${apiPath}`, extracted);
      console.log(`    → ${status}  (${extracted.length} items)`);
      items.push(...extracted);
    } else {
      console.log(`    → ${status}`);
    }
    await sleep(400);
  }
  return { items, captures };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Shahid MBC Full Library Scraper ===');
  console.log(`Started: ${new Date().toISOString()}\n`);
  ensureDir(OUTPUT_DIR);

  const allItems: ContentItem[] = [];
  const allCaptures: ApiCapture[] = [];

  // Phase 1: Direct REST API
  const { items: apiItems, captures: apiCaptures } = await callDirectApis();
  allItems.push(...apiItems);
  allCaptures.push(...apiCaptures);

  // Phase 2: Browser scraping
  console.log('\nPhase 2: Browser-based scraping');
  let browser: Browser | null = null;
  try {
    const { browser: b, context } = await launchBrowser();
    browser = b;
    console.log('  Browser launched');

    for (const page of PAGES_TO_CRAWL) {
      const pageCaptures: ApiCapture[] = [];
      const items = await scrapePage(context, page.name, page.url, pageCaptures);
      allItems.push(...items);
      allCaptures.push(...pageCaptures);
      await sleep(1500);
    }
  } catch (e: unknown) {
    console.warn('  Browser error:', (e as Error).message);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  // Phase 3: Deduplicate & clean
  console.log('\nPhase 3: Deduplication');
  const deduped = deduplicate(allItems);

  // Build summary stats
  const byType: Record<string, number> = {};
  const genreSet = new Set<string>();
  const countrySet = new Set<string>();
  const endpointSet = new Set<string>();

  for (const item of deduped) {
    byType[item.type] = (byType[item.type] ?? 0) + 1;
    item.genres.forEach(g => g && genreSet.add(g));
    if (item.country) countrySet.add(item.country);
  }
  for (const cap of allCaptures) {
    try { endpointSet.add(new URL(cap.url).pathname); } catch { /* */ }
  }

  // Strip rawApiData to keep file size reasonable
  const cleanItems = deduped.map(({ rawApiData: _r, ...rest }) => rest);

  const result: ScrapedData = {
    scrapedAt: new Date().toISOString(),
    totalItems: cleanItems.length,
    byType,
    genres: [...genreSet].sort(),
    countries: [...countrySet].sort(),
    items: cleanItems,
    apiEndpoints: [...endpointSet].sort(),
    rawApiCaptures: allCaptures.map(c => ({
      url: c.url,
      status: c.status,
      // Trim large bodies to keep file manageable
      body: typeof c.body === 'string' ? c.body.slice(0, 200) : c.body,
    })),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));

  console.log('\n=== Results ===');
  console.log(`  Total unique items : ${result.totalItems}`);
  console.log(`  By type:`, byType);
  console.log(`  Genres found       : ${result.genres.length}`);
  console.log(`  Countries found    : ${result.countries.length}`);
  console.log(`  API endpoints      : ${result.apiEndpoints.length}`);
  console.log(`  Output             : ${OUTPUT_FILE}`);
  if (result.items.length > 0) {
    console.log('\nSample titles:');
    result.items.slice(0, 10).forEach(i => console.log(`  [${i.type}] ${i.title || i.titleAr}`));
  }
}

main().catch(err => {
  console.error('\nFatal:', err.message ?? err);
  process.exit(1);
});
