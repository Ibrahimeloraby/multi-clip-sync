interface CacheEntry {
  blob: Blob;
  url: string;
  timestamp: number;
  size: number;
}

interface CacheStats {
  totalSize: number;
  entryCount: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_CACHE_AGE = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

class VideoCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);
  }

  private getTotalSize(): number {
    let total = 0;
    this.cache.forEach(entry => {
      total += entry.size;
    });
    return total;
  }

  private cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > MAX_CACHE_AGE) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.remove(key);
    });

    // If still over size limit, remove oldest entries
    while (this.getTotalSize() > MAX_CACHE_SIZE && this.cache.size > 0) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      this.cache.forEach((entry, key) => {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      });

      if (oldestKey) {
        this.remove(oldestKey);
      }
    }
  }

  async set(key: string, blob: Blob): Promise<string> {
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.remove(key);
    }

    // Check if we need to make room
    const newSize = this.getTotalSize() + blob.size;
    if (newSize > MAX_CACHE_SIZE) {
      this.cleanup();
    }

    const url = URL.createObjectURL(blob);
    this.cache.set(key, {
      blob,
      url,
      timestamp: Date.now(),
      size: blob.size,
    });

    return url;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Update timestamp on access (LRU behavior)
    entry.timestamp = Date.now();
    return entry.url;
  }

  getBlob(key: string): Blob | null {
    const entry = this.cache.get(key);
    return entry ? entry.blob : null;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  remove(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      try {
        URL.revokeObjectURL(entry.url);
      } catch (error) {
        console.error('Failed to revoke URL for key:', key, error);
      }
      this.cache.delete(key);
      return true;
    }
    return false;
  }

  clear() {
    this.cache.forEach((entry) => {
      try {
        URL.revokeObjectURL(entry.url);
      } catch (error) {
        console.error('Failed to revoke URL:', error);
      }
    });
    this.cache.clear();
  }

  getStats(): CacheStats {
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    this.cache.forEach(entry => {
      if (oldestEntry === null || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (newestEntry === null || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    });

    return {
      totalSize: this.getTotalSize(),
      entryCount: this.cache.size,
      oldestEntry,
      newestEntry,
    };
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Singleton instance
export const videoCache = new VideoCache();

// Helper function to generate cache key from video URL/path
export const generateCacheKey = (videoPath: string, quality?: string): string => {
  const base = videoPath.split('?')[0]; // Remove query params
  return quality ? `${base}:${quality}` : base;
};

// Helper to fetch and cache video
export const fetchAndCacheVideo = async (
  url: string,
  cacheKey?: string
): Promise<string> => {
  const key = cacheKey || generateCacheKey(url);

  // Check cache first
  const cached = videoCache.get(key);
  if (cached) {
    return cached;
  }

  // Fetch and cache
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`);
    }

    const blob = await response.blob();
    return await videoCache.set(key, blob);
  } catch (error) {
    console.error('Failed to fetch and cache video:', error);
    throw error;
  }
};

export default videoCache;
