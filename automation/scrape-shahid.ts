/**
 * Shahid MBC Full Website Scraper
 *
 * Two-pronged approach:
 *  1. Browser-based (Playwright) – launches Chromium, intercepts all JSON API
 *     responses, scrolls through every section, and also walks the DOM.
 *  2. Direct API calls – hits the Shahid REST API (same endpoints the browser
 *     uses) with proper headers to collect content listings.
 *
 * Output: automation/output/shahid-data.json
 *
 * Usage:
 *   npx tsx automation/scrape-shahid.ts
 *
 * Requirements:
 *   - Node 18+
 *   - `playwright` installed  (npm install playwright)
 *   - Chromium reachable (set CHROMIUM_PATH env or default below)
 *   - Network access to shahid.mbc.net
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = 'https://shahid.mbc.net/en';
const API_BASE = 'https://shahid.mbc.net/api';

const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const OUTPUT_DIR = path.join(process.cwd(), 'automation', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'shahid-data.json');

const SECTIONS = [
  { name: 'home',     url: `${BASE_URL}` },
  { name: 'series',   url: `${BASE_URL}/series` },
  { name: 'movies',   url: `${BASE_URL}/movies` },
  { name: 'programs', url: `${BASE_URL}/programs` },
  { name: 'kids',     url: `${BASE_URL}/kids` },
  { name: 'live',     url: `${BASE_URL}/live` },
];

// Known Shahid REST API paths discovered by intercepting the web app's traffic.
// Each returns JSON with content listings.
const DIRECT_API_PATHS = [
  '/v2/page/home?language=en',
  '/v2/page/series?language=en',
  '/v2/page/movies?language=en',
  '/v2/page/programs?language=en',
  '/v2/page/kids?language=en',
  '/v2/channels?language=en',
  '/v2/genres?language=en&type=series',
  '/v2/genres?language=en&type=movie',
  '/v2/content/series?language=en&page=1&limit=48',
  '/v2/content/movies?language=en&page=1&limit=48',
  '/v2/content/programs?language=en&page=1&limit=48',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiCapture {
  url: string;
  method: string;
  status: number;
  body: unknown;
}

interface ContentItem {
  id?: string;
  title?: string;
  titleAr?: string;
  type?: string;
  category?: string;
  section?: string;
  description?: string;
  thumbnail?: string;
  url?: string;
  year?: string | number;
  duration?: string | number;
  rating?: string;
  genres?: string[];
  tags?: string[];
  [key: string]: unknown;
}

interface SectionData {
  section: string;
  url: string;
  apiCalls: ApiCapture[];
  domContent: {
    categories: string[];
    items: ContentItem[];
    banners: ContentItem[];
    navLinks: string[];
  };
}

interface ScrapedData {
  scrapedAt: string;
  baseUrl: string;
  sections: SectionData[];
  directApiResults: ApiCapture[];
  allItems: ContentItem[];
  categories: string[];
  apiEndpoints: string[];
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function httpGet(url: string, headers: Record<string, string> = {}): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': BASE_URL + '/',
        'Origin': BASE_URL,
        ...headers,
      },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        let body: unknown = data;
        try { body = JSON.parse(data); } catch { /* leave as string */ }
        resolve({ status: res.statusCode ?? 0, body });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, body: { error: 'timeout' } }); });
  });
}

