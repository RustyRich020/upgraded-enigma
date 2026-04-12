/**
 * Tests for js/services/api-keys.js
 * Run with: npx vitest run tests/
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadKeys, getApi, hasApi, saveAllKeys, clearKeys, getAllKeys } from '../js/services/api-keys.js';

// Provide localStorage polyfill for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem(k) { return store[k] ?? null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key(i) { return Object.keys(store)[i] ?? null; },
  };
}

beforeEach(() => {
  localStorage.clear();
  // Reset in-memory keys by loading from empty localStorage
  loadKeys();
});

// ── loadKeys ───────────────────────────────────────────────────

describe('loadKeys', () => {
  it('returns empty object when nothing stored', () => {
    const result = loadKeys();
    expect(result).toEqual({});
  });

  it('loads JSON from localStorage', () => {
    localStorage.setItem('jobsynk_api_keys', JSON.stringify({ adzuna: 'abc123' }));
    const result = loadKeys();
    expect(result.adzuna).toBe('abc123');
  });

  it('handles corrupt JSON gracefully', () => {
    localStorage.setItem('jobsynk_api_keys', '{not valid json!!!');
    const result = loadKeys();
    expect(result).toEqual({});
  });

  it('loads multiple keys', () => {
    localStorage.setItem('jobsynk_api_keys', JSON.stringify({
      adzuna: 'key1',
      hunter: 'key2',
      gemini: 'key3',
    }));
    const result = loadKeys();
    expect(result.adzuna).toBe('key1');
    expect(result.hunter).toBe('key2');
    expect(result.gemini).toBe('key3');
  });
});

// ── getApi ─────────────────────────────────────────────────────

describe('getApi', () => {
  it('returns value for known key', () => {
    saveAllKeys({ adzuna: 'mykey' });
    expect(getApi('adzuna')).toBe('mykey');
  });

  it('returns empty string for unknown key', () => {
    expect(getApi('nonexistent')).toBe('');
  });

  it('falls back to localStorage when memory is empty', () => {
    localStorage.setItem('jobsynk_api_keys', JSON.stringify({ hunter: 'fallback123' }));
    // Reset memory by loading empty then clearing in-memory
    loadKeys(); // This actually loads from localStorage
    // Clear memory and set localStorage directly
    clearKeys();
    localStorage.setItem('jobsynk_api_keys', JSON.stringify({ hunter: 'fallback123' }));
    expect(getApi('hunter')).toBe('fallback123');
  });
});

// ── hasApi ─────────────────────────────────────────────────────

describe('hasApi', () => {
  it('returns true when key has value', () => {
    saveAllKeys({ adzuna: 'abc' });
    expect(hasApi('adzuna')).toBe(true);
  });

  it('returns false when key is missing', () => {
    expect(hasApi('adzuna')).toBe(false);
  });

  it('returns false when key is empty string', () => {
    saveAllKeys({ adzuna: '' });
    expect(hasApi('adzuna')).toBe(false);
  });
});

// ── saveAllKeys ────────────────────────────────────────────────

describe('saveAllKeys', () => {
  it('persists keys to localStorage', () => {
    saveAllKeys({ adzuna: 'testkey' });
    const stored = JSON.parse(localStorage.getItem('jobsynk_api_keys'));
    expect(stored.adzuna).toBe('testkey');
  });

  it('subsequent getApi returns saved values', () => {
    saveAllKeys({ gemini: 'gkey', hunter: 'hkey' });
    expect(getApi('gemini')).toBe('gkey');
    expect(getApi('hunter')).toBe('hkey');
  });

  it('overwrites previous keys', () => {
    saveAllKeys({ adzuna: 'first' });
    saveAllKeys({ adzuna: 'second' });
    expect(getApi('adzuna')).toBe('second');
  });

  it('getAllKeys returns a copy of saved keys', () => {
    saveAllKeys({ adzuna: 'a', hunter: 'b' });
    const all = getAllKeys();
    expect(all.adzuna).toBe('a');
    expect(all.hunter).toBe('b');
  });
});

// ── clearKeys ──────────────────────────────────────────────────

describe('clearKeys', () => {
  it('removes keys from localStorage', () => {
    saveAllKeys({ adzuna: 'key' });
    clearKeys();
    expect(localStorage.getItem('jobsynk_api_keys')).toBeNull();
  });

  it('clears in-memory keys', () => {
    saveAllKeys({ adzuna: 'key' });
    clearKeys();
    expect(getAllKeys()).toEqual({});
  });

  it('getApi returns empty after clear', () => {
    saveAllKeys({ adzuna: 'key' });
    clearKeys();
    expect(getApi('adzuna')).toBe('');
  });
});
