/**
 * Tests for js/services/ats-optimizer.js
 * Run with: npx vitest run tests/ats-optimizer.test.js
 */

import { describe, it, expect } from 'vitest';
import {
  extractATSKeywords,
  scoreATSAlignment,
  recommendRoles,
  generateSmartQueries,
} from '../js/services/ats-optimizer.js';

// ============================================================
// extractATSKeywords
// ============================================================

describe('extractATSKeywords', () => {
  it('extracts hard skills from text', () => {
    const result = extractATSKeywords('Experience with Python and JavaScript');
    const skills = result.hardSkills.map(k => k.keyword);
    expect(skills).toContain('python');
    expect(skills).toContain('javascript');
  });

  it('extracts certifications', () => {
    const result = extractATSKeywords('AWS Certified Solutions Architect required');
    const certs = result.certifications.map(k => k.keyword);
    expect(certs.length).toBeGreaterThan(0);
    expect(certs.some(c => c.includes('aws'))).toBe(true);
  });

  it('extracts soft skills', () => {
    const result = extractATSKeywords('Strong leadership and communication skills');
    const soft = result.softSkills.map(k => k.keyword);
    expect(soft).toContain('leadership');
    expect(soft).toContain('communication');
  });

  it('extracts action verbs', () => {
    const result = extractATSKeywords('Designed and implemented a data pipeline');
    const verbs = result.actionVerbs.map(k => k.keyword);
    expect(verbs).toContain('designed');
    expect(verbs).toContain('implemented');
  });

  it('extracts experience level', () => {
    const result = extractATSKeywords('5+ years of experience required, senior level');
    const exp = result.experienceLevel.map(k => k.keyword);
    expect(exp.length).toBeGreaterThan(0);
    expect(exp.some(e => e.includes('5+') || e.includes('senior'))).toBe(true);
  });

  it('extracts industry terms', () => {
    const result = extractATSKeywords('GDPR compliance and SOC 2 certification');
    const terms = result.industryTerms.map(k => k.keyword);
    expect(terms).toContain('gdpr');
    expect(terms).toContain('compliance');
  });

  it('returns object with all 6 category arrays', () => {
    const result = extractATSKeywords('Some generic text');
    expect(result).toHaveProperty('hardSkills');
    expect(result).toHaveProperty('softSkills');
    expect(result).toHaveProperty('certifications');
    expect(result).toHaveProperty('experienceLevel');
    expect(result).toHaveProperty('actionVerbs');
    expect(result).toHaveProperty('industryTerms');
    expect(Array.isArray(result.hardSkills)).toBe(true);
    expect(Array.isArray(result.certifications)).toBe(true);
  });

  it('returns empty arrays for empty text', () => {
    const result = extractATSKeywords('');
    for (const arr of Object.values(result)) {
      expect(arr).toEqual([]);
    }
  });

  it('counts frequency of repeated keywords', () => {
    const result = extractATSKeywords('Python Python Python and JavaScript');
    const python = result.hardSkills.find(k => k.keyword === 'python');
    expect(python).toBeDefined();
    expect(python.count).toBe(3);
  });

  it('is case insensitive', () => {
    const result = extractATSKeywords('PYTHON python Python');
    const python = result.hardSkills.find(k => k.keyword === 'python');
    expect(python).toBeDefined();
    expect(python.count).toBe(3);
  });
});

// ============================================================
// scoreATSAlignment
// ============================================================

