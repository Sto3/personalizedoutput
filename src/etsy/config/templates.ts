/**
 * Etsy Automation - Listing Templates
 *
 * Title templates, description blocks, and tag pools for generating
 * unique, SEO-optimized Etsy listings.
 */

import { ProductType, TitleTemplate, DescriptionBlock, TagPool } from './types';

// ============================================================
// TITLE TEMPLATES
// ============================================================

export const TITLE_TEMPLATES: TitleTemplate[] = [
  // ===== VISION BOARD TITLES =====
  {
    id: 'vb_title_1',
    productType: 'vision_board',
    template: '{theme} Vision Board | {angle} | Digital Download Printable',
    placeholders: ['theme', 'angle']
  },
  {
    id: 'vb_title_2',
    productType: 'vision_board',
    template: '{theme} Digital Vision Board | {outcome} | Instant Download PDF',
    placeholders: ['theme', 'outcome']
  },
  {
    id: 'vb_title_3',
    productType: 'vision_board',
    template: 'Printable {theme} Vision Board | {audience} | Manifestation Kit',
    placeholders: ['theme', 'audience']
  },
  {
    id: 'vb_title_4',
    productType: 'vision_board',
    template: '{theme} Manifestation Board | {angle} | Digital Print',
    placeholders: ['theme', 'angle']
  },
  {
    id: 'vb_title_5',
    productType: 'vision_board',
    template: '{outcome} Vision Board | {theme} | Printable Wall Art',
    placeholders: ['outcome', 'theme']
  },
  {
    id: 'vb_title_6',
    productType: 'vision_board',
    template: 'Digital {theme} Board | {angle} | Instant Download',
    placeholders: ['theme', 'angle']
  },
  {
    id: 'vb_title_7',
    productType: 'vision_board',
    template: '{theme} Goal Board | {audience} | Printable PDF Download',
    placeholders: ['theme', 'audience']
  },
  {
    id: 'vb_title_8',
    productType: 'vision_board',
    template: 'Manifestation {theme} Board | {outcome} | Digital Wall Art',
    placeholders: ['theme', 'outcome']
  },

  // ===== SANTA MESSAGE TITLES =====
  {
    id: 'santa_title_1',
    productType: 'santa_message',
    template: 'Personalized Santa Video Message | {theme} | Custom Audio for {audience}',
    placeholders: ['theme', 'audience']
  },
  {
    id: 'santa_title_2',
    productType: 'santa_message',
    template: 'Custom Santa Letter Audio | {theme} | Personalized for {audience}',
    placeholders: ['theme', 'audience']
  },
  {
    id: 'santa_title_3',
    productType: 'santa_message',
    template: 'Santa Claus Personal Message | {angle} | {audience} Gift',
    placeholders: ['angle', 'audience']
  },
  {
    id: 'santa_title_4',
    productType: 'santa_message',
    template: 'Magical Santa Audio Message | {theme} | Personalized Christmas Gift',
    placeholders: ['theme']
  },
  {
    id: 'santa_title_5',
    productType: 'santa_message',
    template: 'Custom Santa Recording | {theme} | {angle} | Digital Keepsake',
    placeholders: ['theme', 'angle']
  },
  {
    id: 'santa_title_6',
    productType: 'santa_message',
    template: 'Personalized North Pole Message | {audience} | Santa Audio Gift',
    placeholders: ['audience']
  },

  // ===== FLASH CARDS TITLES =====
  {
    id: 'flash_title_1',
    productType: 'flash_cards',
    template: '{theme} Flash Cards | {audience} | Printable Learning Cards',
    placeholders: ['theme', 'audience']
  },
  {
    id: 'flash_title_2',
    productType: 'flash_cards',
    template: 'Printable {theme} Flashcards | {outcome} | Digital Download',
    placeholders: ['theme', 'outcome']
  },
  {
    id: 'flash_title_3',
    productType: 'flash_cards',
    template: '{theme} Study Cards | {angle} | Instant Download PDF',
    placeholders: ['theme', 'angle']
  },
  {
    id: 'flash_title_4',
    productType: 'flash_cards',
    template: 'Educational {theme} Cards | {audience} | Homeschool Resource',
    placeholders: ['theme', 'audience']
  },
  {
    id: 'flash_title_5',
    productType: 'flash_cards',
    template: '{theme} Learning Flashcards | {outcome} | Printable Set',
    placeholders: ['theme', 'outcome']
  },
  {
    id: 'flash_title_6',
    productType: 'flash_cards',
    template: 'Digital {theme} Flash Cards | {angle} | Study Guide',
    placeholders: ['theme', 'angle']
  },

  // ===== PLANNER TITLES =====
  {
    id: 'planner_title_1',
    productType: 'planner',
    template: '{theme} Planner | {angle} | Printable Journal PDF',
    placeholders: ['theme', 'angle']
  },
  {
    id: 'planner_title_2',
    productType: 'planner',
    template: '{theme} Guided Planner | {outcome} | Digital Download',
    placeholders: ['theme', 'outcome']
  },
  {
    id: 'planner_title_3',
    productType: 'planner',
    template: 'Printable {theme} Planner | {audience} | Self-Help Guide',
    placeholders: ['theme', 'audience']
  },
  {
    id: 'planner_title_4',
    productType: 'planner',
    template: '{theme} Activity Planner | {angle} | Instant Download',
    placeholders: ['theme', 'angle']
  },
  {
    id: 'planner_title_5',
    productType: 'planner',
    template: 'Digital {theme} Planner | {outcome} | Reflection Prompts',
    placeholders: ['theme', 'outcome']
  },
  {
    id: 'planner_title_6',
    productType: 'planner',
    template: '{theme} Growth Planner | {audience} | PDF Printable',
    placeholders: ['theme', 'audience']
  }
];

