#!/usr/bin/env npx ts-node

/**
 * Product Publisher CLI
 *
 * Unified CLI for publishing Vision Boards, Planners, and Flash Cards to Etsy.
 * (Santa has its own CLI - see santaCli.ts)
 *
 * Usage:
 *   npm run etsy:publish:vision -- --count=100 --mode=draft
 *   npm run etsy:publish:planner -- --count=100 --mode=draft
 *   npm run etsy:publish:flash -- --count=100 --mode=draft
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { ProductBatchPublisher } from '../services/productBatchPublisher';
import { getAuthStatus } from '../api/etsyAuth';
import { ProductType } from '../config/types';

// ============================================================
// CLI HELPERS
// ============================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
  logHeader('Product Publisher CLI');

  console.log('Usage:');
  console.log('  npm run etsy:publish:vision -- [options]');
  console.log('  npm run etsy:publish:planner -- [options]');
  console.log('  npm run etsy:publish:flash -- [options]');
  console.log('');
  console.log('Options:');
  console.log('  --count=<n>        Number of listings (default: 10)');
  console.log('  --mode=<mode>      draft (default) or active');
  console.log('  --preview          Preview only - no API calls');
  console.log('  --dry-run          Dry run - simulate API calls');
  console.log('  --themes=<ids>     Comma-separated theme IDs');
  console.log('  --delay=<ms>       Delay between listings (default: 1000)');
  console.log('');
  console.log('Products & Prices:');
  console.log('  vision_board  $12.99  42 themes');
  console.log('  planner       $14.99  21 themes');
  console.log('  flash_cards    $9.99  28 themes');
  console.log('');
  console.log('Examples:');
  console.log('  npm run etsy:publish:vision -- --count=100 --mode=draft');
  console.log('  npm run etsy:publish:planner -- --preview --count=5');
  console.log('  npm run etsy:publish:flash -- --dry-run --count=50');
  console.log('');
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Determine product type from script name or arg
  let productType: ProductType | null = null;
  const scriptPath = process.argv[1] || '';

  if (scriptPath.includes('vision') || args.includes('vision_board')) {
    productType = 'vision_board';
  } else if (scriptPath.includes('planner') || args.includes('planner')) {
    productType = 'planner';
  } else if (scriptPath.includes('flash') || args.includes('flash_cards')) {
    productType = 'flash_cards';
  }

  // Parse options
  const options: Record<string, string | boolean> = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key] = value || true;
    } else if (arg === '-h' || arg === 'help') {
      showUsage();
      process.exit(0);
    } else if (['vision_board', 'planner', 'flash_cards'].includes(arg)) {
      productType = arg as ProductType;
    }
  }

  if (options.help) {
    showUsage();
    process.exit(0);
  }

  if (!productType) {
    logError('Product type required. Use: vision_board, planner, or flash_cards');
    showUsage();
    process.exit(1);
  }

  const count = parseInt(options.count as string) || 10;
  const mode = (options.mode as 'draft' | 'active') || 'draft';
  const preview = options.preview === true;
  const dryRun = options['dry-run'] === true;
  const themes = options.themes ? (options.themes as string).split(',') : undefined;
  const delay = parseInt(options.delay as string) || 1000;

  const publisher = new ProductBatchPublisher();

  // Preview mode
  if (preview) {
    logHeader(`${productType.toUpperCase()} Listing Preview`);
    logInfo(`Previewing ${count} listings...`);
    console.log('');
    publisher.preview(productType, count);
    return;
  }

  // Check authentication
  if (!dryRun) {
    const status = getAuthStatus();
    if (!status.authenticated) {
      logHeader('Authentication Required');
      logError('Not authenticated with Etsy');
      console.log('');
      console.log('Run: npm run etsy:auth');
      console.log('Or use --dry-run to test without authentication');
      console.log('');
      process.exit(1);
    }
  }

  // Initialize
  logHeader(`${productType.toUpperCase()} Publisher`);

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

  console.log('');
  logInfo(`Product: ${productType}`);
  logInfo(`Count: ${count} listings`);
  logInfo(`Mode: ${mode.toUpperCase()}`);
  logInfo(`Dry run: ${dryRun ? 'YES' : 'NO'}`);
  if (themes) logInfo(`Themes: ${themes.join(', ')}`);
  logInfo(`Delay: ${delay}ms between listings`);
  console.log('');

  // Safety warning
  if (mode === 'active' && !dryRun) {
    logWarning('WARNING: Active mode will make listings immediately visible!');
    logInfo('Press Ctrl+C to cancel, or wait 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  } else if (!dryRun) {
    logInfo('Creating DRAFT listings...');
    logInfo('Press Ctrl+C to cancel, or wait 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Publish
  console.log('');
  logInfo('Starting batch publish...');

  try {
    const report = await publisher.publishListings({
      productType,
      count,
      mode,
      dryRun,
      delayMs: delay,
      specificThemes: themes
    });

    console.log('');
    if (report.totalSucceeded > 0) {
      logSuccess(`Successfully created ${report.totalSucceeded} listings!`);
    }
    if (report.totalFailed > 0) {
      logError(`${report.totalFailed} listings failed`);
    }

    if (!dryRun && report.totalSucceeded > 0) {
      console.log('');
      logInfo('Next steps:');
      console.log('  1. Go to https://www.etsy.com/your/shops/me/tools/listings');
      console.log('  2. Review the draft listings');
      console.log('  3. Activate listings you want to publish');
      console.log('');
    }

  } catch (error) {
    logError(`Publish failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
