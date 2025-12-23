/**
 * Create Admin User
 *
 * Creates the admin user via Supabase Auth Admin API
 * and sends a password reset email for secure password setup.
 *
 * Run with: npx ts-node scripts/createAdminUser.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.SITE_URL || 'https://personalizedoutput.com';
const ADMIN_EMAIL = 'persefit@outlook.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log('⚠️  Supabase credentials not found.');
  console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  console.log('👤 Creating Admin User...');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log('');

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.log('⚠️  Could not check existing users:', listError.message);
      console.log('   Attempting to create user anyway...');
    }

    const adminExists = existingUsers?.users?.some(u => u.email === ADMIN_EMAIL);

    if (adminExists) {
      console.log('✓ Admin user already exists.');
      console.log('');
      console.log('Sending password reset email...');

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, {
        redirectTo: `${SITE_URL}/admin/reset-password`,
      });

      if (resetError) {
        console.log('⚠️  Could not send reset email:', resetError.message);
      } else {
        console.log('✓ Password reset email sent!');
        console.log(`  Check ${ADMIN_EMAIL} for the reset link.`);
      }

      return true;
    }

    // Create new admin user with a random temporary password
    const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'admin',
        full_name: 'Admin',
      },
    });

    if (createError) {
      console.log('⚠️  Could not create user:', createError.message);
      return false;
    }

    console.log('✓ Admin user created!');
    console.log(`  User ID: ${newUser.user.id}`);
    console.log('');

    // Send password reset email so user can set their own password
    console.log('Sending password setup email...');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, {
      redirectTo: `${SITE_URL}/admin/reset-password`,
    });

    if (resetError) {
      console.log('⚠️  Could not send reset email:', resetError.message);
      console.log('');
      console.log('Alternative: Use the temporary password to log in, then change it.');
    } else {
      console.log('✓ Password setup email sent!');
      console.log(`  Check ${ADMIN_EMAIL} for the link.`);
    }

    // Also create profile entry if profiles table exists
    try {
      await supabase.from('profiles').insert({
        id: newUser.user.id,
        email: ADMIN_EMAIL,
        full_name: 'Admin',
        referral_code: 'ADMIN',
        subscription_tier: 'power',
        subscription_status: 'active',
        monthly_outputs_limit: 999,
        monthly_outputs_used: 0,
      });
      console.log('✓ Admin profile created.');
    } catch (e) {
      // Profile table might not exist or have different schema
    }

    return true;
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

createAdminUser()
  .then((success) => {
    console.log('');
    if (success) {
      console.log('─'.repeat(50));
      console.log('✅ Admin setup complete!');
      console.log('');
      console.log('Next steps:');
      console.log(`1. Check ${ADMIN_EMAIL} for password setup email`);
      console.log('2. Click the link to set your password');
      console.log('3. Log in at /admin/login');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
