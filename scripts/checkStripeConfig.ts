/**
 * Check Stripe Configuration
 *
 * Verifies Stripe is configured and reports current mode.
 * Provides instructions for switching to production.
 *
 * Run with: npx ts-node scripts/checkStripeConfig.ts
 */

import * as dotenv from 'dotenv';

dotenv.config();

async function checkStripeConfig() {
  console.log('💳 Checking Stripe Configuration...');
  console.log('');

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Check if keys exist
  if (!secretKey) {
    console.log('⚠️  STRIPE_SECRET_KEY not found');
    console.log('');
    console.log('To configure Stripe:');
    console.log('1. Go to https://dashboard.stripe.com/apikeys');
    console.log('2. Copy your keys');
    console.log('3. Add to Render environment variables');
    return { configured: false, mode: 'none' };
  }

  // Determine mode from key prefix
  const isLiveMode = secretKey.startsWith('sk_live_');
  const isTestMode = secretKey.startsWith('sk_test_');

  console.log('Keys Found:');
  console.log(`  Secret Key:      ${secretKey.slice(0, 12)}...${secretKey.slice(-4)}`);
  console.log(`  Publishable Key: ${publishableKey ? publishableKey.slice(0, 12) + '...' + publishableKey.slice(-4) : 'NOT SET'}`);
  console.log(`  Webhook Secret:  ${webhookSecret ? 'Set' : 'NOT SET'}`);
  console.log('');

  if (isTestMode) {
    console.log('📌 Mode: TEST');
    console.log('   Payments will NOT process real money.');
    console.log('');
    console.log('─'.repeat(50));
    console.log('TO SWITCH TO PRODUCTION:');
    console.log('─'.repeat(50));
    console.log('');
    console.log('1. Go to Stripe Dashboard:');
    console.log('   https://dashboard.stripe.com/apikeys');
    console.log('');
    console.log('2. Toggle OFF "Test mode" in the header');
    console.log('');
    console.log('3. Copy your LIVE keys (sk_live_... and pk_live_...)');
    console.log('');
    console.log('4. Go to Render Dashboard:');
    console.log('   https://dashboard.render.com');
    console.log('');
    console.log('5. Select your service → Environment');
    console.log('');
    console.log('6. Update these variables:');
    console.log('   STRIPE_SECRET_KEY      → sk_live_...');
    console.log('   STRIPE_PUBLISHABLE_KEY → pk_live_...');
    console.log('   STRIPE_WEBHOOK_SECRET  → whsec_... (create new webhook for live mode)');
    console.log('');
    console.log('7. Save and wait for redeploy');
    console.log('');

    return { configured: true, mode: 'test' };
  }

  if (isLiveMode) {
    console.log('✅ Mode: PRODUCTION');
    console.log('   Payments WILL process real money!');
    console.log('');

    // Verify webhook is set
    if (!webhookSecret) {
      console.log('⚠️  WARNING: Webhook secret not set!');
      console.log('   Webhook events will not be verified.');
      console.log('   Go to https://dashboard.stripe.com/webhooks to set up.');
    }

    return { configured: true, mode: 'live' };
  }

  console.log('⚠️  Unknown key format');
  return { configured: true, mode: 'unknown' };
}

// Check Render API access
function checkRenderAPI() {
  console.log('');
  console.log('🌐 Checking Render API Access...');
  console.log('');

  const renderApiKey = process.env.RENDER_API_KEY;
  const renderServiceId = process.env.RENDER_SERVICE_ID;

  if (renderApiKey && renderServiceId) {
    console.log('✓ Render API credentials found!');
    console.log('  Automated env var updates are possible.');
    return true;
  }

  console.log('⚠️  Render API credentials not found.');
  console.log('');
  console.log('To enable automated updates:');
  console.log('1. Go to https://dashboard.render.com/u/settings/api-keys');
  console.log('2. Create an API key');
  console.log('3. Add RENDER_API_KEY to environment');
  console.log('4. Get service ID from service URL (srv-xxxxx)');
  console.log('5. Add RENDER_SERVICE_ID to environment');
  console.log('');
  console.log('For now, use the Render Dashboard for manual updates.');

  return false;
}

async function main() {
  const stripeResult = await checkStripeConfig();
  const renderAvailable = checkRenderAPI();

  console.log('');
  console.log('─'.repeat(50));
  console.log('Summary:');
  console.log(`  Stripe: ${stripeResult.configured ? (stripeResult.mode === 'live' ? '✅ LIVE' : '⚠️ TEST') : '❌ Not configured'}`);
  console.log(`  Render API: ${renderAvailable ? '✅ Available' : '❌ Not available'}`);
  console.log('─'.repeat(50));
}

main();
