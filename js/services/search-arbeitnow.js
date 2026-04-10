/* ============================================================
   services/search-arbeitnow.js — Arbeitnow Job Board API
   Free, no API key required. European + remote job listings.
   Docs: https://www.arbeitnow.com/blog/job-board-api
   ============================================================ */

import { ENDPOINTS } from '../config.js';

/**
 * Search Arbeitnow for jobs.
 * @param {string} keyword — search term
 * @returns {Array} normalized job objects
 */
export async function searchArbeitnow(keyword = '') {
  const url = ENDPOINTS.arbeitnow + (keyword ? `?search=${encodeURIComponent(keyword)}` : '');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Arbeitnow returned ' + resp.status);
  const data = await resp.json();
  return (data.data || []).slice(0, 20).map(j => ({
    title: j.title || '',
    company: j.company_name || '',
    location: j.location || 'Remote',
    url: j.url || '',
    source: 'Arbeitnow',
    salary: '',
    date: j.created_at || '',
    tags: (j.tags || []).join(', '),
    remote: j.remote || false,
    description: (j.description || '').slice(0, 200)
  }));
}

export default { searchArbeitnow };