describe('scoreATSAlignment', () => {
  it('returns score, matched, missing, and breakdown', () => {
    const result = scoreATSAlignment('Python developer', 'Looking for Python skills');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('matched');
    expect(result).toHaveProperty('missing');
    expect(result).toHaveProperty('breakdown');
  });

  it('gives 100% when resume has all job keywords', () => {
    const jobText = 'Need Python and JavaScript';
    const resumeText = 'Skilled in Python and JavaScript development';
    const result = scoreATSAlignment(resumeText, jobText);
    expect(result.score).toBe(100);
  });

  it('gives 0% when there is no overlap', () => {
    const jobText = 'Need Rust and Scala experience';
    const resumeText = 'Skilled in leadership and communication';
    const result = scoreATSAlignment(resumeText, jobText);
    expect(result.score).toBe(0);
  });

  it('gives proportional score for partial match', () => {
    const jobText = 'Need Python, JavaScript, and Ruby';
    const resumeText = 'Experienced with Python development';
    const result = scoreATSAlignment(resumeText, jobText);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it('weights hardSkills higher than softSkills', () => {
    // Job requires one hard skill and one soft skill
    // Resume matches only the hard skill -> should score higher than matching only soft skill
    const jobText = 'Need Python and leadership';
    const hardMatchResume = 'Experience with Python';
    const softMatchResume = 'Strong leadership abilities';

    const hardResult = scoreATSAlignment(hardMatchResume, jobText);
    const softResult = scoreATSAlignment(softMatchResume, jobText);
    expect(hardResult.score).toBeGreaterThan(softResult.score);
  });

  it('returns 0 for empty job text', () => {
    const result = scoreATSAlignment('Python developer', '');
    expect(result.score).toBe(0);
  });

  it('returns 0 for empty resume text', () => {
    const result = scoreATSAlignment('', 'Need Python');
    expect(result.score).toBe(0);
  });

  it('missing array contains keywords in job but not resume', () => {
    const jobText = 'Need Python and Ruby and Scala';
    const resumeText = 'Experienced with Python';
    const result = scoreATSAlignment(resumeText, jobText);
    const missingKeywords = result.missing.map(m => m.keyword);
    expect(missingKeywords).toContain('ruby');
    expect(missingKeywords).toContain('scala');
    expect(missingKeywords).not.toContain('python');
  });
});

// ============================================================
// recommendRoles
// ============================================================

describe('recommendRoles', () => {
  it('returns role suggestions based on keywords', async () => {
    const result = await recommendRoles('Python machine learning tensorflow data');
    expect(result).toHaveProperty('recommendedRoles');
    expect(result).toHaveProperty('detectedSkills');
    expect(Array.isArray(result.recommendedRoles)).toBe(true);
  });

  it('suggests data roles for python + data keywords', async () => {
    const result = await recommendRoles('Python machine learning tensorflow pytorch deep learning');
    const titles = result.recommendedRoles.map(r => r.title);
    expect(titles.some(t => /data scientist|ml engineer|ai engineer/i.test(t))).toBe(true);
  });

  it('suggests frontend roles for javascript + react keywords', async () => {
    const result = await recommendRoles('JavaScript TypeScript React Node.js frontend development');
    const titles = result.recommendedRoles.map(r => r.title);
    expect(titles.some(t => /frontend|full stack|web developer|software engineer/i.test(t))).toBe(true);
  });

  it('returns empty recommendedRoles for no matching keywords', async () => {
    const result = await recommendRoles('the quick brown fox jumps over the lazy dog');
    expect(result.recommendedRoles).toEqual([]);
  });
});

// ============================================================
// generateSmartQueries
// ============================================================

describe('generateSmartQueries', () => {
  it('generates search query strings from keywords', () => {
    const result = generateSmartQueries('Python SQL AWS data analysis Tableau');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    result.forEach(q => expect(typeof q).toBe('string'));
  });

  it('returns array of strings', () => {
    const result = generateSmartQueries('JavaScript React TypeScript Node.js');
    expect(result.length).toBeGreaterThan(0);
    for (const q of result) {
      expect(typeof q).toBe('string');
      expect(q.trim().length).toBeGreaterThan(3);
    }
  });

  it('returns empty array for no extractable keywords', () => {
    const result = generateSmartQueries('');
    expect(result).toEqual([]);
  });
});
