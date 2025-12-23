/**
 * Supabase Database Migrations
 *
 * Run with: npx ts-node scripts/runMigrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log('⚠️  Supabase credentials not found in environment.');
  console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
  console.log('To set up Supabase:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Create a project or select existing');
  console.log('3. Go to Settings → API');
  console.log('4. Copy URL and service_role key');
  console.log('5. Add to Render environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// SQL Migrations
const MIGRATIONS = [
  {
    name: 'stor_sessions',
    sql: `
      CREATE TABLE IF NOT EXISTS stor_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_email TEXT NOT NULL,
        title TEXT DEFAULT 'New Conversation',
        message_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_stor_sessions_admin ON stor_sessions(admin_email);
      CREATE INDEX IF NOT EXISTS idx_stor_sessions_updated ON stor_sessions(updated_at DESC);
    `,
  },
  {
    name: 'stor_messages',
    sql: `
      CREATE TABLE IF NOT EXISTS stor_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES stor_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        is_sensitive BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_stor_messages_session ON stor_messages(session_id);
    `,
  },
  {
    name: 'stor_alerts',
    sql: `
      CREATE TABLE IF NOT EXISTS stor_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
        title TEXT NOT NULL,
        details JSONB DEFAULT '{}'::jsonb,
        sent_at TIMESTAMPTZ
      );
    `,
  },
  {
    name: 'email_list',
    sql: `
      CREATE TABLE IF NOT EXISTS email_list (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        source TEXT DEFAULT 'website',
        user_id UUID,
        interests TEXT[] DEFAULT '{}',
        subscribed BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        unsubscribed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_email_list_email ON email_list(email);
      CREATE INDEX IF NOT EXISTS idx_email_list_subscribed ON email_list(subscribed);
    `,
  },
];

async function runMigrations() {
  console.log('🗄️  Running Supabase Migrations...');
  console.log('');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const migration of MIGRATIONS) {
    console.log(`  → ${migration.name}...`);

    try {
      // Check if table already exists
      const { data: existing } = await supabase
        .from(migration.name)
        .select('id')
        .limit(1);

      if (existing !== null) {
        console.log(`    ✓ Already exists, skipping`);
        skipCount++;
        continue;
      }
    } catch (e) {
      // Table doesn't exist, proceed with creation
    }

    // Execute migration via RPC or direct SQL
    // Note: Supabase JS client doesn't support raw SQL directly
    // We'll use the REST API for this
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: migration.sql }),
      });

      if (response.ok) {
        console.log(`    ✓ Created`);
        successCount++;
      } else {
        // RPC might not exist, need to use Supabase Dashboard or CLI
        console.log(`    ⚠️  Needs manual creation (RPC not available)`);
        errorCount++;
      }
    } catch (error) {
      console.log(`    ⚠️  Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      errorCount++;
    }
  }

  console.log('');
  console.log('─'.repeat(50));
  console.log(`Results: ${successCount} created, ${skipCount} skipped, ${errorCount} need manual setup`);

  if (errorCount > 0) {
    console.log('');
    console.log('📋 MANUAL SQL (run in Supabase SQL Editor):');
    console.log('');
    console.log('Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.log('');
    console.log('Copy and paste:');
    console.log('─'.repeat(50));
    MIGRATIONS.forEach(m => console.log(m.sql));
    console.log('─'.repeat(50));
  }

  return errorCount === 0;
}

runMigrations()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
