#!/usr/bin/env npx ts-node

/**
 * Etsy Automation CLI
 *
 * Command-line interface for managing Etsy listings at scale.
 *
 * Usage:
 *   npx ts-node src/etsy/cli/etsyCli.ts <command> [options]
 *
 * Commands:
 *   auth           - Start OAuth flow to connect your Etsy shop
 *   auth-status    - Check authentication status
 *   publish        - Bulk publish listings (requires API approval)
 *   preview        - Preview what would be published (dry run)
 *   stats          - Show publishing statistics
 *   themes         - List available themes
 *   test           - Test connection to Etsy
 *
 * CSV Export Commands (no API approval required):
 *   csv-targets    - List available CSV export targets
 *   export         - Export listings to CSV for bulk upload tools
 */

import { ProductType } from '../config/types';
import {
  getThemesByProductType,
  getThemeById,
  getAllThemes,
  STYLE_VARIANTS,
  VISION_BOARD_THEMES,
  SANTA_MESSAGE_THEMES,
  FLASH_CARD_THEMES,
  PLANNER_THEMES
} from '../config/themes';
import {
  startInteractiveAuthFlow,
  getAuthStatus,
  clearCredentials,
  refreshAccessToken
} from '../api/etsyAuth';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();
import { getEtsyClient } from '../api/etsyClient';
import { BulkPublisher, bulkPublish } from '../api/bulkPublisher';
import { getHashStats, getLogStats, getNextVariationIndex } from '../generators/variationEngine';
import { generateListing } from '../generators/listingGenerator';
import {
  listCsvTargets,
  getCsvTarget,
  getDefaultCsvTarget,
  CsvTargetId,
  ListingDraft,
  exportToCsv,
  createListingDraft,
  PRODUCT_PRICES
} from '../csv';
import { findSampleImage, getDefaultImage } from '../services/imagePipeline';

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
  logHeader('Etsy Automation CLI');

  console.log('Usage:');
  console.log('  npx ts-node src/etsy/cli/etsyCli.ts <command> [options]');
  console.log('');
  console.log('CSV Export Commands (NO API APPROVAL REQUIRED):');
  console.log('  csv-targets               List available CSV export targets');
  console.log('  export <product> <count>  Export listings to CSV file');
  console.log('');
  console.log('API Commands (requires Etsy app approval):');
  console.log('  auth                      Start OAuth flow to connect Etsy shop');
  console.log('  auth-status               Check authentication status');
  console.log('  logout                    Clear stored credentials');
  console.log('  test                      Test connection to Etsy');
  console.log('  preview <product> <count> Preview listings (dry run)');
  console.log('  publish <product> <count> Publish listings to Etsy');
  console.log('  stats                     Show publishing statistics');
  console.log('');
  console.log('Other Commands:');
  console.log('  themes [product]          List available themes');
  console.log('  generate <theme-id>       Generate a single listing');
  console.log('');
  console.log('Product types: santa_message, vision_board, planner, flash_cards');
  console.log('');
  console.log('Export Options:');
  console.log('  --file=<path>             Output CSV file path (required for export)');
  console.log('  --target=<target-id>      CSV target tool (default: shopuploader)');
  console.log('  --themes=<id1,id2,...>    Filter by specific theme IDs');
  console.log('');
  console.log('API Options:');
  console.log('  --mode=<draft|active>     Publish mode (default: draft)');
  console.log('');
  console.log('Examples:');
  console.log('  # Export 50 Santa listings to CSV (ready for Shop Uploader)');
  console.log('  npx ts-node src/etsy/cli/etsyCli.ts export santa_message 50 --file=output/etsy_csv/santa_50.csv');
  console.log('');
  console.log('  # Export vision boards with generic format');
  console.log('  npx ts-node src/etsy/cli/etsyCli.ts export vision_board 50 --file=output/etsy_csv/vb_50.csv --target=generic_etsy');
  console.log('');
  console.log('  # List available themes');
  console.log('  npx ts-node src/etsy/cli/etsyCli.ts themes santa_message');
  console.log('');
}

// ============================================================
// COMMANDS
// ============================================================

