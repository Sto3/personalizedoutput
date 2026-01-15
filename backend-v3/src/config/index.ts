/**
 * Redi V3 Configuration
 *
 * Environment-based configuration for the OpenAI Realtime API backend.
 */

export const config = {
  port: process.env.PORT || 3000,
  openaiApiKey: process.env.OPENAI_API_KEY!,

  // Interjection defaults
  defaultSensitivity: 0.5,
  minInterjectionInterval: 3000,  // 3 seconds
  maxInterjectionInterval: 30000, // 30 seconds

  // Frame analysis
  frameAnalysisInterval: 3000,    // Analyze every 3 seconds
  maxFrameAge: 5000,              // Don't analyze frames older than 5 seconds
};

// Validate required config
if (!config.openaiApiKey) {
  console.error('OPENAI_API_KEY environment variable is required');
  process.exit(1);
}
