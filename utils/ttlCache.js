class TtlCache {
  /**
   * @param {Object} options
   * @param {number} options.ttlMs - Time to live in milliseconds
   * @param {number} options.max - Maximum number of items allowed in cache
   */
  constructor({ ttlMs = 60000, max = 5000 } = {}) {
    this.ttlMs = ttlMs;
    this.max = max;
    this.cache = new Map();
  }

  /**
   * Get value from cache if it exists and hasn't expired.
   * @param {string} key 
   * @returns {any | undefined}
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh position for pseudo-LRU effect on Map
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value;
  }

  /**
   * Set value in cache with TTL expiry.
   * @param {string} key 
   * @param {any} value 
   */
  set(key, value) {
    // If max capacity reached, delete the oldest item (first inserted in Map)
    if (this.cache.size >= this.max) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const expiry = Date.now() + this.ttlMs;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Clear all cached entries.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get current size of cache.
   */
  size() {
    return this.cache.size;
  }
}

module.exports = { TtlCache };