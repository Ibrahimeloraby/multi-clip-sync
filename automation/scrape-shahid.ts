/**
 * Shahid MBC Full Library Scraper
 *
 * Strategy:
 *  1. Direct REST API — calls every known Shahid API path, follows redirects,
 *     logs Location headers to discover the real API base URL
 *  2. Browser (Playwright + stealth) — opens each section, intercepts ALL
 *     network responses, scrolls + paginates until content is exhausted
 *  3. Fallback DOM extraction — scrapes card elements if API interception misses
 *
 * Run locally:   npx tsx automation/scrape-shahid.ts
 * Run on CI:     GitHub Actions workflow (full internet access)
 */

import * as fs   from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http  from 'http';
import { URL }    from 'url';

// ── Playwright (stealth-patched) ───────────────────────────────────────────
import { chromium as playwrightChromium } from 'playwright';
// Try to load stealth — gracefully skip if not installed
let chromiumLauncher: typeof playwrightChromium = playwrightChromium;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { chromium: stealthChromium } = require('playwright-extra');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stealth = require('puppeteer-extra-plugin-stealth');
  stealthChromium.use(stealth());
  chromiumLauncher = stealthChromium;
  console.log('✓ Stealth mode enabled');
} catch {
  console.log('⚠ Stealth plugin not available — using plain Playwright');
}

import type { Browser, BrowserContext, Page, Response } from 'playwright';

// ── Config ─────────────────────────────────────────────────────────────────

const BASE          = 'https://shahid.mbc.net';
const BASE_EN       = `${BASE}/en`;
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined;
const OUTPUT_DIR    = path.join(process.cwd(), 'automation', 'output');
const OUTPUT_FILE   = path.join(OUTPUT_DIR, 'shahid-data.json');
const DEBUG_FILE    = path.join(OUTPUT_DIR, 'scrape-debug.json');
const MAX_REDIRECTS = 10;

// Pages to crawl with Playwright
const PAGES_TO_CRAWL = [
  { name: 'home',             url: `${BASE_EN}` },
  { name: 'series',           url: `${BASE_EN}/series` },
  { name: 'movies',           url: `${BASE_EN}/movies` },
  { name: 'programs',         url: `${BASE_EN}/programs` },
  { name: 'kids',             url: `${BASE_EN}/kids` },
  { name: 'trending',         url: `${BASE_EN}/trending` },
  { name: 'free',             url: `${BASE_EN}/free` },
  { name: 'turkish-series',   url: `${BASE_EN}/landingpages/turkishseries` },
  { name: 'ramadan-2026',     url: `${BASE_EN}/ramadan2026` },
  { name: 'ramadan-2025',     url: `${BASE_EN}/ramadan2025` },
];

// API paths to try — we follow any redirects to find the real base
const API_PATHS = [
  '/api/v2/page/home?language=en',
  '/api/v2/page/series?language=en&limit=48',
  '/api/v2/page/movies?language=en&limit=48',
  '/api/v2/page/programs?language=en&limit=48',
  '/api/v2/page/kids?language=en&limit=48',
  '/api/v2/page/trending?language=en&limit=48',
  '/api/v2/channels?language=en',
  '/api/v2/genres?language=en&type=series',
  '/api/v2/genres?language=en&type=movie',
  '/api/v2/content/series?language=en&page=1&limit=48',
  '/api/v2/content/series?language=en&page=2&limit=48',
  '/api/v2/content/series?language=en&page=3&limit=48',
  '/api/v2/content/series?language=en&page=4&limit=48',
  '/api/v2/content/movies?language=en&page=1&limit=48',
  '/api/v2/content/movies?language=en&page=2&limit=48',
  '/api/v2/content/movies?language=en&page=3&limit=48',
  '/api/v2/content/programs?language=en&page=1&limit=48',
  '/api/v2/content/programs?language=en&page=2&limit=48',
  '/api/v2/content/kids?language=en&page=1&limit=48',
  '/api/v2/content/kids?language=en&page=2&limit=48',
  '/api/v2/content/trending?language=en&page=1&limit=48',
  '/api/v2/content/free?language=en&page=1&limit=48',
  '/api/v2/content/free?language=en&page=2&limit=48',
  '/api/v2/content/new?language=en&page=1&limit=48',
];

