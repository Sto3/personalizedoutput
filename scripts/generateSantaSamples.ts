/**
 * Generate Santa Voice Samples for Etsy Listings
 *
 * Creates compelling preview clips featuring children's names
 * to showcase the personalization value to potential buyers.
 */

import { synthesizeSantaMessage, saveSantaAudio } from '../src/lib/thoughtEngine/santa/elevenLabsClient';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================
// SAMPLE SCRIPTS - Names that sell the personalization
// ============================================================

const SAMPLE_SCRIPTS = [
  {
    id: 'emma-kindness',
    name: 'Emma',
    gender: 'girl',
    description: 'Emma being kind to her brother',
    script: `Ho ho ho... Well hello there, Emma! This is Santa Claus, calling all the way from the North Pole. I've been watching you this year, and my goodness, what a wonderful job you've done being kind to your little brother. The elves and I are so proud of you, Emma. You're definitely on the Nice List!`
  },
  {
    id: 'liam-brave',
    name: 'Liam',
    gender: 'boy',
    description: 'Liam being brave at school',
    script: `Ho ho ho... Liam! It's Santa Claus here, and I have some very special news for you. I heard about how brave you were on your first day at your new school. That takes a lot of courage, young man. Rudolph and I both agree... you deserve something extra special under the tree this year. Keep being the amazing boy you are, Liam!`
  },
  {
    id: 'sophia-helping',
    name: 'Sophia',
    gender: 'girl',
    description: 'Sophia helping with chores',
    script: `Ho ho ho... Is this little Sophia I'm speaking to? It's Santa! The elves told me all about how you've been helping Mommy and Daddy with chores around the house. That makes my heart so warm, Sophia. You're growing into such a thoughtful young lady. Mrs. Claus and I can't wait to see you open your presents!`
  }
];

// ============================================================
// MAIN GENERATION FUNCTION
// ============================================================

async function generateAllSamples() {
  console.log('🎅 Santa Sample Generator');
  console.log('========================\n');

  const outputDir = path.join(process.cwd(), 'assets', 'audio', 'samples');

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Remove old samples
  console.log('🧹 Removing old samples...');
  const existingFiles = fs.readdirSync(outputDir);
  for (const file of existingFiles) {
    if (file.endsWith('.mp3')) {
      fs.unlinkSync(path.join(outputDir, file));
      console.log(`   Deleted: ${file}`);
    }
  }

  console.log('\n🎤 Generating new samples with fine-tuned voice...\n');

  const results: Array<{ id: string; name: string; filename: string; success: boolean }> = [];

  for (const sample of SAMPLE_SCRIPTS) {
    console.log(`\n📝 Generating: ${sample.id} (${sample.name} - ${sample.gender})`);
    console.log(`   Script: "${sample.script.substring(0, 60)}..."`);

    try {
      // Generate with warm Santa voice (the fine-tuned one)
      const audioBuffer = await synthesizeSantaMessage(sample.script, 'warm');

      // Save with descriptive filename
      const filename = `santa-sample-${sample.id}.mp3`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, audioBuffer);

      console.log(`   ✅ Saved: ${filename} (${audioBuffer.length} bytes)`);

      results.push({
        id: sample.id,
        name: sample.name,
        filename,
        success: true
      });

      // Brief pause between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({
        id: sample.id,
        name: sample.name,
        filename: '',
        success: false
      });
    }
  }

  // Summary
  console.log('\n\n📊 Generation Summary');
  console.log('====================');
  const successful = results.filter(r => r.success);
  console.log(`✅ Successful: ${successful.length}/${results.length}`);

  if (successful.length > 0) {
    console.log('\n📁 Generated files:');
    for (const r of successful) {
      console.log(`   - ${r.filename} (${r.name})`);
    }

    console.log('\n📋 Update santa-samples.html with these audio sources:');
    for (const r of successful) {
      console.log(`   /assets/audio/samples/${r.filename}`);
    }
  }

  console.log('\n🎅 Done!\n');
}

// Run
generateAllSamples().catch(console.error);
