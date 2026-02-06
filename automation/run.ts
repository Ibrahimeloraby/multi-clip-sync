#!/usr/bin/env npx ts-node
/**
 * Automation Runner
 *
 * Run with: npm run automate [command]
 *
 * Commands:
 *   supabase:login     - Login to Supabase
 *   supabase:migrate   - Run database migrations
 *   supabase:secrets   - Get Supabase credentials for GitHub
 *   lovable:login      - Login to Lovable
 *   lovable:deploy     - Deploy current project
 *   all                - Run full setup (Supabase migrations + deploy)
 */

import { SupabaseAutomation } from './supabase-automation';
import { LovableAutomation } from './lovable-automation';
import * as fs from 'fs';
import * as path from 'path';

const COMMANDS = {
  'supabase:login': runSupabaseLogin,
  'supabase:migrate': runSupabaseMigrate,
  'supabase:secrets': runSupabaseGetSecrets,
  'lovable:login': runLovableLogin,
  'lovable:deploy': runLovableDeploy,
  'lovable:list': runLovableListProjects,
  'all': runAll,
  'help': showHelp,
};

async function runSupabaseLogin() {
  const supabase = new SupabaseAutomation();
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  try {
    await supabase.launch(isCI);
    const success = await supabase.login();
    if (success) {
      await supabase.openProject();
      console.log('✅ Login successful!');
    }

    if (isCI) {
      await supabase.close();
    } else {
      console.log('\n📌 Browser will stay open. Press Ctrl+C to close.\n');
      await new Promise(() => {}); // Keep running for interactive mode
    }
  } catch (error) {
    console.error('Error:', error);
    await supabase.close();
    process.exit(1);
  }
}

async function runSupabaseMigrate() {
  const supabase = new SupabaseAutomation();
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  try {
    await supabase.launch(isCI); // headless in CI
    const loginSuccess = await supabase.login();
    if (!loginSuccess) {
      console.error('❌ Cannot run migrations without logging in');
      await supabase.close();
      process.exit(1);
    }

    const migrateSuccess = await supabase.runMigrations();
    if (migrateSuccess) {
      console.log('\n✅ Migrations completed successfully!\n');
    } else {
      console.error('\n❌ Migrations failed\n');
    }

    await supabase.close();

    if (!isCI) {
      console.log('📌 Done! Browser closed.\n');
    }
  } catch (error) {
    console.error('Error:', error);
    await supabase.close();
    process.exit(1);
  }
}

async function runSupabaseGetSecrets() {
  const supabase = new SupabaseAutomation();
  try {
    await supabase.launch(false);
    const loginSuccess = await supabase.login();
    if (!loginSuccess) {
      await supabase.close();
      return;
    }

    console.log('\n🔐 Getting credentials for GitHub Secrets...\n');

    const accessToken = await supabase.getAccessToken();
    const dbPassword = await supabase.getDatabasePassword();

    console.log('\n' + '='.repeat(50));
    console.log('GitHub Secrets to add:');
    console.log('='.repeat(50));

    if (accessToken) {
      console.log(`\nSUPABASE_ACCESS_TOKEN:\n${accessToken}`);
    } else {
      console.log('\n⚠️  Could not retrieve access token automatically.');
      console.log('   Go to: https://supabase.com/dashboard/account/tokens');
    }

    if (dbPassword) {
      console.log(`\nSUPABASE_DB_PASSWORD:\n${dbPassword}`);
    } else {
      console.log('\n⚠️  Could not retrieve database password automatically.');
      console.log('   Go to: Project Settings → Database → Database password');
    }

    console.log('\n' + '='.repeat(50) + '\n');

    await supabase.close();
  } catch (error) {
    console.error('Error:', error);
    await supabase.close();
  }
}

async function runLovableLogin() {
  const lovable = new LovableAutomation();
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  try {
    await lovable.launch(isCI);
    const success = await lovable.login();
    if (success) {
      const projects = await lovable.listProjects();
      console.log('\nProjects:', projects);
    }

    if (isCI) {
      await lovable.close();
    } else {
      console.log('\n📌 Browser will stay open. Press Ctrl+C to close.\n');
      await new Promise(() => {});
    }
  } catch (error) {
    console.error('Error:', error);
    await lovable.close();
    process.exit(1);
  }
}

async function runLovableListProjects() {
  const lovable = new LovableAutomation();
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  try {
    await lovable.launch(isCI);
    const success = await lovable.login();
    if (success) {
      const projects = await lovable.listProjects();
      console.log('\n📂 Your Lovable Projects:');
      projects.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
    }
    await lovable.close();
  } catch (error) {
    console.error('Error:', error);
    await lovable.close();
    process.exit(1);
  }
}

async function runLovableDeploy() {
  const lovable = new LovableAutomation();
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  try {
    await lovable.launch(isCI);
    const loginSuccess = await lovable.login();
    if (!loginSuccess) {
      await lovable.close();
      process.exit(1);
    }

    // Open the project (you may need to specify which one)
    const projectOpened = await lovable.openProject('multi-clip-sync');
    if (projectOpened) {
      await lovable.deployProject();
      const url = await lovable.getProjectUrl();
      if (url) {
        console.log(`\n🌐 Deployed to: ${url}\n`);
      }
    }

    await lovable.close();
  } catch (error) {
    console.error('Error:', error);
    await lovable.close();
    process.exit(1);
  }
}

async function runAll() {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  console.log('🚀 Running full automation setup...\n');

  // Step 1: Run Supabase migrations
  console.log('Step 1: Running Supabase migrations...');
  const supabase = new SupabaseAutomation();
  try {
    await supabase.launch(isCI);
    const loginSuccess = await supabase.login();
    if (loginSuccess) {
      await supabase.runMigrations();
    }
    await supabase.close();
  } catch (error) {
    console.error('Supabase automation failed:', error);
    await supabase.close();
  }

  // Step 2: Deploy to Lovable (if configured)
  console.log('\nStep 2: Deploying to Lovable...');
  const lovable = new LovableAutomation();
  try {
    await lovable.launch(isCI);
    const loginSuccess = await lovable.login();
    if (loginSuccess) {
      await lovable.openProject('multi-clip-sync');
      await lovable.deployProject();
    }
    await lovable.close();
  } catch (error) {
    console.error('Lovable automation failed:', error);
    await lovable.close();
  }

  console.log('\n✅ Automation complete!\n');
}

function showHelp() {
  console.log(`
Browser Automation Tool
=======================

Usage: npm run automate [command]

Commands:
  supabase:login     Login to Supabase Dashboard
  supabase:migrate   Run database migrations via SQL Editor
  supabase:secrets   Get credentials for GitHub Secrets

  lovable:login      Login to Lovable.dev
  lovable:list       List your Lovable projects
  lovable:deploy     Deploy current project

  all                Run full setup (migrations + deploy)
  help               Show this help

Setup:
  Create .env.local in project root with:

  # For Supabase
  SUPABASE_EMAIL=your@email.com
  SUPABASE_PASSWORD=yourpassword

  # For Lovable
  LOVABLE_EMAIL=your@email.com
  LOVABLE_PASSWORD=yourpassword

  # Or use generic credentials for both
  AUTOMATION_EMAIL=your@email.com
  AUTOMATION_PASSWORD=yourpassword
`);
}

// Main execution
const command = process.argv[2] || 'help';
const handler = COMMANDS[command as keyof typeof COMMANDS];

if (handler) {
  const result = handler();
  if (result && typeof result.catch === 'function') {
    result.catch(console.error);
  }
} else {
  console.error(`Unknown command: ${command}`);
  showHelp();
}
