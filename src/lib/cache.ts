import { Property } from '../types';

// Cache storage
const cache = new Map<string, {
  data: any;
  timestamp: number;
  ttl: number;
}>();

// Default TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

export function setCache(key: string, data: any, ttl = DEFAULT_TTL) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

export function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  
  if (!item) return null;
  
  // Check if cache is expired
  if (Date.now() - item.timestamp > item.ttl) {
    cache.delete(key);
    return null;
  }
  
  return item.data as T;
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// Property-specific cache functions
export function setCachedProperties(properties: Property[]) {
  setCache('properties', properties);
}

export function getCachedProperties(): Property[] | null {
  return getCache<Property[]>('properties');
}