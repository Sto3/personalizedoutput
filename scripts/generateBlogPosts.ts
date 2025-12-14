#!/usr/bin/env npx ts-node
/**
 * Blog Post Generator
 *
 * Automatically generates SEO-optimized blog posts using Claude API.
 * Can be run manually or scheduled via cron.
 *
 * Usage:
 *   npx ts-node scripts/generateBlogPosts.ts              # Generate one post
 *   npx ts-node scripts/generateBlogPosts.ts --count 3    # Generate 3 posts
 *   npx ts-node scripts/generateBlogPosts.ts --topic "learning through interests"
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BLOG_FILE = path.join(__dirname, '..', 'data', 'blog_posts.json');

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  tags: string[];
  meta_title: string;
  meta_description: string;
  published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// Topics relevant to PersonalizedOutput products
const BLOG_TOPICS = [
  {
    category: 'Thought Organizer / Personalized Learning',
    topics: [
      'How personalized learning increases retention by 300%',
      'Why learning through interests works (the science)',
      'How to help ADHD kids focus through their passions',
      'Adult learning: Why we forget what we read',
      'Teaching abstract concepts through concrete interests',
      'The connection between emotion and memory in learning',
      'How to make math fun for kids who hate math',
      'Learning a new language through your hobbies',
      'Financial literacy through everyday interests',
      'Why traditional education fails visual learners',
    ]
  },
  {
    category: 'Vision Boards & Goal Setting',
    topics: [
      'The psychology behind why vision boards work',
      'Digital vs physical vision boards: pros and cons',
      'Goal setting mistakes that sabotage your success',
      'How to create goals that stick (not resolutions)',
      'Vision boards for couples: aligning your dreams',
      'Career pivot planning with visual goal setting',
    ]
  },
  {
    category: 'Personalization & AI',
    topics: [
      'How AI is revolutionizing personalized experiences',
      'The gift of being seen: why personalization matters',
      'Generic vs personalized: the emotional impact difference',
      'How AI knows what resonates with you',
      'The future of AI-powered education',
    ]
  },
  {
    category: 'Parenting & Kids',
    topics: [
      'Screen time that actually helps kids learn',
      'How to discover your child\'s learning style',
      'Making homework a battle-free zone',
      'Teaching kids about money through their interests',
      'The magic of personalized stories for kids',
      'Why generic educational content bores kids',
    ]
  },
  {
    category: 'Self-Improvement & Clarity',
    topics: [
      'Finding clarity when life feels overwhelming',
      'The power of asking yourself the right questions',
      'Breaking decision paralysis with structured reflection',
      'Why journaling works (and how to make it personal)',
      'Dealing with analysis paralysis in life decisions',
    ]
  }
];

/**
 * Get a random topic that hasn't been covered recently
 */
function getRandomTopic(existingPosts: BlogPost[]): { category: string; topic: string } {
  const existingTitles = existingPosts.map(p => p.title.toLowerCase());

  // Flatten all topics
  const allTopics: { category: string; topic: string }[] = [];
  for (const cat of BLOG_TOPICS) {
    for (const topic of cat.topics) {
      // Skip if similar topic already exists
      const topicWords = topic.toLowerCase().split(' ').filter(w => w.length > 4);
      const alreadyCovered = existingTitles.some(title =>
        topicWords.filter(word => title.includes(word)).length >= 3
      );
      if (!alreadyCovered) {
        allTopics.push({ category: cat.category, topic });
      }
    }
  }

  if (allTopics.length === 0) {
    // All topics covered, pick random
    const cat = BLOG_TOPICS[Math.floor(Math.random() * BLOG_TOPICS.length)];
    const topic = cat.topics[Math.floor(Math.random() * cat.topics.length)];
    return { category: cat.category, topic };
  }

  return allTopics[Math.floor(Math.random() * allTopics.length)];
}

/**
 * Generate a blog post using Claude API
 */
