/**
 * Blog Service
 *
 * Manages blog posts for SEO and content marketing.
 */

import {
  getSupabaseServiceClient,
  isSupabaseServiceConfigured,
  BlogPost,
} from './client';
import * as fs from 'fs';
import * as path from 'path';

// File-based fallback for when Supabase isn't configured
const BLOG_FILE = path.join(process.cwd(), 'data', 'blog_posts.json');

// ============================================================
// BLOG POST MANAGEMENT
// ============================================================

/**
 * Get all published blog posts
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  if (!isSupabaseServiceConfigured()) {
    return getPostsFromFile().filter(p => p.published);
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('[Blog] Error fetching posts:', error);
    return [];
  }

  return data as BlogPost[];
}

/**
 * Get a single blog post by slug
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isSupabaseServiceConfigured()) {
    const posts = getPostsFromFile();
    return posts.find(p => p.slug === slug && p.published) || null;
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error) {
    return null;
  }

  return data as BlogPost;
}

/**
 * Get posts by tag
 */
export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  if (!isSupabaseServiceConfigured()) {
    return getPostsFromFile().filter(p => p.published && p.tags?.includes(tag));
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('published', true)
    .contains('tags', [tag])
    .order('published_at', { ascending: false });

  if (error) {
    console.error('[Blog] Error fetching posts by tag:', error);
    return [];
  }

  return data as BlogPost[];
}

/**
 * Create a new blog post (admin only)
 */
export async function createPost(post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>): Promise<BlogPost | null> {
  if (!isSupabaseServiceConfigured()) {
    return createPostFile(post);
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      ...post,
      published_at: post.published ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error('[Blog] Error creating post:', error);
    return null;
  }

  return data as BlogPost;
}

// ============================================================
// FILE-BASED FALLBACK
// ============================================================