// ── Types ──────────────────────────────────────────────────────────────────

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
  source: string;
}

interface ApiCapture {
  url: string;
  finalUrl: string;
  redirectChain: string[];
  status: number;
  body: unknown;
}

interface DebugInfo {
  apiDiscovery: { path: string; status: number; location: string; finalUrl: string }[];
  browserPages: { name: string; finalUrl: string; interceptedUrls: string[]; domItems: number }[];
}

// ── Utilities ──────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const ensureDir = (d: string) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };

const REQUEST_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': `${BASE_EN}/`,
  'Origin': BASE_EN,
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'x-app-version': '10.0.0',
  'x-platform': 'web',
};

/**
 * HTTP GET that follows redirects (up to MAX_REDIRECTS hops) and returns
 * the final URL, full redirect chain, and parsed JSON body.
 */
function httpGetFollowRedirects(
  startUrl: string,
  redirectChain: string[] = [],
  hopCount = 0
): Promise<{ status: number; body: unknown; finalUrl: string; redirectChain: string[]; locationHeader: string }> {
  return new Promise(resolve => {
    if (hopCount > MAX_REDIRECTS) {
      resolve({ status: 0, body: { error: 'too many redirects' }, finalUrl: startUrl, redirectChain, locationHeader: '' });
      return;
    }

    let parsedUrl: URL;
    try { parsedUrl = new URL(startUrl); } catch {
      resolve({ status: 0, body: { error: 'invalid url' }, finalUrl: startUrl, redirectChain, locationHeader: '' });
      return;
    }

    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: REQUEST_HEADERS,
      rejectUnauthorized: false,
    };

    const req = lib.request(options, res => {
      const status = res.statusCode ?? 0;
      const locationHeader = (res.headers['location'] as string) ?? '';

      // Follow 3xx redirects
      if (status >= 300 && status < 400 && locationHeader) {
        const nextUrl = locationHeader.startsWith('http')
          ? locationHeader
          : new URL(locationHeader, startUrl).toString();
        console.log(`    ↳ ${status} → ${nextUrl}`);
        redirectChain.push(nextUrl);
        httpGetFollowRedirects(nextUrl, redirectChain, hopCount + 1).then(resolve);
        res.resume(); // drain
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        let body: unknown = raw;
        try { body = JSON.parse(raw); } catch { /* keep as string */ }
        resolve({ status, body, finalUrl: startUrl, redirectChain, locationHeader });
      });
    });

    req.on('error', e => resolve({ status: 0, body: { error: e.message }, finalUrl: startUrl, redirectChain, locationHeader: '' }));
    req.setTimeout(20000, () => { req.destroy(); resolve({ status: 0, body: { error: 'timeout' }, finalUrl: startUrl, redirectChain, locationHeader: '' }); });
    req.end();
  });
}

// ── Content extraction ─────────────────────────────────────────────────────

function inferMoods(genres: string[], keywords: string[]): string[] {
  const all = [...genres, ...keywords].map(s => s.toLowerCase());
  const m: string[] = [];
  if (all.some(s => /comedy|funny|humor|sitcom/.test(s)))          m.push('funny', 'lighthearted');
  if (all.some(s => /romance|romantic|love/.test(s)))              m.push('romantic');
  if (all.some(s => /action|adventure/.test(s)))                   m.push('exciting', 'adventurous');
  if (all.some(s => /thrill|suspense/.test(s)))                    m.push('thrilling', 'tense');
  if (all.some(s => /horror|scary|supernatural|ghost/.test(s)))    m.push('scary', 'thrilling');
  if (all.some(s => /drama|emotional/.test(s)))                    m.push('emotional', 'dramatic');
  if (all.some(s => /histor|period|epic/.test(s)))                 m.push('epic', 'inspiring');
  if (all.some(s => /mystery|crime|detective/.test(s)))            m.push('mysterious', 'tense');
  if (all.some(s => /family|kids|children|anim/.test(s)))          m.push('family', 'heartwarming');
  if (all.some(s => /sci.fi|fantasy|future/.test(s)))              m.push('epic', 'thought-provoking');
  if (all.some(s => /music|singing|talent|compet/.test(s)))        m.push('inspiring', 'musical');
  if (all.some(s => /social|society|issue/.test(s)))               m.push('thought-provoking', 'dramatic');
  if (all.some(s => /war|battle|military/.test(s)))                m.push('epic', 'dramatic');
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

function extractImage(o: Record<string, unknown>): string {
  const keys = ['thumbnailUrl','imageUrl','posterUrl','coverUrl','thumbnail','image','poster',
                'coverImage','horizontalImage','verticalImage','squareImage','smallImage','mediumImage'];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.startsWith('http')) return v;
    if (v && typeof v === 'object') {
      for (const vv of Object.values(v as Record<string, unknown>)) {
        if (typeof vv === 'string' && vv.startsWith('http')) return vv;
      }
    }
  }
  return '';
}

