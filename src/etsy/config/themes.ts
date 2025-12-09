/**
 * Etsy Automation - Theme Configurations
 *
 * Complete theme definitions for all product types.
 * Each theme includes keywords, emotional angles, and pricing.
 */

import { ThemeConfig, StyleVariant, ProductType } from './types';

// ============================================================
// STYLE VARIANTS (apply to vision boards)
// ============================================================

export const STYLE_VARIANTS: StyleVariant[] = [
  {
    id: 'style_minimalist_clean',
    displayName: 'Minimalist & Clean',
    description: 'Clean lines, white space, simple typography, focused imagery',
    colorPalette: ['#FFFFFF', '#F5F5F5', '#333333', '#666666']
  },
  {
    id: 'style_soft_feminine_pastel',
    displayName: 'Soft Feminine Pastel',
    description: 'Soft pinks, lavenders, creams, delicate florals, gentle curves',
    colorPalette: ['#F8E8EE', '#E8D5DE', '#D4B5C4', '#B89AAE']
  },
  {
    id: 'style_bold_vibrant',
    displayName: 'Bold & Vibrant',
    description: 'Rich colors, high contrast, energetic imagery, strong typography',
    colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24']
  },
  {
    id: 'style_neutral_earthy',
    displayName: 'Neutral & Earthy',
    description: 'Warm browns, tans, terracotta, natural textures, organic shapes',
    colorPalette: ['#D4A574', '#C4956A', '#A67C5B', '#8B6914']
  },
  {
    id: 'style_dark_academia',
    displayName: 'Dark Academia',
    description: 'Deep greens, burgundy, navy, vintage feel, scholarly aesthetic',
    colorPalette: ['#2C3E50', '#8B4513', '#556B2F', '#4A4A4A']
  }
];

// ============================================================
// VISION BOARD THEMES
// ============================================================

