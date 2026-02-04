/**
 * Browser Automation Framework
 *
 * This framework allows secure automation of any website.
 * Credentials are stored in environment variables, not in code.
 *
 * Usage:
 *   1. Set credentials in .env.local (git-ignored)
 *   2. Run: npm run automate
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const ENV_FILE = path.join(process.cwd(), '.env.local');

interface Credentials {
  email?: string;
  password?: string;
  [key: string]: string | undefined;
}

export class BrowserAutomation {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected credentials: Credentials = {};

  constructor() {
    this.loadCredentials();
  }

  private loadCredentials(): void {
    // Load from environment variables first
    this.credentials = {
      email: process.env.AUTOMATION_EMAIL,
      password: process.env.AUTOMATION_PASSWORD,
      lovable_email: process.env.LOVABLE_EMAIL,
      lovable_password: process.env.LOVABLE_PASSWORD,
      supabase_email: process.env.SUPABASE_EMAIL,
      supabase_password: process.env.SUPABASE_PASSWORD,
    };

    // Try to load from .env.local if exists
    if (fs.existsSync(ENV_FILE)) {
      const content = fs.readFileSync(ENV_FILE, 'utf-8');
      content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          this.credentials[key.trim().toLowerCase()] = value.trim();
        }
      });
    }
  }

  async launch(headless: boolean = false): Promise<void> {
    this.browser = await chromium.launch({
      headless,
      slowMo: 100 // Slow down for visibility
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    this.page = await this.context.newPage();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async screenshot(name: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    const screenshotDir = path.join(process.cwd(), 'automation', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await this.page.screenshot({
      path: path.join(screenshotDir, `${name}.png`),
      fullPage: true
    });
    console.log(`📸 Screenshot saved: ${name}.png`);
  }

  async waitForSelector(selector: string, timeout: number = 30000): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.waitForSelector(selector, { timeout });
  }

  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.click(selector);
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.fill(selector, text);
  }

  async getText(selector: string): Promise<string> {
    if (!this.page) throw new Error('Browser not launched');
    return await this.page.textContent(selector) || '';
  }

  getCredential(key: string): string | undefined {
    return this.credentials[key.toLowerCase()] || this.credentials[key];
  }
}

export default BrowserAutomation;
