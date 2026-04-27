import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, UserInteraction, AlgorithmId, ContentType, Platform, MoodId } from '../engine/types'

interface UserStore {
  profile: UserProfile | null
  lastAlgorithm: AlgorithmId | null
  lastMood: MoodId | null
  isOnboarded: boolean

  initProfile: () => void
  recordInteraction: (interaction: UserInteraction) => void
  setLastAlgorithm: (id: AlgorithmId) => void
  setLastMood: (mood: MoodId) => void
  connectPlatform: (platform: Platform) => void
  disconnectPlatform: (platform: Platform) => void
  addLikedGenre: (genre: string) => void
  addDislikedGenre: (genre: string) => void
  setContentTypes: (types: ContentType[]) => void
  setLanguages: (langs: string[]) => void
  completeOnboarding: () => void
  resetProfile: () => void
}

const emptyProfile = (): UserProfile => ({
  id: crypto.randomUUID(),
  connectedPlatforms: [],
  interactions: [],
  likedGenres: [],
  dislikedGenres: [],
  preferredLanguages: ['en'],
  preferredContentTypes: ['movie', 'tv'],
  createdAt: Date.now(),
})

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,
      lastAlgorithm: null,
      lastMood: null,
      isOnboarded: false,

      initProfile() {
        if (!get().profile) set({ profile: emptyProfile() })
      },

      recordInteraction(interaction) {
        const profile = get().profile
        if (!profile) return
        // Keep last 500 interactions
        const interactions = [interaction, ...profile.interactions].slice(0, 500)
        set({ profile: { ...profile, interactions } })
      },

      setLastAlgorithm(id) {
        set({ lastAlgorithm: id })
        const profile = get().profile
        if (profile) set({ profile: { ...profile, lastAlgorithm: id } })
      },

      setLastMood(mood) {
        set({ lastMood: mood })
        const profile = get().profile
        if (profile) set({ profile: { ...profile, lastMood: mood } })
      },

      connectPlatform(platform) {
        const profile = get().profile
        if (!profile) return
        const platforms = [...new Set([...profile.connectedPlatforms, platform])]
        set({ profile: { ...profile, connectedPlatforms: platforms } })
      },

      disconnectPlatform(platform) {
        const profile = get().profile
        if (!profile) return
        set({ profile: { ...profile, connectedPlatforms: profile.connectedPlatforms.filter(p => p !== platform) } })
      },

      addLikedGenre(genre) {
        const profile = get().profile
        if (!profile) return
        const genres = [...new Set([...profile.likedGenres, genre])]
        set({ profile: { ...profile, likedGenres: genres } })
      },

      addDislikedGenre(genre) {
        const profile = get().profile
        if (!profile) return
        const genres = [...new Set([...profile.dislikedGenres, genre])]
        set({ profile: { ...profile, dislikedGenres: genres } })
      },

      setContentTypes(types) {
        const profile = get().profile
        if (!profile) return
        set({ profile: { ...profile, preferredContentTypes: types } })
      },

      setLanguages(langs) {
        const profile = get().profile
        if (!profile) return
        set({ profile: { ...profile, preferredLanguages: langs } })
      },

      completeOnboarding() {
        set({ isOnboarded: true })
      },

      resetProfile() {
        set({ profile: emptyProfile(), isOnboarded: false, lastAlgorithm: null })
      },
    }),
    {
      name: 'pickfeed-user',
      partialize: (state) => ({
        profile: state.profile,
        lastAlgorithm: state.lastAlgorithm,
        lastMood: state.lastMood,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
)
