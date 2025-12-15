#!/usr/bin/env npx ts-node

/**
 * Santa Message Publisher CLI
 *
 * Dedicated CLI for publishing Santa message listings to Etsy.
 *
 * Usage:
 *   npm run etsy:publish:santa -- --count=50 --mode=draft
 *   npm run etsy:preview:santa -- --count=10
 *
 * Options:
 *   --count=<n>        Number of listings to create (default: 10)
 *   --mode=<mode>      Publish mode: draft (default) or active
 *   --preview          Preview only - don't create listings
 *   --dry-run          Dry run - simulate API calls
 *   --themes=<ids>     Comma-separated theme IDs to use
 *   --delay=<ms>       Delay between listings in ms (default: 1000)
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { SantaBatchPublisher } from '../services/santaBatchPublisher';
import { getAuthStatus } from '../api/etsyAuth';

// ============================================================
// CLI HELPERS
// ============================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color?: keyof typeof COLORS): void {
  if (color) {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  } else {
    console.log(message);
  }
}

function logHeader(title: string): void {
  console.log('');
  log('='.repeat(60), 'cyan');
  log(` ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
  console.log('');
}

function logSuccess(message: string): void {
  log(`✓ ${message}`, 'green');
}

function logError(message: string): void {
  log(`✗ ${message}`, 'red');
}

function logWarning(message: string): void {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message: string): void {
  log(`ℹ ${message}`, 'blue');
}

function showUsage(): void {
  logHeader('Santa Message Publisher');

  console.log('Usage:');
  console.log('  npm run etsy:publish:santa -- [options]');
  console.log('  npm run etsy:preview:santa -- [options]');
  console.log('');
  console.log('Options:');
  console.log('  --count=<n>        Number of listings to create (default: 10)');
  console.log('  --mode=<mode>      Publish mode: draft (default) or active');
  console.log('  --preview          Preview only - no API calls');
  console.log('  --dry-run          Dry run - simulate API calls');
  console.log('  --themes=<ids>     Comma-separated theme IDs to use');
  console.log('  --delay=<ms>       Delay between listings in ms (default: 1000)');
  console.log('');
  console.log('Examples:');
  console.log('  # Preview 5 listings');
  console.log('  npm run etsy:preview:santa -- --count=5');
  console.log('');
  console.log('  # Create 50 draft listings');
  console.log('  npm run etsy:publish:santa -- --count=50 --mode=draft');
  console.log('');
  console.log('  # Create 10 listings for specific themes');
  console.log('  npm run etsy:publish:santa -- --count=10 --themes=toddlers_2_4,children_5_7');
  console.log('');
  console.log('  # Dry run (test without API calls)');
  console.log('  npm run etsy:publish:santa -- --count=50 --dry-run');
  console.log('');
  console.log('Price: $19.95 per listing (configured in santaBatchPublisher.ts)');
  console.log('');
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse options
  const options: Record<string, string | boolean> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key] = value || true;
    } else if (arg === '-h' || arg === 'help') {
      showUsage();
      process.exit(0);
    }
  }

  // Show help if requested
  if (options.help) {
    showUsage();
    process.exit(0);
  }

  // Extract options
  const count = parseInt(options.count as string) || 10;
  const mode = (options.mode as 'draft' | 'active') || 'draft';
  const preview = options.preview === true;
  const dryRun = options['dry-run'] === true;
  const themes = options.themes ? (options.themes as string).split(',') : undefined;
  const delay = parseInt(options.delay as string) || 1000;

  // Create publisher
  const publisher = new SantaBatchPublisher();

  // Preview mode - just show what would be generated
  if (preview) {
    logHeader('Santa Listing Preview');
    logInfo(`Previewing ${count} listings...`);
    console.log('');

    publisher.preview(count);
    return;
  }

  // Check authentication for non-dry-run
  if (!dryRun) {
    const status = getAuthStatus();
    if (!status.authenticated) {
      logHeader('Authentication Required');
      logError('Not authenticated with Etsy');
      console.log('');
      console.log('Run this command first:');
      console.log('  npm run etsy:auth');
      console.log('');
      console.log('Or use --dry-run to test without authentication:');
      console.log('  npm run etsy:publish:santa -- --count=50 --dry-run');
      console.log('');
      process.exit(1);
    }
  }

  // Initialize publisher
  logHeader('Santa Message Publisher');

  if (!dryRun) {
    logInfo('Initializing Etsy client...');
    try {
      await publisher.init();
      logSuccess('Connected to Etsy');
    } catch (error) {
      logError(`Failed to initialize: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  // Show configuration
  console.log('');
  logInfo(`Count: ${count} listings`);
  logInfo(`Mode: ${mode.toUpperCase()}`);
  logInfo(`Dry run: ${dryRun ? 'YES' : 'NO'}`);
  if (themes) {
    logInfo(`Themes: ${themes.join(', ')}`);
  }
  logInfo(`Delay: ${delay}ms between listings`);
  console.log('');

  // Safety warning for active mode
  if (mode === 'active' && !dryRun) {
    logWarning('WARNING: Active mode will make listings immediately visible on Etsy!');
    logInfo('Press Ctrl+C to cancel, or wait 10 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  } else if (!dryRun) {
    logInfo('Creating DRAFT listings (will need to be activated manually on Etsy)');
    logInfo('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Publish listings
  console.log('');
  logInfo('Starting batch publish...');

  try {
    const report = await publisher.publishListings({
      count,
      mode,
      dryRun,
      delayMs: delay,
      specificThemes: themes
    });

    // Print final summary
    console.log('');
    if (report.totalSucceeded > 0) {
      logSuccess(`Successfully created ${report.totalSucceeded} listings!`);
    }

    if (report.totalFailed > 0) {
      logError(`${report.totalFailed} listings failed`);

      // Show failed items
      const failed = report.results.filter(r => !r.success);
      if (failed.length > 0 && failed.length <= 5) {
        console.log('');
        logInfo('Failed listings:');
        for (const f of failed) {
          console.log(`  - ${f.title.substring(0, 50)}... : ${f.error}`);
        }
      }
    }

    // Show next steps
    if (!dryRun && report.totalSucceeded > 0) {
      console.log('');
      logInfo('Next steps:');
      if (mode === 'draft') {
        console.log('  1. Go to https://www.etsy.com/your/shops/me/tools/listings');
        console.log('  2. Review the draft listings');
        console.log('  3. Activate listings you want to publish');
      } else {
        console.log('  1. Go to https://www.etsy.com/your/shops/me/tools/listings');
        console.log('  2. Verify listings appear correctly');
        console.log('  3. Monitor for any issues');
      }
      console.log('');
    }

  } catch (error) {
    logError(`Publish failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