function extractContentItems(body: unknown): ContentItem[] {
  const items: ContentItem[] = [];

  function walk(obj: unknown) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walk); return; }

    const o = obj as Record<string, unknown>;
    const hasTitle = o.title || o.titleEn || o.name || o.titleAr;
    const hasId = o.id || o.contentId || o.programId || o.seriesId || o.movieId || o.episodeId;

    if (hasTitle && hasId) {
      items.push({
        id: String(o.id ?? o.contentId ?? o.programId ?? o.seriesId ?? o.movieId ?? o.episodeId ?? ''),
        title: String(o.title ?? o.titleEn ?? o.name ?? ''),
        titleAr: String(o.titleAr ?? o.nameAr ?? ''),
        type: String(o.type ?? o.contentType ?? o.category ?? ''),
        description: String(o.description ?? o.synopsis ?? o.shortDescription ?? ''),
        thumbnail: String(
          o.thumbnail ?? o.image ?? o.poster ?? o.coverImage ??
          o.thumbnailUrl ?? o.imageUrl ?? o.posterUrl ?? ''
        ),
        url: String(o.url ?? o.deeplink ?? o.contentUrl ?? o.watchUrl ?? ''),
        year: o.year ?? o.releaseYear ?? o.productionYear,
        duration: o.duration ?? o.runtime ?? o.durationInSeconds,
        rating: String(o.rating ?? o.ageRating ?? o.contentRating ?? ''),
        genres: Array.isArray(o.genres) ? o.genres.map(String) :
                Array.isArray(o.genre) ? o.genre.map(String) : [],
        tags: Array.isArray(o.tags) ? o.tags.map(String) : [],
      });
    }
    Object.values(o).forEach(walk);
  }

  walk(body);
  return items;
}

// ---------------------------------------------------------------------------
// Playwright-based scraper
// ---------------------------------------------------------------------------

class BrowserScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private capturedApis = new Map<string, ApiCapture[]>();

  async launch() {
    this.browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--ignore-certificate-errors',
      ],
    });

    this.context = await this.browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  }

  async close() {
    if (this.browser) await this.browser.close().catch(() => {});
  }

  private attachNetworkListener(page: Page, key: string) {
    const captures: ApiCapture[] = [];
    this.capturedApis.set(key, captures);

    page.on('response', async (res) => {
      const url = res.url();
      const ct = res.headers()['content-type'] ?? '';
      if (!ct.includes('application/json') && !ct.includes('text/json')) return;
      if (/analytics|gtm|doubleclick|facebook|ads|tracking|beacon/i.test(url)) return;
      try {
        let body: unknown;
        try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
        captures.push({ url, method: res.request().method(), status: res.status(), body });
      } catch { /* ignore */ }
    });
  }

  private async autoScroll(page: Page) {
    await page.evaluate(async () => {
      await new Promise<void>(resolve => {
        let total = 0;
        const dist = 500;
        const id = setInterval(() => {
          window.scrollBy(0, dist);
          total += dist;
          if (total >= document.body.scrollHeight) { clearInterval(id); resolve(); }
        }, 200);
        setTimeout(() => { clearInterval(id); resolve(); }, 25000);
      });
    });
  }

  private async extractDom(page: Page): Promise<SectionData['domContent']> {
    return page.evaluate(() => {
      const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('nav a, [role="navigation"] a')]
        .map(a => a.href).filter(Boolean);

      const categories = [...document.querySelectorAll('[class*="categor"] span, [class*="genre"] span, [class*="tab"] span')]
        .map(el => el.textContent?.trim() ?? '').filter(Boolean);

      const cardSelectors = '[class*="card"],[class*="tile"],[class*="item"],[class*="show"],[class*="movie"],[class*="content"]';
      const seen = new Set<string>();
      const items: ContentItem[] = [];

      for (const el of document.querySelectorAll(cardSelectors)) {
        const anchor = (el.tagName === 'A' ? el : el.querySelector('a')) as HTMLAnchorElement | null;
        const img = el.querySelector('img') as HTMLImageElement | null;
        const titleEl = el.querySelector('[class*="title"], h2, h3, h4, strong');
        const title = titleEl?.textContent?.trim() ?? '';
        const href = anchor?.href ?? '';
        const thumb = img?.src ?? (img as any)?.dataset?.src ?? '';
        const key = href || title;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        items.push({ title, thumbnail: thumb, url: href, type: (el as HTMLElement).dataset?.['type'] ?? '' });
      }

      const banners = [...document.querySelectorAll('[class*="banner"] [class*="title"], [class*="hero"] [class*="title"]')]
        .map(el => ({ title: el.textContent?.trim() ?? '' }));

      return {
        navLinks: [...new Set(navLinks)],
        categories: [...new Set(categories)],
        items,
        banners,
      };
    });
  }

  async scrapeSection(name: string, url: string): Promise<SectionData> {
    if (!this.context) throw new Error('Browser not launched');
    const page = await this.context.newPage();
    this.attachNetworkListener(page, name);

    console.log(`  [browser] ${name} → ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch { /* timeout or error – continue with what we have */ }

    try { await this.autoScroll(page); } catch { /* page may have been replaced */ }
    await sleep(2000);

    let domContent: SectionData['domContent'] = { categories: [], items: [], banners: [], navLinks: [] };
    try { domContent = await this.extractDom(page); } catch { /* context gone */ }

    await page.close().catch(() => {});

    const apiCalls = this.capturedApis.get(name) ?? [];
    console.log(`    API calls: ${apiCalls.length}  DOM items: ${domContent.items.length}`);
    return { section: name, url, apiCalls, domContent };
  }

  async scrapeAll(): Promise<SectionData[]> {
    const results: SectionData[] = [];
    for (const sec of SECTIONS) {
      results.push(await this.scrapeSection(sec.name, sec.url));
      await sleep(1500);
    }
    return results;
  }
}

// ---------------------------------------------------------------------------
// Direct REST API calls
// ---------------------------------------------------------------------------

async function callDirectApis(): Promise<ApiCapture[]> {
  const results: ApiCapture[] = [];

  for (const apiPath of DIRECT_API_PATHS) {
    const url = `${API_BASE}${apiPath}`;
    console.log(`  [api] GET ${url.slice(0, 90)}`);
    const { status, body } = await httpGet(url);
    results.push({ url, method: 'GET', status, body });
    console.log(`    → ${status}`);
    await sleep(500);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Shahid MBC Full Scraper ===\n');
  ensureDir(OUTPUT_DIR);

  // --- Phase 1: Direct API ---
  console.log('Phase 1: Direct REST API calls');
  const directApiResults = await callDirectApis();

  // --- Phase 2: Browser scraping ---
  console.log('\nPhase 2: Browser-based scraping');
  const browserScraper = new BrowserScraper();
  let sections: SectionData[] = [];
  try {
    await browserScraper.launch();
    sections = await browserScraper.scrapeAll();
  } catch (e: unknown) {
    console.warn('Browser scraping failed:', (e as Error).message);
  } finally {
    await browserScraper.close();
  }

  // --- Aggregate ---
  const allItems: ContentItem[] = [];
  const apiEndpoints = new Set<string>();
  const allCategories = new Set<string>();

  const processApiBody = (body: unknown, section: string) => {
    extractContentItems(body).forEach(item => allItems.push({ ...item, section }));
  };

  // From direct API
  for (const call of directApiResults) {
    try { apiEndpoints.add(new URL(call.url).pathname); } catch { /**/ }
    processApiBody(call.body, 'api-direct');
  }

  // From browser sections
  for (const sec of sections) {
    sec.domContent.categories.forEach(c => allCategories.add(c));
    sec.domContent.items.forEach(item => allItems.push({ ...item, section: sec.section }));
    for (const call of sec.apiCalls) {
      try { apiEndpoints.add(new URL(call.url).pathname); } catch { /**/ }
      processApiBody(call.body, sec.section);
    }
  }

  // Deduplicate by id > url > title
  const byKey = new Map<string, ContentItem>();
  for (const item of allItems) {
    const key = (item.id || item.url || item.title || '') as string;
    if (key && !byKey.has(key)) byKey.set(key, item);
  }

  const result: ScrapedData = {
    scrapedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    sections,
    directApiResults,
    allItems: [...byKey.values()],
    categories: [...allCategories],
    apiEndpoints: [...apiEndpoints].sort(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));

  console.log('\n=== Summary ===');
  console.log(`  Output          : ${OUTPUT_FILE}`);
  console.log(`  Total items     : ${result.allItems.length}`);
  console.log(`  Categories      : ${result.categories.length}`);
  console.log(`  API endpoints   : ${result.apiEndpoints.length}`);
  if (result.apiEndpoints.length) {
    console.log('\nDiscovered endpoints:');
    result.apiEndpoints.forEach(ep => console.log('  ' + ep));
  }
  if (result.categories.length) {
    console.log('\nCategories:', result.categories.join(', '));
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message ?? err);
  process.exit(1);
});
