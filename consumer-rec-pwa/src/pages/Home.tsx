import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { ALGORITHMS, ALGORITHMS_BY_CATEGORY, CATEGORY_META, MOODS } from '../engine/registry'
import { AlgorithmCard } from '../components/AlgorithmCard'
import { useUserStore } from '../store/userStore'
import type { AlgorithmId, MoodId } from '../engine/types'
import { cn } from '../lib/utils'

type Step = 'pick' | 'mood' | 'seed' | 'duration'

export default function Home() {
  const navigate = useNavigate()
  const { lastAlgorithm, setLastAlgorithm, setLastMood } = useUserStore()

  const [selected, setSelected] = useState<AlgorithmId | null>(lastAlgorithm ?? null)
  const [step, setStep] = useState<Step>('pick')
  const [mood, setMood] = useState<MoodId | null>(null)
  const [duration, setDuration] = useState(90)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const selectedAlg = selected ? ALGORITHMS.find(a => a.id === selected) : null
  const categories = Object.entries(ALGORITHMS_BY_CATEGORY)

  function handleSelect(id: string) {
    setSelected(id as AlgorithmId)
    const alg = ALGORITHMS.find(a => a.id === id)!
    if (alg.requiresMood) { setStep('mood'); return }
    if (alg.requiresDuration) { setStep('duration'); return }
    if (alg.requiresSeed) { setStep('seed'); return }
  }

  function handleGo() {
    if (!selected) return
    setLastAlgorithm(selected)
    if (mood) setLastMood(mood)
    navigate(`/results?algorithm=${selected}${mood ? `&mood=${mood}` : ''}${step === 'duration' ? `&duration=${duration}` : ''}`)
  }

  const filteredAlgorithms = activeCategory
    ? ALGORITHMS.filter(a => a.category === activeCategory)
    : ALGORITHMS

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-surface-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles size={20} className="text-accent-light" />
              PickFeed
            </h1>
            <p className="text-sm text-white/40">Choose how you discover</p>
          </div>
          {selected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-white/50"
            >
              {selectedAlg?.emoji} {selectedAlg?.name}
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Step: Algorithm picker */}
        <AnimatePresence mode="wait">
          {step === 'pick' && (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white mb-1">How do you want to discover?</h2>
                <p className="text-white/45 text-sm">Pick one algorithm. Get exactly that. No blending, no noise.</p>
              </div>

              {/* Category filter tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    !activeCategory ? 'bg-accent text-white' : 'bg-surface-card border border-surface-border text-white/50 hover:text-white/70'
                  )}
                >
                  All 15
                </button>
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                    className={cn(
                      'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                      activeCategory === key
                        ? 'bg-accent text-white'
                        : 'bg-surface-card border border-surface-border text-white/50 hover:text-white/70'
                    )}
                  >
                    <span>{meta.emoji}</span>
                    {meta.label}
                  </button>
                ))}
              </div>

              {/* Category description */}
              {activeCategory && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-sm text-white/40 mb-4 -mt-2"
                >
                  {CATEGORY_META[activeCategory as keyof typeof CATEGORY_META]?.description}
                </motion.p>
              )}

              {/* Algorithm grid */}
              <div className="space-y-3">
                {filteredAlgorithms.map((alg, i) => (
                  <AlgorithmCard
                    key={alg.id}
                    algorithm={alg}
                    isSelected={selected === alg.id}
                    onSelect={handleSelect}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step: Mood picker */}
          {step === 'mood' && (
            <motion.div key="mood" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <button onClick={() => setStep('pick')} className="text-sm text-white/40 hover:text-white/70 mb-6">
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-white mb-2">How are you feeling?</h2>
              <p className="text-white/45 text-sm mb-8">We'll match every recommendation to this mood right now.</p>

              <div className="grid grid-cols-2 gap-3">
                {MOODS.map((m, i) => (
                  <motion.button
                    key={m.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setMood(m.id)}
                    className={cn(
                      'p-4 rounded-2xl border text-left transition-all',
                      mood === m.id
                        ? 'border-accent bg-accent/10'
                        : 'border-surface-border bg-surface-card hover:border-surface-raised'
                    )}
                  >
                    <div className="text-3xl mb-2">{m.emoji}</div>
                    <div className="font-semibold text-white text-sm">{m.label}</div>
                    <div className="text-[11px] text-white/40 mt-0.5">{m.genres.slice(0, 2).join(', ')}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step: Duration picker */}
          {step === 'duration' && (
            <motion.div key="duration" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <button onClick={() => setStep('pick')} className="text-sm text-white/40 hover:text-white/70 mb-6">
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-white mb-2">How long do you have?</h2>
              <p className="text-white/45 text-sm mb-8">We'll only show things that fit inside your time window.</p>

              <div className="text-center mb-8">
                <div className="text-6xl font-bold text-white mb-1">{duration}</div>
                <div className="text-white/40">minutes</div>
              </div>

              <input
                type="range" min={15} max={240} step={5}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full accent-violet-500 mb-6"
              />

              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 120].map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      'py-3 rounded-xl text-sm font-medium transition-all',
                      duration === d ? 'bg-accent text-white' : 'bg-surface-card border border-surface-border text-white/50'
                    )}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky CTA */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 p-4 bg-surface/90 backdrop-blur-xl border-t border-surface-border"
          >
            <div className="max-w-2xl mx-auto">
              {(step === 'mood' && !mood) ? (
                <p className="text-center text-white/40 text-sm py-3">Pick a mood to continue</p>
              ) : (
                <button
                  onClick={handleGo}
                  className={cn(
                    'w-full py-4 rounded-2xl font-semibold text-white text-base transition-all',
                    `bg-gradient-to-r ${selectedAlg?.gradient}`,
                    'hover:opacity-90 active:scale-95',
                    'animate-pulse-glow',
                  )}
                >
                  {selectedAlg?.emoji} Show me {selectedAlg?.name} picks →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
