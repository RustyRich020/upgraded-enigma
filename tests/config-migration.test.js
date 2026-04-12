/**
 * Tests for js/config.js — migrateStorageKeys() and constants
 * Run with: npx vitest run tests/
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { migrateStorageKeys, STORAGE_KEYS, STATUSES, ENDPOINTS } from '../js/config.js';

// Provide localStorage polyfill for Node test environment
// Uses a Proxy so Object.keys(localStorage) returns stored keys (needed by migrateStorageKeys)
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  const methods = {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); },
    get length() { return store.size; },
    key(i) { return [...store.keys()][i] ?? null; },
  };
  globalThis.localStorage = new Proxy(methods, {
    ownKeys() { return [...store.keys()]; },
    getOwnPropertyDescriptor(_, k) {
      if (store.has(k)) return { configurable: true, enumerable: true, value: store.get(k) };
      return undefined;
    },
  });
}

beforeEach(() => {
  localStorage.clear();
});

// ── migrateStorageKeys ─────────────────────────────────────────

describe('migrateStorageKeys', () => {
  it('migrates tron_jobs to jobsynk_jobs', () => {
    localStorage.setItem('tron_jobs', '[{"id":"1"}]');
    migrateStorageKeys();
    expect(localStorage.getItem('jobsynk_jobs')).toBe('[{"id":"1"}]');
  });

  it('migrates extra keys like tron_checklist', () => {
    localStorage.setItem('tron_checklist', '["item1"]');
    localStorage.setItem('tron_job_descriptions', '{"a":"b"}');
    migrateStorageKeys();
    expect(localStorage.getItem('jobsynk_checklist')).toBe('["item1"]');
    expect(localStorage.getItem('jobsynk_job_descriptions')).toBe('{"a":"b"}');
  });

  it('removes old tron_ keys after migration', () => {
    localStorage.setItem('tron_jobs', 'data');
    localStorage.setItem('tron_resumes', 'data');
    migrateStorageKeys();
    expect(localStorage.getItem('tron_jobs')).toBeNull();
    expect(localStorage.getItem('tron_resumes')).toBeNull();
  });

  it('does not overwrite existing jobsynk_ keys', () => {
    localStorage.setItem('tron_jobs', 'old_data');
    localStorage.setItem('jobsynk_jobs', 'existing_data');
    migrateStorageKeys();
    expect(localStorage.getItem('jobsynk_jobs')).toBe('existing_data');
  });

  it('handles empty localStorage (no-op)', () => {
    migrateStorageKeys();
    // Should not throw and localStorage should remain empty except any
    // keys the function might set — assert no tron_ keys exist
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      allKeys.push(localStorage.key(i));
    }
    const tronKeys = allKeys.filter(k => k.startsWith('tron_'));
    expect(tronKeys).toHaveLength(0);
  });

  it('is idempotent — safe to call twice', () => {
    localStorage.setItem('tron_jobs', 'data');
    migrateStorageKeys();
    const afterFirst = localStorage.getItem('jobsynk_jobs');
    migrateStorageKeys();
    expect(localStorage.getItem('jobsynk_jobs')).toBe(afterFirst);
  });

  it('migrates multiple STORAGE_KEYS values', () => {
    localStorage.setItem('tron_resumes', 'r');
    localStorage.setItem('tron_theme', 'dark');
    localStorage.setItem('tron_settings', '{}');
    migrateStorageKeys();
    expect(localStorage.getItem('jobsynk_resumes')).toBe('r');
    expect(localStorage.getItem('jobsynk_theme')).toBe('dark');
    expect(localStorage.getItem('jobsynk_settings')).toBe('{}');
  });
});

// ── STORAGE_KEYS ───────────────────────────────────────────────

describe('STORAGE_KEYS', () => {
  it('all values start with jobsynk_', () => {
    for (const value of Object.values(STORAGE_KEYS)) {
      expect(value.startsWith('jobsynk_')).toBe(true);
    }
  });

  it('has expected keys', () => {
    expect(STORAGE_KEYS.jobs).toBe('jobsynk_jobs');
    expect(STORAGE_KEYS.resumes).toBe('jobsynk_resumes');
    expect(STORAGE_KEYS.theme).toBe('jobsynk_theme');
    expect(STORAGE_KEYS.apiKeys).toBe('jobsynk_api_keys');
    expect(STORAGE_KEYS.settings).toBe('jobsynk_settings');
    expect(STORAGE_KEYS.authUser).toBe('jobsynk_auth_user');
  });

  it('includes agent-related keys', () => {
    expect(STORAGE_KEYS.agentConfig).toBe('jobsynk_agent_config');
    expect(STORAGE_KEYS.agentRuns).toBe('jobsynk_agent_runs');
  });
});

// ── STATUSES ───────────────────────────────────────────────────

describe('STATUSES', () => {
  it('has expected values', () => {
    expect(STATUSES).toContain('Saved');
    expect(STATUSES).toContain('Applied');
    expect(STATUSES).toContain('Interview');
    expect(STATUSES).toContain('Offer');
    expect(STATUSES).toContain('Closed');
  });

  it('is an array of 5 statuses', () => {
    expect(Array.isArray(STATUSES)).toBe(true);
    expect(STATUSES).toHaveLength(5);
  });
});

// ── ENDPOINTS ──────────────────────────────────────────────────

describe('ENDPOINTS', () => {
  it('has expected URL keys', () => {
    expect(ENDPOINTS.remotive).toBeDefined();
    expect(ENDPOINTS.adzuna).toBeDefined();
    expect(ENDPOINTS.gemini).toBeDefined();
    expect(ENDPOINTS.hunter).toBeDefined();
    expect(ENDPOINTS.groq).toBeDefined();
  });

  it('all values are URLs starting with https', () => {
    for (const url of Object.values(ENDPOINTS)) {
      expect(url.startsWith('https://')).toBe(true);
    }
  });
});
