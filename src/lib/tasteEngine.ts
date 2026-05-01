// ===== TYPES =====

export type Gender = 'man' | 'woman' | 'both' | 'gift';
export type Budget = 'value' | 'quality' | 'invest' | 'unlimited';
export type Style = 'classic' | 'modern' | 'bold' | 'eclectic';
export type Decision = 'gut' | 'research' | 'social' | 'trial';
export type Motivation = 'craft' | 'status' | 'joy' | 'investment';
export type WatchAffinity = 'movement' | 'design' | 'legacy' | 'function';
export type ScentProfile = 'fresh' | 'warm' | 'bold' | 'subtle';
export type TravelEnergy = 'rest' | 'culture' | 'adventure' | 'urban';
export type TechPhilosophy = 'simple' | 'cutting_edge' | 'value' | 'power';
export type Engagement = 'obsessed' | 'selective' | 'need_based' | 'overwhelmed';

export interface TasteProfile {
  gender: Gender;
  budget: Budget;
  style: Style;
  decision: Decision;
  motivation: Motivation;
  watchAffinity: WatchAffinity;
  scentProfile: ScentProfile;
  travelEnergy: TravelEnergy;
  techPhilosophy: TechPhilosophy;
  engagement: Engagement;
  completedAt?: string;
}

export type Vertical = 'watches' | 'perfumes' | 'travel' | 'electronics';

export interface WatchData {
  investmentGrade: string;
  wearOccasion: string;
  movementType: string;
  resaleStrength: string;
}

export interface PerfumeData {
  notes: { top: string[]; heart: string[]; base: string[] };
  bestMoments: string[];
  longevity: number;
  sillage: string;
  gender: string;
}

export interface TravelData {
  hiddenGemScore: number;
  energyLevel: string;
  bestFor: string[];
  thingsToSkip: string;
  bestTimeToVisit: string;
}

export interface ElectronicsData {
  category: string;
  featuresYouWill: string[];
  featuresYouWont: string[];
  buyerRegretRisk: string;
  threeYearCost: string;
  upgradeIn: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  vertical: Vertical;
  price: number;
  priceDisplay: string;
  tagline: string;
  description: string;
  gradient: string;
  accentColor: string;
  emoji: string;
  matchWeights: Record<string, number>;
  watches?: WatchData;
  perfumes?: PerfumeData;
  travel?: TravelData;
  electronics?: ElectronicsData;
}

export interface ScoredItem extends CatalogItem {
  matchScore: number;
  whyYou: string;
}

// ===== SCORING =====

const PROFILE_DIMS: (keyof TasteProfile)[] = [
  'gender', 'budget', 'style', 'decision', 'motivation',
  'watchAffinity', 'scentProfile', 'travelEnergy', 'techPhilosophy', 'engagement',
];

export function calculateMatchScore(profile: TasteProfile, item: CatalogItem): number {
  let earned = 0;
  let possible = 0;

  for (const dim of PROFILE_DIMS) {
    const val = profile[dim] as string;
    const key = `${dim}:${val}`;
    const dimWeights = Object.entries(item.matchWeights).filter(([k]) => k.startsWith(`${dim}:`));
    if (dimWeights.length === 0) continue;
    const dimMax = Math.max(...dimWeights.map(([, v]) => v));
    const dimEarned = item.matchWeights[key] ?? 0;
    earned += dimEarned;
    possible += dimMax;
  }

  if (possible === 0) return 72;
  const raw = (earned / possible) * 100;
  return Math.round(58 + (raw / 100) * 40);
}

export function getPersonalizedWhy(profile: TasteProfile, item: CatalogItem): string {
  const styleMap: Record<Style, string> = {
    classic: 'timeless design',
    modern: 'clean modern aesthetic',
    bold: 'bold statement-making character',
    eclectic: 'one-of-a-kind character',
  };
  const motivationMap: Record<Motivation, string> = {
    craft: 'exceptional craftsmanship',
    status: 'commanding presence',
    joy: 'the pure joy it brings',
    investment: 'its lasting value',
  };
  const budgetMap: Record<Budget, string> = {
    value: 'smart value',
    quality: 'quality that endures',
    invest: 'investment-grade quality',
    unlimited: 'uncompromising excellence',
  };

  const parts = [styleMap[profile.style], motivationMap[profile.motivation]];
  if (['invest', 'unlimited'].includes(profile.budget)) {
    parts.push(budgetMap[profile.budget]);
  }
  return `Chosen for your appreciation of ${parts.slice(0, 2).join(' and ')}.`;
}

