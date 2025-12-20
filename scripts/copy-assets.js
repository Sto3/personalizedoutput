/**
 * Copy Assets Script
 *
 * Copies non-TypeScript assets to the dist folder for production deployment.
 * This includes:
 * - Prompt text files (*.txt)
 * - HTML form files (dev/)
 * - Any other static assets needed at runtime
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

/**
 * Recursively copy a directory
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`[copy-assets] Skipping (not found): ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy a single file
 */
function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`[copy-assets] Skipping (not found): ${src}`);
    return;
  }

  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(src, dest);
}

console.log('[copy-assets] Copying static assets to dist/...');

// 1. Copy JavaScript engine files (not compiled by TypeScript)
const jsEngineFiles = [
  'visionBoardEngineV12.js',
  'svgVisionBoard.js'
];

const libSrc = path.join(projectRoot, 'src', 'lib');
const libDest = path.join(projectRoot, 'dist', 'lib');

console.log('[copy-assets] Copying JS engine files...');
jsEngineFiles.forEach(file => {
  const src = path.join(libSrc, file);
  const dest = path.join(libDest, file);
  if (fs.existsSync(src)) {
    copyFile(src, dest);
    console.log(`[copy-assets] Copied: ${file}`);
  }
});

// 2. Copy API client files (JS)
const apiSrc = path.join(projectRoot, 'src', 'api');
const apiDest = path.join(projectRoot, 'dist', 'api');
const jsApiFiles = ['ideogramClient.js', 'claudeClient.js'];

console.log('[copy-assets] Copying JS API files...');
jsApiFiles.forEach(file => {
  const src = path.join(apiSrc, file);
  const dest = path.join(apiDest, file);
  if (fs.existsSync(src)) {
    copyFile(src, dest);
    console.log(`[copy-assets] Copied: ${file}`);
  }
});

// 3. Copy config files (JS)
const configSrc = path.join(projectRoot, 'src', 'config');
const configDest = path.join(projectRoot, 'dist', 'config');
if (fs.existsSync(configSrc)) {
  console.log('[copy-assets] Copying config files...');
  copyDir(configSrc, configDest);
}

// 4. Copy prompt text files
const promptsSrc = path.join(projectRoot, 'src', 'lib', 'thoughtEngine', 'prompts');
const promptsDest = path.join(projectRoot, 'dist', 'lib', 'thoughtEngine', 'prompts');
console.log('[copy-assets] Copying prompts...');
copyDir(promptsSrc, promptsDest);

// 2. Copy dev HTML files (forms)
const devSrc = path.join(projectRoot, 'dev');
const devDest = path.join(projectRoot, 'dev'); // Keep in place, accessed via process.cwd()
// Dev files stay in place - server uses process.cwd() to find them
console.log('[copy-assets] Dev files remain in place (accessed via process.cwd())');

// 3. Ensure outputs directory structure exists
const outputDirs = [
  path.join(projectRoot, 'outputs'),
  path.join(projectRoot, 'outputs', 'santa'),
  path.join(projectRoot, 'outputs', 'santa', 'previews'),
  path.join(projectRoot, 'outputs', 'planners'),
  path.join(projectRoot, 'data'),
  path.join(projectRoot, 'data', 'sessions')
];

console.log('[copy-assets] Ensuring output directories exist...');
outputDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[copy-assets] Created: ${dir}`);
  }
});

console.log('[copy-assets] Done!');
