interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  version?: string; // Cache version for invalidation
}

class ClientCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly CACHE_VERSION = '1.0.0'; // Increment this to invalidate all cache

  constructor() {
    // Clear stale cache on initialization
    if (typeof window !== 'undefined') {
      this.cleanupExpiredCache();
      // Check for cache version mismatch
      this.checkCacheVersion();
    }
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private checkCacheVersion(): void {
    try {
      if (typeof window === 'undefined') return;
      const storedVersion = localStorage.getItem('cache_version');
      if (storedVersion !== this.CACHE_VERSION) {
        // Version mismatch - clear all persistent cache
        this.clearPersistent();
        localStorage.setItem('cache_version', this.CACHE_VERSION);
      }
    } catch (e) {
      console.warn('Failed to check cache version', e);
    }
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      version: this.CACHE_VERSION
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check version mismatch
    if (item.version && item.version !== this.CACHE_VERSION) {
      this.cache.delete(key);
      return null;
    }

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  clear(key?: string | RegExp): void {
    if (!key) {
      this.cache.clear();
      return;
    }

    if (typeof key === 'string') {
      this.cache.delete(key);
    } else if (key instanceof RegExp) {
      // Clear all keys matching the regex pattern
      const keysToDelete: string[] = [];
      this.cache.forEach((_, cacheKey) => {
        if (key.test(cacheKey)) {
          keysToDelete.push(cacheKey);
        }
      });
      keysToDelete.forEach(k => this.cache.delete(k));
    }
  }

  // Persistent cache using localStorage
  setPersistent<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000): void {
    try {
      if (typeof window === 'undefined') return;
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: this.CACHE_VERSION
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  getPersistent<T>(key: string): T | null {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem(`cache_${key}`);
      if (!stored) return null;
      // Guard against HTML or invalid JSON (e.g. "Unexpected token '<'" if stored value was overwritten)
      if (stored.trimStart().startsWith('<')) return null;

      let item: CacheItem<T>;
      try {
        item = JSON.parse(stored);
      } catch {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      if (item.version && item.version !== this.CACHE_VERSION) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      if (Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      return item.data;
    } catch (e) {
      return null;
    }
  }

  clearPersistent(key?: string): void {
    try {
      if (typeof window === 'undefined') return;
      if (key) {
        localStorage.removeItem(`cache_${key}`);
      } else {
        // Clear all cache entries
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
          if (k.startsWith('cache_')) {
            localStorage.removeItem(k);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to clear localStorage cache', e);
    }
  }

  // Clear all cache (both in-memory and persistent)
  clearAll(): void {
    this.cache.clear();
    this.clearPersistent();
  }

  // Force refresh by incrementing cache version
  invalidateAll(): void {
    // This will cause all cache to be invalid on next access
    // by changing the version, all existing cache becomes invalid
    try {
      if (typeof window === 'undefined') return;
      const currentVersion = localStorage.getItem('cache_version') || '0.0.0';
      const versionParts = currentVersion.split('.');
      const patchVersion = parseInt(versionParts[2] || '0', 10) + 1;
      const newVersion = `${versionParts[0]}.${versionParts[1]}.${patchVersion}`;
      localStorage.setItem('cache_version', newVersion);
      // Update internal version to match
      (this as any).CACHE_VERSION = newVersion;
    } catch (e) {
      console.warn('Failed to invalidate cache', e);
    }
  }
}

export const cache = new ClientCache();

