/**
 * Tests for js/services/relevance-scorer.js
 * Run with: npx vitest run tests/
 */

import { describe, it, expect } from 'vitest';
import { extractResumeProfile, scoreJob, scoreAndRankJobs } from '../js/services/relevance-scorer.js';

describe('extractResumeProfile', () => {
  it('extracts skills from skills array', () => {
    const resumes = [
      { name: 'Tech v1', skills: ['python', 'sql', 'aws'], text: '' },
    ];
    const profile = extractResumeProfile(resumes);
    expect(profile.skills).toContain('python');
    expect(profile.skills).toContain('sql');
    expect(profile.skills).toContain('aws');
  });

  it('extracts skills from text using regex', () => {
    const resumes = [
      { name: 'Resume', skills: [], text: 'Experience with Python, JavaScript, and Docker deployment' },
    ];
    const profile = extractResumeProfile(resumes);
    expect(profile.skills).toContain('python');
    expect(profile.skills).toContain('javascript');
    expect(profile.skills).toContain('docker');
  });

  it('merges skills across multiple resumes', () => {
    const resumes = [
      { name: 'Tech', skills: ['python', 'sql'], text: '' },
      { name: 'Data', skills: ['tableau', 'sql'], text: '' },
    ];
    const profile = extractResumeProfile(resumes);
    expect(profile.skills).toContain('python');
    expect(profile.skills).toContain('tableau');
    expect(profile.skills).toContain('sql');
    // No duplicates
    expect(profile.skills.filter(s => s === 'sql')).toHaveLength(1);
  });

  it('extracts title keywords from resume names', () => {
    const resumes = [
      { name: 'Data Science Focus - v2', skills: [], text: '' },
    ];
    const profile = extractResumeProfile(resumes);
    expect(profile.titleKeywords).toContain('data');
    expect(profile.titleKeywords).toContain('science');
  });

  it('returns empty profile for no resumes', () => {
    const profile = extractResumeProfile([]);
    expect(profile.skills).toHaveLength(0);
    expect(profile.titleKeywords).toHaveLength(0);
  });
});

describe('scoreJob', () => {
  const profile = { skills: ['python', 'sql', 'aws', 'docker'], titleKeywords: ['data', 'analyst'] };

  it('scores high for matching skills + title', () => {
    const job = { title: 'Senior Data Analyst', description: 'Python SQL AWS', date: new Date().toISOString() };
    const result = scoreJob(job, profile);
    expect(result.score).toBeGreaterThan(70);
    expect(result.matchedSkills).toContain('python');
    expect(result.titleMatch).toBe(true);
  });

  it('scores low for no matches', () => {
    const job = { title: 'Marketing Manager', description: 'SEO campaigns social media', date: '2020-01-01' };
    const result = scoreJob(job, profile);
    expect(result.score).toBeLessThan(20);
    expect(result.matchedSkills).toHaveLength(0);
  });

  it('gives freshness bonus for recent jobs', () => {
    const recent = { title: 'Dev', description: 'python', date: new Date().toISOString() };
    const old = { title: 'Dev', description: 'python', date: '2020-01-01' };
    const recentScore = scoreJob(recent, profile);
    const oldScore = scoreJob(old, profile);
    expect(recentScore.score).toBeGreaterThan(oldScore.score);
  });
});

describe('scoreAndRankJobs', () => {
  const profile = { skills: ['python', 'sql'], titleKeywords: ['data'] };

  it('filters by minimum score', () => {
    const jobs = [
      { title: 'Data Analyst Python SQL', description: '', date: new Date().toISOString() },
      { title: 'Chef', description: 'cooking restaurant', date: '' },
    ];
    const ranked = scoreAndRankJobs(jobs, profile, 30);
    expect(ranked.length).toBe(1);
    expect(ranked[0].title).toContain('Data');
  });

  it('sorts by score descending', () => {
    const jobs = [
      { title: 'Junior Dev', description: 'python', date: '' },
      { title: 'Senior Data Analyst', description: 'python sql database', date: new Date().toISOString() },
    ];
    const ranked = scoreAndRankJobs(jobs, profile, 0);
    expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(ranked[1].relevanceScore);
  });

  it('appends relevanceScore and matchedSkills', () => {
    const jobs = [{ title: 'Python Dev', description: 'sql', date: '' }];
    const ranked = scoreAndRankJobs(jobs, profile, 0);
    expect(ranked[0]).toHaveProperty('relevanceScore');
    expect(ranked[0]).toHaveProperty('matchedSkills');
    expect(ranked[0]).toHaveProperty('titleMatch');
  });
});
