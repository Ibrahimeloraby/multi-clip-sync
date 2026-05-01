import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTasteProfile } from '@/hooks/useTasteProfile';
import { TasteProfile } from '@/lib/tasteEngine';

interface QuizOption {
  value: string;
  label: string;
  sub: string;
  emoji: string;
}

interface QuizQuestion {
  key: keyof TasteProfile;
  question: string;
  hint: string;
  options: QuizOption[];
}

const questions: QuizQuestion[] = [
  {
    key: 'gender',
    question: 'To start — who are we curating this for?',
    hint: 'This shapes every recommendation.',
    options: [
      { value: 'man', label: 'Myself (Man)', sub: 'Personal wishlist', emoji: '👔' },
      { value: 'woman', label: 'Myself (Woman)', sub: 'Personal wishlist', emoji: '👗' },
      { value: 'both', label: 'Both of us', sub: 'Couples & shared taste', emoji: '💑' },
      { value: 'gift', label: 'A gift', sub: 'For someone special', emoji: '🎁' },
    ],
  },
  {
    key: 'budget',
    question: 'Your relationship with price?',
    hint: 'Honest answers give better matches.',
    options: [
      { value: 'value', label: 'Smart Value', sub: 'Best quality per dollar', emoji: '💡' },
      { value: 'quality', label: 'Quality First', sub: 'Price follows, never leads', emoji: '⭐' },
      { value: 'invest', label: 'I Invest', sub: 'Things that hold value', emoji: '📈' },
      { value: 'unlimited', label: 'Limitless', sub: 'Price is not the equation', emoji: '♾️' },
    ],
  },
  {
    key: 'style',
    question: 'Your personal aesthetic?',
    hint: 'Go with what you\'d buy, not what sounds good.',
    options: [
      { value: 'classic', label: 'Classic & Timeless', sub: 'Enduring over trending', emoji: '🏛️' },
      { value: 'modern', label: 'Modern & Minimal', sub: 'Less is always more', emoji: '◻️' },
      { value: 'bold', label: 'Bold & Statement', sub: 'To be remembered', emoji: '🔥' },
      { value: 'eclectic', label: 'Eclectic & Unique', sub: 'One-of-a-kind only', emoji: '🎨' },
    ],
  },
  {
    key: 'decision',
    question: 'When you need to decide, you...',
    hint: 'Think of your last big purchase.',
    options: [
      { value: 'gut', label: 'Trust my gut', sub: 'Instant recognition', emoji: '⚡' },
      { value: 'research', label: 'Research deeply', sub: 'Every detail, every review', emoji: '🔬' },
      { value: 'social', label: 'Ask experts', sub: 'Trusted voices I follow', emoji: '💬' },
      { value: 'trial', label: 'Try first', sub: 'Experience before commitment', emoji: '🤲' },
    ],
  },
  {
    key: 'motivation',
    question: 'Why do you actually buy luxury?',
    hint: 'The most honest answer is the most useful.',
    options: [
      { value: 'craft', label: 'The Craft', sub: 'Excellence in the details', emoji: '🛠️' },
      { value: 'status', label: 'The Statement', sub: 'The impression it makes', emoji: '👁️' },
      { value: 'joy', label: 'Pure Joy', sub: 'Personal delight only', emoji: '💫' },
      { value: 'investment', label: 'The Investment', sub: 'Value beyond the purchase', emoji: '📊' },
    ],
  },
  {
    key: 'watchAffinity',
    question: 'What about a watch captivates you?',
    hint: 'Even if you don\'t wear one yet.',
    options: [
      { value: 'movement', label: 'The Movement', sub: 'Mechanical poetry inside', emoji: '⚙️' },
      { value: 'design', label: 'The Design', sub: 'Art on your wrist', emoji: '🎨' },
      { value: 'legacy', label: 'The Heritage', sub: 'A century of legend', emoji: '🏰' },
      { value: 'function', label: 'The Function', sub: 'Built for real life', emoji: '🧭' },
    ],
  },
  {
    key: 'scentProfile',
    question: 'Your ideal fragrance should make you feel...',
    hint: 'Trust instinct, not description.',
    options: [
      { value: 'fresh', label: 'Fresh & Powerful', sub: 'Clean, confident energy', emoji: '🌊' },
      { value: 'warm', label: 'Warm & Magnetic', sub: 'Depth and intimacy', emoji: '🔥' },
      { value: 'bold', label: 'Bold & Unforgettable', sub: 'A trail people remember', emoji: '⚡' },
      { value: 'subtle', label: 'Soft & Effortless', sub: 'Quietly beautiful', emoji: '🌸' },
    ],
  },
  {
    key: 'travelEnergy',
    question: 'Your perfect escape looks like...',
    hint: 'Ignore budget for this one.',
    options: [
      { value: 'rest', label: 'Complete Rest', sub: 'Stillness and recharge', emoji: '🏝️' },
      { value: 'culture', label: 'Culture & Discovery', sub: 'History and local life', emoji: '🏛️' },
      { value: 'adventure', label: 'Adventure', sub: 'Physical, wild, alive', emoji: '🏔️' },
      { value: 'urban', label: 'Urban Energy', sub: 'Cities that never stop', emoji: '🌆' },
    ],
  },
  {
    key: 'techPhilosophy',
    question: 'Technology should be...',
    hint: 'What do you actually want from it?',
    options: [
      { value: 'simple', label: 'Invisible', sub: 'Just works, no thinking', emoji: '🎯' },
      { value: 'cutting_edge', label: 'Cutting-Edge', sub: 'Latest before everyone else', emoji: '🚀' },
      { value: 'value', label: 'Best Value', sub: 'Smart spend, max return', emoji: '💎' },
      { value: 'power', label: 'Maximum Power', sub: 'Professional-grade capability', emoji: '💪' },
    ],
  },
  {
    key: 'engagement',
    question: 'Your relationship with luxury discovery?',
    hint: 'No wrong answer — this shapes how we explain things.',
    options: [
      { value: 'obsessed', label: 'Obsessed', sub: 'I know what\'s coming next', emoji: '🔍' },
      { value: 'selective', label: 'Informed & Selective', sub: 'I know what I like', emoji: '📚' },
      { value: 'need_based', label: 'Need-Based', sub: 'When I need it, I find it', emoji: '💭' },
      { value: 'overwhelmed', label: 'Overwhelmed', sub: 'Too many choices — help', emoji: '😅' },
    ],
  },
];