export function getRecommendations(profile: TasteProfile, vertical: Vertical): ScoredItem[] {
  return catalog
    .filter(item => item.vertical === vertical)
    .map(item => ({
      ...item,
      matchScore: calculateMatchScore(profile, item),
      whyYou: getPersonalizedWhy(profile, item),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function getProfileSummary(profile: TasteProfile): string[] {
  const styleLabel: Record<Style, string> = {
    classic: 'Classic Taste', modern: 'Modern Sensibility',
    bold: 'Bold Vision', eclectic: 'Eclectic Eye',
  };
  const budgetLabel: Record<Budget, string> = {
    value: 'Value-Driven', quality: 'Quality-First',
    invest: 'Investment Mindset', unlimited: 'Limitless Budget',
  };
  const motivationLabel: Record<Motivation, string> = {
    craft: 'Craft Obsessed', status: 'Status-Aware',
    joy: 'Joy-Led', investment: 'Investment-Focused',
  };
  return [styleLabel[profile.style], budgetLabel[profile.budget], motivationLabel[profile.motivation]];
}

// ===== CATALOG =====

export const catalog: CatalogItem[] = [
  // WATCHES
  {
    id: 'rolex-sub', name: 'Submariner Date', brand: 'Rolex',
    vertical: 'watches', price: 14500, priceDisplay: '$14,500+',
    tagline: 'The benchmark. Undeniable.',
    description: 'The most recognised dive watch in history — a symbol of achievement worn by presidents, pilots, and those who simply know.',
    gradient: 'from-emerald-950 via-slate-950 to-slate-950',
    accentColor: 'text-emerald-400', emoji: '🟢',
    matchWeights: {
      'gender:man': 9, 'gender:both': 6,
      'budget:invest': 10, 'budget:unlimited': 9, 'budget:quality': 7,
      'style:modern': 8, 'style:bold': 6, 'style:classic': 5,
      'motivation:status': 9, 'motivation:investment': 10, 'motivation:craft': 7,
      'watchAffinity:legacy': 10, 'watchAffinity:design': 7, 'watchAffinity:function': 6,
      'engagement:obsessed': 8, 'engagement:selective': 7,
    },
    watches: {
      investmentGrade: 'A+', wearOccasion: 'Daily to boardroom',
      movementType: 'Automatic, Cal. 3235', resaleStrength: 'Holds or gains over time',
    },
  },
  {
    id: 'patek-calatrava', name: 'Calatrava 5196', brand: 'Patek Philippe',
    vertical: 'watches', price: 28000, priceDisplay: '$28,000+',
    tagline: 'Pure. Refined. Eternal.',
    description: 'The purest expression of haute horlogerie. For those who understand the greatest watch is the one others never notice — until they do.',
    gradient: 'from-yellow-950 via-slate-950 to-slate-950',
    accentColor: 'text-yellow-400', emoji: '🟡',
    matchWeights: {
      'gender:man': 8, 'gender:both': 7,
      'budget:unlimited': 10, 'budget:invest': 9,
      'style:classic': 10, 'style:eclectic': 5,
      'decision:research': 8,
      'motivation:craft': 10, 'motivation:investment': 9, 'motivation:status': 6,
      'watchAffinity:legacy': 10, 'watchAffinity:movement': 9,
      'engagement:selective': 9, 'engagement:obsessed': 8,
    },
    watches: {
      investmentGrade: 'A+', wearOccasion: 'Business & formal',
      movementType: 'Manual-wind, Cal. 215', resaleStrength: 'Consistently appreciates',
    },
  },
  {
    id: 'ap-royal-oak', name: 'Royal Oak 15500', brand: 'Audemars Piguet',
    vertical: 'watches', price: 35000, priceDisplay: '$35,000+',
    tagline: 'The original rebel. In steel.',
    description: "Gerald Genta's 1972 masterpiece that turned fine watchmaking upside down. A luxury sports watch before the category existed.",
    gradient: 'from-indigo-950 via-slate-950 to-slate-950',
    accentColor: 'text-indigo-400', emoji: '⬡',
    matchWeights: {
      'budget:unlimited': 10, 'budget:invest': 9,
      'style:bold': 10, 'style:modern': 8, 'style:eclectic': 7,
      'motivation:status': 10, 'motivation:investment': 9, 'motivation:craft': 8,
      'watchAffinity:design': 10, 'watchAffinity:legacy': 9,
      'engagement:obsessed': 9, 'engagement:selective': 8,
    },
    watches: {
      investmentGrade: 'A+', wearOccasion: 'Smart casual to black tie',
      movementType: 'Automatic, Cal. 4302', resaleStrength: 'Among the strongest in market',
    },
  },
  {
    id: 'omega-seamaster', name: 'Seamaster 300M', brand: 'Omega',
    vertical: 'watches', price: 5700, priceDisplay: '$5,700+',
    tagline: "Bond's watch. Your watch.",
    description: "James Bond's companion for over 30 years. Precision-engineered to 300m depth, perfectly at home in a suit.",
    gradient: 'from-blue-950 via-slate-950 to-slate-950',
    accentColor: 'text-blue-400', emoji: '🔷',
    matchWeights: {
      'gender:man': 9, 'gender:both': 7,
      'budget:quality': 9, 'budget:invest': 7, 'budget:value': 5,
      'style:modern': 9, 'style:bold': 7,
      'motivation:status': 7, 'motivation:joy': 8, 'motivation:craft': 7,
      'watchAffinity:design': 8, 'watchAffinity:function': 9, 'watchAffinity:legacy': 6,
      'engagement:selective': 8, 'engagement:need_based': 7,
    },
    watches: {
      investmentGrade: 'B', wearOccasion: 'Everyday versatility',
      movementType: 'Auto, Co-Axial Chronometer', resaleStrength: 'Solid secondary market',
    },
  },
  {
    id: 'cartier-santos', name: 'Santos de Cartier', brand: 'Cartier',
    vertical: 'watches', price: 7500, priceDisplay: '$7,500+',
    tagline: "The world's first pilot's watch. The original icon.",
    description: 'Louis Cartier designed it in 1904 for aviator Alberto Santos-Dumont. Effortlessly interchangeable between genders.',
    gradient: 'from-rose-950 via-slate-950 to-slate-950',
    accentColor: 'text-rose-400', emoji: '🔴',
    matchWeights: {
      'gender:woman': 9, 'gender:both': 9, 'gender:man': 6,
      'budget:quality': 9, 'budget:invest': 8,
      'style:classic': 9, 'style:modern': 7, 'style:eclectic': 6,
      'motivation:status': 8, 'motivation:joy': 8, 'motivation:craft': 7,
      'watchAffinity:design': 9, 'watchAffinity:legacy': 8,
      'engagement:selective': 8,
    },
    watches: {
      investmentGrade: 'B+', wearOccasion: 'Business & casual',
      movementType: 'Automatic, Cal. 1847 MC', resaleStrength: 'Strong Cartier demand',
    },
  },
  {
    id: 'jlc-reverso', name: 'Reverso Duetto', brand: 'Jaeger-LeCoultre',
    vertical: 'watches', price: 12500, priceDisplay: '$12,500+',
    tagline: 'Art Deco poetry that flips the script.',
    description: 'Created for polo players in 1931, it hides a second dial beneath. Nothing else exists like it.',
    gradient: 'from-amber-950 via-slate-950 to-slate-950',
    accentColor: 'text-amber-400', emoji: '🟠',
    matchWeights: {
      'gender:woman': 9, 'gender:both': 8, 'gender:man': 5,
      'budget:invest': 9, 'budget:unlimited': 8,
      'style:classic': 10, 'style:eclectic': 8,
      'decision:research': 8,
      'motivation:craft': 10, 'motivation:joy': 8,
      'watchAffinity:movement': 9, 'watchAffinity:design': 10, 'watchAffinity:legacy': 9,
      'engagement:selective': 8, 'engagement:obsessed': 7,
    },
    watches: {
      investmentGrade: 'A', wearOccasion: 'Formal & evening',
      movementType: 'Manual-wind, Cal. 846', resaleStrength: 'Growing collector appreciation',
    },
  },
  {
    id: 'tudor-bb58', name: 'Black Bay 58', brand: 'Tudor',
    vertical: 'watches', price: 3700, priceDisplay: '$3,700+',
    tagline: 'Heritage without the waiting list.',
    description: "Rolex's sister brand, with genuine Swiss manufacturing DNA and a vintage soul. The most intelligent entry into this world.",
    gradient: 'from-zinc-800 via-slate-950 to-slate-950',
    accentColor: 'text-zinc-300', emoji: '⚫',
    matchWeights: {
      'gender:man': 9, 'gender:both': 7,
      'budget:value': 8, 'budget:quality': 9,
      'style:classic': 8, 'style:modern': 7, 'style:bold': 6,
      'motivation:craft': 7, 'motivation:joy': 9,
      'decision:research': 8,
      'watchAffinity:design': 8, 'watchAffinity:function': 8, 'watchAffinity:legacy': 7,
      'engagement:overwhelmed': 8, 'engagement:need_based': 7, 'engagement:selective': 7,
    },
    watches: {
      investmentGrade: 'B', wearOccasion: 'Daily wear, travels well',
      movementType: 'Automatic, MT5402', resaleStrength: 'Holds well, growing demand',
    },
  },
  {
    id: 'iwc-portugieser', name: 'Portugieser Chronograph', brand: 'IWC',
    vertical: 'watches', price: 8500, priceDisplay: '$8,500+',
    tagline: 'The intellectual\'s sport watch.',
    description: 'Aviation heritage meets Portuguese seafaring. A clean dial, powerful chronograph, and proportions that age like fine wine.',
    gradient: 'from-sky-950 via-slate-950 to-slate-950',
    accentColor: 'text-sky-400', emoji: '🔵',
    matchWeights: {
      'gender:man': 8, 'gender:both': 6,
      'budget:quality': 9, 'budget:invest': 8,
      'style:classic': 9, 'style:modern': 7,
      'decision:research': 9,
      'motivation:craft': 9, 'motivation:joy': 7,
      'watchAffinity:movement': 9, 'watchAffinity:design': 8, 'watchAffinity:function': 8,
      'engagement:obsessed': 7, 'engagement:selective': 8,
    },
    watches: {
      investmentGrade: 'B+', wearOccasion: 'Business to leisure',
      movementType: 'Automatic, Cal. 69355', resaleStrength: 'Good retention',
    },
  },

  // PERFUMES
  {
    id: 'creed-aventus', name: 'Aventus', brand: 'Creed',
    vertical: 'perfumes', price: 435, priceDisplay: '$435 / 3.3oz',
    tagline: 'Ambition in a bottle.',
    description: "Named after Napoleon's victories — pineapple and bergamot open, then birch smoke and ambergris close. The most imitated fragrance of the 21st century.",
    gradient: 'from-slate-800 via-zinc-950 to-slate-950',
    accentColor: 'text-zinc-300', emoji: '🖤',
    matchWeights: {
      'gender:man': 10, 'gender:both': 5,
      'budget:quality': 8, 'budget:invest': 7, 'budget:unlimited': 7,
      'style:bold': 8, 'style:modern': 7,
      'motivation:status': 9, 'motivation:craft': 7,
      'scentProfile:fresh': 7, 'scentProfile:bold': 8,
      'engagement:obsessed': 8, 'engagement:selective': 7,
    },
    perfumes: {
      notes: { top: ['Pineapple', 'Bergamot', 'Blackcurrant'], heart: ['Birch', 'Patchouli', 'Jasmine'], base: ['Ambergris', 'Oakmoss', 'Musk'] },
      bestMoments: ['Boardroom', 'First impression', 'Evening events'],
      longevity: 8, sillage: 'Powerful', gender: 'Men',
    },
  },
  {
    id: 'coco-mademoiselle', name: 'Coco Mademoiselle', brand: 'Chanel',
    vertical: 'perfumes', price: 180, priceDisplay: '$180 / 3.4oz',
    tagline: 'The modern Chanel woman.',
    description: "Not your grandmother's No.5 — this is Chanel's answer to confident femininity. Fresh citrus, a rose heart, grounded in warm vetiver.",
    gradient: 'from-red-950 via-slate-950 to-slate-950',
    accentColor: 'text-red-400', emoji: '🔴',
    matchWeights: {
      'gender:woman': 10, 'gender:both': 5,
      'budget:quality': 9, 'budget:value': 6, 'budget:invest': 6,
      'style:classic': 9, 'style:modern': 7,
      'motivation:status': 8, 'motivation:joy': 8,
      'scentProfile:fresh': 7, 'scentProfile:warm': 6, 'scentProfile:subtle': 7,
      'engagement:selective': 8, 'engagement:need_based': 7,
    },
    perfumes: {
      notes: { top: ['Orange', 'Bergamot', 'Mandarin'], heart: ['Rose', 'Ylang-Ylang', 'Mimosa'], base: ['Vetiver', 'Vanilla', 'White Musk'] },
      bestMoments: ['Daily signature', 'Office', 'Brunch', 'Date night'],
      longevity: 7, sillage: 'Moderate', gender: 'Women',
    },
  },
  {
    id: 'baccarat-rouge', name: 'Baccarat Rouge 540', brand: 'Maison Francis Kurkdjian',
    vertical: 'perfumes', price: 325, priceDisplay: '$325 / 2.4oz',
    tagline: "The scent everyone recognises but can't name.",
    description: "MFK's breakthrough — saffron and jasmine wrapped in warm amber-cedar. Unisex. Unforgettable. Everywhere at once, yet still rare.",
    gradient: 'from-orange-950 via-slate-950 to-slate-950',
    accentColor: 'text-orange-400', emoji: '🟠',
    matchWeights: {
      'gender:man': 7, 'gender:woman': 8, 'gender:both': 9, 'gender:gift': 9,
      'budget:quality': 9, 'budget:invest': 8, 'budget:unlimited': 7,
      'style:bold': 9, 'style:modern': 8, 'style:eclectic': 7,
      'motivation:status': 9, 'motivation:joy': 7,
      'scentProfile:warm': 10, 'scentProfile:bold': 8,
      'engagement:obsessed': 8, 'engagement:selective': 7,
    },
    perfumes: {
      notes: { top: ['Saffron', 'Jasmine'], heart: ['Ambroxan', 'Fir Resin'], base: ['Cedar', 'Ambergris'] },
      bestMoments: ['Evening out', 'Special occasions', 'Date night'],
      longevity: 9, sillage: 'Powerful', gender: 'Unisex',
    },
  },
  {
    id: 'jo-malone-wood-sage', name: 'Wood Sage & Sea Salt', brand: 'Jo Malone',
    vertical: 'perfumes', price: 155, priceDisplay: '$155 / 3.4oz',
    tagline: 'The ocean on your skin.',
    description: 'A walk along a windswept coastline. Mineral sea salt meets earthy sage — clean, grounding, and completely natural.',
    gradient: 'from-teal-950 via-slate-950 to-slate-950',
    accentColor: 'text-teal-400', emoji: '🩵',
    matchWeights: {
      'gender:woman': 8, 'gender:both': 9, 'gender:man': 7, 'gender:gift': 9,
      'budget:value': 7, 'budget:quality': 8,
      'style:modern': 8, 'style:classic': 6, 'style:eclectic': 6,
      'motivation:joy': 9,
      'scentProfile:fresh': 10, 'scentProfile:subtle': 8,
      'engagement:need_based': 7, 'engagement:selective': 7, 'engagement:overwhelmed': 8,
    },
    perfumes: {
      notes: { top: ['Sea Salt', 'Grapefruit'], heart: ['Sage', 'Ambrette Seeds'], base: ['Driftwood', 'Rock Rose'] },
      bestMoments: ['Morning', 'Weekend', 'Travel', 'Outdoors'],
      longevity: 5, sillage: 'Intimate', gender: 'Unisex',
    },
  },
  {
    id: 'dior-sauvage', name: 'Sauvage', brand: 'Dior',
    vertical: 'perfumes', price: 145, priceDisplay: '$145 / 3.4oz',
    tagline: 'The desert at golden hour.',
    description: "Bergamot and Sichuan pepper meet Ambroxan — the molecule that smells like clean skin at maximum. The world's best-selling men's fragrance.",
    gradient: 'from-sky-950 via-slate-950 to-slate-950',
    accentColor: 'text-sky-400', emoji: '🔷',
    matchWeights: {
      'gender:man': 10, 'gender:both': 5,
      'budget:value': 7, 'budget:quality': 8,
      'style:modern': 9, 'style:bold': 7,
      'motivation:status': 8, 'motivation:joy': 7,
      'scentProfile:fresh': 9, 'scentProfile:bold': 7,
      'engagement:need_based': 8, 'engagement:overwhelmed': 7, 'engagement:selective': 6,
    },
    perfumes: {
      notes: { top: ['Calabrian Bergamot', 'Pepper'], heart: ['Lavender', 'Pink Pepper', 'Vetiver'], base: ['Ambroxan', 'Cedar', 'Labdanum'] },
      bestMoments: ['Everyday', 'Office', 'Date', 'Sport'],
      longevity: 8, sillage: 'Moderate', gender: 'Men',
    },
  },
  {
    id: 'ysl-black-opium', name: 'Black Opium', brand: 'Yves Saint Laurent',
    vertical: 'perfumes', price: 120, priceDisplay: '$120 / 3oz',
    tagline: 'Coffee and neon lights.',
    description: 'Pink pepper, coffee, and white florals create something dark, energetic, and completely magnetic. For the woman who owns every room she enters.',
    gradient: 'from-purple-950 via-slate-950 to-slate-950',
    accentColor: 'text-purple-400', emoji: '🟣',
    matchWeights: {
      'gender:woman': 10,
      'budget:value': 8, 'budget:quality': 7,
      'style:bold': 9, 'style:modern': 7,
      'motivation:status': 7, 'motivation:joy': 8,
      'scentProfile:bold': 9, 'scentProfile:warm': 8,
      'engagement:need_based': 7, 'engagement:selective': 7,
    },
    perfumes: {
      notes: { top: ['Pink Pepper', 'Orange Blossom', 'Pear'], heart: ['Coffee', 'Jasmine', 'Bitter Almond'], base: ['Patchouli', 'Vanilla', 'Cedarwood'] },
      bestMoments: ['Evening', 'Night out', 'Date night'],
      longevity: 7, sillage: 'Moderate', gender: 'Women',
    },
  },
  {
    id: 'byredo-bal-dafrique', name: "Bal d'Afrique", brand: 'Byredo',
    vertical: 'perfumes', price: 295, priceDisplay: '$295 / 3.4oz',
    tagline: 'Sun-drenched and utterly free.',
    description: 'Inspired by 1920s Paris — bergamot, violet, and African marigold into something warm, joyful, and entirely its own.',
    gradient: 'from-yellow-950 via-slate-950 to-slate-950',
    accentColor: 'text-yellow-400', emoji: '🟡',
    matchWeights: {
      'gender:woman': 7, 'gender:both': 9, 'gender:man': 6, 'gender:gift': 8,
      'budget:quality': 9, 'budget:invest': 7,
      'style:eclectic': 10, 'style:bold': 7, 'style:modern': 6,
      'motivation:joy': 9, 'motivation:craft': 7,
      'scentProfile:fresh': 7, 'scentProfile:warm': 7, 'scentProfile:subtle': 6,
      'engagement:selective': 9, 'engagement:obsessed': 8,
    },
    perfumes: {
      notes: { top: ['Bergamot', 'Lemon', 'African Marigold'], heart: ['Violet', 'Cyclamen', 'Neroli'], base: ['Musk', 'Vetiver', 'Cedarwood'] },
      bestMoments: ['Summer', 'Travel', 'Casual', 'Weekend'],
      longevity: 6, sillage: 'Moderate', gender: 'Unisex',
    },
  },
  {
    id: 'pdm-layton', name: 'Layton', brand: 'Parfums de Marly',
    vertical: 'perfumes', price: 395, priceDisplay: '$395 / 4.2oz',
    tagline: 'Royally generous. Unmistakably present.',
    description: 'Apple, bergamot, and violet warm into sandalwood and vanilla. Commands rooms without demanding attention.',
    gradient: 'from-emerald-950 via-slate-950 to-slate-950',
    accentColor: 'text-emerald-400', emoji: '🟢',
    matchWeights: {
      'gender:man': 8, 'gender:both': 7, 'gender:gift': 8,
      'budget:quality': 9, 'budget:invest': 8, 'budget:unlimited': 7,
      'style:classic': 8, 'style:bold': 7,
      'motivation:status': 8, 'motivation:craft': 7,
      'scentProfile:warm': 9, 'scentProfile:bold': 7,
      'engagement:obsessed': 8, 'engagement:selective': 8,
    },
    perfumes: {
      notes: { top: ['Apple', 'Bergamot', 'Violet', 'Geranium'], heart: ['Jasmine', 'Pepper', 'Cardamom'], base: ['Sandalwood', 'Vanilla', 'Guaiac Wood'] },
      bestMoments: ['Evening', 'Business', 'Formal events', 'Winter'],
      longevity: 9, sillage: 'Powerful', gender: 'Men / Unisex',
    },
  },

  // TRAVEL
  {
    id: 'kyoto', name: 'Kyoto', brand: 'Japan',
    vertical: 'travel', price: 3500, priceDisplay: '$3,500 est. / week',
    tagline: 'A living museum that breathes.',
    description: 'Seventeen UNESCO sites, Michelin stars in every neighbourhood, ryokan inns with 400-year traditions. The most curated city on earth.',
    gradient: 'from-rose-950 via-slate-950 to-slate-950',
    accentColor: 'text-rose-400', emoji: '⛩️',
    matchWeights: {
      'style:classic': 9, 'style:eclectic': 8,
      'decision:research': 9, 'decision:trial': 7,
      'motivation:craft': 10, 'motivation:joy': 8,
      'travelEnergy:culture': 10, 'travelEnergy:rest': 6,
      'engagement:selective': 9, 'engagement:obsessed': 8,
      'budget:quality': 8, 'budget:invest': 7,
    },
    travel: {
      hiddenGemScore: 6, energyLevel: 'Medium',
      bestFor: ['Cultural immersion', 'Food tourism', 'Photography', 'Solo travel'],
      thingsToSkip: 'Nijo Castle on weekends — the crowds undo the serenity',
      bestTimeToVisit: 'March–April (cherry blossom) or November (autumn leaves)',
    },
  },
  {
    id: 'amalfi', name: 'Amalfi Coast', brand: 'Italy',
    vertical: 'travel', price: 4500, priceDisplay: '$4,500 est. / week',
    tagline: 'Where the mountains fall into the sea.',
    description: 'Cliff-side villages, turquoise coves, fresh seafood at sunset. The most glamorous coastline in the Mediterranean — and it knows it.',
    gradient: 'from-blue-950 via-slate-950 to-slate-950',
    accentColor: 'text-blue-400', emoji: '🏖️',
    matchWeights: {
      'style:classic': 9, 'style:bold': 7,
      'gender:woman': 8, 'gender:both': 8,
      'motivation:status': 8, 'motivation:joy': 9,
      'travelEnergy:rest': 9, 'travelEnergy:culture': 7,
      'budget:quality': 9, 'budget:unlimited': 8, 'budget:invest': 7,
      'decision:gut': 8, 'engagement:selective': 8,
    },
    travel: {
      hiddenGemScore: 4, energyLevel: 'Low',
      bestFor: ['Couples', 'Romance', 'Luxury retreat', 'Food & wine'],
      thingsToSkip: 'Driving the Amalfi Road in July — take the ferry instead',
      bestTimeToVisit: 'May–June or September (before and after peak season)',
    },
  },
  {
    id: 'patagonia', name: 'Patagonia', brand: 'Chile / Argentina',
    vertical: 'travel', price: 4800, priceDisplay: '$4,800 est. / week',
    tagline: 'The end of the world. The start of something.',
    description: 'Torres del Paine, Los Glaciares, the end of civilisation as you know it. Dramatic scenery that makes every other landscape feel like a warm-up.',
    gradient: 'from-cyan-950 via-slate-950 to-slate-950',
    accentColor: 'text-cyan-400', emoji: '🏔️',
    matchWeights: {
      'style:bold': 9, 'style:eclectic': 8,
      'motivation:joy': 9, 'motivation:craft': 7,
      'travelEnergy:adventure': 10, 'travelEnergy:culture': 5,
      'decision:gut': 8, 'decision:trial': 7,
      'engagement:obsessed': 8, 'engagement:selective': 7,
      'budget:quality': 8, 'budget:invest': 7,
    },
    travel: {
      hiddenGemScore: 7, energyLevel: 'High',
      bestFor: ['Solo adventurers', 'Couples', 'Hiking', 'Photography'],
      thingsToSkip: 'The W Trek without pre-booked huts — fills up months ahead',
      bestTimeToVisit: 'November–March (southern hemisphere summer)',
    },
  },
  {
    id: 'maldives', name: 'The Maldives', brand: 'Indian Ocean',
    vertical: 'travel', price: 6500, priceDisplay: '$6,500 est. / week',
    tagline: 'Where the only decision is hammock or pool.',
    description: "1,200 islands, 200 inhabited, and you'll have one nearly to yourself. Overwater villas, bioluminescent bays, coral reefs still untouched.",
    gradient: 'from-teal-950 via-slate-950 to-slate-950',
    accentColor: 'text-teal-400', emoji: '🏝️',
    matchWeights: {
      'style:modern': 7, 'style:bold': 6,
      'gender:both': 9, 'gender:woman': 8,
      'motivation:joy': 10, 'motivation:status': 8,
      'travelEnergy:rest': 10, 'travelEnergy:culture': 3,
      'decision:gut': 9,
      'budget:unlimited': 10, 'budget:invest': 7, 'budget:quality': 7,
      'engagement:need_based': 7,
    },
    travel: {
      hiddenGemScore: 4, energyLevel: 'Low',
      bestFor: ['Honeymoon', 'Couples', 'Digital detox', 'Diving'],
      thingsToSkip: "Guesthouses on Malé — you're here for a resort, commit to it",
      bestTimeToVisit: 'November–April (dry season)',
    },
  },
  {
    id: 'morocco', name: 'Morocco', brand: 'North Africa',
    vertical: 'travel', price: 2500, priceDisplay: '$2,500 est. / week',
    tagline: 'All five senses, at once.',
    description: "Marrakech medinas, Sahara nights, Fes artisans, Essaouira winds. A country that hits like a fragrance — overwhelming at first, impossible to forget.",
    gradient: 'from-amber-950 via-slate-950 to-slate-950',
    accentColor: 'text-amber-400', emoji: '🕌',
    matchWeights: {
      'style:eclectic': 10, 'style:bold': 8,
      'motivation:joy': 9, 'motivation:craft': 8,
      'travelEnergy:culture': 10, 'travelEnergy:adventure': 7, 'travelEnergy:urban': 6,
      'decision:gut': 8, 'decision:social': 7,
      'budget:value': 9, 'budget:quality': 8,
      'engagement:selective': 8, 'engagement:obsessed': 7,
    },
    travel: {
      hiddenGemScore: 6, energyLevel: 'Medium',
      bestFor: ['Culture seekers', 'Solo travel', 'Photography', 'Food'],
      thingsToSkip: 'The Jemaa el-Fna snake charmers — pure tourist performance',
      bestTimeToVisit: 'March–May or October–November',
    },
  },
  {
    id: 'iceland', name: 'Iceland', brand: 'North Atlantic',
    vertical: 'travel', price: 4200, priceDisplay: '$4,200 est. / week',
    tagline: 'Where nature broke all the rules.',
    description: 'Active volcanoes, a waterfall every 20 minutes, Northern Lights if you time it right. An island that refuses to be anything but extraordinary.',
    gradient: 'from-indigo-950 via-slate-950 to-slate-950',
    accentColor: 'text-indigo-400', emoji: '🌋',
    matchWeights: {
      'style:eclectic': 9, 'style:bold': 8,
      'motivation:joy': 9,
      'travelEnergy:adventure': 9, 'travelEnergy:culture': 6,
      'decision:research': 7, 'decision:gut': 7,
      'budget:quality': 8,
      'engagement:obsessed': 7, 'engagement:selective': 7,
    },
    travel: {
      hiddenGemScore: 6, energyLevel: 'High',
      bestFor: ['Adventure couples', 'Photographers', 'Hikers', 'Nature lovers'],
      thingsToSkip: 'The Blue Lagoon — overpriced; try the Secret Lagoon instead',
      bestTimeToVisit: 'June–August (midnight sun) or November–March (Northern Lights)',
    },
  },
  {
    id: 'bali', name: 'Bali', brand: 'Indonesia',
    vertical: 'travel', price: 2000, priceDisplay: '$2,000 est. / week',
    tagline: 'Ancient ritual meets morning yoga.',
    description: "Rice terraces, temple ceremonies at dawn, surfable breaks, and a private-pool villa that costs less than a hotel room anywhere else.",
    gradient: 'from-green-950 via-slate-950 to-slate-950',
    accentColor: 'text-green-400', emoji: '🌿',
    matchWeights: {
      'gender:woman': 8, 'gender:both': 8,
      'style:eclectic': 8, 'style:modern': 6,
      'motivation:joy': 9,
      'travelEnergy:rest': 8, 'travelEnergy:culture': 7, 'travelEnergy:adventure': 6,
      'budget:value': 10, 'budget:quality': 8,
      'decision:gut': 8, 'decision:social': 7,
      'engagement:overwhelmed': 8, 'engagement:need_based': 7,
    },
    travel: {
      hiddenGemScore: 5, energyLevel: 'Low',
      bestFor: ['Wellness', 'Budget luxury', 'Solo female travel', 'Digital nomads'],
      thingsToSkip: "Kuta — it's Bali's tourist trap; base yourself in Ubud or Canggu",
      bestTimeToVisit: 'April–October (dry season)',
    },
  },
  {
    id: 'dubai', name: 'Dubai', brand: 'UAE',
    vertical: 'travel', price: 3800, priceDisplay: '$3,800 est. / week',
    tagline: 'Ambition built into skyline.',
    description: "The world's most luxurious airport is just the start. The Burj Khalifa, private beach clubs, Michelin dining at 150 floors up, and shopping that never ends.",
    gradient: 'from-yellow-950 via-slate-950 to-slate-950',
    accentColor: 'text-yellow-400', emoji: '🏙️',
    matchWeights: {
      'style:modern': 9, 'style:bold': 9,
      'motivation:status': 10, 'motivation:joy': 7,
      'travelEnergy:urban': 10, 'travelEnergy:rest': 5,
      'budget:unlimited': 10, 'budget:invest': 7, 'budget:quality': 8,
      'decision:gut': 8, 'engagement:selective': 7,
    },
    travel: {
      hiddenGemScore: 3, energyLevel: 'Medium',
      bestFor: ['Luxury shopping', 'Layover upgrade', 'City breaks', 'Business travel'],
      thingsToSkip: 'Visiting July–August — 45°C heat makes outdoors impossible',
      bestTimeToVisit: 'November–March (perfect cool weather)',
    },
  },

  // ELECTRONICS
  {
    id: 'iphone-16-pro', name: 'iPhone 16 Pro', brand: 'Apple',
    vertical: 'electronics', price: 999, priceDisplay: '$999+',
    tagline: 'The camera. The ecosystem. The standard.',
    description: "The choice when everything should just work — photography, messaging, payments, security. No decisions, no second-guessing.",
    gradient: 'from-gray-900 via-slate-950 to-slate-950',
    accentColor: 'text-gray-300', emoji: '📱',
    matchWeights: {
      'budget:quality': 8, 'budget:invest': 7, 'budget:unlimited': 7,
      'style:modern': 9, 'style:classic': 7,
      'motivation:status': 8, 'motivation:joy': 7,
      'techPhilosophy:simple': 10, 'techPhilosophy:cutting_edge': 8,
      'decision:gut': 9, 'decision:social': 8,
      'engagement:need_based': 8, 'engagement:overwhelmed': 9, 'engagement:selective': 7,
    },
    electronics: {
      category: 'Smartphone',
      featuresYouWill: ['Camera system', 'Face ID', 'Apple Pay', 'iMessage', 'App quality'],
      featuresYouWont: ['Action button customisation', 'ProRes video (unless you film professionally)'],
      buyerRegretRisk: 'Low', threeYearCost: '~$1,200 (strong resale)', upgradeIn: '3–4 years',
    },
  },
  {
    id: 'macbook-pro-m4', name: 'MacBook Pro 14" M4', brand: 'Apple',
    vertical: 'electronics', price: 1599, priceDisplay: '$1,599+',
    tagline: 'The machine that redefines what a laptop can do.',
    description: 'The M4 chip is simultaneously the most powerful and most efficient laptop ever made. Runs all day. Cool and silent. Handles anything.',
    gradient: 'from-slate-800 via-slate-950 to-slate-950',
    accentColor: 'text-slate-300', emoji: '💻',
    matchWeights: {
      'budget:quality': 9, 'budget:invest': 8, 'budget:unlimited': 8,
      'style:modern': 9, 'style:classic': 7,
      'motivation:craft': 8, 'motivation:joy': 7,
      'techPhilosophy:simple': 9, 'techPhilosophy:power': 8, 'techPhilosophy:cutting_edge': 8,
      'decision:research': 8, 'engagement:selective': 9, 'engagement:obsessed': 7,
    },
    electronics: {
      category: 'Laptop',
      featuresYouWill: ['All-day battery', 'Speed for any task', 'Display quality', 'Build quality'],
      featuresYouWont: ['ProMotion display (barely noticeable day-to-day)', 'HDMI port (most use USB-C)'],
      buyerRegretRisk: 'Low', threeYearCost: '~$1,800 (strong resale)', upgradeIn: '4–5 years',
    },
  },
  {
    id: 'sony-xm5', name: 'WH-1000XM5', brand: 'Sony',
    vertical: 'electronics', price: 349, priceDisplay: '$349',
    tagline: 'The silence you\'ve been looking for.',
    description: 'Industry-leading noise cancellation, 30-hour battery, sound that audiophiles respect. The benchmark every other headphone is measured against.',
    gradient: 'from-zinc-800 via-slate-950 to-slate-950',
    accentColor: 'text-zinc-300', emoji: '🎧',
    matchWeights: {
      'budget:value': 9, 'budget:quality': 8,
      'style:modern': 8,
      'motivation:joy': 9, 'motivation:craft': 7,
      'techPhilosophy:simple': 8, 'techPhilosophy:value': 9,
      'decision:research': 8, 'decision:gut': 7,
      'engagement:selective': 8, 'engagement:overwhelmed': 7,
    },
    electronics: {
      category: 'Headphones',
      featuresYouWill: ['Noise cancellation', 'Battery life', 'Call quality', 'Daily comfort'],
      featuresYouWont: ['LDAC codec (unless you have a Hi-Res audio library)', '360 Spatial Sound (niche)'],
      buyerRegretRisk: 'Low', threeYearCost: '~$349 (no subscription)', upgradeIn: '4–5 years',
    },
  },
  {
    id: 'samsung-s24-ultra', name: 'Galaxy S24 Ultra', brand: 'Samsung',
    vertical: 'electronics', price: 1299, priceDisplay: '$1,299+',
    tagline: 'The phone that replaces your notebook.',
    description: 'The S Pen, a 200MP camera, and Galaxy AI make this the only smartphone that adds capabilities you genuinely cannot get elsewhere.',
    gradient: 'from-violet-950 via-slate-950 to-slate-950',
    accentColor: 'text-violet-400', emoji: '📲',
    matchWeights: {
      'budget:quality': 8, 'budget:invest': 7,
      'style:bold': 8, 'style:modern': 8,
      'motivation:status': 7, 'motivation:craft': 6,
      'techPhilosophy:cutting_edge': 10, 'techPhilosophy:power': 9, 'techPhilosophy:value': 6,
      'decision:research': 9, 'engagement:obsessed': 9, 'engagement:selective': 7,
    },
    electronics: {
      category: 'Smartphone',
      featuresYouWill: ['S Pen note-taking', '200MP zoom camera', 'Galaxy AI', 'Large screen'],
      featuresYouWont: ['Satellite messaging (limited coverage)', 'Full 200MP mode (auto-downsizes for storage)'],
      buyerRegretRisk: 'Medium', threeYearCost: '~$1,500 (slightly lower resale)', upgradeIn: '2–3 years',
    },
  },
  {
    id: 'ipad-pro-m4', name: 'iPad Pro 13" M4', brand: 'Apple',
    vertical: 'electronics', price: 1299, priceDisplay: '$1,299+',
    tagline: 'Supercomputer. 5.1mm thin.',
    description: 'The M4 chip inside is faster than most laptops. With Apple Pencil Pro and Magic Keyboard, it replaces a laptop for most people.',
    gradient: 'from-blue-950 via-slate-950 to-slate-950',
    accentColor: 'text-blue-400', emoji: '📋',
    matchWeights: {
      'budget:quality': 9, 'budget:unlimited': 8,
      'style:modern': 9,
      'motivation:craft': 9, 'motivation:joy': 7,
      'techPhilosophy:cutting_edge': 9, 'techPhilosophy:power': 8, 'techPhilosophy:simple': 7,
      'decision:research': 8, 'engagement:obsessed': 8, 'engagement:selective': 8,
    },
    electronics: {
      category: 'Tablet',
      featuresYouWill: ['Drawing & design', 'Video consumption', 'Reading', 'Portability'],
      featuresYouWont: ['Full M4 chip power (iPadOS limits it)', 'Desktop-grade video editing'],
      buyerRegretRisk: 'Medium', threeYearCost: '~$1,500 (add accessories)', upgradeIn: '4–5 years',
    },
  },
  {
    id: 'sony-a7rv', name: 'Alpha 7R V', brand: 'Sony',
    vertical: 'electronics', price: 3499, priceDisplay: '$3,499',
    tagline: 'For those who photograph, not just shoot.',
    description: '61 megapixels, AI-powered autofocus, and a sensor that sees in near-darkness. When serious photographers stop compromising.',
    gradient: 'from-orange-950 via-slate-950 to-slate-950',
    accentColor: 'text-orange-400', emoji: '📷',
    matchWeights: {
      'budget:invest': 9, 'budget:unlimited': 8, 'budget:quality': 7,
      'style:bold': 7, 'style:eclectic': 8,
      'motivation:craft': 10, 'motivation:joy': 8,
      'techPhilosophy:power': 10, 'techPhilosophy:cutting_edge': 8,
      'decision:research': 10, 'engagement:obsessed': 10, 'engagement:selective': 8,
    },
    electronics: {
      category: 'Camera',
      featuresYouWill: ['61MP resolution', 'Best-in-class AF', 'Low-light performance', 'Build quality'],
      featuresYouWont: ['8-stop IBIS (more impactful for video)', 'AI subject modes (earlier modes handle most scenes fine)'],
      buyerRegretRisk: 'Low', threeYearCost: '~$4,200 (add lenses, holds value)', upgradeIn: '5+ years',
    },
  },
  {
    id: 'sonos-era-300', name: 'Era 300', brand: 'Sonos',
    vertical: 'electronics', price: 449, priceDisplay: '$449',
    tagline: 'Spatial audio that changes what a room sounds like.',
    description: "Dolby Atmos, six-driver acoustic architecture, and the Sonos ecosystem. What music sounds like when the speaker disappears into the sound.",
    gradient: 'from-emerald-950 via-slate-950 to-slate-950',
    accentColor: 'text-emerald-400', emoji: '🔊',
    matchWeights: {
      'budget:quality': 9, 'budget:invest': 7,
      'style:modern': 9, 'style:classic': 6,
      'motivation:craft': 9, 'motivation:joy': 9,
      'techPhilosophy:simple': 8, 'techPhilosophy:cutting_edge': 8,
      'decision:gut': 7, 'decision:research': 8,
      'engagement:selective': 9,
    },
    electronics: {
      category: 'Speaker',
      featuresYouWill: ['Spatial audio', 'Multi-room audio', 'App simplicity', 'Sound quality'],
      featuresYouWont: ['Full Dolby Atmos benefit (needs Atmos-mixed content)', 'Deep bass (add Sonos Sub for serious bass)'],
      buyerRegretRisk: 'Low', threeYearCost: '~$449 (no subscription)', upgradeIn: '6+ years',
    },
  },
  {
    id: 'dji-mini-4-pro', name: 'Mini 4 Pro', brand: 'DJI',
    vertical: 'electronics', price: 759, priceDisplay: '$759+',
    tagline: 'Cinema-grade sky footage. Under 250g.',
    description: 'Under 250g means no registration in most countries. Shoots 4K/60fps HDR, omnidirectional obstacle sensing, fits in a jacket pocket.',
    gradient: 'from-sky-950 via-slate-950 to-slate-950',
    accentColor: 'text-sky-400', emoji: '🚁',
    matchWeights: {
      'budget:value': 9, 'budget:quality': 8,
      'style:bold': 7, 'style:eclectic': 7,
      'motivation:joy': 9, 'motivation:craft': 8,
      'techPhilosophy:cutting_edge': 8, 'techPhilosophy:value': 8,
      'travelEnergy:adventure': 8, 'travelEnergy:culture': 6,
      'decision:research': 7, 'decision:gut': 7,
      'engagement:obsessed': 8, 'engagement:selective': 7,
    },
    electronics: {
      category: 'Drone',
      featuresYouWill: ['Travel portability', '4K video', 'Obstacle sensing', 'Ease of use'],
      featuresYouWont: ['4K/60fps on most displays', 'ActiveTrack in all modes (some country restrictions)'],
      buyerRegretRisk: 'Low', threeYearCost: '~$900 (batteries + case)', upgradeIn: '3–4 years',
    },
  },
];
