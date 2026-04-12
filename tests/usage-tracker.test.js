/**
 * Tests for js/services/usage-tracker.js
 * Run with: npx vitest run tests/
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserTier, setUserTier, getLimit, getUsage, getRemaining,
  checkLimit, recordUsage, getUsageSummary, resetUsage, TIERS, STRIPE
} from '../js/services/usage-tracker.js';

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
});

// ── getUserTier / setUserTier ──────────────────────────────────

describe('getUserTier / setUserTier', () => {
  it('defaults to free when nothing stored', () => {
    expect(getUserTier()).toBe('free');
  });

  it('returns the tier that was set', () => {
    setUserTier('1mo');
    expect(getUserTier()).toBe('1mo');
  });

  it('persists tier to localStorage', () => {
    setUserTier('3mo');
    expect(localStorage.getItem('jobsynk_user_tier')).toBe('3mo');
  });

  it('reads tier from localStorage directly', () => {
    localStorage.setItem('jobsynk_user_tier', '6mo');
    expect(getUserTier()).toBe('6mo');
  });
});

// ── getLimit ───────────────────────────────────────────────────

describe('getLimit', () => {
  it('returns 5 for adzuna on free tier', () => {
    expect(getLimit('adzuna')).toBe(5);
  });

  it('returns 20 for remotive on free tier', () => {
    expect(getLimit('remotive')).toBe(20);
  });

  it('returns 3 for hunter on free tier', () => {
    expect(getLimit('hunter')).toBe(3);
  });

  it('returns 3 for emailjs on free tier', () => {
    expect(getLimit('emailjs')).toBe(3);
  });

  it('returns 10 for bls on free tier', () => {
    expect(getLimit('bls')).toBe(10);
  });

  it('returns default DAILY_LIMIT (5) for unknown API on free tier', () => {
    expect(getLimit('unknownApi')).toBe(5);
  });

  it('returns Infinity for 1mo tier', () => {
    setUserTier('1mo');
    expect(getLimit('adzuna')).toBe(Infinity);
  });

  it('returns Infinity for 3mo tier', () => {
    setUserTier('3mo');
    expect(getLimit('hunter')).toBe(Infinity);
  });

  it('returns Infinity for 6mo tier', () => {
    setUserTier('6mo');
    expect(getLimit('remotive')).toBe(Infinity);
  });
});

// ── checkLimit ─────────────────────────────────────────────────

describe('checkLimit', () => {
  it('returns allowed:true when under limit', () => {
    const result = checkLimit('adzuna');
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(0);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(5);
  });

  it('returns allowed:false when at limit', () => {
    for (let i = 0; i < 5; i++) recordUsage('adzuna');
    const result = checkLimit('adzuna');
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(5);
    expect(result.remaining).toBe(0);
  });

  it('returns allowed:false when over limit', () => {
    // Manually set usage beyond limit
    localStorage.setItem('jobsynk_api_usage', JSON.stringify({
      _date: new Date().toISOString().slice(0, 10),
      adzuna: 10,
    }));
    const result = checkLimit('adzuna');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('returns correct used/limit/remaining fields', () => {
    recordUsage('hunter');
    recordUsage('hunter');
    const result = checkLimit('hunter');
    expect(result.used).toBe(2);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(1);
  });

  it('always allows paid tiers', () => {
    setUserTier('1mo');
    const result = checkLimit('adzuna');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe('∞');
    expect(result.remaining).toBe('∞');
  });

  it('always allows 3mo paid tier', () => {
    setUserTier('3mo');
    const result = checkLimit('hunter');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe('∞');
  });
});

// ── recordUsage ────────────────────────────────────────────────

describe('recordUsage', () => {
  it('increments counter for free tier', () => {
    recordUsage('adzuna');
    expect(getUsage('adzuna')).toBe(1);
  });

  it('does NOT increment for paid tier', () => {
    setUserTier('1mo');
    recordUsage('adzuna');
    expect(getUsage('adzuna')).toBe(0);
  });

  it('multiple calls accumulate', () => {
    recordUsage('hunter');
    recordUsage('hunter');
    recordUsage('hunter');
    expect(getUsage('hunter')).toBe(3);
  });

  it('different APIs are independent', () => {
    recordUsage('adzuna');
    recordUsage('adzuna');
    recordUsage('hunter');
    expect(getUsage('adzuna')).toBe(2);
    expect(getUsage('hunter')).toBe(1);
  });
});

// ── getUsage / getRemaining ────────────────────────────────────

describe('getUsage / getRemaining', () => {
  it('getUsage returns 0 when nothing recorded', () => {
    expect(getUsage('adzuna')).toBe(0);
  });

  it('getUsage returns correct count after recording', () => {
    recordUsage('remotive');
    recordUsage('remotive');
    expect(getUsage('remotive')).toBe(2);
  });

  it('getRemaining returns full limit when nothing used', () => {
    expect(getRemaining('adzuna')).toBe(5);
  });

  it('getRemaining decreases after recording', () => {
    recordUsage('adzuna');
    recordUsage('adzuna');
    expect(getRemaining('adzuna')).toBe(3);
  });

  it('getRemaining never goes below 0', () => {
    for (let i = 0; i < 10; i++) recordUsage('adzuna');
    expect(getRemaining('adzuna')).toBe(0);
  });

  it('getRemaining returns Infinity for paid tier', () => {
    setUserTier('3mo');
    expect(getRemaining('adzuna')).toBe(Infinity);
  });
});

// ── getUsageSummary ────────────────────────────────────────────

describe('getUsageSummary', () => {
  it('returns all API names from LIMITS', () => {
    const summary = getUsageSummary();
    const names = summary.map(s => s.name);
    expect(names).toContain('adzuna');
    expect(names).toContain('remotive');
    expect(names).toContain('hunter');
    expect(names).toContain('gemini');
    expect(names).toContain('bls');
  });

  it('returns correct percentage after usage', () => {
    recordUsage('adzuna');
    recordUsage('adzuna');
    const summary = getUsageSummary();
    const adzuna = summary.find(s => s.name === 'adzuna');
    expect(adzuna.used).toBe(2);
    expect(adzuna.percentage).toBe(40); // 2/5 = 40%
  });

  it('returns 0% percentage when nothing used', () => {
    const summary = getUsageSummary();
    const hunter = summary.find(s => s.name === 'hunter');
    expect(hunter.percentage).toBe(0);
  });

  it('caps percentage at 100', () => {
    for (let i = 0; i < 10; i++) recordUsage('hunter');
    const summary = getUsageSummary();
    const hunter = summary.find(s => s.name === 'hunter');
    expect(hunter.percentage).toBe(100);
  });

  it('returns infinity symbols for paid tier', () => {
    setUserTier('1mo');
    const summary = getUsageSummary();
    const adzuna = summary.find(s => s.name === 'adzuna');
    expect(adzuna.limit).toBe('∞');
    expect(adzuna.remaining).toBe('∞');
    expect(adzuna.percentage).toBe(0);
  });
});

// ── resetUsage ─────────────────────────────────────────────────

describe('resetUsage', () => {
  it('clears all counters', () => {
    recordUsage('adzuna');
    recordUsage('hunter');
    resetUsage();
    expect(getUsage('adzuna')).toBe(0);
    expect(getUsage('hunter')).toBe(0);
  });

  it('preserves date key after reset', () => {
    recordUsage('adzuna');
    resetUsage();
    const data = JSON.parse(localStorage.getItem('jobsynk_api_usage'));
    expect(data._date).toBeDefined();
  });
});

// ── TIERS constant ─────────────────────────────────────────────

describe('TIERS', () => {
  it('free tier has limits object', () => {
    expect(TIERS.free.limits).toBeDefined();
    expect(TIERS.free.limits).not.toBeNull();
  });

  it('free tier limits include adzuna', () => {
    expect(TIERS.free.limits.adzuna).toBe(5);
  });

  it('paid tiers have limits:null', () => {
    expect(TIERS['1mo'].limits).toBeNull();
    expect(TIERS['3mo'].limits).toBeNull();
    expect(TIERS['6mo'].limits).toBeNull();
  });

  it('all tiers have name and price', () => {
    for (const tier of Object.values(TIERS)) {
      expect(tier.name).toBeDefined();
      expect(tier.price).toBeDefined();
    }
  });

  it('all tiers have features array', () => {
    for (const tier of Object.values(TIERS)) {
      expect(Array.isArray(tier.features)).toBe(true);
      expect(tier.features.length).toBeGreaterThan(0);
    }
  });

  it('has exactly 4 tier keys', () => {
    expect(Object.keys(TIERS)).toEqual(['free', '1mo', '3mo', '6mo']);
  });
});

// ── STRIPE constant ────────────────────────────────────────────

describe('STRIPE', () => {
  it('has all 3 paid tiers', () => {
    expect(STRIPE['1mo']).toBeDefined();
    expect(STRIPE['3mo']).toBeDefined();
    expect(STRIPE['6mo']).toBeDefined();
  });

  it('each tier has priceId and link', () => {
    for (const tier of Object.values(STRIPE)) {
      expect(tier.priceId).toBeDefined();
      expect(typeof tier.priceId).toBe('string');
      expect(tier.link).toBeDefined();
      expect(typeof tier.link).toBe('string');
    }
  });

  it('links start with https', () => {
    for (const tier of Object.values(STRIPE)) {
      expect(tier.link.startsWith('https://')).toBe(true);
    }
  });
});

// ── Day rollover ───────────────────────────────────────────────

describe('Day rollover', () => {
  it('resets usage when date changes', () => {
    recordUsage('adzuna');
    recordUsage('adzuna');
    expect(getUsage('adzuna')).toBe(2);

    // Simulate a new day by manipulating the _date field
    const data = JSON.parse(localStorage.getItem('jobsynk_api_usage'));
    data._date = '2020-01-01';
    localStorage.setItem('jobsynk_api_usage', JSON.stringify(data));

    // Usage should reset because today's date differs from stored _date
    expect(getUsage('adzuna')).toBe(0);
  });

  it('handles corrupt JSON gracefully', () => {
    localStorage.setItem('jobsynk_api_usage', '{invalid json!!');
    expect(getUsage('adzuna')).toBe(0);
  });
});
