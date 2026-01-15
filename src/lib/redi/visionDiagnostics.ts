/**
 * Vision Pipeline Diagnostics
 *
 * Automated testing to diagnose exactly where the vision pipeline fails.
 * Run these tests WITHOUT needing user video recording.
 *
 * Usage:
 *   npm run diagnose:vision
 *   OR
 *   curl http://localhost:3000/api/redi/diagnose-vision
 */

import * as dotenv from 'dotenv';
dotenv.config();

import Anthropic from '@anthropic-ai/sdk';
import { RediMode, MODE_CONFIGS } from './types';
import * as fs from 'fs';
import * as path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Test images with KNOWN objects (ground truth)
interface TestCase {
  name: string;
  imageUrl: string;  // Public URL to fetch
  expectedObjects: string[];  // What SHOULD be detected
  expectedScene: string;  // Expected scene type
}

// Public domain test images with known content
const TEST_CASES: TestCase[] = [
  {
    name: 'laptop_on_desk',
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
    expectedObjects: ['laptop', 'desk', 'computer'],
    expectedScene: 'office'
  },
  {
    name: 'kitchen_stove',
    imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    expectedObjects: ['stove', 'kitchen', 'oven', 'pot', 'pan'],
    expectedScene: 'kitchen'
  },
  {
    name: 'gym_weights',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    expectedObjects: ['dumbbell', 'weights', 'gym', 'barbell'],
    expectedScene: 'gym'
  },
  {
    name: 'book_reading',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
    expectedObjects: ['book', 'reading', 'pages'],
    expectedScene: 'reading'
  },
  {
    name: 'guitar_music',
    imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
    expectedObjects: ['guitar', 'music', 'instrument'],
    expectedScene: 'music'
  }
];

interface DiagnosticResult {
  testCase: string;
  success: boolean;

  // What Claude Vision returned
  claudeResponse: string;
  claudeDetectedObjects: string[];

  // Comparison with ground truth
  expectedObjects: string[];
  matchedObjects: string[];
  missedObjects: string[];
  extraObjects: string[];  // Things Claude said but weren't expected

  // Metrics
  accuracy: number;  // matched / expected
  latencyMs: number;

  // Raw data for debugging
  imageSize: number;
  promptUsed: string;
}

interface FullDiagnosticReport {
  timestamp: string;
  overallAccuracy: number;
  averageLatencyMs: number;
  results: DiagnosticResult[];
  recommendations: string[];
}

/**
 * Fetch image and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<{ base64: string; size: number }> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return { base64, size: buffer.byteLength };
}

/**
 * Test Claude Vision with a specific image
 */
async function testClaudeVision(
  imageBase64: string,
  mode: RediMode = 'general'
): Promise<{ response: string; latencyMs: number }> {
  const modeConfig = MODE_CONFIGS[mode];

  const systemPrompt = `You are Redi's visual analysis system.

CRITICAL - IGNORE APP UI:
You are analyzing what the CAMERA is pointed at, NOT any app interface.
ONLY DESCRIBE the PHYSICAL SCENE the camera is capturing.

YOUR TASK:
1. Describe EVERYTHING you see clearly and specifically
2. Identify specific objects (brands, types, details) when visible
3. Read any text/labels you can see
4. Be specific and helpful - this is a visual assistance product

You're helping with: ${modeConfig.systemPromptFocus}`;

  const userPrompt = 'Describe what you see in detail. List all objects you can identify.';

  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBase64
          }
        },
        {
          type: 'text',
          text: userPrompt
        }
      ]
    }],
    system: systemPrompt
  });

  const latencyMs = Date.now() - startTime;

  const content = response.content[0];
  const text = content.type === 'text' ? content.text : '';

  return { response: text, latencyMs };
}

/**
 * Extract objects mentioned in Claude's response
 */
function extractMentionedObjects(response: string): string[] {
  const words = response.toLowerCase().split(/\s+/);
  const commonObjects = [
    'laptop', 'computer', 'desk', 'chair', 'monitor', 'keyboard', 'mouse',
    'book', 'pen', 'notebook', 'paper', 'phone', 'tablet',
    'stove', 'oven', 'pot', 'pan', 'kitchen', 'refrigerator', 'sink',
    'dumbbell', 'barbell', 'weights', 'gym', 'treadmill', 'bench',
    'guitar', 'piano', 'drum', 'music', 'instrument', 'microphone',
    'person', 'hand', 'face', 'body',
    'table', 'window', 'door', 'wall', 'floor', 'ceiling',
    'cup', 'mug', 'glass', 'bottle', 'plate', 'bowl',
    'lamp', 'light', 'plant', 'picture', 'frame'
  ];

  const found: string[] = [];
  for (const obj of commonObjects) {
    if (words.some(w => w.includes(obj) || obj.includes(w))) {
      found.push(obj);
    }
  }

  return [...new Set(found)];
}

/**
 * Run a single test case
 */
