/**
 * Lovable.dev Automation
 *
 * Automates interactions with Lovable.dev including:
 * - Login
 * - Project management
 * - Code deployment
 * - Settings management
 *
 * Setup:
 *   Add to .env.local:
 *     LOVABLE_EMAIL=your@email.com
 *     LOVABLE_PASSWORD=yourpassword
 */

import BrowserAutomation from './browser-automation';

export class LovableAutomation extends BrowserAutomation {
  private baseUrl = 'https://lovable.dev';

  async login(): Promise<boolean> {
    const email = this.getCredential('lovable_email') || this.getCredential('email');
    const password = this.getCredential('lovable_password') || this.getCredential('password');

    if (!email || !password) {
      console.error('❌ Missing Lovable credentials. Add to .env.local:');
      console.error('   LOVABLE_EMAIL=your@email.com');
      console.error('   LOVABLE_PASSWORD=yourpassword');
      return false;
    }

    try {
      console.log('🚀 Opening Lovable...');
      await this.navigate(`${this.baseUrl}/login`);
      await this.screenshot('lovable-login-page');

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

      await this.screenshot('lovable-after-login');
      console.log('✅ Logged in to Lovable successfully!');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error);
      await this.screenshot('lovable-login-error');
      return false;
    }
  }

  async listProjects(): Promise<string[]> {
    const projects: string[] = [];
    try {
      await this.navigate(`${this.baseUrl}/projects`);
      await this.waitForSelector('[data-testid="project-card"], .project-card, a[href*="/project/"]', 10000);

      // Get all project names
      const projectElements = await this.page?.$$('[data-testid="project-card"], .project-card, a[href*="/project/"]');
      if (projectElements) {
        for (const el of projectElements) {
          const name = await el.textContent();
          if (name) projects.push(name.trim());
        }
      }

      console.log(`📂 Found ${projects.length} projects`);
      return projects;
    } catch (error) {
      console.error('❌ Failed to list projects:', error);
      return projects;
    }
  }

  async openProject(projectName: string): Promise<boolean> {
    try {
      await this.navigate(`${this.baseUrl}/projects`);
      await this.waitForSelector('a[href*="/project/"]', 10000);

      // Find and click the project
      const projectLink = await this.page?.$(`a:has-text("${projectName}")`);
      if (projectLink) {
        await projectLink.click();
        await this.page?.waitForLoadState('networkidle');
        console.log(`✅ Opened project: ${projectName}`);
        await this.screenshot(`lovable-project-${projectName}`);
        return true;
      }

      console.error(`❌ Project not found: ${projectName}`);
      return false;
    } catch (error) {
      console.error('❌ Failed to open project:', error);
      return false;
    }
  }

  async deployProject(): Promise<boolean> {
    try {
      // Look for deploy button
      const deployButton = await this.page?.$('button:has-text("Deploy"), button:has-text("Publish")');
      if (deployButton) {
        await deployButton.click();
        console.log('🚀 Deploying project...');

        // Wait for deployment to complete
        await this.page?.waitForSelector(':has-text("Deployed"), :has-text("Published")', { timeout: 120000 });
        console.log('✅ Deployment complete!');
        await this.screenshot('lovable-deployed');
        return true;
      }

      console.error('❌ Deploy button not found');
      return false;
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      return false;
    }
  }

  async getProjectUrl(): Promise<string | null> {
    try {
      // Look for the deployed URL
      const urlElement = await this.page?.$('a[href*="lovable.app"], a[href*=".vercel.app"]');
      if (urlElement) {
        const url = await urlElement.getAttribute('href');
        console.log(`🔗 Project URL: ${url}`);
        return url;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export default LovableAutomation;
