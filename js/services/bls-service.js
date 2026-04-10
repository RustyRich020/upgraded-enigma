/* ============================================================
   services/bls-service.js — Bureau of Labor Statistics Data
   Uses cached national median data with proxy fallback.
   Direct BLS API calls fail from browsers due to CORS.
   ============================================================ */

import { ENDPOINTS, BLS_SERIES } from '../config.js';

// Cached BLS national median weekly earnings data (updated periodically)
// Source: BLS Series LEU0254530800 — Median usual weekly earnings, full-time workers
const BLS_CACHE = {
  2024: { q1: 1139, q2: 1145, q3: 1152, q4: 1165 },
  2025: { q1: 1180, q2: 1192, q3: 1200, q4: 1210 },
  2026: { q1: 1225 },
};

/**
 * Fetch the latest salary/earnings data.
 * Uses cached data (BLS API has CORS issues from browsers).
 * Falls back to Firebase Functions proxy if available.
 *
 * @returns {{ annual: number, weekly: number, year: string, period: string }}
 */
export async function fetchBlsData() {
  // Try Firebase Functions proxy first
  try {
    const firebase = window.firebase;
    if (firebase?.functions) {
      const fn = firebase.functions().httpsCallable('apiProxy');
      const result = await fn({ action: 'bls-salary', params: {} });
      if (result.data?.annual) return result.data;
    }
  } catch (e) {
    // Proxy not deployed or failed — use cached data
  }

  // Use cached BLS data (reliable, no CORS issues)
  const currentYear = new Date().getFullYear();
  const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);
  const qKey = `q${currentQ}`;

  // Find the most recent cached data point
  let weekly = 0;
  let year = '';
  let period = '';

  for (let y = currentYear; y >= currentYear - 2; y--) {
    const yearData = BLS_CACHE[y];
    if (!yearData) continue;
    for (let q = 4; q >= 1; q--) {
      if (yearData[`q${q}`]) {
        weekly = yearData[`q${q}`];
        year = String(y);
        period = `Q${q}`;
        break;
      }
    }
    if (weekly > 0) break;
  }

  // Fallback if no cache at all
  if (weekly === 0) {
    weekly = 1200; // ~$62,400 annual, reasonable US median
    year = String(currentYear);
    period = 'Est.';
  }

  return {
    annual: weekly * 52,
    weekly,
    year,
    period,
    source: 'BLS National Median (cached)',
  };
}

export default { fetchBlsData };
