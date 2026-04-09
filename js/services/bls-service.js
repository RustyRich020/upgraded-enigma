/* ============================================================
   services/bls-service.js — Bureau of Labor Statistics API
   ============================================================ */

import { ENDPOINTS, BLS_SERIES } from '../config.js';

/**
 * Fetch the latest salary/earnings data from the BLS public API.
 * @returns {{ annual: number, weekly: number, year: string, period: string }}
 */
export async function fetchBlsData() {
  const currentYear = new Date().getFullYear();
  const resp = await fetch(ENDPOINTS.bls, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seriesid: BLS_SERIES,
      startyear: String(currentYear - 2),
      endyear: String(currentYear)
    })
  });

  if (!resp.ok) throw new Error('BLS API returned ' + resp.status);

  const data = await resp.json();
  if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results?.series?.length) {
    throw new Error(data.message?.[0] || 'BLS returned no data');
  }

  const series = data.Results.series[0];
  const latest = series.data?.[0];

  if (!latest) throw new Error('No BLS data points available');

  const weeklyEarnings = Number(latest.value || 0);
  const annualEstimate = weeklyEarnings * 52;

  return {
    annual: annualEstimate,
    weekly: weeklyEarnings,
    year: latest.year || '',
    period: latest.period || '',
    seriesId: series.seriesID || BLS_SERIES[0]
  };
}

export default { fetchBlsData };
