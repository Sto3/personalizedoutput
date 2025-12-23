/**
 * Create thought_sessions table in Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createTable() {
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'NOT SET');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'NOT SET');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // First check if table exists
  const { data, error } = await supabase
    .from('thought_sessions')
    .select('session_id')
    .limit(1);

  if (!error) {
    console.log('✓ thought_sessions table already exists');
    return;
  }

  if (error.code === '42P01') {
    console.log('Table does not exist, creating...');

    // Use raw SQL via the REST API
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql_query: `
          CREATE TABLE thought_sessions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            session_id TEXT UNIQUE NOT NULL,
            product_id TEXT NOT NULL,
            turns JSONB DEFAULT '[]'::jsonb,
            status TEXT DEFAULT 'in_progress',
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE INDEX idx_thought_sessions_session_id ON thought_sessions(session_id);
        `
      })
    });

    if (!response.ok) {
      console.log('RPC not available, please run SQL manually in Supabase dashboard:');
      console.log(`
CREATE TABLE thought_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL,
  turns JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'in_progress',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_thought_sessions_session_id ON thought_sessions(session_id);
      `);
    } else {
      console.log('✓ Table created successfully');
    }
  } else {
    console.error('Unexpected error:', error);
  }
}

createTable().catch(console.error);
