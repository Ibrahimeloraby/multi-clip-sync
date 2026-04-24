export interface Mood {
  id: string;
  label: string;
  emoji: string;
  description: string;
  genres: string[];
  gradient: string;
  borderColor: string;
}

export const MOODS: Mood[] = [
  {
    id: 'happy',
    label: 'Happy & Joyful',
    emoji: '😊',
    description: 'Light reads that warm your heart',
    genres: ['feel-good', 'comedy', 'contemporary-fiction', 'humor', 'romance'],
    gradient: 'from-yellow-50 to-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'adventurous',
    label: 'Adventurous',
    emoji: '🗺️',
    description: 'Bold journeys & epic discoveries',
    genres: ['adventure', 'travel', 'action', 'survival', 'historical-fiction'],
    gradient: 'from-emerald-50 to-green-50',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'romantic',
    label: 'Romantic',
    emoji: '💕',
    description: 'Love stories & heartfelt connections',
    genres: ['romance', 'contemporary-romance', 'historical-romance', 'love-story'],
    gradient: 'from-pink-50 to-rose-50',
    borderColor: 'border-pink-200',
  },
  {
    id: 'nostalgic',
    label: 'Nostalgic',
    emoji: '🌅',
    description: 'Timeless tales that take you back',
    genres: ['classic-literature', 'historical-fiction', 'memoir', 'coming-of-age'],
    gradient: 'from-orange-50 to-amber-50',
    borderColor: 'border-orange-200',
  },
  {
    id: 'thrilled',
    label: 'Thrilled & Tense',
    emoji: '😱',
    description: 'Edge-of-your-seat suspense',
    genres: ['thriller', 'mystery', 'suspense', 'crime', 'psychological'],
    gradient: 'from-red-50 to-rose-50',
    borderColor: 'border-red-200',
  },
  {
    id: 'cozy',
    label: 'Cozy & Peaceful',
    emoji: '☕',
    description: 'Warm reads for quiet evenings',
    genres: ['cozy-mystery', 'slice-of-life', 'domestic-fiction', 'nature', 'cozy'],
    gradient: 'from-amber-50 to-yellow-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'curious',
    label: 'Curious & Inspired',
    emoji: '🔬',
    description: 'Ideas that expand your world',
    genres: ['non-fiction', 'science', 'biography', 'self-help', 'philosophy', 'history', 'psychology'],
    gradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'fantasy',
    label: 'Fantasy & Dreamy',
    emoji: '✨',
    description: 'Magical worlds beyond imagination',
    genres: ['fantasy', 'sci-fi', 'magical-realism', 'mythology', 'magic'],
    gradient: 'from-purple-50 to-violet-50',
    borderColor: 'border-purple-200',
  },
  {
    id: 'dark',
    label: 'Dark & Mysterious',
    emoji: '🌙',
    description: 'Gothic shadows & noir mysteries',
    genres: ['gothic', 'dark-fiction', 'horror', 'literary-fiction', 'noir', 'dystopian'],
    gradient: 'from-slate-50 to-gray-100',
    borderColor: 'border-slate-300',
  },
  {
    id: 'funny',
    label: 'Funny & Witty',
    emoji: '😄',
    description: 'Books that make you laugh out loud',
    genres: ['humor', 'satire', 'comedy', 'wit', 'parody'],
    gradient: 'from-lime-50 to-green-50',
    borderColor: 'border-lime-200',
  },
  {
    id: 'emotional',
    label: 'Emotional & Moving',
    emoji: '😢',
    description: 'Stories that move you deeply',
    genres: ['literary-fiction', 'drama', 'family-saga', 'contemporary-fiction', 'grief'],
    gradient: 'from-sky-50 to-blue-50',
    borderColor: 'border-sky-200',
  },
  {
    id: 'spiritual',
    label: 'Spiritual & Reflective',
    emoji: '🙏',
    description: 'Inner journeys & timeless wisdom',
    genres: ['spirituality', 'philosophy', 'mindfulness', 'self-discovery', 'philosophical'],
    gradient: 'from-teal-50 to-cyan-50',
    borderColor: 'border-teal-200',
  },
];
