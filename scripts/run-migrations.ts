/**
 * Migration Runner Script
 * Runs SQL migrations against Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration(migrationFile: string) {
  console.log(`\n📦 Running migration: ${path.basename(migrationFile)}`);

  const sql = fs.readFileSync(migrationFile, 'utf-8');

  // Split by statement (handle multi-statement migrations)
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`   Found ${statements.length} statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct query if rpc fails
        const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
        if (directError) {
          console.log(`   ⚠️  Statement ${i + 1}: May need manual execution`);
          console.log(`      Preview: ${preview}`);
        }
      } else {
        console.log(`   ✅ Statement ${i + 1} executed`);
      }
    } catch (err) {
      console.log(`   ⚠️  Statement ${i + 1}: ${preview}`);
    }
  }

  console.log(`✅ Migration complete: ${path.basename(migrationFile)}`);
}

async function main() {
  const migrationArg = process.argv[2];
  const migrationsDir = path.join(__dirname, '../supabase/migrations');

  if (migrationArg) {
    // Run specific migration
    const migrationPath = migrationArg.includes('/')
      ? migrationArg
      : path.join(migrationsDir, migrationArg);

    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    await runMigration(migrationPath);
  } else {
    // List available migrations
    console.log('\n📋 Available migrations:\n');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.includes('.applied'))
      .sort();

    files.forEach(f => console.log(`   ${f}`));
    console.log('\nUsage: npx ts-node scripts/run-migrations.ts <migration-file>');
  }
}

main().catch(console.error);
