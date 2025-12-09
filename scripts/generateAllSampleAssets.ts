/**
 * Generate All Sample Assets for Etsy Listings
 *
 * Master script that runs all sample generators:
 * - Vision Boards (using visionBoardEngineV12)
 * - Santa Messages (audio player style graphics)
 * - Planners (page spread mock layouts)
 * - Flash Cards (sample card sheets)
 *
 * Usage:
 *   npx ts-node scripts/generateAllSampleAssets.ts [options]
 *
 * Options:
 *   --dry-run           Preview what would be generated without actually generating
 *   --type=<type>       Only generate specific type: vision_board, santa_message, planner, flash_cards
 *   --limit=<n>         Limit number of samples per type
 *   --skip-vision       Skip vision board generation (expensive API calls)
 *   --skip-santa        Skip Santa message generation
 *   --skip-planner      Skip planner generation
 *   --skip-flash        Skip flash card generation
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync, spawn } from 'child_process';

const OUTPUT_BASE = path.join(__dirname, '..', 'output', 'samples');

interface GenerationResult {
  type: string;
  success: number;
  failed: number;
  skipped: boolean;
  duration: number;
}

async function runGenerator(
  name: string,
  scriptPath: string,
  args: string[],
  dryRun: boolean
): Promise<GenerationResult> {
  const startTime = Date.now();

  console.log('\n' + '='.repeat(60));
  console.log(`GENERATING: ${name.toUpperCase()}`);
  console.log('='.repeat(60));

  if (dryRun) {
    args.push('--dry-run');
  }

  try {
    const result = execSync(`npx ts-node ${scriptPath} ${args.join(' ')}`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'inherit'
    });

    return {
      type: name,
      success: 1, // Simplified - actual count would come from manifest
      failed: 0,
      skipped: false,
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.error(`Error running ${name} generator:`, error);
    return {
      type: name,
      success: 0,
      failed: 1,
      skipped: false,
      duration: Date.now() - startTime
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const typeArg = args.find(a => a.startsWith('--type='));
  const limitArg = args.find(a => a.startsWith('--limit='));
  const skipVision = args.includes('--skip-vision');
  const skipSanta = args.includes('--skip-santa');
  const skipPlanner = args.includes('--skip-planner');
  const skipFlash = args.includes('--skip-flash');

  const specificType = typeArg ? typeArg.split('=')[1] : null;
  const limit = limitArg ? limitArg.split('=')[1] : null;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       ETSY SAMPLE ASSET GENERATOR - MASTER SCRIPT         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${dryRun ? 'DRY RUN' : 'GENERATING'}`);
  console.log(`Output base: ${OUTPUT_BASE}`);
  console.log(`Specific type: ${specificType || 'all'}`);
  console.log(`Limit per type: ${limit || 'none'}`);

  // Ensure output directories exist
  const dirs = [
    path.join(OUTPUT_BASE, 'vision-boards'),
    path.join(OUTPUT_BASE, 'santa-messages'),
    path.join(OUTPUT_BASE, 'planners'),
    path.join(OUTPUT_BASE, 'flash-cards')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const results: GenerationResult[] = [];
  const generatorArgs: string[] = [];
  if (limit) {
    generatorArgs.push(`--limit=${limit}`);
  }

  // Vision Boards
  if (!skipVision && (!specificType || specificType === 'vision_board')) {
    console.log('\n[Vision Boards - Note: This uses API calls and incurs costs]');
    if (!dryRun) {
      console.log('  Skipping actual generation to avoid API costs.');
      console.log('  Run with specific theme: npx ts-node scripts/generateSampleVisionBoards.ts --theme=<id>');
      results.push({
        type: 'vision_board',
        success: 0,
        failed: 0,
        skipped: true,
        duration: 0
      });
    } else {
      const result = await runGenerator(
        'Vision Boards',
        'scripts/generateSampleVisionBoards.ts',
        generatorArgs,
        true
      );
      results.push(result);
    }
  }

  // Santa Messages
  if (!skipSanta && (!specificType || specificType === 'santa_message')) {
    const result = await runGenerator(
      'Santa Messages',
      'scripts/generateSampleSantaMessages.ts',
      generatorArgs,
      dryRun
    );
    results.push(result);
  }

  // Planners
  if (!skipPlanner && (!specificType || specificType === 'planner')) {
    const result = await runGenerator(
      'Planners',
      'scripts/generateSamplePlanners.ts',
      generatorArgs,
      dryRun
    );
    results.push(result);
  }

  // Flash Cards (placeholder - would need generator)
  if (!skipFlash && (!specificType || specificType === 'flash_cards')) {
    console.log('\n[Flash Cards - Generator not yet implemented]');
    results.push({
      type: 'flash_cards',
      success: 0,
      failed: 0,
      skipped: true,
      duration: 0
    });
  }

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    GENERATION SUMMARY                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  for (const result of results) {
    const status = result.skipped ? 'SKIPPED' : (result.failed > 0 ? 'FAILED' : 'SUCCESS');
    console.log(`\n${result.type.padEnd(20)} ${status.padEnd(10)} (${result.duration}ms)`);
    if (!result.skipped) {
      console.log(`  Success: ${result.success}, Failed: ${result.failed}`);
    }
    totalSuccess += result.success;
    totalFailed += result.failed;
    if (result.skipped) totalSkipped++;
    totalDuration += result.duration;
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`TOTAL: ${totalSuccess} success, ${totalFailed} failed, ${totalSkipped} skipped`);
  console.log(`Total time: ${totalDuration}ms`);

  // Save master manifest
  const manifestPath = path.join(OUTPUT_BASE, 'master-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'generated',
    results: results,
    totals: { success: totalSuccess, failed: totalFailed, skipped: totalSkipped },
    duration: totalDuration
  }, null, 2));

  console.log(`\nMaster manifest saved: ${manifestPath}`);

  // Output directory contents
  console.log('\nGenerated sample directories:');
  for (const dir of dirs) {
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    console.log(`  ${path.basename(dir)}: ${files.length} files`);
  }
}

main().catch(console.error);
