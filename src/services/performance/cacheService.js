import { config } from './config.js';

class CacheService {
  constructor() {
    this.cache = new Map();
  }

  generateKey(url) {
    return `performance_${url}`;
  }

  isExpired(timestamp) {
    const now = Date.now();
    const expirationTime = timestamp + (config.CACHE_DURATION * 60 * 1000);
    return now > expirationTime;
  }

  get(url) {
    const key = this.generateKey(url);
    const cached = this.cache.get(key);

    if (!cached) return null;
    if (this.isExpired(cached.timestamp)) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(url, data) {
    const key = this.generateKey(url);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

export const cacheService = new CacheService(); 