async function generateBlogPost(topic: string, category: string): Promise<Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>> {
  const anthropic = new Anthropic();

  const prompt = `Generate an SEO-optimized blog post for PersonalizedOutput.com about: "${topic}"

Context:
- PersonalizedOutput.com sells AI-powered personalized products:
  - 10-Minute Personalized Lessons (Thought Organizer™): Lessons that teach concepts through the learner's interests
  - Personalized Santa Messages: Custom audio messages from Santa
  - Custom Vision Boards: AI-generated vision boards for goals
  - Custom Flash Cards: Learning cards built around interests
  - Clarity Planners: Guided reflection for life decisions

The blog post should:
1. Be 800-1200 words
2. Be informative and valuable (not just a sales pitch)
3. Include practical tips readers can use
4. Naturally mention relevant products where appropriate (without being pushy)
5. Be written in a warm, conversational tone
6. Include compelling subheadings (use ## for h2, ### for h3)
7. End with a call-to-action linking to a relevant product

Return a JSON object with this exact structure:
{
  "title": "Engaging, SEO-friendly title (50-60 chars ideal)",
  "slug": "url-friendly-slug",
  "excerpt": "Compelling 1-2 sentence summary (150-160 chars)",
  "content": "Full markdown content with ## and ### headers",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "meta_title": "SEO title | PersonalizedOutput",
  "meta_description": "SEO meta description (150-160 chars)"
}

Only return valid JSON, no other text.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Claude response');
  }

  const postData = JSON.parse(jsonMatch[0]);

  return {
    slug: postData.slug,
    title: postData.title,
    excerpt: postData.excerpt,
    content: postData.content,
    author: 'Personalized Output Team',
    tags: postData.tags,
    meta_title: postData.meta_title,
    meta_description: postData.meta_description,
    published: true,
    published_at: new Date().toISOString(),
  };
}

/**
 * Load existing blog posts
 */
function loadExistingPosts(): BlogPost[] {
  try {
    if (fs.existsSync(BLOG_FILE)) {
      return JSON.parse(fs.readFileSync(BLOG_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('[Blog] Error loading existing posts:', error);
  }
  return [];
}

/**
 * Save blog posts to file
 */
function savePosts(posts: BlogPost[]): void {
  const dir = path.dirname(BLOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(BLOG_FILE, JSON.stringify(posts, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  let count = 1;
  let specificTopic: string | null = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--topic' && args[i + 1]) {
      specificTopic = args[i + 1];
      i++;
    }
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║            BLOG POST GENERATOR - PersonalizedOutput.com               ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not found in .env');
    process.exit(1);
  }

  const existingPosts = loadExistingPosts();
  console.log(`[Blog] Found ${existingPosts.length} existing posts\n`);

  const generatedPosts: BlogPost[] = [];

  for (let i = 0; i < count; i++) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`GENERATING POST ${i + 1} of ${count}`);
    console.log(`${'═'.repeat(60)}\n`);

    const { category, topic } = specificTopic
      ? { category: 'Custom', topic: specificTopic }
      : getRandomTopic([...existingPosts, ...generatedPosts]);

    console.log(`[Topic] ${category}: ${topic}`);

    try {
      const postData = await generateBlogPost(topic, category);

      const newPost: BlogPost = {
        ...postData,
        id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log(`[Generated] "${newPost.title}"`);
      console.log(`[Slug] ${newPost.slug}`);
      console.log(`[Tags] ${newPost.tags.join(', ')}`);

      generatedPosts.push(newPost);
    } catch (error) {
      console.error(`[Error] Failed to generate post:`, error);
    }
  }

  // Save all posts
  if (generatedPosts.length > 0) {
    const allPosts = [...existingPosts, ...generatedPosts];
    savePosts(allPosts);
    console.log(`\n✓ Saved ${generatedPosts.length} new post(s) to ${BLOG_FILE}`);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                        GENERATION COMPLETE                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Generated ${generatedPosts.length} new blog post(s)                                       ║
║  Total posts: ${existingPosts.length + generatedPosts.length}                                                   ║
╚═══════════════════════════════════════════════════════════════════════╝

Generated posts:
${generatedPosts.map(p => `  • ${p.title} (/blog/${p.slug})`).join('\n')}

To schedule automatic generation, add to crontab:
  0 8 * * 1 cd /path/to/project && npx ts-node scripts/generateBlogPosts.ts --count 2

This generates 2 posts every Monday at 8am.
`);
}

main().catch(console.error);