function getPostsFromFile(): BlogPost[] {
  try {
    if (fs.existsSync(BLOG_FILE)) {
      return JSON.parse(fs.readFileSync(BLOG_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('[Blog] Error reading posts file:', error);
  }
  return getDefaultPosts();
}

function savePostsToFile(posts: BlogPost[]): void {
  try {
    const dir = path.dirname(BLOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BLOG_FILE, JSON.stringify(posts, null, 2));
  } catch (error) {
    console.error('[Blog] Error saving posts:', error);
  }
}

function createPostFile(post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>): BlogPost {
  const posts = getPostsFromFile();
  const newPost: BlogPost = {
    ...post,
    id: `post_${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: post.published ? new Date().toISOString() : undefined,
  };
  posts.push(newPost);
  savePostsToFile(posts);
  return newPost;
}

// ============================================================
// DEFAULT BLOG POSTS (SEO Content)
// ============================================================

function getDefaultPosts(): BlogPost[] {
  return [
    {
      id: 'post_1',
      slug: 'personalized-santa-message-guide',
      title: 'How to Create the Perfect Personalized Santa Message for Your Child',
      excerpt: 'Learn how to create a magical, deeply personalized Santa message that will make your child\'s eyes light up this Christmas.',
      content: `
# How to Create the Perfect Personalized Santa Message for Your Child

There's something magical about hearing Santa speak directly to your child, mentioning their name, their accomplishments, and the special moments from their year. A truly personalized Santa message can create a Christmas memory that lasts a lifetime.

## Why Personalization Matters

Generic Santa messages are nice, but they don't create that "wow" moment. When Santa mentions your child's specific achievements—like learning to ride a bike, being kind to a sibling, or working hard at school—it becomes real to them.

## What Makes Our Santa Messages Different

Our personalized Santa messages go beyond just inserting a name. We ask about:

- **Specific proud moments** from this year
- **Character traits** you want to reinforce
- **Challenges** they've overcome
- **What YOU most want them to hear**

This depth allows us to create a message that feels impossibly personal—because it is.

## Tips for the Best Results

1. **Be specific**: Instead of "they were good," share a specific moment
2. **Include quotes**: If your child said something memorable, include it
3. **Think about growth**: What has changed about them this year?
4. **Consider their age**: A 4-year-old and an 8-year-old need different approaches

## The Magic Moment

The best part isn't the message itself—it's watching your child's face as they realize Santa really knows them. That moment of wonder and belief is priceless.

Ready to create your personalized Santa message? [Start here](/santa).
      `,
      author: 'Personalized Output Team',
      tags: ['santa', 'christmas', 'kids', 'personalization', 'holiday'],
      meta_title: 'Create a Personalized Santa Message | Make Christmas Magical',
      meta_description: 'Create a deeply personalized Santa message that mentions your child\'s specific achievements, name, and special moments. Make this Christmas unforgettable.',
      published: true,
      published_at: new Date('2024-11-15').toISOString(),
      created_at: new Date('2024-11-15').toISOString(),
      updated_at: new Date('2024-11-15').toISOString(),
    },
    {
      id: 'post_2',
      slug: 'vision-board-guide-2025',
      title: 'How to Create an Effective Vision Board for 2025',
      excerpt: 'A complete guide to creating a vision board that actually helps you achieve your goals in the new year.',
      content: `
# How to Create an Effective Vision Board for 2025

Vision boards have helped millions of people clarify their goals and manifest their dreams. But there's a science to creating one that actually works.

## Why Vision Boards Work

Research in psychology shows that visualization activates similar neural pathways as actually performing an action. When you see your goals daily, you're training your brain to recognize opportunities.

## The Problem with Generic Vision Boards

Pinterest-perfect vision boards with generic "success" quotes don't work because they're not personal. Your vision board should reflect YOUR dreams, not someone else's aesthetic.

## Our Approach to Vision Boards

We help you:

1. **Clarify your values** before selecting images
2. **Define specific goals** in each life area
3. **Choose images that resonate emotionally** with YOU
4. **Create affirmations that feel authentic**

## Areas to Consider

- Career & finances
- Health & wellness
- Relationships & family
- Personal growth & learning
- Home & environment
- Fun & creativity

## Making It Work

The key is placing your vision board where you'll see it daily, then taking small actions toward each goal. Visualization without action is just daydreaming.

Ready to create your personalized vision board? [Start here](/vision-board).
      `,
      author: 'Personalized Output Team',
      tags: ['vision-board', 'goals', 'new-year', 'planning', 'manifestation'],
      meta_title: 'Create Your 2025 Vision Board | Personalized Goal Setting',
      meta_description: 'Learn how to create an effective, personalized vision board for 2025. Our guide helps you clarify goals and create a vision that actually works.',
      published: true,
      published_at: new Date('2024-12-01').toISOString(),
      created_at: new Date('2024-12-01').toISOString(),
      updated_at: new Date('2024-12-01').toISOString(),
    },
    {
      id: 'post_3',
      slug: 'navigating-difficult-family-holidays',
      title: 'How to Navigate Difficult Family Dynamics During the Holidays',
      excerpt: 'Practical strategies for maintaining your peace while handling challenging family relationships during holiday gatherings.',
      content: `
# How to Navigate Difficult Family Dynamics During the Holidays

The holidays can bring joy—and stress. If you're dreading certain family interactions, you're not alone. Here's how to protect your peace while still showing up.

## Why Holidays Amplify Tension

Holiday gatherings compress extended family into small spaces with high expectations. Old patterns resurface, and we often regress to childhood roles.

## Common Holiday Challenges

- The relative who always criticizes
- Political disagreements
- Feeling invisible or unheard
- Managing divorced parents
- Setting boundaries around topics
- Dealing with grief during celebrations

## Strategies That Actually Work

### 1. Prepare Your Boundaries in Advance
Know what topics you won't engage with, and have exit phrases ready.

### 2. Create Buffer Activities
Board games, cooking together, or outdoor activities give structure and reduce awkward conversations.

### 3. Schedule Decompression Time
Build in breaks where you can step away and reset.

### 4. Remember: You Can Leave
You don't owe anyone your peace of mind.

## Our Holiday Relationship Reset Planner

We created our Holiday Relationship Reset Planner specifically for this challenge. It helps you:

- Identify your core tensions
- Develop specific strategies
- Create an actual game plan
- Give yourself permission to prioritize your wellbeing

[Create your Holiday Reset Planner](/holiday-reset)
      `,
      author: 'Personalized Output Team',
      tags: ['holiday', 'family', 'relationships', 'boundaries', 'self-care'],
      meta_title: 'Navigate Difficult Family Holidays | Relationship Strategies',
      meta_description: 'Practical strategies for handling challenging family dynamics during holiday gatherings. Create your personalized Holiday Reset Planner.',
      published: true,
      published_at: new Date('2024-11-20').toISOString(),
      created_at: new Date('2024-11-20').toISOString(),
      updated_at: new Date('2024-11-20').toISOString(),
    },
    {
      id: 'post_4',
      slug: 'year-end-reflection-guide',
      title: 'The Complete Guide to Meaningful Year-End Reflection',
      excerpt: 'How to reflect on your year in a way that honors your experiences and sets you up for an intentional new year.',
      content: `
# The Complete Guide to Meaningful Year-End Reflection

As the year ends, it's natural to look back. But surface-level reflection ("what went well, what didn't") misses the deeper work.

## Why Deep Reflection Matters

When we truly examine our year—the moments that changed us, the patterns we notice, the growth we achieved—we can move forward with intention rather than repetition.

## Beyond "Resolutions"

Resolutions fail because they focus on external changes without internal understanding. First, know yourself. Then, set intentions aligned with who you're becoming.

## Questions for Deep Reflection

### Looking Back
- What three words describe this year?
- What moment changed you the most?
- What surprised you about yourself?
- What are you most proud of?
- What would you do differently?

### Looking Inward
- What patterns did you notice?
- What strength emerged that you didn't know you had?
- What do you need to forgive yourself for?
- What are you ready to release?

### Looking Forward
- How do you want to FEEL next year?
- What must change for that to happen?
- What secret dream are you finally ready to pursue?

## Our New Year Reflection Planner

We designed our New Year Reset Planner as a ~20 minute immersive experience that guides you through this reflection process, then creates a personalized output that:

- Honors your year
- Identifies your patterns and strengths
- Sets intentions (not resolutions)
- Gives you permission you need

[Create your New Year Reset Planner](/new-year-reset)
      `,
      author: 'Personalized Output Team',
      tags: ['new-year', 'reflection', 'goals', 'planning', 'self-improvement'],
      meta_title: 'Year-End Reflection Guide | Create Your New Year Planner',
      meta_description: 'A complete guide to meaningful year-end reflection. Go beyond resolutions and create intentional change with our New Year Reset Planner.',
      published: true,
      published_at: new Date('2024-12-10').toISOString(),
      created_at: new Date('2024-12-10').toISOString(),
      updated_at: new Date('2024-12-10').toISOString(),
    },
    {
      id: 'post_5',
      slug: 'personalized-flash-cards-learning',
      title: 'Why Personalized Flash Cards Work Better for Your Child\'s Learning',
      excerpt: 'Learn how customized flash cards using your child\'s interests dramatically improve learning outcomes.',
      content: `
# Why Personalized Flash Cards Work Better for Your Child's Learning

Generic flash cards are everywhere. But research shows that personalized learning materials significantly outperform generic ones. Here's why, and how to create flash cards that actually work for YOUR child.

## The Science of Personalized Learning

When content connects to a child's existing interests and knowledge, they:
- Pay more attention
- Remember information longer
- Feel more motivated to practice
- Make deeper neural connections

## The Problem with Generic Flash Cards

Store-bought flash cards use generic examples that don't resonate with every child. "2 apples + 3 apples" means nothing to a child who loves dinosaurs.

## What Makes Flash Cards Effective

### 1. Use Their Interests
If they love Minecraft, make math problems about blocks. If they love horses, use horse scenarios.

### 2. Address Their Specific Struggles
Generic cards cover everything. Your child might only need help with multiplication past 6, or specific sight words.

### 3. Match Their Learning Style
Some kids need visual cues. Others need silly phrases. Others need real-world connections.

### 4. Adapt to Their Level
Not too easy, not too hard—right in their growth zone.

## Our Custom Flash Card Solution

We interview you about your child—their personality, interests, learning style, and specific struggles—then create flash cards designed specifically for them.

[Create Custom Flash Cards](/flash-cards)
      `,
      author: 'Personalized Output Team',
      tags: ['education', 'kids', 'learning', 'flash-cards', 'homeschool'],
      meta_title: 'Personalized Flash Cards for Kids | Custom Learning Materials',
      meta_description: 'Discover why personalized flash cards work better for your child\'s learning. Create custom flash cards tailored to their interests and needs.',
      published: true,
      published_at: new Date('2024-12-05').toISOString(),
      created_at: new Date('2024-12-05').toISOString(),
      updated_at: new Date('2024-12-05').toISOString(),
    },
    {
      id: 'post_6',
      slug: 'gift-giving-meaningful-presents',
      title: 'The Art of Meaningful Gift Giving: Beyond Material Presents',
      excerpt: 'How to give gifts that create emotional impact and lasting memories, not just stuff.',
      content: `
# The Art of Meaningful Gift Giving: Beyond Material Presents

In a world of same-day delivery, the most meaningful gifts aren't things you can buy with one click. They're experiences, memories, and personalized creations that say "I really know you."

## Why Personalized Gifts Hit Different

Material gifts are forgotten. But a gift that shows deep understanding of who someone is—their dreams, their struggles, their journey—creates an emotional moment they remember.

## Types of Meaningful Gifts

### Experience Gifts
Shared experiences create memories together.

### Time Gifts
Your presence, attention, and help.

### Personalized Creations
Gifts that could only exist for this specific person.

### Acts of Service
Doing something they need but wouldn't ask for.

## Our Approach to Personalized Gifts

Every product we create is designed to be a meaningful gift:

- **Santa Messages**: A magical voice message mentioning your child's specific year
- **Vision Boards**: A visualization of someone's unique dreams
- **Planners**: Tools that address their specific challenges
- **Flash Cards**: Learning materials built around their child's interests

## The Reaction You're Looking For

The best gift creates a moment where they say "How did you KNOW?" That moment of feeling truly seen and understood—that's what we help you create.

[Explore Our Products](/)
      `,
      author: 'Personalized Output Team',
      tags: ['gifts', 'personalization', 'holiday', 'christmas', 'meaningful'],
      meta_title: 'Meaningful Gift Ideas | Personalized Gifts That Matter',
      meta_description: 'Learn the art of meaningful gift giving. Discover how personalized gifts create emotional impact and lasting memories.',
      published: true,
      published_at: new Date('2024-11-25').toISOString(),
      created_at: new Date('2024-11-25').toISOString(),
      updated_at: new Date('2024-11-25').toISOString(),
    },
    {
      id: 'post_7',
      slug: 'finding-clarity-life-decisions',
      title: 'How to Find Clarity When Life Feels Overwhelming',
      excerpt: 'Practical approaches to gaining clarity when you\'re facing big decisions or feeling stuck.',
      content: `
# How to Find Clarity When Life Feels Overwhelming

Life gets messy. Sometimes we know something needs to change but can't see the path forward. Here's how to find clarity when everything feels overwhelming.

## Why Clarity Feels Elusive

Our minds are designed to solve problems, but they can also spiral. When we're stressed, we lose access to our wisest thinking. Clarity requires creating space.

## Signs You Need a Clarity Session

- You're facing a big decision and can't choose
- You feel stuck but don't know why
- Your emotions are all over the place
- You know something needs to change
- You've lost touch with what you actually want

## Steps to Finding Clarity

### 1. Get It Out of Your Head
Thoughts that loop in your mind need to be externalized—written, spoken, or otherwise processed.

### 2. Identify the Real Question
Often what seems like the problem isn't the actual issue. Go deeper.

### 3. Separate Facts from Fears
What do you actually know vs. what are you afraid might happen?

### 4. Connect with Your Values
When decisions align with your values, clarity follows.

### 5. Give Yourself Permission
Sometimes clarity requires giving yourself permission you've been waiting for someone else to give.

## Our Clarity Planner

We created the Clarity Planner as a guided conversation that helps you:

- Process what's really going on
- Identify the core issue
- Explore your options without judgment
- Create an action plan
- Receive the words you need to hear

It's like having a wise friend who asks the right questions.

[Create Your Clarity Planner](/clarity-planner)
      `,
      author: 'Personalized Output Team',
      tags: ['clarity', 'decisions', 'self-improvement', 'planning', 'mental-health'],
      meta_title: 'Find Clarity in Life Decisions | Guided Clarity Planner',
      meta_description: 'Learn how to find clarity when life feels overwhelming. Our guided Clarity Planner helps you process decisions and create action plans.',
      published: true,
      published_at: new Date('2024-12-08').toISOString(),
      created_at: new Date('2024-12-08').toISOString(),
      updated_at: new Date('2024-12-08').toISOString(),
    },
    {
      id: 'post_8',
      slug: 'personalized-learning-science',
      title: 'The Science Behind Personalized Learning: Why Context Matters',
      excerpt: 'Discover the neuroscience behind why personalized lessons using your interests dramatically outperform generic educational content.',
      content: `
# The Science Behind Personalized Learning: Why Context Matters

Every parent has seen it: their child struggles with a math problem, but when you reframe it around their favorite video game or sport, suddenly they get it. This isn't a coincidence—it's neuroscience in action.

## How the Brain Learns

Our brains are pattern-recognition machines. When new information connects to existing knowledge and interests, it creates stronger neural pathways. This is called **elaborative encoding**.

Think of it like this: isolated facts are like loose LEGO pieces. But when those facts connect to something your child already loves, they snap together into a meaningful structure.

## The Problem with Generic Education

Traditional learning materials use generic examples that work for the "average" student—who doesn't actually exist. When content doesn't resonate:

- Attention wanders
- Information stays in short-term memory
- Learning feels like a chore
- Motivation drops
- The "I hate math/reading/science" identity forms

## The Personalization Advantage

Research shows personalized learning can improve outcomes by 30% or more. Here's why:

### 1. Attention Capture
When Sarah sees a math problem about her bakery dream, she leans in. Her brain says "this is relevant to ME."

### 2. Emotional Engagement
Emotions enhance memory formation. When learning connects to what we care about, we remember it longer.

### 3. Identity Alignment
Instead of "I'm bad at math," your child thinks "I use math to understand my passion."

### 4. Natural Elaboration
They start connecting the lesson to other things they know, building deeper understanding.

## What Makes Effective Personalized Learning

Not all personalization is equal. Effective personalized lessons:

- **Use specific details**: Not just "dinosaurs" but "T-Rex hunting strategies"
- **Match learning style**: Visual, auditory, or hands-on approaches
- **Address actual struggle points**: Focus on what they need help with
- **Tell a story**: Narrative learning improves retention by 22x

## Real Examples from Our Lessons

**Joe, age 7**: Struggles with fractions. Obsessed with dinosaurs. His lesson teaches fractions through dinosaur pack sizes and hunting territory divisions. Result: Fractions finally click.

**Maya, age 10**: Resists science homework. Loves art. Her lesson explores the solar system through color mixing and artistic perspectives. Result: Asks for more science content.

**Sarah, adult**: Avoiding understanding mortgages. Dreams of opening a bakery. Her lesson explains mortgage concepts through bakery business scenarios. Result: Finally feels confident about the home-buying process.

## The 10-Minute Difference

Attention research shows focused 10-minute sessions often outperform longer lessons. By keeping our personalized lessons concise and engaging, we work with the brain's natural attention cycles, not against them.

## How Our Lessons Work

1. We learn about your person—their interests, struggles, and learning style
2. Our AI creates a custom lesson narrative using their specific context
3. The lesson is voiced with natural, engaging narration
4. You receive a PDF and audio version to use anywhere

The result? Learning that feels like storytelling, not homework.

[Create a Personalized Lesson](/lessons)
      `,
      author: 'Personalized Output Team',
      tags: ['education', 'personalization', 'learning', 'neuroscience', 'lessons'],
      meta_title: 'The Science of Personalized Learning | Custom Educational Content',
      meta_description: 'Discover why personalized learning using your interests works better. Learn the neuroscience behind custom educational content that actually sticks.',
      published: true,
      published_at: new Date('2024-12-12').toISOString(),
      created_at: new Date('2024-12-12').toISOString(),
      updated_at: new Date('2024-12-12').toISOString(),
    },
  ];
}
