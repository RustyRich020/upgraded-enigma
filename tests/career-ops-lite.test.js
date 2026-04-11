import { describe, expect, it } from 'vitest';
import {
  buildCareerProfile,
  evaluateOpportunity,
  generateOutreachDraft,
  gradeForFitScore,
  parseSalaryValue
} from '../js/services/career-ops-lite.js';

describe('parseSalaryValue', () => {
  it('parses salary ranges into an average-ish midpoint', () => {
    expect(parseSalaryValue('$120,000 - $150,000')).toBe(135000);
  });

  it('returns 0 for missing salaries', () => {
    expect(parseSalaryValue('')).toBe(0);
  });
});

describe('buildCareerProfile', () => {
  it('derives profile skills and target salary from resumes and offers', () => {
    const profile = buildCareerProfile({
      resumes: [{ name: 'Senior Data Engineer Resume', skills: ['python', 'sql'], text: '' }],
      offers: [{ baseSalary: 160000 }],
      settings: { remotePreference: 'remote' }
    });

    expect(profile.skills).toContain('python');
    expect(profile.targetSalary).toBe(160000);
    expect(profile.remotePreference).toBe('remote');
  });
});

describe('evaluateOpportunity', () => {
  const profile = buildCareerProfile({
    resumes: [{ name: 'Senior Data Engineer', skills: ['python', 'sql', 'aws', 'docker'], text: '' }],
    jobs: [{ title: 'Senior Data Engineer', salary: 155000 }]
  });

  it('scores strong-fit roles well', () => {
    const result = evaluateOpportunity({
      title: 'Senior Data Engineer',
      company: 'Acme',
      salary: '$160,000',
      remote: 'remote',
      date: new Date().toISOString(),
      description: 'Build data platforms with Python, SQL, AWS, Docker, ownership and growth opportunities.'
    }, profile);

    expect(result.score).toBeGreaterThan(75);
    expect(result.grade).toMatch(/[ABC]/);
    expect(result.matchedSkills).toContain('python');
  });

  it('caps weak-fit roles when gate-pass dimensions fail', () => {
    const result = evaluateOpportunity({
      title: 'Retail Store Manager',
      company: 'ShopCo',
      salary: '$50,000',
      remote: 'onsite',
      date: '2024-01-01',
      description: 'Manage store operations, merchandising, tills and weekend staffing.'
    }, profile);

    expect(result.score).toBeLessThanOrEqual(54);
    expect(['D', 'E', 'F']).toContain(result.grade);
  });
});

describe('gradeForFitScore', () => {
  it('maps numeric scores to letter grades', () => {
    expect(gradeForFitScore(92)).toBe('A');
    expect(gradeForFitScore(72)).toBe('C');
    expect(gradeForFitScore(35)).toBe('F');
  });
});

describe('generateOutreachDraft', () => {
  it('generates an informational outreach draft', () => {
    const draft = generateOutreachDraft({
      contactName: 'Santiago',
      company: 'Career Ops',
      role: 'AI Engineer',
      askType: 'informational',
      sharedContext: 'agentic workflow tooling'
    });

    expect(draft.subject).toContain('Career Ops');
    expect(draft.body).toContain('Hi Santiago');
    expect(draft.body).toContain('agentic workflow tooling');
  });
});