function extractHero(o: Record<string, unknown>, fallback: string): string {
  const keys = ['heroImage','bannerImage','landscapeImage','horizontalImage','backgroundImage','wideImage'];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.startsWith('http')) return v;
    if (v && typeof v === 'object') {
      for (const vv of Object.values(v as Record<string, unknown>)) {
        if (typeof vv === 'string' && vv.startsWith('http')) return vv;
      }
    }
  }
  return fallback;
}

function buildItem(o: Record<string, unknown>, source: string): ContentItem | null {
  const id    = String(o.id ?? o.contentId ?? o.seriesId ?? o.movieId ?? o.programId ?? o.channelId ?? '');
  const title = String(o.title ?? o.titleEn ?? o.name ?? o.nameEn ?? '');
  const titleAr = String(o.titleAr ?? o.nameAr ?? o.arabicTitle ?? '');
  if (!id && !title && !titleAr) return null;

  const rawGenres = (Array.isArray(o.genres) ? o.genres :
                     Array.isArray(o.genre)  ? o.genre  :
                     Array.isArray(o.categories) ? o.categories : [])
    .map((g: unknown) => typeof g === 'string' ? g : String((g as Record<string,unknown>)?.name ?? (g as Record<string,unknown>)?.title ?? ''))
    .filter(Boolean) as string[];

  const keywords = (Array.isArray(o.tags) ? o.tags :
                    Array.isArray(o.keywords) ? o.keywords : []).map(String).filter(Boolean);

  const poster = extractImage(o) || `https://picsum.photos/seed/${encodeURIComponent(id||title)}/300/450`;
  const hero   = extractHero(o, poster);

  return {
    id, title, titleAr,
    type:        normalizeType(o.type ?? o.contentType ?? o.videoType),
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
    language:    String(o.language ?? o.audioLanguage ?? ''),
    country:     String(o.country ?? o.countryOfOrigin ?? ''),
    source,
  };
}

function walkExtract(obj: unknown, source: string, out: ContentItem[]) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(v => walkExtract(v, source, out)); return; }
  const o = obj as Record<string, unknown>;
  const hasId    = o.id || o.contentId || o.seriesId || o.movieId || o.programId || o.channelId;
  const hasTitle = o.title || o.titleEn || o.name || o.titleAr;
  if (hasId && hasTitle) {
    const item = buildItem(o, source);
    if (item) out.push(item);
  }
  Object.values(o).forEach(v => { if (v && typeof v === 'object') walkExtract(v, source, out); });
}

