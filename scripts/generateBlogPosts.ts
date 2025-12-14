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

// Educational thought-leadership topics (NOT how-to guides)
// Focus: Science of learning, success stories, positioning as thought leaders
const BLOG_TOPICS = [
  {
    category: 'Science of Personalized Learning',
    topics: [
      'Why Children Learn Better Through Their Interests: The Science',
      'The Problem with One-Size-Fits-All Education',
      'Visual Learners vs Auditory Learners: Why It Actually Matters',
      'Why Adults Struggle to Learn New Skills (And How to Fix It)',
      'The Power of Connecting New Knowledge to Existing Passions',
      'How Emotion Drives Memory: The Neuroscience of Interest-Based Learning',
      'Why Your Child Remembers Dinosaur Facts But Forgets Math',
      'The Hidden Cost of Boring Education',
      'What Finland Knows About Learning That America Forgot',
      'The Attention Economy: Why Traditional Learning Is Losing',
    ]
  },
  {
    category: 'Success Stories & Case Studies',
    topics: [
      'How Emma Finally Understood Fractions Through Dinosaurs',
      'The Baker Who Finally Understood Her Mortgage',
      'When Learning Stopped Being a Battle: A Parent\'s Story',
      'How a 45-Year-Old Finally Learned to Code',
      'The ADHD Child Who Asked for More Homework',
      'From Math Anxiety to Math Confidence: One Family\'s Journey',
      'The Skeptical Dad Who Became Our Biggest Advocate',
    ]
  },
  {
    category: 'Education Philosophy',
    topics: [
      'Why We Built Personalized Learning Sessions (Our Story)',
      'The Future of Education Is Personal',
      'School Teaches Subjects. We Teach People.',
      'Why Every Child Deserves a Personal Tutor',
      'The Democratization of Elite Education',
      'What AI Gets Right That Classrooms Get Wrong',
      'Learning Should Feel Like Discovery, Not Obligation',
    ]
  },
  {
    category: 'For Parents',
    topics: [
      'How to Know If Your Child Is a Visual, Auditory, or Kinesthetic Learner',
      'The After-School Learning That Actually Works',
      'Why Your Smart Kid Struggles in School',
      'Screen Time That Builds Instead of Destroys',
      'What to Do When Your Child Says I Hate Math',
      'The Homework Battle: Why It Happens and How to End It',
      'Raising Lifelong Learners in a TikTok World',
    ]
  },
  {
    category: 'For Adults',
    topics: [
      'It\'s Not Too Late to Learn: The Adult Learning Advantage',
      'Why Adults Learn Differently (And Better)',
      'Finally Understanding Finance: A Guide for the Rest of Us',
      'Learning New Skills After 40: What the Research Says',
      'The Impostor Syndrome of Adult Learners',
      'From Confused to Confident: Adult Learning Success Stories',
    ]
  },
  {
    category: 'Goal Setting & Vision',
    topics: [
      'The Psychology Behind Why Vision Boards Actually Work',
      'Goal Setting That Sticks: Beyond New Year\'s Resolutions',
      'Why Visualization Works: The Neuroscience',
      'Creating Clarity in an Overwhelmed Life',
      'The Power of Seeing Your Future Self',
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

  const prompt = `Generate an educational thought-leadership blog post for PersonalizedOutput.com about: "${topic}"

IMPORTANT: This is NOT a how-to guide or product tutorial. This is thought-leadership content that:
- Positions PersonalizedOutput as experts in personalized learning
- Provides genuine educational value
- Tells stories and shares insights
- Naturally leads readers to consider personalized learning (without being salesy)

Context:
- PersonalizedOutput.com offers 30-Minute Personalized Learning Sessions (Thought Organizer™)
- Sessions teach ANY subject through the learner's existing interests and passions
- Works for all ages: kids learning fractions through dinosaurs, adults understanding mortgages through their bakery
- Also offers: Custom Vision Boards, Flash Cards, Santa Messages

Blog Post Structure:
1. HOOK: Start with a relatable problem, story, or surprising fact
2. SCIENCE/INSIGHT: Explain why this matters (research, psychology, real examples)
3. STORY: Include a specific example or mini case study
4. THE PROBLEM: What traditional education/learning gets wrong
5. THE SOLUTION: How personalized learning addresses this (subtle, not salesy)
6. SOFT CTA: End with curiosity-driven call-to-action like "Want to see what a personalized lesson looks like?"

Writing Guidelines:
- 800-1200 words
- Warm, conversational, authoritative tone
- Use ## for h2 and ### for h3 headings
- NO "how-to" or step-by-step instructions
- NO product tutorials
- Focus on WHY personalized learning matters, not HOW to use our product
- Stories > Lists
- Emotion > Information

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