async function runTestCase(testCase: TestCase): Promise<DiagnosticResult> {
  console.log(`\n[Diagnose] Testing: ${testCase.name}`);
  console.log(`[Diagnose] Expected objects: ${testCase.expectedObjects.join(', ')}`);

  // Fetch image
  const { base64, size } = await fetchImageAsBase64(testCase.imageUrl);
  console.log(`[Diagnose] Image fetched: ${(size / 1024).toFixed(1)}KB`);

  // Test Claude Vision
  const { response, latencyMs } = await testClaudeVision(base64);
  console.log(`[Diagnose] Claude responded in ${latencyMs}ms`);
  console.log(`[Diagnose] Response: "${response.substring(0, 200)}..."`);

  // Extract what Claude detected
  const claudeDetectedObjects = extractMentionedObjects(response);
  console.log(`[Diagnose] Claude detected: ${claudeDetectedObjects.join(', ')}`);

  // Compare with ground truth
  const expectedLower = testCase.expectedObjects.map(o => o.toLowerCase());
  const matchedObjects = claudeDetectedObjects.filter(o =>
    expectedLower.some(e => o.includes(e) || e.includes(o))
  );
  const missedObjects = expectedLower.filter(e =>
    !claudeDetectedObjects.some(o => o.includes(e) || e.includes(o))
  );
  const extraObjects = claudeDetectedObjects.filter(o =>
    !expectedLower.some(e => o.includes(e) || e.includes(o))
  );

  const accuracy = matchedObjects.length / expectedLower.length;
  const success = accuracy >= 0.5;  // At least 50% of expected objects found

  console.log(`[Diagnose] Matched: ${matchedObjects.join(', ') || 'NONE'}`);
  console.log(`[Diagnose] Missed: ${missedObjects.join(', ') || 'NONE'}`);
  console.log(`[Diagnose] Accuracy: ${(accuracy * 100).toFixed(1)}% - ${success ? 'PASS' : 'FAIL'}`);

  return {
    testCase: testCase.name,
    success,
    claudeResponse: response,
    claudeDetectedObjects,
    expectedObjects: testCase.expectedObjects,
    matchedObjects,
    missedObjects,
    extraObjects,
    accuracy,
    latencyMs,
    imageSize: size,
    promptUsed: 'standard_vision_prompt'
  };
}

/**
 * Run full diagnostic suite
 */
export async function runFullDiagnostics(): Promise<FullDiagnosticReport> {
  console.log('='.repeat(60));
  console.log('REDI VISION PIPELINE DIAGNOSTICS');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Testing ${TEST_CASES.length} images with known objects`);

  const results: DiagnosticResult[] = [];

  for (const testCase of TEST_CASES) {
    try {
      const result = await runTestCase(testCase);
      results.push(result);
    } catch (error) {
      console.error(`[Diagnose] ERROR on ${testCase.name}:`, error);
      results.push({
        testCase: testCase.name,
        success: false,
        claudeResponse: `ERROR: ${error}`,
        claudeDetectedObjects: [],
        expectedObjects: testCase.expectedObjects,
        matchedObjects: [],
        missedObjects: testCase.expectedObjects,
        extraObjects: [],
        accuracy: 0,
        latencyMs: 0,
        imageSize: 0,
        promptUsed: 'error'
      });
    }

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Calculate overall metrics
  const overallAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
  const averageLatencyMs = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;

  // Generate recommendations
  const recommendations: string[] = [];

  if (overallAccuracy < 0.5) {
    recommendations.push('CRITICAL: Claude Vision is missing more than 50% of expected objects');
    recommendations.push('Check: Image quality, prompt engineering, or model selection');
  } else if (overallAccuracy < 0.75) {
    recommendations.push('WARNING: Claude Vision accuracy is below 75%');
    recommendations.push('Consider: Adding more context or scene hints to prompts');
  } else {
    recommendations.push('GOOD: Claude Vision is performing at acceptable accuracy');
  }

  if (averageLatencyMs > 3000) {
    recommendations.push('WARNING: Average latency > 3s - consider caching or edge processing');
  }

  const passedTests = results.filter(r => r.success).length;
  recommendations.push(`Tests passed: ${passedTests}/${results.length}`);

  const report: FullDiagnosticReport = {
    timestamp: new Date().toISOString(),
    overallAccuracy,
    averageLatencyMs,
    results,
    recommendations
  };

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  console.log(`Overall Accuracy: ${(overallAccuracy * 100).toFixed(1)}%`);
  console.log(`Average Latency: ${averageLatencyMs.toFixed(0)}ms`);
  console.log(`Tests Passed: ${passedTests}/${results.length}`);
  console.log('\nRecommendations:');
  recommendations.forEach(r => console.log(`  - ${r}`));
  console.log('='.repeat(60));

  return report;
}

/**
 * Quick test with a single image URL
 */
export async function quickTest(imageUrl: string): Promise<string> {
  console.log(`[QuickTest] Testing image: ${imageUrl}`);

  const { base64, size } = await fetchImageAsBase64(imageUrl);
  console.log(`[QuickTest] Image size: ${(size / 1024).toFixed(1)}KB`);

  const { response, latencyMs } = await testClaudeVision(base64);
  console.log(`[QuickTest] Latency: ${latencyMs}ms`);
  console.log(`[QuickTest] Response:\n${response}`);

  return response;
}

// CLI runner
if (require.main === module) {
  runFullDiagnostics()
    .then(report => {
      // Save report to file
      const reportPath = path.join(__dirname, '../../..', 'vision_diagnostic_report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\nReport saved to: ${reportPath}`);
      process.exit(report.overallAccuracy >= 0.5 ? 0 : 1);
    })
    .catch(error => {
      console.error('Diagnostic failed:', error);
      process.exit(1);
    });
}