function deduplicate(items: ContentItem[]): ContentItem[] {
  const map = new Map<string, ContentItem>();
  for (const item of items) {
    const key = item.id || `${item.title}::${item.type}`;
    const ex  = map.get(key);
    if (!ex) { map.set(key, item); continue; }
    // Merge: keep non-empty fields, union arrays
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

// ── Phase 1: Direct API ────────────────────────────────────────────────────

async function runDirectApi(debug: DebugInfo): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  console.log('\n─── Phase 1: Direct API calls ───');

  // Probe the first path with verbose redirect logging to discover real API base
  let realApiBase = BASE;
  const probe = await httpGetFollowRedirects(`${BASE}/api/v2/page/home?language=en`);
  if (probe.redirectChain.length > 0) {
    const finalHost = new URL(probe.finalUrl).origin;
    if (finalHost !== BASE) {
      console.log(`  ★ Real API base discovered: ${finalHost}`);
      realApiBase = finalHost;
    }
  }
  debug.apiDiscovery.push({
    path: '/api/v2/page/home',
    status: probe.status,
    location: probe.locationHeader,
    finalUrl: probe.finalUrl,
  });

  // Now call all paths using the real base (or BASE if no redirect found)
  for (const apiPath of API_PATHS) {
    const url = `${realApiBase}${apiPath}`;
    process.stdout.write(`  GET ${apiPath.split('?')[0].padEnd(40)} `);
    const { status, body, finalUrl, redirectChain } = await httpGetFollowRedirects(url);
    process.stdout.write(`→ ${status}  (redirects: ${redirectChain.length})\n`);

    debug.apiDiscovery.push({ path: apiPath, status, location: '', finalUrl });

    if (status === 200 && body && typeof body === 'object') {
      const extracted: ContentItem[] = [];
      walkExtract(body, `api:${apiPath}`, extracted);
      console.log(`    extracted ${extracted.length} items`);
      items.push(...extracted);
    } else if (status !== 200) {
      // Try with the actual discovered final URL if we got a redirect
      if (finalUrl !== url && status === 0) {
        const retry = await httpGetFollowRedirects(finalUrl);
        if (retry.status === 200 && retry.body) {
          const ex: ContentItem[] = [];
          walkExtract(retry.body, `api-retry:${apiPath}`, ex);
          console.log(`    retry → ${retry.status}  extracted ${ex.length}`);
          items.push(...ex);
        }
      }
    }

    await sleep(300);
  }

  return items;
}

// ── Phase 2: Playwright browser ────────────────────────────────────────────

async function runBrowser(debug: DebugInfo): Promise<ContentItem[]> {
  console.log('\n─── Phase 2: Browser scraping (stealth) ───');
  const items: ContentItem[] = [];

  const launchOpts: Parameters<typeof playwrightChromium.launch>[0] = {
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--ignore-certificate-errors', '--no-first-run',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
    ],
  };
  if (CHROMIUM_PATH) launchOpts.executablePath = CHROMIUM_PATH;

  let browser: Browser | null = null;
  try {
    browser = await chromiumLauncher.launch(launchOpts);
  } catch (e: unknown) {
    console.warn('  ✗ Browser launch failed:', (e as Error).message);
    return items;
  }

  const context: BrowserContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Riyadh',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
  });

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
  });

  for (const pageDef of PAGES_TO_CRAWL) {
    const pageItems: ContentItem[] = [];
    const interceptedUrls: string[] = [];

    const page: Page = await context.newPage();

    // Capture ALL responses — log URLs, extract from JSON
    page.on('response', async (res: Response) => {
      const resUrl = res.url();
      interceptedUrls.push(resUrl);

      // Skip non-data responses
      if (/\.(png|jpg|gif|woff|woff2|ttf|svg|ico|css|mp4|m3u8)(\?|$)/.test(resUrl)) return;
      if (/analytics|gtm|doubleclick|facebook|ads|tracking|beacon|amplitude|segment/i.test(resUrl)) return;

      const ct = (res.headers()['content-type'] ?? '').toLowerCase();
      if (!ct.includes('json') && !ct.includes('javascript')) return;

      try {
        const text = await res.text().catch(() => null);
        if (!text) return;

        // Try to extract JSON even from JS bundles (next.js __NEXT_DATA__)
        let parsed: unknown;
        try { parsed = JSON.parse(text); } catch {
          // Try extracting embedded JSON objects from JS
          const jsonMatches = text.match(/\{[^{}]{100,}\}/g) ?? [];
          for (const m of jsonMatches.slice(0, 5)) {
            try {
              const p = JSON.parse(m);
              walkExtract(p, `browser-js:${pageDef.name}`, pageItems);
            } catch { /* skip */ }
          }
          return;
        }
        walkExtract(parsed, `browser:${pageDef.name}`, pageItems);
      } catch { /* ignore */ }
    });

    // Also intercept __NEXT_DATA__ from the HTML
    page.on('response', async (res: Response) => {
      if (!res.url().endsWith('.html') && !res.url() === new URL(pageDef.url) as unknown as boolean) return;
      const ct = (res.headers()['content-type'] ?? '').toLowerCase();
      if (!ct.includes('html')) return;
      try {
        const text = await res.text().catch(() => '');
        const match = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (match?.[1]) {
          try {
            const nextData = JSON.parse(match[1]);
            walkExtract(nextData, `next-data:${pageDef.name}`, pageItems);
          } catch { /* skip */ }
        }
      } catch { /* ignore */ }
    });

    console.log(`  [${pageDef.name}]  ${pageDef.url}`);
    try {
      await page.goto(pageDef.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // Wait for either a content card or a Cloudflare challenge to resolve
      await Promise.race([
        page.waitForSelector('[class*="card"], [class*="tile"], [class*="content-item"], [class*="series"]', { timeout: 15000 }),
        page.waitForTimeout(15000),
      ]).catch(() => {});
    } catch { /* timeout — continue */ }

    // Check if we hit a Cloudflare/bot challenge
    const title = await page.title().catch(() => '');
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) ?? '').catch(() => '');
    if (/just a moment|cloudflare|enable javascript|ray id/i.test(title + bodyText)) {
      console.log(`    ⚠ Bot challenge detected — waiting 8s for it to resolve…`);
      await page.waitForTimeout(8000);
    }

    // Now wait for networkidle to let remaining API calls fire
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    // Scroll to trigger lazy-loaded content
    await autoScroll(page);
    await sleep(2000);

    // Click any "Load More" buttons
    await clickLoadMore(page);

    // Extract __NEXT_DATA__ from DOM
    const nextData = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      if (!el?.textContent) return null;
      try { return JSON.parse(el.textContent); } catch { return null; }
    }).catch(() => null);
    if (nextData) walkExtract(nextData, `next-data:${pageDef.name}`, pageItems);

    // DOM card fallback
    const domItems = await extractDom(page, pageDef.name);
    pageItems.push(...domItems);

    // Log
    const apiUrls = interceptedUrls.filter(u => u.includes('/api/') || u.includes('graphql'));
    debug.browserPages.push({
      name: pageDef.name,
      finalUrl: page.url(),
      interceptedUrls: apiUrls.slice(0, 20),
      domItems: domItems.length,
    });
    console.log(`    items: ${pageItems.length}  api-hits: ${apiUrls.length}  dom-cards: ${domItems.length}`);
    console.log(`    page title: "${title}"`);
    if (apiUrls.length > 0) console.log(`    sample API URLs: ${apiUrls.slice(0,3).join('\n      ')}`);

    items.push(...pageItems);
    await page.close().catch(() => {});
    await sleep(1000);
  }

  await browser.close().catch(() => {});
  return items;
}

