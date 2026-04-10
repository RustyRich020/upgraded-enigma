/**
 * Tests for js/services/gmail-tracker.js
 * Run with: npx vitest run tests/
 */

import { describe, it, expect } from 'vitest';
import { parseApplicationEmail, deduplicateGmailJobs } from '../js/services/gmail-tracker.js';

describe('parseApplicationEmail', () => {
  it('parses LinkedIn application confirmation', () => {
    const email = {
      from: 'noreply@linkedin.com',
      subject: 'Your application was received for Data Analyst at Google',
      body: 'Thank you for applying for the Data Analyst position at Google.',
      date: '2026-04-10',
    };
    const result = parseApplicationEmail(email);
    expect(result).not.toBeNull();
    expect(result.source).toBe('LinkedIn');
    expect(result.status).toBe('Applied');
  });

  it('parses Indeed application', () => {
    const email = {
      from: 'no-reply@indeed.com',
      subject: 'Application submitted: Software Engineer at Microsoft',
      body: '',
      date: '2026-04-10',
    };
    const result = parseApplicationEmail(email);
    expect(result).not.toBeNull();
    expect(result.source).toBe('Indeed');
  });

  it('parses Greenhouse confirmation', () => {
    const email = {
      from: 'notifications@greenhouse.io',
      subject: 'Application received - Thank you for applying',
      body: 'Your application for ML Engineer at Stripe has been received.',
      date: '2026-04-10',
    };
    const result = parseApplicationEmail(email);
    expect(result).not.toBeNull();
    expect(result.source).toBe('Greenhouse');
  });

  it('returns null for non-application email', () => {
    const email = {
      from: 'promo@shop.com',
      subject: '50% off sale!',
      body: 'Buy now',
      date: '2026-04-10',
    };
    expect(parseApplicationEmail(email)).toBeNull();
  });

  it('handles generic application emails', () => {
    const email = {
      from: 'careers@randomcompany.com',
      subject: 'Application received for your recent submission',
      body: '',
      date: '2026-04-10',
    };
    const result = parseApplicationEmail(email);
    expect(result).not.toBeNull();
    expect(result.source).toBe('Email');
  });

  it('sets _autoTracked flag', () => {
    const email = {
      from: 'noreply@linkedin.com',
      subject: 'Your application was received',
      body: '',
      date: '2026-04-10',
    };
    const result = parseApplicationEmail(email);
    expect(result._autoTracked).toBe(true);
  });
});

describe('deduplicateGmailJobs', () => {
  it('removes jobs already in tracker', () => {
    const gmailJobs = [
      { title: 'Data Analyst', company: 'Google' },
      { title: 'SWE', company: 'Meta' },
    ];
    const existing = [
      { title: 'Data Analyst', company: 'Google' },
    ];
    const unique = deduplicateGmailJobs(gmailJobs, existing);
    expect(unique).toHaveLength(1);
    expect(unique[0].company).toBe('Meta');
  });

  it('is case-insensitive', () => {
    const gmailJobs = [{ title: 'data analyst', company: 'GOOGLE' }];
    const existing = [{ title: 'Data Analyst', company: 'Google' }];
    const unique = deduplicateGmailJobs(gmailJobs, existing);
    expect(unique).toHaveLength(0);
  });

  it('deduplicates within Gmail results', () => {
    const gmailJobs = [
      { title: 'Dev', company: 'Acme' },
      { title: 'Dev', company: 'Acme' },
    ];
    const unique = deduplicateGmailJobs(gmailJobs, []);
    expect(unique).toHaveLength(1);
  });
});
