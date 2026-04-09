/* ============================================================
   services/search-remotive.js — Remotive remote jobs API
   ============================================================ */

import { ENDPOINTS } from '../config.js';

/**
 * Search Remotive for remote job listings.
 * @param {string} keyword — search term
 * @returns {Array} normalized job objects
 */
export async function searchRemotive(keyword) {
  const url = keyword
    ? `${ENDPOINTS.remotive}?search=${encodeURIComponent(keyword)}`
    : ENDPOINTS.remotive;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Remotive returned ' + resp.status);

  const data = await resp.json();
  const jobs = data.jobs || [];

  return jobs.map(j => ({
    title: j.title || '',
    company: j.company_name || '',
    location: j.candidate_required_location || 'Remote',
    salary: j.salary || '',
    url: j.url || '',
    source: 'Remotive',
    type: j.job_type || '',
    category: j.category || '',
    date: (j.publication_date || '').slice(0, 10),
    description: j.description || '',
    domain: (j.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
  }));
}

export default { searchRemotive };
