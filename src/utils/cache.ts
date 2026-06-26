// Optimized caching utility for frequently accessed data
export class Cache {
  private cache = new Map<string, { value: any; expiry: number }>();

  set<T>(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    // Clean up expired entries
    this.cleanup();

    // Store in memory cache
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });

    // Also store in localStorage for persistence across page reloads
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        value,
        expiry: Date.now() + ttl,
      }));
    } catch (error) {
      console.warn('Failed to cache value:', error);
    }
  }

  get<T>(key: string): T | null {
    this.cleanup();

    // Try memory cache first (faster)
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      if (Date.now() < entry.expiry) {
        return entry.value as T;
      } else {
        this.cache.delete(key);
      }
    }

    // Fall back to localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const { value, expiry } = JSON.parse(stored);
        if (Date.now() < expiry) {
          // Restore to memory cache for future access
          this.cache.set(key, { value, expiry });
          return value as T;
        } else {
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Failed to read from cache:', error);
      localStorage.removeItem(`cache_${key}`);
    }

    return null;
  }

  delete(key: string): void {
    this.cache.delete(key);
    localStorage.removeItem(`cache_${key}`);
  }

  clear(): void {
    this.cache.clear();
    // Clear all cache_* keys from localStorage
    Object.keys(localStorage)
      .filter(key => key.startsWith('cache_'))
      .forEach(key => localStorage.removeItem(key));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Utility: invalidate related cache entries
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.delete(key);
      }
    }
  }
}