// ============================================================
// DESCRIPTION BLOCKS
// ============================================================

export const DESCRIPTION_BLOCKS: DescriptionBlock[] = [
  // ===== VISION BOARD HOOKS =====
  {
    id: 'vb_hook_1',
    productType: 'vision_board',
    blockType: 'hook',
    content: `Ready to manifest your dreams into reality? This beautiful vision board is designed to help you visualize your goals and create the life you've always wanted.`,
    variationIndex: 0
  },
  {
    id: 'vb_hook_2',
    productType: 'vision_board',
    blockType: 'hook',
    content: `Transform your intentions into action with this stunning digital vision board. Perfect for anyone ready to take their next bold step forward.`,
    variationIndex: 1
  },
  {
    id: 'vb_hook_3',
    productType: 'vision_board',
    blockType: 'hook',
    content: `Your future self is calling. This vision board is more than just pretty pictures - it's a roadmap to the life you deserve.`,
    variationIndex: 2
  },
  {
    id: 'vb_hook_4',
    productType: 'vision_board',
    blockType: 'hook',
    content: `What would your life look like if you truly believed in yourself? Start visualizing that reality today with this beautiful manifestation board.`,
    variationIndex: 3
  },
  {
    id: 'vb_hook_5',
    productType: 'vision_board',
    blockType: 'hook',
    content: `Sometimes the first step to change is simply seeing what's possible. Let this vision board inspire your journey toward your best self.`,
    variationIndex: 4
  },
  {
    id: 'vb_hook_6',
    productType: 'vision_board',
    blockType: 'hook',
    content: `You deserve to dream big. This carefully designed vision board helps you focus on what truly matters and create space for growth.`,
    variationIndex: 5
  },
  {
    id: 'vb_hook_7',
    productType: 'vision_board',
    blockType: 'hook',
    content: `New chapter? Fresh start? This vision board is here to help you set powerful intentions and manifest the changes you're ready for.`,
    variationIndex: 6
  },
  {
    id: 'vb_hook_8',
    productType: 'vision_board',
    blockType: 'hook',
    content: `The power of visualization is real. Research shows that seeing your goals daily increases your likelihood of achieving them.`,
    variationIndex: 7
  },
  {
    id: 'vb_hook_9',
    productType: 'vision_board',
    blockType: 'hook',
    content: `Clarity comes before action. This vision board helps you get crystal clear on what you want so you can start making it happen.`,
    variationIndex: 8
  },
  {
    id: 'vb_hook_10',
    productType: 'vision_board',
    blockType: 'hook',
    content: `Every achievement starts with a vision. Plant the seeds of your future success with this inspiring manifestation board.`,
    variationIndex: 9
  },

  // ===== VISION BOARD HOW IT WORKS =====
  {
    id: 'vb_how_1',
    productType: 'vision_board',
    blockType: 'how_it_works',
    content: `HOW IT WORKS:
1. Purchase and instantly download your high-resolution PDF
2. Print at home or at your local print shop (recommended: 8x10 or larger)
3. Display somewhere you'll see it daily - your desk, mirror, or wall
4. Take a moment each day to visualize yourself living this reality
5. Watch as your mindset shifts and opportunities appear`,
    variationIndex: 0
  },
  {
    id: 'vb_how_2',
    productType: 'vision_board',
    blockType: 'how_it_works',
    content: `HOW TO USE YOUR VISION BOARD:
- Download immediately after purchase
- Print in your preferred size (works great at 8x10, 11x14, or 16x20)
- Frame it or pin it where you'll see it every day
- Spend 2-3 minutes each morning connecting with your vision
- Journal about what you see yourself achieving`,
    variationIndex: 1
  },

  // ===== VISION BOARD WHAT YOU RECEIVE =====
  {
    id: 'vb_receive_1',
    productType: 'vision_board',
    blockType: 'what_you_receive',
    content: `WHAT YOU RECEIVE:
- 1 high-resolution digital PDF (300 DPI for crisp printing)
- Multiple size options included (8x10, 11x14, 16x20)
- Instant download - no waiting for shipping!
- Print unlimited copies for personal use
- Lifetime access to your download`,
    variationIndex: 0
  },
  {
    id: 'vb_receive_2',
    productType: 'vision_board',
    blockType: 'what_you_receive',
    content: `YOUR DOWNLOAD INCLUDES:
- Premium quality PDF file (300 DPI)
- Standard sizes: 8x10, 11x14, 16x20 inches
- Instant digital delivery
- Print as many times as you want
- Works with any home printer or professional print service`,
    variationIndex: 1
  },

  // ===== VISION BOARD WHO FOR =====
  {
    id: 'vb_who_1',
    productType: 'vision_board',
    blockType: 'who_for',
    content: `PERFECT FOR:
- Anyone starting a new chapter in life
- Goal-setters ready to take action
- Journal and planner enthusiasts
- Those seeking clarity and direction
- Gift for someone who needs encouragement`,
    variationIndex: 0
  },
  {
    id: 'vb_who_2',
    productType: 'vision_board',
    blockType: 'who_for',
    content: `THIS IS FOR YOU IF:
- You're ready to get intentional about your goals
- You believe in the power of visualization
- You want daily inspiration and motivation
- You're navigating change and need focus
- You love beautiful, meaningful wall art`,
    variationIndex: 1
  },

  // ===== VISION BOARD REASSURANCE =====
  {
    id: 'vb_reassure_1',
    productType: 'vision_board',
    blockType: 'reassurance',
    content: `This is a digital download - no physical item will be shipped. You'll receive instant access to your files after purchase. If you have any questions, please don't hesitate to reach out - I'm here to help!

Colors may vary slightly depending on your monitor and printer settings.`,
    variationIndex: 0
  },

  // ===== SANTA MESSAGE HOOKS =====
  {
    id: 'santa_hook_1',
    productType: 'santa_message',
    blockType: 'hook',
    content: `Give your child a magical Christmas memory they'll treasure forever! This personalized audio message from Santa Claus is customized just for them.`,
    variationIndex: 0
  },
  {
    id: 'santa_hook_2',
    productType: 'santa_message',
    blockType: 'hook',
    content: `Imagine your child's face lighting up when they hear Santa say their name! Create Christmas magic with a personalized message from the North Pole.`,
    variationIndex: 1
  },
  {
    id: 'santa_hook_3',
    productType: 'santa_message',
    blockType: 'hook',
    content: `Make this Christmas truly special with a one-of-a-kind audio message from Santa himself. Personalized with your child's name, achievements, and more!`,
    variationIndex: 2
  },
  {
    id: 'santa_hook_4',
    productType: 'santa_message',
    blockType: 'hook',
    content: `The magic of Christmas comes alive when Santa knows your child by name. This heartwarming personalized message will be a highlight of their holiday.`,
    variationIndex: 3
  },
  {
    id: 'santa_hook_5',
    productType: 'santa_message',
    blockType: 'hook',
    content: `Create a Christmas moment they'll talk about for years! Santa's personalized message acknowledges your child's unique accomplishments and sweet personality.`,
    variationIndex: 4
  },

  // ===== SANTA MESSAGE HOW IT WORKS =====
  {
    id: 'santa_how_1',
    productType: 'santa_message',
    blockType: 'how_it_works',
    content: `HOW IT WORKS:
1. Purchase this listing
2. Fill out the personalization form with your child's details
3. We create a custom message from Santa using professional voice technology
4. Receive your audio file within 24-48 hours
5. Play it for your child on Christmas Eve, Christmas morning, or anytime!`,
    variationIndex: 0
  },

  // ===== SANTA MESSAGE WHAT YOU RECEIVE =====
  {
    id: 'santa_receive_1',
    productType: 'santa_message',
    blockType: 'what_you_receive',
    content: `WHAT YOU RECEIVE:
- One personalized audio message from Santa (MP3 format)
- Approximately 60-90 seconds of magical content
- Professional Santa voice recording
- Digital delivery - save and play forever!
- Can be played on any device`,
    variationIndex: 0
  },

  // ===== SANTA MESSAGE WHO FOR =====
  {
    id: 'santa_who_1',
    productType: 'santa_message',
    blockType: 'who_for',
    content: `PERFECT FOR:
- Children who believe in Santa's magic
- Creating special Christmas Eve traditions
- Long-distance grandparents to send to grandchildren
- Families wanting to make Christmas extra special
- Keepsake memories to treasure for years`,
    variationIndex: 0
  },

  // ===== SANTA MESSAGE REASSURANCE =====
  {
    id: 'santa_reassure_1',
    productType: 'santa_message',
    blockType: 'reassurance',
    content: `Please provide accurate information in the personalization form so Santa can create the most magical message possible. Digital delivery within 24-48 hours. Questions? Reach out anytime!`,
    variationIndex: 0
  },

  // ===== FLASH CARDS HOOKS =====
  {
    id: 'flash_hook_1',
    productType: 'flash_cards',
    blockType: 'hook',
    content: `Make learning fun and effective with these beautifully designed flash cards! Perfect for visual learners who want to master new concepts.`,
    variationIndex: 0
  },
  {
    id: 'flash_hook_2',
    productType: 'flash_cards',
    blockType: 'hook',
    content: `Turn study time into success time! These printable flash cards make it easy to learn, review, and retain important information.`,
    variationIndex: 1
  },
  {
    id: 'flash_hook_3',
    productType: 'flash_cards',
    blockType: 'hook',
    content: `Whether you're homeschooling, tutoring, or supporting your child's education, these flash cards are the perfect learning companion.`,
    variationIndex: 2
  },

  // ===== FLASH CARDS HOW IT WORKS =====
  {
    id: 'flash_how_1',
    productType: 'flash_cards',
    blockType: 'how_it_works',
    content: `HOW TO USE:
1. Download your PDF instantly after purchase
2. Print on cardstock for durability (or regular paper works too!)
3. Cut along the dotted lines
4. Practice daily for best results
5. Use the included tips for effective studying`,
    variationIndex: 0
  },

  // ===== FLASH CARDS WHAT YOU RECEIVE =====
  {
    id: 'flash_receive_1',
    productType: 'flash_cards',
    blockType: 'what_you_receive',
    content: `WHAT YOU RECEIVE:
- Complete set of printable flash cards (PDF format)
- High-resolution files for crisp printing
- Study tips and usage guide included
- Print unlimited copies for personal/classroom use
- Instant digital download`,
    variationIndex: 0
  },

  // ===== FLASH CARDS WHO FOR =====
  {
    id: 'flash_who_1',
    productType: 'flash_cards',
    blockType: 'who_for',
    content: `PERFECT FOR:
- Homeschool families
- Teachers and tutors
- Parents supporting homework time
- Students who are visual learners
- Anyone wanting to learn in a fun, engaging way`,
    variationIndex: 0
  },

  // ===== FLASH CARDS REASSURANCE =====
  {
    id: 'flash_reassure_1',
    productType: 'flash_cards',
    blockType: 'reassurance',
    content: `This is a digital download - no physical item will be shipped. Print as many copies as you need for your personal use or classroom. For best results, print on cardstock paper.`,
    variationIndex: 0
  },

  // ===== PLANNER HOOKS =====
  {
    id: 'planner_hook_1',
    productType: 'planner',
    blockType: 'hook',
    content: `Ready to do the inner work? This guided planner takes you through powerful exercises designed to help you grow, heal, and become your best self.`,
    variationIndex: 0
  },
  {
    id: 'planner_hook_2',
    productType: 'planner',
    blockType: 'hook',
    content: `Transformation doesn't happen by accident - it happens through intention. This planner gives you the structure and prompts to create meaningful change.`,
    variationIndex: 1
  },
  {
    id: 'planner_hook_3',
    productType: 'planner',
    blockType: 'hook',
    content: `Sometimes we need a guide to help us through life's transitions. This thoughtfully designed planner (workbook included!) walks you through every step of your journey.`,
    variationIndex: 2
  },
  {
    id: 'planner_hook_4',
    productType: 'planner',
    blockType: 'hook',
    content: `Journal prompts, reflection exercises, and actionable worksheets - everything you need to navigate this chapter of your life with clarity and confidence.`,
    variationIndex: 3
  },

  // ===== PLANNER HOW IT WORKS =====
  {
    id: 'planner_how_1',
    productType: 'planner',
    blockType: 'how_it_works',
    content: `HOW TO USE THIS PLANNER:
1. Download and print your PDF (or use digitally on a tablet)
2. Set aside dedicated time for reflection - even 10 minutes helps
3. Work through the exercises at your own pace
4. Be honest with yourself - this is your private space to grow
5. Return to exercises as needed throughout your journey`,
    variationIndex: 0
  },

  // ===== PLANNER WHAT YOU RECEIVE =====
  {
    id: 'planner_receive_1',
    productType: 'planner',
    blockType: 'what_you_receive',
    content: `WHAT YOU RECEIVE:
- Complete printable planner (PDF format)
- Guided journal prompts and reflection questions
- Actionable worksheets and exercises
- High-quality design for an elevated experience
- Instant download - start your journey today`,
    variationIndex: 0
  },

  // ===== PLANNER WHO FOR =====
  {
    id: 'planner_who_1',
    productType: 'planner',
    blockType: 'who_for',
    content: `THIS PLANNER IS FOR YOU IF:
- You're navigating change and want support
- You love journaling and self-reflection
- You're ready to invest in your personal growth
- You want structure for your inner work
- You believe in the power of intentional living`,
    variationIndex: 0
  },

  // ===== PLANNER REASSURANCE =====
  {
    id: 'planner_reassure_1',
    productType: 'planner',
    blockType: 'reassurance',
    content: `This is a digital download - no physical item will be shipped. You'll receive instant access to your PDF after purchase. Print it out or fill it in digitally on your tablet. Questions? I'm here to help!`,
    variationIndex: 0
  }
];