async function commandAuth(): Promise<void> {
  // The interactive auth flow handles its own headers and formatting
  const apiKey = process.env.ETSY_API_KEY;

  if (!apiKey) {
    logHeader('Etsy OAuth Authentication');
    logError('ETSY_API_KEY environment variable is required');
    console.log('');
    console.log('To get an API key:');
    console.log('1. Go to https://www.etsy.com/developers/your-apps');
    console.log('2. Create a new app or use an existing one');
    console.log('3. Copy the "Keystring" (Client ID / API Key)');
    console.log('4. Add it to your .env file: ETSY_API_KEY=your_key_here');
    console.log('');
    process.exit(1);
  }

  try {
    // Use the interactive auth flow with step-by-step prompts
    await startInteractiveAuthFlow(apiKey);
  } catch (error) {
    logError(`Authentication failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function commandAuthStatus(): Promise<void> {
  logHeader('Authentication Status');

  const status = getAuthStatus();

  if (!status.authenticated) {
    logWarning('Not authenticated');
    if (status.needsReauth) {
      logInfo('Run: npx ts-node src/etsy/cli/etsyCli.ts auth');
    }
    return;
  }

  logSuccess('Authenticated');
  logInfo(`Shop ID: ${status.shopId}`);

  if (status.tokenExpiry) {
    const expiresIn = Math.round((status.tokenExpiry.getTime() - Date.now()) / 1000 / 60);
    if (expiresIn > 0) {
      logInfo(`Token expires in: ${expiresIn} minutes`);
    } else {
      logWarning('Token expired');
    }
  }

  if (status.needsRefresh) {
    logWarning('Token needs refresh');
    try {
      await refreshAccessToken();
      logSuccess('Token refreshed successfully');
    } catch (error) {
      logError(`Failed to refresh: ${(error as Error).message}`);
    }
  }
}

async function commandLogout(): Promise<void> {
  logHeader('Logout');

  clearCredentials();
  logSuccess('Credentials cleared');
}

async function commandTest(): Promise<void> {
  logHeader('Connection Test');

  const status = getAuthStatus();
  if (!status.authenticated) {
    logError('Not authenticated. Run: npx ts-node src/etsy/cli/etsyCli.ts auth');
    process.exit(1);
  }

  logInfo('Testing Etsy API connection...');

  const client = getEtsyClient();
  const result = await client.testConnection();

  if (result.success) {
    logSuccess(`Connected to shop: ${result.shopName}`);

    // Get additional shop info
    const shop = await client.getShop();
    logInfo(`Active listings: ${shop.listing_active_count}`);
    logInfo(`Currency: ${shop.currency_code}`);
    logInfo(`Vacation mode: ${shop.is_vacation ? 'ON' : 'OFF'}`);
  } else {
    logError(`Connection failed: ${result.error}`);
    process.exit(1);
  }
}

async function commandThemes(productType?: ProductType): Promise<void> {
  logHeader('Available Themes');

  const productTypes: ProductType[] = productType
    ? [productType]
    : ['vision_board', 'santa_message', 'flash_cards', 'planner'];

  for (const pt of productTypes) {
    const themes = getThemesByProductType(pt);

    console.log(`\n${COLORS.cyan}${pt.replace('_', ' ').toUpperCase()}${COLORS.reset} (${themes.length} themes)`);
    console.log('-'.repeat(40));

    // Group by category
    const byCategory: Record<string, typeof themes> = {};
    for (const theme of themes) {
      if (!byCategory[theme.category]) {
        byCategory[theme.category] = [];
      }
      byCategory[theme.category].push(theme);
    }

    for (const [category, categoryThemes] of Object.entries(byCategory)) {
      console.log(`\n  ${COLORS.yellow}${category}${COLORS.reset}:`);
      for (const theme of categoryThemes) {
        console.log(`    ${theme.id}: ${theme.displayName}`);
      }
    }
  }

  // Show styles for vision boards
  if (!productType || productType === 'vision_board') {
    console.log(`\n${COLORS.cyan}STYLE VARIANTS${COLORS.reset} (${STYLE_VARIANTS.length} styles)`);
    console.log('-'.repeat(40));
    for (const style of STYLE_VARIANTS) {
      console.log(`  ${style.id}: ${style.displayName}`);
    }
  }

  console.log('');
}

async function commandPreview(
  productType: ProductType,
  count: number,
  options: Record<string, string>
): Promise<void> {
  logHeader(`Preview: ${productType} (${count} listings)`);

  logInfo('Running dry run - no listings will be created');
  console.log('');

  const summary = await bulkPublish(productType, count, 'dry_run', (progress) => {
    process.stdout.write(`\r  Progress: ${progress.completed}/${progress.total} | Success: ${progress.successful} | Current: ${progress.currentItem || '...'}     `);
  });

  console.log('\n');
  logSuccess(`Dry run complete!`);
  logInfo(`Would create ${summary.successful} listings`);

  if (summary.skippedDuplicates > 0) {
    logWarning(`${summary.skippedDuplicates} skipped (duplicates)`);
  }

  if (summary.failed > 0) {
    logError(`${summary.failed} failed`);
  }
}

async function commandPublish(
  productType: ProductType,
  count: number,
  options: Record<string, string>
): Promise<void> {
  const mode = (options.mode as 'draft' | 'active') || 'draft';

  logHeader(`Publish: ${productType} (${count} listings, ${mode})`);

  // Check auth
  const status = getAuthStatus();
  if (!status.authenticated) {
    logError('Not authenticated. Run: npx ts-node src/etsy/cli/etsyCli.ts auth');
    process.exit(1);
  }

  logWarning(`This will create ${count} ${mode} listings on your Etsy shop!`);
  logInfo('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  logInfo('Starting bulk publish...');
  console.log('');

  const summary = await bulkPublish(productType, count, mode, (progress) => {
    process.stdout.write(`\r  Progress: ${progress.completed}/${progress.total} | Success: ${progress.successful} | Failed: ${progress.failed} | Current: ${progress.currentItem || '...'}     `);
  });

  console.log('\n');

  if (summary.successful > 0) {
    logSuccess(`Created ${summary.successful} listings!`);
  }

  if (summary.skippedDuplicates > 0) {
    logWarning(`${summary.skippedDuplicates} skipped (duplicates)`);
  }

  if (summary.failed > 0) {
    logError(`${summary.failed} failed`);
  }

  logInfo(`Total time: ${Math.round(summary.durationMs / 1000)}s`);
}

async function commandStats(): Promise<void> {
  logHeader('Publishing Statistics');

  // Hash stats
  const hashStats = getHashStats();
  console.log('Content Hashes:');
  console.log(`  Total unique content:  ${hashStats.totalHashes}`);
  console.log(`  Published to Etsy:     ${hashStats.publishedCount}`);
  console.log(`  Not yet published:     ${hashStats.unpublishedCount}`);
  console.log('');

  console.log('By Theme:');
  const sortedThemes = Object.entries(hashStats.byTheme)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  for (const [theme, count] of sortedThemes) {
    console.log(`  ${theme}: ${count}`);
  }
  if (Object.keys(hashStats.byTheme).length > 10) {
    console.log(`  ... and ${Object.keys(hashStats.byTheme).length - 10} more`);
  }
  console.log('');

  // Log stats
  const logStats = getLogStats();
  console.log('Recent Activity:');
  console.log(`  Total attempts:        ${logStats.totalAttempts}`);
  console.log(`  Successful:            ${logStats.successCount}`);
  console.log(`  Failed:                ${logStats.failedCount}`);
  console.log(`  Skipped:               ${logStats.skippedCount}`);
  console.log('');

  if (logStats.recentErrors.length > 0) {
    console.log('Recent Errors:');
    for (const error of logStats.recentErrors.slice(0, 5)) {
      console.log(`  - ${error.substring(0, 60)}${error.length > 60 ? '...' : ''}`);
    }
  }
  console.log('');
}

async function commandGenerate(themeId: string): Promise<void> {
  logHeader(`Generate Single Listing: ${themeId}`);

  const theme = getThemeById(themeId);
  if (!theme) {
    logError(`Theme not found: ${themeId}`);
    console.log('');
    console.log('Available themes:');
    const allThemes = getAllThemes();
    for (const t of allThemes.slice(0, 10)) {
      console.log(`  ${t.id}`);
    }
    if (allThemes.length > 10) {
      console.log(`  ... and ${allThemes.length - 10} more`);
    }
    process.exit(1);
  }

  logInfo(`Theme: ${theme.displayName}`);
  logInfo(`Product: ${theme.productType}`);
  console.log('');

  logInfo('Generating listing content...');

  const result = await generateListing(theme, undefined, { useAI: true });

  if (!result.success || !result.listing) {
    logError(`Generation failed: ${result.error}`);
    process.exit(1);
  }

  const listing = result.listing;

  console.log('');
  logSuccess('Listing generated!');
  console.log('');

  console.log(`${COLORS.cyan}Title:${COLORS.reset}`);
  console.log(`  ${listing.title}`);
  console.log('');

  console.log(`${COLORS.cyan}Description:${COLORS.reset}`);
  const descLines = listing.description.split('\n').slice(0, 10);
  for (const line of descLines) {
    console.log(`  ${line}`);
  }
  if (listing.description.split('\n').length > 10) {
    console.log('  ...');
  }
  console.log('');

  console.log(`${COLORS.cyan}Tags:${COLORS.reset}`);
  console.log(`  ${listing.tags.join(', ')}`);
  console.log('');

  console.log(`${COLORS.cyan}Price:${COLORS.reset} $${listing.price}`);
  console.log(`${COLORS.cyan}Content Hash:${COLORS.reset} ${listing.contentHash}`);

  if (result.tokensUsed) {
    console.log(`${COLORS.cyan}AI Tokens Used:${COLORS.reset} ${result.tokensUsed}`);
  }
  console.log('');
}

// ============================================================
// CSV EXPORT COMMANDS
// ============================================================

async function commandCsvTargets(): Promise<void> {
  logHeader('Available CSV Export Targets');

  const targets = listCsvTargets();

  console.log('These targets format CSV files for different bulk upload tools.\n');

  for (const target of targets) {
    console.log(`${COLORS.cyan}${target.id}${COLORS.reset}`);
    console.log(`  Label: ${target.label}`);
    console.log(`  ${target.description}`);
    console.log('');
  }

  const defaultTarget = getDefaultCsvTarget();
  logInfo(`Default target: ${defaultTarget.id} (${defaultTarget.label})`);
  console.log('');

  console.log('Usage:');
  console.log('  npx ts-node src/etsy/cli/etsyCli.ts export santa_message 50 --file=output.csv --target=shopuploader');
  console.log('');
}

async function commandExport(
  productType: ProductType,
  count: number,
  options: Record<string, string>
): Promise<void> {
  const targetId = (options.target || 'shopuploader') as CsvTargetId;
  const outputFile = options.file;
  const themeFilter = options.themes ? options.themes.split(',') : undefined;

  if (!outputFile) {
    logError('--file=<path> is required');
    console.log('');
    console.log('Example:');
    console.log(`  npx ts-node src/etsy/cli/etsyCli.ts export ${productType} ${count} --file=output/etsy_csv/${productType}_${count}.csv`);
    process.exit(1);
  }

  logHeader(`CSV Export: ${productType} (${count} listings)`);

  const target = getCsvTarget(targetId);
  logInfo(`Target: ${target.label} (${target.id})`);
  logInfo(`Output: ${outputFile}`);
  if (themeFilter) {
    logInfo(`Theme filter: ${themeFilter.join(', ')}`);
  }
  console.log('');

  // Get themes for this product type
  let themes = getThemesByProductType(productType);
  if (themeFilter) {
    themes = themes.filter(t => themeFilter.includes(t.id));
    if (themes.length === 0) {
      logError('No themes match the filter');
      process.exit(1);
    }
  }

  logInfo(`Generating ${count} listings from ${themes.length} themes...`);
  console.log('');

  const listings: ListingDraft[] = [];
  let generated = 0;
  let themeIndex = 0;

  while (generated < count && themes.length > 0) {
    const theme = themes[themeIndex % themes.length];
    themeIndex++;

    // Get next variation index for this theme
    const variationIndex = getNextVariationIndex(theme.id);

    // Generate listing content
    const result = await generateListing(theme, undefined, { useAI: false });

    if (!result.success || !result.listing) {
      logWarning(`Skipped ${theme.id}: ${result.error || 'generation failed'}`);
      continue;
    }

    // Find sample image for this theme
    let imagePaths: string[] = [];
    const sampleImage = findSampleImage(productType, theme.id);
    if (sampleImage) {
      imagePaths = [sampleImage];
    } else {
      const defaultImage = getDefaultImage(productType);
      if (defaultImage) {
        imagePaths = [defaultImage];
      }
    }

    // Create listing draft
    const draft = createListingDraft(
      {
        title: result.listing.title,
        description: result.listing.description,
        tags: result.listing.tags,
        contentHash: result.listing.contentHash
      },
      {
        productType,
        themeId: theme.id,
        variationIndex,
        imagePaths
      }
    );

    listings.push(draft);
    generated++;

    // Progress update
    process.stdout.write(`\r  Generated: ${generated}/${count} | Theme: ${theme.id.substring(0, 20)}...     `);
  }

  console.log('\n');

  if (listings.length === 0) {
    logError('No listings generated');
    process.exit(1);
  }

  // Export to CSV
  logInfo('Writing CSV file...');

  const exportResult = await exportToCsv(listings, {
    targetId,
    outputFile,
    productType
  });

  console.log('');

  if (exportResult.success) {
    logSuccess(`Exported ${exportResult.rowCount} listings!`);
    logInfo(`File: ${exportResult.filePath}`);
    logInfo(`Duration: ${exportResult.durationMs}ms`);
    console.log('');

    console.log('Next steps:');
    console.log(`  1. Go to ${target.label} (${getToolUrl(targetId)})`);
    console.log('  2. Upload the CSV file');
    if (target.imagePathFormat === 'url') {
      console.log('  3. Upload images to a public host (Imgur, etc.)');
      console.log('  4. Replace [UPLOAD_TO_HOST] placeholders with actual URLs');
    }
    console.log('  5. Review and push listings to Etsy');
    console.log('');
  } else {
    logError('Export failed');
    if (exportResult.errors) {
      for (const err of exportResult.errors) {
        console.log(`  - ${err}`);
      }
    }
    process.exit(1);
  }
}

/**
 * Get URL for a CSV tool
 */
function getToolUrl(targetId: CsvTargetId): string {
  switch (targetId) {
    case 'shopuploader':
      return 'https://www.shopuploader.com';
    case 'csvlister':
      return 'https://csvlister.com';
    default:
      return 'your bulk upload tool';
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showUsage();
    process.exit(0);
  }

  const command = args[0];
  const subArgs = args.slice(1);

  // Parse options
  const options: Record<string, string> = {};
  const positionalArgs: string[] = [];

  for (const arg of subArgs) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key] = value || 'true';
    } else {
      positionalArgs.push(arg);
    }
  }

  try {
    switch (command) {
      // CSV Export Commands (no API approval required)
      case 'csv-targets':
        await commandCsvTargets();
        break;

      case 'export':
        if (positionalArgs.length < 2) {
          logError('Usage: export <product-type> <count> --file=<output.csv> [--target=<target-id>]');
          process.exit(1);
        }
        await commandExport(
          positionalArgs[0] as ProductType,
          parseInt(positionalArgs[1]),
          options
        );
        break;

      // API Commands (require Etsy app approval)
      case 'auth':
        await commandAuth();
        break;

      case 'auth-status':
        await commandAuthStatus();
        break;

      case 'logout':
        await commandLogout();
        break;

      case 'test':
        await commandTest();
        break;

      case 'themes':
        await commandThemes(positionalArgs[0] as ProductType | undefined);
        break;

      case 'preview':
        if (positionalArgs.length < 2) {
          logError('Usage: preview <product-type> <count>');
          process.exit(1);
        }
        await commandPreview(
          positionalArgs[0] as ProductType,
          parseInt(positionalArgs[1]),
          options
        );
        break;

      case 'publish':
        if (positionalArgs.length < 2) {
          logError('Usage: publish <product-type> <count> [--mode=draft|active]');
          process.exit(1);
        }
        await commandPublish(
          positionalArgs[0] as ProductType,
          parseInt(positionalArgs[1]),
          options
        );
        break;

      case 'stats':
        await commandStats();
        break;

      case 'generate':
        if (positionalArgs.length < 1) {
          logError('Usage: generate <theme-id>');
          process.exit(1);
        }
        await commandGenerate(positionalArgs[0]);
        break;

      case 'help':
      case '--help':
      case '-h':
        showUsage();
        break;

      default:
        logError(`Unknown command: ${command}`);
        showUsage();
        process.exit(1);
    }
  } catch (error) {
    logError(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
