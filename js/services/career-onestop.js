/* ============================================================
   services/career-onestop.js — CareerOneStop Salary API
   Free government API. Salary data by occupation + location.
   Docs: https://www.careeronestop.org/Developers/WebAPI/Salaries/get-salary-details.aspx
   ============================================================ */

import { ENDPOINTS } from '../config.js';

/**
 * Fetch salary data for an occupation and location.
 * @param {string} keyword — occupation keyword (e.g., "data analyst")
 * @param {string} location — US state or zip (e.g., "CA", "90210")
 * @param {string} apiKey — CareerOneStop API token
 * @param {string} userId — CareerOneStop user ID
 * @returns {object} salary data { median, low, high, source }
 */
export async function fetchSalaryData(keyword, location, apiKey, userId) {
  if (!apiKey || !userId) throw new Error('CareerOneStop requires API key and user ID');
  const url = `${ENDPOINTS.careerOneStop}/${userId}/${encodeURIComponent(keyword)}/${encodeURIComponent(location)}/25`;
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!resp.ok) throw new Error('CareerOneStop returned ' + resp.status);
  const data = await resp.json();

  const records = data.OccupationDetail || [];
  return records.map(r => ({
    title: r.OnetTitle || r.OccupationTitle || keyword,
    median: r.Wages?.NationalWagesList?.[0]?.Median || r.Wages?.StateWagesList?.[0]?.Median || null,
    low: r.Wages?.NationalWagesList?.[0]?.Pct10 || null,
    high: r.Wages?.NationalWagesList?.[0]?.Pct90 || null,
    source: 'CareerOneStop',
    location: location,
    period: r.Wages?.NationalWagesList?.[0]?.RateType || 'Annual'
  }));
}

export default { fetchSalaryData };