// ============================================================
// TAG POOLS
// ============================================================

export const TAG_POOLS: TagPool[] = [
  // ===== VISION BOARD TAGS =====
  {
    productType: 'vision_board',
    coreProductTags: [
      'vision board',
      'digital download',
      'printable wall art',
      'manifestation',
      'goal setting',
      'dream board',
      'instant download',
      'pdf printable',
      'wall decor',
      'motivational art'
    ],
    emotionalTags: [
      'self improvement',
      'personal growth',
      'new beginnings',
      'fresh start',
      'healing journey',
      'self love',
      'empowerment',
      'mindset shift',
      'positive vibes',
      'inspiration'
    ],
    seasonalTags: [
      'new year goals',
      '2024 vision board',
      '2025 goals',
      'january motivation',
      'new year new me',
      'birthday goals'
    ]
  },

  // ===== SANTA MESSAGE TAGS =====
  {
    productType: 'santa_message',
    coreProductTags: [
      'personalized santa',
      'santa message',
      'christmas gift',
      'santa audio',
      'custom santa',
      'santa letter',
      'north pole message',
      'santa claus',
      'christmas keepsake',
      'holiday gift'
    ],
    emotionalTags: [
      'christmas magic',
      'believe in santa',
      'holiday tradition',
      'magical christmas',
      'special gift',
      'family tradition',
      'christmas memories',
      'holiday surprise',
      'christmas wonder'
    ],
    seasonalTags: [
      'christmas 2024',
      'holiday 2024',
      'christmas eve',
      'december gift',
      'stocking stuffer'
    ]
  },

  // ===== FLASH CARDS TAGS =====
  {
    productType: 'flash_cards',
    coreProductTags: [
      'flash cards',
      'flashcards printable',
      'learning cards',
      'study cards',
      'educational',
      'homeschool',
      'printable cards',
      'teaching resource',
      'classroom resource',
      'digital download'
    ],
    emotionalTags: [
      'fun learning',
      'engaging education',
      'visual learning',
      'study help',
      'learning tools',
      'educational gift',
      'smart kids',
      'school success'
    ],
    seasonalTags: [
      'back to school',
      'summer learning',
      'homeschool year',
      'school year prep'
    ]
  },

  // ===== PLANNER TAGS =====
  {
    productType: 'planner',
    coreProductTags: [
      'printable planner',
      'guided journal',
      'self help',
      'journal prompts',
      'reflection planner',
      'personal development',
      'digital planner',
      'worksheet printable',
      'planner insert',
      'pdf download'
    ],
    emotionalTags: [
      'healing journey',
      'self discovery',
      'inner work',
      'mindfulness',
      'growth mindset',
      'self care',
      'life coaching',
      'mental wellness',
      'self reflection',
      'personal growth'
    ],
    seasonalTags: [
      'new year planner',
      'fresh start',
      'yearly reflection',
      'annual review'
    ]
  }
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get title templates by product type
 */
export function getTitleTemplatesByProduct(productType: ProductType): TitleTemplate[] {
  return TITLE_TEMPLATES.filter(t => t.productType === productType);
}

/**
 * Get description blocks by product type and block type
 */
export function getDescriptionBlocks(
  productType: ProductType,
  blockType?: DescriptionBlock['blockType']
): DescriptionBlock[] {
  const blocks = DESCRIPTION_BLOCKS.filter(b => b.productType === productType);
  if (blockType) {
    return blocks.filter(b => b.blockType === blockType);
  }
  return blocks;
}

/**
 * Get tag pool for a product type
 */
export function getTagPool(productType: ProductType): TagPool | undefined {
  return TAG_POOLS.find(t => t.productType === productType);
}

/**
 * Get a random title template for a product type
 */
export function getRandomTitleTemplate(productType: ProductType): TitleTemplate | undefined {
  const templates = getTitleTemplatesByProduct(productType);
  if (templates.length === 0) return undefined;
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Get a random description block by type
 */
export function getRandomDescriptionBlock(
  productType: ProductType,
  blockType: DescriptionBlock['blockType']
): DescriptionBlock | undefined {
  const blocks = getDescriptionBlocks(productType, blockType);
  if (blocks.length === 0) return undefined;
  return blocks[Math.floor(Math.random() * blocks.length)];
}

/**
 * Fill title template placeholders
 */
export function fillTitleTemplate(
  template: TitleTemplate,
  values: Record<string, string>
): string {
  let result = template.template;
  for (const placeholder of template.placeholders) {
    const value = values[placeholder] || `[${placeholder}]`;
    result = result.replace(`{${placeholder}}`, value);
  }
  return result;
}

/**
 * Build a complete description from blocks
 */
export function buildDescription(
  productType: ProductType,
  customHook?: string
): string {
  const sections: string[] = [];

  // Hook (custom or random)
  if (customHook) {
    sections.push(customHook);
  } else {
    const hook = getRandomDescriptionBlock(productType, 'hook');
    if (hook) sections.push(hook.content);
  }

  // How it works
  const howItWorks = getRandomDescriptionBlock(productType, 'how_it_works');
  if (howItWorks) sections.push(howItWorks.content);

  // What you receive
  const whatYouReceive = getRandomDescriptionBlock(productType, 'what_you_receive');
  if (whatYouReceive) sections.push(whatYouReceive.content);

  // Who this is for
  const whoFor = getRandomDescriptionBlock(productType, 'who_for');
  if (whoFor) sections.push(whoFor.content);

  // Reassurance
  const reassurance = getRandomDescriptionBlock(productType, 'reassurance');
  if (reassurance) sections.push(reassurance.content);

  return sections.join('\n\n');
}

/**
 * Select tags for a listing (max 13 for Etsy)
 */
export function selectTags(
  productType: ProductType,
  themeTags: string[],
  includeSeasonal: boolean = false,
  maxTags: number = 13
): string[] {
  const pool = getTagPool(productType);
  if (!pool) return themeTags.slice(0, maxTags);

  const selected: string[] = [];

  // Add theme-specific tags first (highest priority)
  for (const tag of themeTags) {
    if (selected.length < maxTags && tag.length <= 20) {
      selected.push(tag);
    }
  }

  // Add core product tags
  for (const tag of pool.coreProductTags) {
    if (selected.length < maxTags && !selected.includes(tag) && tag.length <= 20) {
      selected.push(tag);
    }
  }

  // Add emotional tags
  for (const tag of pool.emotionalTags) {
    if (selected.length < maxTags && !selected.includes(tag) && tag.length <= 20) {
      selected.push(tag);
    }
  }

  // Add seasonal tags if requested
  if (includeSeasonal && pool.seasonalTags) {
    for (const tag of pool.seasonalTags) {
      if (selected.length < maxTags && !selected.includes(tag) && tag.length <= 20) {
        selected.push(tag);
      }
    }
  }

  return selected.slice(0, maxTags);
}