async function autoScroll(page: Page) {
  try {
    await page.evaluate(async () => {
      await new Promise<void>(resolve => {
        let total = 0;
        const id = setInterval(() => {
          window.scrollBy(0, 700);
          total += 700;
          if (total >= document.body.scrollHeight) { clearInterval(id); resolve(); }
        }, 120);
        setTimeout(() => { clearInterval(id); resolve(); }, 30000);
      });
    });
  } catch { /* ignore */ }
}

async function clickLoadMore(page: Page) {
  const selectors = [
    'button:has-text("Load More")', 'button:has-text("See More")',
    'button:has-text("Show More")', 'button:has-text("View More")',
    '[data-testid*="load"]', '.load-more', '[class*="loadmore"]',
  ];
  for (let i = 0; i < 8; i++) {
    let clicked = false;
    for (const sel of selectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1500 })) {
          await btn.scrollIntoViewIfNeeded();
          await btn.click();
          await sleep(2000);
          await autoScroll(page);
          clicked = true;
          break;
        }
      } catch { /* not found */ }
    }
    if (!clicked) break;
  }
}

async function extractDom(page: Page, source: string): Promise<ContentItem[]> {
  try {
    return await page.evaluate((src: string): ContentItem[] => {
      const items: ContentItem[] = [];
      const seen = new Set<string>();
      const sel = [
        '[class*="ContentCard"]','[class*="content-card"]','[class*="SeriesCard"]',
        '[class*="MovieCard"]','[class*="ProgramCard"]','[class*="MediaCard"]',
        '[data-testid*="card"]','[data-testid*="content"]',
        'li[class*="item"] a', 'article',
      ].join(',');

      document.querySelectorAll(sel).forEach(card => {
        const a   = (card.tagName === 'A' ? card : card.querySelector('a')) as HTMLAnchorElement | null;
        const img = card.querySelector('img') as HTMLImageElement | null;
        const titleEl = card.querySelector('[class*="itle"], [class*="name"], h2, h3, h4, strong, span');
        const title = titleEl?.textContent?.trim() ?? '';
        const href  = a?.href ?? '';
        const poster = img?.src ?? (img as any)?.dataset?.src ?? '';
        const key   = href || title;
        if (!key || seen.has(key) || !title || title.length < 2) return;
        seen.add(key);
        const m = href.match(/\/(\d{5,})/);
        const id = m?.[1] ?? title.toLowerCase().replace(/\s+/g,'-');
        const type = href.includes('/movie') ? 'movie' :
                     href.includes('/series') ? 'series' :
                     href.includes('/program') ? 'program' :
                     href.includes('/kids') ? 'kids' : 'series';
        items.push({
          id, title, titleAr: '', type, genres: [], moods: [], keywords: [],
          poster: poster || `https://picsum.photos/seed/${id}/300/450`,
          hero:   poster || `https://picsum.photos/seed/${id}h/1280/720`,
          description: '', source: src,
        });
      });
      return items;
    }, source);
  } catch { return []; }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('     Shahid MBC Full Library Scraper');
  console.log(`     ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════\n');
  ensureDir(OUTPUT_DIR);

  const debug: DebugInfo = { apiDiscovery: [], browserPages: [] };
  const allItems: ContentItem[] = [];

  // Phase 1
  const apiItems = await runDirectApi(debug);
  allItems.push(...apiItems);
  console.log(`\n  API total raw items: ${apiItems.length}`);

  // Phase 2
  const browserItems = await runBrowser(debug);
  allItems.push(...browserItems);
  console.log(`\n  Browser total raw items: ${browserItems.length}`);

  // Deduplicate
  const items = deduplicate(allItems);
  console.log(`\n  After deduplication: ${items.length}`);

  // Stats
  const byType: Record<string, number> = {};
  const genreSet    = new Set<string>();
  const countrySet  = new Set<string>();
  const endpointSet = new Set<string>();
  for (const i of items) {
    byType[i.type] = (byType[i.type] ?? 0) + 1;
    i.genres.forEach(g => g && genreSet.add(g));
    if (i.country) countrySet.add(i.country);
  }
  for (const d of debug.apiDiscovery) {
    try { endpointSet.add(new URL(d.finalUrl).pathname); } catch { /* */ }
  }

  const output = {
    scrapedAt: new Date().toISOString(),
    totalItems: items.length,
    byType,
    genres:      [...genreSet].sort(),
    countries:   [...countrySet].sort(),
    apiEndpoints:[...endpointSet].sort(),
    items,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  fs.writeFileSync(DEBUG_FILE,  JSON.stringify(debug,  null, 2));

  console.log('\n═══════════════ RESULTS ═══════════════════');
  console.log(`  Total items   : ${output.totalItems}`);
  console.log(`  By type       :`, byType);
  console.log(`  Genres        : ${output.genres.length}`);
  console.log(`  Countries     : ${output.countries.length}`);
  console.log(`  Output        : ${OUTPUT_FILE}`);
  console.log(`  Debug log     : ${DEBUG_FILE}`);
  if (items.length > 0) {
    console.log('\n  Sample titles:');
    items.slice(0, 15).forEach(i => console.log(`    [${i.type.padEnd(8)}] ${(i.title || i.titleAr).slice(0,50)}`));
  } else {
    console.log('\n  ⚠ No items extracted.');
    console.log('  Check debug log for API redirect chains and browser page info.');
    console.log('  Debug API discovery:');
    debug.apiDiscovery.slice(0,3).forEach(d =>
      console.log(`    ${d.status}  ${d.path}  →  ${d.finalUrl}  loc: ${d.location}`)
    );
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