export const VISION_BOARD_THEMES: ThemeConfig[] = [
  // === Life Transitions ===
  {
    id: 'post_breakup_healing',
    productType: 'vision_board',
    displayName: 'Post-Breakup Healing Vision Board',
    shortLabel: 'Post-breakup healing',
    category: 'life_transitions',
    audience: 'women_25_45',
    aesthetic: 'soft_feminine_pastel',
    primaryKeywords: ['breakup healing', 'moving on', 'fresh start', 'self love after breakup'],
    secondaryKeywords: ['new chapter', 'healing journey', 'self worth', 'letting go'],
    emotionalAngles: ['healing', 'fresh start', 'self-worth', 'new beginning', 'closure'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'divorce_recovery_new_chapter',
    productType: 'vision_board',
    displayName: 'Divorce Recovery Vision Board',
    shortLabel: 'Divorce recovery',
    category: 'life_transitions',
    audience: 'women_35_55',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['divorce recovery', 'new chapter', 'starting over', 'rebuilding life'],
    secondaryKeywords: ['fresh start', 'self discovery', 'independence', 'new identity'],
    emotionalAngles: ['rebuilding', 'strength', 'independence', 'hope', 'transformation'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'new_job_career_change',
    productType: 'vision_board',
    displayName: 'New Job & Career Change Vision Board',
    shortLabel: 'Career change',
    category: 'life_transitions',
    audience: 'professionals_25_45',
    aesthetic: 'minimalist_clean',
    primaryKeywords: ['career change', 'new job', 'career goals', 'professional growth'],
    secondaryKeywords: ['job transition', 'work goals', 'career vision', 'professional development'],
    emotionalAngles: ['ambition', 'growth', 'confidence', 'opportunity', 'success'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'promotion_career_level_up',
    productType: 'vision_board',
    displayName: 'Promotion & Career Level-Up Vision Board',
    shortLabel: 'Career level-up',
    category: 'life_transitions',
    audience: 'professionals_30_50',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['promotion goals', 'career advancement', 'leadership goals', 'level up career'],
    secondaryKeywords: ['professional growth', 'career success', 'ambition board', 'work goals'],
    emotionalAngles: ['ambition', 'achievement', 'leadership', 'recognition', 'growth'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'entrepreneurship_small_business',
    productType: 'vision_board',
    displayName: 'Entrepreneurship & Small Business Vision Board',
    shortLabel: 'Entrepreneurship',
    category: 'life_transitions',
    audience: 'entrepreneurs',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['small business goals', 'entrepreneur vision', 'business owner goals', 'startup dreams'],
    secondaryKeywords: ['business growth', 'entrepreneur mindset', 'hustle goals', 'boss life'],
    emotionalAngles: ['ambition', 'freedom', 'creativity', 'impact', 'independence'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'graduation_new_grad',
    productType: 'vision_board',
    displayName: 'Graduation & New Grad Vision Board',
    shortLabel: 'New graduate',
    category: 'life_transitions',
    audience: 'new_graduates',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['graduation gift', 'new grad goals', 'post college life', 'graduate vision board'],
    secondaryKeywords: ['first job', 'adult life goals', 'graduation present', 'class of 2025'],
    emotionalAngles: ['excitement', 'possibility', 'ambition', 'new chapter', 'growth'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'college_goals_student_success',
    productType: 'vision_board',
    displayName: 'College Goals & Student Success Vision Board',
    shortLabel: 'College student',
    category: 'life_transitions',
    audience: 'college_students',
    aesthetic: 'minimalist_clean',
    primaryKeywords: ['college goals', 'student success', 'university goals', 'college vision board'],
    secondaryKeywords: ['academic goals', 'study motivation', 'college life', 'student planner'],
    emotionalAngles: ['focus', 'motivation', 'achievement', 'growth', 'balance'],
    priceRange: { min: 12.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'new_parent_motherhood',
    productType: 'vision_board',
    displayName: 'New Mom & Motherhood Vision Board',
    shortLabel: 'New motherhood',
    category: 'life_transitions',
    audience: 'new_mothers',
    aesthetic: 'soft_feminine_pastel',
    primaryKeywords: ['new mom gift', 'motherhood goals', 'mom life vision', 'new baby goals'],
    secondaryKeywords: ['mom self care', 'parenting goals', 'mother goals', 'baby shower gift'],
    emotionalAngles: ['love', 'nurturing', 'balance', 'identity', 'grace'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'new_parent_fatherhood',
    productType: 'vision_board',
    displayName: 'New Dad & Fatherhood Vision Board',
    shortLabel: 'New fatherhood',
    category: 'life_transitions',
    audience: 'new_fathers',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['new dad gift', 'fatherhood goals', 'dad life vision', 'new father'],
    secondaryKeywords: ['dad goals', 'parenting vision', 'father goals', 'family man'],
    emotionalAngles: ['responsibility', 'love', 'growth', 'presence', 'legacy'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'empty_nester_next_chapter',
    productType: 'vision_board',
    displayName: 'Empty Nester Vision Board',
    shortLabel: 'Empty nester',
    category: 'life_transitions',
    audience: 'empty_nesters_45_65',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['empty nester', 'next chapter', 'kids leaving home', 'midlife goals'],
    secondaryKeywords: ['rediscovering self', 'new season', 'couple goals', 'life after kids'],
    emotionalAngles: ['freedom', 'rediscovery', 'purpose', 'adventure', 'reflection'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'retirement_fresh_start',
    productType: 'vision_board',
    displayName: 'Retirement & Fresh Start Vision Board',
    shortLabel: 'Retirement',
    category: 'life_transitions',
    audience: 'retirees',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['retirement goals', 'retirement vision', 'retirement gift', 'life after work'],
    secondaryKeywords: ['golden years', 'retirement dreams', 'next chapter', 'retirement plans'],
    emotionalAngles: ['freedom', 'adventure', 'purpose', 'legacy', 'fulfillment'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'moving_new_city_fresh_start',
    productType: 'vision_board',
    displayName: 'Moving to New City Vision Board',
    shortLabel: 'New city',
    category: 'life_transitions',
    audience: 'relocating_adults',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['moving goals', 'new city', 'relocation', 'fresh start'],
    secondaryKeywords: ['new home', 'starting over', 'adventure', 'new beginning'],
    emotionalAngles: ['adventure', 'excitement', 'possibility', 'courage', 'growth'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'new_home_intention_board',
    productType: 'vision_board',
    displayName: 'New Home Intention Board',
    shortLabel: 'New home',
    category: 'life_transitions',
    audience: 'new_homeowners',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['new home goals', 'homeowner vision', 'house goals', 'home intention board'],
    secondaryKeywords: ['first home', 'home sweet home', 'nesting goals', 'homemaking'],
    emotionalAngles: ['nesting', 'roots', 'comfort', 'creation', 'belonging'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },

  // === Personal Growth ===
  {
    id: 'self_love_healing',
    productType: 'vision_board',
    displayName: 'Self-Love & Healing Vision Board',
    shortLabel: 'Self-love healing',
    category: 'personal_growth',
    audience: 'women_25_45',
    aesthetic: 'soft_feminine_pastel',
    primaryKeywords: ['self love', 'healing journey', 'self worth', 'inner healing'],
    secondaryKeywords: ['self acceptance', 'self care', 'emotional healing', 'love yourself'],
    emotionalAngles: ['self-worth', 'healing', 'acceptance', 'growth', 'compassion'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'self_care_restore',
    productType: 'vision_board',
    displayName: 'Self-Care & Restoration Vision Board',
    shortLabel: 'Self-care restore',
    category: 'personal_growth',
    audience: 'women_25_55',
    aesthetic: 'soft_feminine_pastel',
    primaryKeywords: ['self care', 'restore balance', 'wellness goals', 'me time'],
    secondaryKeywords: ['burnout recovery', 'rest goals', 'peace', 'balance'],
    emotionalAngles: ['rest', 'peace', 'balance', 'nurturing', 'restoration'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'self_discovery',
    productType: 'vision_board',
    displayName: 'Self-Discovery Vision Board',
    shortLabel: 'Self-discovery',
    category: 'personal_growth',
    audience: 'adults_25_45',
    aesthetic: 'minimalist_clean',
    primaryKeywords: ['self discovery', 'know yourself', 'identity journey', 'finding yourself'],
    secondaryKeywords: ['personal journey', 'who am I', 'self exploration', 'authenticity'],
    emotionalAngles: ['curiosity', 'authenticity', 'exploration', 'truth', 'identity'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'personal_development_growth',
    productType: 'vision_board',
    displayName: 'Personal Development Vision Board',
    shortLabel: 'Personal development',
    category: 'personal_growth',
    audience: 'growth_minded_adults',
    aesthetic: 'minimalist_clean',
    primaryKeywords: ['personal development', 'growth mindset', 'self improvement', 'better version'],
    secondaryKeywords: ['personal growth', 'level up', 'becoming', 'transformation'],
    emotionalAngles: ['growth', 'potential', 'discipline', 'intentionality', 'progress'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'confidence_empowerment',
    productType: 'vision_board',
    displayName: 'Confidence & Empowerment Vision Board',
    shortLabel: 'Confidence building',
    category: 'personal_growth',
    audience: 'women_25_45',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['confidence', 'empowerment', 'self confidence', 'empowered woman'],
    secondaryKeywords: ['bold goals', 'fearless', 'strong woman', 'believe in yourself'],
    emotionalAngles: ['confidence', 'power', 'boldness', 'self-belief', 'strength'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'courage_over_fear',
    productType: 'vision_board',
    displayName: 'Courage Over Fear Vision Board',
    shortLabel: 'Courage over fear',
    category: 'personal_growth',
    audience: 'adults_facing_fear',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['courage', 'overcoming fear', 'brave goals', 'fear to freedom'],
    secondaryKeywords: ['bold steps', 'facing fears', 'bravery', 'leap of faith'],
    emotionalAngles: ['courage', 'bravery', 'freedom', 'breakthrough', 'strength'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'mindfulness_peace_calm',
    productType: 'vision_board',
    displayName: 'Mindfulness & Peace Vision Board',
    shortLabel: 'Mindfulness peace',
    category: 'personal_growth',
    audience: 'stressed_adults',
    aesthetic: 'minimalist_clean',
    primaryKeywords: ['mindfulness', 'peace', 'calm goals', 'inner peace'],
    secondaryKeywords: ['meditation goals', 'present moment', 'serenity', 'peaceful life'],
    emotionalAngles: ['peace', 'calm', 'presence', 'stillness', 'clarity'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'stress_relief_balance',
    productType: 'vision_board',
    displayName: 'Stress Relief & Balance Vision Board',
    shortLabel: 'Stress relief',
    category: 'personal_growth',
    audience: 'busy_professionals',
    aesthetic: 'soft_feminine_pastel',
    primaryKeywords: ['stress relief', 'work life balance', 'reduce stress', 'balanced life'],
    secondaryKeywords: ['burnout recovery', 'overwhelm', 'boundaries', 'peace'],
    emotionalAngles: ['balance', 'relief', 'boundaries', 'peace', 'simplicity'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'mental_health_support',
    productType: 'vision_board',
    displayName: 'Mental Health Support Vision Board',
    shortLabel: 'Mental health',
    category: 'personal_growth',
    audience: 'mental_health_journey',
    aesthetic: 'soft_feminine_pastel',
    primaryKeywords: ['mental health', 'anxiety relief', 'depression recovery', 'mental wellness'],
    secondaryKeywords: ['emotional health', 'healing journey', 'therapy goals', 'mental strength'],
    emotionalAngles: ['hope', 'healing', 'support', 'gentleness', 'progress'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'healing_journey_recovery',
    productType: 'vision_board',
    displayName: 'Healing Journey Vision Board',
    shortLabel: 'Healing journey',
    category: 'personal_growth',
    audience: 'healing_adults',
    aesthetic: 'soft_feminine_pastel',
    primaryKeywords: ['healing journey', 'recovery', 'emotional healing', 'trauma recovery'],
    secondaryKeywords: ['inner healing', 'wholeness', 'restoration', 'moving forward'],
    emotionalAngles: ['healing', 'wholeness', 'hope', 'restoration', 'growth'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'faith_purpose_calling',
    productType: 'vision_board',
    displayName: 'Faith & Purpose Vision Board',
    shortLabel: 'Faith and purpose',
    category: 'personal_growth',
    audience: 'faith_based_adults',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['faith goals', 'purpose', 'calling', 'christian vision board'],
    secondaryKeywords: ['spiritual goals', 'god purpose', 'faith journey', 'divine calling'],
    emotionalAngles: ['faith', 'purpose', 'trust', 'calling', 'surrender'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'spiritual_growth',
    productType: 'vision_board',
    displayName: 'Spiritual Growth Vision Board',
    shortLabel: 'Spiritual growth',
    category: 'personal_growth',
    audience: 'spiritually_minded',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['spiritual growth', 'soul goals', 'spiritual journey', 'inner growth'],
    secondaryKeywords: ['enlightenment', 'awakening', 'consciousness', 'soul purpose'],
    emotionalAngles: ['depth', 'connection', 'growth', 'awareness', 'transcendence'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },

  // === Goals & Dreams ===
  {
    id: 'new_year_2025_vision',
    productType: 'vision_board',
    displayName: '2025 New Year Vision Board',
    shortLabel: '2025 New Year',
    category: 'goals_dreams',
    audience: 'goal_setters',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['2025 vision board', 'new year goals', '2025 goals', 'new year new me'],
    secondaryKeywords: ['yearly goals', 'new year resolution', 'fresh start 2025', 'year ahead'],
    emotionalAngles: ['fresh start', 'hope', 'intention', 'excitement', 'clarity'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'one_month_reset',
    productType: 'vision_board',
    displayName: 'One Month Reset Vision Board',
    shortLabel: 'Monthly reset',
    category: 'goals_dreams',
    audience: 'action_takers',
    aesthetic: 'minimalist_clean',
    primaryKeywords: ['monthly goals', 'one month reset', '30 day goals', 'monthly vision'],
    secondaryKeywords: ['quick goals', 'monthly intention', 'short term goals', 'reset goals'],
    emotionalAngles: ['focus', 'momentum', 'action', 'clarity', 'intention'],
    priceRange: { min: 12.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'ninety_day_momentum',
    productType: 'vision_board',
    displayName: '90-Day Momentum Vision Board',
    shortLabel: '90-day goals',
    category: 'goals_dreams',
    audience: 'achievers',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['90 day goals', 'quarterly goals', 'three month goals', '90 day challenge'],
    secondaryKeywords: ['momentum goals', 'quarter goals', 'sprint goals', 'focused goals'],
    emotionalAngles: ['momentum', 'focus', 'achievement', 'progress', 'determination'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'five_year_future_self',
    productType: 'vision_board',
    displayName: '5-Year Future Self Vision Board',
    shortLabel: 'Five-year vision',
    category: 'goals_dreams',
    audience: 'planners',
    aesthetic: 'minimalist_clean',
    primaryKeywords: ['5 year goals', 'future self', 'long term vision', 'five year plan'],
    secondaryKeywords: ['future goals', 'dream life', 'vision casting', 'life goals'],
    emotionalAngles: ['vision', 'possibility', 'intentionality', 'dreaming', 'planning'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'travel_goals_dream_trips',
    productType: 'vision_board',
    displayName: 'Travel Goals & Dream Trips Vision Board',
    shortLabel: 'Travel dreams',
    category: 'goals_dreams',
    audience: 'travelers',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['travel goals', 'dream trips', 'bucket list travel', 'wanderlust board'],
    secondaryKeywords: ['adventure goals', 'travel bucket list', 'trip planning', 'explore goals'],
    emotionalAngles: ['adventure', 'wanderlust', 'freedom', 'exploration', 'excitement'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'adventure_wanderlust',
    productType: 'vision_board',
    displayName: 'Adventure & Wanderlust Vision Board',
    shortLabel: 'Adventure wanderlust',
    category: 'goals_dreams',
    audience: 'adventure_seekers',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['adventure goals', 'wanderlust', 'bucket list', 'adventure awaits'],
    secondaryKeywords: ['explore more', 'outdoor goals', 'thrill seeker', 'life adventure'],
    emotionalAngles: ['adventure', 'freedom', 'thrill', 'exploration', 'courage'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'fitness_health_journey',
    productType: 'vision_board',
    displayName: 'Fitness & Health Journey Vision Board',
    shortLabel: 'Fitness health',
    category: 'goals_dreams',
    audience: 'fitness_motivated',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['fitness goals', 'health journey', 'workout motivation', 'fitness vision'],
    secondaryKeywords: ['gym goals', 'healthy lifestyle', 'body goals', 'wellness journey'],
    emotionalAngles: ['strength', 'discipline', 'health', 'energy', 'transformation'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'weight_loss_wellness',
    productType: 'vision_board',
    displayName: 'Weight Loss & Wellness Vision Board',
    shortLabel: 'Weight loss wellness',
    category: 'goals_dreams',
    audience: 'weight_loss_journey',
    aesthetic: 'soft_feminine_pastel',
    primaryKeywords: ['weight loss goals', 'wellness journey', 'healthy weight', 'body transformation'],
    secondaryKeywords: ['healthy eating', 'fitness motivation', 'weight loss motivation', 'body goals'],
    emotionalAngles: ['transformation', 'health', 'self-love', 'discipline', 'confidence'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'financial_goals_abundance',
    productType: 'vision_board',
    displayName: 'Financial Goals & Abundance Vision Board',
    shortLabel: 'Financial abundance',
    category: 'goals_dreams',
    audience: 'money_minded',
    aesthetic: 'minimalist_clean',
    primaryKeywords: ['financial goals', 'abundance', 'money goals', 'wealth vision'],
    secondaryKeywords: ['prosperity', 'financial freedom', 'money mindset', 'savings goals'],
    emotionalAngles: ['abundance', 'security', 'freedom', 'prosperity', 'growth'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'debt_free_journey',
    productType: 'vision_board',
    displayName: 'Debt-Free Journey Vision Board',
    shortLabel: 'Debt-free journey',
    category: 'goals_dreams',
    audience: 'debt_freedom_seekers',
    aesthetic: 'minimalist_clean',
    primaryKeywords: ['debt free', 'pay off debt', 'financial freedom', 'debt free journey'],
    secondaryKeywords: ['money goals', 'debt payoff', 'budget goals', 'financial peace'],
    emotionalAngles: ['freedom', 'relief', 'progress', 'discipline', 'hope'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'home_ownership_dream',
    productType: 'vision_board',
    displayName: 'Home Ownership Dream Vision Board',
    shortLabel: 'Home ownership',
    category: 'goals_dreams',
    audience: 'future_homeowners',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['home ownership', 'first home', 'house goals', 'dream home'],
    secondaryKeywords: ['buying house', 'home buyer', 'real estate goals', 'home purchase'],
    emotionalAngles: ['stability', 'achievement', 'roots', 'pride', 'security'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },

  // === Celebrations ===
  {
    id: 'birthday_year_vision',
    productType: 'vision_board',
    displayName: 'Birthday Year Vision Board',
    shortLabel: 'Birthday year',
    category: 'celebrations',
    audience: 'birthday_celebrants',
    aesthetic: 'soft_feminine_pastel',
    primaryKeywords: ['birthday gift', 'birthday year goals', 'birthday vision board', 'new age goals'],
    secondaryKeywords: ['birthday present', 'year ahead', 'birthday intentions', 'celebrate'],
    emotionalAngles: ['celebration', 'intention', 'gratitude', 'hope', 'growth'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'milestone_30th_birthday',
    productType: 'vision_board',
    displayName: '30th Birthday Vision Board',
    shortLabel: '30th birthday',
    category: 'celebrations',
    audience: 'turning_30',
    aesthetic: 'bold_vibrant',
    primaryKeywords: ['30th birthday', 'turning 30', 'dirty thirty', '30th gift'],
    secondaryKeywords: ['thirtieth birthday', 'new decade', '30 goals', 'thirty and thriving'],
    emotionalAngles: ['excitement', 'confidence', 'new chapter', 'celebration', 'growth'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'milestone_40th_birthday',
    productType: 'vision_board',
    displayName: '40th Birthday Vision Board',
    shortLabel: '40th birthday',
    category: 'celebrations',
    audience: 'turning_40',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['40th birthday', 'turning 40', 'fabulous forty', '40th gift'],
    secondaryKeywords: ['fortieth birthday', 'midlife goals', '40 goals', 'forty and fabulous'],
    emotionalAngles: ['wisdom', 'confidence', 'clarity', 'celebration', 'purpose'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'milestone_50th_birthday',
    productType: 'vision_board',
    displayName: '50th Birthday Vision Board',
    shortLabel: '50th birthday',
    category: 'celebrations',
    audience: 'turning_50',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['50th birthday', 'turning 50', 'fifty and fabulous', '50th gift'],
    secondaryKeywords: ['fiftieth birthday', 'golden birthday', '50 goals', 'half century'],
    emotionalAngles: ['celebration', 'wisdom', 'gratitude', 'freedom', 'legacy'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'anniversary_marriage_vision',
    productType: 'vision_board',
    displayName: 'Anniversary & Marriage Vision Board',
    shortLabel: 'Marriage anniversary',
    category: 'celebrations',
    audience: 'married_couples',
    aesthetic: 'soft_feminine_pastel',
    primaryKeywords: ['anniversary gift', 'marriage goals', 'couple vision board', 'relationship goals'],
    secondaryKeywords: ['wedding anniversary', 'marriage vision', 'couple goals', 'love goals'],
    emotionalAngles: ['love', 'commitment', 'growth', 'partnership', 'gratitude'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'family_goals_board',
    productType: 'vision_board',
    displayName: 'Family Goals Vision Board',
    shortLabel: 'Family goals',
    category: 'celebrations',
    audience: 'families',
    aesthetic: 'neutral_earthy',
    primaryKeywords: ['family goals', 'family vision board', 'family values', 'family dreams'],
    secondaryKeywords: ['parenting goals', 'home goals', 'family life', 'family intentions'],
    emotionalAngles: ['togetherness', 'love', 'growth', 'memories', 'values'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  }
];

// ============================================================
// SANTA MESSAGE THEMES
// ============================================================

export const SANTA_MESSAGE_THEMES: ThemeConfig[] = [
  // === By Age ===
  {
    id: 'santa_toddler_2_4',
    productType: 'santa_message',
    displayName: 'Santa Message for Toddlers (2-4)',
    shortLabel: 'Toddler Santa',
    category: 'by_age',
    audience: 'toddlers_2_4',
    primaryKeywords: ['santa message toddler', 'santa for little ones', 'santa 2 year old', 'santa 3 year old'],
    secondaryKeywords: ['baby santa', 'toddler christmas', 'first santa', 'little one santa'],
    emotionalAngles: ['wonder', 'magic', 'sweetness', 'excitement', 'love'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_early_childhood_5_7',
    productType: 'santa_message',
    displayName: 'Santa Message for Kids (5-7)',
    shortLabel: 'Kids 5-7 Santa',
    category: 'by_age',
    audience: 'children_5_7',
    primaryKeywords: ['santa message kids', 'santa for child', 'santa 5 year old', 'santa 6 year old'],
    secondaryKeywords: ['personalized santa', 'santa audio kids', 'christmas message kids', 'santa call'],
    emotionalAngles: ['magic', 'wonder', 'encouragement', 'excitement', 'belief'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_kids_8_10',
    productType: 'santa_message',
    displayName: 'Santa Message for Kids (8-10)',
    shortLabel: 'Kids 8-10 Santa',
    category: 'by_age',
    audience: 'children_8_10',
    primaryKeywords: ['santa message older kids', 'santa 8 year old', 'santa 9 year old', 'santa 10 year old'],
    secondaryKeywords: ['personalized santa kids', 'santa audio child', 'christmas gift kids', 'santa call older'],
    emotionalAngles: ['encouragement', 'belief', 'acknowledgment', 'growth', 'magic'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_preteen_11_12',
    productType: 'santa_message',
    displayName: 'Santa Message for Preteens (11-12)',
    shortLabel: 'Preteen Santa',
    category: 'by_age',
    audience: 'preteens_11_12',
    primaryKeywords: ['santa preteen', 'santa 11 year old', 'santa 12 year old', 'older kid santa'],
    secondaryKeywords: ['santa message preteen', 'christmas preteen', 'tween santa', 'santa doubter'],
    emotionalAngles: ['acknowledgment', 'maturity', 'belief', 'encouragement', 'respect'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_older_child_still_believes',
    productType: 'santa_message',
    displayName: 'Santa Message for Child Who Still Believes',
    shortLabel: 'Still believes Santa',
    category: 'by_age',
    audience: 'older_believers',
    primaryKeywords: ['santa believer', 'child still believes santa', 'santa older kid believes', 'preserve santa magic'],
    secondaryKeywords: ['santa magic', 'believing in santa', 'santa for believer', 'christmas magic'],
    emotionalAngles: ['magic', 'wonder', 'belief', 'protection', 'joy'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },

  // === By Situation ===
  {
    id: 'santa_first_christmas_baby',
    productType: 'santa_message',
    displayName: 'Baby\'s First Christmas Santa Message',
    shortLabel: 'First Christmas',
    category: 'by_situation',
    audience: 'new_parents',
    primaryKeywords: ['baby first christmas', 'first christmas santa', 'santa baby', 'newborn christmas'],
    secondaryKeywords: ['baby christmas gift', 'first christmas keepsake', 'santa for baby', 'infant christmas'],
    emotionalAngles: ['precious', 'keepsake', 'love', 'wonder', 'milestone'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_first_christmas_blended_family',
    productType: 'santa_message',
    displayName: 'Blended Family First Christmas Santa Message',
    shortLabel: 'Blended family Santa',
    category: 'by_situation',
    audience: 'blended_families',
    primaryKeywords: ['blended family christmas', 'step family santa', 'new family christmas', 'stepchildren christmas'],
    secondaryKeywords: ['blended family gift', 'step kids christmas', 'new family santa', 'stepparent christmas'],
    emotionalAngles: ['belonging', 'love', 'unity', 'acceptance', 'togetherness'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_child_lost_loved_one',
    productType: 'santa_message',
    displayName: 'Santa Message for Grieving Child',
    shortLabel: 'Grieving child Santa',
    category: 'by_situation',
    audience: 'grieving_children',
    primaryKeywords: ['grieving child christmas', 'lost loved one santa', 'child grief christmas', 'christmas after loss'],
    secondaryKeywords: ['memorial christmas', 'santa grief', 'christmas loss', 'remembering loved one'],
    emotionalAngles: ['comfort', 'love', 'remembrance', 'gentleness', 'hope'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_child_moved_new_school',
    productType: 'santa_message',
    displayName: 'Santa Message for Child at New School',
    shortLabel: 'New school Santa',
    category: 'by_situation',
    audience: 'new_school_kids',
    primaryKeywords: ['new school christmas', 'moved new school santa', 'child new school', 'starting new school'],
    secondaryKeywords: ['new friends christmas', 'school transition', 'new kid santa', 'adjusting santa'],
    emotionalAngles: ['encouragement', 'bravery', 'belonging', 'adjustment', 'confidence'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_child_with_new_sibling',
    productType: 'santa_message',
    displayName: 'Santa Message for New Big Brother/Sister',
    shortLabel: 'New sibling Santa',
    category: 'by_situation',
    audience: 'new_siblings',
    primaryKeywords: ['new sibling christmas', 'big brother santa', 'big sister santa', 'new baby sibling'],
    secondaryKeywords: ['sibling christmas', 'older sibling gift', 'new baby brother', 'new baby sister'],
    emotionalAngles: ['pride', 'responsibility', 'love', 'importance', 'growth'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_child_divorced_parents',
    productType: 'santa_message',
    displayName: 'Santa Message for Child of Divorced Parents',
    shortLabel: 'Divorced parents Santa',
    category: 'by_situation',
    audience: 'children_of_divorce',
    primaryKeywords: ['divorce christmas child', 'separated parents christmas', 'two homes christmas', 'divorced family santa'],
    secondaryKeywords: ['coparenting christmas', 'split custody christmas', 'blended holiday', 'two christmases'],
    emotionalAngles: ['love', 'security', 'belonging', 'reassurance', 'stability'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_child_medical_bravery',
    productType: 'santa_message',
    displayName: 'Santa Message for Brave Medical Child',
    shortLabel: 'Medical bravery Santa',
    category: 'by_situation',
    audience: 'children_medical_journey',
    primaryKeywords: ['sick child christmas', 'hospital christmas', 'brave child santa', 'medical child christmas'],
    secondaryKeywords: ['illness christmas', 'surgery christmas', 'treatment christmas', 'brave kid santa'],
    emotionalAngles: ['bravery', 'strength', 'encouragement', 'love', 'hope'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_child_anxiety_shy',
    productType: 'santa_message',
    displayName: 'Santa Message for Anxious/Shy Child',
    shortLabel: 'Anxious child Santa',
    category: 'by_situation',
    audience: 'anxious_children',
    primaryKeywords: ['anxious child christmas', 'shy child santa', 'nervous child christmas', 'anxiety christmas'],
    secondaryKeywords: ['gentle santa', 'soft santa message', 'encouraging santa', 'calm santa'],
    emotionalAngles: ['gentleness', 'encouragement', 'understanding', 'patience', 'love'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_child_bullying_courage',
    productType: 'santa_message',
    displayName: 'Santa Message for Child Facing Bullying',
    shortLabel: 'Bullying courage Santa',
    category: 'by_situation',
    audience: 'bullied_children',
    primaryKeywords: ['bullied child christmas', 'bullying support', 'courage child santa', 'standing up bullying'],
    secondaryKeywords: ['brave child bullying', 'santa encouragement', 'anti bullying christmas', 'kindness matters'],
    emotionalAngles: ['courage', 'worth', 'strength', 'kindness', 'support'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_child_academic_improvement',
    productType: 'santa_message',
    displayName: 'Santa Message for Academic Improvement',
    shortLabel: 'Academic growth Santa',
    category: 'by_situation',
    audience: 'improving_students',
    primaryKeywords: ['grades improvement christmas', 'school progress santa', 'academic growth', 'better grades christmas'],
    secondaryKeywords: ['school effort', 'trying harder school', 'student improvement', 'hard work school'],
    emotionalAngles: ['pride', 'effort', 'growth', 'encouragement', 'recognition'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_child_sports_effort',
    productType: 'santa_message',
    displayName: 'Santa Message for Sports Effort',
    shortLabel: 'Sports effort Santa',
    category: 'by_situation',
    audience: 'young_athletes',
    primaryKeywords: ['sports christmas', 'athlete child santa', 'soccer christmas', 'basketball christmas'],
    secondaryKeywords: ['team sports santa', 'sports effort', 'athletic child', 'sports encouragement'],
    emotionalAngles: ['effort', 'teamwork', 'sportsmanship', 'growth', 'dedication'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_child_kindness_acts',
    productType: 'santa_message',
    displayName: 'Santa Message for Kind Acts',
    shortLabel: 'Kindness acts Santa',
    category: 'by_situation',
    audience: 'kind_children',
    primaryKeywords: ['kind child christmas', 'kindness santa', 'good deeds christmas', 'helpful child santa'],
    secondaryKeywords: ['nice list', 'santa sees kindness', 'thoughtful child', 'caring child christmas'],
    emotionalAngles: ['recognition', 'pride', 'encouragement', 'warmth', 'love'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },

  // === By Family Setup ===
  {
    id: 'santa_twins_siblings',
    productType: 'santa_message',
    displayName: 'Santa Message for Twins',
    shortLabel: 'Twins Santa',
    category: 'by_family',
    audience: 'twins',
    primaryKeywords: ['twins christmas', 'santa twins', 'twin children christmas', 'santa message twins'],
    secondaryKeywords: ['twin gift christmas', 'siblings christmas', 'two kids santa', 'twin personalized'],
    emotionalAngles: ['uniqueness', 'bond', 'individual', 'love', 'special'],
    priceRange: { min: 19.95, max: 29.95, default: 24.95 }
  },
  {
    id: 'santa_siblings_shared_message',
    productType: 'santa_message',
    displayName: 'Santa Message for Siblings (Shared)',
    shortLabel: 'Siblings shared Santa',
    category: 'by_family',
    audience: 'siblings',
    primaryKeywords: ['siblings christmas', 'santa siblings', 'brother sister christmas', 'kids together santa'],
    secondaryKeywords: ['family kids santa', 'multiple kids christmas', 'sibling gift', 'children together'],
    emotionalAngles: ['togetherness', 'family', 'love', 'bond', 'joy'],
    priceRange: { min: 19.95, max: 29.95, default: 24.95 }
  },
  {
    id: 'santa_for_grandchild',
    productType: 'santa_message',
    displayName: 'Santa Message from Grandparents',
    shortLabel: 'Grandchild Santa',
    category: 'by_family',
    audience: 'grandparents',
    primaryKeywords: ['grandchild christmas', 'santa from grandparents', 'grandkid christmas gift', 'grandparent gift'],
    secondaryKeywords: ['grandma santa gift', 'grandpa christmas', 'long distance grandchild', 'grandparent love'],
    emotionalAngles: ['love', 'connection', 'special', 'generational', 'warmth'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_mentions_pet',
    productType: 'santa_message',
    displayName: 'Santa Message Mentioning Pet',
    shortLabel: 'Pet mention Santa',
    category: 'by_family',
    audience: 'pet_families',
    primaryKeywords: ['santa mentions dog', 'santa mentions cat', 'pet christmas', 'santa knows pet'],
    secondaryKeywords: ['family pet christmas', 'santa pet message', 'dog christmas', 'cat christmas'],
    emotionalAngles: ['delight', 'surprise', 'personal', 'joy', 'family'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },

  // === By Message Focus ===
  {
    id: 'santa_nice_list_focus',
    productType: 'santa_message',
    displayName: 'Nice List Focus Santa Message',
    shortLabel: 'Nice list Santa',
    category: 'by_focus',
    audience: 'nice_list_kids',
    primaryKeywords: ['nice list', 'santa nice list', 'good list christmas', 'on santas list'],
    secondaryKeywords: ['santa watching', 'good behavior christmas', 'nice list message', 'santa knows'],
    emotionalAngles: ['validation', 'pride', 'recognition', 'joy', 'reward'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_kindness_encouragement',
    productType: 'santa_message',
    displayName: 'Kindness & Encouragement Santa Message',
    shortLabel: 'Kindness Santa',
    category: 'by_focus',
    audience: 'all_children',
    primaryKeywords: ['kindness christmas', 'santa encouragement', 'encouraging santa', 'kind santa message'],
    secondaryKeywords: ['positive santa', 'uplifting christmas', 'santa kindness', 'gentle santa'],
    emotionalAngles: ['kindness', 'encouragement', 'warmth', 'gentleness', 'love'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_belief_magic_tone',
    productType: 'santa_message',
    displayName: 'Magic & Wonder Santa Message',
    shortLabel: 'Magic wonder Santa',
    category: 'by_focus',
    audience: 'believers',
    primaryKeywords: ['santa magic', 'christmas magic', 'believe in santa', 'santa wonder'],
    secondaryKeywords: ['magical christmas', 'christmas belief', 'santa real', 'magic of christmas'],
    emotionalAngles: ['magic', 'wonder', 'belief', 'enchantment', 'joy'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_family_love_reassurance',
    productType: 'santa_message',
    displayName: 'Family Love & Reassurance Santa Message',
    shortLabel: 'Family love Santa',
    category: 'by_focus',
    audience: 'all_families',
    primaryKeywords: ['family christmas', 'santa family message', 'christmas love', 'family reassurance'],
    secondaryKeywords: ['family christmas gift', 'santa family', 'love christmas', 'family bond'],
    emotionalAngles: ['love', 'reassurance', 'security', 'belonging', 'warmth'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  },
  {
    id: 'santa_christian_tone_optional',
    productType: 'santa_message',
    displayName: 'Christian Faith Santa Message',
    shortLabel: 'Christian Santa',
    category: 'by_focus',
    audience: 'christian_families',
    primaryKeywords: ['christian christmas', 'jesus christmas', 'faith based santa', 'religious christmas'],
    secondaryKeywords: ['christ christmas', 'christian family christmas', 'santa faith', 'christmas faith'],
    emotionalAngles: ['faith', 'reverence', 'meaning', 'gratitude', 'blessing'],
    priceRange: { min: 14.95, max: 24.95, default: 19.95 }
  }
];

// ============================================================
// FLASH CARD THEMES
// ============================================================

export const FLASH_CARD_THEMES: ThemeConfig[] = [
  // === By Subject ===
  {
    id: 'flash_math_addition',
    productType: 'flash_cards',
    displayName: 'Addition Flash Cards',
    shortLabel: 'Addition',
    category: 'by_subject',
    audience: 'early_learners',
    primaryKeywords: ['addition flash cards', 'math flash cards', 'addition practice', 'learning addition'],
    secondaryKeywords: ['math practice', 'add facts', 'sum practice', 'number facts'],
    emotionalAngles: ['learning', 'confidence', 'mastery', 'practice', 'success'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_math_subtraction',
    productType: 'flash_cards',
    displayName: 'Subtraction Flash Cards',
    shortLabel: 'Subtraction',
    category: 'by_subject',
    audience: 'early_learners',
    primaryKeywords: ['subtraction flash cards', 'math flash cards', 'subtraction practice', 'learning subtraction'],
    secondaryKeywords: ['math practice', 'minus facts', 'difference practice', 'number facts'],
    emotionalAngles: ['learning', 'confidence', 'mastery', 'practice', 'success'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_math_multiplication',
    productType: 'flash_cards',
    displayName: 'Multiplication Flash Cards',
    shortLabel: 'Multiplication',
    category: 'by_subject',
    audience: 'elementary',
    primaryKeywords: ['multiplication flash cards', 'times tables', 'multiplication practice', 'math facts'],
    secondaryKeywords: ['multiply practice', 'times table practice', 'math drills', 'multiplication facts'],
    emotionalAngles: ['mastery', 'confidence', 'fluency', 'achievement', 'practice'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_math_division',
    productType: 'flash_cards',
    displayName: 'Division Flash Cards',
    shortLabel: 'Division',
    category: 'by_subject',
    audience: 'elementary',
    primaryKeywords: ['division flash cards', 'division practice', 'math flash cards', 'division facts'],
    secondaryKeywords: ['divide practice', 'quotient practice', 'math drills', 'division mastery'],
    emotionalAngles: ['mastery', 'confidence', 'understanding', 'achievement', 'practice'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_reading_sight_words',
    productType: 'flash_cards',
    displayName: 'Sight Words Flash Cards',
    shortLabel: 'Sight words',
    category: 'by_subject',
    audience: 'early_readers',
    primaryKeywords: ['sight words flash cards', 'reading flash cards', 'dolch words', 'fry words'],
    secondaryKeywords: ['learn to read', 'high frequency words', 'reading practice', 'word recognition'],
    emotionalAngles: ['reading', 'confidence', 'recognition', 'fluency', 'success'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_phonics_blends',
    productType: 'flash_cards',
    displayName: 'Phonics & Blends Flash Cards',
    shortLabel: 'Phonics blends',
    category: 'by_subject',
    audience: 'early_readers',
    primaryKeywords: ['phonics flash cards', 'blends flash cards', 'reading blends', 'phonics practice'],
    secondaryKeywords: ['consonant blends', 'digraphs', 'phonemic awareness', 'sound blends'],
    emotionalAngles: ['learning', 'decoding', 'confidence', 'reading', 'success'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_vocabulary_builder',
    productType: 'flash_cards',
    displayName: 'Vocabulary Builder Flash Cards',
    shortLabel: 'Vocabulary',
    category: 'by_subject',
    audience: 'students',
    primaryKeywords: ['vocabulary flash cards', 'word cards', 'vocabulary practice', 'word building'],
    secondaryKeywords: ['expand vocabulary', 'new words', 'word learning', 'language building'],
    emotionalAngles: ['growth', 'learning', 'communication', 'confidence', 'knowledge'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_science_animals',
    productType: 'flash_cards',
    displayName: 'Animal Science Flash Cards',
    shortLabel: 'Animals science',
    category: 'by_subject',
    audience: 'curious_kids',
    primaryKeywords: ['animal flash cards', 'science flash cards', 'animal facts', 'learn animals'],
    secondaryKeywords: ['animal kingdom', 'wildlife cards', 'nature learning', 'animal education'],
    emotionalAngles: ['curiosity', 'wonder', 'learning', 'discovery', 'nature'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_science_space',
    productType: 'flash_cards',
    displayName: 'Space & Astronomy Flash Cards',
    shortLabel: 'Space astronomy',
    category: 'by_subject',
    audience: 'curious_kids',
    primaryKeywords: ['space flash cards', 'astronomy flash cards', 'planets flash cards', 'solar system'],
    secondaryKeywords: ['space learning', 'planet facts', 'universe cards', 'astronomy education'],
    emotionalAngles: ['wonder', 'curiosity', 'exploration', 'discovery', 'amazement'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_science_nature',
    productType: 'flash_cards',
    displayName: 'Nature & Environment Flash Cards',
    shortLabel: 'Nature environment',
    category: 'by_subject',
    audience: 'nature_lovers',
    primaryKeywords: ['nature flash cards', 'environment flash cards', 'plants flash cards', 'ecology'],
    secondaryKeywords: ['nature learning', 'earth science', 'environment education', 'natural world'],
    emotionalAngles: ['connection', 'stewardship', 'curiosity', 'appreciation', 'wonder'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_history_us_states',
    productType: 'flash_cards',
    displayName: 'US States & Capitals Flash Cards',
    shortLabel: 'US states',
    category: 'by_subject',
    audience: 'elementary',
    primaryKeywords: ['us states flash cards', 'states capitals', '50 states', 'geography flash cards'],
    secondaryKeywords: ['learn states', 'us geography', 'state capitals', 'american geography'],
    emotionalAngles: ['knowledge', 'patriotism', 'learning', 'geography', 'discovery'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_geography_countries',
    productType: 'flash_cards',
    displayName: 'World Countries Flash Cards',
    shortLabel: 'World countries',
    category: 'by_subject',
    audience: 'students',
    primaryKeywords: ['countries flash cards', 'world geography', 'capitals flash cards', 'world map'],
    secondaryKeywords: ['learn countries', 'geography practice', 'world capitals', 'global geography'],
    emotionalAngles: ['global', 'curiosity', 'exploration', 'knowledge', 'connection'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_language_spanish_basics',
    productType: 'flash_cards',
    displayName: 'Spanish Basics Flash Cards',
    shortLabel: 'Spanish basics',
    category: 'by_subject',
    audience: 'language_learners',
    primaryKeywords: ['spanish flash cards', 'learn spanish', 'spanish words', 'spanish vocabulary'],
    secondaryKeywords: ['spanish for kids', 'beginning spanish', 'espanol flash cards', 'spanish practice'],
    emotionalAngles: ['communication', 'culture', 'learning', 'confidence', 'connection'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_language_french_basics',
    productType: 'flash_cards',
    displayName: 'French Basics Flash Cards',
    shortLabel: 'French basics',
    category: 'by_subject',
    audience: 'language_learners',
    primaryKeywords: ['french flash cards', 'learn french', 'french words', 'french vocabulary'],
    secondaryKeywords: ['french for kids', 'beginning french', 'francais flash cards', 'french practice'],
    emotionalAngles: ['elegance', 'culture', 'learning', 'confidence', 'connection'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },

  // === By Grade Level ===
  {
    id: 'flash_preschool',
    productType: 'flash_cards',
    displayName: 'Preschool Learning Flash Cards',
    shortLabel: 'Preschool',
    category: 'by_grade',
    audience: 'preschoolers',
    primaryKeywords: ['preschool flash cards', 'toddler learning', 'preschool learning', 'early learning'],
    secondaryKeywords: ['abc flash cards', 'numbers flash cards', 'shapes colors', 'pre k learning'],
    emotionalAngles: ['foundation', 'readiness', 'play', 'discovery', 'confidence'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_kindergarten',
    productType: 'flash_cards',
    displayName: 'Kindergarten Flash Cards',
    shortLabel: 'Kindergarten',
    category: 'by_grade',
    audience: 'kindergarteners',
    primaryKeywords: ['kindergarten flash cards', 'K flash cards', 'kindergarten learning', 'kindergarten prep'],
    secondaryKeywords: ['letters numbers', 'early reading', 'kindergarten math', 'k prep'],
    emotionalAngles: ['readiness', 'confidence', 'foundation', 'learning', 'success'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_grade1',
    productType: 'flash_cards',
    displayName: 'First Grade Flash Cards',
    shortLabel: 'First grade',
    category: 'by_grade',
    audience: 'first_graders',
    primaryKeywords: ['first grade flash cards', '1st grade learning', 'grade 1 flash cards', 'first grade practice'],
    secondaryKeywords: ['first grade math', 'first grade reading', 'grade 1 practice', '1st grade prep'],
    emotionalAngles: ['growth', 'confidence', 'achievement', 'progress', 'mastery'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_grade2',
    productType: 'flash_cards',
    displayName: 'Second Grade Flash Cards',
    shortLabel: 'Second grade',
    category: 'by_grade',
    audience: 'second_graders',
    primaryKeywords: ['second grade flash cards', '2nd grade learning', 'grade 2 flash cards', 'second grade practice'],
    secondaryKeywords: ['second grade math', 'second grade reading', 'grade 2 practice', '2nd grade prep'],
    emotionalAngles: ['building', 'confidence', 'advancement', 'skill', 'mastery'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_grade3',
    productType: 'flash_cards',
    displayName: 'Third Grade Flash Cards',
    shortLabel: 'Third grade',
    category: 'by_grade',
    audience: 'third_graders',
    primaryKeywords: ['third grade flash cards', '3rd grade learning', 'grade 3 flash cards', 'third grade practice'],
    secondaryKeywords: ['third grade math', 'third grade reading', 'grade 3 practice', '3rd grade prep'],
    emotionalAngles: ['advancement', 'challenge', 'growth', 'achievement', 'mastery'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },
  {
    id: 'flash_grade4',
    productType: 'flash_cards',
    displayName: 'Fourth Grade Flash Cards',
    shortLabel: 'Fourth grade',
    category: 'by_grade',
    audience: 'fourth_graders',
    primaryKeywords: ['fourth grade flash cards', '4th grade learning', 'grade 4 flash cards', 'fourth grade practice'],
    secondaryKeywords: ['fourth grade math', 'fourth grade reading', 'grade 4 practice', '4th grade prep'],
    emotionalAngles: ['challenge', 'depth', 'critical thinking', 'achievement', 'mastery'],
    priceRange: { min: 4.95, max: 9.95, default: 6.95 }
  },

  // === By Theme (fun designs) ===
  {
    id: 'flash_dinosaur_math',
    productType: 'flash_cards',
    displayName: 'Dinosaur Math Flash Cards',
    shortLabel: 'Dinosaur math',
    category: 'by_theme',
    audience: 'dino_lovers',
    primaryKeywords: ['dinosaur flash cards', 'dino math', 'dinosaur learning', 'fun math cards'],
    secondaryKeywords: ['dinosaur education', 'dino themed learning', 'prehistoric math', 'jurassic flash cards'],
    emotionalAngles: ['fun', 'engagement', 'excitement', 'learning', 'play'],
    priceRange: { min: 5.95, max: 10.95, default: 7.95 }
  },
  {
    id: 'flash_princess_reading',
    productType: 'flash_cards',
    displayName: 'Princess Reading Flash Cards',
    shortLabel: 'Princess reading',
    category: 'by_theme',
    audience: 'princess_lovers',
    primaryKeywords: ['princess flash cards', 'princess reading', 'princess learning', 'fairy tale flash cards'],
    secondaryKeywords: ['princess education', 'girl flash cards', 'royal reading', 'magical learning'],
    emotionalAngles: ['magic', 'fun', 'engagement', 'imagination', 'delight'],
    priceRange: { min: 5.95, max: 10.95, default: 7.95 }
  },
  {
    id: 'flash_superhero_learning',
    productType: 'flash_cards',
    displayName: 'Superhero Learning Flash Cards',
    shortLabel: 'Superhero learning',
    category: 'by_theme',
    audience: 'superhero_fans',
    primaryKeywords: ['superhero flash cards', 'hero learning', 'super learning', 'hero flash cards'],
    secondaryKeywords: ['superhero education', 'hero themed', 'powerful learning', 'super smart'],
    emotionalAngles: ['power', 'strength', 'fun', 'confidence', 'heroic'],
    priceRange: { min: 5.95, max: 10.95, default: 7.95 }
  },
  {
    id: 'flash_sports_math',
    productType: 'flash_cards',
    displayName: 'Sports Math Flash Cards',
    shortLabel: 'Sports math',
    category: 'by_theme',
    audience: 'sports_fans',
    primaryKeywords: ['sports flash cards', 'sports math', 'athlete learning', 'sports themed learning'],
    secondaryKeywords: ['basketball math', 'soccer learning', 'sports education', 'athletic flash cards'],
    emotionalAngles: ['competition', 'teamwork', 'fun', 'energy', 'achievement'],
    priceRange: { min: 5.95, max: 10.95, default: 7.95 }
  },
  {
    id: 'flash_animal_vocabulary',
    productType: 'flash_cards',
    displayName: 'Animal Vocabulary Flash Cards',
    shortLabel: 'Animal vocabulary',
    category: 'by_theme',
    audience: 'animal_lovers',
    primaryKeywords: ['animal vocabulary', 'animal words', 'animal flash cards', 'animal learning'],
    secondaryKeywords: ['wildlife words', 'creature vocabulary', 'nature vocabulary', 'animal names'],
    emotionalAngles: ['wonder', 'curiosity', 'nature', 'connection', 'learning'],
    priceRange: { min: 5.95, max: 10.95, default: 7.95 }
  },

  // === By Learning Need ===
  {
    id: 'flash_confidence_struggling_reader',
    productType: 'flash_cards',
    displayName: 'Confidence Flash Cards for Struggling Readers',
    shortLabel: 'Struggling reader help',
    category: 'by_need',
    audience: 'struggling_readers',
    primaryKeywords: ['struggling reader', 'reading help', 'reading confidence', 'reading support'],
    secondaryKeywords: ['dyslexia friendly', 'reading intervention', 'reading practice', 'catch up reading'],
    emotionalAngles: ['confidence', 'encouragement', 'patience', 'progress', 'support'],
    priceRange: { min: 6.95, max: 12.95, default: 8.95 }
  },
  {
    id: 'flash_math_anxious_child',
    productType: 'flash_cards',
    displayName: 'Math Confidence Flash Cards',
    shortLabel: 'Math anxiety help',
    category: 'by_need',
    audience: 'math_anxious',
    primaryKeywords: ['math anxiety', 'math confidence', 'math help', 'math support'],
    secondaryKeywords: ['math fear', 'gentle math', 'math encouragement', 'math practice gentle'],
    emotionalAngles: ['confidence', 'calm', 'patience', 'encouragement', 'success'],
    priceRange: { min: 6.95, max: 12.95, default: 8.95 }
  },
  {
    id: 'flash_visual_learner',
    productType: 'flash_cards',
    displayName: 'Visual Learner Flash Cards',
    shortLabel: 'Visual learner',
    category: 'by_need',
    audience: 'visual_learners',
    primaryKeywords: ['visual learning', 'visual flash cards', 'picture learning', 'visual education'],
    secondaryKeywords: ['image based learning', 'visual memory', 'picture flash cards', 'visual aids'],
    emotionalAngles: ['clarity', 'understanding', 'engagement', 'memory', 'connection'],
    priceRange: { min: 6.95, max: 12.95, default: 8.95 }
  }
];

// ============================================================
// PLANNER THEMES
// ============================================================

export const PLANNER_THEMES: ThemeConfig[] = [
  // === Life Transitions ===
  {
    id: 'pl_post_breakup',
    productType: 'planner',
    displayName: 'Post-Breakup Reflection Planner',
    shortLabel: 'Post-breakup',
    category: 'life_transitions',
    audience: 'healing_adults',
    primaryKeywords: ['breakup planner', 'breakup journal', 'post breakup healing', 'breakup reflection'],
    secondaryKeywords: ['moving on planner', 'healing journal', 'relationship ending', 'breakup recovery'],
    emotionalAngles: ['healing', 'clarity', 'growth', 'processing', 'forward'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_divorce_rebuilding',
    productType: 'planner',
    displayName: 'Divorce Rebuilding Planner',
    shortLabel: 'Divorce rebuilding',
    category: 'life_transitions',
    audience: 'divorcing_adults',
    primaryKeywords: ['divorce planner', 'divorce journal', 'divorce recovery', 'divorce reflection'],
    secondaryKeywords: ['rebuilding after divorce', 'divorce healing', 'new chapter divorce', 'divorce clarity'],
    emotionalAngles: ['rebuilding', 'strength', 'clarity', 'hope', 'identity'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_career_change_clarity',
    productType: 'planner',
    displayName: 'Career Change Clarity Planner',
    shortLabel: 'Career change',
    category: 'life_transitions',
    audience: 'career_changers',
    primaryKeywords: ['career change planner', 'career clarity', 'job change journal', 'career transition'],
    secondaryKeywords: ['career planning', 'career reflection', 'new career', 'career goals planner'],
    emotionalAngles: ['clarity', 'direction', 'confidence', 'possibility', 'purpose'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_new_job_reset',
    productType: 'planner',
    displayName: 'New Job Reset Planner',
    shortLabel: 'New job reset',
    category: 'life_transitions',
    audience: 'new_employees',
    primaryKeywords: ['new job planner', 'job transition', 'new role journal', 'career start'],
    secondaryKeywords: ['starting new job', 'first 90 days', 'job goals', 'career beginning'],
    emotionalAngles: ['preparation', 'confidence', 'intention', 'success', 'growth'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_retirement_transition',
    productType: 'planner',
    displayName: 'Retirement Transition Planner',
    shortLabel: 'Retirement',
    category: 'life_transitions',
    audience: 'retiring_adults',
    primaryKeywords: ['retirement planner', 'retirement journal', 'retirement planning', 'life after work'],
    secondaryKeywords: ['retirement goals', 'retirement reflection', 'retirement dreams', 'next chapter retirement'],
    emotionalAngles: ['purpose', 'freedom', 'legacy', 'gratitude', 'possibility'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_moving_fresh_start',
    productType: 'planner',
    displayName: 'Moving & Fresh Start Planner',
    shortLabel: 'Moving fresh start',
    category: 'life_transitions',
    audience: 'relocating_adults',
    primaryKeywords: ['moving planner', 'relocation journal', 'fresh start planner', 'new city journal'],
    secondaryKeywords: ['starting over', 'new beginning', 'move planning', 'new chapter moving'],
    emotionalAngles: ['adventure', 'intention', 'possibility', 'courage', 'growth'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },

  // === Personal Development ===
  {
    id: 'pl_goal_clarity',
    productType: 'planner',
    displayName: 'Goal Clarity Planner',
    shortLabel: 'Goal clarity',
    category: 'personal_development',
    audience: 'goal_setters',
    primaryKeywords: ['goal planner', 'goal setting journal', 'goals clarity', 'goal planning'],
    secondaryKeywords: ['achieve goals', 'goal reflection', 'goal journal', 'goal mapping'],
    emotionalAngles: ['clarity', 'focus', 'direction', 'intention', 'achievement'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_decision_making',
    productType: 'planner',
    displayName: 'Decision Making Planner',
    shortLabel: 'Decision making',
    category: 'personal_development',
    audience: 'decision_makers',
    primaryKeywords: ['decision planner', 'decision journal', 'making decisions', 'choice clarity'],
    secondaryKeywords: ['big decision', 'decision help', 'choosing path', 'decision reflection'],
    emotionalAngles: ['clarity', 'confidence', 'wisdom', 'peace', 'direction'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_values_discovery',
    productType: 'planner',
    displayName: 'Values Discovery Planner',
    shortLabel: 'Values discovery',
    category: 'personal_development',
    audience: 'self_explorers',
    primaryKeywords: ['values planner', 'core values', 'values discovery', 'personal values'],
    secondaryKeywords: ['what matters', 'value system', 'priorities', 'beliefs'],
    emotionalAngles: ['authenticity', 'clarity', 'alignment', 'purpose', 'truth'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_purpose_calling',
    productType: 'planner',
    displayName: 'Purpose & Calling Planner',
    shortLabel: 'Purpose calling',
    category: 'personal_development',
    audience: 'purpose_seekers',
    primaryKeywords: ['purpose planner', 'calling journal', 'life purpose', 'finding purpose'],
    secondaryKeywords: ['purpose discovery', 'meaning planner', 'calling clarity', 'life meaning'],
    emotionalAngles: ['meaning', 'purpose', 'clarity', 'fulfillment', 'direction'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_confidence_building',
    productType: 'planner',
    displayName: 'Confidence Building Planner',
    shortLabel: 'Confidence building',
    category: 'personal_development',
    audience: 'confidence_seekers',
    primaryKeywords: ['confidence planner', 'self confidence', 'building confidence', 'confidence journal'],
    secondaryKeywords: ['self belief', 'self esteem planner', 'confidence growth', 'inner confidence'],
    emotionalAngles: ['confidence', 'strength', 'self-belief', 'growth', 'empowerment'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_time_priorities',
    productType: 'planner',
    displayName: 'Time & Priorities Planner',
    shortLabel: 'Time priorities',
    category: 'personal_development',
    audience: 'busy_adults',
    primaryKeywords: ['time management planner', 'priorities planner', 'time journal', 'productivity'],
    secondaryKeywords: ['time clarity', 'priority setting', 'time reflection', 'focus planner'],
    emotionalAngles: ['clarity', 'focus', 'balance', 'intentionality', 'peace'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },

  // === Situational ===
  {
    id: 'pl_new_year_reset',
    productType: 'planner',
    displayName: 'New Year Reset Planner',
    shortLabel: 'New year reset',
    category: 'situational',
    audience: 'new_year_planners',
    primaryKeywords: ['new year planner', 'new year journal', 'year reset', 'new year reflection'],
    secondaryKeywords: ['yearly planning', 'new year goals', 'year intentions', 'annual reset'],
    emotionalAngles: ['fresh start', 'intention', 'hope', 'clarity', 'possibility'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_birthday_reflection',
    productType: 'planner',
    displayName: 'Birthday Reflection Planner',
    shortLabel: 'Birthday reflection',
    category: 'situational',
    audience: 'birthday_celebrants',
    primaryKeywords: ['birthday planner', 'birthday journal', 'birthday reflection', 'birthday intentions'],
    secondaryKeywords: ['birthday gift', 'year ahead', 'birthday planning', 'new age'],
    emotionalAngles: ['celebration', 'reflection', 'gratitude', 'intention', 'growth'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_annual_review',
    productType: 'planner',
    displayName: 'Annual Review Planner',
    shortLabel: 'Annual review',
    category: 'situational',
    audience: 'reflective_adults',
    primaryKeywords: ['annual review', 'year review planner', 'yearly reflection', 'year in review'],
    secondaryKeywords: ['year reflection', 'annual reflection', 'look back year', 'year assessment'],
    emotionalAngles: ['reflection', 'gratitude', 'learning', 'growth', 'wisdom'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_relationship_check_in',
    productType: 'planner',
    displayName: 'Relationship Check-In Planner',
    shortLabel: 'Relationship check-in',
    category: 'situational',
    audience: 'couples',
    primaryKeywords: ['relationship planner', 'couples journal', 'relationship check in', 'marriage planner'],
    secondaryKeywords: ['relationship reflection', 'couples check in', 'relationship health', 'partnership'],
    emotionalAngles: ['connection', 'growth', 'understanding', 'love', 'intention'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_parenting_reflection',
    productType: 'planner',
    displayName: 'Parenting Reflection Planner',
    shortLabel: 'Parenting reflection',
    category: 'situational',
    audience: 'parents',
    primaryKeywords: ['parenting planner', 'parenting journal', 'parent reflection', 'parenting goals'],
    secondaryKeywords: ['mom planner', 'dad planner', 'parenting clarity', 'family goals'],
    emotionalAngles: ['intentionality', 'love', 'growth', 'patience', 'grace'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },

  // === Faith-Based ===
  {
    id: 'pl_prayer_reflection',
    productType: 'planner',
    displayName: 'Prayer & Reflection Planner',
    shortLabel: 'Prayer reflection',
    category: 'faith_based',
    audience: 'faith_adults',
    primaryKeywords: ['prayer planner', 'prayer journal', 'christian reflection', 'spiritual planner'],
    secondaryKeywords: ['devotional planner', 'faith journal', 'prayer reflection', 'quiet time'],
    emotionalAngles: ['faith', 'peace', 'surrender', 'connection', 'trust'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_spiritual_growth',
    productType: 'planner',
    displayName: 'Spiritual Growth Planner',
    shortLabel: 'Spiritual growth',
    category: 'faith_based',
    audience: 'spiritual_seekers',
    primaryKeywords: ['spiritual planner', 'spiritual growth', 'faith planner', 'soul journal'],
    secondaryKeywords: ['spiritual journey', 'faith growth', 'spiritual reflection', 'inner growth'],
    emotionalAngles: ['depth', 'growth', 'connection', 'awareness', 'peace'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_gratitude_faith',
    productType: 'planner',
    displayName: 'Gratitude & Faith Planner',
    shortLabel: 'Gratitude faith',
    category: 'faith_based',
    audience: 'grateful_believers',
    primaryKeywords: ['gratitude planner', 'gratitude journal', 'thankful planner', 'blessings journal'],
    secondaryKeywords: ['gratitude practice', 'thankfulness', 'counting blessings', 'grateful heart'],
    emotionalAngles: ['gratitude', 'joy', 'perspective', 'contentment', 'faith'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  },
  {
    id: 'pl_purpose_in_faith',
    productType: 'planner',
    displayName: 'Purpose in Faith Planner',
    shortLabel: 'Purpose in faith',
    category: 'faith_based',
    audience: 'purpose_seeking_believers',
    primaryKeywords: ['christian purpose', 'faith purpose', 'calling planner', 'god purpose'],
    secondaryKeywords: ['divine calling', 'faith journey', 'spiritual purpose', 'god plan'],
    emotionalAngles: ['purpose', 'calling', 'trust', 'surrender', 'clarity'],
    priceRange: { min: 9.95, max: 19.95, default: 14.95 }
  }
];

// ============================================================
// COMBINED EXPORTS
// ============================================================

export const ALL_THEMES: ThemeConfig[] = [
  ...VISION_BOARD_THEMES,
  ...SANTA_MESSAGE_THEMES,
  ...FLASH_CARD_THEMES,
  ...PLANNER_THEMES
];

export function getThemesByProductType(productType: ProductType): ThemeConfig[] {
  return ALL_THEMES.filter(theme => theme.productType === productType);
}

export function getThemeById(themeId: string): ThemeConfig | undefined {
  return ALL_THEMES.find(theme => theme.id === themeId);
}

export function getThemesByCategory(productType: ProductType, category: string): ThemeConfig[] {
  return ALL_THEMES.filter(theme =>
    theme.productType === productType && theme.category === category
  );
}

export function getStyleVariantById(styleId: string): StyleVariant | undefined {
  return STYLE_VARIANTS.find(style => style.id === styleId);
}

/**
 * Get all themes across all product types
 */
export function getAllThemes(): ThemeConfig[] {
  return ALL_THEMES;
}
