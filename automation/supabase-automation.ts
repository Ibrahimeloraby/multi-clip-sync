/**
 * Supabase Automation
 *
 * Automates interactions with Supabase Dashboard including:
 * - Login
 * - Running SQL migrations
 * - Managing database settings
 * - Generating API keys
 *
 * Setup:
 *   Add to .env.local:
 *     SUPABASE_EMAIL=your@email.com
 *     SUPABASE_PASSWORD=yourpassword
 */

import BrowserAutomation from './browser-automation';
import * as fs from 'fs';
import * as path from 'path';

export class SupabaseAutomation extends BrowserAutomation {
  private baseUrl = 'https://supabase.com';
  private projectId = 'dtkfcnlxkshrflujtsaj';

  async login(): Promise<boolean> {
    const email = this.getCredential('supabase_email') || this.getCredential('email');
    const password = this.getCredential('supabase_password') || this.getCredential('password');

    if (!email || !password) {
      console.error('❌ Missing Supabase credentials. Add to .env.local:');
      console.error('   SUPABASE_EMAIL=your@email.com');
      console.error('   SUPABASE_PASSWORD=yourpassword');
      return false;
    }

    try {
      console.log('🚀 Opening Supabase...');
      await this.navigate(`${this.baseUrl}/dashboard/sign-in`);
      await this.screenshot('supabase-login-page');

      // Wait for login form
      await this.waitForSelector('input[type="email"], input[name="email"]', 10000);

      // Fill credentials
      console.log('📝 Entering credentials...');
      await this.type('input[type="email"], input[name="email"]', email);
      await this.type('input[type="password"], input[name="password"]', password);

      // Click login button
      await this.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await this.page?.waitForURL('**/projects**', { timeout: 30000 }).catch(() => {
        // May redirect elsewhere
      });

      await this.screenshot('supabase-after-login');
      console.log('✅ Logged in to Supabase successfully!');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error);
      await this.screenshot('supabase-login-error');
      return false;
    }
  }

  async openProject(projectId?: string): Promise<boolean> {
    const pid = projectId || this.projectId;
    try {
      console.log(`📂 Opening project: ${pid}`);
      await this.navigate(`${this.baseUrl}/dashboard/project/${pid}`);
      await this.page?.waitForLoadState('networkidle');
      await this.screenshot('supabase-project');
      return true;
    } catch (error) {
      console.error('❌ Failed to open project:', error);
      return false;
    }
  }

  async openSQLEditor(): Promise<boolean> {
    try {
      console.log('📝 Opening SQL Editor...');
      await this.navigate(`${this.baseUrl}/dashboard/project/${this.projectId}/sql/new`);
      await this.waitForSelector('.monaco-editor, textarea[placeholder*="SQL"], [data-testid="sql-editor"]', 15000);
      await this.screenshot('supabase-sql-editor');
      console.log('✅ SQL Editor opened');
      return true;
    } catch (error) {
      console.error('❌ Failed to open SQL Editor:', error);
      return false;
    }
  }

  async runSQL(sql: string): Promise<boolean> {
    try {
      // Clear any existing content and paste new SQL
      console.log('📝 Entering SQL...');

      // Try to find and click the editor
      const editor = await this.page?.$('.monaco-editor, textarea, [data-testid="sql-editor"]');
      if (editor) {
        await editor.click();
        // Select all and replace
        await this.page?.keyboard.press('Meta+a');
        await this.page?.keyboard.type(sql, { delay: 1 });
      }

      await this.screenshot('supabase-sql-entered');

      // Click Run button
      console.log('🚀 Running SQL...');
      const runButton = await this.page?.$('button:has-text("Run"), button:has-text("Execute"), [data-testid="run-query"]');
      if (runButton) {
        await runButton.click();

        // Wait for result
        await this.page?.waitForTimeout(5000);
        await this.screenshot('supabase-sql-result');

        // Check for errors
        const errorElement = await this.page?.$('.error, [data-testid="error"], :has-text("ERROR")');
        if (errorElement) {
          const errorText = await errorElement.textContent();
          console.error('❌ SQL Error:', errorText);
          return false;
        }

        console.log('✅ SQL executed successfully!');
        return true;
      }

      console.error('❌ Run button not found');
      return false;
    } catch (error) {
      console.error('❌ Failed to run SQL:', error);
      return false;
    }
  }

  async runMigrations(): Promise<boolean> {
    try {
      // Read the combined migrations file
      const migrationsPath = path.join(process.cwd(), 'supabase', 'migrations', 'COMBINED_MIGRATIONS.sql');
      if (!fs.existsSync(migrationsPath)) {
        console.error('❌ Migrations file not found:', migrationsPath);
        return false;
      }

      const sql = fs.readFileSync(migrationsPath, 'utf-8');
      console.log('📄 Loaded migrations file');

      // Open SQL editor and run
      await this.openSQLEditor();
      return await this.runSQL(sql);
    } catch (error) {
      console.error('❌ Failed to run migrations:', error);
      return false;
    }
  }

  async getDatabasePassword(): Promise<string | null> {
    try {
      console.log('🔑 Getting database password...');
      await this.navigate(`${this.baseUrl}/dashboard/project/${this.projectId}/settings/database`);
      await this.page?.waitForLoadState('networkidle');

      // Look for password field or reveal button
      const revealButton = await this.page?.$('button:has-text("Reveal"), button:has-text("Show")');
      if (revealButton) {
        await revealButton.click();
        await this.page?.waitForTimeout(1000);
      }

      // Try to get the password value
      const passwordInput = await this.page?.$('input[type="password"], input[name*="password"]');
      if (passwordInput) {
        const password = await passwordInput.inputValue();
        console.log('✅ Retrieved database password');
        return password;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get database password:', error);
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      console.log('🔑 Getting access token...');
      await this.navigate(`${this.baseUrl}/dashboard/account/tokens`);
      await this.page?.waitForLoadState('networkidle');

      // Look for generate button
      const generateButton = await this.page?.$('button:has-text("Generate"), button:has-text("Create")');
      if (generateButton) {
        await generateButton.click();

        // Fill token name
        const nameInput = await this.page?.$('input[name="name"], input[placeholder*="name"]');
        if (nameInput) {
          await nameInput.fill('automation-token-' + Date.now());
        }

        // Submit
        const submitButton = await this.page?.$('button:has-text("Generate"), button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await this.page?.waitForTimeout(2000);

          // Get the token
          const tokenElement = await this.page?.$('code, pre, [data-testid="token"]');
          if (tokenElement) {
            const token = await tokenElement.textContent();
            console.log('✅ Generated access token');
            return token?.trim() || null;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      return null;
    }
  }
}

export default SupabaseAutomation;
