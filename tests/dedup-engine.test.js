/**
 * Tests for js/services/dedup-engine.js
 * Run with: npx vitest run tests/
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeCompany, normalizeTitle, normalizeUrl,
  jaccardSimilarity, isDuplicate, deduplicateResults
} from '../js/services/dedup-engine.js';

describe('normalizeCompany', () => {
  it('strips Inc suffix', () => {
    expect(normalizeCompany('Acme Inc')).toBe('acme');
  });
  it('strips LLC', () => {
    expect(normalizeCompany('Acme LLC')).toBe('acme');
  });
  it('strips Corp', () => {
    expect(normalizeCompany('Acme Corp')).toBe('acme');
  });
  it('strips Ltd', () => {
    expect(normalizeCompany('Acme Ltd.')).toBe('acme');
  });
  it('handles mixed case and whitespace', () => {
    expect(normalizeCompany('  Acme   Solutions  Inc.  ')).toBe('acme solutions');
  });
  it('returns empty for null', () => {
    expect(normalizeCompany(null)).toBe('');
  });
});

describe('normalizeTitle', () => {
  it('lowercases and trims', () => {
    expect(normalizeTitle('  Senior Data Analyst  ')).toBe('senior data analyst');
  });
  it('collapses whitespace', () => {
    expect(normalizeTitle('Senior   Data   Analyst')).toBe('senior data analyst');
  });
});

describe('normalizeUrl', () => {
  it('strips protocol', () => {
    expect(normalizeUrl('https://example.com/job/123')).toBe('example.com/job/123');
  });
  it('strips www', () => {
    expect(normalizeUrl('https://www.example.com/job')).toBe('example.com/job');
  });
  it('strips trailing slash', () => {
    expect(normalizeUrl('https://example.com/job/')).toBe('example.com/job');
  });
  it('strips query params', () => {
    expect(normalizeUrl('https://example.com/job?ref=google&utm=123')).toBe('example.com/job');
  });
});

describe('jaccardSimilarity', () => {
  it('returns 1 for identical sets', () => {
    const a = new Set(['python', 'developer']);
    expect(jaccardSimilarity(a, a)).toBe(1);
  });
  it('returns 0 for disjoint sets', () => {
    const a = new Set(['python']);
    const b = new Set(['java']);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });
  it('returns correct ratio for overlap', () => {
    const a = new Set(['python', 'developer', 'senior']);
    const b = new Set(['python', 'developer', 'junior']);
    expect(jaccardSimilarity(a, b)).toBeCloseTo(0.5); // 2 / 4
  });
  it('handles empty sets', () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
  });
});

describe('isDuplicate', () => {
  it('detects URL match', () => {
    const a = { title: 'Dev', company: 'A', url: 'https://example.com/job/123' };
    const b = { title: 'Developer', company: 'B', url: 'https://www.example.com/job/123/' };
    const result = isDuplicate(a, b);
    expect(result.duplicate).toBe(true);
    expect(result.method).toBe('url');
  });

  it('detects exact title+company match', () => {
    const a = { title: 'Data Analyst', company: 'Acme Inc', url: '' };
    const b = { title: 'data analyst', company: 'Acme', url: '' };
    const result = isDuplicate(a, b);
    expect(result.duplicate).toBe(true);
    expect(result.method).toBe('exact');
  });

  it('returns false for different jobs', () => {
    const a = { title: 'Data Analyst', company: 'Acme', url: 'https://a.com/1' };
    const b = { title: 'Software Engineer', company: 'Beta Corp', url: 'https://b.com/2' };
    expect(isDuplicate(a, b).duplicate).toBe(false);
  });
});

describe('deduplicateResults', () => {
  it('removes duplicates against existing jobs', () => {
    const existing = [
      { id: '1', title: 'Data Analyst', company: 'Acme', url: 'https://example.com/1' },
    ];
    const newJobs = [
      { title: 'Data Analyst', company: 'Acme Inc', url: '' },
      { title: 'Software Engineer', company: 'Beta', url: 'https://beta.com/2' },
    ];
    const { unique, duplicates } = deduplicateResults(newJobs, existing);
    expect(unique).toHaveLength(1);
    expect(unique[0].title).toBe('Software Engineer');
    expect(duplicates).toHaveLength(1);
  });

  it('removes cross-API duplicates within new results', () => {
    const newJobs = [
      { title: 'Python Dev', company: 'Acme', url: 'https://remotive.com/1', source: 'Remotive' },
      { title: 'Python Dev', company: 'Acme Corp', url: '', source: 'Adzuna' },
    ];
    const { unique, duplicates } = deduplicateResults(newJobs, []);
    expect(unique).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });

  it('keeps all unique jobs', () => {
    const newJobs = [
      { title: 'Job A', company: 'Company A', url: 'https://a.com' },
      { title: 'Job B', company: 'Company B', url: 'https://b.com' },
      { title: 'Job C', company: 'Company C', url: 'https://c.com' },
    ];
    const { unique } = deduplicateResults(newJobs, []);
    expect(unique).toHaveLength(3);
  });
});
