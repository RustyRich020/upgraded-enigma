/**
 * Tests for js/utils.js
 * Run with: npx vitest run tests/
 */

import { describe, it, expect } from 'vitest';
import { uid, fmtDate, today, escapeHtml, tokenize, keyset } from '../js/utils.js';

describe('uid', () => {
  it('generates unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) ids.add(uid());
    expect(ids.size).toBe(100);
  });

  it('returns a string', () => {
    expect(typeof uid()).toBe('string');
  });

  it('has reasonable length', () => {
    expect(uid().length).toBeGreaterThanOrEqual(5);
  });
});

describe('fmtDate', () => {
  it('formats a valid date', () => {
    expect(fmtDate('2026-04-10')).toBe('2026-04-10');
  });

  it('returns empty for falsy input', () => {
    expect(fmtDate('')).toBe('');
    expect(fmtDate(null)).toBe('');
    expect(fmtDate(undefined)).toBe('');
  });
});

describe('today', () => {
  it('returns today in YYYY-MM-DD format', () => {
    const result = today();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('adds days when given offset', () => {
    const t = today(0);
    const future = today(1);
    expect(new Date(future) > new Date(t)).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('escapes HTML entities', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('handles ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('returns empty for null', () => {
    expect(escapeHtml(null)).toBe('');
  });
});

describe('tokenize', () => {
  it('splits text into lowercase words', () => {
    const tokens = tokenize('Hello World Test');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
  });

  it('removes non-alphanumeric characters', () => {
    const tokens = tokenize('Python/SQL & AWS!');
    expect(tokens).toContain('python');
    expect(tokens).toContain('sql');
    expect(tokens).toContain('aws');
  });

  it('filters empty strings', () => {
    const tokens = tokenize('  hello   world  ');
    expect(tokens.every(t => t.length > 0)).toBe(true);
  });
});

describe('keyset', () => {
  it('extracts meaningful keywords', () => {
    const ks = keyset('The quick brown fox and the lazy dog');
    expect(ks.has('quick')).toBe(true);
    expect(ks.has('brown')).toBe(true);
    expect(ks.has('the')).toBe(false); // stop word
    expect(ks.has('and')).toBe(false); // stop word
  });

  it('filters short words', () => {
    const ks = keyset('an AI ML');
    expect(ks.has('an')).toBe(false); // stop word
  });
});
