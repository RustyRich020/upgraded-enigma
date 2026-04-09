/* ============================================================
   services/search-adzuna.js — Adzuna job search API
   ============================================================ */

import { ENDPOINTS } from '../config.js';

/**
 * Search Adzuna for job listings.
 * @param {string} keyword — search term
 * @param {string} location — location string (used to detect country)
 * @param {string} appId — Adzuna app ID
 * @param {string} appKey — Adzuna app key
 * @returns {Array} normalized job objects
 */
export async function searchAdzuna(keyword, location, appId, appKey) {
  if (!appId || !appKey) throw new Error('Adzuna API credentials required');

  const country = (location || '').toLowerCase().includes('uk') ? 'gb' : 'us';
  const query = encodeURIComponent(keyword || 'developer');
  const url = `${ENDPOINTS.adzuna}/${country}/search/1?app_id=${appId}&app_key=${appKey}&what=${query}&results_per_page=20`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Adzuna returned ' + resp.status);

  const data = await resp.json();
  const results = data.results || [];

  return results.map(j => ({
    title: j.title || '',
    company: j.company?.display_name || '',
    location: j.location?.display_name || '',
    salaryMin: j.salary_min || null,
    salaryMax: j.salary_max || null,
    salary: j.salary_min ? `$${Number(j.salary_min).toLocaleString()}` : '',
    url: j.redirect_url || '',
    source: 'Adzuna',
    date: (j.created || '').slice(0, 10),
    description: j.description || '',
    domain: (j.company?.display_name || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
    totalResults: data.count || 0
  }));
}

export default { searchAdzuna };
