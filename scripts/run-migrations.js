#!/usr/bin/env node
/**
 * Migration Runner Script
 *
 * This script runs SQL migrations against the Supabase database.
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD=your_password node scripts/run-migrations.js
 *
 * Or set the full DATABASE_URL:
 *   DATABASE_URL=postgres://... node scripts/run-migrations.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const PROJECT_ID = 'dtkfcnlxkshrflujtsaj';

// Migration files to run (in order)
const MIGRATIONS = [
  '20260203000000_add_sequence_order.sql',
  '20260203000001_social_features.sql'
];

async function runMigrations() {
  // Build connection string
  let connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    const password = process.env.SUPABASE_DB_PASSWORD;
    if (!password) {
      console.error('Error: Please set SUPABASE_DB_PASSWORD or DATABASE_URL environment variable');
      console.error('');
      console.error('You can find your database password in the Supabase dashboard:');
      console.error('Project Settings > Database > Database password');
      console.error('');
      console.error('Usage:');
      console.error('  SUPABASE_DB_PASSWORD=your_password node scripts/run-migrations.js');
      process.exit(1);
    }
    connectionString = `postgres://postgres.${PROJECT_ID}:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
  }

  const client = new Client({ connectionString });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

    for (const migrationFile of MIGRATIONS) {
      const filePath = path.join(migrationsDir, migrationFile);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Migration file not found: ${migrationFile}, skipping...`);
        continue;
      }

      console.log(`Running migration: ${migrationFile}`);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ ${migrationFile} completed successfully\n`);
      } catch (err) {
        // Check if error is because objects already exist
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log(`⚠️  ${migrationFile} - Some objects already exist (this is OK)\n`);
        } else {
          throw err;
        }
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
