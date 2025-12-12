/**
 * Marketing Hooks Library
 * 60-80 unique hooks for short-form video marketing
 * Organized by product and emotion/angle
 */

export interface MarketingHook {
  id: string;
  product: 'santa' | 'vision_board' | 'flash_cards' | 'clarity_planner' | 'general';
  category: 'emotional' | 'urgency' | 'curiosity' | 'transformation' | 'social_proof' | 'problem_solution';
  hook: string;
  cta: string;
  duration: '15s' | '30s' | '60s';
  tone: 'warm' | 'excited' | 'calm' | 'urgent' | 'playful';
}

export const MARKETING_HOOKS: MarketingHook[] = [
  // === SANTA MESSAGES (20 hooks) ===
  // Emotional
  {
    id: 'santa_emotional_01',
    product: 'santa',
    category: 'emotional',
    hook: "Watch my daughter's face when Santa knew her dog's name, her favorite color, and her secret wish for Christmas.",
    cta: "Create your child's magical moment. Link in bio.",
    duration: '30s',
    tone: 'warm'
  },
  {
    id: 'santa_emotional_02',
    product: 'santa',
    category: 'emotional',
    hook: "My son still talks about the video where Santa mentioned his little league team. That was two years ago.",
    cta: "Some gifts become lifelong memories. PersonalizedOutput.com",
    duration: '30s',
    tone: 'warm'
  },
  {
    id: 'santa_emotional_03',
    product: 'santa',
    category: 'emotional',
    hook: "She asked how Santa knew about her grandma in heaven. I couldn't stop crying.",
    cta: "Make this Christmas unforgettable. Link in bio.",
    duration: '30s',
    tone: 'warm'
  },
  {
    id: 'santa_emotional_04',
    product: 'santa',
    category: 'emotional',
    hook: "The moment Santa said her name... her whole face lit up like the Christmas tree.",
    cta: "Pure magic. Only nineteen dollars. Link in bio.",
    duration: '15s',
    tone: 'warm'
  },
  {
    id: 'santa_emotional_05',
    product: 'santa',
    category: 'emotional',
    hook: "POV: Your kid just watched a video of Santa talking directly to them, knowing everything about their life.",
    cta: "This is what Christmas magic looks like.",
    duration: '15s',
    tone: 'warm'
  },
  // Urgency
  {
    id: 'santa_urgency_01',
    product: 'santa',
    category: 'urgency',
    hook: "Christmas is in less than two weeks. Your kid still believes in Santa. Don't miss this.",
    cta: "Get your personalized Santa video today.",
    duration: '15s',
    tone: 'urgent'
  },
  {
    id: 'santa_urgency_02',
    product: 'santa',
    category: 'urgency',
    hook: "They won't believe in Santa forever. This might be the last year. Make it count.",
    cta: "Create their magical moment now.",
    duration: '15s',
    tone: 'urgent'
  },
  {
    id: 'santa_urgency_03',
    product: 'santa',
    category: 'urgency',
    hook: "We're delivering thousands of Santa videos this week. Spots are filling fast.",
    cta: "Order now before Christmas cutoff.",
    duration: '15s',
    tone: 'urgent'
  },
  // Curiosity
  {
    id: 'santa_curiosity_01',
    product: 'santa',
    category: 'curiosity',
    hook: "What if Santa knew your child's name, their pet, their school, and their deepest Christmas wish?",
    cta: "Now he can. PersonalizedOutput.com",
    duration: '15s',
    tone: 'excited'
  },
  {
    id: 'santa_curiosity_02',
    product: 'santa',
    category: 'curiosity',
    hook: "How did I make my skeptical eight year old believe in Santa again? This video.",
    cta: "Watch what happens when Santa gets personal.",
    duration: '15s',
    tone: 'playful'
  },
  // Problem/Solution
  {
    id: 'santa_problem_01',
    product: 'santa',
    category: 'problem_solution',
    hook: "Mall Santa lines are three hours long. Your kid is tired and cranky. There's a better way.",
    cta: "Personalized Santa videos delivered to your inbox.",
    duration: '30s',
    tone: 'calm'
  },
  {
    id: 'santa_problem_02',
    product: 'santa',
    category: 'problem_solution',
    hook: "Generic Santa videos feel fake. Kids notice. That's why we make every video unique to your child.",
    cta: "Real magic. Real reactions. Link in bio.",
    duration: '30s',
    tone: 'warm'
  },
  // Social Proof
  {
    id: 'santa_social_01',
    product: 'santa',
    category: 'social_proof',
    hook: "Over one thousand families chose our Santa videos last Christmas. Here's why they keep coming back.",
    cta: "Join the magic. PersonalizedOutput.com",
    duration: '30s',
    tone: 'warm'
  },
  {
    id: 'santa_social_02',
    product: 'santa',
    category: 'social_proof',
    hook: "Five stars, hundreds of happy families, countless magical moments. This is what we do.",
    cta: "Create your family's moment.",
    duration: '15s',
    tone: 'excited'
  },
  // Transformation
  {
    id: 'santa_transform_01',
    product: 'santa',
    category: 'transformation',
    hook: "Before: A typical Christmas morning. After: The year my daughter truly believed in magic.",
    cta: "Nineteen dollars for a memory that lasts forever.",
    duration: '30s',
    tone: 'warm'
  },
  {
    id: 'santa_transform_02',
    product: 'santa',
    category: 'transformation',
    hook: "My kids were starting to doubt Santa. Then we played this video. Belief restored.",
    cta: "Sometimes magic just needs a little help.",
    duration: '30s',
    tone: 'playful'
  },
  {
    id: 'santa_transform_03',
    product: 'santa',
    category: 'transformation',
    hook: "From 'Santa isn't real' to 'HOW DID HE KNOW THAT?' in sixty seconds flat.",
    cta: "That's the power of personalization.",
    duration: '15s',
    tone: 'playful'
  },
  {
    id: 'santa_transform_04',
    product: 'santa',
    category: 'transformation',
    hook: "The difference between a good Christmas and an unforgettable one? A two minute video.",
    cta: "Make memories that matter.",
    duration: '15s',
    tone: 'warm'
  },
  {
    id: 'santa_emotional_06',
    product: 'santa',
    category: 'emotional',
    hook: "I thought I was buying a video. I was actually buying the look on my son's face.",
    cta: "Priceless reactions. Just nineteen dollars.",
    duration: '15s',
    tone: 'warm'
  },
  {
    id: 'santa_emotional_07',
    product: 'santa',
    category: 'emotional',
    hook: "Santa knows about her lost tooth. Santa knows about her dance recital. Santa knows about her goldfish named Bubbles. Her mind is blown.",
    cta: "Real personalization. Real magic.",
    duration: '30s',
    tone: 'excited'
  },

  // === VISION BOARDS (20 hooks) ===
  // Emotional
  {
    id: 'vision_emotional_01',
    product: 'vision_board',
    category: 'emotional',
    hook: "I printed my vision board and hung it next to my bed. Three months later, half of it had come true.",
    cta: "Your dreams deserve to be seen. Create yours today.",
    duration: '30s',
    tone: 'warm'
  },
  {
    id: 'vision_emotional_02',
    product: 'vision_board',
    category: 'emotional',
    hook: "My therapist told me to visualize my goals. This was the easiest way to do it.",
    cta: "Turn thoughts into visuals. Link in bio.",
    duration: '15s',
    tone: 'calm'
  },
  {
    id: 'vision_emotional_03',
    product: 'vision_board',
    category: 'emotional',
    hook: "When I look at my vision board, I don't just see pictures. I see my future self.",
    cta: "Make your dreams visible. PersonalizedOutput.com",
    duration: '15s',
    tone: 'warm'
  },
  // Urgency - New Year timing
  {
    id: 'vision_urgency_01',
    product: 'vision_board',
    category: 'urgency',
    hook: "New Year's is in two weeks. Where will you be in twelve months? Start visualizing now.",
    cta: "Create your twenty twenty five vision board.",
    duration: '15s',
    tone: 'urgent'
  },
  {
    id: 'vision_urgency_02',
    product: 'vision_board',
    category: 'urgency',
    hook: "January first is coming. Do you have clarity on your goals? A vision board helps you get there.",
    cta: "Start your year with intention.",
    duration: '15s',
    tone: 'urgent'
  },
  {
    id: 'vision_urgency_03',
    product: 'vision_board',
    category: 'urgency',
    hook: "Everyone talks about new year's resolutions. Vision boards help you actually achieve them.",
    cta: "Turn intentions into reality. Only fourteen dollars.",
    duration: '30s',
    tone: 'excited'
  },
  // Curiosity
  {
    id: 'vision_curiosity_01',
    product: 'vision_board',
    category: 'curiosity',
    hook: "What if you could see your dream life laid out in front of you? Not someday. Today.",
    cta: "Create your custom vision board.",
    duration: '15s',
    tone: 'calm'
  },
  {
    id: 'vision_curiosity_02',
    product: 'vision_board',
    category: 'curiosity',
    hook: "The secret successful people don't tell you? They ALL have a vision board.",
    cta: "Now you can too. Link in bio.",
    duration: '15s',
    tone: 'excited'
  },
  {
    id: 'vision_curiosity_03',
    product: 'vision_board',
    category: 'curiosity',
    hook: "Why do Olympic athletes visualize before they compete? Because it works. Your goals deserve the same treatment.",
    cta: "Vision boards aren't just pretty. They're powerful.",
    duration: '30s',
    tone: 'calm'
  },
  // Problem/Solution
  {
    id: 'vision_problem_01',
    product: 'vision_board',
    category: 'problem_solution',
    hook: "I wanted to make a vision board but I'm not artistic. Turns out I didn't need to be.",
    cta: "Custom designed, AI powered. Just answer questions.",
    duration: '15s',
    tone: 'playful'
  },
  {
    id: 'vision_problem_02',
    product: 'vision_board',
    category: 'problem_solution',
    hook: "Magazine cutouts and glue sticks? That's the old way. This is better.",
    cta: "Modern vision boards for modern dreamers.",
    duration: '15s',
    tone: 'playful'
  },
  {
    id: 'vision_problem_03',
    product: 'vision_board',
    category: 'problem_solution',
    hook: "I know I should have goals. I just never knew how to organize them. Until now.",
    cta: "Turn chaos into clarity.",
    duration: '15s',
    tone: 'calm'
  },
  // Transformation
  {
    id: 'vision_transform_01',
    product: 'vision_board',
    category: 'transformation',
    hook: "Last January I made a vision board. This December I'm living it. Coincidence? I don't think so.",
    cta: "Your turn. Start manifesting.",
    duration: '30s',
    tone: 'excited'
  },
  {
    id: 'vision_transform_02',
    product: 'vision_board',
    category: 'transformation',
    hook: "From dreaming to doing. From wishing to achieving. It started with seeing it clearly.",
    cta: "Make your vision visible. PersonalizedOutput.com",
    duration: '15s',
    tone: 'warm'
  },
  {
    id: 'vision_transform_03',
    product: 'vision_board',
    category: 'transformation',
    hook: "Plot twist: the person I became in twenty twenty four was on my vision board in January.",
    cta: "Who will you become in twenty twenty five?",
    duration: '15s',
    tone: 'excited'
  },
  // Social Proof
  {
    id: 'vision_social_01',
    product: 'vision_board',
    category: 'social_proof',
    hook: "Oprah does it. Steve Harvey does it. Top CEOs do it. Vision boards work.",
    cta: "Join the club. Create yours today.",
    duration: '15s',
    tone: 'excited'
  },
  {
    id: 'vision_social_02',
    product: 'vision_board',
    category: 'social_proof',
    hook: "My friends thought vision boards were cheesy until they saw mine. Now they all have one.",
    cta: "Believers start somewhere. Start here.",
    duration: '15s',
    tone: 'playful'
  },
  {
    id: 'vision_emotional_04',
    product: 'vision_board',
    category: 'emotional',
    hook: "The gift for the person who has everything? Give them a vision of what's next.",
    cta: "Perfect holiday gift. Only fourteen dollars.",
    duration: '15s',
    tone: 'warm'
  },
  {
    id: 'vision_emotional_05',
    product: 'vision_board',
    category: 'emotional',
    hook: "My daughter put 'college graduate' on her vision board. She looks at it every morning. I believe her.",
    cta: "Dreams become real when you can see them.",
    duration: '30s',
    tone: 'warm'
  },
  {
    id: 'vision_curiosity_04',
    product: 'vision_board',
    category: 'curiosity',
    hook: "What would your life look like if you achieved everything on your list?",
    cta: "Now you can see it. Vision board in minutes.",
    duration: '15s',
    tone: 'calm'
  },

  // === FLASH CARDS (15 hooks) ===
  // Emotional
  {
    id: 'flash_emotional_01',
    product: 'flash_cards',
    category: 'emotional',
    hook: "My son hated studying. Then I made flash cards with his favorite dinosaurs. Game changer.",
    cta: "Learning should be fun. Make it personal.",
    duration: '30s',
    tone: 'warm'
  },
  {
    id: 'flash_emotional_02',
    product: 'flash_cards',
    category: 'emotional',
    hook: "Watch how fast a kid learns when the flash cards have THEIR name on them.",
    cta: "Personalization meets education.",
    duration: '15s',
    tone: 'excited'
  },
  // Problem/Solution
  {
    id: 'flash_problem_01',
    product: 'flash_cards',
    category: 'problem_solution',
    hook: "Generic flash cards are boring. That's why kids don't use them. We fixed that.",
    cta: "Custom flash cards. Actual results.",
    duration: '15s',
    tone: 'calm'
  },
  {
    id: 'flash_problem_02',
    product: 'flash_cards',
    category: 'problem_solution',
    hook: "I spent hours making flash cards by hand. Never again. Now I get custom ones in minutes.",
    cta: "Your time is valuable. So is theirs.",
    duration: '15s',
    tone: 'playful'
  },
  {
    id: 'flash_problem_03',
    product: 'flash_cards',
    category: 'problem_solution',
    hook: "My kid won't sit still for boring study material. But dinosaur math problems? She's all in.",
    cta: "Meet them where they are.",
    duration: '30s',
    tone: 'warm'
  },
  // Curiosity
  {
    id: 'flash_curiosity_01',
    product: 'flash_cards',
    category: 'curiosity',
    hook: "What if homework was so fun your kid asked to do more?",
    cta: "Custom flash cards make it possible.",
    duration: '15s',
    tone: 'playful'
  },
  {
    id: 'flash_curiosity_02',
    product: 'flash_cards',
    category: 'curiosity',
    hook: "The psychology is simple: kids engage more when they see themselves in the content.",
    cta: "Personalized learning. Proven results.",
    duration: '15s',
    tone: 'calm'
  },
  // Transformation
  {
    id: 'flash_transform_01',
    product: 'flash_cards',
    category: 'transformation',
    hook: "From 'I hate studying' to 'Can we do more?' One week with personalized flash cards.",
    cta: "Transform learning. Link in bio.",
    duration: '15s',
    tone: 'excited'
  },
  {
    id: 'flash_transform_02',
    product: 'flash_cards',
    category: 'transformation',
    hook: "My daughter went from C's to A's. The only change? Flash cards made just for her.",
    cta: "Education should fit the child.",
    duration: '30s',
    tone: 'warm'
  },
  // Social Proof
  {
    id: 'flash_social_01',
    product: 'flash_cards',
    category: 'social_proof',
    hook: "Teachers are recommending us. Parents are obsessing. Kids are actually learning.",
    cta: "See what everyone's talking about.",
    duration: '15s',
    tone: 'excited'
  },
  {
    id: 'flash_social_02',
    product: 'flash_cards',
    category: 'social_proof',
    hook: "Five hundred families this month. Five stars average. Zero bored kids.",
    cta: "Join the learning revolution.",
    duration: '15s',
    tone: 'excited'
  },
  // Urgency
  {
    id: 'flash_urgency_01',
    product: 'flash_cards',
    category: 'urgency',
    hook: "Winter break is the perfect time to catch up. Make it fun with custom flash cards.",
    cta: "Order now. Learn over the holidays.",
    duration: '15s',
    tone: 'urgent'
  },
  {
    id: 'flash_urgency_02',
    product: 'flash_cards',
    category: 'urgency',
    hook: "New year, new study habits. Start strong with personalized learning.",
    cta: "Get ready for twenty twenty five.",
    duration: '15s',
    tone: 'urgent'
  },
  {
    id: 'flash_emotional_03',
    product: 'flash_cards',
    category: 'emotional',
    hook: "The best gift for a kid who struggles in school? Confidence. We help build it.",
    cta: "Custom flash cards that make them feel seen.",
    duration: '30s',
    tone: 'warm'
  },
  {
    id: 'flash_problem_04',
    product: 'flash_cards',
    category: 'problem_solution',
    hook: "Store-bought flash cards are one-size-fits-all. Kids aren't. Neither are our cards.",
    cta: "Tailored to your child. Only fourteen dollars.",
    duration: '15s',
    tone: 'calm'
  },

  // === CLARITY PLANNER (15 hooks) ===
  // Emotional
  {
    id: 'clarity_emotional_01',
    product: 'clarity_planner',
    category: 'emotional',
    hook: "I was overwhelmed, scattered, and stressed. Then I got a planner that actually understood me.",
    cta: "Clarity is possible. PersonalizedOutput.com",
    duration: '30s',
    tone: 'calm'
  },
  {
    id: 'clarity_emotional_02',
    product: 'clarity_planner',
    category: 'emotional',
    hook: "For the first time in years, I can see my week clearly. The mental fog is lifting.",
    cta: "Personalized planning. Actual peace of mind.",
    duration: '15s',
    tone: 'calm'
  },
  // Problem/Solution
  {
    id: 'clarity_problem_01',
    product: 'clarity_planner',
    category: 'problem_solution',
    hook: "Generic planners don't work because they're not built for YOUR life. This one is.",
    cta: "Finally, a planner that gets it.",
    duration: '15s',
    tone: 'calm'
  },
  {
    id: 'clarity_problem_02',
    product: 'clarity_planner',
    category: 'problem_solution',
    hook: "I've bought a dozen planners. Used them for two weeks. This is the first one that stuck.",
    cta: "Designed for how YOU think.",
    duration: '15s',
    tone: 'playful'
  },
  {
    id: 'clarity_problem_03',
    product: 'clarity_planner',
    category: 'problem_solution',
    hook: "My brain works differently. Standard planners were useless. Custom ones changed everything.",
    cta: "Neurodivergent friendly. Built for you.",
    duration: '30s',
    tone: 'warm'
  },
  // Transformation
  {
    id: 'clarity_transform_01',
    product: 'clarity_planner',
    category: 'transformation',
    hook: "From chaos to calm in one week. All it took was the right system.",
    cta: "Your system exists. Let us build it.",
    duration: '15s',
    tone: 'calm'
  },
  {
    id: 'clarity_transform_02',
    product: 'clarity_planner',
    category: 'transformation',
    hook: "I used to dread Mondays. Now I wake up knowing exactly what needs to happen.",
    cta: "Clarity changes everything.",
    duration: '15s',
    tone: 'calm'
  },
  {
    id: 'clarity_transform_03',
    product: 'clarity_planner',
    category: 'transformation',
    hook: "Before: endless to-do lists going nowhere. After: intentional days that matter.",
    cta: "Transform your time. Link in bio.",
    duration: '15s',
    tone: 'warm'
  },
  // Curiosity
  {
    id: 'clarity_curiosity_01',
    product: 'clarity_planner',
    category: 'curiosity',
    hook: "What if your planner asked the right questions before you started filling it in?",
    cta: "Smart planning starts with understanding you.",
    duration: '15s',
    tone: 'calm'
  },
  {
    id: 'clarity_curiosity_02',
    product: 'clarity_planner',
    category: 'curiosity',
    hook: "The difference between a to-do list and a life plan? Intention. We help you find it.",
    cta: "Clarity planner. Only twenty four dollars.",
    duration: '15s',
    tone: 'calm'
  },
  // Urgency - New Year
  {
    id: 'clarity_urgency_01',
    product: 'clarity_planner',
    category: 'urgency',
    hook: "New year, new systems. Start twenty twenty five with clarity, not chaos.",
    cta: "Get your personalized planner now.",
    duration: '15s',
    tone: 'urgent'
  },
  {
    id: 'clarity_urgency_02',
    product: 'clarity_planner',
    category: 'urgency',
    hook: "Don't let January slip away in overwhelm. Plan it now. Live it intentionally.",
    cta: "Custom clarity planners ready to ship.",
    duration: '15s',
    tone: 'urgent'
  },
  // Social Proof
  {
    id: 'clarity_social_01',
    product: 'clarity_planner',
    category: 'social_proof',
    hook: "Busy professionals. Overwhelmed parents. Students with ADHD. They all found their system here.",
    cta: "Yours is waiting. PersonalizedOutput.com",
    duration: '30s',
    tone: 'warm'
  },
  {
    id: 'clarity_social_02',
    product: 'clarity_planner',
    category: 'social_proof',
    hook: "Four point nine stars. Hundreds of calmer people. One custom planner.",
    cta: "Join them. Transform your days.",
    duration: '15s',
    tone: 'excited'
  },
  {
    id: 'clarity_emotional_03',
    product: 'clarity_planner',
    category: 'emotional',
    hook: "The gift for someone drowning in overwhelm? A life raft. A system. Clarity.",
    cta: "Give the gift of peace of mind.",
    duration: '15s',
    tone: 'warm'
  },

  // === GENERAL / BRAND (10 hooks) ===
  {
    id: 'general_brand_01',
    product: 'general',
    category: 'emotional',
    hook: "We don't sell products. We sell moments. Memories. Breakthroughs.",
    cta: "Personalized Output. Made for you.",
    duration: '15s',
    tone: 'warm'
  },
  {
    id: 'general_brand_02',
    product: 'general',
    category: 'curiosity',
    hook: "AI meets heart. Technology meets personalization. The result? Magic.",
    cta: "Discover what we can create for you.",
    duration: '15s',
    tone: 'excited'
  },
  {
    id: 'general_brand_03',
    product: 'general',
    category: 'problem_solution',
    hook: "Generic doesn't cut it anymore. Everything else is personalized. Why not this?",
    cta: "Welcome to Personalized Output.",
    duration: '15s',
    tone: 'playful'
  },
  {
    id: 'general_brand_04',
    product: 'general',
    category: 'transformation',
    hook: "One website. Four ways to make life better. All personalized to you.",
    cta: "Santa videos. Vision boards. Flash cards. Planners.",
    duration: '15s',
    tone: 'excited'
  },
  {
    id: 'general_urgency_01',
    product: 'general',
    category: 'urgency',
    hook: "Holiday season is here. Santa videos for the kids. Vision boards for the adults. Flash cards for students. We've got everyone covered.",
    cta: "Shop now at PersonalizedOutput.com",
    duration: '30s',
    tone: 'excited'
  },
  {
    id: 'general_social_01',
    product: 'general',
    category: 'social_proof',
    hook: "Thousands of happy customers. Millions of moments of joy. One simple website.",
    cta: "See what we can do for you.",
    duration: '15s',
    tone: 'warm'
  },
  {
    id: 'general_emotional_02',
    product: 'general',
    category: 'emotional',
    hook: "In a world of mass production, we choose personalization. Every. Single. Time.",
    cta: "Personalized Output. Because you deserve better.",
    duration: '15s',
    tone: 'warm'
  },
  {
    id: 'general_transform_01',
    product: 'general',
    category: 'transformation',
    hook: "From 'just another product' to 'this was made for me'. That's our promise.",
    cta: "Experience the difference.",
    duration: '15s',
    tone: 'calm'
  },
  {
    id: 'general_curiosity_02',
    product: 'general',
    category: 'curiosity',
    hook: "What could you accomplish if everything was built around YOUR needs?",
    cta: "Find out. PersonalizedOutput.com",
    duration: '15s',
    tone: 'calm'
  },
  {
    id: 'general_holiday_01',
    product: 'general',
    category: 'urgency',
    hook: "Still searching for the perfect gift? Stop searching. Start personalizing.",
    cta: "Unique gifts for everyone on your list.",
    duration: '15s',
    tone: 'playful'
  }
];

// Helper functions
export function getHooksByProduct(product: MarketingHook['product']): MarketingHook[] {
  return MARKETING_HOOKS.filter(h => h.product === product);
}

export function getHooksByCategory(category: MarketingHook['category']): MarketingHook[] {
  return MARKETING_HOOKS.filter(h => h.category === category);
}

export function getHooksByDuration(duration: MarketingHook['duration']): MarketingHook[] {
  return MARKETING_HOOKS.filter(h => h.duration === duration);
}

export function getHooksByTone(tone: MarketingHook['tone']): MarketingHook[] {
  return MARKETING_HOOKS.filter(h => h.tone === tone);
}

export function getRandomHook(product?: MarketingHook['product']): MarketingHook {
  const filtered = product ? getHooksByProduct(product) : MARKETING_HOOKS;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

console.log(`Loaded ${MARKETING_HOOKS.length} marketing hooks`);
