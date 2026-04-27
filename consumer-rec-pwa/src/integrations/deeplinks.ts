import type { ContentItem, Platform } from '../engine/types'

// ── Deep link schemes for each platform ───────────────────────────────────
// Falls back to web URL if app scheme fails

interface DeepLinkStrategy {
  app: (item: ContentItem) => string
  web: (item: ContentItem) => string
}

const STRATEGIES: Partial<Record<Platform, DeepLinkStrategy>> = {
  netflix: {
    app: (item) => `nflx://www.netflix.com/title/${item.externalId}`,
    web: (item) => `https://www.netflix.com/title/${item.externalId}`,
  },
  disney: {
    app: (item) => `disneyplus://content/${item.externalId}`,
    web: (item) => `https://www.disneyplus.com/video/${item.externalId}`,
  },
  prime: {
    app: (item) => `aiv://aiv/resume?asin=${item.externalId}`,
    web: (item) => `https://www.amazon.com/dp/${item.externalId}`,
  },
  hbo: {
    app: (item) => `hbomax://content/${item.externalId}`,
    web: (item) => `https://www.max.com/movies/video/${item.externalId}`,
  },
  spotify: {
    app: (item) => `spotify://${item.contentType === 'music' ? 'track' : 'show'}/${item.externalId}`,
    web: (item) => `https://open.spotify.com/${item.contentType === 'music' ? 'track' : 'show'}/${item.externalId}`,
  },
  youtube: {
    app: (item) => `vnd.youtube:${item.externalId}`,
    web: (item) => `https://www.youtube.com/watch?v=${item.externalId}`,
  },
  apple_music: {
    app: (item) => `music://music.apple.com/us/album/${item.externalId}`,
    web: (item) => `https://music.apple.com/us/album/${item.externalId}`,
  },
  amazon_shop: {
    app: (item) => `com.amazon.mobile.shopping://www.amazon.com/dp/${item.externalId}`,
    web: (item) => `https://www.amazon.com/dp/${item.externalId}`,
  },
}

// ── TV-aware deep link opener ──────────────────────────────────────────────
// On TV browsers, always use web URL since app schemes don't work
function isTVBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return (
    ua.includes('smart-tv') ||
    ua.includes('smarttv') ||
    ua.includes('tizen') ||
    ua.includes('webos') ||
    ua.includes('crkey') ||
    ua.includes('silk') ||
    window.innerWidth >= 1920
  )
}

export function openContent(item: ContentItem): void {
  const strategy = STRATEGIES[item.platform]
  if (!strategy) {
    window.open(item.webUrl ?? item.deepLink, '_blank', 'noopener')
    return
  }

  if (isTVBrowser()) {
    // TV: open web URL directly, no app scheme
    window.location.href = strategy.web(item)
    return
  }

  // Mobile/Desktop: try app scheme, fall back to web after 2s
  const appUrl = strategy.app(item)
  const webUrl = strategy.web(item)

  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = appUrl
  document.body.appendChild(iframe)

  setTimeout(() => {
    document.body.removeChild(iframe)
    // If page is still focused, app didn't open — go to web
    if (!document.hidden) {
      window.open(webUrl, '_blank', 'noopener')
    }
  }, 2000)
}

export function getPlatformWebUrl(item: ContentItem): string {
  return STRATEGIES[item.platform]?.web(item) ?? item.webUrl ?? '#'
}

// ── Platform metadata for UI ───────────────────────────────────────────────
export const PLATFORM_META: Record<Platform, { name: string; color: string; logo: string }> = {
  netflix:      { name: 'Netflix',      color: '#E50914', logo: 'N' },
  disney:       { name: 'Disney+',      color: '#0063E5', logo: 'D+' },
  prime:        { name: 'Prime Video',  color: '#00A8E1', logo: '▶' },
  hbo:          { name: 'Max',          color: '#5822CA', logo: 'max' },
  spotify:      { name: 'Spotify',      color: '#1DB954', logo: '♫' },
  youtube:      { name: 'YouTube',      color: '#FF0000', logo: '▶' },
  apple_music:  { name: 'Apple Music',  color: '#FC3C44', logo: '♪' },
  amazon_shop:  { name: 'Amazon',       color: '#FF9900', logo: 'a' },
}
