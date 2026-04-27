import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Check } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { PLATFORM_META } from '../integrations/deeplinks'
import type { Platform, ContentType } from '../engine/types'
import { cn } from '../lib/utils'

type Step = 'welcome' | 'platforms' | 'genres' | 'done'

const ALL_GENRES = [
  'action', 'comedy', 'drama', 'thriller', 'sci-fi', 'horror',
  'romance', 'documentary', 'animation', 'fantasy', 'mystery', 'crime',
]

const ALL_PLATFORMS: Platform[] = ['netflix', 'disney', 'prime', 'hbo', 'spotify', 'youtube', 'apple_music']

export default function Onboarding() {
  const navigate = useNavigate()
  const { initProfile, connectPlatform, addLikedGenre, completeOnboarding } = useUserStore()

  const [step, setStep] = useState<Step>('welcome')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])

  function togglePlatform(p: Platform) {
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  function toggleGenre(g: string) {
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  function finish() {
    initProfile()
    selectedPlatforms.forEach(p => connectPlatform(p))
    selectedGenres.forEach(g => addLikedGenre(g))
    completeOnboarding()
    navigate('/')
  }

  const stepMap: Record<Step, number> = { welcome: 0, platforms: 1, genres: 2, done: 3 }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        {step !== 'welcome' && (
          <div className="flex justify-center gap-2 mb-8">
            {(['platforms', 'genres', 'done'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  stepMap[step] > i ? 'bg-accent w-6' : stepMap[step] === i + 1 ? 'bg-accent w-4' : 'bg-surface-border w-4'
                )}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* Welcome */}
          {step === 'welcome' && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-4xl mx-auto mb-6">
                ✦
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">PickFeed</h1>
              <p className="text-white/55 text-base leading-relaxed mb-2">
                Stop scrolling through feeds that show you everything.
              </p>
              <p className="text-white/55 text-base leading-relaxed mb-8">
                Choose <span className="text-accent-light font-medium">one algorithm</span>, get exactly that — movies, TV, music — from all your apps in one place.
              </p>
              <div className="space-y-3 text-left mb-8 p-4 rounded-2xl bg-surface-card border border-surface-border">
                {[
                  ['🎲', 'Surprise Me', 'Push past your usual pattern'],
                  ['💎', 'Hidden Gems', 'Loved by few, made for you'],
                  ['🧠', 'My Taste', 'What people exactly like you love'],
                  ['⏱️', 'Right Now', 'Fits inside your time window'],
                ].map(([emoji, name, desc]) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xl">{emoji}</span>
                    <div>
                      <span className="text-sm font-medium text-white">{name}</span>
                      <span className="text-sm text-white/40"> — {desc}</span>
                    </div>
                  </div>
                ))}
                <div className="text-sm text-white/30 text-center pt-1">+ 11 more algorithms</div>
              </div>
              <button
                onClick={() => setStep('platforms')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-base"
              >
                Get started →
              </button>
              <button onClick={finish} className="mt-3 text-sm text-white/30 hover:text-white/50 w-full py-2">
                Skip setup
              </button>
            </motion.div>
          )}

          {/* Platforms */}
          {step === 'platforms' && (
            <motion.div key="platforms" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <h2 className="text-2xl font-bold text-white mb-1">Which apps do you use?</h2>
              <p className="text-white/45 text-sm mb-6">We'll surface recommendations from these platforms.</p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {ALL_PLATFORMS.map(p => {
                  const meta = PLATFORM_META[p]
                  const isSelected = selectedPlatforms.includes(p)
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={cn(
                        'p-4 rounded-2xl border flex items-center gap-3 transition-all text-left',
                        isSelected ? 'border-accent bg-accent/10' : 'border-surface-border bg-surface-card hover:border-surface-raised'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: meta.color }}>
                        {meta.logo}
                      </div>
                      <span className="text-sm font-medium text-white">{meta.name}</span>
                      {isSelected && <Check size={14} className="ml-auto text-accent-light" />}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('welcome')} className="flex-1 py-3 rounded-xl border border-surface-border text-white/50 text-sm">Back</button>
                <button onClick={() => setStep('genres')} className="flex-1 py-3 rounded-xl bg-accent text-white font-medium text-sm">
                  {selectedPlatforms.length > 0 ? `Continue (${selectedPlatforms.length} selected)` : 'Skip'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Genres */}
          {step === 'genres' && (
            <motion.div key="genres" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              <h2 className="text-2xl font-bold text-white mb-1">What do you enjoy?</h2>
              <p className="text-white/45 text-sm mb-6">Helps cold-start your recommendations. Pick as many as you like.</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {ALL_GENRES.map(g => (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all capitalize',
                      selectedGenres.includes(g)
                        ? 'bg-accent text-white'
                        : 'bg-surface-card border border-surface-border text-white/50 hover:border-surface-raised hover:text-white/70'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('platforms')} className="flex-1 py-3 rounded-xl border border-surface-border text-white/50 text-sm">Back</button>
                <button onClick={finish} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm">
                  Let's go →
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
