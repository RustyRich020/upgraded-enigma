/* ============================================================
   services/hunter-service.js — Hunter.io email verification
   ============================================================ */

import { ENDPOINTS } from '../config.js';

/**
 * Verify an email address using Hunter.io API.
 * @param {string} email — email address to verify
 * @param {string} apiKey — Hunter.io API key
 * @returns {{ result: string, score: number }} verification result
 */
export async function verifyEmail(email, apiKey) {
  if (!email) throw new Error('No email address provided');
  if (!apiKey) throw new Error('Hunter.io API key not configured');

  const url = `${ENDPOINTS.hunter}?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
  const resp = await fetch(url);

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.errors?.[0]?.details || 'Hunter.io error ' + resp.status);
  }

  const data = await resp.json();
  if (!data.data) throw new Error('No verification data returned');

  return {
    result: data.data.result || 'unknown',
    score: data.data.score || 0,
    status: data.data.status || 'unknown',
    isDeliverable: data.data.result === 'deliverable'
  };
}

export default { verifyEmail };