export default function TasteQuiz() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnVertical = searchParams.get('vertical') || 'watches';
  const { saveProfile } = useTasteProfile();

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Partial<TasteProfile>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const q = questions[current];
  const progress = ((current) / questions.length) * 100;

  const handleSelect = (value: string) => {
    if (selected) return;
    setSelected(value);

    setTimeout(() => {
      const newAnswers = { ...answers, [q.key]: value };
      setAnswers(newAnswers);

      if (current < questions.length - 1) {
        setVisible(false);
        setTimeout(() => {
          setCurrent(c => c + 1);
          setSelected(null);
          setVisible(true);
        }, 200);
      } else {
        setFinishing(true);
        const profile = newAnswers as TasteProfile;
        saveProfile(profile);
        setTimeout(() => navigate(`/recommendations/${returnVertical}`), 1200);
      }
    }, 380);
  };

  useEffect(() => {
    setVisible(true);
  }, [current]);

  if (finishing) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Building your profile</h2>
          <p className="text-zinc-400 text-sm">Matching your taste across thousands of options…</p>
          <div className="mt-8 flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Progress */}
      <div className="px-6 pt-14 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => current > 0 ? setCurrent(c => c - 1) : navigate('/recommendations')}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            ← Back
          </button>
          <span className="text-zinc-500 text-sm">{current + 1} / {questions.length}</span>
        </div>
        <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${progress + (100 / questions.length)}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div
        className="flex-1 px-6 pt-8 pb-6 flex flex-col"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white leading-tight mb-2">{q.question}</h2>
          <p className="text-zinc-500 text-sm">{q.hint}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {q.options.map(opt => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`
                  text-left p-4 rounded-xl border transition-all duration-200 active:scale-[0.97]
                  ${isSelected
                    ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                  }
                `}
              >
                <div className="text-2xl mb-2">{opt.emoji}</div>
                <div className={`font-semibold text-sm leading-tight mb-1 ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                  {opt.label}
                </div>
                <div className="text-zinc-500 text-xs leading-tight">{opt.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 pb-8">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === current ? 'w-4 h-1.5 bg-amber-500' : i < current ? 'w-1.5 h-1.5 bg-zinc-600' : 'w-1.5 h-1.5 bg-zinc-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
