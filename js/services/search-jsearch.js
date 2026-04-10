/* ============================================================
   services/search-jsearch.js — JSearch API (via RapidAPI)
   Free: 500 requests/month. Aggregates LinkedIn, Indeed, etc.
   Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
   ============================================================ */

import { ENDPOINTS } from '../config.js';

/**
 * Search JSearch for jobs.
 * @param {string} query — search query (e.g., "Python developer in New York")
 * @param {string} apiKey — RapidAPI key
 * @returns {Array} normalized job objects
 */
export async function searchJSearch(query, apiKey) {
  if (!apiKey) throw new Error('JSearch requires a RapidAPI key');
  const url = `${ENDPOINTS.jsearch}?query=${encodeURIComponent(query)}&page=1&num_pages=1`;
  const resp = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
    }
  });
  if (!resp.ok) throw new Error('JSearch returned ' + resp.status);
  const data = await resp.json();
  return (data.data || []).slice(0, 20).map(j => ({
    title: j.job_title || '',
    company: j.employer_name || '',
    location: j.job_city ? `${j.job_city}, ${j.job_state || ''}` : (j.job_country || ''),
    url: j.job_apply_link || j.job_google_link || '',
    source: 'JSearch',
    salary: j.job_min_salary ? `${j.job_min_salary}-${j.job_max_salary || ''}` : '',
    date: j.job_posted_at_datetime_utc || '',
    tags: j.job_required_skills ? j.job_required_skills.join(', ') : '',
    remote: j.job_is_remote || false,
    description: (j.job_description || '').slice(0, 200),
    employerLogo: j.employer_logo || ''
  }));
}

export default { searchJSearch };
